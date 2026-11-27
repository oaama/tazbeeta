import 'dart:io';
import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'push.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';
import 'demo.dart';

class ApiError implements Exception {
  final String message;
  final int code;
  ApiError(this.message, this.code);
  @override
  String toString() => message;
}

class Session {
  String? token;
  String? refresh;
  Map<String, dynamic>? user;
  bool get loggedIn => token != null && user != null;
  String get firstName => (user?['firstName'] ?? '') as String;
  String get email => (user?['email'] ?? '') as String;
  String get role => (user?['role'] ?? 'customer') as String;
}

class Api {
  static final session = Session();
  static http.Client client = demoMode ? DemoBackend.client : http.Client();

  static Future<void> restore() async {
    if (demoMode) {
      await DemoBackend.restoreSession();
      return;
    }
    final p = await SharedPreferences.getInstance();
    final t = p.getString('token');
    if (t == null) return;
    session.token = t;
    session.refresh = p.getString('refresh');
    try {
      final r = await _call('GET', '/api/me');
      session.user = r['user'] as Map<String, dynamic>;
    } on ApiError catch (e) {
      if (e.code == 401 && await _refresh()) {
        try {
          final r = await _call('GET', '/api/me');
          session.user = r['user'] as Map<String, dynamic>;
          await _save();
          return;
        } catch (_) {}
      }
      if (e.code == 401) await logout();
    } catch (_) {
      final u = p.getString('user');
      if (u != null) session.user = jsonDecode(u) as Map<String, dynamic>;
    }
  }

  static Future<void> _save() async {
    if (demoMode) {
      await DemoBackend.persist();
      return;
    }
    final p = await SharedPreferences.getInstance();
    await p.setString('token', session.token!);
    if (session.refresh != null) await p.setString('refresh', session.refresh!);
    await p.setString('user', jsonEncode(session.user));
    Push.register();
  }

  static Future<void> logout() async {
    session.token = null;
    session.user = null;
    final p = await SharedPreferences.getInstance();
    await p.remove('token');
    await p.remove('refresh');
    session.refresh = null;
    await p.remove('user');
  }

  static final ValueNotifier<bool> expired = ValueNotifier(false);
  static Future<Map<String, dynamic>> _call(String m, String path,
      [Map<String, dynamic>? body]) async {
    if (!demoMode && !apiConfigured)
      throw ApiError('This build has no server address configured.', 0);
    final uri = Uri.parse('${demoMode ? 'http://demo.invalid' : apiBase}$path');
    final h = {
      'content-type': 'application/json',
      if (session.token != null) 'authorization': 'Bearer ${session.token}'
    };
    http.Response r;
    try {
      final enc = body == null ? null : jsonEncode(body);
      final fut = switch (m) {
        'GET' => client.get(uri, headers: h),
        'PUT' => client.put(uri, headers: h, body: enc),
        _ => client.post(uri, headers: h, body: enc),
      };
      r = await fut.timeout(const Duration(seconds: 20));
    } catch (_) {
      throw ApiError('No connection. Check your internet and try again.', 0);
    }
    final j = r.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(r.body) as Map<String, dynamic>;
    if (r.statusCode == 401 &&
        session.token != null &&
        !path.startsWith('/api/auth')) expired.value = true;
    if (r.statusCode >= 400)
      throw ApiError(
          (j['error'] ?? 'Something went wrong') as String, r.statusCode);
    return j;
  }

  static Future<bool> _refresh() async {
    return false;
  }

  static Future<void> _finish(Map<String, dynamic> j) async {
    session.token = j['access_token'] as String;
    session.refresh = j['refresh_token'] as String?;
    final r = await _call('GET', '/api/me');
    session.user = r['user'] as Map<String, dynamic>;
    await _save();
  }

  /// Supabase sign-up. With "Confirm email" on, no session is returned until the address is confirmed.
  /// Returns true when signed in, false when email confirmation is still required.
  static Future<bool> register(Map<String, dynamic> b) async {
    if (b['role'] != null && b['role'] != 'customer')
      throw ApiError('Team accounts are created by company management.', 403);
    if (demoMode) {
      await DemoBackend.begin('customer',
          first: b['firstName'] as String?,
          last: b['lastName'] as String?,
          email: b['email'] as String?);
      return true;
    }
    final j = await _call('POST', '/api/auth/signup', {
      'email': b['email'],
      'password': b['password'],
      'firstName': b['firstName'],
      'lastName': b['lastName'],
      'phone': b['phone'],
      'verify': true,
    });
    if (j['needsVerification'] == true) return false;
    await _finish({'access_token': j['token']});
    return true;
  }

  /// Confirms the 6-digit code emailed at sign-up and signs the user in.
  static Future<void> verifyEmail(String email, String code) async {
    final j = await _call(
        'POST', '/api/auth/verify-email', {'email': email, 'code': code});
    await _finish({'access_token': j['token']});
  }

  static Future<void> resendCode(String email) async {
    await _call('POST', '/api/auth/resend-code', {'email': email});
  }

  static Future<void> login(String email, String pw) async {
    if (demoMode) {
      await DemoBackend.beginRemembered(email);
      return;
    }
    final j = await _call(
        'POST', '/api/auth/login', {'email': email, 'password': pw});
    await _finish({'access_token': j['token']});
  }

  static Future<bool> forgot(String email) async {
    if (demoMode) return true;
    await _call('POST', '/api/auth/forgot', {'email': email});
    return true;
  }

  static Future<Map<String, dynamic>> dashboard(String method, String path,
          [Map<String, dynamic>? body]) =>
      _call(method, path, body);
  static Future<Map<String, dynamic>> appContent() async {
    if (demoMode)
      return {
        'announcement': DemoBackend.announcement,
        'cashEnabled': DemoBackend.cashEnabled,
        'payNumber': DemoBackend.payNumber,
        'payName': DemoBackend.payName,
        'help': DemoBackend.help
      };
    return Map<String, dynamic>.from(
        (await _call('GET', '/api/content'))['content']);
  }

  /// Uploads one photo (request, before, after or receipt) to the company server.
  static Future<void> uploadPhoto(String id, String kind, String path) async {
    if (demoMode) return;
    final bytes = await File(path).readAsBytes();
    final mime = path.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
    await _call('POST', '/api/requests/$id/photos',
        {'kind': kind, 'data': 'data:image/$mime;base64,${base64Encode(bytes)}'});
  }

  static Future<List<dynamic>> photos(String id) async => demoMode
      ? <dynamic>[]
      : ((await _call('GET', '/api/requests/$id/photos'))['photos'] as List);

  static Future<void> submitFeedback(int stars, String note) async {
    if (demoMode) {
      DemoBackend.submitFeedback(stars, note);
      return;
    }
    await _call('POST', '/api/feedback', {'stars': stars, 'note': note});
  }

  static Future<List<dynamic>> notifications() async =>
      (await _call('GET', '/api/notifications'))['notifications'] as List;

  static Future<void> markNotificationsRead() async {
    await _call('POST', '/api/notifications/read', {});
  }

  static Future<List<dynamic>> services() async =>
      (await _call('GET', '/api/services'))['services'] as List;
  /// Admin-managed lists: positions (what technicians work in) and areas (where). Empty when the server has none.
  static Future<List<dynamic>> tags() async {
    try {
      return (await _call('GET', '/api/tags'))['tags'] as List;
    } catch (_) {
      return <dynamic>[];
    }
  }

  static Future<List<dynamic>> placesSearch(String q) async {
    try {
      return (await _call('GET', '/api/places/search?q=${Uri.encodeQueryComponent(q)}'))['places'] as List;
    } catch (_) {
      return <dynamic>[];
    }
  }

  static Future<Map<String, dynamic>?> placesReverse(double lat, double lon) async {
    try {
      return Map<String, dynamic>.from(
          await _call('GET', '/api/places/reverse?lat=$lat&lon=$lon') as Map);
    } catch (_) {
      return null;
    }
  }

  static Future<List<dynamic>> requests() async =>
      (await _call('GET', '/api/requests'))['requests'] as List;
  static Future<void> createRequest(Map<String, dynamic> b) async =>
      _call('POST', '/api/requests', b);
  static Future<void> acceptQuote(String id, int version) async {
    await _call('POST', '/api/requests/$id/accept-quote', {'version': version});
  }

  /// Offline-preview request actions (booking, payment, photos, reports). Live server support arrives with the backend step.
  static Future<Map<String, dynamic>> action(
      String id, Map<String, dynamic> body) async {
    if (!demoMode)
      throw ApiError('This feature is not available on the server yet.', 501);
    return (await _call('POST', '/api/requests/$id/v4', body))['request']
        as Map<String, dynamic>;
  }

  static Future<List<dynamic>> complaints() async => demoMode
      ? (await _call('GET', '/api/complaints'))['complaints'] as List
      : <dynamic>[];
  static Future<void> sendComplaint(Map<String, dynamic> b) async {
    if (!demoMode)
      throw ApiError('This feature is not available on the server yet.', 501);
    await _call('POST', '/api/complaints', b);
  }

  static Future<void> setStatus(String id, String s) async =>
      _call('POST', '/api/requests/$id/status', {'status': s});
  static Future<void> setAvailability(bool available,
      {double? lat, double? lon}) async {
    final j = await _call('PUT', '/api/tech/availability', {
      'available': available,
      if (lat != null && lon != null) 'location': {'lat': lat, 'lon': lon}
    });
    session.user = j['user'] as Map<String, dynamic>;
    await _save();
  }

  static Future<void> deleteAccount(String password) async =>
      _call('POST', '/api/me/delete', {'password': password});
  static Future<void> registerDevice(String token) async =>
      _call('POST', '/api/devices', {'token': token});
  static Future<List<dynamic>> conversations() async =>
      (await _call('GET', '/api/conversations'))['conversations'] as List;
  static Future<List<dynamic>> messages(String id) async =>
      (await _call('GET', '/api/requests/$id/messages'))['messages'] as List;
  static Future<void> send(String id, String text) async =>
      _call('POST', '/api/requests/$id/messages', {'text': text});
  static Future<void> saveProfile(Map<String, dynamic> fields) async {
    final j = await _call('PUT', '/api/me', fields);
    session.user = j['user'] as Map<String, dynamic>;
    await _save();
  }

  static Future<void> saveAddresses(List<Map<String, String>> a) async {
    final j = await _call('PUT', '/api/me', {'addresses': a});
    session.user = j['user'] as Map<String, dynamic>;
    await _save();
  }
}
