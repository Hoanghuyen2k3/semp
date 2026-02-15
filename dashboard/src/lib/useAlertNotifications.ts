"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "./supabase";
import type { SensorReading } from "./supabase";
import { extractChartData, type ChartDataset } from "./useSensorReadings";
import {
  loadThresholdConfig,
  type CriticalAlert,
  type ThresholdConfig,
  type AlertSeverity,
} from "./thresholdConfig";
import {
  loadReadAlertIds,
  loadEmailSettings,
  markAlertsAsRead,
} from "./notificationStore";
import type { Toast } from "@/components/ToastContainer";

const METRIC_CONFIGS: { key: keyof ChartDataset; unit?: string }[] = [
  { key: "Temperature", unit: "°C" },
  { key: "Humidity", unit: "%" },
  { key: "Soil moisture", unit: "%" },
  { key: "Soil pH" },
  { key: "Water depth", unit: "cm" },
];

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
    alerts.push(buildAlert(key, unit, cfg.above, "above", v, latest.received_at));
  }
  if (cfg.below?.enabled && v <= cfg.below.value) {
    alerts.push(buildAlert(key, unit, cfg.below, "below", v, latest.received_at));
  }
  return alerts;
}

function computeAlerts(readings: SensorReading[]): CriticalAlert[] {
  const dataset = extractChartData(readings);
  const config = loadThresholdConfig();
  const all: CriticalAlert[] = [];
  for (const { key, unit } of METRIC_CONFIGS) {
    const points = (dataset[key] ?? []) as { value: number; received_at: string }[];
    all.push(...checkMetricAlerts(key, unit, points, config));
  }
  return all;
}

async function sendAlertEmail(alert: CriticalAlert): Promise<boolean> {
  const settings = loadEmailSettings();
  if (!settings.enabled || !settings.recipientEmail) {
    return false;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false;

  const subject = `[SEMP Alert] ${alert.metric}: ${alert.message}`;
  const body = `${alert.message}\n\nMetric: ${alert.metric}\nCurrent value: ${alert.value}${alert.unit ?? ""}\nThreshold: ${alert.threshold ?? "N/A"}\nTime: ${new Date(alert.receivedAt).toLocaleString()}`;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-alert-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        to: settings.recipientEmail,
        subject,
        body,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useAlertNotifications() {
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configVersion, setConfigVersion] = useState(0);
  const lastAlertIdsRef = useRef<Set<string>>(new Set());
  const hasInitialLoadRef = useRef(false);

  const processReadings = useCallback((readings: SensorReading[]) => {
    const newAlerts = computeAlerts(readings);
    setAlerts(newAlerts);

    const newIds = new Set(newAlerts.map((a) => a.id));
    const brandNew = newAlerts.filter(
      (a) => !lastAlertIdsRef.current.has(a.id)
    );
    lastAlertIdsRef.current = newIds;

    // On initial load: seed lastAlertIdsRef but do NOT show toasts.
    // Only toast for alerts that appear AFTER the user has loaded the page.
    if (!hasInitialLoadRef.current) {
      hasInitialLoadRef.current = true;
      return;
    }

    if (brandNew.length > 0) {
      brandNew.forEach((alert) => {
        setToasts((prev) => [
          ...prev,
          { id: `toast-${alert.id}-${Date.now()}`, alert, createdAt: Date.now() },
        ]);
        sendAlertEmail(alert).catch(() => {});
      });
    }
  }, []);

  useEffect(() => {
    function onConfigChange() {
      setConfigVersion((v) => v + 1);
    }
    window.addEventListener("threshold-config-changed", onConfigChange);
    return () => window.removeEventListener("threshold-config-changed", onConfigChange);
  }, []);

  useEffect(() => {
    function onReadUpdate() {
      setReadIds(loadReadAlertIds());
    }
    setReadIds(loadReadAlertIds());
    window.addEventListener("notification-read-updated", onReadUpdate);
    return () => window.removeEventListener("notification-read-updated", onReadUpdate);
  }, []);

  useEffect(() => {
    // Skip alert checking on login page - no toasts when not logged in
    if (pathname === "/login") {
      setLoading(false);
      return;
    }

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
        processReadings(typed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to check alerts");
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchAndCheck();
    const interval = setInterval(fetchAndCheck, 5 * 60 * 1000); // Poll every 5 minutes to stay within free tier
    return () => clearInterval(interval);
  }, [pathname, configVersion, processReadings]);

  const unreadCount = alerts.filter((a) => !readIds.has(a.id)).length;

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshRead = useCallback(() => {
    setReadIds(loadReadAlertIds());
  }, []);

  return {
    alerts,
    toasts,
    dismissToast,
    unreadCount,
    loading,
    error,
    refreshRead,
  };
}
