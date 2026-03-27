"use client";

import type { WeatherPayload } from "@/lib/gardenPredictions";

type Props = {
  weather: WeatherPayload | null;
  loading: boolean;
  error: string | null;
};

export function WeatherForecast({ weather, loading, error }: Props) {
  if (loading) {
    return (
      <section className="overview-section weather-section">
        <h2>Weather forecast</h2>
        <p className="muted">Loading forecast…</p>
      </section>
    );
  }

  if (error || !weather) {
    return (
      <section className="overview-section weather-section">
        <h2>Weather forecast</h2>
        <p className="muted" style={{ color: "var(--danger)" }}>
          {error ?? "Forecast unavailable. Check OPENWEATHER_API_KEY and coordinates in .env.local."}
        </p>
      </section>
    );
  }

  const iconUrl = (code: string) => `https://openweathermap.org/img/wn/${code}@2x.png`;

  return (
    <section className="overview-section weather-section">
      <div className="overview-header">
        <h2>Weather forecast</h2>
        <span className="muted overview-badge">
          {weather.city}
          {weather.country ? `, ${weather.country}` : ""}
        </span>
      </div>
      <p className="muted overview-desc">
        Next ~24h: avg ~{weather.avgTemp24h.toFixed(0)}°C · rain likely: {weather.rainLikely24h ? "yes" : "no"} · max
        precip. chance {Math.round(weather.rainRisk24h * 100)}%
      </p>

      {weather.slots24h.length > 0 && (
        <div className="weather-slots">
          <h3 className="weather-sub">Next 24 hours (3-hour steps)</h3>
          <div className="weather-slots-row">
            {weather.slots24h.map((s, i) => (
              <div key={`${s.time}-${i}`} className="weather-slot">
                <span className="weather-slot-time">{s.time}</span>
                <img src={iconUrl(s.icon)} alt="" width={40} height={40} />
                <span className="weather-slot-temp">{s.temp.toFixed(0)}°</span>
                <span className="muted weather-slot-pop">{Math.round(s.pop * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="weather-days">
        <h3 className="weather-sub">5-day outlook</h3>
        <div className="weather-days-row">
          {weather.days.map((d) => (
            <div key={d.date} className="weather-day-card">
              <div className="weather-day-label">{d.label}</div>
              <img src={iconUrl(d.icon)} alt="" width={48} height={48} />
              <div className="weather-day-temps">
                {d.tempMin.toFixed(0)}° / {d.tempMax.toFixed(0)}°
              </div>
              <p className="muted weather-day-desc">{d.description}</p>
              <span className="muted weather-day-pop">Rain up to {Math.round(d.popMax * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
