import type { TopProduct } from "@/lib/shopify";

interface TopProductsProps {
  products: TopProduct[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

const GOLD = "#bb9a4c";
const GREEN = "#4f7a3e";

export function TopProducts({ products }: TopProductsProps) {
  if (products.length === 0) {
    return (
      <div
        className="rounded-xl border border-border p-5"
        style={{ background: "var(--card)", boxShadow: "0 1px 3px rgba(11,8,5,0.05)" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Top Productos 30d
        </p>
        <p className="text-sm text-muted-foreground">Sin datos</p>
      </div>
    );
  }

  const max = products[0].revenue;

  return (
    <div
      className="rounded-xl border border-border p-5"
      style={{ background: "var(--card)", boxShadow: "0 1px 3px rgba(11,8,5,0.05)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
        Top Productos 30d
      </p>
      <div className="space-y-4">
        {products.slice(0, 8).map((p, i) => (
          <div key={p.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="metric text-[11px] font-semibold w-4 shrink-0 text-right tabular-nums"
                  style={{ color: "#a69880" }}
                >
                  {i + 1}
                </span>
                <span className="truncate text-[13px] text-foreground">{p.title}</span>
              </div>
              <span className="metric text-[12px] font-semibold tabular-nums shrink-0 text-foreground">
                {fmt(p.revenue)}
              </span>
            </div>
            <div
              className="h-[3px] rounded-full overflow-hidden ml-6"
              style={{ background: "rgba(11,8,5,0.06)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(p.revenue / max) * 100}%`,
                  background: `linear-gradient(to right, ${GOLD}, ${GREEN})`,
                  opacity: 0.5 + (p.revenue / max) * 0.5,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
