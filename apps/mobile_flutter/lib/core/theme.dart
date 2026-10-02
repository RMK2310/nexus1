import 'package:flutter/material.dart';

/// NEXUS Design System
/// A premium dark theme inspired by top Indian super-apps.
abstract final class NexusTheme {
  // ── Brand palette ──────────────────────────────
  static const Color primary = Color(0xFF6C5CE7); // Indigo/violet
  static const Color primaryDark = Color(0xFF4834D4);
  static const Color accent = Color(0xFF00D9A6); // Emerald (money/success)
  static const Color background = Color(0xFF0A0A14); // Deep space
  static const Color surface = Color(0xFF14141F);
  static const Color surfaceLight = Color(0xFF1D1D2B);
  static const Color border = Color(0xFF262638);
  static const Color textPrimary = Color(0xFFF5F5FA);
  static const Color textSecondary = Color(0xFF9C9CB0);
  static const Color textMuted = Color(0xFF5E5E74);

  // ── Feature accents (each tab has an identity color) ──
  static const Color shopAccent = Color(0xFF00D9A6); // Blinkit-green
  static const Color rideAccent = Color(0xFFF9C823); // Rapido-yellow
  static const Color foodAccent = Color(0xFFE23744); // Zomato-red
  static const Color chatAccent = Color(0xFF25D366); // WhatsApp-green
  static const Color walletAccent = Color(0xFF38BDF8); // Cyan

  static const Color danger = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color success = Color(0xFF10B981);

  // ── Gradients ──────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF6C5CE7), Color(0xFF8E7CFF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient shopGradient = LinearGradient(
    colors: [Color(0xFF00B884), Color(0xFF00D9A6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient rideGradient = LinearGradient(
    colors: [Color(0xFFE0A800), Color(0xFFF9C823)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient foodGradient = LinearGradient(
    colors: [Color(0xFFB32530), Color(0xFFE23744)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient chatGradient = LinearGradient(
    colors: [Color(0xFF128C7E), Color(0xFF25D366)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ── Theme data ─────────────────────────────────
  static ThemeData get dark {
    final base = ThemeData.dark(useMaterial3: true);
    const colorScheme = ColorScheme.dark(
      primary: primary,
      secondary: accent,
      surface: surface,
      error: danger,
    );

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      useMaterial3: true,
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
        iconTheme: IconThemeData(color: textPrimary),
      ),
      cardTheme: const CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(18)),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: primary,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
        elevation: 0,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        indicatorColor: primary.withOpacity(0.18),
        iconTheme: MaterialStateProperty.resolveWith((states) {
          if (states.contains(MaterialState.selected)) {
            return const IconThemeData(color: primary);
          }
          return const IconThemeData(color: textMuted);
        }),
        labelTextStyle: MaterialStateProperty.resolveWith((states) {
          final bold = states.contains(MaterialState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
            color: bold ? primary : textMuted,
          );
        }),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceLight,
        hintStyle: const TextStyle(color: textMuted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: primary, width: 1.4),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          side: const BorderSide(color: border),
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: primary),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: surfaceLight,
        selectedColor: primary.withOpacity(0.25),
        labelStyle: const TextStyle(color: textPrimary, fontSize: 12),
        side: BorderSide(color: border.withOpacity(0.6)),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      dividerTheme: DividerThemeData(
        color: border.withOpacity(0.5),
        thickness: 1,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: surfaceLight,
        contentTextStyle: const TextStyle(color: textPrimary),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      dialogTheme: const DialogThemeData(
        backgroundColor: surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: surface,
        modalBackgroundColor: surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        showDragHandle: true,
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: textPrimary,
        unselectedLabelColor: textMuted,
        indicatorColor: primary,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
            color: textPrimary, fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.8),
        headlineMedium: TextStyle(
            color: textPrimary, fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.5),
        titleLarge: TextStyle(
            color: textPrimary, fontSize: 17, fontWeight: FontWeight.w700),
        titleMedium: TextStyle(
            color: textPrimary, fontSize: 15, fontWeight: FontWeight.w600),
        bodyLarge: TextStyle(color: textPrimary, fontSize: 15),
        bodyMedium: TextStyle(color: textSecondary, fontSize: 13.5, height: 1.35),
        labelSmall: TextStyle(color: textMuted, fontSize: 11, fontWeight: FontWeight.w600),
      ),
      extensions: const <ThemeExtension<dynamic>>[],
    );
  }
}

/// Currency formatting helper (INR, prices stored in paise/cents).
String inr(num cents, {bool compact = false}) {
  final rs = cents / 100.0;
  if (compact && rs >= 100000) return '₹${(rs / 100000).toStringAsFixed(1)}L';
  if (compact && rs >= 1000) return '₹${(rs / 1000).toStringAsFixed(1)}k';
  if (rs == rs.roundToDouble()) {
    return '₹${rs.toStringAsFixed(0)}';
  }
  return '₹${rs.toStringAsFixed(2)}';
}
