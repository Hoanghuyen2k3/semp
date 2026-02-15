"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { AppNav } from "@/components/AppNav";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function formatLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isHealthy(label: string): boolean {
  const l = label.toLowerCase();
  return l.includes("healthy") || l.includes("normal");
}

export default function PlantHealthPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [result, setResult] = useState<{
    healthy: boolean;
    topLabel: string;
    confidence: number;
    predictions: { label: string; score: number; raw: string }[];
  } | null>(null);

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

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    setResult(null);
    setImageUrl("");
    setPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setSelectedFile(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a JPEG or PNG image.");
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      setError(null);
      setResult(null);
      setImageUrl("");
      if (!file.type.startsWith("image/")) {
        setError("Please drop a JPEG or PNG image.");
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreview((p) => {
        if (p && p.startsWith("blob:")) URL.revokeObjectURL(p);
        return url;
      });
    },
    []
  );

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    setImageUrl(url);
    setError(null);
    setResult(null);
    if (url) {
      setSelectedFile(null);
      setPreview((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
    } else {
      setPreview(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleAnalyze = useCallback(async () => {
    const hasFile = !!selectedFile;
    const hasUrl = !!imageUrl.trim();
    if (!hasFile && !hasUrl) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = hasFile
        ? await fetch("/api/plant-health", {
            method: "POST",
            body: (() => {
              const formData = new FormData();
              formData.append("image", selectedFile!);
              return formData;
            })(),
          })
        : await fetch("/api/plant-health", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: imageUrl.trim() }),
          });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      const predictions = (data.predictions ?? []) as { label: string; score: number }[];
      const top = predictions[0];
      if (!top) {
        throw new Error("No prediction returned");
      }

      const healthy = isHealthy(top.label);
      const top5 = predictions.slice(0, 5).map((p) => ({
        label: formatLabel(p.label),
        score: Math.round(p.score * 100),
        raw: p.label,
      }));

      setResult({
        healthy,
        topLabel: formatLabel(top.label),
        confidence: Math.round(top.score * 100),
        predictions: top5,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setResult(null);
    } finally {
      setAnalyzing(false);
    }
  }, [selectedFile, imageUrl]);

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

  return (
    <main className="main">
      <AppNav user={user} onSignOut={handleSignOut} />

      <div className="plant-health-header">
        <h2>Plant Health Analysis</h2>
        <p className="muted plant-health-desc">
          Upload a plant or leaf image for AI-powered health analysis.
        </p>
      </div>

      {error && (
        <p className="muted" style={{ color: "var(--danger)", marginTop: "1rem" }}>
          {error}
        </p>
      )}

      <div className="plant-health-main">
        <div className="plant-health-left">
          <div
            className={`plant-health-dropzone ${preview ? "has-preview" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="plant-health-input"
            />
            {preview ? (
              <img src={preview} alt="Preview" className="plant-health-preview" />
            ) : (
              <p className="muted">Drop an image here or click to browse</p>
            )}
          </div>
          <div className="plant-health-url-section">
            <span className="muted">Or paste image URL</span>
            <input
              type="url"
              value={imageUrl}
              onChange={handleUrlChange}
              placeholder="https://example.com/plant-image.jpg"
              className="auth-input plant-health-url-input"
            />
          </div>
          <button
            type="button"
            className="auth-button"
            onClick={handleAnalyze}
            disabled={(!selectedFile && !imageUrl.trim()) || analyzing}
          >
            {analyzing ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        {result && (
        <div className="plant-health-result">
          <div className="plant-health-summary">
            <div
              className={`plant-health-status ${result.healthy ? "healthy" : "diseased"}`}
            >
              <span className="plant-health-status-icon">
                {result.healthy ? "✓" : "⚠"}
              </span>
              <span className="plant-health-status-label">
                {result.healthy ? "Healthy" : "Diseased"}
              </span>
            </div>
            <div className="plant-health-confidence">
              <span className="muted">Confidence</span>
              <strong>{result.confidence}%</strong>
            </div>
            <div className="plant-health-label">
              <span className="muted">Prediction</span>
              <strong>{result.topLabel}</strong>
            </div>
          </div>

          <div className="plant-health-chart">
            <h3>Top predictions</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={result.predictions}
                layout="vertical"
                margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickLine={{ stroke: "var(--border)" }}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickLine={{ stroke: "var(--border)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickFormatter={(v) => (v.length > 20 ? v.slice(0, 18) + "…" : v)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div
                        className="chart-tooltip"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--text)",
                          borderRadius: 6,
                          padding: "0.5rem 0.75rem",
                          fontSize: "0.8rem",
                        }}
                      >
                        {p.label}: <strong>{p.score}%</strong>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {result.predictions.map((entry, i) => (
                    <Cell
                      key={entry.raw}
                      fill={
                        isHealthy(entry.raw)
                          ? "var(--success)"
                          : "var(--warn)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}
      </div>
    </main>
  );
}
