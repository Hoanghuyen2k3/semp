"use client";

import type { WeatherPayload } from "@/lib/gardenPredictions";
import { WEATHER_DISPLAY_LOCATION } from "@/lib/weatherLocation";

type Props = {
  weather: WeatherPayload | null;
  loading: boolean;
  error: string | null;
};

export function WeatherForecast({ weather, loading, error }: Props) {
  if (loading) {
    return (
      <section className="weather-panel weather-panel--loading">
        <div className="weather-panel-head">
          <h2 className="weather-panel-title">Weather</h2>
        </div>
        <p className="muted">Loading forecast…</p>
      </section>
    );
  }

  if (error || !weather) {
    return (
      <section className="weather-panel">
        <div className="weather-panel-head">
          <h2 className="weather-panel-title">Weather</h2>
        </div>
        <p className="muted" style={{ color: "var(--danger)" }}>
          {error ?? "Forecast unavailable. Check OPENWEATHER_API_KEY and coordinates in .env.local."}
        </p>
      </section>
    );
  }

  const iconUrl = (code: string) => `https://openweathermap.org/img/wn/${code}@2x.png`;

  const weekLo = weather.days.length
    ? Math.min(...weather.days.map((d) => d.tempMin))
    : 0;
  const weekHi = weather.days.length
    ? Math.max(...weather.days.map((d) => d.tempMax))
    : 1;
  const weekSpan = Math.max(0.5, weekHi - weekLo);

  return (
    <section className="weather-panel" aria-labelledby="weather-heading">
      <div className="weather-panel-head">
        <div>
          <h2 id="weather-heading" className="weather-panel-title">
            Weather
          </h2>
            <p className="weather-panel-location">
            {WEATHER_DISPLAY_LOCATION}
          </p>
        </div>
        <div className="weather-panel-summary" role="group" aria-label="24h summary">
          <div className="weather-summary-pill">
            <span className="weather-summary-value">{weather.avgTemp24h.toFixed(0)}°</span>
            <span className="weather-summary-label">Avg next 24h</span>
          </div>
          <div className="weather-summary-pill">
            <span className="weather-summary-value">{Math.round(weather.rainRisk24h * 100)}%</span>
            <span className="weather-summary-label">Max rain chance</span>
          </div>
          <div className="weather-summary-pill weather-summary-pill--rain">
            <span className="weather-summary-value">{weather.rainLikely24h ? "Likely" : "Unlikely"}</span>
            <span className="weather-summary-label">Rain in 24h</span>
          </div>
        </div>
      </div>

      {weather.slots24h.length > 0 && (
        <div className="weather-hourly">
          <div className="weather-hourly-header">
            <h3 className="weather-hourly-title">Next 24 hours</h3>
            <span className="weather-hourly-badge">Every 4 hours</span>
          </div>
          <div className="weather-slots-row">
            {weather.slots24h.map((s, i) => (
              <div key={`${s.label}-${i}`} className="weather-slot">
                <span className="weather-slot-time">{s.label}</span>
                <img
                  className="weather-slot-icon"
                  src={iconUrl(s.icon)}
                  alt={s.description || "Forecast"}
                  width={44}
                  height={44}
                />
                <span className="weather-slot-temp">{Math.round(s.temp)}°</span>
                <span className="weather-slot-desc" title={s.description}>
                  {s.description}
                </span>
                <div className="weather-slot-pop-wrap" aria-hidden>
                  <div
                    className="weather-slot-pop-bar"
                    style={{ width: `${Math.round(s.pop * 100)}%` }}
                  />
                </div>
                <span className="weather-slot-pop-label">{Math.round(s.pop * 100)}% rain</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="weather-daily">
        <h3 className="weather-daily-title">5-day outlook</h3>
        <div className="weather-days-row">
          {weather.days.map((d) => {
            const leftPct = ((d.tempMin - weekLo) / weekSpan) * 100;
            const widthPct = ((d.tempMax - d.tempMin) / weekSpan) * 100;
            return (
              <div key={d.date} className="weather-day-card">
                <div className="weather-day-label">{d.label}</div>
                <img
                  className="weather-day-icon"
                  src={iconUrl(d.icon)}
                  alt=""
                  width={44}
                  height={44}
                />
                <div className="weather-day-temps">
                  <span className="weather-day-lo">{Math.round(d.tempMin)}°</span>
                  <span className="weather-day-hi">{Math.round(d.tempMax)}°</span>
                </div>
                <div className="weather-day-range" aria-hidden>
                  <span
                    className="weather-day-range-fill"
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(10, widthPct)}%`,
                    }}
                  />
                </div>
                <p className="weather-day-desc">{d.description}</p>
                <span className="muted weather-day-pop">Rain up to {Math.round(d.popMax * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
