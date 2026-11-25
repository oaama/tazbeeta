import 'package:flutter/material.dart' hide Text;
import 'package:shared_preferences/shared_preferences.dart';
import '../lang.dart';
import '../api.dart';
import '../demo.dart';
import '../theme.dart';
import '../widgets.dart';
import 'home.dart';
import 'details.dart';

class TechnicianHome extends StatefulWidget {
  final VoidCallback onJobs, onMessages;
  const TechnicianHome(
      {super.key, required this.onJobs, required this.onMessages});
  @override
  State<TechnicianHome> createState() => _TechnicianHomeState();
}

class _TechnicianHomeState extends State<TechnicianHome> {
  late Future<List<dynamic>> data = Api.requests();
  @override
  Widget build(BuildContext context) => Scaffold(
      appBar:
          AppBar(centerTitle: false, title: const Text('My workday'), actions: [
        IconButton(
            tooltip: tr('Messages'),
            onPressed: widget.onMessages,
            icon: const Icon(Icons.chat_bubble_outline))
      ]),
      body: RefreshIndicator(
          onRefresh: () async {
            setState(() => data = Api.requests());
            await data;
          },
          child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              children: [
                ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: SizedBox(
                        height: 174,
                        child: Stack(fit: StackFit.expand, children: [
                          Image.asset('assets/img/technician-work.jpg',
                              fit: BoxFit.cover,
                              alignment: const Alignment(0, -.3)),
                          const DecoratedBox(
                              decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                      begin: Alignment.topCenter,
                                      end: Alignment.bottomCenter,
                                      colors: [
                                Colors.transparent,
                                Color(0xDD102C35)
                              ]))),
                          PositionedDirectional(
                              start: 18,
                              end: 18,
                              bottom: 16,
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                        '${tr('Welcome back')}, ${Api.session.firstName}',
                                        style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 17,
                                            fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 4),
                                    const Text(
                                        'Your assigned work, all in one place',
                                        style: TextStyle(
                                            color: Colors.white, fontSize: 12))
                                  ]))
                        ]))),
                const SizedBox(height: 16),
                const AvailabilityBar(),
                const SizedBox(height: 18),
                FutureBuilder<List<dynamic>>(
                    future: data,
                    builder: (context, snap) {
                      if (snap.hasError)
                        return Column(children: [
                          const Text('Could not load jobs'),
                          TextButton(
                              onPressed: () =>
                                  setState(() => data = Api.requests()),
                              child: const Text('Retry'))
                        ]);
                      if (!snap.hasData)
                        return const Center(child: CircularProgressIndicator());
                      final jobs = snap.data!;
                      final active = jobs
                          .where((r) =>
                              ['assigned', 'in_progress'].contains(r['status']))
                          .toList();
                      final done =
                          jobs.where((r) => r['status'] == 'completed').length;
                      return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(children: [
                              Expanded(
                                  child: _stat(Icons.assignment_outlined,
                                      'Active jobs', '${active.length}')),
                              const SizedBox(width: 12),
                              Expanded(
                                  child: _stat(
                                      Icons.task_alt, 'Completed', '$done'))
                            ]),
                            const SizedBox(height: 22),
                            Row(children: [
                              const Expanded(
                                  child: Text('Next assignment',
                                      style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700))),
                              TextButton(
                                  onPressed: widget.onJobs,
                                  child: const Text('All jobs'))
                            ]),
                            if (active.isEmpty)
                              const Padding(
                                  padding: EdgeInsets.all(24),
                                  child: Text(
                                      'No active assignments. The team will assign your next job.')),
                            for (final r in active.take(2))
                              Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  clipBehavior: Clip.antiAlias,
                                  decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(color: kBorder)),
                                  child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        SizedBox(
                                            height: 112,
                                            width: double.infinity,
                                            child: servicePhoto(
                                                    r['serviceId']) ??
                                                Image.asset(
                                                    'assets/img/technician-work.jpg',
                                                    fit: BoxFit.cover)),
                                        Padding(
                                            padding: const EdgeInsets.all(14),
                                            child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Row(children: [
                                                    Expanded(
                                                        child: Text(
                                                            requestTitle(r),
                                                            style: const TextStyle(
                                                                fontSize: 15,
                                                                fontWeight:
                                                                    FontWeight
                                                                        .w700))),
                                                    Text(
                                                        statusLabel(
                                                            r['status']),
                                                        style: const TextStyle(
                                                            fontSize: 11,
                                                            color: kTeal))
                                                  ]),
                                                  const SizedBox(height: 8),
                                                  Text(
                                                      sampleText(
                                                          r, 'description'),
                                                      style: const TextStyle(
                                                          fontSize: 13)),
                                                  const SizedBox(height: 6),
                                                  Row(children: [
                                                    const Icon(
                                                        Icons
                                                            .location_on_outlined,
                                                        size: 16,
                                                        color: kMuted),
                                                    const SizedBox(width: 4),
                                                    Expanded(
                                                        child: Text(
                                                            sampleText(
                                                                r, 'address'),
                                                            style:
                                                                const TextStyle(
                                                                    fontSize:
                                                                        12,
                                                                    color:
                                                                        kMuted)))
                                                  ]),
                                                  const SizedBox(height: 12),
                                                  Row(children: [
                                                    Expanded(
                                                        child:
                                                            FilledButton.icon(
                                                                onPressed:
                                                                    () async {
                                                                  await Navigator.push(
                                                                      context,
                                                                      MaterialPageRoute(
                                                                          builder: (_) =>
                                                                              const ProjectsTab()));
                                                                  setState(() =>
                                                                      data = Api
                                                                          .requests());
                                                                },
                                                                icon: const Icon(
                                                                    Icons
                                                                        .arrow_forward,
                                                                    size: 17),
                                                                label: const Text(
                                                                    'Manage job'))),
                                                    const SizedBox(width: 8),
                                                    IconButton.outlined(
                                                        tooltip: tr('Chat'),
                                                        onPressed: () => Navigator.push(
                                                            context,
                                                            MaterialPageRoute(
                                                                builder: (_) =>
                                                                    ChatScreen(
                                                                        request:
                                                                            r))),
                                                        icon: const Icon(
                                                            Icons.chat_outlined,
                                                            size: 20))
                                                  ])
                                                ]))
                                      ])),
                            const SizedBox(height: 8),
                            Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                    color: kMist,
                                    borderRadius: BorderRadius.circular(14)),
                                child: const Row(children: [
                                  Icon(Icons.verified_user_outlined,
                                      color: kTeal),
                                  SizedBox(width: 12),
                                  Expanded(
                                      child: Text(
                                          'The team assigns jobs that match your skills. Update your availability when you finish.',
                                          style: TextStyle(
                                              fontSize: 12, height: 1.6)))
                                ]))
                          ]);
                    })
              ])));
  Widget _stat(IconData icon, String label, String number) => Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: const Color(0xFFF7FAFA),
          border: Border.all(color: kBorder),
          borderRadius: BorderRadius.circular(14)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: kTeal, size: 21),
        const SizedBox(height: 8),
        Text(number,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
        Text(label, style: const TextStyle(fontSize: 12, color: kMuted))
      ]));
}

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsState();
}

class _SettingsState extends State<SettingsScreen> {
  bool jobUpdates = true, messageUpdates = true, loaded = false;
  late final first = TextEditingController(text: Api.session.firstName);
  late final last =
      TextEditingController(text: '${Api.session.user?['lastName'] ?? ''}');
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    if (mounted)
      setState(() {
        jobUpdates = p.getBool('jobUpdates') ?? true;
        messageUpdates = p.getBool('messageUpdates') ?? true;
        loaded = true;
      });
  }

  Future<void> save() async {
    final p = await SharedPreferences.getInstance();
    await p.setBool('jobUpdates', jobUpdates);
    await p.setBool('messageUpdates', messageUpdates);
    if (mounted)
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(tr('Settings saved'))));
  }

  @override
  void dispose() {
    first.dispose();
    last.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        const Text('Account',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 14),
        ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const CircleAvatar(
                backgroundColor: kMist,
                child: Icon(Icons.person_outline, color: kTeal)),
            title: Text(
                '${Api.session.firstName} ${Api.session.user?['lastName'] ?? ''}'),
            subtitle: Text(Api.session.email),
            trailing: const Icon(Icons.edit_outlined),
            onTap: () async {
              await Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const ProfileScreen()));
              if (mounted) setState(() {});
            }),
        ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Account type'),
            trailing: Text(
                Api.session.role == 'technician'
                    ? 'Technician'
                    : Api.session.role == 'admin'
                        ? 'Management account'
                        : 'Customer',
                style: const TextStyle(color: kTeal))),
        const Divider(height: 28),
        const Text('App preferences',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.language),
            title: Text('Language'),
            trailing: LangSwitch()),
        const Divider(height: 28),
        const Text('Notification preferences',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(Api.session.role == 'technician'
                ? 'Job updates'
                : 'Request updates'),
            subtitle: const Text('Status and assignment updates'),
            value: jobUpdates,
            onChanged: loaded ? (v) => setState(() => jobUpdates = v) : null),
        SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Messages'),
            subtitle: const Text('Conversation updates'),
            value: messageUpdates,
            onChanged:
                loaded ? (v) => setState(() => messageUpdates = v) : null),
        const Text(
            'Preferences are saved on this phone. Push delivery is not connected.',
            style: TextStyle(fontSize: 12, color: kMuted)),
        const SizedBox(height: 18),
        PrimaryButton('Save settings', onTap: loaded ? save : null),
        const Divider(height: 36),
        const Text('About Tazbeeta',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Home services from one team'),
        const Text('Eng Angluos Rezq',
            style: TextStyle(fontSize: 12, color: kMuted)),
        const SizedBox(height: 24)
      ]));
}
