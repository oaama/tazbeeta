import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sallehli/lang.dart';
import 'package:sallehli/screens/intro.dart';
import 'package:sallehli/screens/onboarding.dart';
import 'package:sallehli/theme.dart';
import 'screens_test.dart' show loadFonts;

Widget app() => MaterialApp(
    theme: buildTheme(),
    locale: Locale(Lang.code.value),
    home: const OnboardingScreen());

void main() {
  setUpAll(loadFonts);
  for (final lang in ['en', 'ar']) {
    testWidgets('three intro pages lead to the welcome screen ($lang)',
        (t) async {
      SharedPreferences.setMockInitialValues({});
      Onboarding.seen = false;
      Lang.code.value = lang;
      t.view.physicalSize = const Size(1080, 2400);
      t.view.devicePixelRatio = 2.625;
      await t.pumpWidget(app());
      await t.pumpAndSettle();
      final next = lang == 'ar' ? 'التالي' : 'Next';
      final start = lang == 'ar' ? 'يلا نبدأ' : 'Get started';
      expect(find.text(next), findsOneWidget);
      await t.tap(find.text(next));
      await t.pumpAndSettle();
      await t.tap(find.text(next));
      await t.pumpAndSettle();
      expect(find.text(next), findsNothing);
      expect(find.text(start), findsOneWidget);
      await t.tap(find.text(start));
      await t.pumpAndSettle();
      expect(find.byType(StartScreen), findsOneWidget);
      expect(Onboarding.seen, isTrue);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getBool('onboarded'), isTrue);
      expect(t.takeException(), isNull);
      Lang.code.value = 'en';
    });
  }

  testWidgets('skip goes straight to welcome and is remembered', (t) async {
    SharedPreferences.setMockInitialValues({});
    Onboarding.seen = false;
    Lang.code.value = 'en';
    await t.pumpWidget(app());
    await t.pumpAndSettle();
    await t.tap(find.byKey(const ValueKey('onboarding-skip')));
    await t.pumpAndSettle();
    expect(find.byType(StartScreen), findsOneWidget);
    await Onboarding.restore();
    expect(Onboarding.seen, isTrue);
  });

  testWidgets('welcome screen fits small and tall phones without overflow',
      (t) async {
    for (final size in [const Size(720, 1280), const Size(1080, 2400)]) {
      for (final lang in ['en', 'ar']) {
        Lang.code.value = lang;
        t.view.physicalSize = size;
        t.view.devicePixelRatio = size.width == 720 ? 2.0 : 2.625;
        await t.pumpWidget(MaterialApp(
            theme: buildTheme(),
            locale: Locale(lang),
            home: const StartScreen()));
        await t.pump();
        expect(t.takeException(), isNull);
      }
    }
    Lang.code.value = 'en';
  });
}
