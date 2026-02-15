import type { Metadata } from "next";
import "./globals.css";
import { AlertNotificationProvider } from "@/context/AlertNotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('semp-theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
        <ThemeProvider>
          <AlertNotificationProvider>{children}</AlertNotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
