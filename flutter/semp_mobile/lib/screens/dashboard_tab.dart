import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';
import '../data/alert_engine.dart';
import '../data/chart_dataset.dart';
import '../data/garden_predictions.dart';
import '../data/overview_analysis.dart';
import '../data/sensor_extract.dart';
import '../data/weather_payload.dart';
import '../services/next_js_api.dart';
import '../services/prefs_service.dart';
import '../widgets/metric_area_chart.dart';

class DashboardTab extends StatefulWidget {
  const DashboardTab({super.key});

  @override
  State<DashboardTab> createState() => DashboardTabState();
}

class DashboardTabState extends State<DashboardTab> {
  String? _dataError;
  ChartDataset? _chart;
  WeatherPayload? _weather;
  String? _weatherError;
  List<CriticalAlertM> _alerts = [];
  List<PredictionItem> _predictions = [];
  OverviewAnalysis? _overview;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    refresh();
  }

  Future<void> refresh() async {
    setState(() {
      _loading = true;
      _dataError = null;
    });
    try {
      final rows = await Supabase.instance.client
          .from('sensor_readings')
          .select('id, device_id, payload, received_at')
          .order('received_at', ascending: false)
          .limit(800);

      final list = rows as List<dynamic>;
      final typed = rowsFromSupabase(list.reversed.toList());
      final chart = extractChartData(typed, perSeriesLimit: 96);

      final cfg = await PrefsService.loadThreshold();
      final alerts = computeCriticalAlerts(chart, cfg);
      final overview = computeOverview(chart);

      WeatherPayload? weather;
      String? wErr;
      final origin = Env.dashboardOrigin;
      if (origin != null) {
        try {
          weather = await NextJsApi(origin).getWeatherPayload();
        } catch (e) {
          wErr = e.toString();
        }
      }

      final predictions = computeGardenPredictions(chart, weather);

      if (mounted) {
        setState(() {
          _chart = chart;
          _alerts = alerts;
          _predictions = predictions;
          _overview = overview;
          _weather = weather;
          _weatherError = wErr;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _dataError = e.toString();
          _loading = false;
        });
      }
    }
  }

  Color _severityColor(String s) {
    switch (s) {
      case 'critical':
        return Colors.red.shade300;
      case 'warning':
        return Colors.amber.shade600;
      default:
        return Colors.blue.shade300;
    }
  }

  Color _predColor(String s) {
    switch (s) {
      case 'action':
        return Colors.red.shade200;
      case 'watch':
        return Colors.amber.shade200;
      default:
        return Colors.blue.shade200;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final df = DateFormat.yMMMd().add_jm();

    if (_loading && _chart == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final chart = _chart;

    return RefreshIndicator(
      onRefresh: refresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_dataError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text('Could not load sensor data: $_dataError', style: TextStyle(color: theme.colorScheme.error)),
            ),
          if (Env.dashboardOrigin == null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  'Set DASHBOARD_API_BASE for weather (same as your deployed Next.js URL).',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ),
            ),
          // Two-column layout ≈ web: stack left, weather right → on mobile: critical, predictions, weather
          Text('Critical issues', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(
            'Conditions that need your attention: water level, temperature extremes, soil moisture, pH, and humidity.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 8),
          if (_alerts.isEmpty)
            Card(
              color: Colors.green.shade900.withOpacity(0.25),
              child: const ListTile(
                leading: Icon(Icons.check_circle_outline),
                title: Text('No critical issues detected. Sensors are within normal ranges.'),
              ),
            )
          else
            ..._alerts.map(
              (a) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                shape: Border(left: BorderSide(color: _severityColor(a.severity), width: 4)),
                child: ListTile(
                  title: Text('${a.metric}: ${a.message}'),
                  subtitle: Text(
                    'Current: ${a.value.toStringAsFixed(1)}${a.unit ?? ''}${a.threshold != null ? ' (${a.threshold})' : ''} · ${df.format(DateTime.parse(a.receivedAt).toLocal())}',
                  ),
                  isThreeLine: true,
                ),
              ),
            ),
          const SizedBox(height: 20),
          Text('Sensor predictions', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(
            'Uses the weather panel and latest soil moisture, humidity, and water depth when available.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 8),
          ..._predictions.map(
            (p) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              color: _predColor(p.severity).withOpacity(0.15),
              child: ListTile(
                title: Text(p.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(p.detail),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text('Weather', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          if (_weatherError != null)
            Text(_weatherError!, style: TextStyle(color: theme.colorScheme.error))
          else if (_weather == null)
            const Text('Weather unavailable without DASHBOARD_API_BASE.')
          else
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${_weather!.city}${_weather!.country.isNotEmpty ? ', ${_weather!.country}' : ''}',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Chip(label: Text('Avg 24h: ${_weather!.avgTemp24h.toStringAsFixed(0)}°')),
                        Chip(label: Text('Rain risk: ${(_weather!.rainRisk24h * 100).round()}%')),
                        Chip(label: Text(_weather!.rainLikely24h ? 'Rain likely' : 'Rain unlikely')),
                      ],
                    ),
                    if (_weather!.slots24h.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text('Next 24 hours', style: theme.textTheme.labelLarge),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 100,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _weather!.slots24h.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (context, i) {
                            final s = _weather!.slots24h[i];
                            return Chip(
                              avatar: const Icon(Icons.schedule, size: 18),
                              label: Text(
                                '${s['label'] ?? ''} · ${(s['temp'] as num?)?.round() ?? '—'}°',
                                style: const TextStyle(fontSize: 12),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                    if (_weather!.days.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text('5-day outlook', style: theme.textTheme.labelLarge),
                      ..._weather!.days.take(5).map(
                            (d) => ListTile(
                              dense: true,
                              title: Text(d['label']?.toString() ?? ''),
                              subtitle: Text(
                                '${(d['tempMin'] as num?)?.round() ?? '—'}° / ${(d['tempMax'] as num?)?.round() ?? '—'}° · ${d['description'] ?? ''}',
                              ),
                            ),
                          ),
                    ],
                  ],
                ),
              ),
            ),
          const SizedBox(height: 24),
          Text('Overview analysis', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          if (_overview == null || _overview!.metrics.isEmpty)
            const Text('No overview data in this window.')
          else
            ..._overview!.metrics.map(
              (m) => Card(
                child: ListTile(
                  title: Text(m.metric),
                  subtitle: Text(m.summary),
                  trailing: Text(m.trend == 'up' ? '↗' : m.trend == 'down' ? '↘' : '→'),
                ),
              ),
            ),
          const SizedBox(height: 24),
          Text('Metric charts', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          if (chart != null) ...[
            MetricAreaChart(titleHeading: 'Temperature (°C)', points: chart.temperature),
            MetricAreaChart(titleHeading: 'Humidity (%)', points: chart.humidity),
            MetricAreaChart(titleHeading: 'Soil moisture (%)', points: chart.soilMoisture),
            MetricAreaChart(titleHeading: 'Soil pH', points: chart.soilPh),
            MetricAreaChart(titleHeading: 'Water flow (L)', points: chart.waterFlow),
            MetricAreaChart(titleHeading: 'Water depth (cm)', points: chart.waterDepth),
          ],
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
