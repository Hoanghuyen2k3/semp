import 'chart_dataset.dart';

class SensorRow {
  SensorRow({required this.deviceId, required this.payload, required this.receivedAt});
  final String deviceId;
  final Map<String, dynamic> payload;
  final String receivedAt;
}

double _toNum(dynamic v) {
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? 0;
  return 0;
}

String _timeLabel(String iso) {
  try {
    final d = DateTime.parse(iso).toLocal();
    final h = d.hour.toString().padLeft(2, '0');
    final m = d.minute.toString().padLeft(2, '0');
    return '$h:$m';
  } catch (_) {
    return '?';
  }
}

/// Mirrors `dashboard/src/lib/useSensorReadings.ts` extractChartData.
ChartDataset extractChartData(List<SensorRow> readings, {int perSeriesLimit = 15}) {
  final temp = <ChartDataPoint>[];
  final humidity = <ChartDataPoint>[];
  final soilMoisture = <ChartDataPoint>[];
  final soilPh = <ChartDataPoint>[];
  final waterFlow = <ChartDataPoint>[];
  final waterDepth = <ChartDataPoint>[];

  for (final r in readings) {
    final p = r.payload;
    final label = _timeLabel(r.receivedAt);
    switch (r.deviceId) {
      case 'temp-humid':
        final t = _toNum(p['temperature']);
        final ext = _toNum(p['ext_temperature']);
        if (t != 0 || ext != 0) {
          temp.add(ChartDataPoint(name: label, value: ext != 0 ? ext : t, receivedAt: r.receivedAt));
        }
        final h = _toNum(p['humidity']);
        if (h > 0 && h <= 100) {
          humidity.add(ChartDataPoint(name: label, value: h, receivedAt: r.receivedAt));
        }
        break;
      case 'soil':
        soilPh.add(ChartDataPoint(name: label, value: _toNum(p['PH1_SOIL']), receivedAt: r.receivedAt));
        temp.add(ChartDataPoint(name: label, value: _toNum(p['TEMP_SOIL']), receivedAt: r.receivedAt));
        break;
      case 'soilmositure':
        soilMoisture.add(ChartDataPoint(name: label, value: _toNum(p['water_SOIL']), receivedAt: r.receivedAt));
        temp.add(ChartDataPoint(name: label, value: _toNum(p['temp_SOIL']), receivedAt: r.receivedAt));
        break;
      case 'waterflow':
        final flow = _toNum(p['Water_flow_value']) != 0 ? _toNum(p['Water_flow_value']) : _toNum(p['Total_pulse']);
        waterFlow.add(ChartDataPoint(name: label, value: flow, receivedAt: r.receivedAt));
        break;
      case 'analog':
        waterDepth.add(ChartDataPoint(name: label, value: _toNum(p['Water_deep_cm']), receivedAt: r.receivedAt));
        break;
    }
  }

  List<ChartDataPoint> cap(List<ChartDataPoint> arr) {
    if (perSeriesLimit >= 999999999) return arr;
    if (arr.length <= perSeriesLimit) return arr;
    return arr.sublist(arr.length - perSeriesLimit);
  }

  return ChartDataset(
    temperature: cap(temp),
    humidity: cap(humidity),
    soilMoisture: cap(soilMoisture),
    soilPh: cap(soilPh),
    waterFlow: cap(waterFlow),
    waterDepth: cap(waterDepth),
  );
}

List<SensorRow> rowsFromSupabase(List<dynamic> raw) {
  return raw.map((e) {
    final m = Map<String, dynamic>.from(e as Map);
    final payload = m['payload'];
    return SensorRow(
      deviceId: m['device_id']?.toString() ?? '',
      payload: payload is Map ? Map<String, dynamic>.from(payload) : <String, dynamic>{},
      receivedAt: m['received_at']?.toString() ?? '',
    );
  }).toList();
}
