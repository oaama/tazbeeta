import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sallehli/screens/onboarding.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sallehli/api.dart';
import 'package:sallehli/lang.dart';
import 'package:sallehli/screens/auth.dart';
import 'package:sallehli/screens/workspace.dart';
import 'demo_test.dart' show boot, settle, shot;
import 'screens_test.dart' show loadFonts;

void main() {
  setUpAll(loadFonts);
  for (final lang in ['en', 'ar']) {
    testWidgets('login chooses truly distinct roles and settings persist $lang',
        (t) async {
      await boot(t, lang);
      Future<void> login(String role) async {
        final ctx = t.element(find.byType(Navigator).first);
        Navigator.push(
            ctx,
            MaterialPageRoute(
                builder: (_) => LoginScreen(team: role == 'technician')));
        await settle(t);
        await t.tap(find.text(tr('Login')));
        await settle(t);
      }

      await login('technician');
      expect(Api.session.role, 'technician');
      expect(find.byType(TechnicianHome), findsOneWidget);
      expect(find.text(tr('My workday')), findsWidgets);
      expect(find.text(tr('Popular services')), findsNothing);
      await shot(t, 'role_${lang}_worker_login');
      await t.tap(find.text(tr('More')));
      await settle(t);
      expect(find.text(tr('Payment Methods')), findsNothing);
      expect(find.text(tr('Saved Addresses')), findsNothing);
      await t.tap(find.text(tr('Settings')));
      await settle(t);
      expect(find.byType(SettingsScreen), findsOneWidget);
      await t.tap(find.byType(SwitchListTile).first);
      await t.tap(find.text(tr('Save settings')));
      await settle(t);
      expect(
          (await SharedPreferences.getInstance()).getBool('jobUpdates'), false);
      await shot(t, 'role_${lang}_worker_settings');
      await t.tap(find.byType(BackButton));
      await settle(t);
      await t.ensureVisible(find.text(tr('Log out')));
      await t.tap(find.text(tr('Log out')));
      await settle(t);
      expect(find.byType(OnboardingScreen), findsOneWidget);
      await login('customer');
      expect(Api.session.role, 'customer');
      expect(find.byType(TechnicianHome), findsNothing);
      expect(find.text(tr('Search for a service')), findsOneWidget);
      await shot(t, 'role_${lang}_customer_login');
      await t.tap(find.text(tr('More')));
      await settle(t);
      expect(find.text(tr('Saved Addresses')), findsOneWidget);
      expect(find.textContaining('Sample workspace'), findsNothing);
      expect(find.textContaining('بيانات تجريبية'), findsNothing);
      expect(t.takeException(), isNull);
    });
  }
}
