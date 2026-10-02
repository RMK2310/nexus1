import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/state.dart';
import '../core/theme.dart';
import '../core/models.dart';
import '../core/images.dart';
import 'common.dart';

/// Quantity stepper used on product cards & cart rows.
class QtyStepper extends StatelessWidget {
  final int quantity;
  final ValueChanged<int> onChanged;
  final Color color;

  const QtyStepper({
    super.key,
    required this.quantity,
    required this.onChanged,
    this.color = NexusTheme.shopAccent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 34,
      decoration: BoxDecoration(
        color: color.withOpacity(0.14),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: () => onChanged(quantity - 1),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 10),
              child: Icon(Icons.remove, size: 16, color: Colors.white),
            ),
          ),
          Text('$quantity',
              style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 13)),
          GestureDetector(
            onTap: () => onChanged(quantity + 1),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 10),
              child: Icon(Icons.add, size: 16, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

/// Product grid card (Blinkit/Zepto style).
class ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback onOpen;

  const ProductCard({
    super.key,
    required this.product,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final listing = product.bestListing;
    var inCart = 0;
    for (final i in state.cartItems) {
      if (i.sellerListingId == listing?.id) inCart = i.quantity;
    }

    return GestureDetector(
      onTap: onOpen,
      child: Container(
        decoration: BoxDecoration(
          color: NexusTheme.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: NexusTheme.border.withOpacity(0.6)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image area
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(18)),
                      child: NexusImage(
                        url: product.imageUrl,
                        categoryName: product.categoryName,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  if (product.discountPercent != null)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: NexusTheme.shopAccent,
                          borderRadius: BorderRadius.circular(7),
                        ),
                        child: Text('${product.discountPercent}% OFF',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800)),
                      ),
                    ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(7),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.star_rounded,
                              color: NexusTheme.rideAccent, size: 12),
                          const SizedBox(width: 2),
                          Text(
                            product.rating > 0
                                ? product.rating.toStringAsFixed(1)
                                : '4.2',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Info
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: NexusTheme.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 13)),
                  const SizedBox(height: 2),
                  Text(
                    product.brandName ?? product.categoryName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: NexusTheme.textMuted, fontSize: 11),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: PriceText(
                            price: product.price, mrp: product.mrp, fontSize: 14),
                      ),
                      if (listing != null)
                        inCart > 0
                            ? QtyStepper(
                                quantity: inCart,
                                onChanged: (q) => context
                                    .read<AppState>()
                                    .setQuantity(listing.id, q),
                              )
                            : _AddButton(
                                onTap: () async {
                                  await context
                                      .read<AppState>()
                                      .addToCart(product);
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                          content: Text(
                                              '${product.title} added to cart'),
                                          duration:
                                              const Duration(milliseconds: 900)),
                                    );
                                  }
                                },
                              ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddButton extends StatelessWidget {
  final VoidCallback onTap;
  const _AddButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: NexusTheme.shopAccent.withOpacity(0.16),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: NexusTheme.shopAccent.withOpacity(0.5)),
        ),
        child: const Text('ADD',
            style: TextStyle(
                color: NexusTheme.shopAccent,
                fontWeight: FontWeight.w800,
                fontSize: 12,
                letterSpacing: 0.5)),
      ),
    );
  }
}
