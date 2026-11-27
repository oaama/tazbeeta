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
import 'package:sallehli/screens/details.dart';
import 'package:sallehli/screens/v4.dart';


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


Future<void> shot(WidgetTester t, GlobalKey k, String name) async {
  await t.runAsync(() async {
    final b = k.currentContext!.findRenderObject() as RenderRepaintBoundary;
    final img = await b.toImage(pixelRatio: 2);
    final bd = await img.toByteData(format: ui.ImageByteFormat.png);
    Directory('shots_ops').createSync();
    File('shots_ops/$name.png').writeAsBytesSync(bd!.buffer.asUint8List());
  });
}

final services = [
  {'id': 'ac-maintenance', 'name': 'AC Maintenance', 'nameAr': 'صيانة التكييف', 'popular': true, 'order': 0, 'startingPrice': 350},
];
final req = {
  'id': 'abc123def456',
  'serviceId': 'ac-maintenance',
  'serviceName': 'AC Maintenance',
  'description': 'AC is not cooling',
  'address': 'Nasr City, Cairo',
  'status': 'assigned',
  'technicianId': 'p',
  'customerId': 'u1',
  'technicianName': 'Mostafa Ali',
  'technician': {'name': 'Mostafa Ali', 'rating': 4.8, 'jobs': 12},
  'techAccepted': '2026-11-27T10:00:00Z',
  'onTheWay': '2026-11-27T10:20:00Z',
  'createdAt': '2026-11-27T09:00:00Z',
  'quote': {'amount': 700, 'currency': 'EGP', 'scope': 'Refill gas', 'version': 1},
  'quoteAccepted': {'version': 1},
  'warrantyDays': 30,
};
final done = {
  ...req,
  'status': 'completed',
  'completedAt': '2026-11-27T12:00:00Z',
  'warrantyUntil': '2026-12-27T12:00:00Z',
  'payment': {'method': 'cash', 'status': 'paid'},
};

void main() {
  setUpAll(loadFonts);
  Api.client = MockClient((r) async {
    final p = r.url.path;
    if (p == '/api/services') return http.Response(jsonEncode({'services': services}), 200);
    if (p == '/api/requests') return http.Response(jsonEncode({'requests': [req]}), 200);
    if (p == '/api/content') return http.Response(jsonEncode({'content': {'whatsapp': '201202422997', 'cashEnabled': true, 'help': []}}), 200);
    return http.Response('{}', 200);
  });
  Api.session.token = 't';
  Api.session.user = {'id': 'u1', 'firstName': 'Hasnaa', 'email': 'h@example.com', 'role': 'customer', 'addresses': []};

  Future<void> render(WidgetTester t, Widget w, String name, {double h = 1600}) async {
    t.view.physicalSize = Size(780, h);
    t.view.devicePixelRatio = 2;
    final k = GlobalKey();
    await t.pumpWidget(RepaintBoundary(
        key: k,
        child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: buildTheme(),
            locale: Locale(Lang.code.value),
            supportedLocales: const [Locale('en'), Locale('ar')],
            localizationsDelegates: const [GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
            home: w)));
    await t.runAsync(() => Future.delayed(const Duration(milliseconds: 400)));
    await t.pump(const Duration(milliseconds: 300));
    await t.pump(const Duration(milliseconds: 300));
    expect(t.takeException(), isNull);
    await shot(t, k, name);
  }

  testWidgets('service price', (t) async {
    await render(t, ServiceDetailsScreen(service: services[0]), '01_service_price_en');
    Lang.code.value = 'ar';
    await render(t, ServiceDetailsScreen(service: services[0]), '01b_service_price_ar');
    Lang.code.value = 'en';
  });
  testWidgets('request technician card', (t) async {
    await render(t, RequestDetailsScreen(request: Map<String, dynamic>.from(req)), '02_request_on_the_way', h: 3000);
  });
  testWidgets('invoice warranty', (t) async {
    await render(t, InvoiceScreen(request: done), '03_invoice_warranty');
    Lang.code.value = 'ar';
    await render(t, InvoiceScreen(request: done), '03b_invoice_warranty_ar');
    Lang.code.value = 'en';
  });
  testWidgets('new request photos', (t) async {
    await render(t, NewRequestScreen(service: services[0]), '04_new_request');
  });
  testWidgets('more whatsapp', (t) async {
    await render(t, const MoreTab(), '05_more_whatsapp');
  });
  testWidgets('tech task', (t) async {
    final old = Api.session.user;
    Api.session.user = {'id': 'p', 'firstName': 'Mostafa', 'email': 't@example.com', 'role': 'technician', 'available': true, 'addresses': []};
    await render(t, TaskDetailsScreen(request: Map<String, dynamic>.from({...req, 'onTheWay': null})), '06_tech_task');
    Api.session.user = old;
  });
}
