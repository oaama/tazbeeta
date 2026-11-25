import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/testing.dart';
import 'package:http/http.dart' as http;
import 'package:sallehli/api.dart';
import 'package:sallehli/demo.dart';
import 'package:sallehli/dashboard_data.dart';
import 'package:sallehli/lang.dart';
import 'package:sallehli/screens/details.dart';
import 'package:sallehli/screens/home.dart';
import 'demo_test.dart' show boot, settle, shot;
import 'screens_test.dart' show loadFonts;

void main() {
  setUpAll(loadFonts);
  setUp(() => Api.client = DemoBackend.client);
  test('profile fields, permissions, restart, role isolation and logout',
      () async {
    SharedPreferences.setMockInitialValues({});
    await DemoBackend.reset();
    await DemoBackend.begin('customer');
    await Api.saveProfile({
      'firstName': 'Mona',
      'lastName': 'Samir',
      'phone': '01000000000',
      'area': 'Cairo',
      'role': 'admin',
      'skills': ['x']
    });
    expect(Api.session.role, 'customer');
    expect(Api.session.user!['phone'], '01000000000');
    await Api.saveAddresses([
      {'label': 'Home', 'line': 'Cairo test street'}
    ]);
    await Api.send('d2', 'Saved message');
    await Api.createRequest({
      'serviceId': 'ac-maintenance',
      'description': 'Persistence request',
      'address': 'Cairo test street'
    });
    final id = DemoBackend.allRequests.first['id'] as String;
    await DemoBackend.begin('admin');
    await DashboardData.inspection(id, 'Findings for persistence');
    await DashboardData.saveAppSettings('Persistent note', false);
    await DemoBackend.begin('customer');
    DemoBackend.unloadPreview();
    await Api.restore();
    expect(Api.session.firstName, 'Mona');
    expect(Api.session.user!['addresses'][0]['line'], 'Cairo test street');
    expect((await Api.messages('d2')).last['text'], 'Saved message');
    expect(DemoBackend.announcement, 'Persistent note');
    expect(
        DemoBackend.allRequests.firstWhere((r) => r['id'] == id)['inspection']
            ['note'],
        'Findings for persistence');
    await DemoBackend.begin('technician');
    expect(Api.session.firstName, isNot('Mona'));
    await Api.saveProfile({'phone': '01111111111'});
    await DemoBackend.beginRemembered('customer@example.invalid');
    expect(Api.session.role, 'customer');
    expect(Api.session.firstName, 'Mona');
    await expectLater(
        Api.saveProfile({'phone': 'bad'}), throwsA(isA<ApiError>()));
    expect(Api.session.user!['phone'], '01000000000');
    await Api.logout();
    DemoBackend.unloadPreview();
    await Api.restore();
    expect(Api.session.loggedIn, false);
  });
  for (final lang in ['en', 'ar']) {
    testWidgets('full profile service details and request progress $lang',
        (t) async {
      await boot(t, lang);
      await DemoBackend.begin('customer');
      Future<void> open(Widget screen) async {
        final ctx = t.element(find.byType(Navigator).first);
        Navigator.push(ctx, MaterialPageRoute(builder: (_) => screen));
        await settle(t);
      }

      Future<void> back() async {
        Navigator.pop(t.element(find.byType(Navigator).first));
        await settle(t);
      }

      await open(const ProfileScreen());
      await t.enterText(find.byType(TextField).at(2), '01000000000');
      await t.enterText(find.byType(TextField).at(3),
          lang == 'ar' ? 'مدينة نصر' : 'Nasr City');
      await t.ensureVisible(find.text(tr('Save profile')));
      await t.tap(find.text(tr('Save profile')));
      await settle(t);
      expect(Api.session.user!['phone'], '01000000000');
      await t.drag(find.byType(ListView), const Offset(0, 700));
      await settle(t);
      await shot(t, 'audit_${lang}_customer_profile');
      await back();
      await open(
          ServiceDetailsScreen(service: (await Api.services()).first as Map));
      await shot(t, 'audit_${lang}_service');
      await t.scrollUntilVisible(find.text(tr('Request inspection')), 200);
      await t.tap(find.text(tr('Request inspection')));
      await settle(t);
      expect(find.byType(NewRequestScreen), findsOneWidget);
      await back();
      await back();
      final r =
          (await Api.requests()).firstWhere((r) => r['id'] == 'd2') as Map;
      await open(RequestDetailsScreen(request: r));
      await shot(t, 'audit_${lang}_request_top');
      await t.scrollUntilVisible(find.text(tr('Review and accept quote')), 200);
      await settle(t);
      await shot(t, 'audit_${lang}_request_quote');
      await t.tap(find.text(tr('Review and accept quote')));
      await settle(t);
      await t.tap(find.text(tr('Accept quote')));
      await settle(t);
      expect(
          DemoBackend.allRequests.firstWhere((r) => r['id'] == 'd2')['status'],
          'approved');
      await back();
      await DemoBackend.begin('technician');
      await open(const ProfileScreen());
      await shot(t, 'audit_${lang}_worker_profile');
      expect(t.getTopLeft(find.byType(CircleAvatar).first).dy, greaterThan(56));
      await t.drag(find.byType(ListView), const Offset(0, -350));
      await settle(t);
      await shot(t, 'audit_${lang}_worker_skills');
      expect(find.text(tr('Services assigned by management')), findsOneWidget);
      await back();
      expect(t.takeException(), isNull);
    });
  }
  testWidgets('address CRUD confirms delete and saves after success',
      (t) async {
    await boot(t, 'en');
    await DemoBackend.begin('customer');
    final ctx = t.element(find.byType(Navigator).first);
    Navigator.push(
        ctx, MaterialPageRoute(builder: (_) => const AddressesScreen()));
    await settle(t);
    await t.tap(find.text(tr('Add address')));
    await settle(t);
    await t.enterText(find.byType(TextField).at(0), 'Office');
    await t.enterText(find.byType(TextField).at(1), 'Cairo office address');
    await t.pump();
    await t.tap(find.text(tr('Save')));
    await settle(t);
    expect(Api.session.user!['addresses'].length, 3);
    await t.tap(find.text('Office'));
    await settle(t);
    await t.enterText(find.byType(TextField).at(1), 'Changed office address');
    await t.pump();
    await t.tap(find.text(tr('Save')));
    await settle(t);
    expect(find.text('Changed office address'), findsOneWidget);
    await t.tap(find.byIcon(Icons.delete_outline).last);
    await settle(t);
    await t.tap(find.text(tr('Delete')).last);
    await settle(t);
    expect(Api.session.user!['addresses'].length, 2);
    await shot(t, 'audit_addresses');
    expect(t.takeException(), isNull);
  });
  testWidgets('address save failure does not change list or account',
      (t) async {
    await boot(t, 'en');
    await DemoBackend.begin('customer');
    final original = List.from(Api.session.user!['addresses']);
    final ctx = t.element(find.byType(Navigator).first);
    Navigator.push(
        ctx, MaterialPageRoute(builder: (_) => const AddressesScreen()));
    await settle(t);
    final client = Api.client;
    Api.client = MockClient((_) async => http.Response(
        '{"error":"Local save failed"}', 503,
        headers: {'content-type': 'application/json'}));
    await t.tap(find.text(tr('Add address')));
    await settle(t);
    await t.enterText(find.byType(TextField).at(0), 'Failed office');
    await t.enterText(
        find.byType(TextField).at(1), 'Uncommitted office address');
    await t.pump();
    await t.tap(find.text(tr('Save')));
    await settle(t);
    expect(find.text('Uncommitted office address'), findsNothing);
    expect(Api.session.user!['addresses'], original);
    expect(find.textContaining('Local save failed'), findsOneWidget);
    Api.client = client;
  });
  testWidgets('chat keeps input on failure and offers retry', (t) async {
    await boot(t, 'en');
    await DemoBackend.begin('customer');
    final req = (await Api.requests()).first as Map;
    final client = Api.client;
    Api.client = MockClient((_) async => http.Response(
        '{"error":"Local test unavailable"}', 503,
        headers: {'content-type': 'application/json'}));
    final ctx = t.element(find.byType(Navigator).first);
    Navigator.push(
        ctx, MaterialPageRoute(builder: (_) => ChatScreen(request: req)));
    await settle(t);
    expect(find.text(tr('Retry')), findsOneWidget);
    await t.enterText(find.byType(TextField), 'Keep my message');
    await t.tap(find.byIcon(Icons.send));
    await settle(t);
    expect(find.text('Keep my message'), findsOneWidget);
    Api.client = client;
    await t.tap(find.text(tr('Retry')));
    await settle(t);
    expect(find.text(tr('Retry')), findsNothing);
    expect(t.takeException(), isNull);
    await t.pumpWidget(const SizedBox());
  });
}
