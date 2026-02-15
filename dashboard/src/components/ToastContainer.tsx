"use client";

import { useEffect, useState } from "react";
import type { CriticalAlert } from "@/lib/thresholdConfig";

export type Toast = {
  id: string;
  alert: CriticalAlert;
  createdAt: number;
};

type ToastContainerProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

const TOAST_DURATION_MS = 5000;

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const severityClass = `toast-${toast.alert.severity}`;
  const time = new Date(toast.alert.receivedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`toast ${severityClass} ${visible ? "toast-visible" : ""}`}
      role="alert"
    >
      <div className="toast-header">
        <span className="toast-metric">{toast.alert.metric}</span>
        <span className="toast-time">{time}</span>
        <button
          type="button"
          className="toast-close"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <p className="toast-message">{toast.alert.message}</p>
      <p className="toast-value">
        Current: {toast.alert.value}
        {toast.alert.unit ?? ""}
      </p>
    </div>
  );
}
