import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/api.dart';
import '../../core/models.dart';
import '../../core/state.dart';
import '../../widgets/common.dart';
import '../../widgets/shop_widgets.dart';
import 'product_detail.dart';
import 'cart_page.dart';

class ShopHome extends StatefulWidget {
  const ShopHome({super.key});

  @override
  State<ShopHome> createState() => _ShopHomeState();
}

class _ShopHomeState extends State<ShopHome> {
  final _searchCtrl = TextEditingController();
  Timer? _debounce;
  String _query = '';
  String _category = 'ALL';
  List<Category> _categories = [];
  Map<String, List<Product>> _results = {}; // key: 'q|cat'
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    setState(() => _loading = true);
    try {
      _categories = await Api.I.categories();
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() =>
          _error = 'Cannot reach the NEXUS server. Is the backend running?');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _load() async {
    final key = '$_query|$_category';
    try {
      final list = await Api.I.products(
          search: _query.isEmpty ? null : _query,
          category: _category,
          limit: 40);
      if (!mounted) return;
      setState(() => _results[key] = list);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    }
  }

  void _onSearch(String v) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      setState(() {
        _query = v.trim();
        _loading = true;
      });
      _load().then((_) => mounted ? setState(() => _loading = false) : null);
    });
  }

  @override
  Widget build(BuildContext context) {
    final key = '$_query|$_category';
    final products = _results[key] ?? const <Product>[];

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header row
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 10, 12, 0),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            gradient: NexusTheme.primaryGradient,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text('N',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 20)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('NEXUS Store',
                                  style: TextStyle(
                                      color: NexusTheme.textPrimary,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 17)),
                              Text('Delivery in 10 minutes',
                                  style: TextStyle(
                                      color: Colors
                                          .grey.shade500, // textSecondary
                                      fontSize: 11.5)),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.notifications_none_rounded,
                              color: NexusTheme.textSecondary),
                          onPressed: () {},
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  // Search bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: TextField(
                      controller: _searchCtrl,
                      onChanged: _onSearch,
                      decoration: InputDecoration(
                        hintText: 'Search for milk, oats, phones…',
                        prefixIcon: const Icon(Icons.search,
                            color: NexusTheme.textMuted),
                        suffixIcon: _query.isEmpty
                            ? null
                            : IconButton(
                                icon: const Icon(Icons.close_rounded,
                                    size: 18, color: NexusTheme.textMuted),
                                onPressed: () {
                                  _searchCtrl.clear();
                                  _onSearch('');
                                },
                              ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Category chips
                  SizedBox(
                    height: 40,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      scrollDirection: Axis.horizontal,
                      itemCount: _categories.length + 1,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, i) {
                        final name =
                            i == 0 ? 'ALL' : _categories[i - 1].name;
                        final sel = _category == name;
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _category = name;
                              _loading = true;
                            });
                            _load().then((_) =>
                                mounted ? setState(() => _loading = false) : null);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 9),
                            decoration: BoxDecoration(
                              color: sel
                                  ? NexusTheme.shopAccent
                                  : NexusTheme.surfaceLight,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(name,
                                style: TextStyle(
                                  color: sel
                                      ? Colors.white
                                      : NexusTheme.textSecondary,
                                  fontWeight:
                                      sel ? FontWeight.w700 : FontWeight.w500,
                                  fontSize: 12.5,
                                )),
                          ),
                        );
                      },
                    ),
                  ),
                  // Banners
                  PromiseBanner(
                    text: 'Free delivery on orders above ₹199',
                    icon: Icons.bolt_rounded,
                    gradient: NexusTheme.shopGradient.colors,
                  ),
                  const PromiseBanner(
                    text: 'Pay with NEXUS Wallet or UPI via Razorpay',
                    icon: Icons.account_balance_wallet_rounded,
                    gradient: [Color(0xFF155E75), Color(0xFF38BDF8)],
                  ),
                ],
              ),
            ),
            // Products
            if (_loading)
              SliverPadding(
                padding: const EdgeInsets.all(20),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.72,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (_, __) => const SkeletonCard(height: 240),
                    childCount: 6,
                  ),
                ),
              )
            else if (_error != null && products.isEmpty)
              SliverFillRemaining(
                child: ErrorView(message: _error!, onRetry: _bootstrap),
              )
            else if (products.isEmpty)
              const SliverFillRemaining(
                child: EmptyView(
                  icon: Icons.search_off_rounded,
                  title: 'No products found',
                  subtitle: 'Try a different search or category.',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.72,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, i) => ProductCard(
                      product: products[i],
                      onOpen: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              ProductDetailPage(product: products[i]),
                        ),
                      ),
                    ),
                    childCount: products.length,
                  ),
                ),
              ),
          ],
        ),
      ),
      // Floating cart bar
      bottomSheet: Consumer<AppState>(
        builder: (context, state, _) {
          if (!state.hasItem) return const SizedBox.shrink();
          return Container(
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            decoration: BoxDecoration(
              gradient: NexusTheme.shopGradient,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: NexusTheme.shopAccent.withOpacity(0.35),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const CartPage())),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  child: Row(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('${state.cartCount} item${state.cartCount > 1 ? 's' : ''} · ${inr(state.cartTotal)}',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14.5)),
                          const Text('Extra charges may apply',
                              style: TextStyle(
                                  color: Colors.white70, fontSize: 10.5)),
                        ],
                      ),
                      const Spacer(),
                      const Text('View Cart',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 14)),
                      const SizedBox(width: 6),
                      const Icon(Icons.arrow_forward_rounded,
                          color: Colors.white, size: 18),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
