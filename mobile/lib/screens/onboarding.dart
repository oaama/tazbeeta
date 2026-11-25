import 'package:flutter/material.dart' hide Text;
import 'package:shared_preferences/shared_preferences.dart';
import '../lang.dart';
import '../theme.dart';
import '../widgets.dart';
import 'intro.dart';

/// Whether the three-page introduction has been seen. Defaults to true so only the real app entry
/// (see [Onboarding.restore] in main) shows it; the saved flag keeps it to the first launch.
class Onboarding {
  static bool seen = true;
  static Future<void> restore() async {
    final p = await SharedPreferences.getInstance();
    seen = p.getBool('onboarded') ?? false;
  }

  static Future<void> markSeen() async {
    seen = true;
    final p = await SharedPreferences.getInstance();
    await p.setBool('onboarded', true);
  }
}

class _Page {
  final IconData icon;
  final String title;
  final String body;
  const _Page(this.icon, this.title, this.body);
}

const _pages = [
  _Page(Icons.home_repair_service, 'Pick the service you need',
      'Browse the company services. Cannot find yours? Describe it and our team will follow up.'),
  _Page(Icons.fact_check_outlined, 'We inspect, then send a quote',
      'The team checks the job first and sends a clear quote. Nothing starts until you accept it.'),
  _Page(Icons.forum_outlined, 'Follow every step',
      'Track your request stage by stage and chat with the team from the app.'),
];

/// Three short instruction pages shown once after the splash, before the welcome and login screens.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingState();
}

class _OnboardingState extends State<OnboardingScreen> {
  final controller = PageController();
  int index = 0;
  bool get last => index == _pages.length - 1;

  Future<void> finish() async {
    await Onboarding.markSeen();
    if (!mounted) return;
    Navigator.pushReplacement(
        context, MaterialPageRoute(builder: (_) => const StartScreen()));
  }

  void next() {
    if (last) {
      finish();
    } else {
      controller.nextPage(
          duration: const Duration(milliseconds: 280), curve: Curves.easeOut);
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Localizations.localeOf(context);
    final h = MediaQuery.of(context).size.height;
    return Scaffold(
      body: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(children: [
              const LangSwitch(),
              const Spacer(),
              AnimatedOpacity(
                opacity: last ? 0 : 1,
                duration: const Duration(milliseconds: 150),
                child: TextButton(
                    key: const ValueKey('onboarding-skip'),
                    onPressed: last ? null : finish,
                    child: const Text('Skip',
                        style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: kMuted))),
              ),
            ]),
          ),
          Expanded(
            child: PageView.builder(
              key: const ValueKey('onboarding-pages'),
              controller: controller,
              itemCount: _pages.length,
              onPageChanged: (i) => setState(() => index = i),
              itemBuilder: (_, i) {
                final p = _pages[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  child: Column(children: [
                    const Spacer(flex: 2),
                    _Art(icon: p.icon, size: (h * .27).clamp(150.0, 240.0)),
                    const Spacer(),
                    Text(p.title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 24,
                            height: 1.3,
                            fontWeight: FontWeight.w700,
                            color: kTeal)),
                    const SizedBox(height: 14),
                    Text(p.body,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 15,
                            height: 1.7,
                            color: kMuted)),
                    const Spacer(flex: 2),
                  ]),
                );
              },
            ),
          ),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var i = 0; i < _pages.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: i == index ? 24 : 8,
                height: 8,
                decoration: BoxDecoration(
                    color: i == index ? kTeal : kBorder,
                    borderRadius: BorderRadius.circular(4)),
              ),
          ]),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: PrimaryButton(last ? 'Get started' : 'Next', onTap: next),
          ),
          SizedBox(height: h * .05),
        ]),
      ),
    );
  }
}

class _Art extends StatelessWidget {
  final IconData icon;
  final double size;
  const _Art({required this.icon, required this.size});
  @override
  Widget build(BuildContext context) => SizedBox(
        width: size,
        height: size,
        child: Stack(alignment: Alignment.center, children: [
          Container(
              decoration:
                  const BoxDecoration(color: kMist, shape: BoxShape.circle)),
          Container(
              width: size * .68,
              height: size * .68,
              decoration: const BoxDecoration(
                  color: Colors.white, shape: BoxShape.circle),
              child: Icon(icon, size: size * .34, color: kTeal)),
          PositionedDirectional(
              top: size * .08,
              end: size * .1,
              child: Container(
                  width: size * .13,
                  height: size * .13,
                  decoration: const BoxDecoration(
                      color: kAmber, shape: BoxShape.circle))),
        ]),
      );
}
