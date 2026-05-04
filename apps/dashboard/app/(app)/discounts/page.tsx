import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { getShopifyStats } from "@/lib/shopify";
import type { DiscountCodeMetric } from "@/lib/shopify";
import { KpiCard } from "@/components/widgets/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/widgets/period-selector";
import { Tag, TrendingDown, ShoppingCart, Percent } from "lucide-react";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border border-border p-5"
      style={{ background: "var(--card)", boxShadow: "0 1px 3px rgba(11,8,5,0.05)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
        {title}
      </p>
      {children}
    </div>
  );
}

function DiscountTable({ codes }: { codes: DiscountCodeMetric[] }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  if (!codes.length) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
        Sin códigos de descuento usados en este período.
      </p>
    );
  }

  const maxRevenue = Math.max(...codes.map((c) => c.revenue), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Código", "Usos", "Descuento total", "Revenue", "Desc. promedio", "Tasa desc.", ""].map(
              (h) => (
                <th
                  key={h}
                  className="pb-2 text-left font-medium"
                  style={{ color: "var(--muted-foreground)", paddingRight: h === "" ? 0 : "16px", whiteSpace: "nowrap" }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {codes.map((c) => {
            const avgDiscount = c.count > 0 ? c.totalDiscount / c.count : 0;
            const discountRate = c.revenue > 0 ? (c.totalDiscount / c.revenue) * 100 : 0;
            const barPct = (c.revenue / maxRevenue) * 100;
            const rateColor =
              discountRate >= 25
                ? "#b43c28"
                : discountRate >= 15
                ? "#bb9a4c"
                : "#4f7a3e";

            return (
              <tr
                key={c.code}
                style={{ borderBottom: "1px solid var(--border)" }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3 pr-4">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold"
                    style={{
                      background: "rgba(187,154,76,0.1)",
                      color: "#bb9a4c",
                      border: "1px solid rgba(187,154,76,0.2)",
                    }}
                  >
                    <Tag size={9} />
                    {c.code}
                  </span>
                </td>
                <td className="py-3 pr-4 tabular-nums" style={{ color: "var(--foreground)" }}>
                  {c.count}
                </td>
                <td className="py-3 pr-4 tabular-nums font-medium" style={{ color: "#b43c28" }}>
                  -{fmt(c.totalDiscount)}
                </td>
                <td className="py-3 pr-4 tabular-nums font-semibold" style={{ color: "var(--foreground)" }}>
                  {fmt(c.revenue)}
                </td>
                <td className="py-3 pr-4 tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                  -{fmt(avgDiscount)}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums"
                    style={{ background: `${rateColor}18`, color: rateColor }}
                  >
                    {discountRate.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3" style={{ minWidth: "100px" }}>
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
                        width: `${barPct}%`,
                        height: "100%",
                        background: "rgba(187,154,76,0.6)",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DiscountBars({ codes }: { codes: DiscountCodeMetric[] }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  const top = codes.slice(0, 8);
  const maxCount = Math.max(...top.map((c) => c.count), 1);

  return (
    <div className="space-y-3">
      {top.map((c, i) => {
        const pct = (c.count / maxCount) * 100;
        const opacity = 0.35 + (1 - i / top.length) * 0.5;
        return (
          <div key={c.code}>
            <div className="flex items-center justify-between mb-1 gap-2">
              <span
                className="text-[11px] font-mono font-semibold truncate"
                style={{ color: "#bb9a4c", maxWidth: "120px" }}
              >
                {c.code}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                  {c.count} {c.count === 1 ? "uso" : "usos"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1rem",
                    fontWeight: 500,
                    color: "var(--foreground)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {fmt(c.revenue)}
                </span>
              </div>
            </div>
            <div style={{ height: "5px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
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

async function DiscountsContent({ days }: { days: number }) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 60 });
  const stats = await getShopifyStats(days).catch(() => null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  if (!stats) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        No se pudieron cargar los datos. Verifica las variables de entorno.
      </div>
    );
  }

  const { discountCodes, totalOrders, totalRevenue } = stats;

  const totalDiscountGiven = discountCodes.reduce((s, c) => s + c.totalDiscount, 0);
  const totalUses = discountCodes.reduce((s, c) => s + c.count, 0);
  const revenueWithDiscount = discountCodes.reduce((s, c) => s + c.revenue, 0);
  const discountOrderRate = totalOrders > 0 ? (totalUses / totalOrders) * 100 : 0;
  const avgDiscountPerUse = totalUses > 0 ? totalDiscountGiven / totalUses : 0;
  const overallDiscountRate = revenueWithDiscount > 0 ? (totalDiscountGiven / revenueWithDiscount) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title={`Descuentos otorgados ${days}d`}
          value={fmt(totalDiscountGiven)}
          description={`${((totalDiscountGiven / (totalRevenue || 1)) * 100).toFixed(1)}% del revenue total`}
          icon={<TrendingDown size={14} />}
          iconColor="#b43c28"
          changePositive={false}
          change={totalDiscountGiven > 0 ? "Costo de promoción" : undefined}
        />
        <KpiCard
          title="Órdenes con descuento"
          value={`${discountOrderRate.toFixed(1)}%`}
          description={`${totalUses} de ${totalOrders} pedidos`}
          icon={<ShoppingCart size={14} />}
          iconColor="#78695a"
          changePositive={discountOrderRate < 30}
        />
        <KpiCard
          title="Descuento promedio"
          value={fmt(avgDiscountPerUse)}
          description="Por orden con código"
          icon={<Percent size={14} />}
          iconColor="#bb9a4c"
        />
        <KpiCard
          title="Tasa de descuento global"
          value={`${overallDiscountRate.toFixed(1)}%`}
          description="Desc. / revenue en órdenes con código"
          icon={<Tag size={14} />}
          iconColor={overallDiscountRate >= 20 ? "#b43c28" : "#4f7a3e"}
          changePositive={overallDiscountRate < 20}
          change={
            overallDiscountRate >= 20
              ? "Tasa alta"
              : overallDiscountRate >= 10
              ? "Tasa moderada"
              : "Tasa baja"
          }
        />
      </div>

      {/* Chart + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionCard title={`Top códigos por uso · ${days}d`}>
            {discountCodes.length > 0 ? (
              <DiscountBars codes={discountCodes} />
            ) : (
              <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
                Sin códigos de descuento en este período.
              </p>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Impacto en el negocio">
          <div className="space-y-4 pt-1">
            <div>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted-foreground)", marginBottom: "10px" }}>
                Distribución del revenue
              </p>
              {[
                {
                  label: "Revenue sin descuento",
                  value: totalRevenue - revenueWithDiscount,
                  color: "#4f7a3e",
                  total: totalRevenue,
                },
                {
                  label: "Revenue con descuento",
                  value: revenueWithDiscount,
                  color: "#bb9a4c",
                  total: totalRevenue,
                },
              ].map(({ label, value, color, total }) => {
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                return (
                  <div key={label} className="mb-2">
                    <div className="flex justify-between mb-0.5">
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{label}</span>
                      <span style={{ fontSize: "11px", fontWeight: 600, color }}>{pct}%</span>
                    </div>
                    <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, opacity: 0.7, borderRadius: "2px" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }} className="space-y-2.5">
              {[
                { label: "Revenue total", value: fmt(totalRevenue) },
                { label: "Con código de descuento", value: fmt(revenueWithDiscount) },
                { label: "Descuento total otorgado", value: `-${fmt(totalDiscountGiven)}`, accent: "#b43c28" },
                { label: "Códigos distintos usados", value: `${discountCodes.length}` },
              ].map(({ label, value, accent }) => (
                <div key={label} className="flex justify-between items-baseline">
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{label}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: accent ?? "var(--foreground)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Detailed table */}
      <SectionCard title={`Detalle por código · ${days}d`}>
        <DiscountTable codes={discountCodes} />
      </SectionCard>
    </div>
  );
}

async function DiscountsContentWrapper({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;
  return <DiscountsContent days={days} />;
}

export default function DiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2rem",
              fontWeight: 500,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              color: "var(--foreground)",
            }}
          >
            Descuentos
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            Códigos · Impacto en revenue · Tasa de descuento
          </p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <DiscountsContentWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
