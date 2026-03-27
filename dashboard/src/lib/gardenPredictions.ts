import type { ChartDataset } from "./useSensorReadings";

export type WeatherSlot = {
  time: string;
  temp: number;
  icon: string;
  pop: number;
  description: string;
};

export type WeatherDaySummary = {
  date: string;
  label: string;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
  popMax: number;
};

export type WeatherPayload = {
  city: string;
  country: string;
  days: WeatherDaySummary[];
  slots24h: WeatherSlot[];
  /** max pop in next ~24h (0–1) */
  rainRisk24h: number;
  /** true if any slot in next 24h has rain-like conditions or high pop */
  rainLikely24h: boolean;
  /** average forecast temp next 24h (°C) */
  avgTemp24h: number;
};

export type PredictionItem = {
  id: string;
  severity: "info" | "watch" | "action";
  title: string;
  detail: string;
};

function latestValue(points: { value: number }[] | undefined): number | null {
  if (!points?.length) return null;
  return points[points.length - 1].value;
}

/**
 * Rule-based insights combining OpenWeather forecast with latest sensor snapshots.
 */
export function computeGardenPredictions(
  chartData: ChartDataset | null,
  weather: WeatherPayload | null
): PredictionItem[] {
  const out: PredictionItem[] = [];
  const soil = latestValue(chartData?.["Soil moisture"]);
  const hum = latestValue(chartData?.Humidity);
  const airT = latestValue(chartData?.Temperature);
  const depth = latestValue(chartData?.["Water depth"]);
  const ph = latestValue(chartData?.["Soil pH"]);

  if (weather) {
    if (weather.rainLikely24h && soil != null && soil < 35) {
      out.push({
        id: "rain-delay-irrigation",
        severity: "info",
        title: "Rain may reduce irrigation need",
        detail: `Precipitation is likely in the next 24 hours (rain risk ~${Math.round(weather.rainRisk24h * 100)}%). Soil moisture is ${soil.toFixed(0)}% — consider delaying watering unless plants show stress.`,
      });
    }

    if (!weather.rainLikely24h && soil != null && soil < 20) {
      out.push({
        id: "dry-no-rain",
        severity: "action",
        title: "Soil dry with little rain expected",
        detail: `Soil moisture is low (${soil.toFixed(0)}%) and the short-term forecast is mostly dry. Plan irrigation or check drip lines soon.`,
      });
    }

    if (weather.avgTemp24h > 28 && soil != null && soil < 40) {
      out.push({
        id: "heat-et",
        severity: "watch",
        title: "Warm spell + moderate soil water",
        detail: `Average temperature next ~24h is around ${weather.avgTemp24h.toFixed(0)}°C. Evapotranspiration can rise; monitor soil moisture (${soil.toFixed(0)}%).`,
      });
    }

    if (weather.rainLikely24h && depth != null && depth < 15) {
      out.push({
        id: "tank-rain",
        severity: "info",
        title: "Rain incoming; check water storage",
        detail: `Water depth reads ${depth.toFixed(0)} cm. If you harvest rainwater, ensure gutters/barrels are ready; soil may still need attention if dry.`,
      });
    }
  }

  if (soil != null && hum != null && airT != null) {
    if (soil < 18 && hum < 40 && airT > 22) {
      out.push({
        id: "dry-air-soil",
        severity: "action",
        title: "Dry soil in warm, relatively dry air",
        detail: `Soil ${soil.toFixed(0)}%, humidity ${hum.toFixed(0)}%, air ${airT.toFixed(1)}°C — conditions favour moisture loss from the bed.`,
      });
    }
  }

  if (depth != null && depth < 8) {
    out.push({
      id: "low-reservoir",
      severity: "action",
      title: "Water reservoir level low",
      detail: `Water depth is ${depth.toFixed(0)} cm. Refill or verify the sensor if this is unexpected.`,
    });
  }

  if (ph != null && (ph < 5.5 || ph > 8)) {
    out.push({
      id: "ph-range",
      severity: "watch",
      title: "Soil pH outside typical range",
      detail: `Latest pH is ${ph.toFixed(1)}. Many crops prefer roughly 6–7.5; adjust amendments based on what you grow.`,
    });
  }

  if (out.length === 0) {
    out.push({
      id: "all-clear",
      severity: "info",
      title: "No strong alerts from current rules",
      detail:
        weather != null
          ? `Watching ${weather.city}: forecast and sensors look routine. Add more history for richer trends.`
          : "Connect weather (API key + coordinates) and keep sensors online for irrigation hints.",
    });
  }

  return out;
}

export function buildChatContextSummary(
  chartData: ChartDataset | null,
  weather: WeatherPayload | null
): string {
  const lines: string[] = [];
  const pick = (label: string, key: keyof ChartDataset) => {
    const v = latestValue(chartData?.[key]);
    if (v != null) lines.push(`${label}: ${typeof v === "number" && !Number.isInteger(v) ? v.toFixed(1) : v}`);
  };
  pick("Air temperature (°C)", "Temperature");
  pick("Humidity (%)", "Humidity");
  pick("Soil moisture (%)", "Soil moisture");
  pick("Soil pH", "Soil pH");
  pick("Water flow (latest)", "Water flow");
  pick("Water depth (cm)", "Water depth");

  if (weather) {
    lines.push(
      `Weather (${weather.city}): rain likely 24h=${weather.rainLikely24h}, avg temp ~${weather.avgTemp24h.toFixed(0)}°C`
    );
  }

  return lines.length ? lines.join("\n") : "No recent sensor rows in view.";
}
