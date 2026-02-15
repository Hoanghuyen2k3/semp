"use client";

import { useAlertNotificationContext } from "@/context/AlertNotificationContext";
import type { CriticalAlert, AlertSeverity } from "@/lib/thresholdConfig";

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; className: string; icon: string }> = {
  critical: { label: "Critical", className: "alert-critical", icon: "⚠" },
  warning: { label: "Warning", className: "alert-warning", icon: "⚡" },
  info: { label: "Info", className: "alert-info", icon: "ℹ" },
};

function AlertCard({ alert }: { alert: CriticalAlert }) {
  const cfg = SEVERITY_CONFIG[alert.severity];
  const time = new Date(alert.receivedAt).toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className={`alert-card ${cfg.className}`}>
      <span className="alert-icon">{cfg.icon}</span>
      <div className="alert-content">
        <strong>{alert.metric}:</strong> {alert.message}
        <div className="alert-meta">
          Current: {alert.value}{alert.unit ?? ""}
          {alert.threshold && ` (${alert.threshold})`} • {time}
        </div>
      </div>
    </div>
  );
}

export function CriticalAlerts() {
  const ctx = useAlertNotificationContext();
  const alerts = ctx?.alerts ?? [];
  const loading = ctx?.loading ?? false;
  const error = ctx?.error ?? null;

  if (loading) {
    return (
      <section className="critical-section">
        <h2>Critical Issues</h2>
        <p className="muted">Checking for alerts…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="critical-section">
        <h2>Critical Issues</h2>
        <p className="muted" style={{ color: "var(--danger)" }}>
          Could not load alerts: {error}
        </p>
      </section>
    );
  }

  const critical = alerts.filter((a) => a.severity === "critical");
  const others = alerts.filter((a) => a.severity !== "critical");

  return (
    <section className="critical-section">
      <div className="critical-header">
        <h2>Critical Issues</h2>
        {alerts.length > 0 ? (
          <span className={`critical-badge ${critical.length > 0 ? "has-critical" : ""}`}>
            {critical.length} critical • {others.length} other
          </span>
        ) : (
          <span className="critical-badge all-clear">All clear</span>
        )}
      </div>
      <p className="muted critical-desc">
        Conditions that need your attention: water level, temperature extremes, soil moisture, pH, and humidity.
      </p>
      {alerts.length === 0 ? (
        <div className="alerts-empty">
          <span className="alerts-empty-icon">✓</span>
          <p>No critical issues detected. Sensors are within normal ranges.</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}
    </section>
  );
}
