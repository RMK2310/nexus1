import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';
import 'models.dart';

/// Global application state: authentication, cart, wallet.
class AppState extends ChangeNotifier {
  final Api api = Api.I;

  // ── Session ──
  bool _booting = true;
  bool _authenticated = false;
  User? _user;

  // ── Cart (server-synced; local mirror for instant UI) ──
  final Map<String, CartItem> _cart = {}; // key: sellerListingId
  bool _cartSyncing = false;

  // ── Wallet ──
  int _walletBalance = 0; // paise
  bool _walletLoaded = false;

  bool get booting => _booting;
  bool get isAuthenticated => _authenticated;
  User? get user => _user;
  bool get cartSyncing => _cartSyncing;

  List<CartItem> get cartItems => _cart.values.toList();
  int get cartCount => _cart.values.fold(0, (s, i) => s + i.quantity);
  int get cartTotal =>
      _cart.values.fold(0, (s, i) => s + i.lineTotal);
  bool get hasItem => _cart.isNotEmpty;

  int get walletBalance => _walletBalance;
  bool get walletLoaded => _walletLoaded;

  // ═══════════════ BOOT ═══════════════

  Future<void> boot() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('nx_access_token');
    final refresh = prefs.getString('nx_refresh_token');

    if (token != null && token.isNotEmpty) {
      api.accessToken = token;
      api.refreshToken = refresh;
      _authenticated = true;
      try {
        _user = await api.me();
      } catch (_) {
        // Token invalid — keep user "logged in" offline; API calls will
        // prompt re-login when they 401.
      }
      final cachedCart = prefs.getStringList('nx_cart') ?? const [];
      for (final raw in cachedCart) {
        try {
          final item = CartItem.fromJson(
              Map<String, dynamic>.from(jsonDecode(raw) as Map));
          _cart[item.sellerListingId] = item;
        } catch (_) {}
      }
      final bal = prefs.getInt('nx_wallet');
      if (bal != null) {
        _walletBalance = bal;
        _walletLoaded = true;
      }
    }
    _booting = false;
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('nx_cart',
        _cart.values.map((c) => jsonEncode(c.toJson())).toList());
    if (_walletLoaded) await prefs.setInt('nx_wallet', _walletBalance);
  }

  // ═══════════════ AUTH ═══════════════

  Future<void> login(String email, String password) async {
    final user = await api.login(email, password);
    _user = user;
    _authenticated = true;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('nx_access_token', api.accessToken ?? '');
    await prefs.setString('nx_refresh_token', api.refreshToken ?? '');
    await prefs.setString('nx_user', jsonEncode({
      'id': user.id, 'name': user.name, 'email': user.email,
    }));

    // Fire-and-forget: refresh wallet + cart from server.
    refreshWallet();
    refreshCart();
    notifyListeners();
  }

  Future<void> register(String name, String email, String password) async {
    final user = await api.register(name, email, password);
    _user = user;
    _authenticated = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('nx_access_token', api.accessToken ?? '');
    await prefs.setString('nx_refresh_token', api.refreshToken ?? '');
    notifyListeners();
  }

  Future<void> logout() async {
    await api.logout();
    _authenticated = false;
    _user = null;
    _cart.clear();
    _walletBalance = 0;
    _walletLoaded = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }

  // ═══════════════ CART ═══════════════

  /// Adds an item. Works offline (optimistic) and syncs when authenticated.
  Future<void> addToCart(Product product) async {
    final listing = product.bestListing;
    if (listing == null) return;
    final existing = _cart[listing.id];
    if (existing != null) {
      _cart[listing.id] =
          existing.copyWith(quantity: existing.quantity + 1);
    } else {
      _cart[listing.id] = CartItem(
        sellerListingId: listing.id,
        title: product.title,
        imageUrl: product.imageUrl,
        price: listing.price,
        quantity: 1,
      );
    }
    notifyListeners();
    _persist();

    if (_authenticated) {
      _cartSyncing = true;
      notifyListeners();
      try {
        await api.addToCart(listing.id);
      } catch (_) {}
      _cartSyncing = false;
      notifyListeners();
    }
  }

  Future<void> setQuantity(String sellerListingId, int qty) async {
    final item = _cart[sellerListingId];
    if (item == null) return;
    if (qty <= 0) {
      _cart.remove(sellerListingId);
    } else {
      _cart[sellerListingId] = item.copyWith(quantity: qty);
    }
    notifyListeners();
    _persist();

    if (_authenticated) {
      try {
        await api.updateCart(sellerListingId, qty);
      } catch (_) {}
    }
  }

  void clearCartLocal() {
    _cart.clear();
    notifyListeners();
    _persist();
  }

  Future<void> refreshCart() async {
    if (!_authenticated) return;
    try {
      final items = await api.cart();
      _cart
        ..clear()
        ..addEntries(items.map((i) => MapEntry(i.sellerListingId, i)));
      notifyListeners();
    } catch (_) {}
  }

  // ═══════════════ WALLET ═══════════════

  Future<void> refreshWallet() async {
    if (!_authenticated) return;
    try {
      final w = await api.wallet();
      final bal = w['balance'];
      if (bal != null) {
        _walletBalance =
            bal is int ? bal : (bal is num ? bal.toInt() : 0);
        _walletLoaded = true;
        notifyListeners();
        _persist();
      }
    } catch (_) {}
  }

  /// Generates an idempotency key for checkout operations.
  String newIdempotencyKey() {
    final rnd = Random.secure();
    final bytes = List<int>.generate(16, (_) => rnd.nextInt(256));
    return DateTime.now().millisecondsSinceEpoch.toString() +
        bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }
}
