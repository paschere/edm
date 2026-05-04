"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props {
  newCustomers: number;
  returningCustomers: number;
}

const COLORS = ["#bb9a4c", "#4f7a3e"];

export function NewVsReturning({ newCustomers, returningCustomers }: Props) {
  const total = newCustomers + returningCustomers;
  if (total === 0) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
        Sin datos de clientes
      </p>
    );
  }

  const newPct = Math.round((newCustomers / total) * 100);
  const data = [
    { name: "Nuevos", value: newCustomers },
    { name: "Recurrentes", value: returningCustomers },
  ];

  const fmt = (n: number) => n.toLocaleString("es-MX");

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <div className="relative shrink-0" style={{ width: "108px", height: "108px" }}>
        <ResponsiveContainer width={108} height={108}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={34}
              outerRadius={50}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} fillOpacity={0.88} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.45rem",
              fontWeight: 500,
              color: "#bb9a4c",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {newPct}%
          </span>
          <span
            style={{
              fontSize: "8px",
              color: "var(--muted-foreground)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginTop: "3px",
            }}
          >
            Nuevos
          </span>
        </div>
      </div>

      {/* Bars legend */}
      <div className="flex flex-col gap-3.5 flex-1 min-w-0">
        {data.map((d, i) => {
          const pct = Math.round((d.value / total) * 100);
          return (
            <div key={d.name}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{d.name}</span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.1rem",
                    fontWeight: 500,
                    color: COLORS[i],
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {fmt(d.value)}
                </span>
              </div>
              <div
                style={{
                  height: "4px",
                  background: "var(--border)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: COLORS[i],
                    borderRadius: "2px",
                    opacity: 0.8,
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span style={{ fontSize: "9px", color: "var(--muted-foreground)" }}>{pct}% del total</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
