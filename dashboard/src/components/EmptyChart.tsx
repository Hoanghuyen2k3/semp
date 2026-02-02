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

const EMPTY_DATA = [
  { name: "1", value: 0 },
  { name: "2", value: 0 },
  { name: "3", value: 0 },
  { name: "4", value: 0 },
  { name: "5", value: 0 },
];

type EmptyChartCardProps = {
  title: string;
  unit?: string;
};

const gradientId = (title: string) => `emptyFill-${title.replace(/\s/g, "")}`;

export function EmptyChartCard({ title, unit }: EmptyChartCardProps) {
  const id = gradientId(title);
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart
          data={EMPTY_DATA}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#58a6ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4d" />
          <XAxis dataKey="name" hide />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#8b949e", fontSize: 11 }}
            tickLine={{ stroke: "#2d3a4d" }}
            axisLine={{ stroke: "#2d3a4d" }}
            unit={unit}
          />
          <Tooltip content={() => null} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#58a6ff"
            strokeWidth={1.5}
            fill={`url(#${id})`}
            strokeDasharray="4 4"
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.75rem" }}>
        No data yet
      </p>
    </div>
  );
}
