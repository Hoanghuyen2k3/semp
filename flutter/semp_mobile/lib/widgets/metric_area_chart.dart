import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../data/chart_dataset.dart';

/// Small area-style chart matching web “EmptyChartCard” (title unit in heading — caller provides).
class MetricAreaChart extends StatelessWidget {
  const MetricAreaChart({
    super.key,
    required this.titleHeading,
    required this.points,
    this.height = 160,
  });

  final String titleHeading;
  final List<ChartDataPoint> points;
  final double height;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasData = points.isNotEmpty;
    final spots = <FlSpot>[
      for (var i = 0; i < (hasData ? points.length : 5); i++)
        FlSpot(i.toDouble(), hasData ? points[i].value : 0),
    ];
    double minY = 0;
    double maxY = 100;
    if (hasData) {
      final vals = points.map((e) => e.value).toList();
      minY = vals.reduce((a, b) => a < b ? a : b);
      maxY = vals.reduce((a, b) => a > b ? a : b);
      final pad = (maxY - minY).abs() < 1e-6 ? 1.0 : (maxY - minY) * 0.1;
      minY -= pad;
      maxY += pad;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(titleHeading, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            SizedBox(
              height: height,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: (maxY - minY) > 0 ? (maxY - minY) / 3 : 1,
                    getDrawingHorizontalLine: (_) => FlLine(color: theme.dividerColor, strokeWidth: 1, dashArray: [4, 4]),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 36,
                        getTitlesWidget: (v, _) => Text(
                          v.toStringAsFixed(1),
                          style: TextStyle(fontSize: 10, color: theme.colorScheme.onSurfaceVariant),
                        ),
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  minX: 0,
                  maxX: (spots.length - 1).toDouble().clamp(0, double.infinity),
                  minY: minY,
                  maxY: maxY,
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      color: theme.colorScheme.primary,
                      barWidth: 2,
                      dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(
                        show: true,
                        color: theme.colorScheme.primary.withOpacity(0.12),
                      ),
                      dashArray: hasData ? null : [4, 4],
                    ),
                  ],
                ),
              ),
            ),
            Text(
              hasData ? '${points.length} reading(s)' : 'No data yet',
              style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}
