import 'api.dart';
import 'config.dart';
import 'demo.dart';

/// The dashboard uses the same UI in preview and live mode. Live mutations always
/// wait for the server, then reload; there is no silent in-memory success.
class DashboardData {
  static final List<Map<String, dynamic>> _users = [],
      _requests = [],
      _services = [],
      _messages = [],
      _feedback = [];
  static final List<String> _audit = [];
  static final List<Map<String, String>> _help = [];
  static String _announcement = '';
  static bool _cash = true;
  static List<Map<String, dynamic>> get users =>
      demoMode ? DemoBackend.users : _users;
  static List<Map<String, dynamic>> get allRequests =>
      demoMode ? DemoBackend.allRequests : _requests;
  static List<Map<String, dynamic>> get allServices =>
      demoMode ? DemoBackend.allServices : _services;
  static List<Map<String, dynamic>> get allMessages =>
      demoMode ? DemoBackend.allMessages : _messages;
  static List<Map<String, dynamic>> get feedback =>
      demoMode ? DemoBackend.feedback : _feedback;
  static List<String> get audit => demoMode ? DemoBackend.audit : _audit;
  static List<Map<String, String>> get help =>
      demoMode ? DemoBackend.help : _help;
  static String get announcement =>
      demoMode ? DemoBackend.announcement : _announcement;
  static bool get cashEnabled => demoMode ? DemoBackend.cashEnabled : _cash;
  static Future<void> load() async {
    if (demoMode) return;
    // Build a complete snapshot before replacing the current data.
    final results = await Future.wait([
      Api.dashboard('GET', '/api/admin/users'),
      Api.dashboard('GET', '/api/admin/requests'),
      Api.dashboard('GET', '/api/admin/services'),
      Api.dashboard('GET', '/api/admin/feedback'),
      Api.dashboard('GET', '/api/admin/activity'),
      Api.dashboard('GET', '/api/content'),
    ]);
    final requests = List<Map<String, dynamic>>.from(results[1]['requests']);
    final conversations =
        await Future.wait(requests.map((r) => Api.messages(r['id'] as String)));
    void replace(List<Map<String, dynamic>> target, dynamic source) {
      target
        ..clear()
        ..addAll(List<Map<String, dynamic>>.from(source));
    }

    replace(_users, results[0]['users']);
    replace(_requests, requests);
    replace(_services, results[2]['services']);
    replace(_feedback, results[3]['feedback']);
    replace(_messages, conversations.expand((x) => x).toList());
    _audit
      ..clear()
      ..addAll((results[4]['activity'] as List)
          .map((x) => '${x['createdAt']} · ${x['method']} ${x['path']}'));
    final c = results[5]['content'] as Map;
    _announcement = c['announcement'] as String;
    _cash = c['cashEnabled'] as bool;
    _help
      ..clear()
      ..addAll((c['help'] as List).map((h) => Map<String, String>.from(h)));
  }

  static Future<void> classify(String id, String serviceId) async {
    if (demoMode) {
      DemoBackend.classify(id, serviceId);
      await DemoBackend.persist();
      return;
    }
    await Api.dashboard(
        'POST', '/api/admin/requests/$id/classify', {'serviceId': serviceId});
    await load();
  }

  static Future<void> inspection(String id, String note) async {
    if (demoMode) {
      DemoBackend.inspection(id, note);
      await DemoBackend.persist();
      return;
    }
    await Api.dashboard(
        'POST', '/api/admin/requests/$id/inspection', {'note': note});
    await load();
  }

  static Future<void> quote(
      String id, double amount, String currency, String scope) async {
    if (demoMode) {
      DemoBackend.quote(id, amount, currency, scope);
      await DemoBackend.persist();
      return;
    }
    await Api.dashboard('POST', '/api/admin/requests/$id/quote',
        {'amount': amount, 'currency': currency, 'scope': scope});
    await load();
  }

  static Future<void> assign(String id, String tech) async {
    if (demoMode) {
      DemoBackend.assign(id, tech);
      await DemoBackend.persist();
      return;
    }
    await Api.dashboard(
        'POST', '/api/admin/requests/$id/assign', {'technicianId': tech});
  }

  static Future<void> cancel(String id) async {
    if (demoMode) {
      DemoBackend.cancel(id);
      await DemoBackend.persist();
      return;
    }
    await Api.setStatus(id, 'cancelled');
  }

  static Future<void> block(String id) async {
    if (demoMode) {
      DemoBackend.block(id);
      await DemoBackend.persist();
      return;
    }
    await Api.dashboard('POST', '/api/admin/users/$id/block',
        {'blocked': users.firstWhere((u) => u['id'] == id)['blocked'] != true});
  }

  static Future<void> updateTechnician(
      String id, bool available, List<String> skills) async {
    if (demoMode) {
      DemoBackend.updateTechnician(id, available, skills);
      await DemoBackend.persist();
      return;
    }
    await Api.dashboard(
        'PUT', '/api/admin/users/$id/skills', {'skills': skills});
    await Api.dashboard('PUT', '/api/admin/technicians/$id/availability',
        {'available': available});
  }

  static Future<void> adminReply(String id, String text) async {
    if (demoMode) {
      DemoBackend.adminReply(id, text);
      await DemoBackend.persist();
      return;
    }
    await Api.send(id, text);
  }

  static Future<void> review(Map<String, dynamic> f, bool value) async {
    if (demoMode) {
      f['reviewed'] = value;
      return;
    }
    await Api.dashboard(
        'PUT', '/api/admin/feedback/${f['id']}', {'reviewed': value});
  }

  static Future<void> saveHelp(
      int i, String q, String qa, String answer, String aa) async {
    if (demoMode) {
      DemoBackend.saveHelp(i, q, qa, answer, aa);
      await DemoBackend.persist();
      return;
    }
    final current = await Api.appContent();
    final items = (current['help'] as List)
        .map((h) => Map<String, String>.from(h))
        .toList();
    final item = {'q': q, 'qAr': qa, 'answer': answer, 'answerAr': aa};
    if (i < 0) {
      items.add(item);
    } else {
      items[i] = item;
    }
    await Api.dashboard('PUT', '/api/admin/content', {
      'announcement': current['announcement'],
      'cashEnabled': current['cashEnabled'],
      'help': items
    });
  }

  static Future<void> saveAppSettings(String text, bool cash) async {
    if (demoMode) {
      DemoBackend.saveAppSettings(text, cash);
      await DemoBackend.persist();
      return;
    }
    final current = await Api.appContent();
    await Api.dashboard('PUT', '/api/admin/content',
        {'announcement': text, 'cashEnabled': cash, 'help': current['help']});
    _announcement = text.trim();
    _cash = cash;
  }

  static Future<String?> addTechnician(
      String first, String last, List<String> skills,
      {String email = ''}) async {
    if (demoMode) {
      DemoBackend.addTechnician(first, last, skills);
      await DemoBackend.persist();
      return null;
    }
    final r = await Api.dashboard('POST', '/api/admin/technicians', {
      'firstName': first,
      'lastName': last,
      'email': email,
      'skills': skills
    });
    return r['setupLink'] as String?;
  }

  static Future<void> saveService(String name, String ar, bool popular,
      {String? id}) async {
    if (demoMode) {
      DemoBackend.saveService(name, ar, popular, id: id);
      await DemoBackend.persist();
      return;
    }
    await Api.dashboard('POST', '/api/admin/services', {
      'name': name,
      'nameAr': ar,
      'popular': popular,
      if (id != null) 'id': id
    });
  }
}
