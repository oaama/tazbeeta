import 'package:flutter/material.dart' hide Text;
import 'package:flutter_localizations/flutter_localizations.dart';
import 'api.dart';
import 'config.dart';
import 'lang.dart';
import 'screens/onboarding.dart';
import 'screens/splash.dart';
import 'screens/home.dart';
import 'theme.dart';
import 'screens/v4.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.restore();
  await Lang.restore();
  await Onboarding.restore();
  runApp(const SallehliApp());
}

final navKey = GlobalKey<NavigatorState>();

class SallehliApp extends StatelessWidget {
  const SallehliApp({super.key});
  @override
  Widget build(BuildContext context) => ValueListenableBuilder<String>(
        valueListenable: Lang.code,
        builder: (_, code, __) => MaterialApp(
          title: 'Tazbeeta',
          debugShowCheckedModeBanner: false,
          theme: buildTheme(),
          locale: Locale(code),
          supportedLocales: const [Locale('en'), Locale('ar')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate
          ],
          navigatorKey: navKey,
          onGenerateRoute: (st) {
            if (st.name == '/reorder') {
              final a = st.arguments as Map;
              return MaterialPageRoute(
                  builder: (_) => NewRequestScreen(
                      service: a['service'] as Map, prefill: a['request'] as Map));
            }
            if (st.name == '/chat') {
              return MaterialPageRoute(
                  builder: (_) => ChatScreen(request: st.arguments as Map));
            }
            return null;
          },
          builder: (ctx, child) => ValueListenableBuilder<bool>(
              valueListenable: Api.expired,
              builder: (_, e, __) => e
                  ? SessionExpiredView(onSignIn: () async {
                      await Api.logout();
                      Api.expired.value = false;
                      navKey.currentState?.pushAndRemoveUntil(
                          MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                          (_) => false);
                    })
                  : child!),
          home: BrandSplash(
              child: (!demoMode && !apiConfigured)
                  ? const _ConfigError()
                  : Api.session.loggedIn
                      ? const HomeShell()
                      : const OnboardingScreen()),
        ),
      );
}

/// Shown when a non-demo build has no server address. Better a clear stop than silently calling an emulator address.
class _ConfigError extends StatelessWidget {
  const _ConfigError();
  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
                'This build has no server address configured.\nInstall the demo build or a configured release.',
                textAlign: TextAlign.center),
          ),
        ),
      );
}
