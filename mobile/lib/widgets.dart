import 'package:flutter/material.dart' hide Text;
import 'lang.dart';
import 'theme.dart';

class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool busy;
  const PrimaryButton(this.label, {super.key, this.onTap, this.busy = false});
  @override
  Widget build(BuildContext context) {
    final on = onTap != null && !busy;
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: Material(
        color: on ? kTeal : kDisabledBg,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: on ? onTap : null,
          child: Center(
            child: busy
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : Text(label,
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: on ? Colors.white : kDisabledFg)),
          ),
        ),
      ),
    );
  }
}

/// Field with a label that floats up inside the box once there is content or focus.
class AppField extends StatefulWidget {
  final String label;
  final TextEditingController controller;
  final bool secret;
  final TextInputType? keyboard;
  final String? error;
  final ValueChanged<String>? onChanged;
  final int maxLines;
  const AppField(this.label, this.controller,
      {super.key,
      this.secret = false,
      this.keyboard,
      this.error,
      this.onChanged,
      this.maxLines = 1});
  @override
  State<AppField> createState() => _AppFieldState();
}

class _AppFieldState extends State<AppField> {
  final focus = FocusNode();
  bool hide = true;
  @override
  void initState() {
    super.initState();
    focus.addListener(() => setState(() {}));
    widget.controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final up = focus.hasFocus || widget.controller.text.isNotEmpty;
    final err = widget.error != null;
    final border =
        err ? kError : (focus.hasFocus ? kTeal.withValues(alpha: .6) : kBorder);
    return Container(
      constraints: const BoxConstraints(minHeight: 54),
      padding: const EdgeInsets.fromLTRB(14, 0, 8, 0),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: border)),
      child: Row(children: [
        Expanded(
          child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (up)
                  Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(widget.label,
                          style: TextStyle(
                              fontSize: 11.5, color: err ? kError : kMuted))),
                TextField(
                  controller: widget.controller,
                  focusNode: focus,
                  obscureText: widget.secret && hide,
                  keyboardType: widget.keyboard,
                  maxLines: widget.secret ? 1 : widget.maxLines,
                  onChanged: widget.onChanged,
                  style: TextStyle(
                      fontSize: 14,
                      color: kInk,
                      fontFamily: Lang.ar ? 'NotoKufi' : 'Inter'),
                  decoration: InputDecoration(
                    isDense: true,
                    border: InputBorder.none,
                    hintText: up ? null : tr(widget.label),
                    hintStyle: TextStyle(
                        fontSize: 14,
                        color: kMuted,
                        fontFamily: Lang.ar ? 'NotoKufi' : 'Inter'),
                    contentPadding:
                        EdgeInsets.only(top: up ? 2 : 17, bottom: up ? 8 : 17),
                  ),
                ),
              ]),
        ),
        if (err)
          const Padding(
              padding: EdgeInsetsDirectional.only(end: 6),
              child: CircleAvatar(
                  radius: 9,
                  backgroundColor: kError,
                  child: Text('!',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w800))))
        else if (widget.secret)
          IconButton(
              onPressed: () => setState(() => hide = !hide),
              icon: Icon(
                  hide
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  size: 20,
                  color: const Color(0xFF475569))),
      ]),
    );
  }
}

class ErrText extends StatelessWidget {
  final String text;
  const ErrText(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Text('* ${trErr(text)}',
          style: const TextStyle(color: kError, fontSize: 15)));
}

class Hint extends StatelessWidget {
  final String text;
  const Hint(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Text(text,
          style: const TextStyle(color: kMuted, fontSize: 14, height: 1.35)));
}

class CircleIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  const CircleIcon(this.icon, this.color, {super.key, this.size = 32});
  @override
  Widget build(BuildContext context) => Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: Icon(icon, size: size * .55, color: Colors.white));
}
