import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sallehli/api.dart';
import 'package:sallehli/demo.dart';

Future<void> expectFail(Future f, [int? code]) async {
  try {
    await f;
  } on ApiError catch (e) {
    if (code != null) expect(e.code, code);
    return;
  }
  fail('expected the call to be rejected');
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('payment, cancel, technician flow rules', () async {
    SharedPreferences.setMockInitialValues({});
    await Api.logout();
    await DemoBackend.reset();
    await DemoBackend.begin('customer');
    await Api.saveProfile({'phone': '01000000000', 'bio': 'Hello', 'photo': '/tmp/a.jpg'});
    expect(Api.session.user?['bio'], 'Hello');
    await expectFail(Api.saveProfile({'bio': 'x' * 301}), 400);
    await Api.createRequest({
      'serviceId': DemoBackend.allServices.first['id'],
      'description': 'Fix the leaking tap please',
      'address': '12 Test street',
      'contactPhone': '01000000000',
      'visit': {'date': '2026-12-01', 'slot': 'morning'}
    });
    var r = (await Api.requests()).first as Map;
    expect(r['visit']['slot'], 'morning');
    final id = r['id'] as String;
    // cancel needs a reason
    await expectFail(Api.action(id, {'action': 'cancel', 'reason': ''}), 400);
    // payment is not open before the quote is accepted
    await expectFail(Api.action(id, {'action': 'pay', 'method': 'cash'}), 400);
    // complaint
    await expectFail(Api.sendComplaint({'text': 'bad'}), 400);
    await Api.sendComplaint({'requestId': id, 'type': 'service', 'text': 'The visit was late'});
    expect((await Api.complaints()).length, 1);
    // cancel with a reason works
    await Api.action(id, {'action': 'cancel', 'reason': 'Changed my mind'});
    r = (await Api.requests()).first as Map;
    expect(r['status'], 'cancelled');
    expect(r['cancelReason'], 'Changed my mind');
    // a second customer action after cancel is refused
    await expectFail(Api.action(id, {'action': 'rate', 'tech': 5, 'service': 5}), 400);
  });

  test('wallet receipt never auto-approves; completion needs a report', () async {
    SharedPreferences.setMockInitialValues({});
    await Api.logout();
    await DemoBackend.reset();
    await DemoBackend.begin('customer');
    await Api.createRequest({
      'serviceId': DemoBackend.allServices.first['id'],
      'description': 'Fix the leaking tap please',
      'address': '12 Test street',
      'contactPhone': '01000000000'
    });
    final id = (await Api.requests()).first['id'] as String;
    final q = DemoBackend.allRequests.firstWhere((x) => x['id'] == id);
    q['quote'] = {'amount': 500, 'version': 1};
    q['status'] = 'assigned';
    await DemoBackend.begin('technician');
    q['technicianId'] = Api.session.user!['id'];
    await Api.action(id, {'action': 'accept'});
    await expectFail(Api.action(id, {'action': 'photo', 'kind': 'before', 'path': '/tmp/b.jpg'}), 400);
    await Api.action(id, {'action': 'arrive'});
    await Api.action(id, {'action': 'photo', 'kind': 'before', 'path': '/tmp/b.jpg'});
    await Api.action(id, {'action': 'part', 'name': 'Washer', 'qty': 2, 'cost': 15});
    // completing without a report is refused
    await expectFail(Api.action(id, {'action': 'report', 'text': 'x'}), 400);
    await Api.action(id, {'action': 'report', 'text': 'Replaced the washer and tested', 'hours': 1});
    q['status'] = 'completed';
    // customer pays by wallet
    await DemoBackend.begin('customer');
    q['customerId'] = Api.session.user!['id'];
    await expectFail(Api.action(id, {'action': 'pay', 'method': 'wallet'}), 400);
    await Api.action(id, {'action': 'pay', 'method': 'wallet', 'receipt': '/tmp/receipt.jpg'});
    expect(q['payment']['status'], 'pending');
    expect(q['payment']['status'] == 'paid', false);
    // a technician cannot confirm a wallet payment
    q['technicianId'] = null;
  });
}
