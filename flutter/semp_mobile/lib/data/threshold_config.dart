import 'dart:convert';

class ThresholdRule {
  ThresholdRule({
    required this.value,
    required this.message,
    required this.severity,
    required this.enabled,
  });

  double value;
  String message;
  String severity;
  bool enabled;

  Map<String, dynamic> toJson() => {
        'value': value,
        'message': message,
        'severity': severity,
        'enabled': enabled,
      };

  factory ThresholdRule.fromJson(Map<String, dynamic> j) {
    return ThresholdRule(
      value: (j['value'] as num?)?.toDouble() ?? 0,
      message: j['message']?.toString() ?? '',
      severity: j['severity']?.toString() ?? 'warning',
      enabled: j['enabled'] != false,
    );
  }

  ThresholdRule copy() =>
      ThresholdRule(value: value, message: message, severity: severity, enabled: enabled);
}

class MetricThresholds {
  MetricThresholds({this.above, this.below});
  ThresholdRule? above;
  ThresholdRule? below;

  Map<String, dynamic> toJson() => {
        if (above != null) 'above': above!.toJson(),
        if (below != null) 'below': below!.toJson(),
      };
}

class ThresholdConfigData {
  ThresholdConfigData({
    required this.temperature,
    required this.humidity,
    required this.soilMoisture,
    required this.soilPh,
    required this.waterDepth,
  });

  MetricThresholds temperature;
  MetricThresholds humidity;
  MetricThresholds soilMoisture;
  MetricThresholds soilPh;
  MetricThresholds waterDepth;

  static ThresholdConfigData get defaults {
    return ThresholdConfigData(
      temperature: MetricThresholds(
        above: ThresholdRule(value: 35, message: 'Temperature too high', severity: 'critical', enabled: true),
        below: ThresholdRule(value: 5, message: 'Temperature too low', severity: 'warning', enabled: true),
      ),
      humidity: MetricThresholds(
        below: ThresholdRule(value: 20, message: 'Humidity too low (dry)', severity: 'warning', enabled: true),
        above: ThresholdRule(value: 95, message: 'Humidity too high', severity: 'info', enabled: true),
      ),
      soilMoisture: MetricThresholds(
        below: ThresholdRule(
            value: 15, message: 'Soil moisture too low – plants may need water', severity: 'critical', enabled: true),
      ),
      soilPh: MetricThresholds(
        below: ThresholdRule(value: 5, message: 'Soil pH too acidic', severity: 'warning', enabled: true),
        above: ThresholdRule(value: 8.5, message: 'Soil pH too alkaline', severity: 'warning', enabled: true),
      ),
      waterDepth: MetricThresholds(
        below: ThresholdRule(
            value: 5, message: 'Water level too low – reservoir needs refill', severity: 'critical', enabled: true),
      ),
    );
  }

  ThresholdConfigData clone() {
    ThresholdRule? rc(ThresholdRule? r) => r?.copy();
    return ThresholdConfigData(
      temperature: MetricThresholds(above: rc(temperature.above), below: rc(temperature.below)),
      humidity: MetricThresholds(above: rc(humidity.above), below: rc(humidity.below)),
      soilMoisture: MetricThresholds(above: rc(soilMoisture.above), below: rc(soilMoisture.below)),
      soilPh: MetricThresholds(above: rc(soilPh.above), below: rc(soilPh.below)),
      waterDepth: MetricThresholds(above: rc(waterDepth.above), below: rc(waterDepth.below)),
    );
  }

  Map<String, dynamic> toJson() => {
        'Temperature': temperature.toJson(),
        'Humidity': humidity.toJson(),
        'Soil moisture': soilMoisture.toJson(),
        'Soil pH': soilPh.toJson(),
        'Water depth': waterDepth.toJson(),
      };

  String serialize() => jsonEncode(toJson());

  static ThresholdConfigData deserialize(String? raw) {
    if (raw == null || raw.isEmpty) return ThresholdConfigData.defaults;
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      final d = ThresholdConfigData.defaults.clone();
      void patch(String key, MetricThresholds target) {
        final o = j[key];
        if (o is! Map) return;
        final m = Map<String, dynamic>.from(o);
        if (m['above'] is Map && target.above != null) {
          final r = ThresholdRule.fromJson(Map<String, dynamic>.from(m['above'] as Map));
          target.above!
            ..value = r.value
            ..message = r.message
            ..severity = r.severity
            ..enabled = r.enabled;
        }
        if (m['below'] is Map && target.below != null) {
          final r = ThresholdRule.fromJson(Map<String, dynamic>.from(m['below'] as Map));
          target.below!
            ..value = r.value
            ..message = r.message
            ..severity = r.severity
            ..enabled = r.enabled;
        }
      }

      patch('Temperature', d.temperature);
      patch('Humidity', d.humidity);
      patch('Soil moisture', d.soilMoisture);
      patch('Soil pH', d.soilPh);
      patch('Water depth', d.waterDepth);
      return d;
    } catch (_) {
      return ThresholdConfigData.defaults;
    }
  }
}

const metricUnits = {
  'Temperature': '°C',
  'Humidity': '%',
  'Soil moisture': '%',
  'Soil pH': '',
  'Water depth': 'cm',
};
