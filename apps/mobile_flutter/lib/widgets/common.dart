import 'package:flutter/material.dart';

import '../core/theme.dart';

/// Big NEXUS wordmark header used on top of pages.
class NexusHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? actions;
  final Color? accent;

  const NexusHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
    this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 12, 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.headlineMedium),
                if (subtitle != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(subtitle!,
                        style: Theme.of(context).textTheme.bodyMedium),
                  ),
              ],
            ),
          ),
          if (actions != null) ...actions!,
        ],
      ),
    );
  }
}

/// Section title with optional action.
class SectionTitle extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;

  const SectionTitle(this.title, {super.key, this.action, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 10),
      child: Row(
        children: [
          Expanded(
            child: Text(title, style: Theme.of(context).textTheme.titleLarge),
          ),
          if (action != null)
            GestureDetector(
              onTap: onAction,
              child: Text(action!,
                  style: const TextStyle(
                      color: NexusTheme.primary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600)),
            ),
        ],
      ),
    );
  }
}

/// Price display with optional MRP strike-through and discount badge.
class PriceText extends StatelessWidget {
  final int? price;
  final int? mrp;
  final double fontSize;

  const PriceText({super.key, required this.price, this.mrp, this.fontSize = 15});

  @override
  Widget build(BuildContext context) {
    if (price == null) {
      return Text('—',
          style: TextStyle(
              color: NexusTheme.textSecondary, fontSize: fontSize));
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(inr(price!),
            style: TextStyle(
                color: NexusTheme.textPrimary,
                fontWeight: FontWeight.w800,
                fontSize: fontSize)),
        if (mrp != null && mrp! > price!)
          Padding(
            padding: const EdgeInsets.only(left: 6),
            child: Text(inr(mrp!),
                style: TextStyle(
                    color: NexusTheme.textMuted,
                    fontSize: fontSize - 3,
                    decoration: TextDecoration.lineThrough)),
          ),
        if (mrp != null && mrp! > price!)
          Padding(
            padding: const EdgeInsets.only(left: 5),
            child: Text('${(((mrp! - price!) / mrp!) * 100).round()}% off',
                style: TextStyle(
                    color: NexusTheme.shopAccent,
                    fontSize: fontSize - 4,
                    fontWeight: FontWeight.w700)),
          ),
      ],
    );
  }
}

/// Feature-colored gradient banner (deliver-promise strip).
class PromiseBanner extends StatelessWidget {
  final String text;
  final IconData icon;
  final List<Color> gradient;
  final VoidCallback? onTap;

  const PromiseBanner({
    super.key,
    required this.text,
    required this.icon,
    required this.gradient,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: gradient),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(text,
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 13.5)),
            ),
            const Icon(Icons.arrow_forward_ios,
                color: Colors.white70, size: 14),
          ],
        ),
      ),
    );
  }
}

/// Rounded stat tile used on account/wallet screens.
class StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const StatTile({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.color = NexusTheme.primary,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: NexusTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: NexusTheme.border.withOpacity(0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(value,
              style: const TextStyle(
                  color: NexusTheme.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 15)),
          const SizedBox(height: 2),
          Text(label,
              style: const TextStyle(
                  color: NexusTheme.textMuted, fontSize: 11.5)),
        ],
      ),
    );
  }
}

/// Shimmering skeleton card for loading states.
class SkeletonCard extends StatefulWidget {
  final double height;
  final double? width;
  final BorderRadius radius;

  const SkeletonCard({
    super.key,
    required this.height,
    this.width,
    this.radius = const BorderRadius.all(Radius.circular(16)),
  });

  @override
  State<SkeletonCard> createState() => _SkeletonCardState();
}

class _SkeletonCardState extends State<SkeletonCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
      vsync: this, duration: const Duration(milliseconds: 1200))
    ..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        final t = 0.5 + 0.5 * _c.value;
        return Container(
          height: widget.height,
          width: widget.width,
          decoration: BoxDecoration(
            borderRadius: widget.radius,
            color: Color.lerp(
                NexusTheme.surface, NexusTheme.surfaceLight, t * 0.8),
          ),
        );
      },
    );
  }
}

/// Friendly full-page error state with retry.
class ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorView({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: NexusTheme.danger.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.cloud_off_rounded,
                  color: NexusTheme.danger, size: 34),
            ),
            const SizedBox(height: 16),
            Text('Something went wrong',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 6),
            Text(message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium),
            if (onRetry != null) ...[
              const SizedBox(height: 20),
              FilledButton(
                onPressed: onRetry,
                child: const Text('Try again'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Empty state placeholder.
class EmptyView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;

  const EmptyView({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: NexusTheme.textMuted, size: 52),
            const SizedBox(height: 14),
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(subtitle!,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium),
            ],
          ],
        ),
      ),
    );
  }
}
