import 'package:flutter/material.dart' hide Text;
import '../lang.dart';
import '../theme.dart';
import '../widgets.dart';
import '../demo.dart';
import '../config.dart';
import '../api.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Local prototype screens only. No payment or external communication occurs.
class PaymentPreviewScreen extends StatefulWidget {
  const PaymentPreviewScreen({super.key});
  @override
  State<PaymentPreviewScreen> createState() => _PaymentPreviewState();
}

class _PaymentPreviewState extends State<PaymentPreviewScreen> {
  bool cash = true;
  bool cashEnabled = true, loading = false;
  String? loadError;
  @override
  void initState() {
    super.initState();
    if (!demoMode) {
      loading = true;
      Api.appContent().then((c) {
        if (mounted)
          setState(() {
            cashEnabled = c['cashEnabled'] as bool;
            loading = false;
          });
      }).catchError((e) {
        if (mounted)
          setState(() {
            loadError = e.toString();
            loading = false;
          });
      });
    }
  }

  bool get allowed =>
      !loading &&
      loadError == null &&
      (demoMode ? DemoBackend.cashEnabled : cashEnabled);
  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Payment Methods')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        if (loading) const LinearProgressIndicator(),
        if (loadError != null) Hint(loadError!),
        const SizedBox(height: 20),
        const Icon(Icons.account_balance_wallet_outlined,
            size: 64, color: kTeal),
        const SizedBox(height: 24),
        const Hint(
            'No payment is collected here. Saving a preference does not set a payment policy or create a booking.'),
        RadioListTile<bool>(
            value: true,
            groupValue: cash,
            onChanged: !allowed ? null : (v) => setState(() => cash = true),
            title: const Text('Cash after service'),
            subtitle: const Text(
                'Payment arrangements must be confirmed with the company.')),
        const ListTile(
            leading: Icon(Icons.credit_card_off),
            title: Text('Card payments'),
            subtitle: Text('Currently unavailable')),
        if (!allowed) const Hint('Cash payments are currently unavailable.'),
        const SizedBox(height: 24),
        PrimaryButton('Save preference',
            onTap: !allowed
                ? null
                : () async {
                    final p = await SharedPreferences.getInstance();
                    await p.setString('paymentPreference', 'cash');
                    if (context.mounted)
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content: Text('Payment preference saved.')));
                  }),
      ]));
}

class RatingPreviewScreen extends StatefulWidget {
  const RatingPreviewScreen({super.key});
  @override
  State<RatingPreviewScreen> createState() => _RatingPreviewState();
}

class _RatingPreviewState extends State<RatingPreviewScreen> {
  int stars = 0;
  bool sent = false, busy = false;
  String? error;
  final note = TextEditingController();
  @override
  void dispose() {
    note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Rate our app')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        const Text('How was your experience?',
            style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        if (error != null) Hint(error!),
        const SizedBox(height: 24),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          for (var i = 1; i <= 5; i++)
            IconButton(
                tooltip: '$i',
                onPressed: () => setState(() {
                      stars = i;
                      sent = false;
                    }),
                icon: Icon(i <= stars ? Icons.star : Icons.star_border,
                    color: kAmber, size: 34))
        ]),
        const SizedBox(height: 20),
        AppField('Your feedback', note, maxLines: 4),
        const SizedBox(height: 24),
        PrimaryButton('Submit feedback',
            busy: busy,
            onTap: stars == 0 || busy
                ? null
                : () async {
                    setState(() {
                      busy = true;
                      error = null;
                    });
                    try {
                      await Api.submitFeedback(stars, note.text);
                      if (mounted) setState(() => sent = true);
                    } catch (e) {
                      if (mounted) setState(() => error = e.toString());
                    } finally {
                      if (mounted) setState(() => busy = false);
                    }
                  }),
        if (sent)
          Padding(
              padding: const EdgeInsets.only(top: 20),
              child: Text(demoMode
                  ? 'Thank you for your feedback.'
                  : 'Thank you. Your feedback was sent to the team.')),
      ]));
}

class HelpPreviewScreen extends StatefulWidget {
  const HelpPreviewScreen({super.key});
  @override
  State<HelpPreviewScreen> createState() => _HelpState();
}

class _HelpState extends State<HelpPreviewScreen> {
  List<Map<String, String>> help = [];
  bool loading = false;
  String? error;
  @override
  void initState() {
    super.initState();
    if (!demoMode) load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final c = await Api.appContent();
      if (mounted)
        setState(() {
          help = (c['help'] as List)
              .map((h) => Map<String, String>.from(h))
              .toList();
          error = null;
        });
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Help and support')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        const Text('How the service works',
            style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        if (loading) const LinearProgressIndicator(),
        if (error != null) ...[
          Hint(error!),
          TextButton(onPressed: load, child: const Text('Retry'))
        ],
        for (final h in (demoMode ? DemoBackend.help : help))
          ExpansionTile(title: Text(Lang.ar ? h['qAr']! : h['q']!), children: [
            Padding(
                padding: const EdgeInsets.all(16),
                child: Text(Lang.ar ? h['answerAr']! : h['answer']!))
          ]),
        const SizedBox(height: 24),
        const Hint(
            'Support contact details are not configured. This screen does not send messages or make calls.'),
      ]));
}
