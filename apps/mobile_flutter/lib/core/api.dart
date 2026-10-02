import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';
import 'models.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

/// NEXUS backend API client.
class Api {
  Api._();
  static final Api I = Api._();

  final http.Client _http = http.Client();

  String? accessToken;
  String? refreshToken;

  // ── In-memory caches (fast re-entry, fewer requests) ──
  final Map<String, List<Product>> _productCache = {};
  final Map<String, List<Category>> _categoryCache = {};
  DateTime? _productsAt;
  static const _cacheTtl = Duration(minutes: 10);

  // ═══════════════ AUTH ═══════════════

  Future<User> login(String email, String password) async {
    final data = await _post('/api/v1/auth/login', {
      'email': email,
      'password': password,
    });
    accessToken = data['accessToken']?.toString();
    refreshToken = data['refreshToken']?.toString();
    return User.fromJson(Map<String, dynamic>.from(data['user'] ?? {}));
  }

  Future<User> register(String name, String email, String password) async {
    await _post('/api/v1/auth/register', {
      'name': name,
      'email': email,
      'password': password,
    });
    return login(email, password);
  }

  Future<User> me() async {
    final data = await _get('/api/v1/auth/me');
    return User.fromJson(Map<String, dynamic>.from(data));
  }

  Future<void> logout() async {
    try {
      await _post('/api/v1/auth/logout', {
        if (refreshToken != null) 'refreshToken': refreshToken,
      });
    } catch (_) {}
    accessToken = null;
    refreshToken = null;
    _productCache.clear();
    _categoryCache.clear();
  }

  // ═══════════════ CATALOG ═══════════════

  Future<List<Category>> categories() async {
    final cached = _categoryCache['all'];
    if (cached != null) return cached;

    try {
      final data = await _get('/api/v1/commerce/categories');
      final list = (data is List ? data : data['categories'] ?? const []);
      final cats = list
          .whereType<Map>()
          .map((c) => Category.fromJson(Map<String, dynamic>.from(c)))
          .toList();
      _categoryCache['all'] = cats;
      return cats;
    } catch (_) {
      return _fallbackCategories;
    }
  }

  static const _fallbackCategories = [
    Category(id: 'fruits', name: 'Fruits & Vegetables'),
    Category(id: 'dairy', name: 'Dairy & Breakfast'),
    Category(id: 'snacks', name: 'Snacks & Munchies'),
    Category(id: 'staples', name: 'Atta, Rice & Dal'),
    Category(id: 'electronics', name: 'Electronics'),
    Category(id: 'appliances', name: 'Home Appliances'),
  ];

  /// Search products. [category] filters by category name.
  Future<List<Product>> products({
    String? search,
    String? category,
    int limit = 40,
    bool forceRefresh = false,
  }) async {
    final key = '$search|$category|$limit';
    if (!forceRefresh) {
      final cached = _productCache[key];
      final fresh = _productsAt != null &&
          DateTime.now().difference(_productsAt!) < _cacheTtl;
      if (cached != null && fresh) return cached;
    }

    final qp = <String, String>{
      'limit': '$limit',
      if (search != null && search.isNotEmpty) 'search': search,
      if (category != null && category != 'ALL' && category.isNotEmpty)
        'category': category,
    };

    try {
      final data = await _get(
        '/api/v1/products?${Uri(queryParameters: qp).query}',
      );
      final list =
          (data['products'] as List?) ?? (data is List ? data : const []);
      final products = list
          .whereType<Map>()
          .map((p) => Product.fromJson(Map<String, dynamic>.from(p)))
          .toList();
      _productCache[key] = products;
      _productsAt = DateTime.now();
      return products;
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Could not reach NEXUS server ($e)');
    }
  }

  // ═══════════════ CART ═══════════════

  Future<List<CartItem>> cart() async {
    final data = await _get('/api/v1/commerce/cart');
    final list = (data is List ? data : data['items'] ?? const []);
    return list
        .whereType<Map>()
        .map((c) => CartItem.fromJson(Map<String, dynamic>.from(c)))
        .toList();
  }

  Future<void> addToCart(String sellerListingId, {int quantity = 1}) async {
    await _post('/api/v1/commerce/cart/items', {
      'sellerListingId': sellerListingId,
      'quantity': quantity,
    });
  }

  Future<void> updateCart(String sellerListingId, int quantity) async {
    if (quantity <= 0) {
      await _delete('/api/v1/commerce/cart/items/$sellerListingId');
    } else {
      await _patch('/api/v1/commerce/cart/items/$sellerListingId',
          {'quantity': quantity});
    }
  }

  Future<void> removeFromCart(String sellerListingId) async {
    await _delete('/api/v1/commerce/cart/items/$sellerListingId');
  }

  // ═══════════════ CHECKOUT (Razorpay) ═══════════════

  /// Casts a dynamic JSON response to a typed map.
  Future<Map<String, dynamic>> _map(Future<dynamic> f) async =>
      Map<String, dynamic>.from(await f as Map);

  /// Creates a Razorpay order for the current cart (or a buy-now listing).
  Future<Map<String, dynamic>> createRazorpayOrder(
      {String? buyNowListingId, int buyNowQty = 1}) {
    return _map(_post('/api/v1/commerce/checkout/razorpay/create-order', {
      if (buyNowListingId != null)
        'buyNow': {'sellerListingId': buyNowListingId, 'quantity': buyNowQty},
    }));
  }

  Future<Map<String, dynamic>> verifyRazorpayPayment({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    String? signature,
    String paymentMethod = 'UPI',
  }) {
    return _map(_post('/api/v1/commerce/checkout/razorpay/verify-payment', {
      'razorpay_order_id': razorpayOrderId,
      'razorpay_payment_id': razorpayPaymentId,
      if (signature != null) 'razorpay_signature': signature,
      'paymentMethod': paymentMethod,
    }));
  }

  Future<Map<String, dynamic>> walletCheckout({
    required String idempotencyKey,
    String paymentMethod = 'WALLET',
  }) {
    return _map(_post('/api/v1/commerce/checkout', {
      'idempotencyKey': idempotencyKey,
      'paymentMethod': paymentMethod,
    }));
  }

  // ═══════════════ WALLET ═══════════════

  Future<Map<String, dynamic>> wallet() => _map(_get('/api/v1/wallet'));

  Future<List<Map<String, dynamic>>> walletTransactions() async {
    final data = await _get('/api/v1/wallet/transactions?limit=50');
    final list = (data is List ? data : data['transactions'] ?? const []);
    return list.whereType<Map>().map(Map<String, dynamic>.from).toList();
  }

  Future<Map<String, dynamic>> walletTopUp(num amount,
      {String method = 'UPI'}) {
    return _map(_post('/api/v1/wallet/topup', {
      'amount': amount,
      'paymentMethod': method,
    }));
  }

  // ═══════════════ FOOD (best-effort; module ships next) ═══════════════

  Future<List<Restaurant>> restaurants() async {
    try {
      final data = await _get('/api/v1/food/restaurants');
      final list = (data is List ? data : data['restaurants'] ?? const []);
      return list
          .whereType<Map>()
          .map((r) => Restaurant.fromJson(Map<String, dynamic>.from(r)))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  // ═══════════════ internals ═══════════════

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (accessToken != null) 'Authorization': 'Bearer $accessToken',
      };

  Future<dynamic> _get(String path) async {
    final res = await _http
        .get(Uri.parse('${AppConfig.apiBase}$path'), headers: _headers)
        .timeout(AppConfig.receiveTimeout);
    return _process(res);
  }

  Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    final res = await _http
        .post(Uri.parse('${AppConfig.apiBase}$path'),
            headers: _headers, body: jsonEncode(body))
        .timeout(AppConfig.receiveTimeout);
    return _process(res);
  }

  Future<dynamic> _patch(String path, Map<String, dynamic> body) async {
    final res = await _http
        .patch(Uri.parse('${AppConfig.apiBase}$path'),
            headers: _headers, body: jsonEncode(body))
        .timeout(AppConfig.receiveTimeout);
    return _process(res);
  }

  Future<dynamic> _delete(String path) async {
    final res = await _http
        .delete(Uri.parse('${AppConfig.apiBase}$path'), headers: _headers)
        .timeout(AppConfig.receiveTimeout);
    return _process(res);
  }

  dynamic _process(http.Response res) {
    final body = res.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(res.body) as Map<String, dynamic>;

    if (res.statusCode == 401) {
      throw ApiException('Session expired. Please log in again.',
          statusCode: 401);
    }
    if (res.statusCode >= 400) {
      throw ApiException(
        body['message']?.toString() ?? 'Request failed (${res.statusCode})',
        statusCode: res.statusCode,
      );
    }
    return body['data'] ?? body;
  }
}
