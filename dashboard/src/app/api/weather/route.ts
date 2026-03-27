import { NextResponse } from "next/server";
import type { WeatherDaySummary, WeatherPayload, WeatherSlot } from "@/lib/gardenPredictions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OwListItem = {
  dt: number;
  dt_txt: string;
  main: { temp: number };
  weather: { main: string; description: string; icon: string }[];
  pop: number;
};

type OwForecastResponse = {
  city?: { name: string; country: string };
  list: OwListItem[];
};

function pickW(item: OwListItem) {
  return item.weather[0];
}

function formatSlotLabel(tsSec: number): string {
  return new Date(tsSec * 1000).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Six samples over 24h at 4h steps; linear interp between OpenWeather’s 3h points. */
function buildFourHourSlots(list: OwListItem[], nowSec: number): WeatherSlot[] {
  const sorted = [...list].filter((x) => x.dt > nowSec).sort((a, b) => a.dt - b.dt);
  if (sorted.length === 0) return [];

  const FOUR_H = 4 * 3600;
  const slots: WeatherSlot[] = [];

  const interpolateOne = (target: number): WeatherSlot => {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (target <= first.dt) {
      const w = pickW(first);
      return {
        label: formatSlotLabel(target),
        temp: first.main.temp,
        icon: w?.icon ?? "01d",
        pop: first.pop ?? 0,
        description: w?.description ?? "",
      };
    }
    if (target >= last.dt) {
      const w = pickW(last);
      return {
        label: formatSlotLabel(target),
        temp: last.main.temp,
        icon: w?.icon ?? "01d",
        pop: last.pop ?? 0,
        description: w?.description ?? "",
      };
    }

    for (let j = 0; j < sorted.length - 1; j++) {
      const a = sorted[j];
      const b = sorted[j + 1];
      if (a.dt <= target && target <= b.dt) {
        const span = b.dt - a.dt;
        const frac = span > 0 ? (target - a.dt) / span : 0;
        const temp = a.main.temp + frac * (b.main.temp - a.main.temp);
        const pop = (a.pop ?? 0) + frac * ((b.pop ?? 0) - (a.pop ?? 0));
        const pick = frac < 0.5 ? a : b;
        const w = pickW(pick);
        return {
          label: formatSlotLabel(target),
          temp,
          icon: w?.icon ?? "01d",
          pop: Math.min(1, Math.max(0, pop)),
          description: w?.description ?? "",
        };
      }
    }

    let nearest = sorted[0];
    let best = Math.abs(nearest.dt - target);
    for (const item of sorted) {
      const d = Math.abs(item.dt - target);
      if (d < best) {
        best = d;
        nearest = item;
      }
    }
    const w = pickW(nearest);
    return {
      label: formatSlotLabel(target),
      temp: nearest.main.temp,
      icon: w?.icon ?? "01d",
      pop: nearest.pop ?? 0,
      description: w?.description ?? "",
    };
  };

  for (let i = 0; i < 6; i++) {
    slots.push(interpolateOne(nowSec + i * FOUR_H));
  }

  return slots;
}

function groupDays(list: OwListItem[]): WeatherDaySummary[] {
  const now = Date.now() / 1000;
  const dayMap = new Map<
    string,
    { temps: number[]; pops: number[]; icons: string[]; descs: string[]; firstDt: number }
  >();

  for (const item of list) {
    if (item.dt <= now) continue;
    const dateKey = item.dt_txt.slice(0, 10);
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, { temps: [], pops: [], icons: [], descs: [], firstDt: item.dt });
    }
    const g = dayMap.get(dateKey)!;
    g.temps.push(item.main.temp);
    g.pops.push(item.pop ?? 0);
    const w = item.weather[0];
    if (w) {
      g.icons.push(w.icon);
      g.descs.push(w.description);
    }
  }

  return Array.from(dayMap.entries())
    .sort((a, b) => a[1].firstDt - b[1].firstDt)
    .slice(0, 5)
    .map(([dateKey, g]) => {
      const temps = g.temps;
      const mid = Math.floor(g.icons.length / 2);
      const icon = g.icons[mid] ?? g.icons[0] ?? "01d";
      const desc = g.descs[mid] ?? g.descs[0] ?? "";
      const d = new Date(dateKey + "T12:00:00");
      return {
        date: dateKey,
        label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
        tempMin: Math.min(...temps),
        tempMax: Math.max(...temps),
        description: desc,
        icon,
        popMax: Math.max(...g.pops, 0),
      };
    });
}

export async function GET() {
  const key = process.env["OPENWEATHER_API_KEY"];
  const lat = process.env["OPENWEATHER_LAT"] ?? "43.6532";
  const lon = process.env["OPENWEATHER_LON"] ?? "-79.3832";

  if (!key?.trim()) {
    return NextResponse.json(
      { error: "Weather not configured. Set OPENWEATHER_API_KEY and coordinates in .env.local" },
      { status: 503 }
    );
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${encodeURIComponent(key)}&units=metric`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json(
        { error: `OpenWeather error ${res.status}`, detail: t.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as OwForecastResponse;
    const list = data.list ?? [];
    const now = Date.now() / 1000;

    const days = groupDays(list);
    const slots24h = buildFourHourSlots(list, now);

    const next24 = list.filter((x) => x.dt > now && x.dt <= now + 24 * 3600);
    const pops = next24.map((x) => x.pop ?? 0);
    const rainRisk24h = pops.length ? Math.max(...pops) : 0;
    const rainLikely24h = next24.some((x) => {
      const main = x.weather[0]?.main?.toLowerCase() ?? "";
      return main.includes("rain") || main.includes("drizzle") || (x.pop ?? 0) >= 0.45;
    });
    const temps24 = next24.map((x) => x.main.temp);
    const avgTemp24h =
      temps24.length > 0 ? temps24.reduce((a, b) => a + b, 0) / temps24.length : 0;

    const payload: WeatherPayload = {
      city: data.city?.name ?? "Location",
      country: data.city?.country ?? "",
      days,
      slots24h,
      rainRisk24h,
      rainLikely24h,
      avgTemp24h,
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error("Weather API:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Weather request failed" },
      { status: 500 }
    );
  }
}
