import 'dart:convert';
import 'package:flutter/material';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'main.dart';

class CustomerPortal extends StatefulWidget {
  const CustomerPortal({super.key});

  @override
  State<CustomerPortal> createState() => _CustomerPortalState();
}

class _CustomerPortalState extends State<CustomerPortal> {
  List<dynamic> _products = [];
  bool _isLoading = true;
  String _searchQuery = "";
  String _selectedCategory = "ALL";

  static const String backendUrl = "http://localhost:3000";

  @override
  void initState() {
    super.initState();
    _fetchProducts();
  }

  Future<void> _fetchProducts() async {
    setState(() => _isLoading = true);
    try {
      final res = await http.get(Uri.parse("$backendUrl/api/v1/commerce/products"));
      if (res.statusCode == 200) {
        setState(() {
          _products = json.decode(res.body);
        });
      }
    } catch (e) {
      // Mock static items if backend connection is unavailable
      setState(() {
        _products = [
          {
            "id": "1",
            "title": "fresh organic fuji apple",
            "description": "Farms fresh apples imported directly.",
            "category": {"name": "Fruits & Vegetables"},
            "variants": [
              {
                "id": "v1",
                "name": "1kg Pack",
                "sku": "APP-FUJ-01",
                "imageUrl": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400",
                "listings": [
                  {"price": 16000} // Rs 160
                ]
              }
            ]
          },
          {
            "id": "2",
            "title": "amul milk 1l",
            "description": "Pure pasteurized milk.",
            "category": {"name": "Dairy Products"},
            "variants": [
              {
                "id": "v2",
                "name": "1 Litre",
                "sku": "MILK-AMUL-01",
                "imageUrl": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
                "listings": [
                  {"price": 6500} // Rs 65
                ]
              }
            ]
          }
        ];
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);

    // Apply client filters
    final filtered = _products.where((p) {
      final title = (p['title'] ?? '').toString().toLowerCase();
      final matchSearch = title.contains(_searchQuery.toLowerCase());
      if (_selectedCategory == "ALL") return matchSearch;
      final cat = p['category']?['name'] ?? '';
      return matchSearch && cat == _selectedCategory;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text("NEXUS Marketplace"),
        backgroundColor: const Color(0xFF14121A),
        actions: [
          IconButton(
            icon: const Icon(Icons.shopping_cart),
            onPressed: () => _openCartDrawer(context),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => appState.logout(),
          )
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: TextField(
              decoration: const InputDecoration(
                hintText: "Search products...",
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onChanged: (val) => setState(() => _searchQuery = val),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: ["ALL", "Fruits & Vegetables", "Dairy Products"].map((cat) {
                final isSel = _selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6.0),
                  child: ChoiceChip(
                    label: Text(cat),
                    selected: isSel,
                    onSelected: (val) {
                      if (val) setState(() => _selectedCategory = cat);
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.75,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final p = filtered[index];
                      final v = p['variants']?[0] ?? {};
                      final price = v['listings']?[0]?['price'] ?? 0;
                      final priceRs = price / 100.0;

                      return Card(
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child: Image.network(
                                v['imageUrl'] ?? 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
                                fit: BoxFit.cover,
                                errorBuilder: (c, e, s) => Container(
                                  color: Colors.grey[800],
                                  child: const Icon(Icons.image),
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(8.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    p['title'] ?? '',
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "₹${priceRs.toStringAsFixed(2)}",
                                    style: const TextStyle(color: Color(0xFF10B981)),
                                  ),
                                  const SizedBox(height: 8),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF6366F1),
                                      minimumSize: const Size.fromHeight(36),
                                    ),
                                    onPressed: () {
                                      appState.addToCart({
                                        'id': p['id'],
                                        'title': p['title'],
                                        'price': price,
                                        'imageUrl': v['imageUrl']
                                      });
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text("Added to cart!")),
                                      );
                                    },
                                    child: const Text("Add to Cart", style: TextStyle(fontSize: 12)),
                                  )
                                ],
                              ),
                            )
                          ],
                        ),
                      );
                    },
                  ),
          )
        ],
      ),
    );
  }

  void _openCartDrawer(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF14121A),
      builder: (context) {
        return Consumer<AppState>(
          builder: (context, state, child) {
            return Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text("Shopping Cart", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Expanded(
                    child: ListView.builder(
                      itemCount: state.cart.length,
                      itemBuilder: (context, index) {
                        final item = state.cart[index];
                        return ListTile(
                          title: Text(item['title']),
                          subtitle: Text("₹${(item['price'] / 100.0).toStringAsFixed(2)}"),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete, color: Colors.redAccent),
                            onPressed: () => state.removeFromCart(item['id']),
                          ),
                        );
                      },
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () => _checkout(context, state),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                    child: const Text("Checkout Now"),
                  )
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _checkout(BuildContext context, AppState state) {
    final pinController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text("Enter Checkout PIN"),
          content: TextField(
            controller: pinController,
            obscureText: true,
            decoration: const InputDecoration(labelText: "Transaction PIN (default 1234)"),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
            ElevatedButton(
              onPressed: () {
                if (pinController.text == "1234") {
                  Navigator.pop(context); // Close dialog
                  Navigator.pop(context); // Close bottom sheet
                  state.cart.clear(); // Empty cart
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("⚡ Checkout Successful! Balance debited successfully.")),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Incorrect Transaction PIN!"), backgroundColor: Colors.redAccent),
                  );
                }
              },
              child: const Text("Verify"),
            )
          ],
        );
      },
    );
  }
}
