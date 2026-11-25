import 'package:flutter/material.dart';

const kTeal = Color(0xFF0A5A5E);
const kBrandTeal = Color(0xFF0F8B8D);
const kAmber = Color(0xFFF5A623);
const kMist = Color(0xFFE6F4F3);
const kInk = Color(0xFF12313A);
const kMuted = Color(0xFF6B7280);
const kBorder = Color(0xFFE5E7EB);
const kDisabledBg = Color(0xFFE6F4F3);
const kDisabledFg = Color(0xFFC3CAD9);
const kError = Color(0xFFE5251B);
const kOk = Color(0xFF22A745);

ThemeData buildTheme() => ThemeData(
      useMaterial3: true,
      fontFamily: 'Inter',
      fontFamilyFallback: const ['NotoKufi', 'Poppins'],
      scaffoldBackgroundColor: Colors.white,
      colorScheme: ColorScheme.fromSeed(
          seedColor: kBrandTeal, primary: kTeal, secondary: kAmber),
      textTheme: const TextTheme(
        bodyLarge: TextStyle(fontSize: 14, height: 1.5, color: kInk),
        bodyMedium: TextStyle(fontSize: 13, height: 1.5, color: kInk),
        bodySmall: TextStyle(fontSize: 12, height: 1.45, color: kMuted),
        titleLarge:
            TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: kInk),
        titleMedium:
            TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: kInk),
        titleSmall:
            TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: kInk),
      ),
      cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: kBorder))),
      dividerTheme:
          const DividerThemeData(color: kBorder, space: 1, thickness: 1),
      inputDecorationTheme: const InputDecorationTheme(
          isDense: true,
          contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12)),
      listTileTheme: const ListTileThemeData(
          dense: true,
          minVerticalPadding: 8,
          contentPadding: EdgeInsets.symmetric(horizontal: 16)),
      navigationBarTheme: const NavigationBarThemeData(
          height: 64,
          backgroundColor: Colors.white,
          indicatorColor: kMist,
          labelTextStyle: WidgetStatePropertyAll(
              TextStyle(fontSize: 11, fontWeight: FontWeight.w500))),
      filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
              minimumSize: const Size(44, 44),
              textStyle: const TextStyle(
                  fontFamily: 'Inter',
                  fontFamilyFallback: ['NotoKufi', 'Poppins'],
                  fontSize: 13,
                  fontWeight: FontWeight.w600))),
      outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
              minimumSize: const Size(44, 44),
              side: const BorderSide(color: kBorder),
              textStyle: const TextStyle(
                  fontFamily: 'Inter',
                  fontFamilyFallback: ['NotoKufi', 'Poppins'],
                  fontSize: 13,
                  fontWeight: FontWeight.w600))),
      appBarTheme: const AppBarTheme(
        toolbarHeight: 46,
        titleSpacing: 12,
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: kInk, size: 21),
        titleTextStyle: TextStyle(
            fontFamily: 'Inter',
            fontFamilyFallback: ['NotoKufi'],
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: kInk),
      ),
    );

const poppinsHead =
    TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, color: kInk);
