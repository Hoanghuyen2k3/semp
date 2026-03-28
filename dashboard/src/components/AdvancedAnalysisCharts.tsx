"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
} from "recharts";
import type { ChartDataPoint, ChartDataset } from "@/lib/useSensorReadings";
import { DEFAULT_THRESHOLDS } from "@/lib/thresholdConfig";

const COL = {
  temp: "#58a6ff",
  humidity: "#3fb950",
  moisture: "#a371f7",
  ph: "#d29922",
  depth: "#79c0ff",
  flow: "#f0883e",
};

function minuteBucket(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type ClimateRow = { t: string; temp?: number; humidity?: number };
type SoilRow = { t: string; moisture?: number; ph?: number };
type WaterRow = { t: string; depth?: number; flow?: number };

function mergeClimate(temp: ChartDataPoint[], humidity: ChartDataPoint[]): ClimateRow[] {
  const map = new Map<string, ClimateRow>();
  for (const p of temp) {
    const k = minuteBucket(p.received_at);
    const cur = map.get(k) ?? { t: p.name };
    cur.t = p.name;
    cur.temp = p.value;
    map.set(k, cur);
  }
  for (const p of humidity) {
    const k = minuteBucket(p.received_at);
    const cur = map.get(k) ?? { t: p.name };
    cur.t = p.name;
    cur.humidity = p.value;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .filter((r) => r.temp != null || r.humidity != null);
}

function mergeSoil(moisture: ChartDataPoint[], ph: ChartDataPoint[]): SoilRow[] {
  const map = new Map<string, SoilRow>();
  for (const p of moisture) {
    const k = minuteBucket(p.received_at);
    const cur = map.get(k) ?? { t: p.name };
    cur.t = p.name;
    cur.moisture = p.value;
    map.set(k, cur);
  }
  for (const p of ph) {
    const k = minuteBucket(p.received_at);
    const cur = map.get(k) ?? { t: p.name };
    cur.ph = p.value;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .filter((r) => r.moisture != null || r.ph != null);
}

function mergeWater(depth: ChartDataPoint[], flow: ChartDataPoint[]): WaterRow[] {
  const map = new Map<string, WaterRow>();
  for (const p of depth) {
    const k = minuteBucket(p.received_at);
    const cur = map.get(k) ?? { t: p.name };
    cur.t = p.name;
    cur.depth = p.value;
    map.set(k, cur);
  }
  for (const p of flow) {
    const k = minuteBucket(p.received_at);
    const cur = map.get(k) ?? { t: p.name };
    cur.flow = p.value;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .filter((r) => r.depth != null || r.flow != null);
}

function seriesStats(points: ChartDataPoint[]) {
  if (!points.length) return null;
  const vals = points.map((p) => p.value);
  return {
    latest: vals[vals.length - 1],
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
  };
}

type Kpi = {
  key: keyof ChartDataset;
  label: string;
  unit: string;
  href: string;
  latest: number;
  min: number;
  max: number;
  avg: number;
};

type Props = {
  chartData: ChartDataset | null;
  loading: boolean;
};

export function AdvancedAnalysisCharts({ chartData, loading }: Props) {
  const climateData = useMemo(
    () => (chartData ? mergeClimate(chartData.Temperature, chartData.Humidity) : []),
    [chartData]
  );
  const soilData = useMemo(
    () => (chartData ? mergeSoil(chartData["Soil moisture"], chartData["Soil pH"]) : []),
    [chartData]
  );
  const waterData = useMemo(
    () => (chartData ? mergeWater(chartData["Water depth"], chartData["Water flow"]) : []),
    [chartData]
  );

  const kpis = useMemo((): Kpi[] => {
    if (!chartData) return [];
    const defs: { key: keyof ChartDataset; label: string; unit: string; href: string }[] = [
      { key: "Temperature", label: "Temperature", unit: "°C", href: "/metrics/temperature" },
      { key: "Humidity", label: "Humidity", unit: "%", href: "/metrics/humidity" },
      { key: "Soil moisture", label: "Soil moisture", unit: "%", href: "/metrics/soil-moisture" },
      { key: "Soil pH", label: "Soil pH", unit: "", href: "/metrics/soil-ph" },
      { key: "Water depth", label: "Water depth", unit: "cm", href: "/metrics/water-depth" },
      { key: "Water flow", label: "Water flow", unit: "L", href: "/metrics/water-flow" },
    ];
    const out: Kpi[] = [];
    for (const d of defs) {
      const s = seriesStats(chartData[d.key]);
      if (!s) continue;
      out.push({ ...d, ...s });
    }
    return out;
  }, [chartData]);

  const rangeSummary = useMemo(() => {
    if (!chartData) return [];
    const items: { key: keyof ChartDataset; name: string }[] = [
      { key: "Temperature", name: "Temp" },
      { key: "Humidity", name: "Humidity" },
      { key: "Soil moisture", name: "Soil %" },
      { key: "Soil pH", name: "pH" },
      { key: "Water depth", name: "Depth" },
      { key: "Water flow", name: "Flow" },
    ];
    const out: { name: string; span: number; min: number; max: number }[] = [];
    for (const { key, name } of items) {
      const pts = chartData[key];
      if (!pts.length) continue;
      const vals = pts.map((p) => p.value);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      out.push({ name, span: max - min, min, max });
    }
    return out;
  }, [chartData]);

  const tempHigh = DEFAULT_THRESHOLDS.Temperature.above?.value;
  const tempLow = DEFAULT_THRESHOLDS.Temperature.below?.value;

  if (loading && !chartData) {
    return (
      <section className="analytics-section">
        <h2 className="analytics-title">Advanced analysis</h2>
        <p className="muted analytics-subtitle">Loading sensor history…</p>
      </section>
    );
  }

  const hasAny =
    chartData &&
    (chartData.Temperature.length > 0 ||
      chartData.Humidity.length > 0 ||
      chartData["Soil moisture"].length > 0 ||
      chartData["Soil pH"].length > 0 ||
      chartData["Water depth"].length > 0 ||
      chartData["Water flow"].length > 0);

  if (!hasAny) {
    return (
      <section className="analytics-section">
        <h2 className="analytics-title">Advanced analysis</h2>
        <p className="muted analytics-subtitle">
          Multi-series trends and range summaries will appear when your sensors start sending data.
        </p>
      </section>
    );
  }

  return (
    <section className="analytics-section" aria-labelledby="analytics-heading">
      <div className="analytics-section-head">
        <div>
          <h2 id="analytics-heading" className="analytics-title">
            Advanced analysis
          </h2>
          <p className="muted analytics-subtitle">
            Correlated views of air, soil, and water from your recent readings.
          </p>
        </div>
      </div>

      {kpis.length > 0 && (
        <div className="analytics-kpi-row">
          {kpis.map((k) => (
            <Link key={k.key} href={k.href} className="analytics-kpi-card">
              <span className="analytics-kpi-label">{k.label}</span>
              <span className="analytics-kpi-value">
                {(k.key === "Soil pH" ? k.latest.toFixed(2) : k.latest.toFixed(1))}
                {k.unit}
              </span>
              <span className="muted analytics-kpi-meta">
                avg {k.key === "Soil pH" ? k.avg.toFixed(2) : k.avg.toFixed(1)}
                {k.unit} · range{" "}
                {k.key === "Soil pH" ? `${k.min.toFixed(1)}–${k.max.toFixed(1)}` : `${k.min.toFixed(0)}–${k.max.toFixed(0)}`}
                {k.unit}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="analytics-charts-grid">
        {climateData.length > 0 && (
          <div className="analytics-card analytics-card--wide">
            <div className="analytics-card-head">
              <h3>Climate — air temperature &amp; humidity</h3>
              <Link href="/metrics/temperature" className="analytics-card-link">
                Details →
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={climateData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{ fill: "var(--muted)", fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  label={{ value: "°C", angle: -90, position: "insideLeft", fill: "var(--muted)", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  label={{ value: "%", angle: 90, position: "insideRight", fill: "var(--muted)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {tempHigh != null && (
                  <ReferenceLine
                    yAxisId="left"
                    y={tempHigh}
                    stroke="#f85149"
                    strokeDasharray="4 4"
                    label={{ value: "High", fill: "#f85149", fontSize: 10 }}
                  />
                )}
                {tempLow != null && (
                  <ReferenceLine
                    yAxisId="left"
                    y={tempLow}
                    stroke="#d29922"
                    strokeDasharray="4 4"
                    label={{ value: "Low", fill: "#d29922", fontSize: 10 }}
                  />
                )}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temp"
                  name="Temperature (°C)"
                  stroke={COL.temp}
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  name="Humidity (%)"
                  stroke={COL.humidity}
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {soilData.length > 0 && (
          <div className="analytics-card">
            <div className="analytics-card-head">
              <h3>Soil — moisture &amp; pH</h3>
              <Link href="/metrics/soil-moisture" className="analytics-card-link">
                Details →
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={soilData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{ fill: "var(--muted)", fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis
                  yAxisId="moist"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  label={{ value: "%", angle: -90, position: "insideLeft", fill: "var(--muted)", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="ph"
                  orientation="right"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  domain={[0, 14]}
                  label={{ value: "pH", angle: 90, position: "insideRight", fill: "var(--muted)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  yAxisId="moist"
                  type="monotone"
                  dataKey="moisture"
                  name="Moisture (%)"
                  fill={COL.moisture}
                  fillOpacity={0.2}
                  stroke={COL.moisture}
                  strokeWidth={2}
                  connectNulls
                />
                <Line
                  yAxisId="ph"
                  type="monotone"
                  dataKey="ph"
                  name="pH"
                  stroke={COL.ph}
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {waterData.length > 0 && (
          <div className="analytics-card">
            <div className="analytics-card-head">
              <h3>Water — depth line &amp; flow bars</h3>
              <Link href="/metrics/water-depth" className="analytics-card-link">
                Details →
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={waterData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" tick={{ fill: "var(--muted)", fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis
                  yAxisId="d"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  label={{ value: "cm", angle: -90, position: "insideLeft", fill: "var(--muted)", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="f"
                  orientation="right"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  label={{ value: "L", angle: 90, position: "insideRight", fill: "var(--muted)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="f"
                  dataKey="flow"
                  name="Flow (L)"
                  fill={COL.flow}
                  fillOpacity={0.85}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="d"
                  type="monotone"
                  dataKey="depth"
                  name="Depth (cm)"
                  stroke={COL.depth}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {rangeSummary.length > 0 && (
          <div className="analytics-card analytics-card--wide">
            <div className="analytics-card-head">
              <h3>How much each metric moved (max − min)</h3>
              <span className="muted analytics-card-hint">Taller = more variability in this period</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={rangeSummary}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={64} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(2)}`, "Span"]}
                  labelFormatter={(label, payload) => {
                    const p = payload?.[0]?.payload as { min: number; max: number } | undefined;
                    if (!p) return String(label);
                    return `min ${p.min.toFixed(1)} · max ${p.max.toFixed(1)}`;
                  }}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                />
                <Bar dataKey="span" name="Range" radius={[0, 6, 6, 0]}>
                  {rangeSummary.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "#58a6ff" : "#3fb950"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
