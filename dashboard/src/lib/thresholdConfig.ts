export type AlertSeverity = "critical" | "warning" | "info";

export type ThresholdRule = {
  value: number;
  message: string;
  severity: AlertSeverity;
  enabled: boolean;
};

/** Single-direction threshold (e.g. "above X" or "below X") */
export type MetricThresholds = {
  above?: ThresholdRule;  // alert when value >= threshold
  below?: ThresholdRule;  // alert when value <= threshold
};

export type CriticalAlert = {
  id: string;
  metric: string;
  message: string;
  severity: AlertSeverity;
  value: number;
  unit?: string;
  threshold?: string;
  receivedAt: string;
};

export type ThresholdConfig = {
  Temperature: MetricThresholds;
  Humidity: MetricThresholds;
  "Soil moisture": MetricThresholds;
  "Soil pH": MetricThresholds;
  "Water depth": MetricThresholds;
};

const STORAGE_KEY = "garden-threshold-config";

/** Default pre-defined thresholds */
export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  Temperature: {
    above: {
      value: 35,
      message: "Temperature too high",
      severity: "critical",
      enabled: true,
    },
    below: {
      value: 5,
      message: "Temperature too low",
      severity: "warning",
      enabled: true,
    },
  },
  Humidity: {
    below: {
      value: 20,
      message: "Humidity too low (dry)",
      severity: "warning",
      enabled: true,
    },
    above: {
      value: 95,
      message: "Humidity too high",
      severity: "info",
      enabled: true,
    },
  },
  "Soil moisture": {
    below: {
      value: 15,
      message: "Soil moisture too low – plants may need water",
      severity: "critical",
      enabled: true,
    },
  },
  "Soil pH": {
    below: {
      value: 5,
      message: "Soil pH too acidic",
      severity: "warning",
      enabled: true,
    },
    above: {
      value: 8.5,
      message: "Soil pH too alkaline",
      severity: "warning",
      enabled: true,
    },
  },
  "Water depth": {
    below: {
      value: 5,
      message: "Water level too low – reservoir needs refill",
      severity: "critical",
      enabled: true,
    },
  },
};

export const METRIC_UNITS: Partial<Record<keyof ThresholdConfig, string>> = {
  Temperature: "°C",
  Humidity: "%",
  "Soil moisture": "%",
  "Soil pH": "",
  "Water depth": "cm",
};

function deepMerge(
  defaults: ThresholdConfig,
  overrides: Partial<ThresholdConfig>
): ThresholdConfig {
  const result = JSON.parse(JSON.stringify(defaults)) as ThresholdConfig;

  for (const metric of Object.keys(defaults) as (keyof ThresholdConfig)[]) {
    const def = defaults[metric];
    const ovr = overrides[metric];
    if (!ovr) continue;

    if (ovr.above) {
      result[metric].above = { ...def?.above, ...ovr.above };
    }
    if (ovr.below) {
      result[metric].below = { ...def?.below, ...ovr.below };
    }
  }

  return result;
}

export function loadThresholdConfig(): ThresholdConfig {
  if (typeof window === "undefined") return DEFAULT_THRESHOLDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    const parsed = JSON.parse(raw) as Partial<ThresholdConfig>;
    return deepMerge(DEFAULT_THRESHOLDS, parsed);
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export function saveThresholdConfig(config: ThresholdConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event("threshold-config-changed"));
  } catch {
    // ignore
  }
}

export function resetThresholdConfig(): ThresholdConfig {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("threshold-config-changed"));
  }
  return DEFAULT_THRESHOLDS;
}
