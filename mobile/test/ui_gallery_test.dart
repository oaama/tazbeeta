// Capture every implemented UI screen in offline preview mode.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sallehli/api.dart';
import 'package:sallehli/config.dart';
import 'package:sallehli/demo.dart';
import 'package:sallehli/screens/intro.dart';
import 'package:sallehli/screens/auth.dart';
import 'package:sallehli/screens/home.dart';
import 'package:sallehli/screens/prototype.dart';
import 'demo_test.dart' show boot, settle, shot;
import 'screens_test.dart' show loadFonts;

void main() {
  if (!demoMode) {
    test('gallery requires preview mode', () {});
    return;
  }
  setUpAll(loadFonts);
  for (final lang in ['en', 'ar']) {
    testWidgets('complete implemented UI gallery $lang', (t) async {
      await boot(t, lang);
      Future<void> open(Widget w, String name) async {
        final context = t.element(find.byType(Navigator).first);
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => w));
        await settle(t);
        await shot(t, 'gallery_${lang}_$name');
        expect(t.takeException(), isNull);
        Navigator.of(t.element(find.byType(Navigator).first)).pop();
        await settle(t);
      }

      await shot(t, 'gallery_${lang}_01_start');
      await open(const RoleScreen(), '02_role');
      await open(const SignupScreen(role: 'customer'), '03_customer_signup');
      await open(
          const SignupScreen(role: 'technician'), '04_technician_signup');
      await open(const LoginScreen(), '05_login');
      await open(const ForgotScreen(), '06_password_reset');
      await open(const LocationScreen(), '07_location_permission');
      await DemoBackend.begin('customer',
          first: lang == 'ar' ? 'منى' : 'Mona',
          last: lang == 'ar' ? 'سمير' : 'Samir');
      final services = await Api.services();
      final reqs = await Api.requests();
      await open(const HomeShell(), '08_customer_explore');
      await open(SearchScreen(services: services), '09_search');
      await open(
          NewRequestScreen(service: services.first as Map), '10_new_request');
      await open(const ProjectsTab(), '11_customer_requests');
      await open(const MessagesTab(), '12_customer_messages');
      await open(ChatScreen(request: reqs.first as Map), '13_customer_chat');
      await open(const MoreTab(), '14_customer_more');
      await open(const AddressesScreen(), '15_saved_addresses');
      await open(Scaffold(body: OfflineView(onRetry: () {})), '16_offline');
      await DemoBackend.begin('technician',
          first: lang == 'ar' ? 'مصطفى' : 'Mostafa',
          last: lang == 'ar' ? 'علي' : 'Ali');
      await open(const HomeShell(), '17_technician_jobs');
      await open(const MessagesTab(), '18_technician_messages');
      final jobs = await Api.requests();
      await open(ChatScreen(request: jobs.first as Map), '19_technician_chat');
      await open(const MoreTab(), '20_technician_more');
      await open(const PaymentPreviewScreen(), '21_payment_preview');
      await open(const RatingPreviewScreen(), '22_rating_preview');
      await open(const HelpPreviewScreen(), '23_help');
      await t.pumpWidget(const SizedBox());
      await t.pump();
    });
  }
}
