"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartDataPoint } from "@/lib/useSensorReadings";

type MetricDetailChartProps = {
  title: string;
  unit?: string;
  data: ChartDataPoint[];
};

function formatDateTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function CustomTooltip({
  active,
  payload,
  title,
  unit,
}: {
  active?: boolean;
  payload?: unknown[];
  title: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const first = payload[0] as Record<string, unknown>;
  const p = (first?.payload ?? first) as ChartDataPoint;
  const dt = formatDateTime(p.received_at);
  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 6,
        padding: "0.5rem 0.75rem",
        fontSize: "0.8rem",
      }}
    >
      <div style={{ color: "#8b949e" }}>{dt}</div>
      <div>
        {title}: <strong>{p.value}{unit ?? ""}</strong>
      </div>
    </div>
  );
}

function getDomain(data: ChartDataPoint[]): [number, number] {
  const values = data.map((d) => d.value).filter((v) => v != null && !Number.isNaN(v));
  if (values.length === 0) return [0, 100];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.1);
  return [Math.min(min - pad, min), Math.max(max + pad, max)];
}

export function MetricDetailChart({ title, unit, data }: MetricDetailChartProps) {
  const id = `detail-${title.replace(/\s/g, "")}`;
  const domain = data.length > 0 ? getDomain(data) : [0, 100];
  const chartData = data.length > 0 ? data : [{ name: "-", value: 0, received_at: "" }];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#58a6ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4d" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#8b949e", fontSize: 11 }}
          tickLine={{ stroke: "#2d3a4d" }}
          axisLine={{ stroke: "#2d3a4d" }}
        />
        <YAxis
          domain={domain}
          tick={{ fill: "#8b949e", fontSize: 11 }}
          tickLine={{ stroke: "#2d3a4d" }}
          axisLine={{ stroke: "#2d3a4d" }}
          unit={unit}
        />
        <Tooltip
          content={(props) => <CustomTooltip {...props} title={title} unit={unit} />}
          wrapperStyle={{ outline: "none" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#58a6ff"
          strokeWidth={2}
          fill={`url(#${id})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
