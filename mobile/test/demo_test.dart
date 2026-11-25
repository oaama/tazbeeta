// Run with: flutter test --dart-define=DEMO=true test/demo_test.dart
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sallehli/screens/onboarding.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sallehli/api.dart';
import 'package:sallehli/config.dart';
import 'package:sallehli/demo.dart';
import 'package:sallehli/lang.dart';
import 'package:sallehli/main.dart';
import 'package:sallehli/screens/home.dart' show ChatScreen;
import 'package:sallehli/screens/prototype.dart';
import 'screens_test.dart' show loadFonts;

Future<void> shot(WidgetTester t, String name) async {
  await t.runAsync(() async {
    final b = t.renderObject(find.byType(RepaintBoundary).first)
        as RenderRepaintBoundary;
    final img = await b.toImage(pixelRatio: 1);
    final bd = await img.toByteData(format: ui.ImageByteFormat.png);
    Directory('shots_demo').createSync();
    File('shots_demo/$name.png').writeAsBytesSync(bd!.buffer.asUint8List());
  });
}

Future<void> settle(WidgetTester t) async {
  await t.runAsync(() => Future.delayed(const Duration(milliseconds: 300)));
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 200));
  }
}

Future<void> boot(WidgetTester t, String lang) async {
  SharedPreferences.setMockInitialValues({});
  await Api.logout();
  await DemoBackend.reset();
  t.view.physicalSize = const Size(1080, 2400); // OPPO A73 class: 411 x 914 dp
  t.view.devicePixelRatio = 2.625;
  Lang.code.value = lang;
  await t.pumpWidget(const RepaintBoundary(child: SallehliApp()));
  await settle(t);
  await t.pump(const Duration(seconds: 2));
  await t.pump(const Duration(milliseconds: 500));
  // Logged-out users now always see the intro first; tests that want the welcome screen skip it.
  if (Onboarding.seen &&
      find.byKey(const ValueKey('onboarding-skip')).evaluate().isNotEmpty) {
    await t.tap(find.byKey(const ValueKey('onboarding-skip')));
    await settle(t);
    await t.pump(const Duration(milliseconds: 500));
  }
  await t.runAsync(() async {
    final context = t.element(find.byType(Navigator).first);
    for (final name in [
      'welcome',
      'role_specialist',
      'role_worker',
      'location',
      'svc_finishing-renovation',
      'svc_ac-maintenance',
      'svc_appliance-maintenance'
    ]) {
      await precacheImage(AssetImage('assets/img/$name.jpg'), context);
    }
  });
  await t.pump();
}

Future<void> toSignup(WidgetTester t, String lang, String card) async {
  await t.tap(find.text(lang == 'ar' ? 'ابدأ' : 'Start'));
  await settle(t);
  await t.tap(find.text(tr('Create customer account')));
  await settle(t);
}

Future<void> fillSignup(WidgetTester t, {bool tech = false}) async {
  final f = find.byType(TextField);
  await t.enterText(f.at(0), Lang.ar ? 'منى' : 'Mona');
  await t.enterText(f.at(1), Lang.ar ? 'سمير' : 'Samir');
  await t.enterText(f.at(2), 'x');
  if (tech) {
    await t.enterText(f.at(3), '0100');
    await t.enterText(f.at(4), 'Nasr City');
    await t.enterText(f.at(5), '5');
    await t.enterText(f.at(6), 'x');
  } else {
    await t.enterText(f.at(3), 'x');
  }
  await t.pump();
}

void main() {
  if (!demoMode) {
    test('demo tests skipped (no DEMO define)', () {});
    return;
  }
  setUpAll(loadFonts);
  for (final lang in ['en', 'ar']) {
    testWidgets('customer journey via signup ($lang)', (t) async {
      await boot(t, lang);
      await shot(t, '${lang}_0_start');
      await t.tap(find.text(lang == 'ar' ? 'ابدأ' : 'Start'));
      await settle(t);
      await shot(t, '${lang}_1_role');
      await t.tap(find.text(tr('Create customer account')));
      await settle(t);
      await shot(t, '${lang}_2_signup_customer');
      expect(find.text('Years of experience'), findsNothing);
      await fillSignup(t);
      await t.ensureVisible(find.text(tr('Continue')));
      await t.tap(find.text(tr('Continue')));
      await settle(t);
      await shot(t, '${lang}_3_location');
      await t.tap(find.text(tr('Skip this step')));
      await settle(t);
      expect(Api.session.role, 'customer');
      expect(Api.session.user?['firstName'], lang == 'ar' ? 'منى' : 'Mona');
      await shot(t, '${lang}_4_explore');
      await t.tap(find.text(tr('Projects')));
      await settle(t);
      expect(
          find.textContaining(
              lang == 'ar' ? 'التكييف مش بيبرد' : 'AC is not cooling'),
          findsWidgets);
      await shot(t, '${lang}_5_projects');
      await t.tap(find.text(tr('Messages')));
      await settle(t);
      await shot(t, '${lang}_6_messages');
      await t.tap(find.text(lang == 'ar' ? 'صيانة التكييف' : 'AC Maintenance'));
      await settle(t);
      expect(find.byType(ChatScreen), findsOneWidget);
      await t.enterText(find.byType(TextField), 'Preview chat check');
      await t.tap(find.byIcon(Icons.send));
      await settle(t);
      expect(find.text('Preview chat check'), findsOneWidget);
      await shot(t, '${lang}_chat');
      await t.tap(find.byType(BackButton));
      await settle(t);
      await t.tap(find.text(tr('More')));
      await settle(t);
      await shot(t, '${lang}_7_more');
      expect(find.textContaining('DEMO'), findsNothing);
      expect(t.takeException(), isNull);
    });
    testWidgets('team login reaches assigned work ($lang)', (t) async {
      await boot(t, lang);
      await t.tap(find.text(tr('Start')));
      await settle(t);
      await t.tap(find.text(tr('Team login')));
      await settle(t);
      await t.tap(find.text(tr('Login')));
      await settle(t);
      expect(Api.session.role, 'technician');
      expect(find.text(tr('My workday')), findsWidgets);
      await shot(t, '${lang}_t2_jobs');
      expect(t.takeException(), isNull);
    });
  }
  testWidgets('static Start retains locale switching', (t) async {
    await boot(t, 'en');
    expect(find.byKey(const ValueKey('start-static-illustration')),
        findsOneWidget);
    expect(t.hasRunningAnimations, isFalse);
    await t.tap(find.text('العربية'));
    await settle(t);
    expect(find.text('صيانة وتشطيبات\nلبيتك'), findsOneWidget);
    expect(find.text('English'), findsOneWidget);
    expect(t.hasRunningAnimations, isFalse);
    expect(t.takeException(), isNull);
  });
  testWidgets('prototype local payment feedback and help interactions',
      (t) async {
    await boot(t, 'en');
    final ctx = t.element(find.byType(Navigator).first);
    Navigator.of(ctx)
        .push(MaterialPageRoute(builder: (_) => const PaymentPreviewScreen()));
    await settle(t);
    expect(find.byType(TextField), findsNothing);
    await t.tap(find.text('Save preference'));
    await settle(t);
    expect(find.text('Payment preference saved.'), findsOneWidget);
    Navigator.of(t.element(find.byType(Navigator).first)).pop();
    await settle(t);
    Navigator.of(t.element(find.byType(Navigator).first))
        .push(MaterialPageRoute(builder: (_) => const RatingPreviewScreen()));
    await settle(t);
    await t.tap(find.byTooltip('5'));
    await t.enterText(find.byType(TextField), 'Helpful preview');
    await t.tap(find.text('Submit feedback'));
    await settle(t);
    expect(find.text('Thank you for your feedback.'), findsOneWidget);
    Navigator.of(t.element(find.byType(Navigator).first)).pop();
    await settle(t);
    Navigator.of(t.element(find.byType(Navigator).first))
        .push(MaterialPageRoute(builder: (_) => const HelpPreviewScreen()));
    await settle(t);
    await t.tap(find.text('Who assigns the technician?'));
    await settle(t);
    expect(find.textContaining('The company team reviews'), findsOneWidget);
    expect(t.takeException(), isNull);
  });
  testWidgets('public login cannot choose staff role', (t) async {
    await boot(t, 'en');
    await t.tap(find.text('Start'));
    await settle(t);
    await t.tap(find.text('Customer login'));
    await settle(t);
    expect(find.byType(DropdownButtonFormField<String>), findsNothing);
    await t.tap(find.text('Login'));
    await settle(t);
    expect(Api.session.role, 'customer');
  });
}
