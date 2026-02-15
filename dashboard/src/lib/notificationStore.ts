"use client";

import type { CriticalAlert } from "./thresholdConfig";

const READ_ALERTS_KEY = "garden-read-alert-ids";
const EMAIL_SETTINGS_KEY = "garden-email-notification-settings";

export type EmailNotificationSettings = {
  enabled: boolean;
  recipientEmail: string;
};

export function loadReadAlertIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_ALERTS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function saveReadAlertIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(READ_ALERTS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

export function markAlertsAsRead(alertIds: string[]): void {
  const read = loadReadAlertIds();
  alertIds.forEach((id) => read.add(id));
  saveReadAlertIds(read);
  window.dispatchEvent(new Event("notification-read-updated"));
}

export function markAllAlertsAsRead(alerts: CriticalAlert[]): void {
  markAlertsAsRead(alerts.map((a) => a.id));
}

export function loadEmailSettings(): EmailNotificationSettings {
  if (typeof window === "undefined") {
    return { enabled: false, recipientEmail: "" };
  }
  try {
    const raw = localStorage.getItem(EMAIL_SETTINGS_KEY);
    if (!raw) return { enabled: false, recipientEmail: "" };
    const parsed = JSON.parse(raw) as EmailNotificationSettings & { resendApiKey?: string };
    return { enabled: parsed.enabled, recipientEmail: parsed.recipientEmail ?? "" };
  } catch {
    return { enabled: false, recipientEmail: "" };
  }
}

export function saveEmailSettings(settings: EmailNotificationSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event("email-settings-changed"));
  } catch {
    // ignore
  }
}
