// Play Store phone screenshots (1080x1920) in offline preview mode.
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sallehli/api.dart';
import 'package:sallehli/config.dart';
import 'package:sallehli/demo.dart';
import 'package:sallehli/screens/home.dart';
import 'demo_test.dart' show boot, settle;
import 'screens_test.dart' show loadFonts;

Future<void> store(WidgetTester t, String name) async {
  await t.runAsync(() async {
    final b = t.renderObject(find.byType(RepaintBoundary).first)
        as RenderRepaintBoundary;
    final img = await b.toImage(pixelRatio: 2.625);
    final bd = await img.toByteData(format: ui.ImageByteFormat.png);
    Directory('store_shots').createSync();
    File('store_shots/$name.png').writeAsBytesSync(bd!.buffer.asUint8List());
  });
}

void main() {
  if (!demoMode) {
    test('requires preview mode', () {});
    return;
  }
  setUpAll(loadFonts);
  for (final lang in ['en', 'ar']) {
    testWidgets('store shots $lang', (t) async {
      await boot(t, lang);
      t.view.physicalSize = const Size(1080, 1920);
      t.view.devicePixelRatio = 2.625;
      await t.pump();
      Future<void> open(Widget w, String name, {Future<void> Function()? pre}) async {
        final context = t.element(find.byType(Navigator).first);
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => w));
        await settle(t);
        if (pre != null) await pre();
        await store(t, 'store_${lang}_$name');
        Navigator.of(t.element(find.byType(Navigator).first)).pop();
        await settle(t);
      }

      await DemoBackend.begin('customer',
          first: lang == 'ar' ? 'منى' : 'Mona',
          last: lang == 'ar' ? 'سمير' : 'Samir');
      final services = await Api.services();
      final reqs = await Api.requests();
      await open(const HomeShell(), '1_home');
      await open(NewRequestScreen(service: services.first as Map), '2_new_request', pre: () async {
        await t.dragUntilVisible(find.byIcon(Icons.access_time), find.byType(Scrollable).first, const Offset(0, -200));
        await t.drag(find.byType(Scrollable).first, const Offset(0, -150));
        await settle(t);
      });
      await open(const ProjectsTab(), '3_requests');
      await open(ChatScreen(request: reqs.first as Map), '4_chat');
      await open(const MoreTab(), '5_more');
      await DemoBackend.begin('technician',
          first: lang == 'ar' ? 'مصطفى' : 'Mostafa',
          last: lang == 'ar' ? 'علي' : 'Ali');
      await open(const HomeShell(), '6_technician_jobs');
      await t.pumpWidget(const SizedBox());
      await t.pump();
    });
  }
}
