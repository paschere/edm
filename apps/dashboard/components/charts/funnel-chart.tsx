"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface FunnelData {
  name: string;
  value: number;
  label: string;
}

interface FunnelChartProps {
  data: FunnelData[];
}

const COLORS = [
  "#bb9a4c",
  "#c8a85e",
  "#8aab6e",
  "#4f7a3e",
  "#4f7a3e",
];

const TICK = "#a69880";

export function FunnelChart({ data }: FunnelChartProps) {
  if (!data.length || data.every((d) => d.value === 0)) {
    return (
      <p className="text-[13px]" style={{ color: TICK }}>
        Sin datos de comportamiento aún. El Web Pixel enviará datos cuando esté activo.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.value));
  const withRate = data.map((d, i) => ({
    ...d,
    rate: i === 0 ? 100 : Math.round((d.value / data[0].value) * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={withRate}
        layout="vertical"
        margin={{ top: 0, right: 64, left: 0, bottom: 0 }}
        barCategoryGap="25%"
      >
        <XAxis type="number" hide domain={[0, max]} />
        <YAxis
          type="category"
          dataKey="label"
          width={148}
          tick={{ fill: TICK, fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
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
          cursor={{ fill: "rgba(11,8,5,0.03)" }}
          formatter={(v, _, entry) => [
            `${Number(v).toLocaleString()} (${(entry as { payload: { rate: number } }).payload.rate}%)`,
            "Eventos",
          ]}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          isAnimationActive={true}
          animationDuration={1100}
          animationEasing="ease-out"
        >
          {withRate.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.88} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
