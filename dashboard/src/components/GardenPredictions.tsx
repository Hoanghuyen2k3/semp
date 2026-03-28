"use client";

import { computeGardenPredictions } from "@/lib/gardenPredictions";
import type { WeatherPayload } from "@/lib/gardenPredictions";
import type { ChartDataset } from "@/lib/useSensorReadings";

type Props = {
  chartData: ChartDataset | null;
  weather: WeatherPayload | null;
  dataLoading: boolean;
};

const SEVERITY_CLASS: Record<string, string> = {
  info: "prediction-sev-info",
  watch: "prediction-sev-watch",
  action: "prediction-sev-action",
};

export function GardenPredictions({ chartData, weather, dataLoading }: Props) {
  if (dataLoading) {
    return (
      <section className="overview-section predictions-section">
        <h2>Sensor predictions</h2>
        <p className="muted">Waiting for sensor data…</p>
      </section>
    );
  }

  const items = computeGardenPredictions(chartData, weather);

  return (
    <section className="overview-section predictions-section">
      <div className="overview-header">
        <h2>Sensor predictions</h2>
        <span className="muted overview-badge">Rule-based</span>
      </div>
      <p className="muted overview-desc">
        Uses the weather panel and latest soil moisture, humidity, and water depth when available.
      </p>
      <ul className="prediction-list">
        {items.map((p) => (
          <li key={p.id} className={`prediction-card ${SEVERITY_CLASS[p.severity] ?? ""}`}>
            <strong className="prediction-title">{p.title}</strong>
            <p className="prediction-detail">{p.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
