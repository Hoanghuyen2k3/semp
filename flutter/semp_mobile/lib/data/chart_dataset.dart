class ChartDataPoint {
  ChartDataPoint({required this.name, required this.value, required this.receivedAt});
  final String name;
  final double value;
  final String receivedAt;
}

typedef ChartKey = String;

class ChartDataset {
  ChartDataset({
    required this.temperature,
    required this.humidity,
    required this.soilMoisture,
    required this.soilPh,
    required this.waterFlow,
    required this.waterDepth,
  });

  final List<ChartDataPoint> temperature;
  final List<ChartDataPoint> humidity;
  final List<ChartDataPoint> soilMoisture;
  final List<ChartDataPoint> soilPh;
  final List<ChartDataPoint> waterFlow;
  final List<ChartDataPoint> waterDepth;

  List<ChartDataPoint> operator [](ChartKey key) {
    switch (key) {
      case 'Temperature':
        return temperature;
      case 'Humidity':
        return humidity;
      case 'Soil moisture':
        return soilMoisture;
      case 'Soil pH':
        return soilPh;
      case 'Water flow':
        return waterFlow;
      case 'Water depth':
        return waterDepth;
      default:
        return const [];
    }
  }

  static const metricKeys = [
    'Temperature',
    'Humidity',
    'Soil moisture',
    'Soil pH',
    'Water flow',
    'Water depth',
  ];
}
