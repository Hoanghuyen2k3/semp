import { NextResponse } from "next/server";
import type { WeatherDaySummary, WeatherPayload, WeatherSlot } from "@/lib/gardenPredictions";

export const dynamic = "force-dynamic";

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

function groupForecast(list: OwListItem[]): { days: WeatherDaySummary[]; slots24h: WeatherSlot[] } {
  const now = Date.now() / 1000;
  const dayMap = new Map<
    string,
    { temps: number[]; pops: number[]; icons: string[]; descs: string[]; firstDt: number }
  >();

  const slots24h: WeatherSlot[] = [];
  const horizon = now + 24 * 60 * 60;

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

    if (item.dt <= horizon && slots24h.length < 8) {
      const w = item.weather[0];
      slots24h.push({
        time: item.dt_txt.slice(11, 16),
        temp: item.main.temp,
        icon: w?.icon ?? "01d",
        pop: item.pop ?? 0,
        description: w?.description ?? "",
      });
    }
  }

  const days: WeatherDaySummary[] = Array.from(dayMap.entries())
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

  return { days, slots24h };
}

export async function GET() {
  const key = process.env.OPENWEATHER_API_KEY;
  const lat = process.env.OPENWEATHER_LAT ?? "43.6532";
  const lon = process.env.OPENWEATHER_LON ?? "-79.3832";

  if (!key) {
    return NextResponse.json(
      { error: "Weather not configured. Set OPENWEATHER_API_KEY and coordinates in .env.local" },
      { status: 503 }
    );
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${encodeURIComponent(key)}&units=metric`;

  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json(
        { error: `OpenWeather error ${res.status}`, detail: t.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as OwForecastResponse;
    const list = data.list ?? [];
    const { days, slots24h } = groupForecast(list);

    const now = Date.now() / 1000;
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
