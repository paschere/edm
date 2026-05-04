import type { ProvinceMetric } from "@/lib/shopify";

interface Props {
  data: ProvinceMetric[];
}

export function ProvinceBars({ data }: Props) {
  if (!data.length) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
        Sin datos geográficos
      </p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-3">
      {data.map((p, i) => {
        const pct = (p.count / maxCount) * 100;
        const opacity = 0.45 + (pct / 100) * 0.5;
        return (
          <div key={p.province}>
            <div className="flex items-baseline justify-between mb-1">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "var(--muted-foreground)",
                    minWidth: "16px",
                    textAlign: "right",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: "12px", color: "var(--foreground)" }}>
                  {p.province}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  {p.count.toLocaleString("es-MX")} pedidos
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1rem",
                    fontWeight: 500,
                    color: "#bb9a4c",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {fmt(p.revenue)}
                </span>
              </div>
            </div>
            <div
              style={{
                height: "5px",
                background: "var(--border)",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: `rgba(187,154,76,${opacity})`,
                  borderRadius: "3px",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
