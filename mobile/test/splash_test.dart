import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sallehli/screens/splash.dart';

void main() {
  testWidgets('approved layers settle exactly and hand off once', (t) async {
    await t.pumpWidget(const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: BrandSplash(child: Text('ready'))));
    await t
        .runAsync(() => Future<void>.delayed(const Duration(milliseconds: 80)));
    await t.pump();
    await t.pump(const Duration(milliseconds: 20));
    await t.pump(const Duration(milliseconds: 1800));
    expect(find.byType(ToolMark), findsOneWidget);
    await t.pump(const Duration(milliseconds: 460));
    expect(find.text('ready'), findsOneWidget);
    expect(find.byType(ToolMark), findsNothing);
  });
  testWidgets('reduce motion shows resting mark then hands off', (t) async {
    await t.pumpWidget(const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: MediaQuery(
            data: MediaQueryData(disableAnimations: true),
            child: BrandSplash(child: Text('reduced-ready')))));
    await t
        .runAsync(() => Future<void>.delayed(const Duration(milliseconds: 80)));
    await t.pump();
    expect(t.widget<ToolMark>(find.byType(ToolMark)).progress, 1);
    expect(t.hasRunningAnimations, isFalse);
    await t.pump(const Duration(milliseconds: 500));
    expect(find.text('reduced-ready'), findsOneWidget);
  });
  testWidgets('draw mark shrinks into a compact resting mark', (t) async {
    await t.pumpWidget(const MaterialApp(
        home: Scaffold(body: SplashComposition(progress: .5))));
    final drawing = t.getSize(find.byKey(const ValueKey('splash-mark-size')));
    await t.pumpWidget(const MaterialApp(
        home: Scaffold(body: SplashComposition(progress: 1))));
    final resting = t.getSize(find.byKey(const ValueKey('splash-mark-size')));
    expect(drawing.width, 220);
    expect(resting.width, 136);
  });
  testWidgets('splash motion contact sheet', (t) async {
    t.view.physicalSize = const Size(390, 800);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.resetPhysicalSize);
    addTearDown(t.view.resetDevicePixelRatio);
    final key = GlobalKey();
    for (var i = 0; i < 76; i++) {
      await t.pumpWidget(RepaintBoundary(
          key: key,
          child: MaterialApp(
              debugShowCheckedModeBanner: false,
              home: Scaffold(
                  backgroundColor: Colors.white,
                  body: Center(
                      child: SplashComposition(
                          progress: (i / 54).clamp(0.0, 1.0)))))));
      await t.runAsync(() async {
        await precacheImage(const AssetImage('assets/img/wordmark-ar.png'),
            key.currentContext!);
        await precacheImage(
            const AssetImage('assets/img/wrench.png'), key.currentContext!);
        await precacheImage(
            const AssetImage('assets/img/roller.png'), key.currentContext!);
      });
      await t.pump();
      await t.runAsync(() async {
        final image = await (key.currentContext!.findRenderObject()
                as RenderRepaintBoundary)
            .toImage();
        final data = await image.toByteData(format: ui.ImageByteFormat.png);
        Directory('shots_splash').createSync(recursive: true);
        File('shots_splash/frame$i.png')
            .writeAsBytesSync(data!.buffer.asUint8List());
        image.dispose();
      });
    }
  });
}
