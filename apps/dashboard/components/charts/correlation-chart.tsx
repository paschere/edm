"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DailyPoint {
  date: string;
  revenue: number;
  spend: number;
}

interface Props {
  data: DailyPoint[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);

export function CorrelationChart({ data }: Props) {
  if (!data.length) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
        Sin datos suficientes
      </p>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-5 mb-4">
        <div className="flex items-center gap-1.5">
          <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "rgba(187,154,76,0.7)" }} />
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Revenue Shopify</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: "20px", height: "2px", background: "#c87a30" }} />
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Gasto Meta</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(11,8,5,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#78695a", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="revenue"
            orientation="left"
            tick={{ fill: "#78695a", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={42}
          />
          <YAxis
            yAxisId="spend"
            orientation="right"
            tick={{ fill: "#c87a30", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid rgba(11,8,5,0.10)",
              borderRadius: "8px",
              fontSize: 12,
              boxShadow: "0 4px 16px rgba(11,8,5,0.08)",
            }}
            labelStyle={{ color: "#78695a", fontSize: 11, marginBottom: 4 }}
            cursor={{ fill: "rgba(11,8,5,0.03)" }}
            formatter={(value, name) => [
              fmt(Number(value)),
              name === "revenue" ? "Revenue Shopify" : "Gasto Meta",
            ]}
          />
          <Bar
            yAxisId="revenue"
            dataKey="revenue"
            fill="#bb9a4c"
            fillOpacity={0.65}
            radius={[2, 2, 0, 0]}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-out"
          />
          <Line
            yAxisId="spend"
            dataKey="spend"
            stroke="#c87a30"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
