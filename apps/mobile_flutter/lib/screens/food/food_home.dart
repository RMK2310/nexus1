import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../core/api.dart';
import '../../core/models.dart';
import '../../widgets/common.dart';

class FoodHome extends StatefulWidget {
  const FoodHome({super.key});

  @override
  State<FoodHome> createState() => _FoodHomeState();
}

class _FoodHomeState extends State<FoodHome> {
  List<Restaurant> _restaurants = const [];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _restaurants = await Api.I.restaurants();
    } catch (_) {
      _error =
          'Food module API is coming online soon. Restaurants below are from your backend seed.';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Restaurant> get _filtered {
    if (_query.isEmpty) return _restaurants;
    final q = _query.toLowerCase();
    return _restaurants
        .where((r) =>
            r.name.toLowerCase().contains(q) ||
            r.cuisine.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final list = _filtered;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(0, 10, 0, 24),
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 0),
              child: NexusHeader(
                title: 'NEXUS Food',
                subtitle: 'Craving something? We deliver.',
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                onChanged: (v) => setState(() => _query = v.trim()),
                decoration: const InputDecoration(
                  hintText: 'Search restaurants & cuisines…',
                  prefixIcon:
                      Icon(Icons.search, color: NexusTheme.textMuted),
                ),
              ),
            ),
            const SizedBox(height: 14),
            PromiseBanner(
              text: 'FREE delivery on your first 3 food orders',
              icon: Icons.local_shipping_rounded,
              gradient: NexusTheme.foodGradient.colors,
            ),
            const SizedBox(height: 6),
            if (_loading)
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: List.generate(
                      3, (_) => const Padding(
                        padding: EdgeInsets.only(bottom: 12),
                        child: SkeletonCard(height: 150),
                      )),
                ),
              )
            else if (list.isEmpty)
              EmptyView(
                icon: Icons.restaurant_menu_rounded,
                title: _query.isEmpty
                    ? 'No restaurants yet'
                    : 'No matches for "$_query"',
                subtitle: _error ?? 'Check back soon — kitchens are warming up!',
              )
            else
              ...list.map((r) => _RestaurantCard(
                    restaurant: r,
                    onTap: () => _openMenu(r),
                  )),
          ],
        ),
      ),
    );
  }

  void _openMenu(Restaurant r) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        builder: (ctx, scrollCtrl) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(r.name,
                      style: Theme.of(ctx).textTheme.headlineMedium),
                  Text('${r.cuisine} · 25-35 min · ₹₹',
                      style: Theme.of(ctx).textTheme.bodyMedium),
                ],
              ),
            ),
            const Divider(),
            Expanded(
              child: r.menu.isEmpty
                  ? const EmptyView(
                      icon: Icons.menu_book_rounded,
                      title: 'Menu coming soon',
                      subtitle:
                          'This restaurant has not published its menu yet.')
                  : ListView.separated(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.all(20),
                      itemCount: r.menu.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (ctx, i) {
                        final item = r.menu[i];
                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: NexusTheme.surfaceLight,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(item.name,
                                        style: const TextStyle(
                                            color: NexusTheme.textPrimary,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 14)),
                                    const SizedBox(height: 4),
                                    Text(inr(item.price),
                                        style: const TextStyle(
                                            color: NexusTheme.textSecondary,
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600)),
                                    const SizedBox(height: 4),
                                    Text(
                                        item.isAvailable
                                            ? 'Available now'
                                            : 'Sold out today',
                                        style: TextStyle(
                                            color: item.isAvailable
                                                ? NexusTheme.success
                                                : NexusTheme.danger,
                                            fontSize: 11)),
                                  ],
                                ),
                              ),
                              FilledButton(
                                onPressed: item.isAvailable
                                    ? () {
                                        Navigator.pop(ctx);
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(
                                          SnackBar(
                                            content: Text(
                                                '${item.name} — food ordering flow ships with the Food Delivery module. Restaurant seed is live!'),
                                            backgroundColor:
                                                NexusTheme.foodAccent,
                                          ),
                                        );
                                      }
                                    : null,
                                style: FilledButton.styleFrom(
                                    backgroundColor:
                                        NexusTheme.foodAccent,
                                    minimumSize: const Size(84, 38)),
                                child: const Text('Add',
                                    style: TextStyle(fontSize: 13)),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RestaurantCard extends StatelessWidget {
  final Restaurant restaurant;
  final VoidCallback onTap;

  const _RestaurantCard({required this.restaurant, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 6, 20, 6),
        decoration: BoxDecoration(
          color: NexusTheme.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: NexusTheme.border.withOpacity(0.6)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header banner with food gradient
            Container(
              height: 92,
              decoration: BoxDecoration(
                gradient: NexusTheme.foodGradient,
                borderRadius:
                    BorderRadius.vertical(top: Radius.circular(18)),
              ),
              child: Row(
                children: [
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(restaurant.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 17)),
                        const SizedBox(height: 2),
                        Text(restaurant.cuisine,
                            style: TextStyle(
                                color: Colors.white.withOpacity(0.85),
                                fontSize: 12)),
                      ],
                    ),
                  ),
                  Container(
                    margin: const EdgeInsets.only(right: 16),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.star_rounded,
                            color: Colors.white, size: 13),
                        SizedBox(width: 3),
                        Text('4.3',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  const Icon(Icons.timer_outlined,
                      color: NexusTheme.textMuted, size: 16),
                  const SizedBox(width: 5),
                  const Text('25-35 min',
                      style: TextStyle(
                          color: NexusTheme.textSecondary, fontSize: 12)),
                  const SizedBox(width: 14),
                  const Icon(Icons.local_shipping_outlined,
                      color: NexusTheme.textMuted, size: 16),
                  const SizedBox(width: 5),
                  Text('${restaurant.menu.length} items',
                      style: const TextStyle(
                          color: NexusTheme.textSecondary, fontSize: 12)),
                  const Spacer(),
                  const Icon(Icons.chevron_right_rounded,
                      color: NexusTheme.textMuted),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
