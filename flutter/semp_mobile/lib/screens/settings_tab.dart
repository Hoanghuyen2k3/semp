import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/threshold_config.dart';
import '../services/prefs_service.dart';

class SettingsTab extends StatefulWidget {
  const SettingsTab({super.key});

  @override
  State<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<SettingsTab> {
  ThresholdConfigData? _cfg;
  EmailSettings _email = EmailSettings(enabled: false, recipientEmail: '');
  bool _loading = true;
  bool _savedFlash = false;
  final _emailCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final c = await PrefsService.loadThreshold();
    var e = await PrefsService.loadEmail();
    final user = Supabase.instance.client.auth.currentUser;
    if (e.recipientEmail.isEmpty && user?.email != null) {
      e = EmailSettings(enabled: e.enabled, recipientEmail: user!.email!);
    }
    _emailCtrl.text = e.recipientEmail;
    setState(() {
      _cfg = c;
      _email = e;
      _loading = false;
    });
  }

  Future<void> _save() async {
    if (_cfg == null) return;
    _email = EmailSettings(enabled: _email.enabled, recipientEmail: _emailCtrl.text.trim());
    await PrefsService.saveThreshold(_cfg!);
    await PrefsService.saveEmail(_email);
    setState(() => _savedFlash = true);
    await Future<void>.delayed(const Duration(milliseconds: 2000));
    if (mounted) setState(() => _savedFlash = false);
  }

  Future<void> _reset() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Reset thresholds?'),
        content: const Text('Restore default threshold values.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Reset')),
        ],
      ),
    );
    if (ok != true) return;
    await PrefsService.clearThreshold();
    final fresh = ThresholdConfigData.defaults;
    setState(() => _cfg = fresh);
  }

  Widget _ruleEditor(BuildContext context, String metric, String direction, ThresholdRule? rule, String unit) {
    if (rule == null) return const SizedBox.shrink();
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Switch(
                value: rule.enabled,
                onChanged: (v) => setState(() => rule.enabled = v),
              ),
              Text(direction == 'above' ? 'Above' : 'Below', style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(width: 12),
              SizedBox(
                width: 80,
                child: TextFormField(
                  initialValue: rule.value.toString(),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(isDense: true, suffixText: unit.isEmpty ? null : unit),
                  onChanged: (s) {
                    final v = double.tryParse(s);
                    if (v != null) rule.value = v;
                  },
                ),
              ),
            ],
          ),
          Row(
            children: [
              Expanded(child: Text(rule.message, style: theme.textTheme.bodySmall)),
              IconButton(
                icon: const Icon(Icons.edit_outlined, size: 20),
                onPressed: () async {
                  final ctrl = TextEditingController(text: rule.message);
                  final ok = await showDialog<bool>(
                    context: context,
                    builder: (c) => AlertDialog(
                      title: const Text('Alert message'),
                      content: TextField(controller: ctrl, maxLines: 2),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                        FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('OK')),
                      ],
                    ),
                  );
                  if (ok == true) setState(() => rule.message = ctrl.text);
                  ctrl.dispose();
                },
              ),
            ],
          ),
          DropdownButton<String>(
            value: rule.severity,
            items: const [
              DropdownMenuItem(value: 'critical', child: Text('Critical')),
              DropdownMenuItem(value: 'warning', child: Text('Warning')),
              DropdownMenuItem(value: 'info', child: Text('Info')),
            ],
            onChanged: (v) {
              if (v != null) setState(() => rule.severity = v);
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_loading || _cfg == null) {
      return const Center(child: CircularProgressIndicator());
    }
    final cfg = _cfg!;

    Widget tile(String title, MetricThresholds mt) {
      return ExpansionTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                if (mt.above != null) _ruleEditor(context, title, 'above', mt.above!, metricUnits[title] ?? ''),
                if (mt.below != null) _ruleEditor(context, title, 'below', mt.below!, metricUnits[title] ?? ''),
              ],
            ),
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Settings', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text(
          'Alert thresholds and email notifications (stored on this device — same keys as the web app for consistency).',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        Text('Alert threshold rules', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        Card(child: Column(children: [
          tile('Temperature', cfg.temperature),
          tile('Humidity', cfg.humidity),
          tile('Soil moisture', cfg.soilMoisture),
          tile('Soil pH', cfg.soilPh),
          tile('Water depth', cfg.waterDepth),
        ])),
        const SizedBox(height: 24),
        Text('Email notifications', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Enable email notifications'),
                  value: _email.enabled,
                  onChanged: (v) => setState(() => _email.enabled = v),
                ),
                TextField(
                  decoration: const InputDecoration(labelText: 'Recipient email', border: OutlineInputBorder()),
                  keyboardType: TextInputType.emailAddress,
                  controller: _emailCtrl,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            OutlinedButton(onPressed: _reset, child: const Text('Reset to defaults')),
            const SizedBox(width: 12),
            FilledButton(onPressed: _save, child: Text(_savedFlash ? 'Saved ✓' : 'Save')),
          ],
        ),
        const SizedBox(height: 32),
      ],
    );
  }
}
