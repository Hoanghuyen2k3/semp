import 'chart_dataset.dart';
import 'weather_payload.dart';

class PredictionItem {
  PredictionItem({required this.id, required this.severity, required this.title, required this.detail});
  final String id;
  final String severity;
  final String title;
  final String detail;
}

double? _latest(List<ChartDataPoint>? pts) {
  if (pts == null || pts.isEmpty) return null;
  return pts.last.value;
}

/// Mirrors `computeGardenPredictions` from web (location label simplified).
List<PredictionItem> computeGardenPredictions(ChartDataset? chart, WeatherPayload? weather) {
  final out = <PredictionItem>[];
  final soil = _latest(chart?.soilMoisture);
  final hum = _latest(chart?.humidity);
  final airT = _latest(chart?.temperature);
  final depth = _latest(chart?.waterDepth);
  final ph = _latest(chart?.soilPh);

  if (weather != null) {
    if (weather.rainLikely24h && soil != null && soil < 35) {
      out.add(PredictionItem(
        id: 'rain-delay-irrigation',
        severity: 'info',
        title: 'Rain may reduce irrigation need',
        detail:
            'Precipitation is likely in the next 24 hours (rain risk ~${(weather.rainRisk24h * 100).round()}%). Soil moisture is ${soil.toStringAsFixed(0)}% — consider delaying watering unless plants show stress.',
      ));
    }
    if (!weather.rainLikely24h && soil != null && soil < 20) {
      out.add(PredictionItem(
        id: 'dry-no-rain',
        severity: 'action',
        title: 'Soil dry with little rain expected',
        detail:
            'Soil moisture is low (${soil.toStringAsFixed(0)}%) and the short-term forecast is mostly dry. Plan irrigation or check drip lines soon.',
      ));
    }
    if (weather.avgTemp24h > 28 && soil != null && soil < 40) {
      out.add(PredictionItem(
        id: 'heat-et',
        severity: 'watch',
        title: 'Warm spell + moderate soil water',
        detail:
            'Average temperature next ~24h is around ${weather.avgTemp24h.toStringAsFixed(0)}°C. Evapotranspiration can rise; monitor soil moisture (${soil.toStringAsFixed(0)}%).',
      ));
    }
    if (weather.rainLikely24h && depth != null && depth < 15) {
      out.add(PredictionItem(
        id: 'tank-rain',
        severity: 'info',
        title: 'Rain incoming; check water storage',
        detail:
            'Water depth reads ${depth.toStringAsFixed(0)} cm. If you harvest rainwater, ensure gutters/barrels are ready; soil may still need attention if dry.',
      ));
    }
  }

  if (soil != null && hum != null && airT != null) {
    if (soil < 18 && hum < 40 && airT > 22) {
      out.add(PredictionItem(
        id: 'dry-air-soil',
        severity: 'action',
        title: 'Dry soil in warm, relatively dry air',
        detail:
            'Soil ${soil.toStringAsFixed(0)}%, humidity ${hum.toStringAsFixed(0)}%, air ${airT.toStringAsFixed(1)}°C — conditions favour moisture loss from the bed.',
      ));
    }
  }

  if (depth != null && depth < 8) {
    out.add(PredictionItem(
      id: 'low-reservoir',
      severity: 'action',
      title: 'Water reservoir level low',
      detail: 'Water depth is ${depth.toStringAsFixed(0)} cm. Refill or verify the sensor if this is unexpected.',
    ));
  }

  if (ph != null && (ph < 5.5 || ph > 8)) {
    out.add(PredictionItem(
      id: 'ph-range',
      severity: 'watch',
      title: 'Soil pH outside typical range',
      detail:
          'Latest pH is ${ph.toStringAsFixed(1)}. Many crops prefer roughly 6–7.5; adjust amendments based on what you grow.',
    ));
  }

  if (out.isEmpty) {
    out.add(PredictionItem(
      id: 'all-clear',
      severity: 'info',
      title: 'No strong alerts from current rules',
      detail: weather != null
          ? 'Forecast and sensors look routine. Add more history for richer trends.'
          : 'Connect weather (dashboard API) and keep sensors online for irrigation hints.',
    ));
  }

  return out;
}
