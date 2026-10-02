import 'package:flutter/material';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'login_page.dart';
import 'customer_portal.dart';
import 'seller_portal.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
      ],
      child: const NexusApp(),
    ),
  );
}

class NexusApp extends StatelessWidget {
  const NexusApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NEXUS Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        primaryColor: const Color(0xFF6366F1),
        scaffoldBackgroundColor: const Color(0xFF0B0914),
        cardColor: const Color(0xFF14121A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF14121A),
          background: const Color(0xFF0B0914),
        ),
      ),
      home: const MainGate(),
    );
  }
}

class MainGate extends StatelessWidget {
  const MainGate({super.key});

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    if (!state.isAuthenticated) {
      return const LoginPage();
    }

    if (state.userRole == 'SELLER') {
      return const SellerPortal();
    }

    return const CustomerPortal();
  }
}

class AppState extends ChangeNotifier {
  bool _isAuthenticated = false;
  String _userRole = 'CUSTOMER';
  String _userName = '';
  String _userEmail = '';
  String _accessToken = '';
  List<Map<String, dynamic>> _cart = [];
  List<Map<String, dynamic>> _wishlist = [];

  bool get isAuthenticated => _isAuthenticated;
  String get userRole => _userRole;
  String get userName => _userName;
  String get userEmail => _userEmail;
  String get accessToken => _accessToken;
  List<Map<String, dynamic>> get cart => _cart;
  List<Map<String, dynamic>> get wishlist => _wishlist;

  AppState() {
    _loadSession();
  }

  Future<void> _loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = prefs.getString('access_token') ?? '';
    _userRole = prefs.getString('user_role') ?? 'CUSTOMER';
    _userName = prefs.getString('user_name') ?? '';
    _userEmail = prefs.getString('user_email') ?? '';
    _isAuthenticated = _accessToken.isNotEmpty;
    notifyListeners();
  }

  Future<void> login(String token, String name, String email, String role) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', token);
    await prefs.setString('user_role', role);
    await prefs.setString('user_name', name);
    await prefs.setString('user_email', email);

    _accessToken = token;
    _userRole = role;
    _userName = name;
    _userEmail = email;
    _isAuthenticated = true;
    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    _accessToken = '';
    _userRole = 'CUSTOMER';
    _userName = '';
    _userEmail = '';
    _isAuthenticated = false;
    _cart.clear();
    _wishlist.clear();
    notifyListeners();
  }

  void addToCart(Map<String, dynamic> item) {
    _cart.add(item);
    notifyListeners();
  }

  void removeFromCart(String itemId) {
    _cart.removeWhere((item) => item['id'] == itemId);
    notifyListeners();
  }

  void addToWishlist(Map<String, dynamic> item) {
    _wishlist.add(item);
    notifyListeners();
  }

  void removeFromWishlist(String itemId) {
    _wishlist.removeWhere((item) => item['id'] == itemId);
    notifyListeners();
  }
}
