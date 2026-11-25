import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sallehli/api.dart';
import 'package:sallehli/demo.dart';
import 'package:sallehli/dashboard_data.dart';
import 'package:sallehli/lang.dart';
import 'package:sallehli/screens/home.dart';
import 'demo_test.dart' show boot, settle, shot;
import 'screens_test.dart' show loadFonts;

void main() {
  setUpAll(loadFonts);
  test(
      'custom need requires explicit management classification before quote/assignment',
      () async {
    SharedPreferences.setMockInitialValues({});
    await DemoBackend.reset();
    await DemoBackend.begin('customer');
    await Api.createRequest({
      'custom': true,
      'customTitle': 'Water leak in kitchen',
      'description': 'Leak below kitchen sink',
      'address': 'Cairo local address',
      'contactPhone': '01000000000'
    });
    final r = DemoBackend.allRequests.first;
    expect(r['custom'], true);
    expect(r['serviceId'], 'custom-unclassified');
    expect(r['technicianId'], null);
    final id = r['id'];
    await DemoBackend.begin('admin');
    await DashboardData.inspection(id, 'Local custom inspection');
    expect(() => DemoBackend.quote(id, 120, 'EGP', 'Fix sink pipe'),
        throwsStateError);
    expect(() => DemoBackend.assign(id, 'demo-t2'), throwsStateError);
    DemoBackend.saveService('Plumbing', 'السباكة', false);
    final s = DemoBackend.allServices.last;
    await DashboardData.classify(id, s['id']);
    await DashboardData.quote(id, 120, 'EGP', 'Fix sink pipe');
    await DemoBackend.begin('customer');
    await Api.acceptQuote(id, 1);
    await DemoBackend.begin('admin');
    expect(() => DemoBackend.assign(id, 'demo-t2'), throwsStateError);
    await DashboardData.addTechnician('Local', 'Plumber', [s['id']]);
    final t = DemoBackend.users.last;
    await DashboardData.updateTechnician(t['id'], true, [s['id']]);
    await DashboardData.assign(id, t['id']);
    expect(r['status'], 'assigned');
    expect(r['customTitle'], 'Water leak in kitchen');
  });
  for (final lang in ['en', 'ar'])
    testWidgets(
        'no-match catalog form reaches distinguishable admin request $lang',
        (t) async {
      await boot(t, lang);
      await DemoBackend.begin('customer');
      await Api.saveProfile({'phone': '01000000000'});
      final ctx = t.element(find.byType(Navigator).first);
      Navigator.push(
          ctx,
          MaterialPageRoute(
              builder: (_) => SearchScreen(services: DemoBackend.allServices)));
      await settle(t);
      await t.enterText(find.byType(TextField), 'Kitchen plumbing');
      await t.pump();
      await settle(t);
      expect(find.text(tr('No matching service')), findsOneWidget);
      await shot(t, 'custom_${lang}_no_match');
      await t.tap(find.text(tr("Can't find your service?")));
      await settle(t);
      expect(find.byType(NewRequestScreen), findsOneWidget);
      expect(find.text('Kitchen plumbing'), findsOneWidget);
      await t.enterText(
          find.byType(TextField).at(2),
          lang == 'ar'
              ? 'في تسريب مياه تحت الحوض'
              : 'Water leaking below kitchen sink');
      await t.pump();
      await shot(t, 'custom_${lang}_form');
      await t.scrollUntilVisible(find.text(tr('Send request')), 200, scrollable: find.byType(Scrollable).first);
      await t.tap(find.text(tr('Send request')));
      await settle(t);
      expect(DemoBackend.allRequests.first['custom'], true);
      expect(DemoBackend.allRequests.first['contactPhone'], '01000000000');
    });
}
