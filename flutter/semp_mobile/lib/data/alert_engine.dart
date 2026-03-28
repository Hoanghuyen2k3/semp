import 'chart_dataset.dart';
import 'threshold_config.dart';

class CriticalAlertM {
  CriticalAlertM({
    required this.id,
    required this.metric,
    required this.message,
    required this.severity,
    required this.value,
    this.unit,
    this.threshold,
    required this.receivedAt,
  });

  final String id;
  final String metric;
  final String message;
  final String severity;
  final double value;
  final String? unit;
  final String? threshold;
  final String receivedAt;
}

List<CriticalAlertM> computeCriticalAlerts(ChartDataset ds, ThresholdConfigData cfg) {
  final all = <CriticalAlertM>[];

  void check(String metricKey, MetricThresholds mt, String unit, List<ChartDataPoint> pts) {
    if (pts.isEmpty) return;
    final latest = pts.last;
    final v = latest.value;

    void above(ThresholdRule? r) {
      if (r == null || !r.enabled) return;
      if (v >= r.value) {
        all.add(CriticalAlertM(
          id: '$metricKey-above-${latest.receivedAt}',
          metric: metricKey,
          message: r.message,
          severity: r.severity,
          value: v,
          unit: unit.isEmpty ? null : unit,
          threshold: '> ${r.value}$unit',
          receivedAt: latest.receivedAt,
        ));
      }
    }

    void below(ThresholdRule? r) {
      if (r == null || !r.enabled) return;
      if (v <= r.value) {
        all.add(CriticalAlertM(
          id: '$metricKey-below-${latest.receivedAt}',
          metric: metricKey,
          message: r.message,
          severity: r.severity,
          value: v,
          unit: unit.isEmpty ? null : unit,
          threshold: '< ${r.value}$unit',
          receivedAt: latest.receivedAt,
        ));
      }
    }

    above(mt.above);
    below(mt.below);
  }

  check('Temperature', cfg.temperature, metricUnits['Temperature']!, ds.temperature);
  check('Humidity', cfg.humidity, metricUnits['Humidity']!, ds.humidity);
  check('Soil moisture', cfg.soilMoisture, metricUnits['Soil moisture']!, ds.soilMoisture);
  check('Soil pH', cfg.soilPh, metricUnits['Soil pH']!, ds.soilPh);
  check('Water depth', cfg.waterDepth, metricUnits['Water depth']!, ds.waterDepth);

  return all;
}
