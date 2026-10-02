import 'package:flutter/material.dart';

import '../core/theme.dart';
import 'shop/shop_home.dart';
import 'rides/rides_page.dart';
import 'food/food_home.dart';
import 'chat/chat_list.dart';
import 'account/account_page.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [
          ShopHome(),
          RidesPage(),
          FoodHome(),
          ChatList(),
          AccountPage(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        height: 66,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront, color: NexusTheme.shopAccent),
            label: 'Shop',
          ),
          NavigationDestination(
            icon: Icon(Icons.two_wheeler_outlined),
            selectedIcon:
                Icon(Icons.two_wheeler, color: NexusTheme.rideAccent),
            label: 'Rides',
          ),
          NavigationDestination(
            icon: Icon(Icons.restaurant_outlined),
            selectedIcon: Icon(Icons.restaurant, color: NexusTheme.foodAccent),
            label: 'Food',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline_rounded),
            selectedIcon:
                Icon(Icons.chat_bubble_rounded, color: NexusTheme.chatAccent),
            label: 'Chat',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person, color: NexusTheme.primary),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}
