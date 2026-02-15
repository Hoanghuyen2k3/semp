"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { SensorReading } from "./supabase";
import { extractChartData, type ChartDataset } from "./useSensorReadings";
import {
  loadThresholdConfig,
  type CriticalAlert,
  type ThresholdConfig,
  type AlertSeverity,
} from "./thresholdConfig";

// Re-export for components
export type { AlertSeverity, CriticalAlert } from "./thresholdConfig";

function buildAlert(
  metric: string,
  unit: string | undefined,
  rule: { value: number; message: string; severity: AlertSeverity },
  direction: "above" | "below",
  value: number,
  receivedAt: string
): CriticalAlert {
  const thresholdStr =
    direction === "above"
      ? `> ${rule.value}${unit ?? ""}`
      : `< ${rule.value}${unit ?? ""}`;
  return {
    id: `${metric}-${direction}-${receivedAt}`,
    metric,
    message: rule.message,
    severity: rule.severity,
    value,
    unit,
    threshold: thresholdStr,
    receivedAt,
  };
}

function checkMetricAlerts(
  key: keyof ChartDataset,
  unit: string | undefined,
  points: { value: number; received_at: string }[],
  config: ThresholdConfig
): CriticalAlert[] {
  const alerts: CriticalAlert[] = [];
  const cfg = config[key as keyof ThresholdConfig];
  if (!cfg) return alerts;

  const latest = points[points.length - 1];
  if (!latest) return alerts;

  const v = latest.value;

  if (cfg.above?.enabled && v >= cfg.above.value) {
    alerts.push(
      buildAlert(key, unit, cfg.above, "above", v, latest.received_at)
    );
  }
  if (cfg.below?.enabled && v <= cfg.below.value) {
    alerts.push(
      buildAlert(key, unit, cfg.below, "below", v, latest.received_at)
    );
  }

  return alerts;
}

const METRIC_CONFIGS: { key: keyof ChartDataset; unit?: string }[] = [
  { key: "Temperature", unit: "°C" },
  { key: "Humidity", unit: "%" },
  { key: "Soil moisture", unit: "%" },
  { key: "Soil pH" },
  { key: "Water depth", unit: "cm" },
];

export function useCriticalAlerts() {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configVersion, setConfigVersion] = useState(0);

  useEffect(() => {
    function onConfigChange() {
      setConfigVersion((v) => v + 1);
    }
    window.addEventListener("threshold-config-changed", onConfigChange);
    return () => window.removeEventListener("threshold-config-changed", onConfigChange);
  }, []);

  useEffect(() => {
    async function fetchAndCheck() {
      try {
        const { data: rows, error: err } = await supabase
          .from("sensor_readings")
          .select("id, device_id, payload, received_at")
          .order("received_at", { ascending: false })
          .limit(150);

        if (err) {
          setError(err.message);
          setAlerts([]);
          return;
        }

        const typed = (rows ?? []) as SensorReading[];
        const dataset = extractChartData(typed);
        const currentConfig = loadThresholdConfig();

        const all: CriticalAlert[] = [];
        for (const { key, unit } of METRIC_CONFIGS) {
          const points = (dataset[key] ?? []) as {
            value: number;
            received_at: string;
          }[];
          all.push(...checkMetricAlerts(key, unit, points, currentConfig));
        }

        setAlerts(all);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to check alerts");
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAndCheck();
    const interval = setInterval(fetchAndCheck, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [configVersion]);

  return { alerts, loading, error, refreshAlerts: () => setConfigVersion((v) => v + 1) };
}
