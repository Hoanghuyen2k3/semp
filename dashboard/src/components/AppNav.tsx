"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { useAlertNotificationContext } from "@/context/AlertNotificationContext";
import { NotificationBell } from "./NotificationBell";

type AppNavProps = {
  user: User | null;
  onSignOut: () => void;
};

export function AppNav({ user, onSignOut }: AppNavProps) {
  const pathname = usePathname();
  const notificationCtx = useAlertNotificationContext();
  const isDashboard = pathname === "/" || pathname?.startsWith("/metrics");
  const isSettings = pathname === "/settings";

  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <h1 className="app-nav-title">SEMP</h1>
        <nav className="app-nav-tabs">
          <Link
            href="/"
            className={`app-nav-tab ${isDashboard ? "active" : ""}`}
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className={`app-nav-tab ${isSettings ? "active" : ""}`}
          >
            Settings
          </Link>
        </nav>
        {user && (
          <div className="app-nav-actions">
            {notificationCtx && (
              <NotificationBell
                alerts={notificationCtx.alerts}
                unreadCount={notificationCtx.unreadCount}
                onMarkAllRead={notificationCtx.refreshRead}
              />
            )}
            <span className="muted">{user.email}</span>
            <button
              type="button"
              onClick={onSignOut}
              className="auth-button auth-button-outline"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
