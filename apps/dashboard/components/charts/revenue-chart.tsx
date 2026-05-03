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
import type { DailyMetric } from "@/lib/shopify";

interface RevenueChartProps {
  data: DailyMetric[];
}

function fmtDate(d: string) {
  return d.slice(5);
}

function fmtMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

const GOLD = "#bb9a4c";
const TICK = "#a69880";
const GRID = "rgba(11,8,5,0.06)";

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data.length) return <p className="text-sm" style={{ color: TICK }}>Sin datos</p>;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.22} />
            <stop offset="85%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          horizontal
          vertical={false}
          stroke={GRID}
          strokeDasharray="0"
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
          tickFormatter={fmtMoney}
          tick={{ fill: TICK, fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          width={52}
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
          itemStyle={{ color: GOLD }}
          cursor={{ stroke: "rgba(11,8,5,0.08)" }}
          labelFormatter={(v) => String(v)}
          formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={GOLD}
          strokeWidth={2}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={{ r: 4, fill: GOLD, stroke: "#ffffff", strokeWidth: 2 }}
          isAnimationActive={true}
          animationDuration={1200}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
