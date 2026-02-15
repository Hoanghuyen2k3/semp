"use client";

import Link from "next/link";
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

const EMPTY_DATA: ChartDataPoint[] = [
  { name: "1", value: 0, received_at: "" },
  { name: "2", value: 0, received_at: "" },
  { name: "3", value: 0, received_at: "" },
  { name: "4", value: 0, received_at: "" },
  { name: "5", value: 0, received_at: "" },
];

type EmptyChartCardProps = {
  title: string;
  unit?: string;
  data?: ChartDataPoint[];
  href?: string;
};

const gradientId = (title: string) => `emptyFill-${title.replace(/\s/g, "")}`;

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
  label?: string;
  title: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const first = payload[0] as Record<string, unknown>;
  const p = (first?.payload ?? first) as ChartDataPoint;
  const dt = formatDateTime(p.received_at);
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
      <div style={{ color: "var(--muted)" }}>{dt}</div>
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

export function EmptyChartCard({ title, unit, data, href }: EmptyChartCardProps) {
  const id = gradientId(title);
  const chartData = data && data.length > 0 ? data : EMPTY_DATA;
  const hasData = data && data.length > 0;
  const domain = hasData ? getDomain(data) : [0, 100];

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#58a6ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" hide />
          <YAxis
            domain={domain}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={{ stroke: "var(--border)" }}
            axisLine={{ stroke: "var(--border)" }}
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
            strokeWidth={1.5}
            fill={`url(#${id})`}
            strokeDasharray={hasData ? undefined : "4 4"}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "0.5rem",
          gap: "0.5rem",
        }}
      >
        <p className="muted" style={{ margin: 0, fontSize: "0.75rem" }}>
          {hasData ? `${chartData.length} reading(s)` : "No data yet"}
        </p>
        {href && (
          <Link href={href} className="chart-detail-link">
            More details →
          </Link>
        )}
      </div>
    </div>
  );
}
