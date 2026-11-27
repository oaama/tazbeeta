import 'dart:io';
import 'package:flutter/material.dart' hide Text;
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api.dart';
import '../demo.dart';
import '../lang.dart';
import '../theme.dart';
import '../widgets.dart';

/// Pick the English or Arabic string for the current language.
String L(String en, String ar) => Lang.ar ? ar : en;

/// Text that already carries both languages.
Widget T(String en, String ar,
        {TextStyle? style, TextAlign? align, int? maxLines}) =>
    Text(L(en, ar), style: style, textAlign: align, maxLines: maxLines);

String num2(num n) {
  final s = n.toStringAsFixed(n == n.roundToDouble() ? 0 : 2);
  return quoteAmount({'amount': double.parse(s), 'currency': ''}).trim();
}

String money(Map? q) => q == null ? '' : quoteAmount(q);

// ---------------------------------------------------------------- states

/// One look for every non-content state: loading, empty, error, success, no permission, expired session.
class StateView extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title, body;
  final String? action;
  final VoidCallback? onAction;
  const StateView(
      {super.key,
      required this.icon,
      required this.title,
      required this.body,
      this.color = kTeal,
      this.action,
      this.onAction});
  @override
  Widget build(BuildContext context) => Center(
      child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                    color: color.withValues(alpha: .12), shape: BoxShape.circle),
                child: Icon(icon, size: 40, color: color)),
            const SizedBox(height: 18),
            Text(title,
                textAlign: TextAlign.center,
                style:
                    const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(body,
                textAlign: TextAlign.center,
                style: const TextStyle(color: kMuted, height: 1.6)),
            if (action != null) ...[
              const SizedBox(height: 22),
              SizedBox(
                  width: 220, child: PrimaryButton(action!, onTap: onAction))
            ]
          ])));
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});
  @override
  Widget build(BuildContext context) => Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const CircularProgressIndicator(color: kTeal),
        const SizedBox(height: 14),
        T('Loading...', 'جاري التحميل...',
            style: const TextStyle(color: kMuted))
      ]));
}

class EmptyView extends StatelessWidget {
  final String en, ar, bodyEn, bodyAr;
  final IconData icon;
  const EmptyView(this.en, this.ar, this.bodyEn, this.bodyAr,
      {super.key, this.icon = Icons.inbox_outlined});
  @override
  Widget build(BuildContext context) => StateView(
      icon: icon, title: L(en, ar), body: L(bodyEn, bodyAr), color: kBrandTeal);
}

class ErrorView extends StatelessWidget {
  final String? message;
  final VoidCallback onRetry;
  const ErrorView({super.key, this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => StateView(
      icon: Icons.error_outline,
      color: kError,
      title: L('Something went wrong', 'حصلت مشكلة'),
      body: message == null
          ? L('Check your connection and try again.',
              'اتأكد من الإنترنت وجرّب تاني.')
          : trErr(message!),
      action: L('Try again', 'حاول تاني'),
      onAction: onRetry);
}

class PermissionDeniedView extends StatelessWidget {
  final String en, ar;
  final VoidCallback? onSettings;
  const PermissionDeniedView(this.en, this.ar, {super.key, this.onSettings});
  @override
  Widget build(BuildContext context) => StateView(
      icon: Icons.lock_outline,
      color: kAmber,
      title: L('Permission needed', 'محتاجين إذن'),
      body: L(en, ar),
      action: onSettings == null ? null : L('Open settings', 'افتح الإعدادات'),
      onAction: onSettings);
}

class SessionExpiredView extends StatelessWidget {
  final VoidCallback onSignIn;
  const SessionExpiredView({super.key, required this.onSignIn});
  @override
  Widget build(BuildContext context) => Scaffold(
      body: StateView(
          icon: Icons.timer_off_outlined,
          color: kAmber,
          title: L('Your session expired', 'الجلسة انتهت'),
          body: L('For your security, please sign in again. Nothing you sent was lost.',
              'علشان أمانك، سجّل دخول تاني. مفيش حاجة من اللي بعتّها ضاعت.'),
          action: L('Sign in again', 'سجّل دخول تاني'),
          onAction: onSignIn));
}

void toast(BuildContext c, String en, String ar, {bool ok = true}) =>
    ScaffoldMessenger.of(c).showSnackBar(SnackBar(
        backgroundColor: ok ? kTeal : kError,
        content: Row(children: [
          Icon(ok ? Icons.check_circle : Icons.error_outline,
              color: Colors.white, size: 20),
          const SizedBox(width: 10),
          Expanded(child: T(en, ar, style: const TextStyle(color: Colors.white)))
        ])));

Widget sectionTitle(String en, String ar) => Padding(
    padding: const EdgeInsets.only(top: 18, bottom: 8),
    child: T(en, ar,
        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)));

Widget infoRow(String en, String ar, String value, {Color? color}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Expanded(
          flex: 4,
          child: T(en, ar, style: const TextStyle(color: kMuted, fontSize: 13))),
      Expanded(
          flex: 6,
          child: Text(value,
              textAlign: TextAlign.end,
              style: TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w600, color: color)))
    ]));

// ---------------------------------------------------------------- payment states

String payLabel(String? s) => switch (s) {
      'pending' => L('Pending verification', 'بانتظار المراجعة'),
      'review' => L('Under review', 'قيد المراجعة'),
      'paid' => L('Paid', 'تم الدفع'),
      'rejected' => L('Rejected', 'مرفوض'),
      _ => L('Unpaid', 'لم يُدفع'),
    };
Color payColor(String? s) => switch (s) {
      'paid' => kOk,
      'rejected' => kError,
      'review' => kBrandTeal,
      'pending' => kAmber,
      _ => kMuted,
    };

class PayChip extends StatelessWidget {
  final String? status;
  const PayChip(this.status, {super.key});
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
          color: payColor(status).withValues(alpha: .12),
          borderRadius: BorderRadius.circular(20)),
      child: Text(payLabel(status),
          style: TextStyle(
              color: payColor(status),
              fontSize: 12,
              fontWeight: FontWeight.w700)));
}

Future<Map<String, dynamic>> payInfo() async {
  try {
    final c = await Api.appContent();
    return {
      'number': (c['payNumber'] ?? '').toString(),
      'name': (c['payName'] ?? '').toString(),
      'cash': c['cashEnabled'] != false
    };
  } catch (_) {
    return {'number': '', 'name': '', 'cash': true};
  }
}

// ---------------------------------------------------------------- customer: visit + location

const visitSlots = {
  'morning': ['Morning 9 to 12', 'صباحًا 9 إلى 12'],
  'afternoon': ['Afternoon 12 to 4', 'ظهرًا 12 إلى 4'],
  'evening': ['Evening 4 to 8', 'مساءً 4 إلى 8'],
};
const _dayEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _dayAr = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

String visitText(Map? v) {
  if (v == null) return L('To be agreed with the company', 'هيتحدد مع الشركة');
  final d = DateTime.parse(v['date']);
  final slot = visitSlots[v['slot']];
  return '${L(_dayEn[d.weekday - 1], _dayAr[d.weekday - 1])} ${d.day}/${d.month}'
      '${slot == null ? '' : '  ·  ${L(slot[0], slot[1])}'}';
}

/// Booking Appointment: preferred day and time window. The company confirms the real time.
class VisitPicker extends StatelessWidget {
  final Map? value;
  final ValueChanged<Map> onChanged;
  final DateTime? today;
  const VisitPicker({super.key, this.value, required this.onChanged, this.today});
  @override
  Widget build(BuildContext context) {
    final now = today ?? DateTime.now();
    final days = [for (var i = 1; i <= 7; i++) DateTime(now.year, now.month, now.day + i)];
    String key(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    final sel = value?['date'];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      T('Preferred visit day', 'اليوم المناسب للزيارة',
          style: const TextStyle(fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      SizedBox(
          height: 90,
          child: ListView(scrollDirection: Axis.horizontal, children: [
            for (final d in days)
              Padding(
                  padding: const EdgeInsetsDirectional.only(end: 8),
                  child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => onChanged(
                          {'date': key(d), 'slot': value?['slot'] ?? 'morning'}),
                      child: Container(
                          width: 64,
                          decoration: BoxDecoration(
                              color: sel == key(d) ? kTeal : Colors.white,
                              border: Border.all(
                                  color: sel == key(d) ? kTeal : kBorder),
                              borderRadius: BorderRadius.circular(12)),
                          child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(L(_dayEn[d.weekday - 1], _dayAr[d.weekday - 1]),
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: sel == key(d)
                                            ? Colors.white
                                            : kMuted)),
                                const SizedBox(height: 4),
                                Text(quoteAmount({'amount': d.day.toDouble(), 'currency': ''}).trim(),
                                    style: TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w700,
                                        color: sel == key(d)
                                            ? Colors.white
                                            : kInk))
                              ]))))
          ])),
      const SizedBox(height: 10),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final e in visitSlots.entries)
          ChoiceChip(
              label: Text(L(e.value[0], e.value[1])),
              selected: value?['slot'] == e.key,
              onSelected: sel == null
                  ? null
                  : (_) => onChanged({'date': sel, 'slot': e.key}))
      ]),
      const SizedBox(height: 6),
      T('The company confirms the exact time with you before the visit.',
          'الشركة بتأكد معاك الميعاد بالظبط قبل الزيارة.',
          style: const TextStyle(fontSize: 12, color: kMuted))
    ]);
  }
}

/// Location Picker. No map provider is connected: GPS plus a drop-pin sketch and a typed address.
class LocationPickerScreen extends StatefulWidget {
  final String initial;
  const LocationPickerScreen({super.key, this.initial = ''});
  @override
  State<LocationPickerScreen> createState() => _LocationPickerState();
}

class _LocationPickerState extends State<LocationPickerScreen> {
  late final line = TextEditingController(text: widget.initial);
  final label = TextEditingController(text: 'Home');
  Offset? pin;
  Map<String, double>? gps;
  bool busy = false, denied = false, save = false;
  String? error;
  Future<void> locate() async {
    setState(() {
      busy = true;
      denied = false;
      error = null;
    });
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied)
        perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        setState(() => denied = true);
        return;
      }
      final p = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high,
              timeLimit: Duration(seconds: 8)));
      setState(() {
        gps = {'lat': p.latitude, 'lon': p.longitude};
        pin = const Offset(.5, .5);
      });
    } catch (_) {
      setState(() => error =
          L('Could not get your location. Drop the pin by hand or type the address.',
              'مقدرناش نحدد موقعك. حط الدبوس بإيدك أو اكتب العنوان.'));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> done() async {
    if (save) {
      try {
        final list = [
          for (final a in (Api.session.user?['addresses'] as List? ?? []))
            {'label': '${a['label']}', 'line': '${a['line']}'}
        ];
        if (list.length < 10) {
          list.add({'label': label.text.trim().isEmpty ? 'Address' : label.text.trim(), 'line': line.text.trim()});
          await Api.saveAddresses(list);
        }
      } catch (_) {}
    }
    if (!mounted) return;
    Navigator.pop(context, {
      'line': line.text.trim(),
      if (gps != null) 'location': gps
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: T('Pick the location', 'حدد الموقع')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        AspectRatio(
            aspectRatio: 1.35,
            child: LayoutBuilder(
                builder: (c, k) => GestureDetector(
                    onTapDown: (d) => setState(() => pin = Offset(
                        d.localPosition.dx / k.maxWidth,
                        d.localPosition.dy / k.maxHeight)),
                    child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Stack(children: [
                          Positioned.fill(
                              child: CustomPaint(painter: _SketchPainter())),
                          if (pin != null)
                            Positioned(
                                left: pin!.dx * k.maxWidth - 20,
                                top: pin!.dy * k.maxHeight - 40,
                                child: const Icon(Icons.location_on,
                                    size: 40, color: kError)),
                          Positioned(
                              left: 10,
                              bottom: 8,
                              child: T('Tap to drop the pin', 'اضغط عشان تحط الدبوس',
                                  style: const TextStyle(
                                      fontSize: 11, color: kMuted)))
                        ]))))),
        const SizedBox(height: 12),
        OutlinedButton.icon(
            onPressed: busy ? null : locate,
            icon: busy
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.my_location),
            label: T('Use my current location', 'استخدم موقعي الحالي')),
        if (denied)
          SizedBox(
              height: 230,
              child: PermissionDeniedView(
                  'Location is off for Tazbeeta. You can still type your address, or turn location on in the phone settings.',
                  'الموقع مقفول للتطبيق. تقدر تكتب العنوان بإيدك، أو تفتح الموقع من إعدادات الموبايل.',
                  onSettings: Geolocator.openAppSettings)),
        if (gps != null)
          Padding(
              padding: const EdgeInsets.only(top: 8),
              child: T('Location saved from GPS.', 'اتحدد الموقع من الـ GPS.',
                  style: const TextStyle(color: kOk, fontSize: 12))),
        if (error != null) ErrText(error!),
        const SizedBox(height: 14),
        AppField('Address', line, maxLines: 2, onChanged: (_) => setState(() {})),
        const SizedBox(height: 4),
        T('No map service is connected yet, so the pin is a rough guide. The typed address is what the team uses.',
            'مفيش خريطة متصلة لسه، فالدبوس تقريبي. العنوان المكتوب هو اللي الفريق بيعتمد عليه.',
            style: const TextStyle(fontSize: 12, color: kMuted)),
        SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: save,
            onChanged: (v) => setState(() => save = v),
            title: T('Save as a new address', 'احفظه كعنوان جديد')),
        if (save) AppField('Address name', label),
        const SizedBox(height: 14),
        PrimaryButton(L('Use this location', 'استخدم الموقع ده'),
            onTap: line.text.trim().length >= 4 ? done : null)
      ]));
}

class _SketchPainter extends CustomPainter {
  @override
  void paint(Canvas c, Size s) {
    c.drawRect(Offset.zero & s, Paint()..color = kMist);
    final g = Paint()
      ..color = Colors.white
      ..strokeWidth = 10;
    for (var i = 1; i < 6; i++) {
      c.drawLine(Offset(s.width * i / 6, 0), Offset(s.width * i / 6, s.height), g);
    }
    for (var i = 1; i < 4; i++) {
      c.drawLine(Offset(0, s.height * i / 4), Offset(s.width, s.height * i / 4), g);
    }
    c.drawLine(Offset(0, s.height * .8), Offset(s.width, s.height * .2),
        Paint()
          ..color = kBrandTeal.withValues(alpha: .25)
          ..strokeWidth = 16);
  }

  @override
  bool shouldRepaint(_) => false;
}

// ---------------------------------------------------------------- customer: confirmation, quote, cancel

/// Request Confirmation: shows the order number and what happens next.
class RequestConfirmationScreen extends StatelessWidget {
  final Map request;
  const RequestConfirmationScreen({super.key, required this.request});
  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(
          title: T('Request sent', 'تم إرسال الطلب'),
          automaticallyImplyLeading: false),
      body: ListView(padding: const EdgeInsets.all(22), children: [
        const SizedBox(height: 10),
        Center(
            child: Container(
                width: 88,
                height: 88,
                decoration: const BoxDecoration(
                    color: kMist, shape: BoxShape.circle),
                child: const Icon(Icons.check_circle, size: 54, color: kOk))),
        const SizedBox(height: 16),
        Center(
            child: T('We received your request', 'استلمنا طلبك',
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.w700))),
        const SizedBox(height: 12),
        Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: kMist, borderRadius: BorderRadius.circular(16)),
            child: Column(children: [
              T('Order number', 'رقم الطلب',
                  style: const TextStyle(color: kMuted, fontSize: 12)),
              const SizedBox(height: 4),
              Text('#${request['id']}'.toUpperCase(),
                  style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: kTeal,
                      letterSpacing: 1))
            ])),
        const SizedBox(height: 14),
        infoRow('Service', 'الخدمة', requestTitle(request)),
        infoRow('Preferred visit', 'الزيارة المفضلة', visitText(request['visit'] as Map?)),
        infoRow('Address', 'العنوان', '${request['address']}'),
        sectionTitle('What happens next', 'إيه اللي هيحصل بعد كده'),
        for (final (i, s) in [
          ['The company contacts you to arrange the inspection.', 'الشركة هتتواصل معاك لترتيب المعاينة.'],
          ['You receive a price quote and accept or decline it.', 'هيجيلك عرض سعر وتقبله أو ترفضه.'],
          ['A technician is assigned and visits you.', 'هيتعيّن فني ويزورك.'],
          ['You pay by cash or wallet transfer after the work.', 'بتدفع كاش أو تحويل محفظة بعد الشغل.']
        ].indexed)
          ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                  radius: 13,
                  backgroundColor: kTeal,
                  child: Text('${i + 1}',
                      style: const TextStyle(color: Colors.white, fontSize: 12))),
              title: T(s[0], s[1], style: const TextStyle(fontSize: 13))),
        const SizedBox(height: 18),
        PrimaryButton(L('Back to home', 'رجوع للرئيسية'),
            onTap: () => Navigator.of(context).popUntil((r) => r.isFirst))
      ]));
}

/// Price Quotation with accept or decline.
class QuoteScreen extends StatefulWidget {
  final Map request;
  const QuoteScreen({super.key, required this.request});
  @override
  State<QuoteScreen> createState() => _QuoteState();
}

class _QuoteState extends State<QuoteScreen> {
  late Map r = widget.request;
  String? error;
  bool busy = false;
  Future<void> accept() async {
    setState(() => busy = true);
    try {
      await Api.acceptQuote(r['id'], (r['quote'] as Map)['version']);
      if (!mounted) return;
      toast(context, 'Quote accepted', 'تم قبول العرض');
      Navigator.pop(context, true);
    } catch (e) {
      setState(() {
        error = e.toString();
        busy = false;
      });
    }
  }

  Future<void> decline() async {
    final why = await askReason(context,
        L('Decline this quote', 'رفض العرض'),
        [
          ['Price is too high', 'السعر عالي'],
          ['I found another option', 'لقيت بديل'],
          ['I do not need it anymore', 'مش محتاجها دلوقتي']
        ]);
    if (why == null) return;
    setState(() => busy = true);
    try {
      await Api.action(r['id'], {'action': 'rejectQuote', 'reason': why});
      if (!mounted) return;
      toast(context, 'Quote declined. The company will contact you.',
          'تم رفض العرض. الشركة هتتواصل معاك.');
      Navigator.pop(context, true);
    } catch (e) {
      setState(() {
        error = e.toString();
        busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = r['quote'] as Map;
    final parts = (r['parts'] as List?) ?? [];
    return Scaffold(
        appBar: AppBar(title: T('Price quote', 'عرض السعر')),
        body: ListView(padding: const EdgeInsets.all(20), children: [
          Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                  color: kTeal, borderRadius: BorderRadius.circular(18)),
              child: Column(children: [
                T('Company quote', 'عرض الشركة',
                    style: const TextStyle(color: Colors.white70, fontSize: 12)),
                const SizedBox(height: 6),
                Text(money(q),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 30,
                        fontWeight: FontWeight.w800))
              ])),
          sectionTitle('Cost details', 'تفاصيل التكلفة'),
          infoRow('Service', 'الخدمة', requestTitle(r)),
          infoRow('Scope of work', 'نطاق الشغل', '${q['scope']}'),
          infoRow('Quote version', 'نسخة العرض', '${q['version']}'),
          const Divider(height: 24),
          infoRow('Total to pay', 'الإجمالي المطلوب', money(q), color: kTeal),
          if (parts.isNotEmpty)
            T('Spare parts requested by the technician are reviewed by the company before any extra cost is added.',
                'قطع الغيار اللي يطلبها الفني بتتراجع من الشركة قبل ما أي تكلفة إضافية تتضاف.',
                style: const TextStyle(fontSize: 12, color: kMuted)),
          if (r['quoteRejected'] != null)
            Padding(
                padding: const EdgeInsets.only(top: 10),
                child: T('You declined this quote earlier.', 'انت رفضت العرض ده قبل كده.',
                    style: const TextStyle(color: kError))),
          if (error != null) ErrText(error!),
          const SizedBox(height: 20),
          if (r['status'] == 'quoted') ...[
            PrimaryButton(L('Accept quote', 'قبول العرض'),
                onTap: busy ? null : accept, busy: busy),
            const SizedBox(height: 10),
            OutlinedButton(
                onPressed: busy ? null : decline,
                style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    foregroundColor: kError),
                child: T('Decline quote', 'رفض العرض'))
          ]
        ]));
  }
}

/// Asks for a reason from a short list or free text. Returns null when the user backs out.
Future<String?> askReason(
    BuildContext context, String title, List<List<String>> options) async {
  final other = TextEditingController();
  String? picked;
  return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (c) => StatefulBuilder(
          builder: (c, set) => Padding(
              padding: EdgeInsets.fromLTRB(
                  20, 20, 20, 20 + MediaQuery.of(c).viewInsets.bottom),
              child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            fontSize: 17, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 10),
                    for (final o in options)
                      RadioListTile<String>(
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          value: o[0],
                          groupValue: picked,
                          onChanged: (v) => set(() => picked = v),
                          title: T(o[0], o[1])),
                    RadioListTile<String>(
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                        value: 'other',
                        groupValue: picked,
                        onChanged: (v) => set(() => picked = v),
                        title: T('Other', 'سبب تاني')),
                    if (picked == 'other')
                      TextField(
                          controller: other,
                          onChanged: (_) => set(() {}),
                          decoration: InputDecoration(
                              hintText: L('Write the reason', 'اكتب السبب'))),
                    const SizedBox(height: 14),
                    PrimaryButton(L('Confirm', 'تأكيد'),
                        onTap: picked == null ||
                                (picked == 'other' &&
                                    other.text.trim().length < 3)
                            ? null
                            : () => Navigator.pop(
                                c,
                                picked == 'other'
                                    ? other.text.trim()
                                    : picked)),
                    const SizedBox(height: 6),
                    TextButton(
                        onPressed: () => Navigator.pop(c),
                        child: T('Back', 'رجوع'))
                  ]))));
}

const cancelReasons = [
  ['I booked by mistake', 'عملت الطلب بالغلط'],
  ['I solved it another way', 'حليتها بطريقة تانية'],
  ['The time does not suit me', 'الميعاد مش مناسب'],
  ['The price is too high', 'السعر عالي']
];

/// Cancel Request with a reason. Returns true when cancelled.
Future<bool> cancelWithReason(BuildContext context, Map r) async {
  final why = await askReason(context, L('Cancel this request', 'إلغاء الطلب'), cancelReasons);
  if (why == null) return false;
  try {
    await Api.action(r['id'], {'action': 'cancel', 'reason': why});
    if (context.mounted) toast(context, 'Request cancelled', 'تم إلغاء الطلب');
    return true;
  } catch (e) {
    if (context.mounted) toast(context, trErr(e.toString()), trErr(e.toString()), ok: false);
    return false;
  }
}

// ---------------------------------------------------------------- customer: payment, invoice, rating

Future<String?> pickPhoto(BuildContext context, {bool camera = false}) async {
  try {
    final f = await ImagePicker().pickImage(
        source: camera ? ImageSource.camera : ImageSource.gallery,
        maxWidth: 1024,
        imageQuality: 55);
    return f?.path;
  } catch (_) {
    if (context.mounted)
      toast(context, 'Could not open the photo picker. Check the photo permission in settings.',
          'مقدرناش نفتح الصور. اتأكد من إذن الصور في الإعدادات.', ok: false);
    return null;
  }
}

Widget photoThumb(String path, {double size = 76}) => ClipRRect(
    borderRadius: BorderRadius.circular(10),
    child: SizedBox(
        width: size,
        height: size,
        child: Image.file(File(path),
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
                color: kMist, child: const Icon(Icons.image, color: kBrandTeal)))));

class PaymentMethodsScreen extends StatelessWidget {
  const PaymentMethodsScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: T('Payment methods', 'طرق الدفع')),
      body: FutureBuilder<Map<String, dynamic>>(
          future: payInfo(),
          builder: (c, s) {
            if (!s.hasData) return const LoadingView();
            return ListView(padding: const EdgeInsets.all(20), children: [
              T('Payment is manual. There is no online payment in the app.',
                  'الدفع يدوي. مفيش دفع أونلاين جوه التطبيق.',
                  style: const TextStyle(color: kMuted, height: 1.6)),
              const SizedBox(height: 14),
              _methodCard(Icons.payments_outlined, 'Cash', 'كاش',
                  'Pay the technician or the company in cash after the work.',
                  'ادفع كاش للفني أو للشركة بعد الشغل.'),
              _methodCard(Icons.phone_android, 'InstaPay or wallet transfer',
                  'إنستاباي أو محفظة',
                  'Send the amount to the company number, then upload the receipt photo. The company confirms it from its dashboard.',
                  'ابعت المبلغ على رقم الشركة وارفع صورة الإيصال. الشركة بتأكده من لوحتها.'),
              const SizedBox(height: 8),
              _numberCard(s.data!)
            ]);
          }));
}

Widget _methodCard(IconData i, String en, String ar, String bodyEn, String bodyAr) =>
    Card(
        child: ListTile(
            leading: CircleIcon(i, kTeal, size: 38),
            title: T(en, ar, style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: T(bodyEn, bodyAr, style: const TextStyle(fontSize: 12)))));

Widget _numberCard(Map info) {
  final n = (info['number'] as String);
  return Container(
      padding: const EdgeInsets.all(16),
      decoration:
          BoxDecoration(color: kMist, borderRadius: BorderRadius.circular(16)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        T('Company transfer number', 'رقم الشركة للتحويل',
            style: const TextStyle(color: kMuted, fontSize: 12)),
        const SizedBox(height: 6),
        n.isEmpty
            ? T('Not set yet. The company will add it.', 'لسه متحددش. الشركة هتضيفه.',
                style: const TextStyle(color: kAmber, fontWeight: FontWeight.w700))
            : SelectableText(n,
                style: const TextStyle(
                    fontSize: 22, fontWeight: FontWeight.w800, color: kTeal)),
        if ((info['name'] as String).isNotEmpty)
          Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(info['name']))
      ]));
}

/// Payment Method + receipt upload for one request.
class PayScreen extends StatefulWidget {
  final Map request;
  const PayScreen({super.key, required this.request});
  @override
  State<PayScreen> createState() => _PayState();
}

class _PayState extends State<PayScreen> {
  String method = 'cash';
  String? receipt, error;
  bool busy = false;
  late Future<Map<String, dynamic>> info = payInfo();
  Future<void> submit() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      if (method == 'wallet' && receipt != null) await Api.uploadPhoto(widget.request['id'], 'receipt', receipt!);
      final r = await Api.action(widget.request['id'], {
        'action': 'pay',
        'method': method,
        if (method == 'wallet') 'receipt': receipt
      });
      if (!mounted) return;
      Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => PaymentStatusScreen(request: r)));
    } catch (e) {
      setState(() {
        error = e.toString();
        busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = widget.request['quote'] as Map?;
    return Scaffold(
        appBar: AppBar(title: T('Payment', 'الدفع')),
        body: FutureBuilder<Map<String, dynamic>>(
            future: info,
            builder: (c, s) {
              if (!s.hasData) return const LoadingView();
              final cash = s.data!['cash'] == true;
              return ListView(padding: const EdgeInsets.all(20), children: [
                infoRow('Amount due', 'المبلغ المطلوب', money(q), color: kTeal),
                sectionTitle('Choose how you pay', 'اختار طريقة الدفع'),
                if (cash)
                  RadioListTile<String>(
                      value: 'cash',
                      groupValue: method,
                      onChanged: (v) => setState(() => method = v!),
                      title: T('Cash', 'كاش'),
                      subtitle: T('Pay after the work is done.', 'بتدفع بعد ما الشغل يخلص.')),
                RadioListTile<String>(
                    value: 'wallet',
                    groupValue: method,
                    onChanged: (v) => setState(() => method = v!),
                    title: T('InstaPay or wallet transfer', 'إنستاباي أو محفظة'),
                    subtitle: T('Send the amount, then upload the receipt.',
                        'ابعت المبلغ وارفع صورة الإيصال.')),
                if (method == 'wallet') ...[
                  const SizedBox(height: 8),
                  _numberCard(s.data!),
                  sectionTitle('Transfer receipt', 'إيصال التحويل'),
                  if (receipt != null)
                    Row(children: [
                      photoThumb(receipt!, size: 96),
                      const SizedBox(width: 12),
                      TextButton(
                          onPressed: () => setState(() => receipt = null),
                          child: T('Remove', 'مسح'))
                    ])
                  else
                    OutlinedButton.icon(
                        onPressed: () async {
                          final p = await pickPhoto(context);
                          if (p != null) setState(() => receipt = p);
                        },
                        icon: const Icon(Icons.upload_file),
                        label: T('Upload receipt photo', 'ارفع صورة الإيصال')),
                  const SizedBox(height: 6),
                  T('Your payment stays "Pending verification" until the company confirms the transfer. Uploading a receipt does not mark it paid.',
                      'الدفع بيفضل "بانتظار المراجعة" لحد ما الشركة تأكد التحويل. رفع الإيصال لوحده مبيخليش الدفع مدفوع.',
                      style: const TextStyle(fontSize: 12, color: kMuted))
                ],
                if (error != null) ErrText(error!),
                const SizedBox(height: 22),
                PrimaryButton(L('Confirm payment method', 'تأكيد طريقة الدفع'),
                    busy: busy,
                    onTap: method == 'wallet' && receipt == null ? null : submit)
              ]);
            }));
  }
}

class PaymentStatusScreen extends StatelessWidget {
  final Map request;
  const PaymentStatusScreen({super.key, required this.request});
  @override
  Widget build(BuildContext context) {
    final p = (request['payment'] as Map?) ?? {};
    final st = p['status'] as String?;
    final wallet = p['method'] == 'wallet';
    return Scaffold(
        appBar: AppBar(title: T('Payment status', 'حالة الدفع')),
        body: ListView(padding: const EdgeInsets.all(22), children: [
          Center(
              child: Icon(
                  st == 'paid'
                      ? Icons.check_circle
                      : st == 'rejected'
                          ? Icons.cancel
                          : Icons.hourglass_top,
                  size: 70,
                  color: payColor(st))),
          const SizedBox(height: 12),
          Center(child: PayChip(st)),
          const SizedBox(height: 14),
          Center(
              child: T(
                  st == 'paid'
                      ? 'Payment confirmed'
                      : st == 'rejected'
                          ? 'The company could not confirm this transfer'
                          : wallet
                              ? 'We received your receipt'
                              : 'Cash payment recorded',
                  st == 'paid'
                      ? 'تم تأكيد الدفع'
                      : st == 'rejected'
                          ? 'الشركة مقدرتش تأكد التحويل ده'
                          : wallet
                              ? 'استلمنا الإيصال'
                              : 'اتسجل الدفع كاش',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  align: TextAlign.center)),
          const SizedBox(height: 8),
          Center(
              child: T(
                  wallet && st != 'paid' && st != 'rejected'
                      ? 'The company will check the transfer and update this status. This is not automatic.'
                      : st == 'unpaid'
                          ? 'Pay the technician or the company after the work. They confirm they got it.'
                          : st == 'rejected'
                              ? 'Send the receipt again or choose cash.'
                              : 'Thank you.',
                  wallet && st != 'paid' && st != 'rejected'
                      ? 'الشركة هتراجع التحويل وتحدّث الحالة. مش أوتوماتيك.'
                      : st == 'unpaid'
                          ? 'ادفع للفني أو للشركة بعد الشغل. هما بيأكدوا إنهم استلموا.'
                          : st == 'rejected'
                              ? 'ابعت الإيصال تاني أو اختار كاش.'
                              : 'شكرًا ليك.',
                  style: const TextStyle(color: kMuted, height: 1.6),
                  align: TextAlign.center)),
          const SizedBox(height: 22),
          infoRow('Order', 'الطلب', '#${request['id']}'.toUpperCase()),
          infoRow('Method', 'الطريقة', wallet ? L('InstaPay or wallet', 'إنستاباي أو محفظة') : L('Cash', 'كاش')),
          infoRow('Amount', 'المبلغ', money(request['quote'] as Map?)),
          const SizedBox(height: 18),
          if (st == 'rejected')
            PrimaryButton(L('Pay again', 'ادفع تاني'),
                onTap: () => Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(
                        builder: (_) => PayScreen(request: request)))),
          const SizedBox(height: 8),
          OutlinedButton(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => InvoiceScreen(request: request))),
              child: T('View invoice', 'شوف الفاتورة'))
        ]));
  }
}

/// Invoice Details: total, paid and remaining.
class InvoiceScreen extends StatelessWidget {
  final Map request;
  const InvoiceScreen({super.key, required this.request});
  @override
  Widget build(BuildContext context) {
    final q = request['quote'] as Map?;
    final p = (request['payment'] as Map?) ?? {};
    final total = ((q?['amount'] ?? 0) as num);
    final paid = p['status'] == 'paid' ? total : 0;
    final cur = (q?['currency'] ?? 'EGP');
    String m(num n) => '${num2(n)} ${cur == 'EGP' ? L('EGP', 'ج.م') : cur}';
    final parts = (request['parts'] as List?) ?? [];
    return Scaffold(
        appBar: AppBar(title: T('Invoice', 'الفاتورة')),
        body: q == null
            ? const EmptyView('No invoice yet', 'مفيش فاتورة لسه',
                'The invoice appears after the company sends a quote.',
                'الفاتورة بتظهر بعد ما الشركة تبعت عرض السعر.',
                icon: Icons.receipt_long_outlined)
            : ListView(padding: const EdgeInsets.all(20), children: [
                infoRow('Invoice for order', 'فاتورة الطلب', '#${request['id']}'.toUpperCase()),
                infoRow('Service', 'الخدمة', requestTitle(request)),
                infoRow('Customer', 'العميل', '${request['contactName'] ?? Api.session.firstName}'),
                const Divider(height: 26),
                infoRow('Service total', 'إجمالي الخدمة', m(total)),
                if (parts.isNotEmpty)
                  for (final x in parts)
                    infoRow('Part: ${x['name']} x${x['qty']}',
                        'قطعة: ${x['name']} × ${x['qty']}',
                        L('Pending company approval', 'بانتظار موافقة الشركة'),
                        color: kAmber),
                const Divider(height: 26),
                infoRow('Paid', 'المدفوع', m(paid), color: kOk),
                infoRow('Remaining', 'المتبقي', m(total - paid),
                    color: total - paid > 0 ? kError : kOk),
                const Divider(height: 26),
                infoRow('Warranty', 'الضمان', L('30 days from completion', '30 يوم من تاريخ إنهاء الشغل')),
                if (request['warrantyUntil'] != null)
                  infoRow('Warranty valid until', 'الضمان ساري لحد',
                      '${request['warrantyUntil']}'.split('T').first),
                const SizedBox(height: 6),
                Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: PayChip(p['status'] as String?)),
                const SizedBox(height: 20),
                if (p['status'] == null || p['status'] == 'rejected')
                  PrimaryButton(L('Pay now', 'ادفع دلوقتي'),
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => PayScreen(request: request))))
              ]));
  }
}

class RatingScreen extends StatefulWidget {
  final Map request;
  const RatingScreen({super.key, required this.request});
  @override
  State<RatingScreen> createState() => _RatingState();
}

class _RatingState extends State<RatingScreen> {
  int tech = 0, service = 0;
  final note = TextEditingController();
  bool busy = false;
  String? error;
  Widget stars(int v, ValueChanged<int> set) => Row(children: [
        for (var i = 1; i <= 5; i++)
          IconButton(
              onPressed: () => set(i),
              icon: Icon(i <= v ? Icons.star : Icons.star_border,
                  color: kAmber, size: 34))
      ]);
  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: T('Rate the work', 'قيّم الشغل')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        if (widget.request['technicianName'] != null)
          infoRow('Technician', 'الفني', '${widget.request['technicianName']}'),
        sectionTitle('How was the technician?', 'الفني كان عامل إزاي؟'),
        stars(tech, (v) => setState(() => tech = v)),
        sectionTitle('How was the service?', 'الخدمة كانت عاملة إزاي؟'),
        stars(service, (v) => setState(() => service = v)),
        const SizedBox(height: 12),
        AppField('Your comment (optional)', note, maxLines: 4),
        if (error != null) ErrText(error!),
        const SizedBox(height: 18),
        PrimaryButton(L('Send rating', 'ابعت التقييم'),
            busy: busy,
            onTap: tech == 0 || service == 0
                ? null
                : () async {
                    setState(() => busy = true);
                    try {
                      await Api.action(widget.request['id'], {
                        'action': 'rate',
                        'tech': tech,
                        'service': service,
                        'note': note.text.trim()
                      });
                      await Api.submitFeedback(
                          ((tech + service) / 2).round(), note.text.trim());
                      if (!context.mounted) return;
                      toast(context, 'Thank you for your rating', 'شكرًا على تقييمك');
                      Navigator.pop(context, true);
                    } catch (e) {
                      setState(() {
                        error = e.toString();
                        busy = false;
                      });
                    }
                  })
      ]));
}

// ---------------------------------------------------------------- customer: history, complaints, notifications

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});
  @override
  State<HistoryScreen> createState() => _HistoryState();
}

class _HistoryState extends State<HistoryScreen> {
  List? rows;
  String? error;
  Future<void> load() async {
    setState(() {
      rows = null;
      error = null;
    });
    try {
      final all = await Api.requests();
      if (mounted)
        setState(() => rows = all
            .where((r) => ['completed', 'cancelled'].contains(r['status']))
            .toList());
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  Widget build(BuildContext context) {
    final tech = Api.session.role == 'technician';
    return Scaffold(
        appBar: AppBar(
            title: T(tech ? 'Task history' : 'Previous orders',
                tech ? 'سجل المهام' : 'الطلبات السابقة')),
        body: error != null
            ? ErrorView(message: error, onRetry: load)
            : rows == null
                ? const LoadingView()
                : rows!.isEmpty
                    ? EmptyView('Nothing here yet', 'مفيش حاجة لسه',
                        tech
                            ? 'Finished tasks show up here.'
                            : 'Completed and cancelled orders show up here.',
                        tech
                            ? 'المهام اللي خلصت بتظهر هنا.'
                            : 'الطلبات اللي خلصت أو اتلغت بتظهر هنا.',
                        icon: Icons.history)
                    : ListView(padding: const EdgeInsets.all(16), children: [
                        for (final r in rows!)
                          Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(children: [
                                          Expanded(
                                              child: Text(requestTitle(r),
                                                  style: const TextStyle(
                                                      fontWeight: FontWeight.w700))),
                                          Text(
                                              r['status'] == 'completed'
                                                  ? L('Completed', 'مكتمل')
                                                  : L('Cancelled', 'ملغي'),
                                              style: TextStyle(
                                                  color: r['status'] == 'completed'
                                                      ? kOk
                                                      : kError,
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w700))
                                        ]),
                                        const SizedBox(height: 4),
                                        Text('#${r['id']}'.toUpperCase(),
                                            style: const TextStyle(
                                                color: kMuted, fontSize: 12)),
                                        if (r['quote'] != null)
                                          Text(money(r['quote'] as Map),
                                              style: const TextStyle(
                                                  color: kTeal,
                                                  fontWeight: FontWeight.w700)),
                                        const SizedBox(height: 8),
                                        Row(children: [
                                          if (!tech)
                                            TextButton.icon(
                                                onPressed: () =>
                                                    reorder(context, r),
                                                icon: const Icon(Icons.replay, size: 18),
                                                label: T('Order again', 'اطلب تاني')),
                                          const Spacer(),
                                          TextButton(
                                              onPressed: () => Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                      builder: (_) => tech
                                                          ? TaskDetailsScreen(request: r)
                                                          : InvoiceScreen(request: r))),
                                              child: T(tech ? 'Details' : 'Invoice',
                                                  tech ? 'التفاصيل' : 'الفاتورة'))
                                        ])
                                      ])))
                      ]));
  }
}

/// Opens a new request prefilled from an old one. Needs a service from the catalog.
Future<void> reorder(BuildContext context, Map r) async {
  try {
    final list = await Api.services();
    final s = list.cast<Map>().where((x) => x['id'] == r['serviceId']);
    if (!context.mounted) return;
    if (s.isEmpty) {
      toast(context, 'This service is not in the catalog now.', 'الخدمة دي مش موجودة في القائمة دلوقتي.', ok: false);
      return;
    }
    await Navigator.pushNamed(context, '/reorder',
        arguments: {'service': s.first, 'request': r});
  } catch (e) {
    if (context.mounted) toast(context, trErr(e.toString()), trErr(e.toString()), ok: false);
  }
}

/// Complaint & Support.
class ComplaintScreen extends StatefulWidget {
  const ComplaintScreen({super.key});
  @override
  State<ComplaintScreen> createState() => _ComplaintState();
}

class _ComplaintState extends State<ComplaintScreen> {
  final text = TextEditingController();
  String kind = 'complaint';
  String? requestId, error;
  List<dynamic> mine = [], reqs = [];
  bool busy = false, loading = true;
  Future<void> load() async {
    try {
      final c = await Api.complaints();
      final r = await Api.requests();
      if (mounted)
        setState(() {
          mine = c;
          reqs = r;
          loading = false;
        });
    } catch (_) {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: T('Complaint and support', 'الشكاوى والدعم')),
      body: loading
          ? const LoadingView()
          : ListView(padding: const EdgeInsets.all(20), children: [
              SegmentedButton<String>(
                  segments: [
                    ButtonSegment(value: 'complaint', label: T('Complaint', 'شكوى')),
                    ButtonSegment(value: 'help', label: T('I need help', 'محتاج مساعدة'))
                  ],
                  selected: {kind},
                  onSelectionChanged: (s) => setState(() => kind = s.first)),
              const SizedBox(height: 14),
              if (reqs.isNotEmpty)
                DropdownButtonFormField<String?>(
                    isExpanded: true,
                    initialValue: requestId,
                    decoration: InputDecoration(
                        labelText: L('Related order (optional)', 'الطلب المتعلق (اختياري)')),
                    items: [
                      DropdownMenuItem<String?>(
                          value: null, child: T('None', 'بدون')),
                      for (final r in reqs)
                        DropdownMenuItem<String?>(
                            value: r['id'] as String,
                            child: Text('#${r['id']}  ${requestTitle(r)}'.toUpperCase().replaceAll('#', '#'),
                                maxLines: 1, overflow: TextOverflow.ellipsis))
                    ],
                    onChanged: (v) => setState(() => requestId = v)),
              const SizedBox(height: 12),
              AppField('What happened?', text,
                  maxLines: 5, onChanged: (_) => setState(() {})),
              if (error != null) ErrText(error!),
              const SizedBox(height: 14),
              PrimaryButton(L('Send', 'إرسال'),
                  busy: busy,
                  onTap: text.text.trim().length < 5
                      ? null
                      : () async {
                          setState(() {
                            busy = true;
                            error = null;
                          });
                          try {
                            await Api.sendComplaint({
                              'kind': kind,
                              'text': text.text.trim(),
                              'requestId': requestId
                            });
                            text.clear();
                            if (mounted) {
                              toast(context, 'Sent. The team will review it.', 'اتبعت. الفريق هيراجعها.');
                              busy = false;
                              await load();
                            }
                          } catch (e) {
                            setState(() {
                              error = e.toString();
                              busy = false;
                            });
                          }
                        }),
              sectionTitle('Your messages', 'رسايلك'),
              if (mine.isEmpty)
                T('Nothing sent yet.', 'مفيش حاجة اتبعتت لسه.',
                    style: const TextStyle(color: kMuted))
              else
                for (final c in mine)
                  Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                          title: Text('${c['text']}', maxLines: 2, overflow: TextOverflow.ellipsis),
                          subtitle: T(
                              c['status'] == 'open' ? 'Open' : 'Answered',
                              c['status'] == 'open' ? 'مفتوحة' : 'تم الرد')))
            ]));
}

/// Notifications Center built from the live state of the user's orders.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsState();
}

class _NotificationsState extends State<NotificationsScreen> {
  List<Map<String, String>>? items;
  String? error;
  Future<void> load() async {
    setState(() {
      items = null;
      error = null;
    });
    try {
      final rs = await Api.requests();
      final out = <Map<String, String>>[];
      for (final r in rs.cast<Map>()) {
        final id = '#${r['id']}'.toUpperCase();
        final cust = Api.session.role == 'customer';
        final st = r['status'];
        String en = '', ar = '';
        if (cust) {
          switch (st) {
            case 'pending': en = 'Order $id received.'; ar = 'استلمنا الطلب $id.';
            case 'inspection': en = 'Inspection recorded for $id.'; ar = 'اتسجلت المعاينة للطلب $id.';
            case 'quoted': en = 'A price quote for $id is waiting for you.'; ar = 'عرض سعر للطلب $id مستنيك.';
            case 'approved': en = 'You accepted the quote for $id.'; ar = 'قبلت عرض السعر للطلب $id.';
            case 'assigned': en = 'A technician was assigned to $id.'; ar = 'اتعيّن فني للطلب $id.';
            case 'in_progress': en = 'Work started on $id.'; ar = 'الشغل بدأ في الطلب $id.';
            case 'completed': en = '$id is completed. Rate the work.'; ar = 'الطلب $id خلص. قيّم الشغل.';
            case 'cancelled': en = '$id was cancelled.'; ar = 'الطلب $id اتلغى.';
          }
          final p = (r['payment'] as Map?)?['status'];
          if (p == 'paid') { en = 'Payment for $id confirmed.'; ar = 'تم تأكيد دفع الطلب $id.'; }
          if (p == 'rejected') { en = 'The transfer for $id was rejected. Pay again.'; ar = 'تحويل الطلب $id اترفض. ادفع تاني.'; }
        } else if (st == 'assigned' && r['techAccepted'] == null) {
          en = 'New task $id is waiting for your answer.';
          ar = 'مهمة جديدة $id مستنية ردك.';
        } else if (st == 'in_progress') {
          en = 'Task $id is in progress.'; ar = 'المهمة $id شغالة.';
        }
        if (en.isNotEmpty)
          out.add({'en': en, 'ar': ar, 'at': '${r['createdAt'] ?? ''}', 'st': '$st'});
      }
      if (mounted) setState(() => items = out);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: T('Notifications', 'الإشعارات')),
      body: error != null
          ? ErrorView(message: error, onRetry: load)
          : items == null
              ? const LoadingView()
              : items!.isEmpty
                  ? const EmptyView('No notifications', 'مفيش إشعارات',
                      'Updates about your orders show up here.',
                      'تحديثات طلباتك بتظهر هنا.',
                      icon: Icons.notifications_none)
                  : ListView(children: [
                      for (final n in items!)
                        ListTile(
                            leading: CircleIcon(
                                n['st'] == 'quoted' || n['st'] == 'completed'
                                    ? Icons.notifications_active
                                    : Icons.notifications_none,
                                n['st'] == 'quoted' || n['st'] == 'completed'
                                    ? kAmber
                                    : kBrandTeal),
                            title: T(n['en']!, n['ar']!),
                            subtitle: Text(n['at']!.split('T').first))
                    ]));
}

// ---------------------------------------------------------------- technician

class TaskDetailsScreen extends StatefulWidget {
  final Map request;
  const TaskDetailsScreen({super.key, required this.request});
  @override
  State<TaskDetailsScreen> createState() => _TaskState();
}

class _TaskState extends State<TaskDetailsScreen> {
  late Map r = Map.from(widget.request);
  String? error;
  bool busy = false;
  Future<void> run(Map<String, dynamic> body, {String? okEn, String? okAr}) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final n = await Api.action(r['id'], body);
      if (mounted) {
        setState(() => r = Map.from(n));
        if (okEn != null) toast(context, okEn, okAr!);
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> navigateTo() async {
    final loc = r['location'] as Map?;
    final q = loc != null
        ? '${loc['lat']},${loc['lon']}'
        : Uri.encodeComponent('${r['address']}');
    final ok = await launchUrl(Uri.parse('geo:0,0?q=$q'),
            mode: LaunchMode.externalApplication)
        .catchError((_) => false);
    if (!ok && mounted) {
      await Clipboard.setData(ClipboardData(text: '${r['address']}'));
      if (mounted)
        toast(context, 'No maps app found. The address was copied.',
            'مفيش تطبيق خرائط. اتنسخ العنوان.', ok: false);
    }
  }

  Future<void> addPart() async {
    final name = TextEditingController(), qty = TextEditingController(text: '1'), cost = TextEditingController();
    final ok = await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
                title: T('Spare part request', 'طلب قطعة غيار'),
                content: Column(mainAxisSize: MainAxisSize.min, children: [
                  TextField(controller: name, decoration: InputDecoration(labelText: L('Part name', 'اسم القطعة'))),
                  TextField(controller: qty, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: L('Quantity', 'العدد'))),
                  TextField(controller: cost, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: L('Cost (EGP)', 'التكلفة (جنيه)')))
                ]),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(c, false), child: T('Back', 'رجوع')),
                  FilledButton(onPressed: () => Navigator.pop(c, true), child: T('Send request', 'ابعت الطلب'))
                ]));
    if (ok == true)
      await run({
        'action': 'part',
        'name': name.text.trim(),
        'qty': int.tryParse(qty.text) ?? 1,
        'cost': num.tryParse(cost.text) ?? 0
      }, okEn: 'Part request sent to the company', okAr: 'طلب القطعة اتبعت للشركة');
  }

  Future<void> writeReport() async {
    final text = TextEditingController(text: '${(r['report'] as Map?)?['text'] ?? ''}');
    final hours = TextEditingController(text: '${(r['report'] as Map?)?['hours'] ?? ''}');
    final ok = await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
                title: T('Work report', 'تقرير الشغل'),
                content: Column(mainAxisSize: MainAxisSize.min, children: [
                  TextField(controller: text, maxLines: 4, decoration: InputDecoration(labelText: L('What was done', 'اللي اتعمل'))),
                  TextField(controller: hours, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: L('Hours spent', 'عدد الساعات')))
                ]),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(c, false), child: T('Back', 'رجوع')),
                  FilledButton(onPressed: () => Navigator.pop(c, true), child: T('Save report', 'احفظ التقرير'))
                ]));
    if (ok == true)
      await run({'action': 'report', 'text': text.text.trim(), 'hours': num.tryParse(hours.text)},
          okEn: 'Report saved', okAr: 'اتحفظ التقرير');
  }

  Future<void> photo(String kind) async {
    final p = await pickPhoto(context, camera: true);
    if (p == null) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await Api.uploadPhoto(r['id'], kind, p);
      final ph = Map<String, dynamic>.from((r['photos'] as Map?) ?? {});
      ph[kind] = [...((ph[kind] as List?) ?? []), p];
      r['photos'] = ph;
      if (mounted) toast(context, 'Photo added', 'اتضافت الصورة');
    } on ApiError catch (e) {
      error = e.message;
    }
    if (mounted) setState(() => busy = false);
  }

  Future<void> decline() async {
    final why = await askReason(context, L('Decline this task', 'رفض المهمة'), [
      ['I am not available then', 'مش متاح في الميعاد ده'],
      ['Too far from me', 'بعيد عني'],
      ['Not my specialty', 'مش تخصصي']
    ]);
    if (why == null) return;
    await run({'action': 'reject', 'reason': why});
    if (mounted && r['technicianId'] == null) Navigator.pop(context, true);
  }

  Widget step(IconData i, String en, String ar, VoidCallback? onTap, {bool done = false}) =>
      ListTile(
          contentPadding: EdgeInsets.zero,
          leading: CircleIcon(done ? Icons.check : i, done ? kOk : kTeal, size: 34),
          title: T(en, ar, style: const TextStyle(fontWeight: FontWeight.w600)),
          trailing: onTap == null ? null : const Icon(Icons.chevron_right),
          onTap: busy ? null : onTap);

  @override
  Widget build(BuildContext context) {
    final st = r['status'] as String;
    final accepted = r['techAccepted'] != null;
    final photos = Map<String, dynamic>.from((r['photos'] as Map?) ?? {});
    final parts = (r['parts'] as List?) ?? [];
    final pay = (r['payment'] as Map?) ?? {};
    return Scaffold(
        appBar: AppBar(title: T('Task details', 'تفاصيل المهمة')),
        body: ListView(padding: const EdgeInsets.all(20), children: [
          Text(requestTitle(r),
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
          Text('#${r['id']}'.toUpperCase(),
              style: const TextStyle(color: kMuted, fontSize: 12)),
          sectionTitle('Customer', 'العميل'),
          infoRow('Name', 'الاسم', '${r['contactName'] ?? ''}'),
          infoRow('Phone', 'التليفون', '${r['contactPhone'] ?? ''}'),
          infoRow('Address', 'العنوان', '${r['address']}'),
          infoRow('Visit', 'الزيارة', visitText(r['visit'] as Map?)),
          sectionTitle('Problem', 'المشكلة'),
          Text(sampleText(r, 'description')),
          const Divider(height: 28),
          if (st == 'assigned' && !accepted) ...[
            PrimaryButton(L('Accept task', 'قبول المهمة'),
                busy: busy,
                onTap: () => run({'action': 'accept'},
                    okEn: 'Task accepted', okAr: 'اتقبلت المهمة')),
            const SizedBox(height: 10),
            OutlinedButton(
                onPressed: busy ? null : decline,
                style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48), foregroundColor: kError),
                child: T('Decline task', 'رفض المهمة'))
          ],
          if (st == 'assigned' && accepted) ...[
            step(Icons.navigation_outlined, 'Navigate to the customer', 'روح للعميل بالخريطة', navigateTo),
            if (r['onTheWay'] == null)
              step(Icons.directions_car_outlined, 'I am on the way', 'أنا في الطريق',
                  () => run({'action': 'onway'}, okEn: 'The customer was told you are on the way', okAr: 'العميل عرف إنك في الطريق')),
            step(Icons.play_circle_outline, 'I arrived, start the task', 'وصلت، ابدأ المهمة',
                () => run({'action': 'arrive'}, okEn: 'Task started', okAr: 'المهمة بدأت'))
          ],
          if (st == 'in_progress') ...[
            step(Icons.navigation_outlined, 'Navigate to the customer', 'روح للعميل بالخريطة', navigateTo),
            step(Icons.photo_camera_outlined, 'Add a before photo', 'ضيف صورة قبل', () => photo('before'),
                done: (photos['before'] as List? ?? []).isNotEmpty),
            step(Icons.photo_camera_back_outlined, 'Add an after photo', 'ضيف صورة بعد', () => photo('after'),
                done: (photos['after'] as List? ?? []).isNotEmpty),
            step(Icons.build_outlined, 'Request spare parts', 'اطلب قطع غيار', addPart),
            step(Icons.description_outlined, 'Write the work report', 'اكتب تقرير الشغل', writeReport,
                done: r['report'] != null),
            const SizedBox(height: 8),
            PrimaryButton(L('Complete task', 'إنهاء المهمة'),
                busy: busy,
                onTap: r['report'] == null || (photos['after'] as List? ?? []).isEmpty
                    ? null
                    : () async {
                        setState(() => busy = true);
                        try {
                          await Api.setStatus(r['id'], 'completed');
                          if (!context.mounted) return;
                          toast(context, 'Task completed', 'المهمة خلصت');
                          Navigator.pop(context, true);
                        } catch (e) {
                          setState(() {
                            error = e.toString();
                            busy = false;
                          });
                        }
                      }),
            if (r['report'] == null || (photos['after'] as List? ?? []).isEmpty)
              Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: T('Add the after photo and the work report to complete.',
                      'ضيف صورة بعد وتقرير الشغل علشان تنهي.',
                      style: const TextStyle(fontSize: 12, color: kMuted)))
          ],
          if (photos.isNotEmpty) ...[
            sectionTitle('Photos', 'الصور'),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final k in ['before', 'after'])
                for (final p in (photos[k] as List? ?? [])) photoThumb('$p')
            ])
          ],
          if (parts.isNotEmpty) ...[
            sectionTitle('Spare parts requested', 'قطع الغيار المطلوبة'),
            for (final x in parts)
              infoRow('${x['name']} x${x['qty']}', '${x['name']} × ${x['qty']}',
                  '${num2(x['cost'] as num)} ${L('EGP', 'ج.م')}')
          ],
          if (r['report'] != null) ...[
            sectionTitle('Work report', 'تقرير الشغل'),
            Text('${(r['report'] as Map)['text']}')
          ],
          if (st == 'completed' && pay['method'] == 'cash' && pay['status'] == 'unpaid') ...[
            sectionTitle('Cash payment', 'الدفع كاش'),
            T('Hand the cash to the company. The company confirms the payment and settles your share after.',
                'سلّم الكاش للشركة. الشركة بتأكد الدفع وبتحاسبك بعد كده.',
                style: const TextStyle(fontSize: 13, color: kMuted))
          ],
          if (st == 'completed' && pay['method'] != null)
            Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: PayChip(pay['status'] as String?))),
          if (error != null) ErrText(error!),
          const SizedBox(height: 22),
          OutlinedButton.icon(
              onPressed: () => Navigator.pushNamed(context, '/chat', arguments: r),
              icon: const Icon(Icons.chat_outlined),
              label: T('Chat with team', 'كلم الفريق'))
        ]));
  }
}

/// Earnings: finished jobs and their value. The technician share is set by the company, so none is invented here.
class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key});
  @override
  State<EarningsScreen> createState() => _EarningsState();
}

class _EarningsState extends State<EarningsScreen> {
  List? rows;
  String? error;
  Future<void> load() async {
    setState(() {
      rows = null;
      error = null;
    });
    try {
      final all = await Api.requests();
      if (mounted)
        setState(() => rows = all.where((r) => r['status'] == 'completed').toList());
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  Widget build(BuildContext context) {
    final total = (rows ?? []).fold<num>(0, (a, r) => a + ((r['quote']?['amount'] ?? 0) as num));
    return Scaffold(
        appBar: AppBar(title: T('Earnings', 'المستحقات')),
        body: error != null
            ? ErrorView(message: error, onRetry: load)
            : rows == null
                ? const LoadingView()
                : rows!.isEmpty
                    ? const EmptyView('No earnings yet', 'مفيش مستحقات لسه',
                        'Finished tasks and their value show up here.',
                        'المهام اللي خلصت وقيمتها بتظهر هنا.',
                        icon: Icons.account_balance_wallet_outlined)
                    : ListView(padding: const EdgeInsets.all(16), children: [
                        Container(
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                                color: kTeal, borderRadius: BorderRadius.circular(18)),
                            child: Column(children: [
                              T('Value of finished jobs', 'قيمة الشغل المنتهي',
                                  style: const TextStyle(color: Colors.white70, fontSize: 12)),
                              const SizedBox(height: 6),
                              Text('${num2(total)} ${L('EGP', 'ج.م')}',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 28,
                                      fontWeight: FontWeight.w800))
                            ])),
                        const SizedBox(height: 8),
                        T('Your share and payout dates are set by the company.',
                            'نسبتك ومواعيد الصرف بتحددها الشركة.',
                            style: const TextStyle(fontSize: 12, color: kMuted)),
                        sectionTitle('Jobs', 'الشغل'),
                        for (final r in rows!)
                          Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                  title: Text(requestTitle(r)),
                                  subtitle: Text('#${r['id']}'.toUpperCase()),
                                  trailing: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(money(r['quote'] as Map?),
                                            style: const TextStyle(fontWeight: FontWeight.w700)),
                                        PayChip(((r['payment'] as Map?)?['status']) as String?)
                                      ])))
                      ]));
  }
}
