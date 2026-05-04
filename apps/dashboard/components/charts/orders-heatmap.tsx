"use client";

import { useState } from "react";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  data: number[][]; // [dow 0=Sun..6=Sat][hour 0-23]
}

export function OrdersHeatmap({ data }: Props) {
  const total = data.flat().reduce((a, b) => a + b, 0);
  const max = Math.max(...data.flat(), 1);
  const [hovered, setHovered] = useState<{ dow: number; hour: number } | null>(null);

  if (total === 0) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
        Sin pedidos en los últimos 30 días
      </p>
    );
  }

  return (
    <div>
      {/* Hour header */}
      <div className="flex gap-px mb-1" style={{ paddingLeft: "30px" }}>
        {HOURS.map((h) => (
          <div
            key={h}
            className="flex-1 text-center"
            style={{
              fontSize: "9px",
              color: "var(--muted-foreground)",
              userSelect: "none",
            }}
          >
            {h % 6 === 0 ? `${h}h` : ""}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {DAYS.map((day, dow) => (
        <div key={dow} className="flex gap-px mb-px items-center">
          <div
            className="shrink-0 text-right pr-1.5"
            style={{ width: "28px", fontSize: "10px", color: "var(--muted-foreground)", userSelect: "none" }}
          >
            {day}
          </div>
          {HOURS.map((hour) => {
            const count = data[dow][hour];
            const alpha = count > 0 ? 0.07 + (count / max) * 0.88 : 0.03;
            const isHovered = hovered?.dow === dow && hovered?.hour === hour;
            return (
              <div
                key={hour}
                onMouseEnter={() => setHovered({ dow, hour })}
                onMouseLeave={() => setHovered(null)}
                style={{
                  flex: 1,
                  height: "20px",
                  borderRadius: "2px",
                  background: `rgba(187,154,76,${alpha})`,
                  border: isHovered
                    ? "1px solid rgba(187,154,76,0.65)"
                    : "1px solid transparent",
                  transition: "border-color 0.1s, background 0.1s",
                }}
              />
            );
          })}
        </div>
      ))}

      {/* Hover status line */}
      <div className="mt-3 h-5 flex items-center">
        {hovered ? (
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            {DAYS[hovered.dow]}&nbsp;·&nbsp;{hovered.hour}:00–{hovered.hour + 1}:00
            {"  "}
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "15px",
                fontWeight: 500,
                color: "#bb9a4c",
                letterSpacing: "-0.02em",
              }}
            >
              {data[hovered.dow][hovered.hour]}{" "}
              <span style={{ fontSize: "11px", fontFamily: "inherit", color: "var(--muted-foreground)" }}>
                pedidos
              </span>
            </span>
          </span>
        ) : (
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            Pasa el cursor sobre una celda
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2">
        <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Menos</span>
        {[0.03, 0.15, 0.35, 0.55, 0.75, 0.95].map((a, i) => (
          <div
            key={i}
            style={{ width: "14px", height: "14px", borderRadius: "2px", background: `rgba(187,154,76,${a})` }}
          />
        ))}
        <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Más</span>
      </div>
    </div>
  );
}
