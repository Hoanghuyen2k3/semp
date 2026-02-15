"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { SensorReading } from "./supabase";
import { extractChartData, type ChartDataset } from "./useSensorReadings";

/** Overview summary for a single metric over the last 24 periods */
export type MetricOverview = {
  metric: string;
  unit?: string;
  count: number;
  avg: number;
  min: number;
  max: number;
  latest: number;
  trend: "up" | "down" | "stable";
  summary: string;
};

/** Full overview analysis (rule-based, no external AI) */
export type OverviewAnalysis = {
  periodLabel: string;
  metrics: MetricOverview[];
  generatedAt: string;
};

function computeTrend(values: number[]): "up" | "down" | "stable" {
  if (values.length < 3) return "stable";
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const avg1 = first.reduce((a, b) => a + b, 0) / first.length;
  const avg2 = second.reduce((a, b) => a + b, 0) / second.length;
  const diff = avg2 - avg1;
  const range = Math.max(1, Math.max(...values) - Math.min(...values));
  const pct = (diff / range) * 100;
  if (pct > 5) return "up";
  if (pct < -5) return "down";
  return "stable";
}

function buildSummary(
  metric: string,
  unit: string | undefined,
  avg: number,
  min: number,
  max: number,
  trend: "up" | "down" | "stable"
): string {
  const u = unit ?? "";
  const trendStr = trend === "up" ? "trending up" : trend === "down" ? "trending down" : "relatively stable";
  return `${metric} averaged ${avg.toFixed(1)}${u} (range ${min.toFixed(1)}–${max.toFixed(1)}${u}), ${trendStr}.`;
}

function toMetricOverview(
  key: string,
  unit: string | undefined,
  points: { value: number }[]
): MetricOverview {
  const values = points.map((p) => p.value).filter((v) => v != null && !Number.isNaN(v));
  const count = values.length;
  const avg = count > 0 ? values.reduce((a, b) => a + b, 0) / count : 0;
  const min = count > 0 ? Math.min(...values) : 0;
  const max = count > 0 ? Math.max(...values) : 0;
  const latest = count > 0 ? values[values.length - 1] : 0;
  const trend = computeTrend(values);
  const summary = buildSummary(key, unit, avg, min, max, trend);
  return { metric: key, unit, count, avg, min, max, latest, trend, summary };
}

const METRIC_CONFIG: { key: keyof ChartDataset; unit?: string }[] = [
  { key: "Temperature", unit: "°C" },
  { key: "Humidity", unit: "%" },
  { key: "Soil moisture", unit: "%" },
  { key: "Soil pH" },
  { key: "Water flow", unit: "L" },
  { key: "Water depth", unit: "cm" },
];

export function useOverviewAnalysis() {
  const [analysis, setAnalysis] = useState<OverviewAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAndAnalyze() {
      try {
        const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const { data: rows, error: err } = await supabase
          .from("sensor_readings")
          .select("id, device_id, payload, received_at")
          .order("received_at", { ascending: true })
          .gte("received_at", from.toISOString())
          .limit(500);

        if (err) {
          setError(err.message);
          setAnalysis(null);
          return;
        }

        const typed = (rows ?? []) as SensorReading[];
        const dataset = extractChartData(typed);
        const limit = 24;
        const metrics: MetricOverview[] = METRIC_CONFIG.map(({ key, unit }) => {
          const arr = dataset[key] ?? [];
          const sliced = arr.slice(-limit);
          return toMetricOverview(key, unit, sliced);
        }).filter((m) => m.count > 0);

        setAnalysis({
          periodLabel: "Last 24 hours",
          metrics,
          generatedAt: new Date().toISOString(),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to analyze");
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    }

    fetchAndAnalyze();
    const interval = setInterval(fetchAndAnalyze, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { analysis, loading, error };
}
