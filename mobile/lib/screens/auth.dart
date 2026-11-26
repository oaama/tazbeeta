import 'package:flutter/material.dart' hide Text;
import '../lang.dart';
import '../api.dart';
import '../demo.dart';
import '../config.dart';
import '../theme.dart';
import '../widgets.dart';
import 'home.dart';
import 'intro.dart';

final _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

class SignupScreen extends StatefulWidget {
  final String role;
  const SignupScreen({super.key, required this.role});
  @override
  State<SignupScreen> createState() => _SignupState();
}

class _SignupState extends State<SignupScreen> {
  final fn = TextEditingController(),
      ln = TextEditingController(),
      em = TextEditingController(),
      pw = TextEditingController(),
      ph = TextEditingController(),
      area = TextEditingController(),
      years = TextEditingController();
  String specialty = 'ac-maintenance';
  bool get isTech => widget.role == 'provider' || widget.role == 'technician';
  bool busy = false, touchedPw = false, agreed = false;
  String? error;

  List<(String, bool)> get rules {
    final p = pw.text, low = p.toLowerCase();
    final f = fn.text.trim().toLowerCase(),
        e = em.text.split('@').first.toLowerCase();
    return [
      ('Must be at least 8 characters', p.length >= 8),
      (
        'Can not include your name or email address',
        p.isNotEmpty &&
            !(f.isNotEmpty && low.contains(f)) &&
            !(e.isNotEmpty && low.contains(e))
      ),
      (
        'Must have at least one symbol or number',
        RegExp(r'[^A-Za-z]').hasMatch(p)
      ),
      ('Can not contain spaces', p.isNotEmpty && !p.contains(RegExp(r'\s'))),
    ];
  }

  bool get strong => rules.every((r) => r.$2);
  bool get valid =>
      demoMode ||
      agreed &&
          fn.text.trim().isNotEmpty &&
          ln.text.trim().isNotEmpty &&
          _emailRe.hasMatch(em.text.trim()) &&
          RegExp(r'^[+0-9 ()-]{7,30}$').hasMatch(ph.text.trim()) &&
          strong;

  Future<void> go() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final signedIn = await Api.register({
        'firstName': fn.text,
        'lastName': ln.text,
        'email': em.text.trim(),
        'password': pw.text,
        'phone': ph.text.trim(),
        'role': isTech ? 'technician' : 'customer',
        if (isTech) ...{
          'specialty': specialty,
          'area': area.text.trim(),
          'years': years.text.trim()
        }
      });
      if (!mounted) return;
      if (!signedIn) {
        setState(() => busy = false);
        Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(
                builder: (_) => VerifyCodeScreen(
                    email: em.text.trim(),
                    next: (_) => const LocationScreen())),
            (_) => false);
        return;
      }
      Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(
              builder: (_) =>
                  isTech ? const HomeShell() : const LocationScreen()),
          (_) => false);
    } on ApiError catch (e) {
      setState(() {
        error = e.message;
        busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isTech)
      return Scaffold(
          appBar: AppBar(title: const Text('Team login')),
          body: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Team accounts are created by company management.'),
            TextButton(
                onPressed: () => Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(
                        builder: (_) => const LoginScreen(team: true))),
                child: const Text('Team login'))
          ])));
    return Scaffold(
      appBar: AppBar(
          title: Text(isTech ? 'Join as a technician' : 'Sign up'),
          leading: const BackButton()),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(children: [
            Expanded(
              child: ListView(children: [
                AppField('First name', fn, onChanged: (_) => setState(() {})),
                const SizedBox(height: 8),
                AppField('Last name', ln, onChanged: (_) => setState(() {})),
                const SizedBox(height: 8),
                AppField('Email', em,
                    keyboard: TextInputType.emailAddress,
                    onChanged: (_) => setState(() {})),
                const SizedBox(height: 8),
                AppField('Phone number', ph,
                    keyboard: TextInputType.phone,
                    onChanged: (_) => setState(() {})),
                if (isTech) ...[
                  const SizedBox(height: 14),
                  const Text('Your specialty',
                      style:
                          TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final (id, label) in [
                      ('ac-maintenance', 'AC Maintenance'),
                      ('appliance-maintenance', 'Electrical Appliances'),
                      ('finishing-renovation', 'Finishing & Renovation'),
                      ('carpentry', 'Carpentry'),
                      ('electrical', 'Electrical Works'),
                      ('painting', 'Painting'),
                      ('plumbing', 'Plumbing'),
                    ])
                      ChoiceChip(
                        label: Text(label),
                        selected: specialty == id,
                        selectedColor: kTeal.withOpacity(.15),
                        onSelected: (_) => setState(() => specialty = id),
                      ),
                  ]),
                  const SizedBox(height: 14),
                  AppField('Work area (city or district)', area,
                      onChanged: (_) => setState(() {})),
                  const SizedBox(height: 8),
                  AppField('Years of experience', years,
                      keyboard: TextInputType.number,
                      onChanged: (_) => setState(() {})),
                  const Hint(
                      'The Tazbeeta team reviews technicians and assigns the jobs.'),
                ],
                const SizedBox(height: 14),
                AppField('Password', pw,
                    secret: true,
                    onChanged: (_) => setState(() => touchedPw = true)),
                if (touchedPw && pw.text.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Row(children: [
                    CircleAvatar(
                        radius: 9,
                        backgroundColor: strong ? kOk : kError,
                        child: Text(strong ? '✓' : '!',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w800))),
                    const SizedBox(width: 10),
                    Text('Password strength: ${strong ? 'excellent' : 'weak'}',
                        style: const TextStyle(fontSize: 13)),
                  ]),
                  if (!strong)
                    for (final r in rules)
                      Padding(
                        padding: const EdgeInsets.only(top: 8, left: 2),
                        child: Row(children: [
                          Text(r.$2 ? '✓' : '✕',
                              style: const TextStyle(
                                  fontSize: 14, fontWeight: FontWeight.w700)),
                          const SizedBox(width: 12),
                          Text(r.$1, style: const TextStyle(fontSize: 13)),
                        ]),
                      ),
                ],
                if (error != null) ErrText(error!),
              ]),
            ),
            if (!demoMode)
              Row(children: [
                Checkbox(
                    key: const ValueKey('agree-terms'),
                    value: agreed,
                    onChanged: (v) => setState(() => agreed = v ?? false)),
                Expanded(
                    child: Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: [
                  const Text('I agree to the'),
                  TextButton(
                      key: const ValueKey('open-terms'),
                      onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const TermsScreen())),
                      child: const Text('Terms and Privacy')),
                ])),
              ]),
            const SizedBox(height: 18),
            PrimaryButton('Continue',
                onTap: valid ? go : null, busy: busy),
          ]),
        ),
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  final bool team;
  const LoginScreen({super.key, this.team = false});
  @override
  State<LoginScreen> createState() => _LoginState();
}

class _LoginState extends State<LoginScreen> {
  final em = TextEditingController(), pw = TextEditingController();
  String? selectedRole;
  @override
  void initState() {
    super.initState();
    selectedRole = widget.team ? 'technician' : 'customer';
  }

  bool busy = false;
  String? error;
  bool get ready =>
      demoMode || _emailRe.hasMatch(em.text.trim()) && pw.text.isNotEmpty;

  Future<void> go() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await Api.login(em.text.trim(), pw.text);
      if (!demoMode &&
          ((widget.team && Api.session.role == 'customer') ||
              (!widget.team && Api.session.role != 'customer')))
        throw ApiError('Use the correct company sign-in entrance.', 403);
      if (demoMode && selectedRole != null)
        await DemoBackend.begin(selectedRole!, email: em.text.trim());
      if (!mounted) return;
      Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(
              builder: (_) => const HomeShell()),
          (_) => false);
    } on ApiError catch (e) {
      if (e.code == 403 && e.message == 'Email not verified') {
        try {
          await Api.resendCode(em.text.trim());
        } on ApiError catch (_) {}
        if (!mounted) return;
        setState(() => busy = false);
        Navigator.push(
            context,
            MaterialPageRoute(
                builder: (_) => VerifyCodeScreen(
                    email: em.text.trim(),
                    next: (_) => const HomeShell())));
        return;
      }
      setState(() {
        error = e.code == 401 ? 'Something went wrong' : e.message;
        busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: Text(widget.team ? 'Team login' : 'Customer login'),
            leading: const BackButton()),
        body: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: ListView(children: [
            const SizedBox(height: 16),
            Center(
              child: Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  color: kTeal.withOpacity(.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.handyman_outlined,
                    size: 46, color: kTeal),
              ),
            ),
            const SizedBox(height: 14),
            const Center(
              child: Text('Tazbeeta | تظبيطه',
                  style:
                      TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
            ),
            const SizedBox(height: 6),
            Center(
              child: Text(
                widget.team
                    ? 'Company team sign-in'
                    : 'Welcome back. Sign in to book a service.',
                style:
                    const TextStyle(fontSize: 15, color: Colors.black54),
              ),
            ),
            const SizedBox(height: 26),
            if (demoMode && widget.team) ...[
              DropdownButtonFormField<String>(
                  initialValue: selectedRole,
                  decoration: InputDecoration(labelText: tr('Account type')),
                  items: [
                    DropdownMenuItem(
                        value: 'technician', child: Text('Technician'))
                  ],
                  onChanged: (v) => setState(() => selectedRole = v)),
              const SizedBox(height: 16)
            ],
            AppField('Email', em,
                keyboard: TextInputType.emailAddress,
                onChanged: (_) => setState(() => error = null)),
            const SizedBox(height: 8),
            AppField('Password', pw,
                secret: true,
                error: error,
                onChanged: (_) => setState(() => error = null)),
            if (error != null)
              Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: ErrText(error!)),
            const SizedBox(height: 26),
            Center(
              child: GestureDetector(
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => ForgotScreen(email: em.text))),
                child: const Text('Forget password?',
                    style: TextStyle(
                        color: kTeal,
                        fontWeight: FontWeight.w700,
                        fontSize: 16)),
              ),
            ),
            const SizedBox(height: 22),
            PrimaryButton('Login', onTap: ready ? go : null, busy: busy),
          ]),
        ),
      );
}

class ForgotScreen extends StatefulWidget {
  final String email;
  const ForgotScreen({super.key, this.email = ''});
  @override
  State<ForgotScreen> createState() => _ForgotState();
}

class _ForgotState extends State<ForgotScreen> {
  late final em = TextEditingController(text: widget.email);
  bool busy = false;
  String? error, done;

  Future<void> go() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final sent = await Api.forgot(em.text.trim());
      setState(() {
        done = sent
            ? 'Your request was sent to the company. They will send you a link to set a new password.'
            : 'Password reset by email is not available yet, so no email was sent. Please contact support to reset your password.';
        busy = false;
      });
    } on ApiError catch (e) {
      setState(() {
        error =
            e.code == 404 ? 'This email address have no account' : e.message;
        busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: const Text('Forget password'), leading: const BackButton()),
        body: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: ListView(children: [
            AppField('Email', em,
                keyboard: TextInputType.emailAddress,
                error: error,
                onChanged: (_) => setState(() {
                      error = null;
                      done = null;
                    })),
            if (error != null) ErrText(error!),
            Hint(demoMode
                ? 'Password recovery is currently unavailable.'
                : 'Enter the email address you used to register.'),
            if (done != null) Hint(done!),
            const SizedBox(height: 14),
            PrimaryButton('Define new password',
                onTap:
                    (demoMode || _emailRe.hasMatch(em.text.trim())) ? go : null,
                busy: busy),
          ]),
        ),
      );
}


/// Terms and privacy text. The company edits it in the dashboard (App content); a default is used when empty.
class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Terms and Privacy')),
        body: FutureBuilder<Map<String, dynamic>>(
          future: Api.appContent(),
          builder: (ctx, s) {
            final c = s.data;
            final ar = Lang.code.value == 'ar';
            final txt = c == null
                ? ''
                : ((ar ? c['termsAr'] : c['terms']) ?? '').toString();
            return SafeArea(
                child: s.connectionState != ConnectionState.done
                    ? const Center(child: CircularProgressIndicator())
                    : SingleChildScrollView(
                        padding: const EdgeInsets.all(20),
                        child: Text(txt.isEmpty
                            ? (ar
                                ? 'تعذر تحميل الشروط. حاول مرة تانية.'
                                : 'Could not load the terms. Try again.')
                            : txt)));
          },
        ),
      );
}


/// Asks for the 6-digit code emailed after sign-up, then signs the user in.
class VerifyCodeScreen extends StatefulWidget {
  final String email;
  final WidgetBuilder next;
  const VerifyCodeScreen({super.key, required this.email, required this.next});
  @override
  State<VerifyCodeScreen> createState() => _VerifyCodeState();
}

class _VerifyCodeState extends State<VerifyCodeScreen> {
  final code = TextEditingController();
  bool busy = false;
  String? error, info;
  DateTime lastSent = DateTime.now();

  Future<void> go() async {
    setState(() {
      busy = true;
      error = null;
      info = null;
    });
    try {
      await Api.verifyEmail(widget.email, code.text.trim());
      if (!mounted) return;
      Navigator.pushAndRemoveUntil(
          context, MaterialPageRoute(builder: widget.next), (_) => false);
    } on ApiError catch (e) {
      setState(() {
        error = e.message;
        busy = false;
      });
    }
  }

  Future<void> resend() async {
    setState(() {
      error = null;
      info = null;
    });
    try {
      await Api.resendCode(widget.email);
      setState(() => info = 'A new code was sent.');
    } on ApiError catch (e) {
      setState(() => error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: const Text('Verify your email'), leading: const BackButton()),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: ListView(children: [
              const SizedBox(height: 16),
              const Text('We sent a 6-digit code to'),
              const SizedBox(height: 4),
              Directionality(
                  textDirection: TextDirection.ltr,
                  child: Text(widget.email,
                      style: const TextStyle(fontWeight: FontWeight.w700))),
              const SizedBox(height: 8),
              const Hint(
                  'Check your inbox and spam folder. The code works for 15 minutes.'),
              const SizedBox(height: 16),
              AppField('Verification code', code,
                  keyboard: TextInputType.number,
                  onChanged: (_) => setState(() {})),
              if (error != null) ErrText(error!),
              if (info != null) Hint(info!),
              const SizedBox(height: 18),
              PrimaryButton('Verify',
                  onTap: RegExp(r'^\d{6}$').hasMatch(code.text.trim())
                      ? go
                      : null,
                  busy: busy),
              TextButton(onPressed: resend, child: const Text('Resend code')),
            ]),
          ),
        ),
      );
}
