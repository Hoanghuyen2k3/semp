"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { AppNav } from "@/components/AppNav";

const PIX4D_BASE = "https://cloud.pix4d.com/site/362309/dataset/2241473";
const SHARE_TOKEN = "f32be2d3-1ef2-40e8-8c09-1e8d71c4ee2a";

const PIX4D_URLS = {
  "2d": `${PIX4D_BASE}/map?shareToken=${SHARE_TOKEN}`,
  "3d": `${PIX4D_BASE}/3d?shareToken=${SHARE_TOKEN}`,
};

export default function LivePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");

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
        <h1>SEMP</h1>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="main">
        <h1>SEMP</h1>
        <p className="muted">Redirecting to sign in…</p>
      </main>
    );
  }

  const currentUrl = PIX4D_URLS[viewMode];

  return (
    <main className="main">
      <AppNav user={user} onSignOut={handleSignOut} />

      <div className="live-header">
        <div>
          <h2>Drone Footage</h2>
          <p className="muted live-desc">
            Summer drone survey from Pix4D Cloud. Switch between 2D map and 3D view.
          </p>
        </div>
        <div className="live-controls">
        </div>
      </div>

      <div className="live-embed-container">
        <iframe
          src={currentUrl}
          title="Pix4D Drone Map"
          className="live-iframe"
          allowFullScreen
        />
      </div>
    </main>
  );
}
