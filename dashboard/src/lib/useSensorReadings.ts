"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { SensorReading } from "./supabase";

export type ChartDataPoint = {
  name: string;
  value: number;
  received_at: string;
};

export type ChartDataset = {
  Temperature: ChartDataPoint[];
  Humidity: ChartDataPoint[];
  "Soil moisture": ChartDataPoint[];
  "Soil pH": ChartDataPoint[];
  "Water flow": ChartDataPoint[];
  "Water depth": ChartDataPoint[];
};

function toNumber(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  return 0;
}

export function extractChartData(readings: SensorReading[]): ChartDataset {
  const temp: ChartDataPoint[] = [];
  const humidity: ChartDataPoint[] = [];
  const soilMoisture: ChartDataPoint[] = [];
  const soilPh: ChartDataPoint[] = [];
  const waterFlow: ChartDataPoint[] = [];
  const waterDepth: ChartDataPoint[] = [];

  for (const r of readings) {
    const p = r.payload;
    const label = new Date(r.received_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    switch (r.device_id) {
      case "temp-humid": {
        const t = toNumber(p.temperature);
        const ext = toNumber(p.ext_temperature);
        if (t !== 0 || ext !== 0) temp.push({ name: label, value: ext !== 0 ? ext : t, received_at: r.received_at });
        const h = toNumber(p.humidity);
        if (h > 0 && h <= 100) humidity.push({ name: label, value: h, received_at: r.received_at });
        break;
      }
      case "soil":
        soilPh.push({ name: label, value: toNumber(p.PH1_SOIL), received_at: r.received_at });
        temp.push({ name: label, value: toNumber(p.TEMP_SOIL), received_at: r.received_at });
        break;
      case "soilmositure":
        soilMoisture.push({ name: label, value: toNumber(p.water_SOIL), received_at: r.received_at });
        temp.push({ name: label, value: toNumber(p.temp_SOIL), received_at: r.received_at });
        break;
      case "waterflow":
        waterFlow.push({
          name: label,
          value: toNumber(p.Water_flow_value) || toNumber(p.Total_pulse),
          received_at: r.received_at,
        });
        break;
      case "analog":
        waterDepth.push({ name: label, value: toNumber(p.Water_deep_cm), received_at: r.received_at });
        break;
    }
  }

  const limit = 15;
  return {
    Temperature: temp.slice(-limit),
    Humidity: humidity.slice(-limit),
    "Soil moisture": soilMoisture.slice(-limit),
    "Soil pH": soilPh.slice(-limit),
    "Water flow": waterFlow.slice(-limit),
    "Water depth": waterDepth.slice(-limit),
  };
}

export type MetricKey =
  | "temperature"
  | "humidity"
  | "soil-moisture"
  | "soil-ph"
  | "water-flow"
  | "water-depth";

export const METRIC_KEYS: MetricKey[] = [
  "temperature",
  "humidity",
  "soil-moisture",
  "soil-ph",
  "water-flow",
  "water-depth",
];

export const METRIC_TITLE: Record<MetricKey, string> = {
  temperature: "Temperature",
  humidity: "Humidity",
  "soil-moisture": "Soil moisture",
  "soil-ph": "Soil pH",
  "water-flow": "Water flow",
  "water-depth": "Water depth",
};

export const METRIC_UNIT: Record<MetricKey, string | undefined> = {
  temperature: "°C",
  humidity: "%",
  "soil-moisture": "%",
  "soil-ph": undefined,
  "water-flow": "L",
  "water-depth": "cm",
};

export const METRIC_CHART_KEY: Record<MetricKey, keyof ChartDataset> = {
  temperature: "Temperature",
  humidity: "Humidity",
  "soil-moisture": "Soil moisture",
  "soil-ph": "Soil pH",
  "water-flow": "Water flow",
  "water-depth": "Water depth",
};

export type TimeRange = "24h" | "1w" | "1m" | "3m" | "1y" | "custom";

export function useSensorReadingsForMetric(metricKey: MetricKey, range: TimeRange, customFrom?: Date, customTo?: Date) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReadings() {
      try {
        let query = supabase
          .from("sensor_readings")
          .select("id, device_id, payload, received_at")
          .order("received_at", { ascending: true });

        const now = new Date();
        let from: Date;
        let to: Date = now;
        if (range === "custom" && customFrom && customTo) {
          from = customFrom;
          to = customTo;
        } else {
          const ms =
            range === "24h"
              ? 24 * 60 * 60 * 1000
              : range === "1w"
                ? 7 * 24 * 60 * 60 * 1000
                : range === "1m"
                  ? 30 * 24 * 60 * 60 * 1000
                  : range === "3m"
                    ? 90 * 24 * 60 * 60 * 1000
                    : range === "1y"
                      ? 365 * 24 * 60 * 60 * 1000
                      : 24 * 60 * 60 * 1000;
          from = new Date(now.getTime() - ms);
        }
        query = query.gte("received_at", from.toISOString()).lte("received_at", to.toISOString()).limit(2000);

        const { data: rows, error: err } = await query;

        if (err) {
          setError(err.message);
          setData([]);
          return;
        }

        const typed = (rows ?? []) as SensorReading[];
        const dataset = extractChartData(typed);
        const chartKey = METRIC_CHART_KEY[metricKey];
        setData(dataset[chartKey]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch");
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchReadings();
  }, [metricKey, range, customFrom?.toISOString(), customTo?.toISOString()]);

  return { data, loading, error };
}

export function useSensorReadings() {
  const [data, setData] = useState<ChartDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReadings() {
      try {
        const { data: rows, error: err } = await supabase
          .from("sensor_readings")
          .select("id, device_id, payload, received_at")
          .order("received_at", { ascending: false })
          .limit(100);

        if (err) {
          setError(err.message);
          setData(null);
          return;
        }

        const typed = (rows ?? []) as SensorReading[];
        setData(extractChartData(typed));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchReadings();
    const interval = setInterval(fetchReadings, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}
