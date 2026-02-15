"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { EmptyChartCard } from "@/components/EmptyChart";
import { OverviewAnalysis } from "@/components/OverviewAnalysis";
import { CriticalAlerts } from "@/components/CriticalAlerts";
import { AppNav } from "@/components/AppNav";
import { useSensorReadings } from "@/lib/useSensorReadings";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: chartData, loading: dataLoading, error: dataError } = useSensorReadings();

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
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

  return (
    <main className="main">
      <AppNav user={user} onSignOut={handleSignOut} />

      {dataError && (
        <p className="muted" style={{ color: "#f85149", marginBottom: "1rem" }}>
          Could not load sensor data: {dataError}
        </p>
      )}

      <CriticalAlerts />

      <OverviewAnalysis />

      <section className="charts-grid">
        <EmptyChartCard title="Temperature" unit="°C" data={chartData?.Temperature} href="/metrics/temperature" />
        <EmptyChartCard title="Humidity" unit="%" data={chartData?.Humidity} href="/metrics/humidity" />
        <EmptyChartCard title="Soil moisture" unit="%" data={chartData?.["Soil moisture"]} href="/metrics/soil-moisture" />
        <EmptyChartCard title="Soil pH" data={chartData?.["Soil pH"]} href="/metrics/soil-ph" />
        <EmptyChartCard title="Water flow" unit="L" data={chartData?.["Water flow"]} href="/metrics/water-flow" />
        <EmptyChartCard title="Water depth" unit="cm" data={chartData?.["Water depth"]} href="/metrics/water-depth" />
      </section>
    </main>
  );
}
