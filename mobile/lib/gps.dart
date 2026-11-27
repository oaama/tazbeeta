import 'dart:async';
import 'package:geolocator/geolocator.dart';

/// Best GPS fix within [wait]. A single quick fix is often a coarse network
/// or cached one (hundreds of meters off, wrong neighbourhood). We listen to
/// the live stream at the best accuracy and keep the most accurate sample,
/// stopping early once it is good enough.
class Gps {
  static Future<Position> bestFix(
      {Duration wait = const Duration(seconds: 12), double goodEnough = 25}) async {
    Position? best;
    final done = Completer<void>();
    late StreamSubscription<Position> sub;
    final timer = Timer(wait, () {
      if (!done.isCompleted) done.complete();
    });
    sub = Geolocator.getPositionStream(
            locationSettings: const LocationSettings(
                accuracy: LocationAccuracy.best, distanceFilter: 0))
        .listen((p) {
      // ignore fixes older than 20 s (cached)
      if (DateTime.now().difference(p.timestamp).inSeconds > 20) return;
      if (best == null || p.accuracy < best!.accuracy) best = p;
      if (best!.accuracy <= goodEnough && !done.isCompleted) done.complete();
    }, onError: (e) {
      if (!done.isCompleted) done.completeError(e);
    });
    try {
      await done.future;
    } finally {
      timer.cancel();
      await sub.cancel();
    }
    if (best != null) return best!;
    return Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 6)));
  }
}
