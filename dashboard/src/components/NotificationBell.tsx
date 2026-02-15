"use client";

import { useState, useRef, useEffect } from "react";
import type { CriticalAlert } from "@/lib/thresholdConfig";
import { markAllAlertsAsRead } from "@/lib/notificationStore";

type NotificationBellProps = {
  alerts: CriticalAlert[];
  unreadCount: number;
  onMarkAllRead: () => void;
};

const SEVERITY_ICONS: Record<string, string> = {
  critical: "⚠",
  warning: "⚡",
  info: "ℹ",
};

export function NotificationBell({
  alerts,
  unreadCount,
  onMarkAllRead,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleMarkAllRead() {
    markAllAlertsAsRead(alerts);
    onMarkAllRead();
  }

  return (
    <div className="notification-bell-wrapper" ref={ref}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`${unreadCount} unread notifications`}
        aria-expanded={open}
      >
        <svg
          className="notification-bell-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span>Alerts</span>
            {alerts.length > 0 && (
              <button
                type="button"
                className="notification-mark-all"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-list">
            {alerts.length === 0 ? (
              <p className="muted notification-empty">No alerts</p>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className={`notification-item notification-${a.severity}`}
                >
                  <span className="notification-item-icon">
                    {SEVERITY_ICONS[a.severity] ?? "•"}
                  </span>
                  <div className="notification-item-content">
                    <strong>{a.metric}:</strong> {a.message}
                    <div className="notification-item-meta">
                      {a.value}
                      {a.unit ?? ""} • {new Date(a.receivedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
