import type { Metadata } from "next";
import "./globals.css";
import { AlertNotificationProvider } from "@/context/AlertNotificationContext";

export const metadata: Metadata = {
  title: "Smart Eco-Monitoring Platform",
  description: "LoRaWAN sensor dashboard – temperature, humidity, soil, water, flow, visitors",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AlertNotificationProvider>{children}</AlertNotificationProvider>
      </body>
    </html>
  );
}
