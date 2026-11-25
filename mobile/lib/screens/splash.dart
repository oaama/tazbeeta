import 'dart:math' as math;
import 'package:flutter/material.dart';

/// One entrance only, then the exact approved resting logo. No infinite loop.
class BrandSplash extends StatefulWidget {
  final Widget child;
  const BrandSplash({super.key, required this.child});
  @override
  State<BrandSplash> createState() => _BrandSplashState();
}

class _BrandSplashState extends State<BrandSplash>
    with SingleTickerProviderStateMixin {
  late final AnimationController motion = AnimationController(
      vsync: this, duration: const Duration(milliseconds: 1800));
  bool ready = false;
  bool finished = false;
  bool started = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (started) return;
    started = true;
    final reduced = MediaQuery.of(context).disableAnimations;
    Future.wait([
      precacheImage(const AssetImage('assets/img/wrench.png'), context),
      precacheImage(const AssetImage('assets/img/roller.png'), context),
      precacheImage(const AssetImage('assets/img/wordmark-ar.png'), context),
    ]).then((_) async {
      if (!mounted) return;
      setState(() => ready = true);
      if (reduced) {
        motion.value = 1;
      } else {
        await motion.forward();
      }
      await Future<void>.delayed(const Duration(milliseconds: 450));
      if (mounted) setState(() => finished = true);
    });
  }

  @override
  void dispose() {
    motion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => finished
      ? widget.child
      : Scaffold(
          backgroundColor: Colors.white,
          body: Center(
            child: ready
                ? AnimatedBuilder(
                    animation: motion,
                    builder: (_, __) =>
                        SplashComposition(progress: motion.value),
                  )
                : const SizedBox(width: 220, height: 220),
          ),
        );
}

class SplashComposition extends StatelessWidget {
  final double progress;
  const SplashComposition({super.key, required this.progress});
  @override
  Widget build(BuildContext context) {
    final settle = const Interval(.70, 1, curve: Curves.easeInOutCubic)
        .transform(progress.clamp(0.0, 1.0));
    final markSize = 220.0 - 84.0 * settle;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      SizedBox(
          width: 220,
          height: 220,
          child: Center(
              child: SizedBox(
                  key: const ValueKey('splash-mark-size'),
                  width: markSize,
                  height: markSize,
                  child: FittedBox(child: ToolMark(progress: progress))))),
      const SizedBox(height: 4),
      Opacity(
          opacity: const Interval(.85, 1, curve: Curves.easeOut)
              .transform(progress.clamp(0.0, 1.0)),
          child: Image.asset('assets/img/wordmark-ar.png',
              width: 120, height: 50, fit: BoxFit.contain)),
    ]);
  }
}

/// Draw the approved geometry in place, then fill its original transparent layers.
class ToolMark extends StatelessWidget {
  final double progress;
  const ToolMark({super.key, required this.progress});
  @override
  Widget build(BuildContext context) {
    final p = progress.clamp(0.0, 1.0);
    final fill = const Interval(.66, .94, curve: Curves.easeInOut).transform(p);
    return SizedBox(
        width: 220,
        height: 220,
        child: Stack(children: [
          CustomPaint(size: const Size(220, 220), painter: _DrawTools(p)),
          Opacity(
              opacity: fill,
              child: Stack(children: [
                Image.asset('assets/img/wrench.png', width: 220, height: 220),
                Image.asset('assets/img/roller.png', width: 220, height: 220),
              ])),
        ]));
  }
}

class _DrawTools extends CustomPainter {
  final double progress;
  _DrawTools(this.progress);
  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 256, size.height / 256);
    // Paths follow the approved SVG's coordinates, not a replacement symbol.
    final wrenchHead = Path()
      ..moveTo(167, 102)
      ..cubicTo(145, 80, 151, 42, 179, 32)
      ..lineTo(179, 62)
      ..lineTo(199, 77)
      ..lineTo(220, 63)
      ..lineTo(220, 33)
      ..cubicTo(247, 47, 253, 80, 232, 102)
      ..cubicTo(215, 120, 187, 121, 167, 102)
      ..close();
    final wrenchShaft = Path()
      ..moveTo(55.98, 190.98)
      ..lineTo(91.98, 154.98)
      ..lineTo(116.02, 179.02)
      ..lineTo(80.02, 215.02)
      ..arcToPoint(const Offset(55.98, 190.98),
          radius: const Radius.circular(17), clockwise: true)
      ..close();
    final wrenchUpper = Path()
      ..moveTo(132.98, 113.98)
      ..lineTo(162.98, 83.98)
      ..lineTo(187.02, 108.02)
      ..lineTo(157.02, 138.02)
      ..close();
    final rotate = Matrix4.identity()
      ..translate(120.0, 120.0)
      ..rotateZ(-40 * math.pi / 180)
      ..translate(-120.0, -120.0);
    Path turn(Path p) => p.transform(rotate.storage);
    final rollerFrame = turn(Path()
      ..moveTo(145, 70)
      ..lineTo(160, 70)
      ..lineTo(160, 103)
      ..lineTo(105, 103)
      ..lineTo(105, 129));
    final rollerBody = turn(Path()
      ..addRRect(RRect.fromRectAndRadius(
          const Rect.fromLTWH(41, 49, 108, 42), const Radius.circular(9))));
    final rollerGrip = turn(Path()
      ..addRRect(RRect.fromRectAndRadius(
          const Rect.fromLTWH(93, 123, 24, 91), const Radius.circular(12))));
    final outlines = [
      wrenchShaft,
      wrenchUpper,
      wrenchHead,
      rollerFrame,
      rollerBody,
      rollerGrip
    ];
    final metrics =
        outlines.expand((p) => p.computeMetrics().toList()).toList();
    final total = metrics.fold<double>(0, (n, m) => n + m.length);
    var left = total *
        const Interval(0, .74, curve: Curves.easeInOut).transform(progress);
    final fade = 1 - const Interval(.88, 1).transform(progress);
    final paint = Paint()
      ..color = const Color(0xFF0F8B8D).withValues(alpha: fade)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.8
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (final metric in metrics) {
      if (left <= 0) break;
      canvas.drawPath(
          metric.extractPath(0, math.min(left, metric.length)), paint);
      left -= metric.length;
    }
  }

  @override
  bool shouldRepaint(_DrawTools oldDelegate) =>
      progress != oldDelegate.progress;
}
