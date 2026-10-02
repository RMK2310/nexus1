import {
  Controller,
  Get,
  Query,
  Res,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Response } from "express";

/**
 * Image Proxy — fixes slow product image loading.
 *
 * External product images (OpenFoodFacts, OpenProductsFacts, etc.) are slow
 * to load directly from mobile clients (TLS handshakes, far CDNs, missing
 * cache headers). This endpoint:
 *   1. Fetches the image once and caches it in memory (LRU, ~200 entries).
 *   2. Serves it to clients with long-lived browser cache headers.
 *   3. Falls back to a local placeholder on failure.
 */
@SkipThrottle()
@Controller("api")
export class ImageProxyController {
  private readonly logger = new Logger(ImageProxyController.name);

  /** In-memory cache: url -> { buffer, contentType }. */
  private static readonly MAX_CACHE = 250;
  private static cache = new Map<
    string,
    { buffer: Buffer; contentType: string }
  >();

  @Get("image-proxy")
  async proxy(
    @Query("url") url: string,
    @Query("fallback") fallback: string,
    @Res() response: Response
  ) {
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new BadRequestException("Valid image url query param required");
    }

    // Optional category-aware fallback image (validated against local files).
    const fallbackPath =
      fallback && /^[a-z0-9-]+\.jpg$/.test(fallback)
        ? `/images/products/${fallback}`
        : "/images/products/fruits.jpg";

    // Only proxy from allow-listed image origins (prevents abuse).
    const allowed = [
      "images.openfoodfacts.org",
      "images.openproductsfacts.org",
      "world.openfoodfacts.org",
      "in.openfoodfacts.org",
      "res.cloudinary.com",
      "images.unsplash.com",
      "cdn.grofers.com",
      "img.clevup.in",
      "images.pexels.com",
    ];
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      throw new BadRequestException("Malformed image url");
    }
    if (!allowed.includes(hostname)) {
      throw new BadRequestException(`Origin not allowed: ${hostname}`);
    }

    const cached = ImageProxyController.cache.get(url);
    if (cached) {
      this.sendImage(response, cached.buffer, cached.contentType, true);
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "NEXUS-SuperApp/1.0 (image proxy)" },
      });
      clearTimeout(timeout);

      if (!upstream.ok) {
        throw new Error(`Upstream ${upstream.status}`);
      }
      const arrayBuf = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const contentType = upstream.headers.get("content-type") || "image/jpeg";

      if (buffer.length === 0 || !contentType.startsWith("image/")) {
        throw new Error("Not an image");
      }

      // Simple LRU eviction.
      if (ImageProxyController.cache.size >= ImageProxyController.MAX_CACHE) {
        const oldest = ImageProxyController.cache.keys().next().value;
        if (oldest) ImageProxyController.cache.delete(oldest);
      }
      ImageProxyController.cache.set(url, { buffer, contentType });

      this.sendImage(response, buffer, contentType, false);
    } catch (err) {
      this.logger.warn(`Image proxy failed for ${url}: ${err}`);
      // Redirect to a category-appropriate local fallback so the UI never breaks.
      response.redirect(302, fallbackPath);
    }
  }

  private sendImage(
    response: Response,
    buffer: Buffer,
    contentType: string,
    fromCache: boolean
  ) {
    response.setHeader("Content-Type", contentType);
    response.setHeader("Cache-Control", "public, max-age=604800, immutable");
    response.setHeader("X-Cache", fromCache ? "HIT" : "MISS");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.send(buffer);
  }
}
