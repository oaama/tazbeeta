import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';
import 'lang.dart';

String sampleText(Map row, String field) => Lang.ar && row['${field}Ar'] != null
    ? row['${field}Ar'].toString()
    : (row[field] ?? '').toString();
String requestTitle(Map row) {
  if (row['custom'] == true)
    return '${tr('Custom service')}: ${row['customTitle']}';
  if (Lang.ar && (row['serviceNameAr'] ?? '').toString().isNotEmpty)
    return row['serviceNameAr'].toString();
  final service = _services.where((s) => s['id'] == row['serviceId']);
  final name = (row['serviceName'] ?? '').toString();
  if (service.isNotEmpty && (name.isEmpty || name == service.first['name']))
    return svcName(service.first);
  return name.isNotEmpty
      ? name
      : (row['serviceId'] ?? '').toString().replaceAll('-', ' ');
}

/// Offline demo data for the DEMO build. It answers every request in memory; nothing leaves the phone.
const _customer = {
  'id': 'demo-c',
  'firstName': 'عمر',
  'lastName': 'أحمد',
  'email': 'demo@example.invalid',
  'role': 'customer',
  'addresses': [
    {'label': 'Home', 'line': 'Nasr City, Cairo'},
    {'label': 'Family home', 'line': 'Maadi, Cairo'}
  ]
};
const _tech = {
  'id': 'demo-t',
  'firstName': 'مصطفى',
  'lastName': 'علي',
  'email': 'tech@example.invalid',
  'role': 'technician',
  'available': true,
  'addresses': []
};

final List<Map<String, dynamic>> _services = [
  {
    'id': 'finishing-renovation',
    'name': 'Finishing & Renovation',
    'nameAr': 'التشطيبات والتجديد',
    'popular': true,
    'order': 0
  },
  {
    'id': 'ac-maintenance',
    'name': 'AC Maintenance',
    'nameAr': 'صيانة التكييف',
    'popular': true,
    'order': 1
  },
  {
    'id': 'appliance-maintenance',
    'name': 'Electrical Appliance Maintenance',
    'nameAr': 'صيانة الأجهزة الكهربائية',
    'popular': true,
    'order': 2
  },
];

final _originalServices = jsonEncode(_services);

class DemoBackend {
  static int _n = 100;
  static bool _initialized = false;
  static final List<Map<String, dynamic>> users = [];
  static List<Map<String, dynamic>> get allRequests => _reqs;
  static List<Map<String, dynamic>> get allServices => _services;
  static final List<String> audit = [];
  static final List<Map<String, dynamic>> feedback = [];
  static List<Map<String, dynamic>> get allMessages => _msgs;
  static final List<Map<String, String>> help = [
    {
      'q': 'Who assigns the technician?',
      'qAr': 'مين بيعيّن الفني؟',
      'answer':
          'The company team reviews requests and assigns a technician. This is not an open marketplace.',
      'answerAr':
          'فريق الشركة بيراجع الطلبات وبيعيّن الفني. التطبيق مش سوق مفتوح.'
    },
    {
      'q': 'Can I message the technician?',
      'qAr': 'أقدر أكلم الفني؟',
      'answer':
          'Open an assigned request and tap Chat. Messages in this prototype stay on this device only.',
      'answerAr':
          'افتح طلب متعيّن واضغط المحادثة. الرسائل التجريبية بتفضل على نفس الجهاز.'
    },
    {
      'q': 'Can I cancel a request?',
      'qAr': 'أقدر ألغي الطلب؟',
      'answer':
          'The prototype allows cancellation before work starts. Real service rules are not set yet.',
      'answerAr':
          'تقدر تلغي الطلب قبل بدء الشغل في المعاينة. قواعد الخدمة الحقيقية لسه مش محددة.'
    },
  ];
  static final String _originalHelp = jsonEncode(help);
  static String announcement = '';
  static String payNumber = '';
  static String payName = '';
  static final List<Map<String, dynamic>> complaints = [];
  static bool cashEnabled = true;
  static void submitFeedback(int stars, String note) {
    feedback.insert(0, {
      'id': 'f${_n++}',
      'customer': me['firstName'],
      'stars': stars,
      'note': note,
      'reviewed': false
    });
    _record('Sample feedback submitted');
  }

  static void adminReply(String requestId, String text) {
    if (text.trim().isEmpty) return;
    _msgs.add({
      'id': 'm${_n++}',
      'requestId': requestId,
      'senderId': 'demo-admin',
      'text': text.trim(),
      'createdAt': DateTime.now().toUtc().toIso8601String()
    });
    _record('Team replied in $requestId');
  }

  static void saveHelp(int i, String q, String qa, String answer, String aa) {
    final item = {'q': q, 'qAr': qa, 'answer': answer, 'answerAr': aa};
    if (i < 0)
      help.add(item);
    else
      help[i] = item;
    _record('Updated Help item');
  }

  static void saveAppSettings(String note, bool cash) {
    announcement = note.trim();
    cashEnabled = cash;
    _record('Updated sample app settings');
  }

  static void updateTechnician(String id, bool available, List<String> skills) {
    final u = users.firstWhere((u) => u['id'] == id);
    u['available'] = available;
    u['skills'] = skills;
    _record('Updated technician ${u['firstName']}');
  }

  static Future<void> reset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('workspace_v1');
    _initialized = false;
    final originalServices = jsonDecode(_originalServices) as List;
    final originalHelp = jsonDecode(_originalHelp) as List;
    _services
      ..clear()
      ..addAll(originalServices.map((s) => Map<String, dynamic>.from(s)));
    help
      ..clear()
      ..addAll(originalHelp.map((h) => Map<String, String>.from(h)));
    await _ensure();
  }

  static Future<void> _ensure() async {
    if (_initialized) return;
    _initialized = true;
    users
      ..clear()
      ..addAll([
        Map<String, dynamic>.from(_customer),
        {..._tech, 'skills': _services.map((s) => s['id']).toList()},
        {
          'id': 'demo-t2',
          'firstName': 'Nour',
          'lastName': 'Hassan',
          'email': 'nour@example.invalid',
          'role': 'technician',
          'available': true,
          'skills': ['ac-maintenance'],
          'addresses': []
        },
        {
          'id': 'demo-admin',
          'firstName': 'Team',
          'lastName': 'Admin',
          'email': 'admin@example.invalid',
          'role': 'admin',
          'addresses': []
        },
      ]);
    audit.clear();
    feedback
      ..clear()
      ..addAll([
        {
          'id': 'seed-f1',
          'customer': 'Mariam',
          'stars': 5,
          'note': 'The team arrived on time and explained the repair.',
          'reviewed': true
        },
        {
          'id': 'seed-f2',
          'customer': 'Omar',
          'stars': 4,
          'note': 'Clear follow-up and tidy work.',
          'reviewed': false
        }
      ]);
    audit.add('Sample workspace ready · customer, team and technician views');
    announcement = '';
    cashEnabled = true;
    complaints.clear();
    payNumber = '';
    payName = '';
    _seed();
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('workspace_v1');
    if (saved != null) {
      try {
        final j = jsonDecode(saved) as Map;
        void restoreList(List<Map<String, dynamic>> out, dynamic rows) {
          out
            ..clear()
            ..addAll((rows as List).map((r) => Map<String, dynamic>.from(r)));
        }

        restoreList(users, j['users']);
        restoreList(_reqs, j['requests']);
        restoreList(_msgs, j['messages']);
        restoreList(_services, j['services']);
        restoreList(feedback, j['feedback']);
        help
          ..clear()
          ..addAll((j['help'] as List).map((x) => Map<String, String>.from(x)));
        audit
          ..clear()
          ..addAll((j['audit'] as List).cast<String>());
        _n = j['next'];
        announcement = j['announcement'];
        cashEnabled = j['cash'];
        complaints
          ..clear()
          ..addAll(((j['complaints'] ?? []) as List)
              .map((r) => Map<String, dynamic>.from(r)));
        payNumber = (j['payNumber'] ?? '').toString();
        payName = (j['payName'] ?? '').toString();
      } catch (_) {
        await prefs.remove('workspace_v1');
      }
    }
  }

  static Future<void> persist() async {
    if (!_initialized) return;
    final state = jsonEncode({
      'users': users,
      'requests': _reqs,
      'messages': _msgs,
      'services': _services,
      'feedback': feedback,
      'help': help,
      'audit': audit,
      'next': _n,
      'announcement': announcement,
      'cash': cashEnabled,
      'complaints': complaints,
      'payNumber': payNumber,
      'payName': payName
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('workspace_v1', state);
  }

  static void unloadPreview() {
    _initialized = false;
    Api.session.token = null;
    Api.session.user = null;
  }

  static Future<void> restoreSession() async {
    await _ensure();
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getString('token') == null) return;
    final id = prefs.getString('demo_user_id');
    final found = users.where((u) => u['id'] == id);
    if (found.isEmpty) return;
    me = found.first;
    Api.session.user = me;
    Api.session.token = 'demo-${me['role']}';
  }

  static void _record(String message) {
    audit.insert(
        0, '${DateTime.now().toIso8601String().substring(11, 19)} · $message');
    persist();
  }

  static Future<void> switchRole(String role, {String? userId}) async {
    await begin(role);
    if (userId != null) {
      me = users.firstWhere((u) => u['id'] == userId);
      Api.session.user = me;
      final p = await SharedPreferences.getInstance();
      await p.setString('demo_user_id', me['id']);
    }
  }

  static void classify(String id, String serviceId) {
    final r = _reqs.firstWhere((r) => r['id'] == id);
    if (r['custom'] != true ||
        !['pending', 'inspection'].contains(r['status']) ||
        r['quote'] != null)
      throw StateError('Only unquoted custom requests can be classified');
    final s = _services.firstWhere((s) => s['id'] == serviceId);
    r.addAll({
      'serviceId': s['id'],
      'serviceName': s['name'],
      'classifiedAt': DateTime.now().toIso8601String()
    });
  }

  static void inspection(String id, String note) {
    final r = _reqs.firstWhere((r) => r['id'] == id);
    if (!['pending', 'inspection'].contains(r['status']) ||
        note.trim().length < 3) throw StateError('Inspection note required');
    r['inspection'] = {
      'note': note,
      'recordedAt': DateTime.now().toIso8601String()
    };
    r['status'] = 'inspection';
  }

  static void quote(String id, double amount, String currency, String scope) {
    final r = _reqs.firstWhere((r) => r['id'] == id);
    if ((r['custom'] == true && r['classifiedAt'] == null) ||
        !['inspection', 'quoted'].contains(r['status']) ||
        r['inspection'] == null ||
        amount <= 0 ||
        !RegExp(r'^[A-Z]{3}$').hasMatch(currency) ||
        scope.trim().length < 5)
      throw StateError('Inspection and complete quote required');
    r['quote'] = {
      'amount': amount,
      'currency': currency,
      'scope': scope,
      'version': ((r['quote'] as Map?)?['version'] ?? 0) + 1
    };
    r['quoteAccepted'] = null;
    r['status'] = 'quoted';
  }

  static void acceptQuote(String id, int version) {
    final r = _reqs.firstWhere((r) => r['id'] == id);
    if (me['role'] != 'customer' ||
        me['id'] != r['customerId'] ||
        r['status'] != 'quoted' ||
        (r['quote'] as Map?)?['version'] != version)
      throw StateError('Review current quote');
    r['quoteAccepted'] = {'version': version, 'customerId': me['id']};
    r['status'] = 'approved';
  }

  static void assign(String id, String technicianId) {
    final request = _reqs.firstWhere((r) => r['id'] == id);
    final tech = users.firstWhere((u) => u['id'] == technicianId);
    if ((request['custom'] == true && request['classifiedAt'] == null) ||
        !['approved', 'assigned'].contains(request['status']) ||
        request['quoteAccepted'] == null ||
        request['quoteAccepted']['version'] != request['quote']?['version'])
      throw StateError('This request cannot be assigned.');
    if (tech['blocked'] == true || tech['available'] != true)
      throw StateError('Technician is unavailable.');
    if (!(tech['skills'] as List? ?? []).contains(request['serviceId']))
      throw StateError('Service is not in technician skills.');
    if (_reqs.any((r) =>
        r['id'] != id &&
        r['technicianId'] == technicianId &&
        ['assigned', 'in_progress'].contains(r['status'])))
      throw StateError('Technician already has an active job.');
    request.addAll({
      'technicianId': technicianId,
      'technicianName': '${tech['firstName']} ${tech['lastName']}',
      'status': 'assigned'
    });
    _record('Assigned $id to ${tech['firstName']}');
  }

  static void cancel(String id) {
    final request = _reqs.firstWhere((r) => r['id'] == id);
    if (['completed', 'cancelled'].contains(request['status']))
      throw StateError('Request is already closed.');
    request['status'] = 'cancelled';
    _record('Cancelled $id');
  }

  static void block(String id) {
    final u = users.firstWhere((u) => u['id'] == id);
    if (u['role'] == 'admin') return;
    u['blocked'] = u['blocked'] != true;
    _record(
        '${u['blocked'] == true ? 'Blocked' : 'Unblocked'} ${u['firstName']}');
  }

  static void addTechnician(String first, String last, List<String> skills) {
    if (first.trim().isEmpty || last.trim().isEmpty || skills.isEmpty)
      throw StateError('Add name and at least one service.');
    users.add({
      'id': 'demo-t${_n++}',
      'firstName': first.trim(),
      'lastName': last.trim(),
      'email': 'sample${_n}@example.invalid',
      'role': 'technician',
      'available': true,
      'skills': skills,
      'addresses': []
    });
    _record('Added sample technician ${first.trim()}');
  }

  static void saveService(String name, String nameAr, bool popular,
      {String? id}) {
    if (name.trim().isEmpty || nameAr.trim().isEmpty)
      throw StateError('Both service names are required.');
    final item = {
      'id': id ?? 'custom-${_n++}',
      'name': name.trim(),
      'nameAr': nameAr.trim(),
      'popular': popular,
      'order': _services.length
    };
    if (id == null) {
      _services.add(item);
    } else {
      _services[_services.indexWhere((s) => s['id'] == id)] = item;
    }
    _record('Saved service ${name.trim()}');
  }

  static late Map<String, dynamic> me;
  static final List<Map<String, dynamic>> _reqs = [];
  static final List<Map<String, dynamic>> _msgs = [];

  static String _ago(int h) =>
      DateTime.now().subtract(Duration(hours: h)).toUtc().toIso8601String();

  static void _seed() {
    _reqs
      ..clear()
      ..addAll([
        {
          'id': 'd1',
          'customerId': 'demo-c',
          'serviceId': 'ac-maintenance',
          'serviceName': 'AC Maintenance',
          'description': 'AC is not cooling and makes noise',
          'address': 'Nasr City, Cairo',
          'status': 'assigned',
          'technicianId': 'demo-t',
          'technicianName': 'مصطفى علي',
          'createdAt': _ago(5)
        },
        {
          'id': 'd2',
          'customerId': 'demo-c',
          'serviceId': 'finishing-renovation',
          'serviceName': 'Finishing & Renovation',
          'description': 'Repaint two rooms and fix ceiling cracks',
          'address': 'New Cairo, 5th Settlement',
          'status': 'pending',
          'technicianId': null,
          'createdAt': _ago(2)
        },
        {
          'id': 'd3',
          'customerId': 'demo-c',
          'serviceId': 'appliance-maintenance',
          'serviceName': 'Electrical Appliance Maintenance',
          'description': 'Washing machine does not drain',
          'address': 'Maadi, Cairo',
          'status': 'completed',
          'technicianId': 'demo-t',
          'technicianName': 'مصطفى علي',
          'createdAt': _ago(48)
        },
      ]);
    _reqs.addAll([
      {
        'id': 'd4',
        'customerId': 'demo-c',
        'serviceId': 'ac-maintenance',
        'serviceName': 'AC Maintenance',
        'description': 'Seasonal AC cleaning and filter check',
        'address': 'Heliopolis, Cairo',
        'status': 'cancelled',
        'technicianId': null,
        'createdAt': _ago(72)
      },
      {
        'id': 'd5',
        'customerId': 'demo-c',
        'serviceId': 'finishing-renovation',
        'serviceName': 'Finishing & Renovation',
        'description': 'Repair paint around the living room window',
        'address': 'Nasr City, Cairo',
        'status': 'completed',
        'technicianId': 'demo-t',
        'technicianName': 'مصطفى علي',
        'createdAt': _ago(96)
      },
    ]);
    // Illustrative values only. No payment or real booking is performed.
    for (final r in _reqs
        .where((r) => ['assigned', 'completed'].contains(r['status']))) {
      r['inspection'] = {'note': 'Inspection recorded', 'recordedAt': _ago(8)};
      r['quote'] = {
        'amount': 850.0,
        'currency': 'EGP',
        'scope': 'Service work agreed after inspection',
        'version': 1
      };
      r['quoteAccepted'] = {'version': 1, 'customerId': 'demo-c'};
    }
    final awaiting = _reqs.firstWhere((r) => r['id'] == 'd2');
    awaiting['status'] = 'quoted';
    awaiting['inspection'] = {
      'note': 'Rooms inspected and required work recorded'
    };
    awaiting['quote'] = {
      'amount': 6800.0,
      'currency': 'EGP',
      'scope': 'Paint two rooms and repair cracks after inspection',
      'version': 1
    };
    _msgs
      ..clear()
      ..addAll([
        {
          'id': 'm1',
          'requestId': 'd1',
          'senderId': 'demo-t',
          'text': 'Hello, I will visit tomorrow at 11 am.',
          'createdAt': _ago(4)
        },
        {
          'id': 'm2',
          'requestId': 'd1',
          'senderId': 'demo-c',
          'text': 'Thank you, that works.',
          'createdAt': _ago(3)
        },
      ]);
    _msgs.addAll([
      {
        'id': 'm3',
        'requestId': 'd3',
        'senderId': 'demo-t',
        'text':
            'The drain pump was cleaned and tested. Please message the team if you need anything.',
        'createdAt': _ago(47)
      },
      {
        'id': 'm4',
        'requestId': 'd3',
        'senderId': 'demo-c',
        'text': 'The machine is draining normally now, thank you.',
        'createdAt': _ago(46)
      },
      {
        'id': 'm5',
        'requestId': 'd2',
        'senderId': 'demo-admin',
        'text':
            'We received your room-painting request. The team is reviewing technician availability.',
        'createdAt': _ago(1)
      },
    ]);
    const requestArabic = {
      'd1': ['التكييف مش بيبرد وبيعمل صوت', 'مدينة نصر، القاهرة'],
      'd2': [
        'دهان غرفتين ومعالجة شروخ السقف',
        'القاهرة الجديدة، التجمع الخامس'
      ],
      'd3': ['الغسالة مش بتصرف المياه', 'المعادي، القاهرة'],
      'd4': ['تنظيف التكييف وفحص الفلاتر قبل الصيف', 'مصر الجديدة، القاهرة'],
      'd5': ['إصلاح الدهان حول شباك غرفة المعيشة', 'مدينة نصر، القاهرة'],
    };
    for (final r in _reqs) {
      final ar = requestArabic[r['id']];
      if (ar != null) {
        r['descriptionAr'] = ar[0];
        r['addressAr'] = ar[1];
      }
    }
    const messageArabic = {
      'm1': 'أهلا، موعد الزيارة بكرة الساعة ١١ صباحًا. مناسب لحضرتك؟',
      'm2': 'شكرًا، الموعد مناسب.',
      'm3': 'تم تنظيف طلمبة الصرف وتجربتها. ابعت للفريق لو احتجت أي مساعدة.',
      'm4': 'الغسالة بتصرف كويس دلوقتي، شكرًا ليكم.',
      'm5':
          'استلمنا طلب دهان الغرف. الفريق بيراجع مواعيد الفنيين وهنتواصل معاك.',
    };
    for (final m in _msgs) {
      m['textAr'] = messageArabic[m['id']];
    }
  }

  /// Switches the active sample role without resetting shared in-memory jobs.
  static Future<void> begin(String role,
      {String? first, String? last, String? email}) async {
    await _ensure();
    me = users.firstWhere((u) => u['role'] == role);
    if ((first ?? '').trim().isNotEmpty) me['firstName'] = first!.trim();
    if ((last ?? '').trim().isNotEmpty) me['lastName'] = last!.trim();
    if ((email ?? '').trim().isNotEmpty) me['email'] = email!.trim();
    Api.session.token = 'demo-$role';
    Api.session.refresh = null;
    Api.session.user = me;
    final p = await SharedPreferences.getInstance();
    await p.setString('demo_role', role);
    await p.setString('demo_user_id', me['id']);
    await p.setString('token', 'demo-$role');
    await persist();
  }

  /// Log in on a preview build: reopen the role last used to sign up (customer by default).
  static Future<void> beginRemembered(String email) async {
    await begin('customer', email: email);
  }

  static http.Response _bad(String m) => _ok({'error': m}, 400);
  static http.Response _v4(Map<String, dynamic> q, Map body) {
    final role = me['role'];
    final cust = role == 'customer' && q['customerId'] == me['id'];
    final tech = role == 'technician' && q['technicianId'] == me['id'];
    if (!cust && !tech) return _ok({'error': 'Not allowed'}, 403);
    final st = q['status'];
    final a = body['action'];
    String txt(String k, [int max = 500]) {
      final v = (body[k] ?? '').toString().trim();
      return v.length > max ? v.substring(0, max) : v;
    }

    final pay = (q['payment'] as Map?) ?? {};
    if (cust && a == 'rejectQuote') {
      if (st != 'quoted') return _bad('There is no quote to decline.');
      if (txt('reason').length < 3) return _bad('Tell us why (at least 3 characters).');
      q['quoteRejected'] = {'reason': txt('reason'), 'version': (q['quote'] as Map)['version']};
      q['status'] = 'inspection';
      _record('Quote declined ${q['id']}');
    } else if (cust && a == 'cancel') {
      if (!['pending', 'inspection', 'quoted', 'approved', 'assigned'].contains(st))
        return _bad('This request can no longer be cancelled.');
      if (txt('reason').length < 3) return _bad('Choose or write a reason.');
      q['cancelReason'] = txt('reason');
      q['status'] = 'cancelled';
      _record('Request ${q['id']}: cancelled');
    } else if (cust && a == 'pay') {
      if (q['quote'] == null || !['assigned', 'in_progress', 'completed'].contains(st))
        return _bad('Payment opens after the quote is accepted.');
      final m = body['method'];
      if (!['cash', 'wallet'].contains(m)) return _bad('Choose cash or wallet transfer.');
      if (pay['status'] == 'paid' || pay['status'] == 'review')
        return _bad('This payment is already being handled.');
      if (m == 'wallet' && txt('receipt', 400).isEmpty)
        return _bad('Upload the transfer receipt first.');
      q['payment'] = {
        'method': m,
        'status': m == 'cash' ? 'unpaid' : 'pending',
        if (m == 'wallet') 'receipt': txt('receipt', 400),
        'at': DateTime.now().toUtc().toIso8601String()
      };
      _record('Payment ${q['id']}: $m');
    } else if (cust && a == 'rate') {
      if (st != 'completed') return _bad('You can rate after the job is completed.');
      final t = (body['tech'] ?? 0) as num, sv = (body['service'] ?? 0) as num;
      if (t < 1 || t > 5 || sv < 1 || sv > 5) return _bad('Choose 1 to 5 stars.');
      q['rating'] = {'tech': t, 'service': sv, 'note': txt('note')};
    } else if (tech && a == 'accept') {
      if (st != 'assigned') return _bad('This task is not waiting for you.');
      q['techAccepted'] = DateTime.now().toUtc().toIso8601String();
    } else if (tech && a == 'reject') {
      if (st != 'assigned' || q['techAccepted'] != null)
        return _bad('This task cannot be declined now.');
      if (txt('reason').length < 3) return _bad('Tell the team why.');
      q['techDeclined'] = {'by': me['id'], 'reason': txt('reason')};
      q['technicianId'] = null;
      q['technicianName'] = null;
      q['status'] = 'approved';
    } else if (tech && a == 'arrive') {
      if (st != 'assigned' || q['techAccepted'] == null)
        return _bad('Accept the task first.');
      q['arrivedAt'] = DateTime.now().toUtc().toIso8601String();
      q['status'] = 'in_progress';
    } else if (tech && a == 'photo') {
      if (st != 'in_progress' && st != 'completed') return _bad('Start the task first.');
      final k = body['kind'] == 'after' ? 'after' : 'before';
      final photos = Map<String, dynamic>.from((q['photos'] as Map?) ?? {});
      photos[k] = [...((photos[k] as List?) ?? []), txt('path', 400)];
      q['photos'] = photos;
    } else if (tech && a == 'part') {
      if (st != 'in_progress') return _bad('Start the task first.');
      final cost = (body['cost'] ?? 0) as num, n = (body['qty'] ?? 1) as num;
      if (txt('name', 80).isEmpty || cost < 0 || n < 1) return _bad('Name, quantity and cost are required.');
      q['parts'] = [
        ...((q['parts'] as List?) ?? []),
        {'name': txt('name', 80), 'qty': n, 'cost': cost}
      ];
    } else if (tech && a == 'report') {
      if (st != 'in_progress') return _bad('Start the task first.');
      if (txt('text').length < 5) return _bad('Write what was done.');
      q['report'] = {'text': txt('text', 1000), 'hours': body['hours']};
    } else if (tech && a == 'confirmCash') {
      if (pay['method'] != 'cash' || pay['status'] != 'unpaid' || st != 'completed')
        return _bad('There is no cash payment waiting.');
      q['payment'] = {...pay, 'status': 'paid', 'confirmedBy': 'technician'};
    } else {
      return _bad('This action is not allowed.');
    }
    return _ok({'request': q});
  }

  static http.Response _ok(Object o, [int code = 200]) =>
      http.Response(jsonEncode(o), code,
          headers: {'content-type': 'application/json'});

  static List<Map<String, dynamic>> _mine() => _reqs
      .where(
          (r) => r['customerId'] == me['id'] || r['technicianId'] == me['id'])
      .toList();

  static final client = MockClient((r) async {
    final response = await _handle(r);
    if (r.method != 'GET' && response.statusCode < 400) await persist();
    return response;
  });
  static Future<http.Response> _handle(http.Request r) async {
    final p = r.url.path;
    final body = r.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(r.body) as Map<String, dynamic>;
    await _ensure();
    if (me['blocked'] == true)
      return _ok({'error': 'Sample account is blocked by the team'}, 403);
    if (p.startsWith('/auth/'))
      return _ok({'error': 'Demo mode: sign in is disabled'}, 400);
    if (p == '/api/services') return _ok({'services': _services});
    if (p == '/api/me') {
      if (r.method == 'PUT') {
        for (final key in ['firstName', 'lastName']) {
          if (body.containsKey(key) &&
              (body[key] is! String ||
                  (body[key] as String).trim().isEmpty ||
                  body[key].length > 60))
            return _ok({'error': 'Name must contain 1 to 60 characters'}, 400);
        }
        if (body['phone'] != null &&
            (body['phone'] is! String ||
                body['phone'].length > 30 ||
                (body['phone'].toString().isNotEmpty &&
                    !RegExp(r'^[+0-9 ()-]{7,30}$').hasMatch(body['phone']))))
          return _ok({'error': 'Enter a valid phone number'}, 400);
        if (body['bio'] != null &&
            (body['bio'] is! String || body['bio'].length > 300))
          return _ok({'error': 'Bio must be at most 300 characters'}, 400);
        if (body['photo'] != null &&
            (body['photo'] is! String || body['photo'].length > 400))
          return _ok({'error': 'Photo could not be saved'}, 400);
        if (body['area'] != null &&
            (body['area'] is! String || body['area'].length > 100))
          return _ok({'error': 'Area must be at most 100 characters'}, 400);
        if (body['addresses'] != null &&
            (body['addresses'] is! List ||
                body['addresses'].length > 10 ||
                (body['addresses'] as List).any((a) =>
                    a['label'].toString().trim().isEmpty ||
                    a['label'].length > 40 ||
                    a['line'].toString().trim().length < 4 ||
                    a['line'].length > 200)))
          return _ok(
              {'error': 'Each address needs a label and full address (max 10)'},
              400);
        for (final key in [
          'firstName',
          'lastName',
          'phone',
          'area',
          'bio',
          'photo',
          'addresses'
        ]) {
          if (body.containsKey(key)) me[key] = body[key];
        }
      }
      Api.session.user = me;
      return _ok({'user': me});
    }
    if (p == '/api/requests' && r.method == 'GET')
      return _ok({'requests': _mine()});
    if (p == '/api/requests' && r.method == 'POST') {
      if (me['role'] != 'customer')
        return _ok({'error': 'Only customers create requests'}, 403);
      if (body['contactPhone'] != null &&
          (body['contactPhone'] is! String ||
              body['contactPhone'].length > 30 ||
              (body['contactPhone'].toString().trim().isNotEmpty &&
                  !RegExp(r'^[+0-9 ()-]{7,30}$')
                      .hasMatch(body['contactPhone']))))
        return _ok({'error': 'Enter a valid phone number'}, 400);
      final custom = body['custom'] == true;
      if (custom &&
          (body['customTitle'] is! String ||
              body['customTitle'].trim().length < 3 ||
              body['customTitle'].length > 100))
        return _ok(
            {'error': 'Describe the service you need (3 to 100 characters)'},
            400);
      if (!custom && !_services.any((s) => s['id'] == body['serviceId']))
        return _ok({'error': 'Unknown service'}, 400);
      if ((body['description'] ?? '').toString().trim().length < 5 ||
          (body['address'] ?? '').toString().trim().length < 4)
        return _ok({'error': 'Description and full address are required'}, 400);
      final s = custom
          ? {'id': 'custom-unclassified', 'name': body['customTitle'].trim()}
          : _services.firstWhere((x) => x['id'] == body['serviceId']);
      final n = {
        'id': 'd${_n++}',
        'customerId': me['id'],
        'custom': custom,
        'customTitle': custom ? body['customTitle'].trim() : null,
        'contactPhone': body['contactPhone'] ?? me['phone'] ?? '',
        'contactName': '${me['firstName']} ${me['lastName']}',
        'contactEmail': me['email'],
        'serviceId': s['id'],
        'serviceName': s['name'],
        'description': body['description'],
        'address': body['address'],
        'location': body['location'],
        'visit': body['visit'],
        'status': 'pending',
        'technicianId': null,
        'createdAt': DateTime.now().toUtc().toIso8601String()
      };
      _reqs.insert(0, n);
      return _ok({'request': n});
    }
    final v4 = RegExp(r'^/api/requests/([^/]+)/v4$').firstMatch(p);
    if (v4 != null && r.method == 'POST') {
      final q = _reqs.firstWhere((x) => x['id'] == v4.group(1),
          orElse: () => <String, dynamic>{});
      if (q.isEmpty) return _ok({'error': 'Request not found'}, 404);
      return _v4(q, body);
    }
    if (p == '/api/notifications' && r.method == 'GET') {
      const t = {
        'pending': ['Request received', 'استلمنا طلبك'],
        'quoted': ['Your quote is ready. Review and accept it.', 'عرض السعر جاهز. راجعه ووافق عليه.'],
        'assigned': ['A technician was assigned: Mostafa Ali', 'اتعيّن فني: مصطفى علي'],
        'in_progress': ['Work started', 'الشغل بدأ'],
        'completed': ['Work completed. Rate the technician.', 'الشغل خلص. قيّم الفني.'],
        'cancelled': ['Request cancelled', 'الطلب اتلغى']
      };
      final out = <Map<String, dynamic>>[];
      for (final q in _mine()) {
        final e = t[q['status']];
        if (e == null) continue;
        out.add({
          'id': 'n${q['id']}',
          'text': e[0],
          'textAr': e[1],
          'requestId': q['id'],
          'read': out.length > 1,
          'createdAt': q['createdAt'] ?? DateTime.now().toUtc().toIso8601String()
        });
      }
      for (final c in complaints.where((c) => c['customerId'] == me['id'] && '${c['reply'] ?? ''}'.isNotEmpty)) {
        out.insert(0, {
          'id': 'nc${c['id']}',
          'text': 'The team replied to your message',
          'textAr': 'الفريق رد على رسالتك',
          'requestId': c['requestId'],
          'read': false,
          'createdAt': c['updatedAt'] ?? c['createdAt']
        });
      }
      return _ok({'notifications': out, 'unread': out.where((n) => n['read'] != true).length});
    }
    if (p == '/api/notifications/read' && r.method == 'POST') return _ok({'ok': true});
    if (p == '/api/complaints' && r.method == 'GET')
      return _ok({
        'complaints':
            complaints.where((c) => c['customerId'] == me['id']).toList()
      });
    if (p == '/api/complaints' && r.method == 'POST') {
      if (me['role'] != 'customer')
        return _ok({'error': 'Only customers send complaints'}, 403);
      final text = (body['text'] ?? '').toString().trim();
      if (text.length < 5 || text.length > 1000)
        return _ok({'error': 'Describe the problem (5 to 1000 characters)'}, 400);
      final c = {
        'id': 'c${_n++}',
        'customerId': me['id'],
        'requestId': body['requestId'],
        'kind': body['kind'] == 'help' ? 'help' : 'complaint',
        'text': text,
        'status': 'open',
        'createdAt': DateTime.now().toUtc().toIso8601String()
      };
      complaints.insert(0, c);
      _record('Complaint ${c['id']}');
      return _ok({'complaint': c});
    }
    final accept =
        RegExp(r'^/api/requests/([^/]+)/accept-quote$').firstMatch(p);
    if (accept != null) {
      try {
        acceptQuote(accept.group(1)!, body['version'] as int);
        return _ok(
            {'request': _reqs.firstWhere((r) => r['id'] == accept.group(1))});
      } catch (e) {
        return _ok({'error': e.toString()}, 400);
      }
    }
    final st = RegExp(r'^/api/requests/([^/]+)/status$').firstMatch(p);
    if (st != null) {
      final q = _reqs.firstWhere((x) => x['id'] == st.group(1),
          orElse: () => <String, dynamic>{});
      if (q.isEmpty) return _ok({'error': 'Request not found'}, 404);
      final target = body['status'];
      final own = me['role'] == 'customer' && q['customerId'] == me['id'];
      final assigned =
          me['role'] == 'technician' && q['technicianId'] == me['id'];
      final valid = own &&
              target == 'cancelled' &&
              ['pending', 'assigned'].contains(q['status']) ||
          assigned && target == 'in_progress' && q['status'] == 'assigned' ||
          assigned && target == 'completed' && q['status'] == 'in_progress';
      if (assigned && target == 'completed' && q['report'] == null)
        return _ok({'error': 'Add the work report before completing.'}, 400);
      if (!valid)
        return _ok({'error': 'This status change is not allowed'}, 400);
      q['status'] = target;
      _record('Request ${q['id']}: $target');
      return _ok({'request': q});
    }
    final ms = RegExp(r'^/api/requests/([^/]+)/messages$').firstMatch(p);
    if (ms != null) {
      final id = ms.group(1);
      final allowed = _reqs.any((q) =>
          q['id'] == id &&
          (me['role'] == 'admin' ||
              q['customerId'] == me['id'] ||
              q['technicianId'] == me['id']));
      if (!allowed) return _ok({'error': 'Request not found'}, 404);
      if (r.method == 'POST') {
        final m = {
          'id': 'm${_n++}',
          'requestId': id,
          'senderId': me['id'],
          'text': body['text'],
          'createdAt': DateTime.now().toUtc().toIso8601String()
        };
        _msgs.add(m);
        return _ok({'message': m});
      }
      return _ok(
          {'messages': _msgs.where((m) => m['requestId'] == id).toList()});
    }
    if (p == '/api/conversations') {
      final out = <Map<String, dynamic>>[];
      for (final q in _mine()) {
        final m = _msgs.where((x) => x['requestId'] == q['id']).toList();
        if (m.isNotEmpty) out.add({'request': q, 'last': m.last});
      }
      return _ok({'conversations': out});
    }
    if (p == '/api/tech/availability') {
      if (me['role'] != 'technician')
        return _ok({'error': 'Only technicians set availability'}, 403);
      me['available'] = body['available'] == true;
      Api.session.user = me;
      return _ok({'user': me});
    }
    return _ok({'error': 'Not available in the demo'}, 404);
  }
}
