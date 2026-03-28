import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../data/threshold_config.dart';

const _kThreshold = 'garden-threshold-config';
const _kEmail = 'garden-email-notification-settings';

class EmailSettings {
  EmailSettings({required this.enabled, required this.recipientEmail});
  bool enabled;
  String recipientEmail;

  Map<String, dynamic> toJson() => {'enabled': enabled, 'recipientEmail': recipientEmail};

  factory EmailSettings.fromJson(Map<String, dynamic> j) {
    return EmailSettings(
      enabled: j['enabled'] == true,
      recipientEmail: j['recipientEmail']?.toString() ?? '',
    );
  }
}

class PrefsService {
  static Future<ThresholdConfigData> loadThreshold() async {
    final p = await SharedPreferences.getInstance();
    return ThresholdConfigData.deserialize(p.getString(_kThreshold));
  }

  static Future<void> saveThreshold(ThresholdConfigData c) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kThreshold, c.serialize());
  }

  static Future<void> clearThreshold() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_kThreshold);
  }

  static Future<EmailSettings> loadEmail() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_kEmail);
    if (raw == null || raw.isEmpty) return EmailSettings(enabled: false, recipientEmail: '');
    try {
      return EmailSettings.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return EmailSettings(enabled: false, recipientEmail: '');
    }
  }

  static Future<void> saveEmail(EmailSettings e) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kEmail, jsonEncode(e.toJson()));
  }
}
