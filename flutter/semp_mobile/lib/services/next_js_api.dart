import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../data/weather_payload.dart';

MediaType _plantHealthImageMediaType(String filename) {
  final n = filename.toLowerCase();
  if (n.endsWith('.png')) return MediaType('image', 'png');
  if (n.endsWith('.webp')) return MediaType('image', 'webp');
  if (n.endsWith('.gif')) return MediaType('image', 'gif');
  if (n.endsWith('.heic') || n.endsWith('.heif')) return MediaType('image', 'heic');
  return MediaType('image', 'jpeg');
}
/// Calls your Next.js dashboard routes so secrets stay on the server.
class NextJsApi {
  NextJsApi(this.origin);

  final String origin;

  Future<Map<String, dynamic>> getWeather() async {
    final res = await http.get(Uri.parse('$origin/api/weather'));
    final body = jsonDecode(res.body);
    if (body is! Map<String, dynamic>) {
      throw const FormatException('Unexpected weather response');
    }
    if (res.statusCode >= 400) {
      throw Exception(body['error']?.toString() ?? 'Weather error ${res.statusCode}');
    }
    return body;
  }

  Future<WeatherPayload> getWeatherPayload() async {
    final m = await getWeather();
    return WeatherPayload.fromJson(m);
  }

  /// Multipart image upload (same as web plant health).
  Future<Map<String, dynamic>> postPlantHealthImage(List<int> bytes, String filename) async {
    final uri = Uri.parse('$origin/api/plant-health');
    final req = http.MultipartRequest('POST', uri);
    req.files.add(http.MultipartFile.fromBytes(
      'image',
      bytes,
      filename: filename,
      contentType: _plantHealthImageMediaType(filename),
    ));
    final streamed = await req.send();
    final res = await http.Response.fromStream(streamed);
    final body = jsonDecode(res.body);
    if (body is! Map<String, dynamic>) {
      throw const FormatException('Unexpected plant-health response');
    }
    if (res.statusCode >= 400) {
      throw Exception(body['error']?.toString() ?? 'Plant health error ${res.statusCode}');
    }
    return body;
  }

  Future<Map<String, dynamic>> postPlantHealthUrl(String imageUrl) async {
    final res = await http.post(
      Uri.parse('$origin/api/plant-health'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'imageUrl': imageUrl}),
    );
    final body = jsonDecode(res.body);
    if (body is! Map<String, dynamic>) {
      throw const FormatException('Unexpected plant-health response');
    }
    if (res.statusCode >= 400) {
      throw Exception(body['error']?.toString() ?? 'Plant health error ${res.statusCode}');
    }
    return body;
  }

  Future<String> postChat({
    required List<Map<String, String>> messages,
    String context = '',
  }) async {
    final res = await http.post(
      Uri.parse('$origin/api/chat'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'messages': messages, 'context': context}),
    );
    final body = jsonDecode(res.body);
    if (body is! Map<String, dynamic>) {
      throw const FormatException('Unexpected chat response');
    }
    if (res.statusCode >= 400) {
      throw Exception(body['error']?.toString() ?? 'Chat error ${res.statusCode}');
    }
    return body['text']?.toString() ?? '';
  }
}
