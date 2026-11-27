import 'dart:async';
import 'package:flutter/material.dart' hide Text;
import '../lang.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api.dart';
import '../gps.dart';
import '../config.dart';
import '../demo.dart';
import '../theme.dart';
import '../widgets.dart';
import 'intro.dart';
import 'onboarding.dart';
import 'prototype.dart';
import 'workspace.dart';
import 'details.dart';
import 'v4.dart';

IconData serviceIcon(String slug) => switch (slug) {
      'finishing-renovation' => Icons.format_paint,
      'ac-maintenance' => Icons.ac_unit,
      'appliance-maintenance' => Icons.electrical_services,
      'plumbing' => Icons.plumbing,
      'carpentry' => Icons.carpenter,
      'cleaning' => Icons.cleaning_services,
      'electrical' => Icons.electrical_services,
      'babysitting' => Icons.child_care,
      'laundry' => Icons.local_laundry_service,
      _ => Icons.home_repair_service,
    };
const _photoSlugs = {
  'finishing-renovation',
  'ac-maintenance',
  'appliance-maintenance'
};
Widget? servicePhoto(String slug, {BoxFit fit = BoxFit.cover}) =>
    _photoSlugs.contains(slug)
        ? Image.asset('assets/img/svc_$slug.jpg',
            fit: fit, width: double.infinity, height: double.infinity)
        : null;
const _tints = [
  Color(0xFF7FB6CF),
  Color(0xFFC8A27A),
  Color(0xFF8E9AAF),
  Color(0xFF6E9C9F),
  Color(0xFFD7A8A0)
];

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  late int tab;
  String announcement = '';
  @override
  void initState() {
    super.initState();
    tab = 0;
    if (!demoMode)
      Api.appContent().then((c) {
        if (mounted) setState(() => announcement = c['announcement'] as String);
      }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      if (Api.session.role == 'technician')
        TechnicianHome(
            onJobs: () => setState(() => tab = 1),
            onMessages: () => setState(() => tab = 2))
      else
        const ExploreTab(),
      const ProjectsTab(),
      const MessagesTab(),
      const MoreTab()
    ];
    final items = [
      (
        Icons.home_outlined,
        Icons.home,
        Api.session.role == 'technician' ? 'My workday' : 'Explore'
      ),
      (
        Icons.assignment_outlined,
        Icons.assignment,
        Api.session.user?['role'] == 'technician' ? 'Jobs' : 'Projects'
      ),
      (Icons.chat_outlined, Icons.chat, 'Messages'),
      (Icons.more_horiz, Icons.more_horiz, 'More'),
    ];
    return Scaffold(
      body: Column(children: [
        if (!demoMode && announcement.isNotEmpty)
          Container(
              width: double.infinity,
              color: kMist,
              padding: const EdgeInsets.all(8),
              child: Text(announcement)),
        Expanded(child: IndexedStack(index: tab, children: pages))
      ]),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: kBorder))),
        child: SafeArea(
          child: Row(children: [
            for (final (i, it) in items.indexed)
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => tab = i),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Icon(tab == i ? it.$2 : it.$1,
                          color: tab == i ? kTeal : const Color(0xFF4B5563),
                          size: 26),
                      const SizedBox(height: 2),
                      Text(it.$3,
                          style: TextStyle(
                              fontFamily: 'Poppins',
                              fontSize: 11,
                              color:
                                  tab == i ? kTeal : const Color(0xFF4B5563))),
                    ]),
                  ),
                ),
              ),
          ]),
        ),
      ),
    );
  }
}

// ---------------- Explore ----------------
class ExploreTab extends StatefulWidget {
  const ExploreTab({super.key});
  @override
  State<ExploreTab> createState() => _ExploreState();
}

class _ExploreState extends State<ExploreTab> {
  late Future<List<dynamic>> f = Api.services();
  String greet() {
    final h = DateTime.now().hour;
    return h < 12
        ? 'Good Morning'
        : (h < 18 ? 'Good Afternoon' : 'Good Evening');
  }

  void open(Map s) => Navigator.push(context,
      MaterialPageRoute(builder: (_) => ServiceDetailsScreen(service: s)));

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: f,
      builder: (context, snap) {
        final list = snap.data ?? [];
        final popular = list.where((s) => s['popular'] == true).toList();
        return Column(children: [
          Container(
            color: kTeal,
            padding: EdgeInsets.fromLTRB(
                16, MediaQuery.of(context).padding.top + 8, 16, 12),
            child: Column(children: [
              Row(children: [
                const Icon(Icons.account_circle_outlined,
                    color: Colors.white, size: 22),
                const SizedBox(width: 8),
                Expanded(
                    child: Text('${greet()}, ${Api.session.firstName}',
                        style: const TextStyle(
                            fontFamily: 'Poppins',
                            color: Colors.white,
                            fontSize: 14))),
                IconButton(
                    tooltip: tr('My profile'),
                    onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ProfileScreen())),
                    icon: const Icon(Icons.person_outline,
                        color: Colors.white, size: 22)),
              ]),
              const SizedBox(height: 10),
              GestureDetector(
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => SearchScreen(services: list))),
                child: Container(
                  height: 44,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24)),
                  child: const Row(children: [
                    Icon(Icons.search, size: 22),
                    SizedBox(width: 12),
                    Text('Search for a service',
                        style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 12.5,
                            color: kMuted))
                  ]),
                ),
              ),
            ]),
          ),
          Expanded(
            child: snap.connectionState != ConnectionState.done
                ? const Center(child: CircularProgressIndicator(color: kTeal))
                : snap.hasError
                    ? OfflineView(
                        onRetry: () => setState(() => f = Api.services()))
                    : ListView(padding: EdgeInsets.zero, children: [
                        _SectionHead('Popular Services',
                            onAll: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) =>
                                        SearchScreen(services: list)))),
                        SizedBox(
                          height: 190,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: popular.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: 8),
                            itemBuilder: (_, i) {
                              final s = popular[i] as Map;
                              return GestureDetector(
                                onTap: () => open(s),
                                child: SizedBox(
                                    width: 205,
                                    child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            height: 140,
                                            clipBehavior: Clip.antiAlias,
                                            decoration: BoxDecoration(
                                                color: _tints[i % _tints.length]
                                                    .withValues(alpha: .35),
                                                borderRadius:
                                                    BorderRadius.circular(8)),
                                            child: Stack(
                                                fit: StackFit.expand,
                                                children: [
                                                  servicePhoto(s['id']) ??
                                                      Center(
                                                          child: Icon(
                                                              serviceIcon(
                                                                  s['id']),
                                                              size: 56,
                                                              color: _tints[i %
                                                                  _tints
                                                                      .length])),
                                                ]),
                                          ),
                                          const SizedBox(height: 8),
                                          Text(svcName(s),
                                              style: const TextStyle(
                                                  fontFamily: 'Poppins',
                                                  fontSize: 14)),
                                        ])),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 18),
                        _SectionHead('Browse all categories',
                            onAll: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) =>
                                        SearchScreen(services: list)))),
                        SizedBox(
                          height: 110,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: list.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: 14),
                            itemBuilder: (_, i) => _Category(
                                list[i] as Map, i, () => open(list[i] as Map)),
                          ),
                        ),
                        const SizedBox(height: 30),
                        const Center(
                            child: Text("Don't see what you are looking for?",
                                style: TextStyle(
                                    fontFamily: 'Poppins',
                                    fontSize: 13,
                                    color: kMuted))),
                        Center(
                            child: TextButton(
                                onPressed: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                        builder: (_) =>
                                            SearchScreen(services: list))),
                                child: const Text('View all services',
                                    style: TextStyle(
                                        fontFamily: 'Poppins',
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: kTeal)))),
                      ]),
          ),
          const Padding(
              padding: EdgeInsets.fromLTRB(16, 4, 16, 18),
              child: CustomNeedEntry()),
        ]);
      },
    );
  }
}

class _SectionHead extends StatelessWidget {
  final String t;
  final VoidCallback onAll;
  const _SectionHead(this.t, {required this.onAll});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 12, 12),
        child: Row(children: [
          Expanded(child: Text(t, style: poppinsHead.copyWith(fontSize: 16))),
          TextButton(
              onPressed: onAll,
              child: const Text('View all  ›',
                  style: TextStyle(
                      fontFamily: 'Poppins', fontSize: 12.5, color: kInk))),
        ]),
      );
}

class _Category extends StatelessWidget {
  final Map s;
  final int i;
  final VoidCallback onTap;
  const _Category(this.s, this.i, this.onTap);
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: SizedBox(
            width: 92,
            child: Column(children: [
              ClipOval(
                  child: SizedBox(
                      width: 56,
                      height: 56,
                      child: servicePhoto(s['id']) ??
                          CircleAvatar(
                              radius: 28,
                              backgroundColor: _tints[i % _tints.length]
                                  .withValues(alpha: .4),
                              child: Icon(serviceIcon(s['id']),
                                  color: _tints[i % _tints.length],
                                  size: 28)))),
              const SizedBox(height: 6),
              Text(svcName(s),
                  textAlign: TextAlign.center,
                  maxLines: 3,
                  softWrap: true,
                  style: const TextStyle(
                      fontFamily: 'Poppins', fontSize: 11, height: 1.2)),
            ])),
      );
}

// ---------------- Search ----------------
class SearchScreen extends StatefulWidget {
  final List<dynamic> services;
  const SearchScreen({super.key, required this.services});
  @override
  State<SearchScreen> createState() => _SearchState();
}

class _SearchState extends State<SearchScreen> {
  final q = TextEditingController();
  @override
  void dispose() {
    q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final term = q.text.trim().toLowerCase();
    final hits = widget.services
        .where((s) =>
            term.isNotEmpty &&
            ('${s['name']} ${s['nameAr']}'.toLowerCase().contains(term)))
        .toList();
    void open(Map s) => Navigator.push(context,
        MaterialPageRoute(builder: (_) => ServiceDetailsScreen(service: s)));
    return Scaffold(
      backgroundColor: const Color(0xFFF4F4F4),
      body: SafeArea(
        child: Column(children: [
          CustomNeedEntry(initialNeed: q.text),
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
            child: Row(children: [
              IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back)),
              Expanded(
                child: Container(
                  height: 44,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: kBorder),
                      borderRadius: BorderRadius.circular(22)),
                  child: Row(children: [
                    const Icon(Icons.search, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                        child: TextField(
                            controller: q,
                            autofocus: true,
                            onChanged: (_) => setState(() {}),
                            style: const TextStyle(
                                fontFamily: 'Poppins', fontSize: 13),
                            decoration: InputDecoration(
                                border: InputBorder.none,
                                isDense: true,
                                hintText: tr('Search for a service'),
                                hintStyle: const TextStyle(
                                    fontFamily: 'Poppins',
                                    fontSize: 12.5,
                                    color: kMuted)))),
                  ]),
                ),
              ),
            ]),
          ),
          if (term.isNotEmpty)
            Expanded(
              child: Container(
                color: Colors.white,
                child: hits.isEmpty
                    ? const Center(
                        child: Text('No matching service',
                            style: TextStyle(color: kMuted)))
                    : ListView(children: [
                        for (final s in hits)
                          ListTile(
                              leading: Icon(serviceIcon(s['id']), color: kTeal),
                              title: Text(svcName(s),
                                  style:
                                      const TextStyle(fontFamily: 'Poppins')),
                              onTap: () => open(s as Map))
                      ]),
              ),
            )
          else ...[
            Container(
              color: Colors.white,
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 22),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Popular Searches',
                        style: poppinsHead.copyWith(fontSize: 16)),
                    const SizedBox(height: 12),
                    Wrap(spacing: 8, runSpacing: 8, children: [
                      for (final t in [
                        'AC Maintenance',
                        'Finishing & Renovation',
                        'Electrical Appliance Maintenance'
                      ])
                        GestureDetector(
                          onTap: () =>
                              setState(() => q.text = t.split(' ').first),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 7),
                            decoration: BoxDecoration(
                                border: Border.all(color: kBorder),
                                borderRadius: BorderRadius.circular(18)),
                            child:
                                Row(mainAxisSize: MainAxisSize.min, children: [
                              Text(t,
                                  style: const TextStyle(
                                      fontFamily: 'Poppins', fontSize: 12.5)),
                              const SizedBox(width: 4),
                              const Icon(Icons.north_east, size: 13)
                            ]),
                          ),
                        ),
                    ]),
                  ]),
            ),
            const SizedBox(height: 6),
            Container(
              color: Colors.white,
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Top services',
                        style: poppinsHead.copyWith(fontSize: 16)),
                    const SizedBox(height: 12),
                    Wrap(spacing: 18, children: [
                      for (final (i, s) in widget.services.take(3).indexed)
                        _Category(s as Map, i, () => open(s)),
                    ]),
                  ]),
            ),
          ],
        ]),
      ),
    );
  }
}

// ---------------- New request ----------------
class NewRequestScreen extends StatefulWidget {
  final Map service;
  final bool custom;
  final String initialNeed;
  final Map? prefill;
  const NewRequestScreen(
      {super.key,
      required this.service,
      this.custom = false,
      this.initialNeed = '',
      this.prefill});
  @override
  State<NewRequestScreen> createState() => _NewRequestState();
}

class _NewRequestState extends State<NewRequestScreen> {
  late final desc =
      TextEditingController(text: '${widget.prefill?['description'] ?? ''}');
  Map? visit;
  Map<String, double>? pickedLoc;
  late final need = TextEditingController(text: widget.initialNeed);
  late final phone =
      TextEditingController(text: '${Api.session.user?['phone'] ?? ''}');
  late final addr = TextEditingController(
      text: widget.prefill != null
          ? '${widget.prefill!['address'] ?? ''}'
          : ((Api.session.user?['addresses'] as List?)?.isNotEmpty ?? false)
          ? (Api.session.user!['addresses'][0]['line'] ?? '')
          : '');
  bool busy = false;
  final photoPaths = <String>[];
  String? error;
  List<dynamic> areas = [];
  List<dynamic> all = [];
  String? areaId;
  final place = TextEditingController();
  String? pickedLabel;
  List<dynamic> sugg = [];
  Timer? _deb;
  bool locating = false;
  String? placeNote;
  bool get isCustomer => Api.session.role == 'customer';
  @override
  void initState() {
    super.initState();
    Api.tags().then((all) {
      if (mounted)
        setState(() {
          this.all = all;
          areas = all.where((x) => x['type'] == 'area').toList();
        });
    });
  }

  String _nm(Map a) => Lang.ar && '${a['nameAr'] ?? ''}'.isNotEmpty
      ? '${a['nameAr']}'
      : '${a['name']}';
  String _label(Map p) {
    final par = Lang.ar && '${p['parentNameAr'] ?? ''}'.isNotEmpty
        ? p['parentNameAr']
        : p['parentName'];
    final n = _nm(p);
    return par != null && '$par'.isNotEmpty ? '$n، $par' : n;
  }

  String _norm(String s) => s
      .replaceAll(RegExp('[\u064B-\u0652\u0640]'), '')
      .replaceAll(RegExp('[أإآ]'), 'ا')
      .replaceAll('ى', 'ي')
      .replaceAll('ة', 'ه')
      .toLowerCase()
      .trim();

  void _onPlace(String v) {
    areaId = null;
    pickedLabel = null;
    placeNote = null;
    _deb?.cancel();
    final q = _norm(v);
    if (q.length < 2) {
      setState(() => sugg = []);
      return;
    }
    final byId = {for (final x in all) '${x['id']}': x};
    final local = <Map>[];
    for (final x in all) {
      if (x['type'] != 'village' && x['type'] != 'area') continue;
      final a = _norm('${x['nameAr'] ?? ''}'), e = _norm('${x['name'] ?? ''}');
      if (a.contains(q) || e.contains(q)) {
        final par = byId['${x['parentId']}'];
        local.add({
          'source': 'list',
          ...Map<String, dynamic>.from(x),
          'parentName': par?['name'],
          'parentNameAr': par?['nameAr']
        });
      }
    }
    local.sort((a, b) {
      final sa = _norm('${a['nameAr']}').startsWith(q) ? 0 : 1;
      final sb = _norm('${b['nameAr']}').startsWith(q) ? 0 : 1;
      return sa - sb;
    });
    setState(() => sugg = local.take(8).toList());
    if (q.length >= 3) {
      _deb = Timer(const Duration(milliseconds: 600), () async {
        final r = await Api.placesSearch(v.trim());
        if (!mounted || _norm(place.text) != q) return;
        final osm = r.where((x) => x['source'] == 'osm').toList();
        if (osm.isNotEmpty) setState(() => sugg = [...sugg, ...osm]);
      });
    }
  }

  void _pick(Map p) {
    setState(() {
      if (p['source'] == 'osm') {
        place.text = '${p['nameAr'] ?? ''}'.isNotEmpty ? '${p['nameAr']}' : '${p['name']}';
        areaId = null;
        pickedLabel = place.text;
        if (p['lat'] is num && p['lon'] is num)
          pickedLoc = {'lat': (p['lat'] as num).toDouble(), 'lon': (p['lon'] as num).toDouble()};
      } else {
        areaId = '${p['id']}';
        place.text = _label(p);
        pickedLabel = place.text;
      }
      sugg = [];
    });
  }

  Future<void> useMyLocation() async {
    setState(() {
      locating = true;
      placeNote = null;
    });
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied)
        perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        setState(() => placeNote = tr('Location access was not allowed. Type your village or area instead.'));
        return;
      }
      final p = await Gps.bestFix();
      pickedLoc = {'lat': p.latitude, 'lon': p.longitude};
      final acc = p.accuracy.round();
      final r = await Api.placesReverse(p.latitude, p.longitude);
      final line = '${r?['osm']?['line'] ?? ''}'.trim();
      // Fill the street address too (not only the area), unless the user already typed one.
      if (line.isNotEmpty && addr.text.trim().isEmpty) addr.text = line;
      final accNote = acc > 100
          ? L(' GPS accuracy is low (about $acc m). Go outdoors and tap again, or check the address.', ' دقة الـGPS ضعيفة (حوالي $acc متر). اخرج لمكان مفتوح وجرّب تاني أو راجع العنوان.')
          : '';
      final m = r?['match'];
      if (m is Map) {
        _pick({'source': 'list', ...Map<String, dynamic>.from(m)});
        placeNote = tr('Location detected. You can change the place if it is wrong.') + accNote;
      } else if (r?['osm']?['name'] != null) {
        place.text = '${r!['osm']['name']}';
        areaId = null;
        pickedLabel = place.text;
        placeNote = tr('Location detected. Check the place name or type your own.') + accNote;
      } else {
        placeNote = tr('Location saved, but the place name was not found. Type your village or area.');
      }
    } catch (_) {
      placeNote = tr('Could not get your location. Type your village or area instead.');
    } finally {
      if (mounted) setState(() => locating = false);
    }
  }

  @override
  void dispose() {
    desc.dispose();
    need.dispose();
    phone.dispose();
    addr.dispose();
    place.dispose();
    _deb?.cancel();
    super.dispose();
  }

  Future<void> go() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      Map<String, double>? loc = pickedLoc;
      if (loc == null)
      try {
        // Only a fresh fix (under 15 minutes old) is sent. A stale one is never sent as current: we ask for a new fix,
        // and if that fails the request carries the typed address only (the team then dispatches manually).
        var p = await Geolocator.getLastKnownPosition();
        if (p == null ||
            DateTime.now().difference(p.timestamp).inMinutes >= 15) {
          p = await Geolocator.getCurrentPosition(
              locationSettings: const LocationSettings(
                  accuracy: LocationAccuracy.high,
                  timeLimit: Duration(seconds: 8)));
        }
        if (DateTime.now().difference(p.timestamp).inMinutes < 15)
          loc = {'lat': p.latitude, 'lon': p.longitude};
      } catch (_) {}
      final before = (await Api.requests()).length;
      await Api.createRequest({
        if (!widget.custom) 'serviceId': widget.service['id'],
        if (widget.custom) ...{
          'custom': true,
          'customTitle': need.text.trim(),
          'contactPhone': phone.text.trim()
        },
        'description': desc.text.trim(),
        'address': addr.text.trim(),
        if (areaId != null) 'areaId': areaId,
        if (place.text.trim().isNotEmpty && place.text.trim() != pickedLabel)
          'placeText': place.text.trim(),
        if (loc != null) 'location': loc,
        if (visit != null) 'visit': visit
      });
      if (!mounted) return;
      final all = (await Api.requests()).cast<Map>();
      final created = all.length > before
          ? (all.toList()
                ..sort((a, b) => '${b['createdAt']}'.compareTo('${a['createdAt']}')))
              .first
          : null;
      if (!mounted) return;
      if (created == null) {
        Navigator.pop(context);
        return;
      }
      for (final p in photoPaths) {
        try {
          await Api.uploadPhoto('${created['id']}', 'request', p);
        } catch (_) {}
      }
      Navigator.pushReplacement(
          context,
          MaterialPageRoute(
              builder: (_) => RequestConfirmationScreen(request: created)));
    } on ApiError catch (e) {
      setState(() {
        error = e.message;
        busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: Text(widget.custom
                ? 'Request another service'
                : svcName(widget.service)),
            leading: const BackButton()),
        body: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: ListView(children: [
            if (!isCustomer)
              const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Text('Only customer accounts can create requests.',
                      style: TextStyle(color: kMuted))),
            if (widget.custom) ...[
              const Text('Tell us what you need',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              const Text(
                  'The company will review your need and contact you. Sending this form does not confirm availability, a visit or a price.',
                  style: TextStyle(fontSize: 12, color: kMuted, height: 1.7)),
              const SizedBox(height: 16),
              AppField('Service you need', need,
                  onChanged: (_) => setState(() {})),
              const SizedBox(height: 10),
              AppField('Phone number', phone,
                  keyboard: TextInputType.phone,
                  onChanged: (_) => setState(() {})),
              const SizedBox(height: 8),
              Text('${tr('Email')}: ${Api.session.email}',
                  style: const TextStyle(fontSize: 12, color: kMuted)),
              const SizedBox(height: 16)
            ],
            AppField('What do you need done?', desc,
                maxLines: 5, onChanged: (_) => setState(() {})),
            const SizedBox(height: 8),
            if ((Api.session.user?['addresses'] as List? ?? []).isNotEmpty)
              Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: DropdownButtonFormField<int>(
                      isExpanded: true,
                      decoration: InputDecoration(
                          labelText: tr('Choose a saved address')),
                      items: [
                        for (final (i, a)
                            in (Api.session.user!['addresses'] as List).indexed)
                          DropdownMenuItem(
                              value: i,
                              child: Text('${a['label']}: ${a['line']}',
                                  maxLines: 1, overflow: TextOverflow.ellipsis))
                      ],
                      onChanged: (v) {
                        if (v != null)
                          setState(() => addr.text =
                              Api.session.user!['addresses'][v]['line']);
                      })),
            AppField('Address', addr, onChanged: (_) => setState(() {})),
            Padding(
                padding: const EdgeInsets.only(top: 10),
                child: TextField(
                    controller: place,
                    onChanged: _onPlace,
                    decoration: InputDecoration(
                        labelText: tr('Village, hamlet or area (optional)'),
                        helperText: tr('Type to search. If you do not find it, just write it.'),
                        suffixIcon: locating
                            ? const Padding(
                                padding: EdgeInsets.all(12),
                                child: SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2)))
                            : IconButton(
                                tooltip: tr('Use my location'),
                                icon: const Icon(Icons.my_location),
                                onPressed: useMyLocation)))),
            for (final s in sugg)
              ListTile(
                  dense: true,
                  leading: Icon(s['source'] == 'osm' ? Icons.public : Icons.place_outlined),
                  title: Text(s['source'] == 'osm'
                      ? '${(s['nameAr'] ?? '').toString().isNotEmpty ? s['nameAr'] : s['name']}'
                      : _label(s)),
                  onTap: () => _pick(s)),
            if (placeNote != null)
              Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(placeNote!,
                      style: const TextStyle(fontSize: 12, color: kMuted))),
            if (areas.isNotEmpty)
              Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: DropdownButtonFormField<String>(
                      isExpanded: true,
                      initialValue: areas.any((a) => '${a['id']}' == areaId) ? areaId : null,
                      decoration: InputDecoration(labelText: tr('Area (optional)')),
                      items: [
                        for (final a in areas)
                          DropdownMenuItem(
                              value: '${a['id']}',
                              child: Text(
                                  Lang.ar && '${a['nameAr'] ?? ''}'.isNotEmpty
                                      ? '${a['nameAr']}'
                                      : '${a['name']}'))
                      ],
                      onChanged: (v) => setState(() {
                            areaId = v;
                            place.clear();
                            pickedLabel = null;
                            sugg = [];
                          }))),
            Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton.icon(
                    onPressed: () async {
                      final r = await Navigator.push<Map>(
                          context,
                          MaterialPageRoute(
                              builder: (_) =>
                                  LocationPickerScreen(initial: addr.text)));
                      if (r != null)
                        setState(() {
                          addr.text = '${r['line']}';
                          pickedLoc = (r['location'] as Map?)
                              ?.map((k, v) => MapEntry('$k', (v as num).toDouble()));
                        });
                    },
                    icon: const Icon(Icons.map_outlined, size: 18),
                    label: T('Pick on the map', 'حدد على الخريطة'))),
            const SizedBox(height: 8),
            VisitPicker(value: visit, onChanged: (v) => setState(() => visit = v)),
            const SizedBox(height: 10),
            Row(children: [
              const Icon(Icons.photo_camera_outlined, color: kTeal, size: 20),
              const SizedBox(width: 8),
              Expanded(
                  child: T('Photos of the problem (up to 3, optional)',
                      'صور للمشكلة (لحد 3، اختياري)',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
            ]),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final p in photoPaths) photoThumb(p),
              if (photoPaths.length < 3)
                InkWell(
                    onTap: () async {
                      final p = await pickPhoto(context);
                      if (p != null) setState(() => photoPaths.add(p));
                    },
                    child: Container(
                        width: 76,
                        height: 76,
                        decoration: BoxDecoration(
                            color: kMist, borderRadius: BorderRadius.circular(10)),
                        child: const Icon(Icons.add_a_photo_outlined, color: kTeal)))
            ]),
            if (error != null) ErrText(error!),
            const SizedBox(height: 24),
            PrimaryButton('Send request',
                onTap: isCustomer &&
                        desc.text.trim().length >= 5 &&
                        addr.text.trim().length >= 4 &&
                        (!widget.custom || need.text.trim().length >= 3)
                    ? go
                    : null,
                busy: busy),
          ]),
        ),
      );
}

// ---------------- Projects ----------------
String statusLabel(String s) =>
    const {
      'pending': 'Request received',
      'inspection': 'Inspection recorded',
      'quoted': 'Awaiting your approval',
      'approved': 'Quote accepted',
      'assigned': 'Technician assigned',
      'in_progress': 'In progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    }[s] ??
    s;

class ProjectsTab extends StatefulWidget {
  const ProjectsTab({super.key});
  @override
  State<ProjectsTab> createState() => _ProjectsState();
}

class _ProjectsState extends State<ProjectsTab> {
  String filter = 'all';
  List<dynamic>? items;
  String? err;
  Timer? t;
  @override
  void initState() {
    super.initState();
    load();
    t = Timer.periodic(const Duration(seconds: 15), (_) => load());
  }

  @override
  void dispose() {
    t?.cancel();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final r = await Api.requests();
      if (mounted)
        setState(() {
          items = r;
          err = null;
        });
    } on ApiError catch (e) {
      if (mounted) setState(() => err = e.message);
    }
  }

  Future<void> act(String id, String s) async {
    try {
      await Api.setStatus(id, s);
    } on ApiError catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
    }
    load();
  }

  @override
  Widget build(BuildContext context) {
    final provider = Api.session.role == 'technician';
    final me = Api.session.user?['id'];
    final visible = items
        ?.where((r) =>
            filter == 'all' ||
            filter == 'active' &&
                !['completed', 'cancelled'].contains(r['status']) ||
            r['status'] == filter)
        .toList();
    return Scaffold(
      appBar: AppBar(
          title: Text(provider ? 'Jobs' : 'Projects'),
          automaticallyImplyLeading: false,
          bottom: const PreferredSize(
              preferredSize: Size.fromHeight(1),
              child: Divider(height: 1, color: kBorder))),
      body: Column(children: [
        if (provider) const AvailabilityBar(),
        SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(children: [
              for (final (id, label) in [
                ('all', 'All requests'),
                ('active', 'Active'),
                ('completed', 'Completed'),
                ('cancelled', 'Cancelled')
              ])
                Padding(
                    padding: const EdgeInsetsDirectional.only(end: 8),
                    child: ChoiceChip(
                        label: Text(label),
                        selected: filter == id,
                        onSelected: (_) => setState(() => filter = id)))
            ])),
        if (err != null && items != null)
          ListTile(
              title: Text(err!),
              trailing:
                  TextButton(onPressed: load, child: const Text('Retry'))),
        Expanded(
            child: RefreshIndicator(
          onRefresh: load,
          child: items == null
              ? Center(
                  child: err != null
                      ? Text(err!, style: const TextStyle(color: kMuted))
                      : const CircularProgressIndicator(color: kTeal))
              : visible!.isEmpty
                  ? ListView(children: [
                      const SizedBox(height: 140),
                      Center(
                          child: Text(
                              provider
                                  ? 'No requests in this view'
                                  : 'No requests in this view',
                              style: const TextStyle(color: kMuted)))
                    ])
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: visible.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (_, i) {
                        final r = visible[i] as Map;
                        final st = r['status'] as String;
                        return Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                              border: Border.all(color: kBorder),
                              borderRadius: BorderRadius.circular(12)),
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: SizedBox(
                                        height: 100,
                                        width: double.infinity,
                                        child: servicePhoto(r['serviceId']) ??
                                            const SizedBox())),
                                const SizedBox(height: 12),
                                Row(children: [
                                  CircleIcon(serviceIcon(r['serviceId']), kTeal,
                                      size: 34),
                                  const SizedBox(width: 10),
                                  Expanded(
                                      child: Text(requestTitle(r),
                                          style: poppinsHead.copyWith(
                                              fontSize: 15))),
                                  Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                          color: kDisabledBg,
                                          borderRadius:
                                              BorderRadius.circular(12)),
                                      child: Text(statusLabel(st),
                                          style: const TextStyle(
                                              fontSize: 12,
                                              color: kTeal,
                                              fontWeight: FontWeight.w600))),
                                ]),
                                const SizedBox(height: 10),
                                Text(sampleText(r, 'description'),
                                    style: const TextStyle(
                                        fontSize: 14, height: 1.35)),
                                if ((r['address'] as String).isNotEmpty)
                                  Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: Text(sampleText(r, 'address'),
                                          style: const TextStyle(
                                              fontSize: 12.5, color: kMuted))),
                                if (r['quote'] != null) ...[
                                  const SizedBox(height: 12),
                                  Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                          color: kMist,
                                          borderRadius:
                                              BorderRadius.circular(10)),
                                      child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            const Text('Company quote',
                                                style: TextStyle(
                                                    fontWeight:
                                                        FontWeight.w700)),
                                            Text(quoteAmount(r['quote'] as Map),
                                                style: const TextStyle(
                                                    fontSize: 18,
                                                    fontWeight:
                                                        FontWeight.w700)),
                                            Text('${r['quote']['scope']}',
                                                style: const TextStyle(
                                                    fontSize: 12)),
                                            if (r['status'] == 'quoted' &&
                                                !provider)
                                              FilledButton(
                                                  onPressed: () async {
                                                    final yes = await showDialog<
                                                            bool>(
                                                        context: context,
                                                        builder: (c) =>
                                                            AlertDialog(
                                                                title: const Text(
                                                                    'Accept this quote?'),
                                                                content: Text(
                                                                    '${quoteAmount(r['quote'] as Map)}\n${r['quote']['scope']}'),
                                                                actions: [
                                                                  TextButton(
                                                                      onPressed: () =>
                                                                          Navigator.pop(
                                                                              c,
                                                                              false),
                                                                      child: const Text(
                                                                          'Back')),
                                                                  FilledButton(
                                                                      onPressed: () =>
                                                                          Navigator.pop(
                                                                              c,
                                                                              true),
                                                                      child: const Text(
                                                                          'Accept quote'))
                                                                ]));
                                                    if (yes == true) {
                                                      try {
                                                        await Api.acceptQuote(
                                                            r['id'],
                                                            r['quote']
                                                                ['version']);
                                                        await load();
                                                      } catch (e) {
                                                        if (context.mounted)
                                                          ScaffoldMessenger.of(
                                                                  context)
                                                              .showSnackBar(SnackBar(
                                                                  content: Text(
                                                                      e.toString())));
                                                      }
                                                    }
                                                  },
                                                  child: const Text(
                                                      'Review and accept quote'))
                                          ]))
                                ],
                                const SizedBox(height: 10),
                                OutlinedButton.icon(
                                    onPressed: () async {
                                      await Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                              builder: (_) =>
                                                  RequestDetailsScreen(
                                                      request: r)));
                                      load();
                                    },
                                    icon: const Icon(
                                        Icons.receipt_long_outlined,
                                        size: 18),
                                    label: const Text('Request details')),
                                Row(children: [
                                  if (r['technicianId'] != null ||
                                      r['customerId'] == me)
                                    TextButton(
                                        onPressed: () => Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                                builder: (_) =>
                                                    ChatScreen(request: r))),
                                        child: const Text('Chat with team')),
                                  const Spacer(),
                                  if (provider &&
                                      st == 'assigned' &&
                                      r['technicianId'] == me)
                                    TextButton(
                                        onPressed: () async {
                                          await Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                  builder: (_) =>
                                                      TaskDetailsScreen(
                                                          request: r)));
                                          load();
                                        },
                                        child: const Text('Open task')),
                                  if (provider &&
                                      st == 'in_progress' &&
                                      r['technicianId'] == me)
                                    TextButton(
                                        onPressed: () async {
                                          await Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                  builder: (_) =>
                                                      TaskDetailsScreen(
                                                          request: r)));
                                          load();
                                        },
                                        child: const Text('Open task')),
                                  if (!provider &&
                                      [
                                        'pending',
                                        'inspection',
                                        'quoted',
                                        'approved',
                                        'assigned'
                                      ].contains(st))
                                    TextButton(
                                        onPressed: () async {
                                          if (await cancelWithReason(context, r))
                                            load();
                                        },
                                        child: const Text('Cancel',
                                            style: TextStyle(color: kError))),
                                ]),
                              ]),
                        );
                      },
                    ),
        ))
      ]),
    );
  }
}

// ---------------- Messages ----------------
class MessagesTab extends StatefulWidget {
  const MessagesTab({super.key});
  @override
  State<MessagesTab> createState() => _MessagesState();
}

class _MessagesState extends State<MessagesTab> {
  List<dynamic>? items;
  String? error;
  Timer? t;
  @override
  void initState() {
    super.initState();
    load();
    t = Timer.periodic(const Duration(seconds: 10), (_) => load());
  }

  @override
  void dispose() {
    t?.cancel();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final r = await Api.conversations();
      if (mounted)
        setState(() {
          items = r;
          error = null;
        });
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: const Text('Messages'),
            automaticallyImplyLeading: false,
            bottom: const PreferredSize(
                preferredSize: Size.fromHeight(1),
                child: Divider(height: 1, color: kBorder))),
        body: error != null
            ? Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(error!),
                TextButton(onPressed: load, child: const Text('Retry'))
              ]))
            : items == null
                ? const Center(child: CircularProgressIndicator(color: kTeal))
                : items!.isEmpty
                    ? const Center(
                        child: Text('No messages yet',
                            style: TextStyle(color: kMuted)))
                    : ListView(children: [
                        for (final c in items!)
                          ListTile(
                            leading: CircleIcon(
                                serviceIcon(c['request']['serviceId']), kTeal,
                                size: 40),
                            title: Text(requestTitle(c['request'] as Map),
                                style: const TextStyle(
                                    fontFamily: 'Poppins',
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600)),
                            subtitle: Text(sampleText(c['last'] as Map, 'text'),
                                maxLines: 1, overflow: TextOverflow.ellipsis),
                            onTap: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                        builder: (_) => ChatScreen(
                                            request: c['request'] as Map)))
                                .then((_) => load()),
                          ),
                      ]),
      );
}

class ChatScreen extends StatefulWidget {
  final Map request;
  const ChatScreen({super.key, required this.request});
  @override
  State<ChatScreen> createState() => _ChatState();
}

class _ChatState extends State<ChatScreen> {
  List<dynamic> msgs = [];
  String? error;
  bool sending = false, loading = true;
  final c = TextEditingController();
  Timer? t;
  @override
  void initState() {
    super.initState();
    load();
    t = Timer.periodic(const Duration(seconds: 4), (_) => load());
  }

  @override
  void dispose() {
    t?.cancel();
    c.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final r = await Api.messages(widget.request['id']);
      if (mounted)
        setState(() {
          msgs = r;
          error = null;
          loading = false;
        });
    } catch (e) {
      if (mounted)
        setState(() {
          error = e.toString();
          loading = false;
        });
    }
  }

  Future<void> send() async {
    final text = c.text.trim();
    if (text.isEmpty || sending) return;
    setState(() => sending = true);
    try {
      await Api.send(widget.request['id'], text);
      if (c.text.trim() == text) c.clear();
    } on ApiError catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
    }
    if (mounted) setState(() => sending = false);
    load();
  }

  @override
  Widget build(BuildContext context) {
    final me = Api.session.user?['id'];
    return Scaffold(
      appBar: AppBar(
          title: Text(requestTitle(widget.request)),
          leading: const BackButton()),
      body: Column(children: [
        if (error != null)
          ListTile(
              title: Text(error!),
              trailing:
                  TextButton(onPressed: load, child: const Text('Retry'))),
        if (loading) const LinearProgressIndicator(),
        if (!loading && msgs.isEmpty && error == null)
          const Padding(
              padding: EdgeInsets.all(20), child: Text('No messages yet')),
        Expanded(
          child: ListView.builder(
            reverse: true,
            padding: const EdgeInsets.all(14),
            itemCount: msgs.length,
            itemBuilder: (_, i) {
              final m = msgs[msgs.length - 1 - i] as Map;
              final mine = m['senderId'] == me;
              if (m['system'] == true || m['senderRole'] == 'system') {
                return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Center(
                        child: Text(sampleText(m, 'text'),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontSize: 12, color: kMuted))));
              }
              final role = '${m['senderRole'] ?? ''}';
              final who = role == 'admin'
                  ? tr('Tazbeeta team')
                  : '${m['senderName'] ?? ''}';
              return Align(
                alignment: mine
                    ? AlignmentDirectional.centerEnd
                    : AlignmentDirectional.centerStart,
                child: Column(
                  crossAxisAlignment: mine
                      ? CrossAxisAlignment.end
                      : CrossAxisAlignment.start,
                  children: [
                    if (!mine && who.isNotEmpty)
                      Padding(
                          padding: const EdgeInsets.only(top: 4, left: 4, right: 4),
                          child: Text(who,
                              style: const TextStyle(
                                  fontSize: 11, color: kMuted))),
                    Container(
                      margin: const EdgeInsets.symmetric(vertical: 3),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 13, vertical: 9),
                      constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * .75),
                      decoration: BoxDecoration(
                          color: mine ? kTeal : kDisabledBg,
                          borderRadius: BorderRadius.circular(14)),
                      child: Text(sampleText(m, 'text'),
                          style: TextStyle(
                              color: mine ? Colors.white : kInk,
                              fontSize: 14.5)),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
            child: Row(children: [
              Expanded(
                  child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                          border: Border.all(color: kBorder),
                          borderRadius: BorderRadius.circular(24)),
                      child: TextField(
                          controller: c,
                          onSubmitted: (_) => send(),
                          decoration: InputDecoration(
                              border: InputBorder.none,
                              hintText: tr('Message'),
                              hintStyle: TextStyle(color: kMuted))))),
              const SizedBox(width: 8),
              IconButton.filled(
                  onPressed: sending ? null : send,
                  style: IconButton.styleFrom(backgroundColor: kTeal),
                  icon: const Icon(Icons.send, color: Colors.white, size: 20)),
            ]),
          ),
        ),
      ]),
    );
  }
}

// ---------------- More ----------------
class MoreTab extends StatelessWidget {
  const MoreTab({super.key});
  @override
  Widget build(BuildContext context) {
    Widget item(IconData i, Color c, String t, VoidCallback onTap) => ListTile(
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
          leading: CircleIcon(i, c, size: 32),
          title: Text(t,
              style: const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 14,
                  color: Color(0xFF12313A))),
          onTap: onTap,
        );
    return Scaffold(
      appBar: AppBar(
          title: const Text('More',
              style: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 14,
                  fontWeight: FontWeight.w600)),
          automaticallyImplyLeading: false,
          bottom: const PreferredSize(
              preferredSize: Size.fromHeight(1),
              child: Divider(height: 1, color: kBorder))),
      body: ListView(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
          child: Row(children: [
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text('Hello, ${Api.session.firstName}',
                      style: poppinsHead.copyWith(
                          fontSize: 19,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF12313A))),
                  const SizedBox(height: 2),
                  Text(Api.session.email,
                      style: const TextStyle(
                          fontFamily: 'Poppins', fontSize: 12, color: kMuted)),
                ])),
            Container(
                width: 52,
                height: 52,
                decoration: const BoxDecoration(
                    color: Color(0xFFF3F4F6), shape: BoxShape.circle),
                child: const Icon(Icons.person, size: 26)),
          ]),
        ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 20),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
              color: const Color(0xFFE6F4F3),
              borderRadius: BorderRadius.circular(6)),
          child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Service from one team',
                    style: TextStyle(
                        fontFamily: 'Poppins',
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: Color(0xFF12313A))),
                SizedBox(height: 6),
                SizedBox(
                    width: 220,
                    child: Text(
                        'The company receives your request and assigns the right technician.',
                        style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 12.5,
                            color: kMuted,
                            height: 1.4))),
              ]),
        ),
        item(Icons.person_outline, kTeal, 'My profile', () async {
          await Navigator.push(context,
              MaterialPageRoute(builder: (_) => const ProfileScreen()));
          if (context.mounted) (context as Element).markNeedsBuild();
        }),
        const SizedBox(height: 14),
        const Divider(height: 1, color: kBorder),
        const SizedBox(height: 6),
        item(
            Icons.notifications_none,
            kAmber,
            L('Notifications', 'الإشعارات'),
            () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const NotificationsScreen()))),
        item(
            Icons.history,
            const Color(0xFF4A5A85),
            Api.session.role == 'technician'
                ? L('Task history', 'سجل المهام')
                : L('Previous orders', 'الطلبات السابقة'),
            () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const HistoryScreen()))),
        if (Api.session.role == 'technician')
          item(
              Icons.account_balance_wallet_outlined,
              kOk,
              L('Earnings', 'المستحقات'),
              () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const EarningsScreen()))),
        if (Api.session.role != 'technician')
          item(
              Icons.credit_card,
              const Color(0xFF0F8B8D),
              L('Payment methods', 'طرق الدفع'),
              () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const PaymentMethodsScreen()))),
        if (Api.session.role != 'technician')
          item(
              Icons.support_agent,
              const Color(0xFFE5251B),
              L('Complaint and support', 'الشكاوى والدعم'),
              () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const ComplaintScreen()))),
        if (Api.session.role != 'technician')
          item(
              Icons.location_on,
              const Color(0xFF4A5A85),
              'Saved Addresses',
              () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const AddressesScreen()))),
        item(
            Icons.star,
            const Color(0xFFF5A623),
            'Rate our app',
            () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const RatingPreviewScreen()))),
        item(
            Icons.info,
            const Color(0xFF0F8B8D),
            'About Us',
            () => showAboutDialog(
                context: context,
                applicationName: 'Tazbeeta',
                applicationVersion: '0.5.0',
                children: const [Text('Eng Angluos Rezq')])),
        item(
            Icons.settings_outlined,
            kTeal,
            'Settings',
            () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const SettingsScreen()))),
        ListTile(
            leading: const Icon(Icons.language, color: Color(0xFF0A5A5E)),
            title: const Text('Language',
                style: TextStyle(fontFamily: 'Poppins', fontSize: 14)),
            trailing: const LangSwitch()),
        item(
            Icons.help_outline,
            kTeal,
            'Help and support',
            () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const HelpPreviewScreen()))),
        item(Icons.chat, const Color(0xFF25D366), 'WhatsApp support', () async {
          var num = '201202422997';
          try {
            final c = await Api.appContent();
            if ('${c['whatsapp'] ?? ''}'.isNotEmpty) num = '${c['whatsapp']}';
          } catch (_) {}
          await launchUrl(Uri.parse('https://wa.me/$num'),
              mode: LaunchMode.externalApplication);
        }),
        item(Icons.privacy_tip_outlined, kTeal, 'Privacy policy', () => launchUrl(
            Uri.parse('$apiBase/privacy'),
            mode: LaunchMode.externalApplication)),
        item(Icons.description_outlined, kTeal, 'Terms of service', () => launchUrl(
            Uri.parse('$apiBase/terms'),
            mode: LaunchMode.externalApplication)),
        item(Icons.delete_outline, const Color(0xFFB3261E), 'Delete account', () async {
          final pw = TextEditingController();
          final ok = await showDialog<bool>(
              context: context,
              builder: (c) => AlertDialog(
                    title: T('Delete account', 'حذف الحساب'),
                    content: Column(mainAxisSize: MainAxisSize.min, children: [
                      T('This permanently deletes your account, addresses, photos and messages. Enter your password to confirm.',
                          'ده هيحذف حسابك وعناوينك وصورك ورسايلك نهائيًا. اكتب كلمة المرور للتأكيد.'),
                      TextField(
                          controller: pw,
                          obscureText: true,
                          decoration: InputDecoration(hintText: tr('Password'))),
                    ]),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(c, false),
                          child: T('Cancel', 'إلغاء')),
                      TextButton(
                          onPressed: () => Navigator.pop(c, true),
                          child: T('Delete', 'حذف',
                              style: const TextStyle(color: Color(0xFFB3261E)))),
                    ],
                  ));
          if (ok != true) return;
          try {
            await Api.deleteAccount(pw.text);
            await Api.logout();
            if (context.mounted)
              Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                  (_) => false);
          } on ApiError catch (e) {
            if (context.mounted)
              ScaffoldMessenger.of(context)
                  .showSnackBar(SnackBar(content: Text(e.message)));
          }
        }),
        item(Icons.logout, const Color(0xFF9CA3AF), 'Log out', () async {
          await Api.logout();
          if (context.mounted)
            Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                (_) => false);
        }),
      ]),
    );
  }
}

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});
  @override
  State<AddressesScreen> createState() => _AddressesState();
}

class _AddressesState extends State<AddressesScreen> {
  late List<Map<String, String>> list =
      ((Api.session.user?['addresses'] as List?) ?? [])
          .map((a) => {'label': '${a['label']}', 'line': '${a['line']}'})
          .toList();
  bool busy = false;
  String? error;
  Future<void> save(List<Map<String, String>> next) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await Api.saveAddresses(next);
      if (mounted) setState(() => list = next);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> edit([int? index]) async {
    final label =
        TextEditingController(text: index == null ? '' : list[index]['label']);
    final line =
        TextEditingController(text: index == null ? '' : list[index]['line']);
    final value = await showDialog<Map<String, String>>(
        context: context,
        builder: (d) => StatefulBuilder(
            builder: (d, update) => AlertDialog(
                    title: Text(index == null ? 'Add address' : 'Edit address'),
                    content: Column(mainAxisSize: MainAxisSize.min, children: [
                      AppField('Address label', label,
                          onChanged: (_) => update(() {})),
                      const SizedBox(height: 12),
                      AppField('Full address', line,
                          maxLines: 3, onChanged: (_) => update(() {}))
                    ]),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(d),
                          child: const Text('Back')),
                      FilledButton(
                          onPressed: label.text.trim().isEmpty ||
                                  line.text.trim().length < 4
                              ? null
                              : () => Navigator.pop(d, {
                                    'label': label.text.trim(),
                                    'line': line.text.trim()
                                  }),
                          child: const Text('Save'))
                    ])));
    if (value != null) {
      final next = List<Map<String, String>>.from(list);
      if (index == null)
        next.add(value);
      else
        next[index] = value;
      await save(next);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Saved Addresses')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        if (list.isEmpty)
          const Padding(
              padding: EdgeInsets.symmetric(vertical: 35),
              child: Text('No saved addresses yet')),
        for (final (i, a) in list.indexed)
          Card(
              elevation: 0,
              color: kMist,
              child: ListTile(
                  leading: const Icon(Icons.location_on_outlined, color: kTeal),
                  title: Text(a['label']!),
                  subtitle: Text(a['line']!),
                  onTap: busy ? null : () => edit(i),
                  trailing: IconButton(
                      tooltip: tr('Delete'),
                      icon: const Icon(Icons.delete_outline, size: 20),
                      onPressed: busy
                          ? null
                          : () async {
                              final yes = await showDialog<bool>(
                                  context: context,
                                  builder: (d) => AlertDialog(
                                          title: const Text('Delete address?'),
                                          content: Text(a['line']!),
                                          actions: [
                                            TextButton(
                                                onPressed: () =>
                                                    Navigator.pop(d, false),
                                                child: const Text('Back')),
                                            FilledButton(
                                                onPressed: () =>
                                                    Navigator.pop(d, true),
                                                child: const Text('Delete'))
                                          ]));
                              if (yes == true) {
                                final next =
                                    List<Map<String, String>>.from(list)
                                      ..removeAt(i);
                                await save(next);
                              }
                            }))),
        if (error != null) ErrText(error!),
        const SizedBox(height: 20),
        PrimaryButton('Add address',
            busy: busy, onTap: list.length < 10 ? () => edit() : null),
        const SizedBox(height: 12),
        const Text('Tap an address to edit it.',
            style: TextStyle(fontSize: 12, color: kMuted))
      ]));
}

/// Technician availability. Location is shared only when the technician taps the button (one-shot, no background tracking).
class AvailabilityBar extends StatefulWidget {
  const AvailabilityBar({super.key});
  @override
  State<AvailabilityBar> createState() => _AvailabilityBarState();
}

class _AvailabilityBarState extends State<AvailabilityBar> {
  bool busy = false;
  String? note;
  bool get on => Api.session.user?['available'] == true;

  Future<void> toggle(bool v) async {
    setState(() {
      busy = true;
      note = null;
    });
    try {
      await Api.setAvailability(v);
    } on ApiError catch (e) {
      note = e.message;
    }
    if (mounted) setState(() => busy = false);
  }

  Future<void> share() async {
    if (demoMode) {
      setState(() => note = 'Sample location selected. Nothing was shared.');
      return;
    }
    setState(() {
      busy = true;
      note = null;
    });
    try {
      final p = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high,
              timeLimit: Duration(seconds: 15)));
      await Api.setAvailability(on, lat: p.latitude, lon: p.longitude);
      note = 'Location shared just now.';
    } on ApiError catch (e) {
      note = e.message;
    } catch (_) {
      note = 'Could not get your location. Check permission and GPS.';
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: kBorder))),
        child: Column(children: [
          Row(children: [
            Expanded(
                child: Text(on ? 'Available for jobs' : 'Not available',
                    style: poppinsHead.copyWith(fontSize: 14))),
            Switch(
                value: on, activeColor: kTeal, onChanged: busy ? null : toggle),
          ]),
          Row(children: [
            Expanded(
                child: Text(
                    note ??
                        'Share your location so the team can find the nearest technician.',
                    style: const TextStyle(fontSize: 12, color: kMuted))),
            TextButton(
                onPressed: busy ? null : share,
                child: const Text('Share location')),
          ]),
        ]),
      );
}

class CustomNeedEntry extends StatelessWidget {
  final String initialNeed;
  const CustomNeedEntry({super.key, this.initialNeed = ''});
  @override
  Widget build(BuildContext context) => Card(
      elevation: 0,
      color: kMist,
      child: ListTile(
          leading: const Icon(Icons.add_task, color: kTeal),
          title: const Text("Can't find your service?",
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          subtitle: const Text('Describe your need to the company',
              style: TextStyle(fontSize: 11)),
          trailing: const Icon(Icons.chevron_right, color: kTeal),
          onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => NewRequestScreen(
                      service: const {},
                      custom: true,
                      initialNeed: initialNeed)))));
}
