"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { MetricDetailChart } from "@/components/MetricDetailChart";
import {
  METRIC_KEYS,
  METRIC_TITLE,
  METRIC_UNIT,
  useSensorReadingsForMetric,
  type MetricKey,
  type TimeRange,
} from "@/lib/useSensorReadings";

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "24h", label: "24 hours" },
  { key: "1w", label: "1 week" },
  { key: "1m", label: "1 month" },
  { key: "3m", label: "3 months" },
  { key: "1y", label: "1 year" },
  { key: "custom", label: "Custom" },
];

export default function MetricDetailPage() {
  const params = useParams();
  const router = useRouter();
  const type = (params?.type as string) ?? "";
  const metricKey = METRIC_KEYS.includes(type as MetricKey) ? (type as MetricKey) : null;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("24h");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const customFromDate = customFrom ? new Date(customFrom) : undefined;
  const customToDate = customTo ? new Date(customTo) : undefined;
  const { data, loading: dataLoading, error } = useSensorReadingsForMetric(
    metricKey ?? "temperature",
    range,
    range === "custom" ? customFromDate : undefined,
    range === "custom" ? customToDate : undefined
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!metricKey) {
      router.replace("/");
      return;
    }
  }, [metricKey, router]);

  if (loading || !user || !metricKey) {
    return (
      <main className="main">
        <h1>Garden Monitoring</h1>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const title = METRIC_TITLE[metricKey];
  const unit = METRIC_UNIT[metricKey];

  return (
    <main className="main">
      <Link href="/" className="metric-back-link">
        ← Back to overview
      </Link>

      <header className="metric-header">
        <h1>{title}</h1>
        <div className="metric-range-buttons">
          {TIME_RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`metric-range-btn ${range === r.key ? "active" : ""}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {range === "custom" && (
        <div className="metric-custom-range">
          <label>
            From:{" "}
            <input
              type="datetime-local"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </label>
          <label>
            To:{" "}
            <input
              type="datetime-local"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </label>
        </div>
      )}

      {error && (
        <p className="muted" style={{ color: "#f85149", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      <div className="metric-chart-container">
        {dataLoading ? (
          <p className="muted">Loading chart…</p>
        ) : (
          <MetricDetailChart title={title} unit={unit} data={data} />
        )}
      </div>
    </main>
  );
}
