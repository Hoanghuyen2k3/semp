"use client";

import { useEffect, useState } from "react";
import type { WeatherPayload } from "./gardenPredictions";

export function useWeatherForecast() {
  const [data, setData] = useState<WeatherPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/weather");
        const json = await res.json();
        if (!res.ok) {
          setError((json.error as string) ?? "Weather failed");
          setData(null);
          return;
        }
        if (!cancelled) setData(json as WeatherPayload);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Weather failed");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return { data, loading, error };
}
