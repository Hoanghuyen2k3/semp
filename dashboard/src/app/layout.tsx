import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garden Environment Monitoring",
  description: "LoRaWAN sensor dashboard – temperature, humidity, soil, water, flow, visitors",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
