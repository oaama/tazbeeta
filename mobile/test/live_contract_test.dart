// Run against backend/devstack.js only, never a production account.
// flutter test test/live_contract_test.dart --dart-define=API_URL=http://127.0.0.1:3100 --dart-define=SUPABASE_URL=http://127.0.0.1:3101 --dart-define=SUPABASE_ANON_KEY=demo-anon
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sallehli/api.dart';
import 'package:sallehli/config.dart';
import 'package:sallehli/dashboard_data.dart';

void main() {
  test('real Node contract: customer -> admin -> technician -> customer',
      () async {
    if (demoMode || apiBase != 'http://127.0.0.1:3100') return;
    HttpOverrides.global = null;
    SharedPreferences.setMockInitialValues({});
    await Api.login('hasnaa@demo.io', 'local-test');
    expect(Api.session.role, 'customer');
    await Api.saveProfile({
      'firstName': 'Hasnaa',
      'lastName': 'Local',
      'phone': '01000000000',
      'area': 'Nasr City',
      'role': 'admin'
    });
    expect(Api.session.user!['phone'], '01000000000');
    expect(Api.session.role, 'customer');
    await Api.saveAddresses([
      {'label': 'Home', 'line': 'Nasr City local test'}
    ]);
    expect(Api.session.user!['addresses'][0]['line'], 'Nasr City local test');
    await expectLater(
        Api.saveProfile({'phone': 'bad'}), throwsA(isA<ApiError>()));
    await Api.createRequest({
      'custom': true,
      'customTitle': 'Window handle repair',
      'description': 'Window handle is loose',
      'address': 'Local Cairo address',
      'contactPhone': '01000000000'
    });
    final custom = (await Api.requests()).first;
    expect(custom['serviceId'], 'custom-unclassified');
    expect(custom['custom'], true);
    await Api.login('admin@hexaplus.demo', 'local-test');
    await DashboardData.load();
    await DashboardData.inspection(custom['id'], 'Local custom inspection');
    await expectLater(
        DashboardData.quote(custom['id'], 100, 'EGP', 'Local custom scope'),
        throwsA(isA<ApiError>()));
    await DashboardData.saveService('Window repairs', 'إصلاح الشبابيك', false,
        id: 'window-repair');
    await DashboardData.classify(custom['id'], 'window-repair');
    await DashboardData.quote(custom['id'], 100, 'EGP', 'Local custom repair');
    await Api.login('hasnaa@demo.io', 'local-test');
    await Api.acceptQuote(custom['id'], 1);
    await Api.setStatus(custom['id'], 'cancelled');
    await Api.createRequest({
      'serviceId': 'ac-maintenance',
      'description': 'Flutter live contract test',
      'address': 'Local test address'
    });
    final id = (await Api.requests()).first['id'] as String;
    await Api.submitFeedback(4, 'Flutter live feedback');
    await Api.login('admin@hexaplus.demo', 'local-test');
    expect(Api.session.role, 'admin');
    await DashboardData.load();
    final tech =
        DashboardData.users.firstWhere((u) => u['email'] == 'mostafa@demo.io');
    await DashboardData.inspection(id, 'Local inspection findings');
    await DashboardData.quote(id, 100, 'EGP', 'Local repair scope');
    await Api.login('hasnaa@demo.io', 'local-test');
    await Api.acceptQuote(id, 1);
    await Api.login('admin@hexaplus.demo', 'local-test');
    await DashboardData.assign(id, tech['id'] as String);
    await DashboardData.saveAppSettings('Flutter live announcement', false);
    await DashboardData.saveHelp(-1, 'Timing?', 'الموعد؟',
        'The team will contact you', 'الفريق هيتواصل معاك');
    await DashboardData.adminReply(id, 'Company team update');
    await DashboardData.load();
    expect(DashboardData.allRequests.firstWhere((r) => r['id'] == id)['status'],
        'assigned');
    expect(
        DashboardData.feedback.any((f) => f['note'] == 'Flutter live feedback'),
        isTrue);
    final feedback = DashboardData.feedback
        .firstWhere((f) => f['note'] == 'Flutter live feedback');
    await DashboardData.review(feedback, true);
    expect(DashboardData.announcement, 'Flutter live announcement');
    expect(DashboardData.help.last['q'], 'Timing?');
    expect(DashboardData.cashEnabled, isFalse);
    await Api.login('mostafa@demo.io', 'local-test');
    expect(Api.session.role, 'technician');
    expect((await Api.requests()).any((r) => r['id'] == id), isTrue);
    await Api.setStatus(id, 'in_progress');
    await expectLater(Api.setStatus(id, 'pending'), throwsA(isA<ApiError>()));
    await Api.send(id, 'Technician update');
    await Api.setStatus(id, 'completed');
    await Api.login('hasnaa@demo.io', 'local-test');
    expect((await Api.requests()).firstWhere((r) => r['id'] == id)['status'],
        'completed');
    expect((await Api.messages(id)).last['text'], 'Technician update');
    expect(
        (await Api.appContent())['announcement'], 'Flutter live announcement');
    await expectLater(DashboardData.load(), throwsA(isA<ApiError>()));
    Api.client.close();
  });
}
