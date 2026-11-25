import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sallehli/api.dart';
import 'package:sallehli/demo.dart';
import 'package:sallehli/lang.dart';
import 'package:sallehli/screens/intro.dart';
import 'package:sallehli/screens/onboarding.dart';
import 'package:sallehli/screens/auth.dart';
import 'package:sallehli/screens/home.dart';
import 'package:sallehli/screens/details.dart';
import 'package:sallehli/screens/workspace.dart';
import 'package:sallehli/screens/prototype.dart';
import 'package:sallehli/screens/v4.dart';
import 'demo_test.dart' show boot, settle, shot;
import 'screens_test.dart' show loadFonts;

void main() {
  setUpAll(loadFonts);
  for (final lang in ['ar', 'en']) {
    testWidgets('full ui $lang', (t) async {
      Onboarding.seen = false;
      await boot(t, lang);
      var n = 0;
      Future<void> snap(String name) async {
        n++;
        await shot(t, 'full_${lang}_${n.toString().padLeft(2, '0')}_$name');
      }

      Future<void> open(Widget w, String name) async {
        final context = t.element(find.byType(Navigator).first);
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => w));
        await settle(t);
        await snap(name);
        expect(t.takeException(), isNull);
        Navigator.of(t.element(find.byType(Navigator).first)).pop();
        await settle(t);
      }

      final next = Lang.ar ? 'التالي' : 'Next';
      await snap('intro1');
      await t.tap(find.text(next));
      await settle(t);
      await snap('intro2');
      await t.tap(find.text(next));
      await settle(t);
      await snap('intro3');
      await t.tap(find.text(Lang.ar ? 'يلا نبدأ' : 'Get started'));
      await settle(t);
      await t.runAsync(() async => precacheImage(
          const AssetImage('assets/img/welcome.jpg'),
          t.element(find.byType(Navigator).first)));
      await t.pump();
      await snap('welcome');
      await open(const RoleScreen(), 'role');
      await open(const SignupScreen(role: 'customer'), 'signup_customer');
      await open(const SignupScreen(role: 'technician'), 'signup_technician');
      await open(const LoginScreen(), 'login_customer');
      await open(const LoginScreen(team: true), 'login_team');
      await open(const ForgotScreen(), 'forgot_password');
      await open(const LocationScreen(), 'location_permission');
      await DemoBackend.begin('customer',
          first: lang == 'ar' ? 'منى' : 'Mona',
          last: lang == 'ar' ? 'سمير' : 'Samir');
      final services = await Api.services();
      final reqs = await Api.requests();
      await open(const HomeShell(), 'customer_home');
      await open(SearchScreen(services: services), 'search');
      await open(ServiceDetailsScreen(service: services.first as Map),
          'service_details');
      await open(
          NewRequestScreen(service: services.first as Map), 'new_request');
      await open(const ProjectsTab(), 'my_requests');
      await open(RequestDetailsScreen(request: reqs.first as Map),
          'request_details');
      await open(const MessagesTab(), 'messages');
      await open(ChatScreen(request: reqs.first as Map), 'chat');
      await open(const MoreTab(), 'more');
      await open(const ProfileScreen(), 'profile');
      await open(const AddressesScreen(), 'addresses');
      await open(const SettingsScreen(), 'settings');
      final cr = DemoBackend.allRequests
          .firstWhere((x) => x['customerId'] == Api.session.user!['id']);
      cr['quote'] ??= {'amount': 650, 'version': 1, 'note': 'Labour and parts'};
      cr['visit'] = {'date': '2026-12-05', 'slot': 'morning'};
      cr['status'] = 'quoted';
      await open(RequestConfirmationScreen(request: cr), 'request_confirmation');
      await open(LocationPickerScreen(initial: '12 Nile St, Maadi'), 'location_picker');
      await open(QuoteScreen(request: cr), 'quote');
      cr['status'] = 'completed';
      cr['report'] = {'text': 'Replaced the valve', 'hours': 1};
      await open(const PaymentMethodsScreen(), 'payment_methods');
      await open(PayScreen(request: cr), 'pay');
      cr['payment'] = {'method': 'wallet', 'status': 'pending', 'receipt': '/tmp/r.jpg'};
      await open(PaymentStatusScreen(request: cr), 'payment_under_review');
      await open(InvoiceScreen(request: cr), 'invoice');
      await open(RatingScreen(request: cr), 'rating');
      await open(const HistoryScreen(), 'previous_orders');
      await open(const ComplaintScreen(), 'complaint');
      await open(const NotificationsScreen(), 'notifications');
      await open(Scaffold(body: ErrorView(onRetry: () {})), 'state_error');
      await open(const Scaffold(body: EmptyView('Nothing here yet', 'لسه مفيش حاجة', 'Your items will show up here.', 'اللي بتعمله هيظهر هنا.', icon: Icons.inbox_outlined)), 'state_empty');
      await open(const Scaffold(body: PermissionDeniedView('Location permission is off', 'إذن الموقع مقفول')), 'state_permission');
      await open(SessionExpiredView(onSignIn: () {}), 'state_session_expired');
      await open(const HelpPreviewScreen(), 'help');
      await open(Scaffold(body: OfflineView(onRetry: () {})), 'offline');
      await DemoBackend.begin('technician',
          first: lang == 'ar' ? 'مصطفى' : 'Mostafa',
          last: lang == 'ar' ? 'علي' : 'Ali');
      final jobs = await Api.requests();
      await open(const HomeShell(), 'technician_home');
      await open(const MessagesTab(), 'technician_messages');
      await open(ChatScreen(request: jobs.first as Map), 'technician_chat');
      await open(const MoreTab(), 'technician_more');
      final jr = jobs.first as Map;
      jr['status'] = 'assigned';
      jr['quote'] ??= {'amount': 650, 'version': 1};
      jr['technicianId'] = Api.session.user!['id'];
      await open(TaskDetailsScreen(request: jr), 'task_new');
      jr['techAccepted'] = 'x';
      jr['status'] = 'in_progress';
      jr['photos'] = {'before': ['/tmp/x.jpg']};
      jr['parts'] = [{'name': 'Valve', 'qty': 1, 'cost': 80}];
      await open(TaskDetailsScreen(request: jr), 'task_in_progress');
      await open(const HistoryScreen(), 'technician_history');
      await open(const EarningsScreen(), 'earnings');
      await open(const ProfileScreen(), 'technician_profile');
      Onboarding.seen = true;
    });
  }
}
