import 'dart:ui' as ui;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sallehli/screens/intro.dart';
import 'package:sallehli/theme.dart';
import 'screens_test.dart' show loadFonts;

void main() {
  setUpAll(loadFonts);
  testWidgets('welcome remains static over time', (t) async {
    final key = GlobalKey();
    await t.pumpWidget(RepaintBoundary(
      key: key,
      child: MaterialApp(theme: buildTheme(), home: const StartScreen()),
    ));
    await t.runAsync(() => precacheImage(
        const AssetImage('assets/img/welcome.jpg'), key.currentContext!));
    await t.pumpAndSettle();
    Future<Uint8List> capture() async {
      final boundary =
          key.currentContext!.findRenderObject() as RenderRepaintBoundary;
      final image = await boundary.toImage();
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      image.dispose();
      return data!.buffer.asUint8List();
    }

    final before = await t.runAsync(capture);
    await t.pump(const Duration(seconds: 5));
    final after = await t.runAsync(capture);
    expect(listEquals(before, after), isTrue);
    expect(t.hasRunningAnimations, isFalse);
  });
}
