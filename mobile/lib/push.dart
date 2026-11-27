import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'api.dart';

/// Push notifications (FCM). Every call is best effort: if Firebase is not
/// configured or permission is denied the app keeps working normally.
class Push {
  static bool _ready = false;
  static String? _sent;

  static Future<void> init() async {
    try {
      await Firebase.initializeApp();
      _ready = true;
      FirebaseMessaging.instance.onTokenRefresh.listen((_) => register());
    } catch (_) {
      _ready = false;
    }
  }

  static Future<void> register() async {
    if (!_ready || Api.session.token == null) return;
    try {
      await FirebaseMessaging.instance.requestPermission();
      final t = await FirebaseMessaging.instance.getToken();
      if (t == null || t == _sent) return;
      await Api.registerDevice(t);
      _sent = t;
    } catch (_) {}
  }
}
