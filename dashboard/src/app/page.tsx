"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { EmptyChartCard } from "@/components/EmptyChart";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        <h1>Garden Monitoring</h1>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="main">
        <h1>Garden Monitoring</h1>
        <p className="muted">Redirecting to sign in…</p>
      </main>
    );
  }

  return (
    <main className="main">
      <header className="dashboard-header">
        <div>
          <h1>Garden Environment Monitoring</h1>
          <p className="subtitle">
            LoRaWAN sensors → Gateway → TTN → Supabase → this dashboard
          </p>
        </div>
        <div className="dashboard-actions">
          <span className="muted">{user.email}</span>
          <button type="button" onClick={handleSignOut} className="auth-button auth-button-outline">
            Sign out
          </button>
        </div>
      </header>

      <section className="charts-grid">
        <EmptyChartCard title="Temperature" unit="°C" />
        <EmptyChartCard title="Humidity" unit="%" />
        <EmptyChartCard title="Soil moisture" unit="%" />
        <EmptyChartCard title="Soil pH" />
        <EmptyChartCard title="Water flow" unit="L" />
        <EmptyChartCard title="Water depth" unit="cm" />
      </section>
    </main>
  );
}
