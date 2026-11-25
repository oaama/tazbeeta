import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sallehli/screens/intro.dart';
import 'package:sallehli/theme.dart';
import 'screens_test.dart' show loadFonts;

// Renders real Flutter frames of the Start screen animation (30 fps) for a preview video.
void main() {
  setUpAll(loadFonts);
  testWidgets('start animation frames', (t) async {
    t.view.physicalSize = const Size(780, 1600);
    t.view.devicePixelRatio = 2;
    final k = GlobalKey();
    await t.pumpWidget(RepaintBoundary(
        key: k,
        child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: buildTheme(),
            home: const StartScreen())));
    Directory('frames').createSync();
    for (var i = 0; i < 150; i++) {
      await t.pump(const Duration(milliseconds: 33));
      await t.runAsync(() async {
        final b = k.currentContext!.findRenderObject() as RenderRepaintBoundary;
        final img = await b.toImage(pixelRatio: 1);
        final bd = await img.toByteData(format: ui.ImageByteFormat.png);
        File('frames/f${i.toString().padLeft(3, '0')}.png')
            .writeAsBytesSync(bd!.buffer.asUint8List());
      });
    }
  });
}
