"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { AppNav } from "@/components/AppNav";
import {
  DEFAULT_THRESHOLDS,
  loadThresholdConfig,
  saveThresholdConfig,
  resetThresholdConfig,
  METRIC_UNITS,
  type ThresholdConfig,
  type ThresholdRule,
  type AlertSeverity,
} from "@/lib/thresholdConfig";
import {
  loadEmailSettings,
  saveEmailSettings,
  type EmailNotificationSettings,
} from "@/lib/notificationStore";

const SEVERITY_OPTIONS: { value: AlertSeverity; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

function ThresholdRuleEditor({
  metric,
  direction,
  unit,
  rule,
  onChange,
}: {
  metric: string;
  direction: "above" | "below";
  unit: string;
  rule: ThresholdRule;
  onChange: (rule: ThresholdRule) => void;
}) {
  const label = direction === "above" ? "Above" : "Below";

  return (
    <div className="threshold-rule">
      <div className="threshold-rule-row">
        <label className="threshold-rule-toggle">
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(e) => onChange({ ...rule, enabled: e.target.checked })}
          />
          <span>{label}</span>
        </label>
        <input
          type="number"
          step={metric === "Soil pH" ? 0.1 : 1}
          value={rule.value}
          onChange={(e) =>
            onChange({
              ...rule,
              value: parseFloat(e.target.value) || 0,
            })
          }
          className="threshold-value-input"
        />
        {unit && <span className="threshold-unit">{unit}</span>}
      </div>
      <div className="threshold-rule-row">
        <input
          type="text"
          value={rule.message}
          onChange={(e) => onChange({ ...rule, message: e.target.value })}
          placeholder="Alert message"
          className="threshold-message-input"
        />
        <select
          value={rule.severity}
          onChange={(e) =>
            onChange({
              ...rule,
              severity: e.target.value as AlertSeverity,
            })
          }
          className="threshold-severity-select"
        >
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS);
  const [emailSettings, setEmailSettings] = useState<EmailNotificationSettings>({
    enabled: false,
    recipientEmail: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setConfig(loadThresholdConfig());
    const saved = loadEmailSettings();
    setEmailSettings({
      ...saved,
      recipientEmail: saved.recipientEmail || user.email || "",
    });
  }, [user]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function updateMetric(
    metric: keyof ThresholdConfig,
    direction: "above" | "below",
    rule: ThresholdRule
  ) {
    setConfig((prev) => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [direction]: rule,
      },
    }));
    setSaved(false);
  }

  function handleSave() {
    saveThresholdConfig(config);
    saveEmailSettings(emailSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    if (confirm("Reset all thresholds to default values?")) {
      setConfig(resetThresholdConfig());
      setSaved(false);
    }
  }

  if (loading) {
    return (
      <main className="main">
        <h1>Smart Eco-Monitoring Platform</h1>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="main">
        <h1>Smart Eco-Monitoring Platform</h1>
        <p className="muted">Redirecting to sign in…</p>
      </main>
    );
  }

  const metrics = Object.keys(DEFAULT_THRESHOLDS) as (keyof ThresholdConfig)[];

  return (
    <main className="main">
      <AppNav user={user} onSignOut={handleSignOut} />

      <div className="settings-header">
        <h2>Settings</h2>
        <p className="muted settings-desc">
          Configure alert thresholds and email notifications.
        </p>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Alert Threshold Rules</h3>
        <p className="muted settings-section-desc">
          Configure when alerts are triggered. Rules are applied to the latest sensor readings.
        </p>
      </div>

      <div className="thresholds-grid">
        {metrics.map((metric) => {
          const metricConfig = config[metric];
          const unit = METRIC_UNITS[metric] ?? "";

          return (
            <div key={metric} className="threshold-card">
              <h3 className="threshold-card-title">{metric}</h3>
              {metricConfig.above && (
                <ThresholdRuleEditor
                  metric={metric}
                  direction="above"
                  unit={unit}
                  rule={metricConfig.above}
                  onChange={(r) => updateMetric(metric, "above", r)}
                />
              )}
              {metricConfig.below && (
                <ThresholdRuleEditor
                  metric={metric}
                  direction="below"
                  unit={unit}
                  rule={metricConfig.below}
                  onChange={(r) => updateMetric(metric, "below", r)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="settings-section" style={{ marginTop: "2rem" }}>
        <h3 className="settings-section-title">Email Notifications (Gmail or any email)</h3>
        <p className="muted settings-section-desc">
          When enabled, alert messages are sent to your email.
        </p>
        <div className="email-settings-card">
          <label className="email-setting-row email-setting-row-inline">
            <input
              type="checkbox"
              checked={emailSettings.enabled}
              onChange={(e) =>
                setEmailSettings((prev) => ({ ...prev, enabled: e.target.checked }))
              }
            />
            <span>Enable email notifications</span>
          </label>
          <label className="email-setting-row">
            <span>Recipient email</span>
            <input
              type="email"
              value={emailSettings.recipientEmail}
              onChange={(e) =>
                setEmailSettings((prev) => ({ ...prev, recipientEmail: e.target.value }))
              }
              placeholder="your@gmail.com"
              className="auth-input"
              style={{ maxWidth: "280px" }}
            />
          </label>
        </div>
        <p className="muted" style={{ marginTop: "0.75rem", fontSize: "0.8rem" }}>
          The Resend API key is stored securely on the server. Set it once via:{" "}
          <code>supabase secrets set RESEND_API_KEY=re_xxx</code>
        </p>
        <div className="settings-actions" style={{ marginTop: "1.25rem" }}>
          <button
            type="button"
            onClick={handleReset}
            className="auth-button auth-button-outline"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="auth-button"
          >
            {saved ? "Saved ✓" : "Save"}
          </button>
        </div>
      </div>
    </main>
  );
}
