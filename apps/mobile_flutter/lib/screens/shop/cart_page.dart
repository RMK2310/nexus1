import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/state.dart';
import '../../core/api.dart';
import '../../core/images.dart';
import '../../widgets/common.dart';
import '../../widgets/shop_widgets.dart';

class CartPage extends StatefulWidget {
  const CartPage({super.key});

  @override
  State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  bool _paying = false;
  String? _error;

  int get _deliveryFee =>
      context.read<AppState>().cartTotal >= 19900 ? 0 : 2500;
  int get _handlingFee => 200;
  int get _grandTotal =>
      context.read<AppState>().cartTotal + _deliveryFee + _handlingFee;

  Future<void> _pay(String method) async {
    setState(() {
      _paying = true;
      _error = null;
    });
    final state = context.read<AppState>();
    final items = [...state.cartItems];
    try {
      if (method == 'WALLET') {
        await Api.I.walletCheckout(
          idempotencyKey: state.newIdempotencyKey(),
          paymentMethod: 'WALLET',
        );
      } else {
        // Razorpay flow: create order -> (test gateway) -> verify.
        final order = await Api.I.createRazorpayOrder();
        final orderId = order['orderId']?.toString() ?? '';
        final paymentId =
            'pay_mock_${DateTime.now().millisecondsSinceEpoch}';
        await Api.I.verifyRazorpayPayment(
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          signature: 'mock_sig_${Random().nextInt(1 << 32)}',
          paymentMethod: method,
        );
      }
      state.clearCartLocal();
      state.refreshWallet();
      // Best-effort: clear server-side cart rows too.
      for (final item in items) {
        Api.I.removeFromCart(item.sellerListingId).catchError((_) {});
      }
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const _SuccessPage()),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Payment failed. Please try again.');
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  void _openPaymentSheet() {
    final state = context.read<AppState>();
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Choose payment method',
                  style: Theme.of(ctx).textTheme.headlineMedium),
              const SizedBox(height: 6),
              Text('Amount payable: ${inr(_grandTotal)}',
                  style: Theme.of(ctx).textTheme.bodyMedium),
              const SizedBox(height: 18),
              _PayOption(
                icon: Icons.account_balance_wallet_rounded,
                color: NexusTheme.walletAccent,
                title: 'NEXUS Wallet',
                subtitle: state.walletLoaded
                    ? 'Balance: ${inr(state.walletBalance)}'
                    : 'Instant · no OTP needed',
                onTap: () => _pay('WALLET'),
              ),
              const SizedBox(height: 12),
              _PayOption(
                icon: Icons.currency_rupee_rounded,
                color: NexusTheme.chatAccent,
                title: 'UPI · Razorpay (Test)',
                subtitle: 'GPay, PhonePe, Paytm — test mode',
                onTap: () => _pay('UPI'),
              ),
              const SizedBox(height: 12),
              _PayOption(
                icon: Icons.credit_card_rounded,
                color: NexusTheme.primary,
                title: 'Card · Razorpay (Test)',
                subtitle: 'Visa, Mastercard, RuPay — test mode',
                onTap: () => _pay('CARD'),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 14),
                  child: Text(_error!,
                      style: const TextStyle(color: NexusTheme.danger)),
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
    final items = state.cartItems;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Cart'),
        leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => Navigator.pop(context)),
      ),
      body: items.isEmpty
          ? const EmptyView(
              icon: Icons.shopping_cart_outlined,
              title: 'Your cart is empty',
              subtitle: 'Add items from the store to get started.',
            )
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                ...items.map((item) => Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: NexusTheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: NexusTheme.border.withOpacity(0.6)),
                      ),
                      child: Row(
                        children: [
                          NexusImage(url: item.imageUrl,
                              width: 62,
                              height: 62,
                              borderRadius: BorderRadius.circular(12)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.title,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                        color: NexusTheme.textPrimary,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13.5)),
                                const SizedBox(height: 4),
                                PriceText(price: item.price, fontSize: 13.5),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          QtyStepper(
                            quantity: item.quantity,
                            onChanged: (q) => context
                                .read<AppState>()
                                .setQuantity(item.sellerListingId, q),
                          ),
                        ],
                      ),
                    )),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: NexusTheme.surface,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Bill details',
                          style: TextStyle(
                              color: NexusTheme.textPrimary,
                              fontWeight: FontWeight.w800,
                              fontSize: 14.5)),
                      const SizedBox(height: 12),
                      _BillRow('Item total', inr(state.cartTotal)),
                      _BillRow(
                          'Delivery fee',
                          _deliveryFee == 0
                              ? 'FREE'
                              : inr(_deliveryFee),
                          valueColor: _deliveryFee == 0
                              ? NexusTheme.shopAccent
                              : null),
                      _BillRow('Handling charge', inr(_handlingFee)),
                      const Divider(height: 24),
                      _BillRow('To pay', inr(_grandTotal), bold: true),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                PromiseBanner(
                  text: 'Rainy-day promise — on-time or free delivery',
                  icon: Icons.verified_rounded,
                  gradient: NexusTheme.chatGradient.colors,
                ),
                const SizedBox(height: 90),
              ],
            ),
      bottomSheet: items.isEmpty
          ? null
          : Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              decoration: const BoxDecoration(
                color: NexusTheme.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: FilledButton(
                onPressed: _paying ? null : _openPaymentSheet,
                style: FilledButton.styleFrom(
                    backgroundColor: NexusTheme.shopAccent),
                child: _paying
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.4, color: Colors.white))
                    : Text('${inr(_grandTotal)}  ·  Pay now'),
              ),
            ),
    );
  }
}

class _BillRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? valueColor;

  const _BillRow(this.label, this.value, {this.bold = false, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: TextStyle(
                    color: bold
                        ? NexusTheme.textPrimary
                        : NexusTheme.textSecondary,
                    fontSize: 13.5,
                    fontWeight: bold ? FontWeight.w800 : FontWeight.w500)),
          ),
          Text(value,
              style: TextStyle(
                  color: valueColor ??
                      (bold
                          ? NexusTheme.textPrimary
                          : NexusTheme.textSecondary),
                  fontSize: 13.5,
                  fontWeight: bold ? FontWeight.w800 : FontWeight.w600)),
        ],
      ),
    );
  }
}

class _PayOption extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _PayOption({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: NexusTheme.surfaceLight,
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
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 21),
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
    );
  }
}

class _SuccessPage extends StatelessWidget {
  const _SuccessPage();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                color: NexusTheme.success.withOpacity(0.14),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_rounded,
                  color: NexusTheme.success, size: 56),
            ),
            const SizedBox(height: 22),
            Text('Order placed!',
                style: Theme.of(context).textTheme.headlineLarge),
            const SizedBox(height: 8),
            const Text('Your order will be delivered in 10 minutes.',
                style: TextStyle(color: NexusTheme.textSecondary)),
            const SizedBox(height: 32),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: FilledButton(
                onPressed: () =>
                    Navigator.popUntil(context, (r) => r.isFirst),
                child: const Text('Continue shopping'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
