import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/models.dart';
import '../../core/state.dart';
import '../../core/images.dart';
import '../../widgets/common.dart';
import '../../widgets/shop_widgets.dart';

class ProductDetailPage extends StatelessWidget {
  final Product product;
  const ProductDetailPage({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final listing = product.bestListing;
    final qty = listing == null
        ? 0
        : state
            .cartItems
            .where((i) => i.sellerListingId == listing.id)
            .fold(0, (s, i) => s + i.quantity);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              title: Text(product.categoryName,
                  style: const TextStyle(fontSize: 16)),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => Navigator.pop(context),
              ),
            ),
            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20),
                    decoration: BoxDecoration(
                      color: NexusTheme.surface,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                          color: NexusTheme.border.withOpacity(0.5)),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: AspectRatio(
                        aspectRatio: 1.15,
                        child: Hero(
                          tag: 'product-${product.id}',
                          child:
                              NexusImage(url: product.imageUrl, fit: BoxFit.cover),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (product.brandName != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: NexusTheme.primary.withOpacity(0.14),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(product.brandName!,
                                style: const TextStyle(
                                    color: NexusTheme.primary,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700)),
                          ),
                        const SizedBox(height: 10),
                        Text(product.title,
                            style: Theme.of(context).textTheme.headlineMedium),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: NexusTheme.success.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.star_rounded,
                                      color: NexusTheme.success, size: 14),
                                  const SizedBox(width: 3),
                                  Text(
                                    product.rating > 0
                                        ? product.rating.toStringAsFixed(1)
                                        : '4.2',
                                    style: const TextStyle(
                                        color: NexusTheme.success,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                                '${product.reviewCount > 0 ? product.reviewCount : 128} ratings',
                                style: Theme.of(context).textTheme.bodyMedium),
                          ],
                        ),
                        const SizedBox(height: 16),
                        PriceText(
                            price: product.price,
                            mrp: product.mrp,
                            fontSize: 22),
                        const SizedBox(height: 4),
                        Text('Inclusive of all taxes',
                            style: Theme.of(context).textTheme.labelSmall),
                        const SizedBox(height: 20),
                        const SectionTitle('Product details'),
                        Text(
                          product.description.isEmpty
                              ? 'Quality product available on NEXUS. Delivery within 10 minutes from your nearest NEXUS store.'
                              : product.description,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            const Icon(Icons.bolt_rounded,
                                color: NexusTheme.shopAccent, size: 18),
                            const SizedBox(width: 6),
                            Text('Delivery in 10 minutes',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(
                                        color: NexusTheme.shopAccent,
                                        fontWeight: FontWeight.w700)),
                          ],
                        ),
                        const SizedBox(height: 100),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomSheet: listing == null
          ? null
          : Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
              decoration: const BoxDecoration(
                color: NexusTheme.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: qty > 0
                  ? Row(
                      children: [
                        Expanded(
                          child: QtyStepper(
                            quantity: qty,
                            onChanged: (q) => context
                                .read<AppState>()
                                .setQuantity(listing.id, q),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: FilledButton(
                            onPressed: () {},
                            style: FilledButton.styleFrom(
                                backgroundColor: NexusTheme.shopAccent),
                            child: Text('Buy  ·  ${inr(listing.price * qty)}'),
                          ),
                        ),
                      ],
                    )
                  : FilledButton(
                      onPressed: () async {
                        await context.read<AppState>().addToCart(product);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                                content: Text('${product.title} added to cart'),
                                duration: const Duration(milliseconds: 900)),
                          );
                        }
                      },
                      style: FilledButton.styleFrom(
                          backgroundColor: NexusTheme.shopAccent),
                      child: const Text('Add to cart'),
                    ),
            ),
    );
  }
}
