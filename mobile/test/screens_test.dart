import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:sallehli/lang.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sallehli/api.dart';
import 'package:sallehli/screens/auth.dart';
import 'package:sallehli/screens/home.dart';
import 'package:sallehli/screens/intro.dart';
import 'package:sallehli/theme.dart';

Future<void> loadFonts() async {
  final root = Platform.environment['FLUTTER_ROOT'] ??
      '${Platform.environment['HOME']}/dev/flutter';
  final iconFile = File(
      '$root/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf');
  if (iconFile.existsSync()) {
    final mi = FontLoader('MaterialIcons')
      ..addFont(Future.value(ByteData.view(iconFile.readAsBytesSync().buffer)));
    await mi.load();
  }
  for (final (fam, files) in [
    (
      'Poppins',
      ['Poppins-Regular', 'Poppins-Medium', 'Poppins-SemiBold', 'Poppins-Bold']
    ),
    ('Inter', ['Inter']),
    ('Montserrat', ['Montserrat']),
    ('NotoKufi', ['NotoKufi-Regular', 'NotoKufi-Medium', 'NotoKufi-Bold'])
  ]) {
    final l = FontLoader(fam);
    for (final f in files) {
      l.addFont(Future.value(
          ByteData.view(File('assets/fonts/$f.ttf').readAsBytesSync().buffer)));
    }
    await l.load();
  }
}

final services = [
  for (final (i, s) in [
    ('finishing-renovation', 'Finishing & Renovation'),
    ('ac-maintenance', 'AC Maintenance'),
    ('appliance-maintenance', 'Electrical Appliance Maintenance')
  ].indexed)
    {'id': s.$1, 'name': s.$2, 'nameAr': '', 'popular': true, 'order': i}
];

Future<void> shot(WidgetTester t, GlobalKey k, String name) async {
  await t.runAsync(() async {
    final b = k.currentContext!.findRenderObject() as RenderRepaintBoundary;
    final img = await b.toImage(pixelRatio: 2);
    final bd = await img.toByteData(format: ui.ImageByteFormat.png);
    Directory('shots').createSync();
    File('shots/$name.png').writeAsBytesSync(bd!.buffer.asUint8List());
  });
}

void main() {
  setUpAll(loadFonts);
  Api.client = MockClient((r) async {
    final p = r.url.path;
    if (p == '/api/services')
      return http.Response(jsonEncode({'services': services}), 200);
    if (p == '/api/requests')
      return http.Response(
          jsonEncode({
            'requests': [
              {
                'id': 'r1',
                'serviceId': 'ac-maintenance',
                'serviceName': 'AC Maintenance',
                'description': 'AC is not cooling',
                'address': 'Nasr City, Cairo',
                'status': 'assigned',
                'technicianId': 'p',
                'customerId': 'u1'
              }
            ]
          }),
          200);
    return http.Response('{}', 200);
  });
  Api.session.token = 't';
  Api.session.user = {
    'id': 'u1',
    'firstName': 'Hasnaa',
    'email': 'hasnaa@example.com',
    'role': 'customer',
    'addresses': []
  };

  Future<void> render(WidgetTester t, Widget w, String name) async {
    t.view.physicalSize = const Size(780, 1600);
    t.view.devicePixelRatio = 2;
    final k = GlobalKey();
    await t.pumpWidget(RepaintBoundary(
        key: k,
        child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: buildTheme(),
            locale: Locale(Lang.code.value),
            supportedLocales: const [Locale('en'), Locale('ar')],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate
            ],
            home: w)));
    await t.runAsync(() async {
      for (final n in [
        'finishing-renovation',
        'ac-maintenance',
        'appliance-maintenance'
      ]) {
        await precacheImage(AssetImage('assets/img/svc_$n.jpg'),
            t.element(find.byType(MaterialApp)));
      }
      await Future.delayed(const Duration(milliseconds: 400));
    });
    await t.pump(const Duration(milliseconds: 300));
    await t.pump(const Duration(milliseconds: 300));
    expect(t.takeException(), isNull);
    await shot(t, k, name);
  }

  testWidgets('technician jobs', (t) async {
    final old = Api.session.user;
    Api.session.user = {
      'id': 'p',
      'firstName': 'Mostafa',
      'email': 'tech@example.com',
      'role': 'technician',
      'available': true,
      'addresses': []
    };
    await render(t, const ProjectsTab(), '07_tech_jobs');
    Api.session.user = old;
  });
  testWidgets('arabic', (t) async {
    Lang.code.value = 'ar';
    await render(t, const StartScreen(), 'ar_start');
    await render(t, const HomeShell(), 'ar_explore');
    await render(t, const RoleScreen(), 'ar_role');
    Lang.code.value = 'en';
  });
  testWidgets('welcome', (t) => render(t, const StartScreen(), '01_start'));
  testWidgets('role', (t) => render(t, const RoleScreen(), '01b_role'));
  testWidgets(
      'location', (t) => render(t, const LocationScreen(), '01c_location'));
  testWidgets(
      'offline',
      (t) => render(
          t,
          Scaffold(
              body: Column(children: [
            Container(height: 160, color: kTeal),
            Expanded(child: OfflineView(onRetry: () {}))
          ])),
          '05b_offline'));
  testWidgets('signup empty',
      (t) => render(t, const SignupScreen(role: 'customer'), '02_signup'));
  testWidgets('signup weak', (t) async {
    await render(t, const SignupScreen(role: 'customer'), 'tmp');
    await t.enterText(find.byType(TextField).at(0), 'Hasnaa');
    await t.enterText(find.byType(TextField).at(2), 'hasnaa@example.com');
    await t.enterText(find.byType(TextField).at(3), 'abc');
    await t.pump();
    await render(t, const SignupScreen(role: 'customer'), 'tmp2');
  });
  testWidgets('login', (t) => render(t, const LoginScreen(), '03_login'));
  testWidgets('forgot', (t) => render(t, const ForgotScreen(), '04_forgot'));
  testWidgets('explore', (t) async {
    await render(t, const HomeShell(), '05_explore');
  });
  testWidgets('search',
      (t) => render(t, SearchScreen(services: services), '06_search'));
  testWidgets('projects', (t) async {
    await render(t, const HomeShell(), 'tmp3');
    await t.tap(find.text(tr('Projects')));
    await t.pump(const Duration(milliseconds: 400));
    await render(t, const ProjectsTab(), '07_projects');
  });
  testWidgets('more', (t) => render(t, const MoreTab(), '08_more'));
}
