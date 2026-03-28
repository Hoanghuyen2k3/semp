/// Subset of web `WeatherPayload` used for predictions + UI.
class WeatherPayload {
  WeatherPayload({
    required this.city,
    required this.country,
    required this.rainRisk24h,
    required this.rainLikely24h,
    required this.avgTemp24h,
    required this.raw,
  });

  final String city;
  final String country;
  final double rainRisk24h;
  final bool rainLikely24h;
  final double avgTemp24h;
  final Map<String, dynamic> raw;

  factory WeatherPayload.fromJson(Map<String, dynamic> j) {
    return WeatherPayload(
      city: j['city']?.toString() ?? '',
      country: j['country']?.toString() ?? '',
      rainRisk24h: (j['rainRisk24h'] as num?)?.toDouble() ?? 0,
      rainLikely24h: j['rainLikely24h'] == true,
      avgTemp24h: (j['avgTemp24h'] as num?)?.toDouble() ?? 0,
      raw: j,
    );
  }

  List<Map<String, dynamic>> get days {
    final d = raw['days'];
    if (d is! List) return [];
    return d.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  List<Map<String, dynamic>> get slots24h {
    final s = raw['slots24h'];
    if (s is! List) return [];
    return s.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
}
