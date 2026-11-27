import 'package:flutter/material.dart' hide Text;
import '../lang.dart';
import '../api.dart';
import '../theme.dart';
import '../widgets.dart';
import '../demo.dart';
import 'home.dart';
import 'dart:io';
import 'v4.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileState();
}

class _ProfileState extends State<ProfileScreen> {
  late final first = TextEditingController(text: Api.session.firstName),
      last =
          TextEditingController(text: '${Api.session.user?['lastName'] ?? ''}'),
      phone =
          TextEditingController(text: '${Api.session.user?['phone'] ?? ''}'),
      area = TextEditingController(text: '${Api.session.user?['area'] ?? ''}'),
      bio = TextEditingController(text: '${Api.session.user?['bio'] ?? ''}');
  String? photo = Api.session.user?['photo'] as String?;
  bool saving = false;
  String? error;
  List<dynamic> services = [];
  @override
  void initState() {
    super.initState();
    Api.services().then((s) {
      if (mounted) setState(() => services = s);
    }).catchError((_) {});
  }

  @override
  void dispose() {
    first.dispose();
    last.dispose();
    phone.dispose();
    area.dispose();
    bio.dispose();
    super.dispose();
  }

  Future<void> save() async {
    setState(() {
      saving = true;
      error = null;
    });
    try {
      await Api.saveProfile({
        'firstName': first.text.trim(),
        'lastName': last.text.trim(),
        'phone': phone.text.trim(),
        'area': area.text.trim(),
        'bio': bio.text.trim(),
        if (photo != null) 'photo': photo
      });
      if (mounted) {
        FocusScope.of(context).unfocus();
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Profile saved')));
        setState(() {});
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final u = Api.session.user ?? {};
    final tech = Api.session.role == 'technician';
    return Scaffold(
        appBar: AppBar(title: const Text('My profile')),
        body: ListView(padding: const EdgeInsets.all(20), children: [
          Center(
              child: GestureDetector(
                  onTap: () async {
                    final p = await pickPhoto(context);
                    if (p != null) setState(() => photo = p);
                  },
                  child: Stack(children: [
                    CircleAvatar(
                        radius: 44,
                        backgroundColor: kMist,
                        backgroundImage:
                            photo == null ? null : FileImage(File(photo!)),
                        onBackgroundImageError:
                            photo == null ? null : (_, __) {},
                        child: photo != null
                            ? null
                            : Icon(
                                tech
                                    ? Icons.engineering_outlined
                                    : Icons.person_outline,
                                color: kTeal,
                                size: 40)),
                    PositionedDirectional(
                        end: 0,
                        bottom: 0,
                        child: CircleIcon(Icons.camera_alt, kTeal, size: 28))
                  ]))),
          const SizedBox(height: 6),
          Center(
              child: T('Tap the photo to change it', 'اضغط على الصورة لتغييرها',
                  style: const TextStyle(color: kMuted, fontSize: 11))),
          const SizedBox(height: 12),
          Center(
              child: Text('${Api.session.firstName} ${u['lastName'] ?? ''}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 18))),
          Center(
              child: Text(
                  tech
                      ? 'Company technician'
                      : Api.session.role == 'admin'
                          ? 'Management account'
                          : 'Customer account',
                  style: const TextStyle(color: kMuted, fontSize: 12))),
          const SizedBox(height: 24),
          const Text('Contact details',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 12),
          AppField('First Name', first, onChanged: (_) => setState(() {})),
          const SizedBox(height: 10),
          AppField('Last Name', last, onChanged: (_) => setState(() {})),
          const SizedBox(height: 10),
          AppField('Phone number', phone, keyboard: TextInputType.phone),
          const SizedBox(height: 10),
          if (tech)
            const _TechTags()
          else
            AppField('City or area', area),
          const SizedBox(height: 10),
          AppField('Bio', bio, maxLines: 3),
          Align(
              alignment: AlignmentDirectional.centerEnd,
              child: Text('${bio.text.length}/300',
                  style: const TextStyle(fontSize: 11, color: kMuted))),
          const SizedBox(height: 10),
          ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.mail_outline),
              title: const Text('Email'),
              subtitle: Text(Api.session.email)),
          if (tech) ...[
            const Divider(height: 30),
            const Text('Work profile',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            const Text('Services assigned by management',
                style: TextStyle(color: kMuted, fontSize: 12)),
            const SizedBox(height: 8),
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (final id in (u['skills'] as List? ?? []))
                Chip(
                    label: Text(services.where((s) => s['id'] == id).isEmpty
                        ? id.toString().replaceAll('-', ' ')
                        : svcName(services.firstWhere((s) => s['id'] == id))))
            ]),
            if ((u['skills'] as List? ?? []).isEmpty)
              const Text('No services assigned. Contact management.'),
            const SizedBox(height: 10),
            Text(u['available'] == true
                ? 'Available for jobs'
                : 'Not available'),
            const SizedBox(height: 8),
            const Text(
                'Management controls service permissions and assignments.',
                style: TextStyle(fontSize: 12, color: kMuted))
          ],
          if (error != null) ErrText(error!),
          const SizedBox(height: 20),
          PrimaryButton('Save profile',
              busy: saving,
              onTap: first.text.trim().isNotEmpty && last.text.trim().isNotEmpty
                  ? save
                  : null),
          const SizedBox(height: 14),
          const Text('Your email and account role cannot be changed here.',
              style: TextStyle(fontSize: 12, color: kMuted)),
          if (Api.session.role == 'customer') ...[
            const Divider(height: 30),
            ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.location_on_outlined),
                title: const Text('Saved Addresses'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const AddressesScreen())))
          ],
          const SizedBox(height: 24)
        ]));
  }
}

class ServiceDetailsScreen extends StatelessWidget {
  final Map service;
  const ServiceDetailsScreen({super.key, required this.service});
  String get description => switch (service['id']) {
        'finishing-renovation' =>
          'Tell the company about the space and finishing work you need. The team inspects the site before preparing the scope and price.',
        'ac-maintenance' =>
          'Describe the AC problem, number of units and any symptoms. The team inspects the equipment before sending a repair or maintenance quote.',
        'appliance-maintenance' =>
          'Tell the company which appliance needs attention and describe the fault. Inspection findings determine the proposed work and price.',
        _ =>
          'Describe the work you need. The company reviews your request and arranges an inspection before sending a quote.'
      };
  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: Text(svcName(service))),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: SizedBox(
                height: 205,
                child: servicePhoto(service['id']) ??
                    const ColoredBox(
                        color: kMist,
                        child: Icon(Icons.home_repair_service,
                            size: 64, color: kTeal)))),
        const SizedBox(height: 20),
        Text(svcName(service),
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        Text(description, style: const TextStyle(fontSize: 14, height: 1.8)),
        const SizedBox(height: 22),
        const Text('How your request works',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        for (final (icon, label) in [
          (Icons.edit_note, 'Tell us what you need'),
          (Icons.search, 'Company inspection'),
          (Icons.receipt_long, 'Review the company quote'),
          (Icons.task_alt, 'Accept before work is assigned')
        ])
          ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                  radius: 19,
                  backgroundColor: kMist,
                  child: Icon(icon, size: 21, color: kTeal)),
              title: Text(label, style: const TextStyle(fontSize: 13))),
        const SizedBox(height: 16),
        if (service['startingPrice'] != null)
          Container(
              padding: const EdgeInsets.all(14),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                  color: kMist, borderRadius: BorderRadius.circular(12)),
              child: Row(children: [
                const Icon(Icons.sell_outlined, color: kTeal),
                const SizedBox(width: 10),
                Expanded(
                    child: Text(
                        '${L('Starting from', 'يبدأ من')} ${service['startingPrice']} ${L('EGP', 'ج.م')}\n${L('Final price after inspection.', 'السعر النهائي بعد المعاينة.')}',
                        style: const TextStyle(fontSize: 13, height: 1.6)))
              ])),
        const Text(
            'No final price is set before inspection. Review the scope and price before accepting.',
            style: TextStyle(fontSize: 12, color: kMuted, height: 1.7)),
        const SizedBox(height: 20),
        PrimaryButton('Request inspection',
            onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => NewRequestScreen(service: service)))),
        const SizedBox(height: 24)
      ]));
}

class RequestDetailsScreen extends StatefulWidget {
  final Map request;
  const RequestDetailsScreen({super.key, required this.request});
  @override
  State<RequestDetailsScreen> createState() => _RequestDetailState();
}

class _RequestDetailState extends State<RequestDetailsScreen> {
  late Map r = Map.from(widget.request);
  String? error;
  bool loading = false;
  Future<void> refresh() async {
    setState(() => loading = true);
    try {
      final list = await Api.requests();
      final fresh = list.where((x) => x['id'] == r['id']);
      if (fresh.isNotEmpty) setState(() => r = Map.from(fresh.first));
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = r['quote'] as Map?;
    final tech = Api.session.role == 'technician';
    final stages = [
      'pending',
      'inspection',
      'quoted',
      'approved',
      'assigned',
      'in_progress',
      'completed'
    ];
    final index = stages.indexOf(r['status']);
    return Scaffold(
        appBar: AppBar(title: const Text('Request details'), actions: [
          IconButton(
              tooltip: tr('Refresh'),
              onPressed: loading ? null : refresh,
              icon: const Icon(Icons.refresh))
        ]),
        body: ListView(padding: const EdgeInsets.all(20), children: [
          Text(requestTitle(r),
              style:
                  const TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          Text('#${r['id']}',
              style: const TextStyle(color: kMuted, fontSize: 12)),
          const SizedBox(height: 10),
          Chip(label: Text(statusLabel(r['status']))),
          const SizedBox(height: 14),
          if (r['custom'] == true) ...[
            const Chip(label: Text('Custom service')),
            const Text(
                'The company is reviewing your custom need. Follow up in the team chat.',
                style: TextStyle(fontSize: 12, color: kMuted)),
            const SizedBox(height: 12)
          ],
          if (r['custom'] == true && r['classifiedAt'] != null)
            Text('${tr('Company service')}: ${r['serviceName']}',
                style: const TextStyle(fontSize: 12, color: kMuted)),
          const Text('Your requirement',
              style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(sampleText(r, 'description')),
          const SizedBox(height: 16),
          ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.location_on_outlined),
              title: const Text('Address'),
              subtitle: Text(sampleText(r, 'address'))),
          if (r['visit'] != null)
            Text('${L('Preferred visit', 'الزيارة المفضلة')}: ${visitText(r['visit'] as Map)}',
                style: const TextStyle(fontSize: 12, color: kMuted)),
          if (r['cancelReason'] != null)
            Text('${L('Cancel reason', 'سبب الإلغاء')}: ${r['cancelReason']}',
                style: const TextStyle(fontSize: 12, color: kMuted)),
          if (r['createdAt'] != null)
            Text(
                '${tr('Submitted')}: ${r['createdAt'].toString().split('T').first}',
                style: const TextStyle(fontSize: 12, color: kMuted)),
          const Divider(height: 30),
          const Text('Request progress',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 10),
          if (r['status'] == 'cancelled')
            const Text('Cancelled')
          else
            for (final (i, s) in stages.indexed)
              ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                      i <= index
                          ? Icons.check_circle
                          : Icons.radio_button_unchecked,
                      color: i <= index ? kTeal : kBorder,
                      size: 22),
                  title: Text(statusLabel(s),
                      style: TextStyle(
                          color: i <= index ? kInk : kMuted, fontSize: 13))),
          const Divider(height: 26),
          const Text('Inspection',
              style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(r['inspection'] == null
              ? 'The company will contact you to coordinate the inspection.'
              : '${r['inspection']['note']}'),
          if (q != null) ...[
            const Divider(height: 28),
            const Text('Company quote',
                style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(quoteAmount(q),
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 22, color: kTeal)),
            const SizedBox(height: 8),
            Text('${q['scope']}'),
            const SizedBox(height: 8),
            Text('${tr('Quote version')}: ${q['version']}',
                style: const TextStyle(fontSize: 12, color: kMuted)),
            if (r['quoteAccepted'] != null)
              const Text('Quote accepted', style: TextStyle(color: kTeal)),
            if (r['status'] == 'quoted' && !tech) ...[
              const SizedBox(height: 18),
              OutlinedButton(
                  onPressed: () async {
                    final ok = await Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => QuoteScreen(request: r)));
                    if (ok == true) await refresh();
                  },
                  child: T('Quote details and decline', 'تفاصيل العرض والرفض')),
              const SizedBox(height: 10),
              PrimaryButton('Review and accept quote', onTap: () async {
                final yes = await showDialog<bool>(
                    context: context,
                    builder: (c) => AlertDialog(
                            title: const Text('Accept this quote?'),
                            content: Text('${quoteAmount(q)}\n${q['scope']}'),
                            actions: [
                              TextButton(
                                  onPressed: () => Navigator.pop(c, false),
                                  child: const Text('Back')),
                              FilledButton(
                                  onPressed: () => Navigator.pop(c, true),
                                  child: const Text('Accept quote'))
                            ]));
                if (yes == true) {
                  try {
                    await Api.acceptQuote(r['id'], q['version']);
                    await refresh();
                  } catch (e) {
                    if (mounted) setState(() => error = e.toString());
                  }
                }
              })
            ]
          ],
          if (r['technicianName'] != null) ...[
            const Divider(height: 28),
            const Text('Assigned team member',
                style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Row(children: [
              const CircleAvatar(
                  backgroundColor: kMist, child: Icon(Icons.engineering, color: kTeal)),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${r['technicianName']}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                if (r['technician'] is Map && (r['technician'] as Map)['rating'] != null)
                  Text('★ ${(r['technician'] as Map)['rating']}  (${(r['technician'] as Map)['jobs']})',
                      style: const TextStyle(fontSize: 12, color: kMuted)),
                Text(
                    r['status'] == 'completed'
                        ? L('Job completed', 'الشغل خلص')
                        : r['status'] == 'in_progress'
                            ? L('Working now', 'شغال دلوقتي')
                            : r['onTheWay'] != null
                                ? L('On the way to you', 'في الطريق ليك')
                                : r['techAccepted'] != null
                                    ? L('Accepted the job', 'قبل المهمة')
                                    : L('Assigned, waiting to accept', 'اتعيّن وبانتظار القبول'),
                    style: const TextStyle(fontSize: 12, color: kTeal, fontWeight: FontWeight.w600)),
              ]))
            ])
          ],
          if (!tech && q != null &&
              ['assigned', 'in_progress', 'completed'].contains(r['status'])) ...[
            const Divider(height: 28),
            Row(children: [
              T('Payment', 'الدفع',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              const Spacer(),
              PayChip((r['payment'] as Map?)?['status'] as String?)
            ]),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                  child: OutlinedButton(
                      onPressed: () async {
                        await Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => ((r['payment'] as Map?) == null ||
                                        (r['payment'] as Map)['status'] == 'rejected')
                                    ? PayScreen(request: r)
                                    : PaymentStatusScreen(request: r)));
                        await refresh();
                      },
                      child: T('Pay or view status', 'ادفع أو شوف الحالة'))),
              const SizedBox(width: 8),
              Expanded(
                  child: OutlinedButton(
                      onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => InvoiceScreen(request: r))),
                      child: T('Invoice', 'الفاتورة')))
            ])
          ],
          if (!tech && r['status'] == 'completed' && r['rating'] == null) ...[
            const SizedBox(height: 10),
            PrimaryButton(L('Rate the work', 'قيّم الشغل'), onTap: () async {
              final ok = await Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => RatingScreen(request: r)));
              if (ok == true) await refresh();
            })
          ],
          if (!tech && r['rating'] != null)
            Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Row(children: [
                  for (var i = 1; i <= 5; i++)
                    Icon(
                        i <= ((r['rating'] as Map)['service'] as num)
                            ? Icons.star
                            : Icons.star_border,
                        color: kAmber,
                        size: 20),
                  const SizedBox(width: 8),
                  T('Your rating', 'تقييمك',
                      style: const TextStyle(color: kMuted, fontSize: 12))
                ])),
          if (tech && ['assigned', 'in_progress', 'completed'].contains(r['status']))
            Padding(
                padding: const EdgeInsets.only(top: 10),
                child: PrimaryButton(L('Open task', 'افتح المهمة'),
                    onTap: () async {
                  await Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => TaskDetailsScreen(request: r)));
                  await refresh();
                })),
          if (error != null) ErrText(error!),
          const SizedBox(height: 24),
          OutlinedButton.icon(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => ChatScreen(request: r))),
              icon: const Icon(Icons.chat_outlined),
              label: Text(tech ? 'Chat' : 'Chat with team')),
          const SizedBox(height: 24)
        ]));
  }
}


/// Read-only: the position and areas the company set for this technician.
class _TechTags extends StatefulWidget {
  const _TechTags();
  @override
  State<_TechTags> createState() => _TechTagsState();
}

class _TechTagsState extends State<_TechTags> {
  List<dynamic> all = [];
  @override
  void initState() {
    super.initState();
    Api.tags().then((t) {
      if (mounted) setState(() => all = t);
    });
  }

  String names(String key) {
    final ids = ((Api.session.user?[key] as List?) ?? []).map((e) => '$e').toSet();
    final out = [
      for (final t in all)
        if (ids.contains('${t['id']}'))
          Lang.ar && '${t['nameAr'] ?? ''}'.isNotEmpty ? '${t['nameAr']}' : '${t['name']}'
    ];
    return out.isEmpty ? tr('Not set yet') : out.join(Lang.ar ? '، ' : ', ');
  }

  @override
  Widget build(BuildContext context) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Position',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            Text(names('positionIds')),
            const SizedBox(height: 10),
            const Text('Your areas',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            Text(names('areaIds')),
            const SizedBox(height: 4),
            const Text('Set by the company',
                style: TextStyle(color: kMuted, fontSize: 11)),
          ]);
}
