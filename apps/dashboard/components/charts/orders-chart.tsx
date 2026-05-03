"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DailyMetric } from "@/lib/shopify";

interface OrdersChartProps {
  data: DailyMetric[];
}

function fmtDate(d: string) {
  return d.slice(5);
}

const GREEN = "#4f7a3e";
const GREEN_DIM = "#4f7a3e55";
const TICK = "#a69880";
const GRID = "rgba(11,8,5,0.06)";

export function OrdersChart({ data }: OrdersChartProps) {
  if (!data.length) return <p className="text-sm" style={{ color: TICK }}>Sin datos</p>;

  const max = Math.max(...data.map((d) => d.value));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="32%">
        <CartesianGrid
          strokeDasharray="0"
          horizontal
          vertical={false}
          stroke={GRID}
        />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fill: TICK, fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: TICK, fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid rgba(11,8,5,0.1)",
            borderRadius: "8px",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            boxShadow: "0 4px 16px rgba(11,8,5,0.08)",
          }}
          labelStyle={{ color: "#78695a", marginBottom: 4 }}
          itemStyle={{ color: GREEN }}
          cursor={{ fill: "rgba(11,8,5,0.03)" }}
          labelFormatter={(v) => String(v)}
          formatter={(v) => [Number(v), "Pedidos"]}
        />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationDuration={1000}
          animationEasing="ease-out"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.value === max ? GREEN : GREEN_DIM} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
