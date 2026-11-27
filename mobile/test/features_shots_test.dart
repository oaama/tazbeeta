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
import 'package:sallehli/screens/v4.dart';
import 'demo_test.dart' show boot, settle;
import 'screens_test.dart' show loadFonts;

Future<void> store(WidgetTester t, String name) async {
  await t.runAsync(() async {
    final b = t.renderObject(find.byType(RepaintBoundary).first)
        as RenderRepaintBoundary;
    final img = await b.toImage(pixelRatio: 2.625);
    final bd = await img.toByteData(format: ui.ImageByteFormat.png);
    Directory('feat_shots').createSync();
    File('feat_shots/$name.png').writeAsBytesSync(bd!.buffer.asUint8List());
  });
}

void main() {
  if (!demoMode) {
    test('requires preview mode', () {});
    return;
  }
  setUpAll(loadFonts);
  for (final lang in ['en', 'ar']) {
    testWidgets('feature shots $lang', (t) async {
      await boot(t, lang);
      t.view.physicalSize = const Size(1080, 1920);
      t.view.devicePixelRatio = 2.625;
      await t.pump();
      Future<void> open(Widget w, String name, {Future<void> Function()? pre}) async {
        final context = t.element(find.byType(Navigator).first);
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => w));
        await settle(t);
        if (pre != null) await pre();
        await store(t, 'feat_${lang}_$name');
        Navigator.of(t.element(find.byType(Navigator).first)).pop();
        await settle(t);
      }

      await DemoBackend.begin('customer',
          first: lang == 'ar' ? 'منى' : 'Mona',
          last: lang == 'ar' ? 'سمير' : 'Samir');
      DemoBackend.complaints.insert(0, {
        'id': 'c900',
        'customerId': DemoBackend.me['id'],
        'kind': 'complaint',
        'text': lang == 'ar' ? 'الفني اتأخر عن الميعاد' : 'The technician was late for the visit',
        'status': 'resolved',
        'reply': lang == 'ar' ? 'آسفين على التأخير. اتواصلنا مع الفني وهنخصم من عمولته.' : 'Sorry for the delay. We spoke to the technician and will make it right.',
        'createdAt': DateTime.now().toUtc().toIso8601String()
      });
      DemoBackend.complaints.insert(0, {
        'id': 'c901',
        'customerId': DemoBackend.me['id'],
        'kind': 'help',
        'text': lang == 'ar' ? 'عايز أغير ميعاد الزيارة' : 'I need to change my visit time',
        'status': 'in_review',
        'createdAt': DateTime.now().toUtc().toIso8601String()
      });
      final reqs = await Api.requests();
      final assigned = reqs.cast<Map>().firstWhere((r) => r['status'] == 'assigned', orElse: () => reqs.first as Map);
      final done = reqs.cast<Map>().firstWhere((r) => r['status'] == 'completed', orElse: () => reqs.first as Map);
      await open(const NotificationsScreen(), '1_notifications');
      await open(const ComplaintScreen(), '2_complaint_reply');
      await open(RatingScreen(request: done), '3_rating');
      final ctx = t.element(find.byType(Navigator).first);
      cancelWithReason(ctx, assigned);
      await settle(t);
      await store(t, 'feat_${lang}_4_cancel_policy');
      await t.pumpWidget(const SizedBox());
      await t.pump();
    });
  }
}
