import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../config/env.dart';
import '../services/next_js_api.dart';

String _formatLabel(String label) {
  return label.replaceAll('_', ' ').split(' ').map((w) {
    if (w.isEmpty) return w;
    return w[0].toUpperCase() + w.substring(1).toLowerCase();
  }).join(' ');
}

bool _isHealthy(String label) {
  final l = label.toLowerCase();
  return l.contains('healthy') || l.contains('normal');
}

class PlantHealthTab extends StatefulWidget {
  const PlantHealthTab({super.key});

  @override
  State<PlantHealthTab> createState() => _PlantHealthTabState();
}

class _PlantHealthTabState extends State<PlantHealthTab> {
  final _urlCtrl = TextEditingController();
  bool _busy = false;
  String? _error;
  Uint8List? _imageBytes;
  String? _imageName;

  String? _topLabel;
  int? _confidence;
  bool? _healthy;
  List<Map<String, dynamic>> _predictions = [];

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _chooseImageSource() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    await _captureFrom(source);
  }

  Future<void> _captureFrom(ImageSource source) async {
    final pick = await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (pick == null) return;
    final bytes = await pick.readAsBytes();
    final name = pick.name.isNotEmpty
        ? pick.name
        : (source == ImageSource.camera ? 'plant_camera.jpg' : 'plant_image.jpg');
    setState(() {
      _error = null;
      _urlCtrl.clear();
      _imageBytes = bytes;
      _imageName = name;
      _topLabel = null;
      _predictions = [];
    });
  }

  Future<void> _analyze() async {
    final origin = Env.dashboardOrigin;
    if (origin == null) {
      setState(() => _error = 'Set DASHBOARD_API_BASE to use Plant health (Hugging Face runs on the server).');
      return;
    }

    final url = _urlCtrl.text.trim();
    if (_imageBytes == null && url.isEmpty) {
      setState(() => _error = 'Choose an image or enter an image URL.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final api = NextJsApi(origin);
      final Map<String, dynamic> data;
      if (_imageBytes != null) {
        data = await api.postPlantHealthImage(_imageBytes!, _imageName ?? 'leaf.jpg');
      } else {
        data = await api.postPlantHealthUrl(url);
      }

      final rawPred = data['predictions'];
      if (rawPred is! List || rawPred.isEmpty) throw Exception('No prediction returned');
      final first = Map<String, dynamic>.from(rawPred[0] as Map);
      final label = first['label']?.toString() ?? '';
      final score = (first['score'] as num?)?.toDouble() ?? 0;

      final top5 = <Map<String, dynamic>>[];
      for (final p in rawPred.take(5)) {
        final m = Map<String, dynamic>.from(p as Map);
        final lbl = m['label']?.toString() ?? '';
        final sc = (m['score'] as num?)?.toDouble() ?? 0;
        top5.add({'label': _formatLabel(lbl), 'score': (sc * 100).round(), 'raw': lbl});
      }

      setState(() {
        _healthy = _isHealthy(label);
        _topLabel = _formatLabel(label);
        _confidence = (score * 100).round();
        _predictions = top5;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _topLabel = null;
        _predictions = [];
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Plant health', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text(
          'Analyze leaf images with the same /api/plant-health route as the web app.',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: _busy ? null : _chooseImageSource,
          icon: const Icon(Icons.add_photo_alternate_outlined),
          label: const Text('Gallery or camera'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _urlCtrl,
          decoration: const InputDecoration(
            labelText: 'Or image URL',
            border: OutlineInputBorder(),
          ),
          onChanged: (_) {
            if (_urlCtrl.text.trim().isNotEmpty) {
              setState(() => _imageBytes = null);
            }
          },
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _busy ? null : _analyze,
          icon: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.biotech),
          label: Text(_busy ? 'Analyzing…' : 'Analyze'),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
        ],
        if (_imageBytes != null) ...[
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.memory(_imageBytes!, height: 200, fit: BoxFit.contain),
          ),
        ],
        if (_topLabel != null) ...[
          const SizedBox(height: 20),
          Card(
            child: ListTile(
              leading: Icon(_healthy == true ? Icons.check_circle : Icons.warning_amber_rounded,
                  color: _healthy == true ? Colors.green : Colors.orange),
              title: Text(_topLabel!),
              subtitle: Text('Confidence: $_confidence%'),
            ),
          ),
        ],
        if (_predictions.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text('Top predictions', style: theme.textTheme.titleMedium),
          ..._predictions.map(
            (p) => ListTile(
              dense: true,
              title: Text(p['label']?.toString() ?? ''),
              trailing: Text('${p['score']}%'),
            ),
          ),
        ],
      ],
    );
  }
}
