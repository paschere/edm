"use client";

interface FunnelStep {
  name: string;
  label: string;
  value: number;
}

interface Props {
  data: FunnelStep[];
}

const STEP_COLORS = ["#bb9a4c", "#b89040", "#8aab6e", "#6a9a52", "#4f7a3e"];

export function FunnelBars({ data }: Props) {
  if (!data.length || data.every((d) => d.value === 0)) {
    return (
      <p className="text-[13px]" style={{ color: "#78695a" }}>
        Sin datos de comportamiento aún. El Web Pixel enviará datos cuando esté activo.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2.5">
      {data.map((step, i) => {
        const pct = (step.value / max) * 100;
        const dropOff =
          i > 0 && data[i - 1].value > 0
            ? Math.round(((data[i - 1].value - step.value) / data[i - 1].value) * 100)
            : null;
        const convRate =
          i > 0 && data[0].value > 0
            ? ((step.value / data[0].value) * 100).toFixed(1)
            : null;
        const color = STEP_COLORS[i] ?? "#4f7a3e";

        return (
          <div
            key={step.name}
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
            className="funnel-step-animate"
          >
            {/* Label row */}
            <div className="flex items-baseline justify-between mb-1">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    background: `color-mix(in oklch, ${color} 18%, transparent)`,
                    border: `1px solid color-mix(in oklch, ${color} 35%, transparent)`,
                    fontSize: "9px",
                    fontWeight: 700,
                    color,
                    flexShrink: 0,
                    letterSpacing: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: "12px", color: "var(--foreground)" }}>
                  {step.label}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                {dropOff !== null && dropOff > 0 && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: dropOff > 60 ? "#b43c28" : dropOff > 30 ? "#b07a30" : "#78695a",
                    }}
                  >
                    -{dropOff}%
                  </span>
                )}
                {convRate !== null && (
                  <span style={{ fontSize: "10px", color: "#78695a" }}>
                    {convRate}% total
                  </span>
                )}
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1rem",
                    fontWeight: 500,
                    color,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {step.value.toLocaleString("es-MX")}
                </span>
              </div>
            </div>

            {/* Bar */}
            <div
              style={{
                height: "6px",
                background: "var(--border)",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: color,
                  borderRadius: "3px",
                  opacity: 0.82,
                  transition: "width 0.6s ease-out",
                }}
              />
            </div>

            {/* Connector arrow to next step */}
            {i < data.length - 1 && (
              <div
                style={{
                  marginTop: "4px",
                  marginLeft: "24px",
                  height: "6px",
                  borderLeft: "1px dashed rgba(120,105,90,0.2)",
                }}
              />
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes funnel-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .funnel-step-animate {
          animation: funnel-fade-in 0.35s ease-out both;
        }
      `}</style>
    </div>
  );
}
