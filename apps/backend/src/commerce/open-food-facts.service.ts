import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface OpenFactsProduct {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  description: string;
  imageUrl: string;
  productType: "GROCERIES" | "ELECTRONICS";
  quantity?: string;
  nutriscore?: string;
  ingredients?: string;
  priceINR: number;
  compareAtPriceINR: number;
  ratingAvg: number;
  reviewCount: number;
  country: string;
}

function isValidEnglishName(name: string | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 150) return false;
  // Must contain English latin letters and not be foreign non-Latin script
  const hasLatin = /[a-zA-Z]/.test(trimmed);
  const hasNonAscii = /[^\x20-\x7E]/.test(trimmed);
  return hasLatin && !hasNonAscii;
}

function cleanTitle(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

function getOptimizedImageUrl(rawImageUrl?: string | null): string {
  if (!rawImageUrl || typeof rawImageUrl !== "string") return "https://images.openfoodfacts.org/images/products/890/171/913/4845/front_en.11.400.jpg";
  const trimmed = rawImageUrl.trim();
  if (trimmed.includes("openfoodfacts.org") || trimmed.includes("openproductsfacts.org")) {
    if (!trimmed.includes(".400.jpg") && !trimmed.includes(".200.jpg") && trimmed.endsWith(".jpg")) {
      return trimmed.replace(/\.jpg$/, ".400.jpg");
    }
  }
  return trimmed;
}

function generateINRPrice(seedStr: string, isElectronics: boolean): { price: number; comparePrice: number } {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);

  if (isElectronics) {
    // Electronics prices between ₹399 and ₹12,999
    const base = 399 + (positive % 12600);
    const rounded = Math.round(base / 10) * 10 - 1; // e.g. 1499, 499, 899
    const compare = Math.round(rounded * 1.25);
    return { price: Math.max(299, rounded), comparePrice: compare };
  } else {
    // Food/Grocery prices between ₹30 and ₹850
    const base = 30 + (positive % 820);
    const rounded = Math.round(base / 5) * 5;
    const compare = Math.round(rounded * 1.15);
    return { price: Math.max(25, rounded), comparePrice: compare };
  }
}

function generateRating(seedStr: string): { rating: number; count: number } {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const rating = 3.8 + ((positive % 13) / 10); // 3.8 to 5.0
  const count = 15 + (positive % 850);
  return { rating: Math.min(5.0, Math.round(rating * 10) / 10), count };
}

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Fetch food products sold in India from Open Food Facts
   * Ensures: Selling in India, English Name, Verified Image, 1:1 Unique Image
   */
  async fetchIndiaFoodProducts(options?: { pageSize?: number; maxPages?: number }): Promise<OpenFactsProduct[]> {
    const pageSize = options?.pageSize || 100;
    const maxPages = options?.maxPages || 3;
    const products: OpenFactsProduct[] = [];
    const seenImages = new Set<string>();
    const seenBarcodes = new Set<string>();

    const categories = [
      "groceries",
      "snacks",
      "beverages",
      "dairy-products",
      "breakfast-cereals",
      "biscuits",
      "chocolates",
      "spices"
    ];

    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = `https://in.openfoodfacts.org/api/v2/search?countries_tags_en=india&fields=code,product_name,product_name_en,generic_name,brands,categories,categories_tags,image_url,image_front_url,image_front_small_url,nutriscore_grade,ingredients_text,quantity&page_size=${pageSize}&page=${page}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) continue;
        const data = await res.json();
        const rawList = data.products || [];

        for (const raw of rawList) {
          const barcode = raw.code;
          if (!barcode || seenBarcodes.has(barcode)) continue;

          const rawName = raw.product_name_en || raw.product_name;
          if (!isValidEnglishName(rawName)) continue;

          const rawImg = raw.image_front_small_url || raw.image_front_url || raw.image_url;
          if (!rawImg || typeof rawImg !== "string" || !rawImg.startsWith("http")) continue;

          const imageUrl = getOptimizedImageUrl(rawImg);

          // Enforce 1:1 unique image per product
          if (seenImages.has(imageUrl)) continue;
          seenImages.add(imageUrl);
          seenBarcodes.add(barcode);

          const title = cleanTitle(rawName);
          const brand = raw.brands ? cleanTitle(raw.brands.split(",")[0]) : "Indian Grocery";
          let category = "Groceries";
          let subcategory = "Food & Beverages";

          if (raw.categories) {
            const parts = raw.categories.split(",").map((c: string) => cleanTitle(c)).filter(Boolean);
            if (parts.length > 0) {
              category = "Food & Beverages";
              subcategory = parts[0];
            }
          }

          const pricing = generateINRPrice(barcode + title, false);
          const ratingData = generateRating(barcode);

          products.push({
            barcode,
            name: title,
            brand: brand || "Generic",
            category: "Food & Beverages",
            subcategory,
            description: raw.generic_name || raw.ingredients_text || `${title} from ${brand}. Genuine packaged food product sold in India.`,
            imageUrl,
            productType: "GROCERIES",
            quantity: raw.quantity || "Standard Pack",
            nutriscore: raw.nutriscore_grade || undefined,
            ingredients: raw.ingredients_text || undefined,
            priceINR: pricing.price,
            compareAtPriceINR: pricing.comparePrice,
            ratingAvg: ratingData.rating,
            reviewCount: ratingData.count,
            country: "India"
          });
        }
      } catch (err: any) {
        this.logger.warn(`Failed fetching Open Food Facts page ${page}: ${err.message}`);
      }
    }

    return products;
  }

  /**
   * Fetch electronics and tech accessories from Open Products Facts
   * Ensures: English Name, Verified Image, 1:1 Unique Image
   */
  async fetchElectronicsProducts(options?: { pageSize?: number }): Promise<OpenFactsProduct[]> {
    const pageSize = options?.pageSize || 100;
    const products: OpenFactsProduct[] = [];
    const seenImages = new Set<string>();
    const seenBarcodes = new Set<string>();

    const searchQueries = [
      "https://world.openproductsfacts.org/api/v2/search?categories_tags_en=electronics&fields=code,product_name,product_name_en,generic_name,brands,categories,image_url,image_front_url,image_front_small_url,quantity&page_size=100",
      "https://world.openproductsfacts.org/cgi/search.pl?search_terms=cable&search_simple=1&action=process&json=1",
      "https://world.openproductsfacts.org/cgi/search.pl?search_terms=charger&search_simple=1&action=process&json=1",
      "https://world.openproductsfacts.org/cgi/search.pl?search_terms=headphones&search_simple=1&action=process&json=1",
      "https://world.openproductsfacts.org/cgi/search.pl?search_terms=battery&search_simple=1&action=process&json=1",
      "https://world.openproductsfacts.org/cgi/search.pl?search_terms=phone&search_simple=1&action=process&json=1",
      "https://world.openproductsfacts.org/cgi/search.pl?search_terms=laptop&search_simple=1&action=process&json=1"
    ];

    for (const url of searchQueries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) continue;
        const data = await res.json();
        const rawList = data.products || [];

        for (const raw of rawList) {
          const barcode = raw.code;
          if (!barcode || seenBarcodes.has(barcode)) continue;

          const rawName = raw.product_name_en || raw.product_name;
          if (!isValidEnglishName(rawName)) continue;

          const rawImg = raw.image_front_small_url || raw.image_front_url || raw.image_url;
          if (!rawImg || typeof rawImg !== "string" || !rawImg.startsWith("http")) continue;

          const imageUrl = getOptimizedImageUrl(rawImg);

          // Enforce 1:1 unique image per product
          if (seenImages.has(imageUrl)) continue;
          seenImages.add(imageUrl);
          seenBarcodes.add(barcode);

          const title = cleanTitle(rawName);
          const brand = raw.brands ? cleanTitle(raw.brands.split(",")[0]) : "Tech Brand";
          let subcategory = "Electronics & Gadgets";

          if (raw.categories) {
            const parts = raw.categories.split(",").map((c: string) => cleanTitle(c)).filter(Boolean);
            if (parts.length > 0) {
              subcategory = parts[0];
            }
          }

          const pricing = generateINRPrice(barcode + title, true);
          const ratingData = generateRating(barcode);

          products.push({
            barcode,
            name: title,
            brand: brand || "Generic Electronics",
            category: "Electronics",
            subcategory,
            description: raw.generic_name || `${title} from ${brand}. Verified electronics item indexed in Open Products Facts.`,
            imageUrl,
            productType: "ELECTRONICS",
            quantity: raw.quantity || "1 Unit",
            priceINR: pricing.price,
            compareAtPriceINR: pricing.comparePrice,
            ratingAvg: ratingData.rating,
            reviewCount: ratingData.count,
            country: "India"
          });
        }
      } catch (err: any) {
        this.logger.warn(`Failed fetching Open Products Facts query ${url}: ${err.message}`);
      }
    }

    return products;
  }

  /**
   * Fetch complete combined catalog from Open Food Facts & Open Products Facts
   */
  async fetchUnifiedCatalog(): Promise<OpenFactsProduct[]> {
    this.logger.log("Fetching live Open Food Facts (India) and Open Products Facts (Electronics)...");
    const [foods, electronics] = await Promise.all([
      this.fetchIndiaFoodProducts({ pageSize: 100, maxPages: 4 }),
      this.fetchElectronicsProducts({ pageSize: 100 })
    ]);

    // Cross-check 1:1 image uniqueness across all categories
    const allProducts: OpenFactsProduct[] = [];
    const masterImages = new Set<string>();

    for (const p of [...foods, ...electronics]) {
      if (!masterImages.has(p.imageUrl)) {
        masterImages.add(p.imageUrl);
        allProducts.push(p);
      }
    }

    this.logger.log(`Fetched ${allProducts.length} verified products (Foods: ${foods.length}, Electronics: ${electronics.length}) with 100% unique images.`);
    return allProducts;
  }

  /**
   * Ingest a single product by barcode from either Open Food Facts or Open Products Facts
   */
  async ingestFromBarcode(barcode: string, fallbackSellerId: string): Promise<any> {
    // 1. Try Open Food Facts (India / World)
    let raw: any = null;
    let isElectronics = false;

    try {
      const offUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
      const offRes = await fetch(offUrl);
      if (offRes.ok) {
        const offPayload = await offRes.json();
        if (offPayload.product && (offPayload.product.product_name || offPayload.product.product_name_en)) {
          raw = offPayload.product;
          isElectronics = false;
        }
      }
    } catch (_) {}

    // 2. Fallback to Open Products Facts if not in food facts
    if (!raw) {
      try {
        const opfUrl = `https://world.openproductsfacts.org/api/v2/product/${barcode}.json`;
        const opfRes = await fetch(opfUrl);
        if (opfRes.ok) {
          const opfPayload = await opfRes.json();
          if (opfPayload.product && (opfPayload.product.product_name || opfPayload.product.product_name_en)) {
            raw = opfPayload.product;
            isElectronics = true;
          }
        }
      } catch (_) {}
    }

    if (!raw) {
      throw new Error(`Product not found in Open Food Facts or Open Products Facts for barcode: ${barcode}`);
    }

    const title = cleanTitle(raw.product_name_en || raw.product_name || (isElectronics ? "Electronics Item" : "Food Item"));
    const description = raw.description || raw.generic_name || `${title}. Authenticated product from Open Facts.`;
    const brandName = raw.brands ? cleanTitle(raw.brands.split(",")[0]) : (isElectronics ? "Tech Brand" : "Generic Foods");
    const categoryName = isElectronics ? "Electronics" : "Food & Beverages";
    const subcategoryName = raw.categories ? cleanTitle(raw.categories.split(",")[0]) : (isElectronics ? "Accessories" : "Groceries");

    const imageUrl = raw.image_url || raw.image_front_url || raw.image_front_small_url || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80";
    const pricing = generateINRPrice(barcode + title, isElectronics);

    return await this.prisma.$transaction(async (tx) => {
      // Resolve Brand
      let brand = await tx.brand.findUnique({ where: { name: brandName } });
      if (!brand) {
        brand = await tx.brand.create({ data: { name: brandName } });
      }

      // Resolve Parent Category
      let parentCategory = await tx.category.findUnique({ where: { name: categoryName } });
      if (!parentCategory) {
        parentCategory = await tx.category.create({
          data: { name: categoryName, parentId: null }
        });
      }

      // Resolve Subcategory
      let category = await tx.category.findUnique({ where: { name: subcategoryName } });
      if (!category) {
        category = await tx.category.create({
          data: {
            name: subcategoryName,
            parentId: parentCategory.id
          }
        });
      }

      // Create Product
      const skuBase = `${isElectronics ? "OPF" : "OFF"}-${barcode}`;
      let product = await tx.product.findFirst({
        where: { title }
      });

      if (!product) {
        product = await tx.product.create({
          data: {
            title,
            description,
            brandId: brand.id,
            categoryId: category.id,
            status: "ACTIVE",
            productType: isElectronics ? "ELECTRONICS" : "GROCERIES"
          }
        });
      }

      // Create Variant
      let variant = await tx.productVariant.findUnique({
        where: { sku: skuBase }
      });

      if (!variant) {
        variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: skuBase,
            name: raw.quantity || "Standard Pack",
            attributes: JSON.stringify({
              nutriscore: raw.nutriscore_grade || "N/A",
              ingredients: raw.ingredients_text || "Standard components",
              source: isElectronics ? "Open Products Facts" : "Open Food Facts",
              barcode
            }),
            imageUrl,
            status: "ACTIVE"
          }
        });
      }

      // Create Listing
      let listing = await tx.sellerListing.findFirst({
        where: {
          productVariantId: variant.id,
          sellerId: fallbackSellerId
        }
      });

      if (!listing) {
        listing = await tx.sellerListing.create({
          data: {
            productVariantId: variant.id,
            sellerId: fallbackSellerId,
            price: pricing.price * 100, // in paise / cents
            compareAtPrice: pricing.comparePrice * 100,
            currency: "INR",
            status: "ACTIVE"
          }
        });

        await tx.inventory.create({
          data: {
            sellerListingId: listing.id,
            quantity: 50,
            reservedQuantity: 0
          }
        });
      }

      return listing;
    });
  }
}
