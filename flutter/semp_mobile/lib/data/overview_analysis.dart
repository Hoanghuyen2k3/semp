import 'chart_dataset.dart';

class MetricOverview {
  MetricOverview({
    required this.metric,
    this.unit,
    required this.count,
    required this.avg,
    required this.min,
    required this.max,
    required this.latest,
    required this.trend,
    required this.summary,
  });

  final String metric;
  final String? unit;
  final int count;
  final double avg;
  final double min;
  final double max;
  final double latest;
  final String trend;
  final String summary;
}

class OverviewAnalysis {
  OverviewAnalysis({required this.metrics, required this.periodLabel});
  final List<MetricOverview> metrics;
  final String periodLabel;
}

String _computeTrend(List<double> values) {
  if (values.length < 3) return 'stable';
  final mid = values.length ~/ 2;
  final first = values.sublist(0, mid);
  final second = values.sublist(mid);
  final avg1 = first.reduce((a, b) => a + b) / first.length;
  final avg2 = second.reduce((a, b) => a + b) / second.length;
  final diff = avg2 - avg1;
  final range = (values.reduce((a, b) => a > b ? a : b) - values.reduce((a, b) => a < b ? a : b)).clamp(1.0, double.infinity);
  final pct = (diff / range) * 100;
  if (pct > 5) return 'up';
  if (pct < -5) return 'down';
  return 'stable';
}

OverviewAnalysis? computeOverview(ChartDataset ds) {
  const configs = [
    ('Temperature', '°C'),
    ('Humidity', '%'),
    ('Soil moisture', '%'),
    ('Soil pH', null),
    ('Water flow', 'L'),
    ('Water depth', 'cm'),
  ];

  final metrics = <MetricOverview>[];
  for (final c in configs) {
    final pts = ds[c.$1];
    final limit = pts.length > 24 ? pts.sublist(pts.length - 24) : pts;
    if (limit.isEmpty) continue;
    final vals = limit.map((e) => e.value).toList();
    final avg = vals.reduce((a, b) => a + b) / vals.length;
    final mn = vals.reduce((a, b) => a < b ? a : b);
    final mx = vals.reduce((a, b) => a > b ? a : b);
    final latest = vals.last;
    final trend = _computeTrend(vals);
    final u = c.$2 ?? '';
    final trendStr = trend == 'up' ? 'trending up' : trend == 'down' ? 'trending down' : 'relatively stable';
    final summary =
        '${c.$1} averaged ${avg.toStringAsFixed(1)}$u (range ${mn.toStringAsFixed(1)}–${mx.toStringAsFixed(1)}$u), $trendStr.';
    metrics.add(MetricOverview(
      metric: c.$1,
      unit: c.$2,
      count: vals.length,
      avg: avg,
      min: mn,
      max: mx,
      latest: latest,
      trend: trend,
      summary: summary,
    ));
  }

  if (metrics.isEmpty) return null;
  return OverviewAnalysis(metrics: metrics, periodLabel: 'Last 24 readings (window)');
}
