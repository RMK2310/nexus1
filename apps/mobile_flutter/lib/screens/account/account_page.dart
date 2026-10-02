import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/state.dart';
import '../../core/api.dart';
import '../../widgets/common.dart';

class AccountPage extends StatefulWidget {
  const AccountPage({super.key});

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  bool _toppingUp = false;

  Future<void> _topUp() async {
    final state = context.read<AppState>();
    final ctrl = TextEditingController(text: '500');
    showModalBottomSheet(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.only(
              left: 24, right: 24, top: 8,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Add money to wallet',
                  style: Theme.of(ctx).textTheme.headlineMedium),
              const SizedBox(height: 18),
              TextField(
                controller: ctrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    hintText: 'Amount (₹)', prefixText: '₹ '),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _toppingUp
                    ? null
                    : () async {
                        setSheet(() => _toppingUp = true);
                        try {
                          final amount =
                              double.tryParse(ctrl.text.trim()) ?? 0;
                          if (amount > 0) {
                            await Api.I.walletTopUp(amount);
                            await state.refreshWallet();
                          }
                          if (ctx.mounted) Navigator.pop(ctx);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                  content: Text(
                                      'Wallet topped up with ₹${amount.toStringAsFixed(0)}'),
                                  backgroundColor: NexusTheme.success),
                            );
                          }
                        } catch (e) {
                          if (ctx.mounted) Navigator.pop(ctx);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Top-up failed. Try again.'),
                                  backgroundColor: NexusTheme.danger),
                            );
                          }
                        }
                      },
                child: const Text('Add money via Razorpay (test)'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final user = state.user;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(0, 10, 0, 24),
          children: [
            // Profile header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
              child: Row(
                children: [
                  Container(
                    width: 62,
                    height: 62,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      gradient: NexusTheme.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      (user?.name.isNotEmpty == true
                              ? user!.name[0]
                              : 'N')
                          .toUpperCase(),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w900),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user?.name ?? 'NEXUS User',
                            style: Theme.of(context).textTheme.headlineMedium),
                        Text(user?.email ?? '',
                            style: Theme.of(context).textTheme.bodyMedium),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            // Wallet card
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF134E6F), Color(0xFF38BDF8)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: NexusTheme.walletAccent.withOpacity(0.25),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.account_balance_wallet_rounded,
                          color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      const Text('NEXUS Wallet',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 14)),
                      const Spacer(),
                      GestureDetector(
                        onTap: _topUp,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Text('+ Add money',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 12)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(inr(state.walletBalance),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.w900)),
                  const Text('Instant payments across Shop, Rides & Food',
                      style: TextStyle(color: Colors.white70, fontSize: 11.5)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            // Stats row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  const Expanded(
                    child: StatTile(
                        icon: Icons.receipt_long_rounded,
                        label: 'Orders placed',
                        value: '—'),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: StatTile(
                        icon: Icons.local_offer_rounded,
                        label: 'Rewards',
                        value: 'New',
                        color: NexusTheme.rideAccent),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: StatTile(
                        icon: Icons.verified_user_rounded,
                        label: 'Role',
                        value: user?.activeRole ?? 'CONSUMER',
                        color: NexusTheme.success),
                  ),
                ],
              ),
            ),
            const SectionTitle('Quick actions'),
            _Tile(
                icon: Icons.shopping_bag_outlined,
                title: 'My Orders',
                subtitle: 'Track & reorder',
                onTap: () {}),
            _Tile(
                icon: Icons.location_on_outlined,
                title: 'Saved Addresses',
                subtitle: 'Home, work & more',
                onTap: () {}),
            _Tile(
                icon: Icons.payment_rounded,
                title: 'Payment methods',
                subtitle: 'Wallet · UPI · Cards',
                onTap: () {}),
            _Tile(
                icon: Icons.help_outline_rounded,
                title: 'Help & Support',
                subtitle: '24×7 chat with NEXUS Support',
                onTap: () {}),
            const SectionTitle('Other'),
            _Tile(
                icon: Icons.logout_rounded,
                title: 'Log out',
                subtitle: 'End this session',
                onTap: () => _confirmLogout(context)),
            const SizedBox(height: 10),
            const Center(
              child: Text('NEXUS v2.0 · One App. Every Connection.',
                  style: TextStyle(color: NexusTheme.textMuted, fontSize: 11)),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('You can sign back in anytime.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                context.read<AppState>().logout();
              },
              child: const Text('Log out',
                  style: TextStyle(color: NexusTheme.danger))),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _Tile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      child: Material(
        color: NexusTheme.surface,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: NexusTheme.primary.withOpacity(0.13),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: NexusTheme.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: const TextStyle(
                              color: NexusTheme.textPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 14)),
                      const SizedBox(height: 2),
                      Text(subtitle,
                          style: const TextStyle(
                              color: NexusTheme.textMuted, fontSize: 11.5)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded,
                    color: NexusTheme.textMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
