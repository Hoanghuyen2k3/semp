"use client";

import { createContext, useContext } from "react";
import { useAlertNotifications } from "@/lib/useAlertNotifications";
import { ToastContainer } from "@/components/ToastContainer";
import type { CriticalAlert } from "@/lib/thresholdConfig";

type AlertNotificationContextValue = {
  alerts: CriticalAlert[];
  dismissToast: (id: string) => void;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refreshRead: () => void;
};

const AlertNotificationContext = createContext<AlertNotificationContextValue | null>(null);

export function AlertNotificationProvider({ children }: { children: React.ReactNode }) {
  const value = useAlertNotifications();
  return (
    <AlertNotificationContext.Provider
      value={{
        alerts: value.alerts,
        dismissToast: value.dismissToast,
        unreadCount: value.unreadCount,
        loading: value.loading,
        error: value.error,
        refreshRead: value.refreshRead,
      }}
    >
      {children}
      <ToastContainer toasts={value.toasts} onDismiss={value.dismissToast} />
    </AlertNotificationContext.Provider>
  );
}

export function useAlertNotificationContext() {
  const ctx = useContext(AlertNotificationContext);
  return ctx;
}
