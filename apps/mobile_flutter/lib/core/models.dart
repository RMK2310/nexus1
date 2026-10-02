/// NEXUS domain models — parsed from backend API responses.

class Category {
  final String id;
  final String name;
  final String? parentId;

  const Category({required this.id, required this.name, this.parentId});

  factory Category.fromJson(Map<String, dynamic> j) => Category(
        id: j['id']?.toString() ?? '',
        name: j['name']?.toString() ?? 'Category',
        parentId: j['parentId']?.toString(),
      );
}

class Listing {
  final String id;
  final int price; // in paise
  final int? compareAtPrice;
  final int? stock;

  const Listing({
    required this.id,
    required this.price,
    this.compareAtPrice,
    this.stock,
  });

  factory Listing.fromJson(Map<String, dynamic> j) => Listing(
        id: j['id']?.toString() ?? '',
        price: _toInt(j['price']),
        compareAtPrice: j['compareAtPrice'] == null
            ? null
            : _toInt(j['compareAtPrice']),
        stock: j['inventory'] is Map ? _toInt(j['inventory']['quantity']) : null,
      );
}

class Product {
  final String id;
  final String title;
  final String description;
  final String imageUrl;
  final String categoryName;
  final String? brandName;
  final double rating;
  final int reviewCount;
  final List<Listing> listings;

  const Product({
    required this.id,
    required this.title,
    required this.description,
    required this.imageUrl,
    required this.categoryName,
    this.brandName,
    this.rating = 0,
    this.reviewCount = 0,
    this.listings = const [],
  });

  Listing? get bestListing {
    if (listings.isEmpty) return null;
    // Cheapest in-stock listing preferred.
    final inStock = listings.where((l) => l.stock == null || l.stock! > 0);
    final pool = inStock.isEmpty ? listings : inStock;
    return pool.reduce((a, b) => a.price <= b.price ? a : b);
  }

  int? get price => bestListing?.price;
  int? get mrp => bestListing?.compareAtPrice;
  String? get sellerListingId => bestListing?.id;

  int? get discountPercent {
    final p = price;
    final m = mrp;
    if (p == null || m == null || m <= p || m == 0) return null;
    return (((m - p) / m) * 100).round();
  }

  factory Product.fromJson(Map<String, dynamic> j) {
    final variants = (j['variants'] as List?) ?? const [];
    final listings = <Listing>[];
    for (final v in variants) {
      if (v is! Map) continue;
      final vj = Map<String, dynamic>.from(v);
      for (final l in (vj['listings'] as List?) ?? const []) {
        if (l is Map) {
          listings.add(Listing.fromJson(Map<String, dynamic>.from(l)));
        }
      }
    }
    // Fallback image: variant imageUrl -> product imageUrl
    String? img;
    if (variants.isNotEmpty && variants.first is Map) {
      img = variants.first['imageUrl']?.toString();
    }
    img ??= j['imageUrl']?.toString();

    final cat = j['category'];
    String catName = 'General';
    if (cat is Map) {
      final parent = cat['parent'];
      final own = cat['name']?.toString() ?? '';
      catName =
          (parent is Map ? parent['name']?.toString() : null) ?? own;
    }

    return Product(
      id: j['id']?.toString() ?? '',
      title: (j['title']?.toString() ?? 'Product'),
      description: j['description']?.toString() ?? '',
      imageUrl: img ?? '',
      categoryName: catName,
      brandName: j['brand'] is Map ? j['brand']['name']?.toString() : null,
      rating: _toDouble(j['ratingAvg']),
      reviewCount: _toInt(j['reviewCount']),
      listings: listings,
    );
  }
}

class CartItem {
  final String sellerListingId;
  final String title;
  final String imageUrl;
  final int price;
  final int quantity;

  const CartItem({
    required this.sellerListingId,
    required this.title,
    required this.imageUrl,
    required this.price,
    required this.quantity,
  });

  int get lineTotal => price * quantity;

  CartItem copyWith({int? quantity}) => CartItem(
        sellerListingId: sellerListingId,
        title: title,
        imageUrl: imageUrl,
        price: price,
        quantity: quantity ?? this.quantity,
      );

  factory CartItem.fromJson(Map<String, dynamic> j) {
    final variant = j['productVariant'] is Map ? j['productVariant'] : null;
    final product = variant?['product'] is Map ? variant!['product'] : null;
    final listing = j['sellerListing'] is Map ? j['sellerListing'] : null;
    return CartItem(
      sellerListingId:
          (listing?['id'] ?? j['sellerListingId'])?.toString() ?? '',
      title: product?['title']?.toString() ??
          variant?['name']?.toString() ??
          'Item',
      imageUrl: variant?['imageUrl']?.toString() ?? '',
      price: _toInt(listing?['price'] ?? j['price']),
      quantity: _toInt(j['quantity'], fallback: 1),
    );
  }

  Map<String, dynamic> toJson() => {
        'sellerListingId': sellerListingId,
        'title': title,
        'imageUrl': imageUrl,
        'price': price,
        'quantity': quantity,
      };
}

class User {
  final String id;
  final String name;
  final String email;
  final String phone;
  final List<String> roles;
  final String activeRole;
  final int walletBalance;

  const User({
    required this.id,
    required this.name,
    required this.email,
    this.phone = '',
    this.roles = const [],
    this.activeRole = 'CONSUMER',
    this.walletBalance = 0,
  });

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: j['id']?.toString() ?? j['userId']?.toString() ?? '',
        name: j['name']?.toString() ?? 'NEXUS User',
        email: j['email']?.toString() ?? '',
        phone: j['phone']?.toString() ?? '',
        roles: (j['roles'] as List?)
                ?.map((r) => r is Map ? r['role'].toString() : r.toString())
                .toList() ??
            const [],
        activeRole: j['activeRole']?.toString() ?? 'CONSUMER',
        walletBalance: _toInt(j['walletBalance']),
      );
}

class Restaurant {
  final String id;
  final String name;
  final String cuisine;
  final List<MenuItem> menu;

  const Restaurant({
    required this.id,
    required this.name,
    required this.cuisine,
    this.menu = const [],
  });

  factory Restaurant.fromJson(Map<String, dynamic> j) => Restaurant(
        id: j['id']?.toString() ?? '',
        name: j['name']?.toString() ?? 'Restaurant',
        cuisine: j['cuisine']?.toString() ?? 'Indian',
        menu: (j['menus'] as List? ?? const [])
            .whereType<Map>()
            .map((m) => MenuItem.fromJson(Map<String, dynamic>.from(m)))
            .toList(),
      );
}

class MenuItem {
  final String id;
  final String name;
  final int price;
  final bool isAvailable;

  const MenuItem({
    required this.id,
    required this.name,
    required this.price,
    this.isAvailable = true,
  });

  factory MenuItem.fromJson(Map<String, dynamic> j) => MenuItem(
        id: j['id']?.toString() ?? '',
        name: j['name']?.toString() ?? 'Item',
        price: _toInt(j['price']),
        isAvailable: j['isAvailable'] != false,
      );
}

// ── helpers ─────────────────────────────────────────────

int _toInt(dynamic v, {int fallback = 0}) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) {
    final parsed = double.tryParse(v);
    if (parsed != null) return parsed.round();
  }
  return fallback;
}

double _toDouble(dynamic v, {double fallback = 0}) {
  if (v is num) return v.toDouble();
  if (v is String) {
    final parsed = double.tryParse(v);
    if (parsed != null) return parsed;
  }
  return fallback;
}
