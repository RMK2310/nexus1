import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../core/config.dart';
import '../core/theme.dart';

/// Resolves product image URLs to fast, cacheable sources.
///
/// Strategy (fixes the "slow image loading" problem):
///  1. Backend-hosted local images (`/images/products/*.jpg`) are used
///     directly — they are small and served from your own server.
///  2. External CDN images (OpenFoodFacts etc.) are proxied via the
///     backend's `/api/image-proxy` route (HTTP caching + proper headers),
///     never hot-linked directly from slow origins.
///  3. On disk caching via [CachedNetworkImage] so images load instantly
///     on subsequent visits.
class ImageResolver {
  /// Maps product categories to local fallback images.
  static const Map<String, String> _categoryImage = {
    'fruit': 'fruits', 'vegetable': 'vegetables', 'snack': 'chips',
    'dairy': 'milk', 'beverage': 'milk', 'staple': 'rice',
    'electronic': 'smartphone', 'phone': 'smartphone', 'mobile': 'smartphone',
    'audio': 'headphones', 'wearable': 'smartwatch', 'computer': 'laptop',
    'appliance': 'refrigerator', 'kitchen': 'refrigerator',
    'cleaning': 'cleaner', 'home': 'cleaner',
  };

  /// Picks a category-appropriate fallback image filename.
  static String fallbackFor(String? categoryName) {
    final c = (categoryName ?? '').toLowerCase();
    for (final entry in _categoryImage.entries) {
      if (c.contains(entry.key)) return '${entry.value}.jpg';
    }
    return 'fruits.jpg';
  }

  /// Maps title keywords to local images for instant loading.
  static const Map<String, String> _titleImage = {
    'apple': 'apples', 'banana': 'bananas', 'biscuit': 'biscuit',
    'bread': 'bread', 'charger': 'charger', 'chips': 'chips',
    'chocolate': 'chocolate', 'dal': 'dal', 'earbud': 'earbuds',
    'headphone': 'headphones', 'laptop': 'laptop', 'milk': 'milk',
    'paneer': 'paneer', 'rice': 'rice', 'watch': 'smartwatch',
    'speaker': 'speaker', 'spice': 'spices', 'television': 'television',
    'tv ': 'television', 'detergent': 'detergent', 'oats': 'quaker-rolled-oats',
    'muesli': 'bagrrys-swiss-muesli', 'corn flakes': 'kelloggs-corn-flakes',
    'kellogg': 'kelloggs-corn-flakes', 'quaker': 'quaker-rolled-oats',
    'bagrrys': 'bagrrys-white-oats', 'power bank': 'powerbank',
    'powerbank': 'powerbank', 'battery': 'powerbank', 'fruit': 'fruits',
    'vegetable': 'vegetables', 'phone': 'smartphone',
  };

  /// Maps well-known product keywords to local images for instant loading.

  /// Returns the best URL for a product image.
  ///
  /// [title] is used to find a matching local image when the remote URL
  /// is from a slow origin; [categoryName] picks the fallback image.
  static String resolve(String? rawUrl, {String? title, String? categoryName}) {
    if (rawUrl != null && rawUrl.isNotEmpty) {
      // Already a local backend image — use as-is.
      if (rawUrl.contains('/images/products/')) return rawUrl;
    }

    // Try to map by title keyword to a fast local image.
    if (title != null) {
      final t = '$title '.toLowerCase();
      for (final map in [_titleImage, _categoryImage]) {
        final matched = map.entries.firstWhere(
          (e) => t.contains(e.key),
          orElse: () => const MapEntry('', ''),
        );
        if (matched.value.isNotEmpty) {
          return '${AppConfig.apiBase}/images/products/${matched.value}.jpg';
        }
      }
    }

    // Keep the external URL but route it through the backend proxy
    // (adds caching + category-aware fallback when an origin is unreachable).
    if (rawUrl != null && rawUrl.startsWith('http')) {
      final fb = fallbackFor(categoryName);
      return '${AppConfig.apiBase}/api/image-proxy'
          '?url=${Uri.encodeComponent(rawUrl)}'
          '&fallback=${Uri.encodeComponent(fb)}';
    }

    // Default fallback.
    return '${AppConfig.apiBase}/images/products/fruits.jpg';
  }

  /// The generic placeholder used while a product image loads.
  static String get fallback => '${AppConfig.apiBase}/images/products/fruits.jpg';
}

/// Cached product image with shimmer placeholder and error fallback.
class NexusImage extends StatelessWidget {
  final String url;
  final String? categoryName;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  const NexusImage({
    super.key,
    required this.url,
    this.categoryName,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final resolved =
        ImageResolver.resolve(url, categoryName: categoryName);

    final img = CachedNetworkImage(
      imageUrl: resolved,
      width: width,
      height: height,
      fit: fit,
      memCacheWidth: 600, // decode at reasonable size, saves RAM
      fadeInDuration: const Duration(milliseconds: 180),
      placeholder: (_, __) => Container(
        color: NexusTheme.surfaceLight,
        child: const Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.2),
          ),
        ),
      ),
      errorWidget: (_, __, ___) => Container(
        color: NexusTheme.surfaceLight,
        child: const Icon(Icons.image_outlined,
            color: NexusTheme.textMuted, size: 34),
      ),
    );

    if (borderRadius == null) return img;
    return ClipRRect(borderRadius: borderRadius!, child: img);
  }
}
