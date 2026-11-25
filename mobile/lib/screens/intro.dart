import 'package:flutter/material.dart' hide Text;
import '../lang.dart';
import 'package:geolocator/geolocator.dart';
import '../api.dart';
import '../config.dart';
import '../theme.dart';
import '../widgets.dart';
import 'auth.dart';
import 'home.dart';

const _navy = Color(0xFF0A5A5E);

/// Static welcome screen. Brand animation belongs to the separate splash only.
class StartScreen extends StatelessWidget {
  const StartScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.of(context).size.height;
    final w = MediaQuery.of(context).size.width;
    // Scale type and spacing with the screen so short and tall phones keep the same proportions.
    final headline = (w * .085).clamp(28.0, 36.0);
    return Scaffold(
      body: SafeArea(
        child: Column(children: [
          const Align(
              alignment: AlignmentDirectional.centerEnd,
              child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: LangSwitch())),
          Expanded(
            child: Center(
              child: SingleChildScrollView(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Text('WE CAN FIX IT',
                      style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 15.5,
                          fontWeight: FontWeight.w600,
                          letterSpacing: .4,
                          color: _navy)),
                  SizedBox(height: h * .02),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Text('Tech repair\nservice',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: headline,
                            height: 1.3,
                            fontWeight: FontWeight.w600,
                            color: _navy)),
                  ),
                  SizedBox(height: h * .02),
                  const Text('GIVE US A CALL',
                      style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: _navy)),
                  SizedBox(height: h * .035),
                  ShaderMask(
                    blendMode: BlendMode.dstIn,
                    shaderCallback: (r) => const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.black, Colors.black, Colors.transparent],
                      stops: [0, .85, 1],
                    ).createShader(r),
                    child: Image.asset('assets/img/welcome.jpg',
                        key: const ValueKey('start-static-illustration'),
                        width: double.infinity,
                        fit: BoxFit.fitWidth),
                  ),
                ]),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(
              height: 52,
              width: double.infinity,
              child: Material(
                color: kTeal,
                borderRadius: BorderRadius.circular(8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const RoleScreen())),
                  child: const Center(
                      child: Text('Start',
                          style: TextStyle(
                              fontFamily: 'Poppins',
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                              color: Colors.white))),
                ),
              ),
            ),
          ),
          SizedBox(height: h * .05),
        ]),
      ),
    );
  }
}

/// 2. "Select a Role" with two grey cards and "Skip and Start".
class RoleScreen extends StatelessWidget {
  const RoleScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Welcome to Tazbeeta')),
      body: SafeArea(
          child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Spacer(),
                    Image.asset('assets/img/wordmark-ar.png',
                        width: 150, height: 100, fit: BoxFit.contain),
                    const SizedBox(height: 24),
                    const Text('Your home, our responsibility',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 22, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 14),
                    const Text(
                        'Request a service. Our company inspects, sends a quote, and assigns the team after you accept.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 14, color: kMuted, height: 1.7)),
                    const SizedBox(height: 28),
                    PrimaryButton('Create customer account',
                        onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) =>
                                    const SignupScreen(role: 'customer')))),
                    TextButton(
                        onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const LoginScreen())),
                        child: const Text('Customer login')),
                    const Spacer(),
                    const Divider(),
                    TextButton.icon(
                        onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const LoginScreen(team: true))),
                        icon: const Icon(Icons.badge_outlined, size: 19),
                        label: const Text('Team login')),
                    const Text(
                        'Team accounts are created by company management.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: kMuted)),
                    const SizedBox(height: 16)
                  ]))));
}

/// 3. "Allow location access?" Uses the real OS permission; the position is saved as an address note only.
class LocationScreen extends StatefulWidget {
  const LocationScreen({super.key});
  @override
  State<LocationScreen> createState() => _LocationState();
}

class _LocationState extends State<LocationScreen> {
  bool busy = false;
  String? note;
  void next() => Navigator.pushAndRemoveUntil(context,
      MaterialPageRoute(builder: (_) => const HomeShell()), (_) => false);

  Future<void> allow() async {
    if (demoMode) {
      await Api.saveAddresses([
        {'label': 'Sample address', 'line': 'Nasr City, Cairo'}
      ]);
      if (mounted) next();
      return;
    }
    setState(() {
      busy = true;
      note = null;
    });
    try {
      var p = await Geolocator.checkPermission();
      if (p == LocationPermission.denied)
        p = await Geolocator.requestPermission();
      if (p == LocationPermission.denied ||
          p == LocationPermission.deniedForever) {
        setState(() {
          busy = false;
          note = 'Location access was not allowed. You can skip this step.';
        });
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.low,
              timeLimit: Duration(seconds: 15)));
      await Api.saveAddresses([
        {
          'label': 'Current location',
          'line':
              '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}'
        }
      ]);
      if (mounted) next();
    } catch (_) {
      if (mounted)
        setState(() {
          busy = false;
          note = 'Could not get your location. You can skip this step.';
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.of(context).size.height;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(children: [
            SizedBox(height: h * .2),
            Image.asset('assets/img/location.jpg',
                width: double.infinity, height: h * .31, fit: BoxFit.contain),
            const SizedBox(height: 10),
            const Text('Allow location access?',
                style: TextStyle(
                    fontFamily: 'Poppins',
                    fontWeight: FontWeight.w700,
                    fontSize: 22,
                    color: kInk)),
            const SizedBox(height: 14),
            const Text(
                'We need your location access to easily find our\nservices around you.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 13.5,
                    height: 1.5,
                    color: kMuted)),
            const SizedBox(height: 26),
            SizedBox(
              height: 50,
              width: double.infinity,
              child: Material(
                color: kTeal,
                borderRadius: BorderRadius.circular(6),
                child: InkWell(
                  borderRadius: BorderRadius.circular(6),
                  onTap: busy ? null : allow,
                  child: Center(
                      child: busy
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('Allow location access',
                              style: TextStyle(
                                  fontFamily: 'Poppins',
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13.5,
                                  color: Colors.white))),
                ),
              ),
            ),
            if (note != null)
              Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(note!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: kError, fontSize: 13))),
            const SizedBox(height: 22),
            GestureDetector(
                onTap: next,
                child: const Text('Skip this step',
                    style: TextStyle(
                        fontFamily: 'Poppins',
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: kInk,
                        decoration: TextDecoration.underline))),
          ]),
        ),
      ),
    );
  }
}

/// Offline / load-failure state used inside the Explore tab.
class OfflineView extends StatelessWidget {
  final VoidCallback onRetry;
  const OfflineView({super.key, required this.onRetry});
  static const bg = Color(0xFFE6F4F3);
  @override
  Widget build(BuildContext context) => Column(children: [
        Image.asset('assets/img/offline.jpg',
            width: double.infinity, fit: BoxFit.fitWidth),
        Expanded(
          child: Container(
            width: double.infinity,
            color: bg,
            child: Column(children: [
              const Text('YOUR INTERNET IS NOT AVAILABLE',
                  style: TextStyle(
                      fontFamily: 'Poppins',
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: Color(0xFF3B4756))),
              const SizedBox(height: 10),
              const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 36),
                  child: Text(
                      'Try switching to a different connection or reset your internet to find a professional.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 13,
                          height: 1.45,
                          color: Color(0xFF6B7684)))),
              const SizedBox(height: 22),
              SizedBox(
                width: 120,
                height: 40,
                child: Material(
                    color: kTeal,
                    borderRadius: BorderRadius.circular(4),
                    child: InkWell(
                        onTap: onRetry,
                        child: const Center(
                            child: Text('RETRY',
                                style: TextStyle(
                                    fontFamily: 'Poppins',
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                    color: Colors.white))))),
              ),
            ]),
          ),
        ),
      ]);
}
