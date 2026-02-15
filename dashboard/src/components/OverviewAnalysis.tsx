"use client";

import { useOverviewAnalysis } from "@/lib/useOverviewAnalysis";

const TREND_ICONS = {
  up: "↗",
  down: "↘",
  stable: "→",
};

export function OverviewAnalysis() {
  const { analysis, loading, error } = useOverviewAnalysis();

  if (loading) {
    return (
      <section className="overview-section">
        <h2>Overview Analysis</h2>
        <p className="muted">Analyzing sensor data from last 24 hours…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="overview-section">
        <h2>Overview Analysis</h2>
        <p className="muted" style={{ color: "var(--danger)" }}>
          Could not load analysis: {error}
        </p>
      </section>
    );
  }

  if (!analysis || analysis.metrics.length === 0) {
    return (
      <section className="overview-section">
        <h2>Overview Analysis</h2>
        <p className="muted">No sensor data in the last 24 hours to analyze.</p>
      </section>
    );
  }

  return (
    <section className="overview-section">
      <div className="overview-header">
        <h2>Overview Analysis</h2>
        <span className="muted overview-badge">
          Rule-based • {analysis.periodLabel}
        </span>
      </div>
      <p className="muted overview-desc">
        Summary of temperature, humidity, soil moisture, pH, water flow, and water depth over the last 24 periods.
      </p>
      <div className="overview-metrics">
        {analysis.metrics.map((m) => (
          <div key={m.metric} className="overview-metric-card">
            <div className="overview-metric-header">
              <span className="overview-metric-name">{m.metric}</span>
              <span className={`overview-trend overview-trend-${m.trend}`}>
                {TREND_ICONS[m.trend]} {m.trend}
              </span>
            </div>
            <div className="overview-metric-stats">
              <span className="overview-stat">
                avg <strong>{m.avg.toFixed(1)}{m.unit ?? ""}</strong>
              </span>
              <span className="overview-stat muted">
                min {m.min.toFixed(1)}{m.unit ?? ""}
              </span>
              <span className="overview-stat muted">
                max {m.max.toFixed(1)}{m.unit ?? ""}
              </span>
            </div>
            <p className="overview-summary">{m.summary}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
