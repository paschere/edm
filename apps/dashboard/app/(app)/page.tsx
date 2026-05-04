import { Suspense } from "react";
import { getShopifyStats } from "@/lib/shopify";
import { getMetaStats } from "@/lib/meta";
import { KpiCard } from "@/components/widgets/kpi-card";
import { KpiCardHero } from "@/components/widgets/kpi-card-hero";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { CorrelationChart } from "@/components/charts/correlation-chart";
import { NewVsReturning } from "@/components/charts/new-vs-returning";
import { OrdersHeatmap } from "@/components/charts/orders-heatmap";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  CreditCard,
  Eye,
} from "lucide-react";

function halfTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const half = Math.floor(values.length / 2);
  const first = values.slice(0, half).reduce((a, b) => a + b, 0);
  const second = values.slice(half).reduce((a, b) => a + b, 0);
  if (first === 0) return second > 0 ? 100 : 0;
  return ((second - first) / first) * 100;
}

async function OverviewContent() {
  "use cache";
  const [shopify, meta] = await Promise.all([
    getShopifyStats(30).catch(() => null),
    getMetaStats().catch(() => null),
  ]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  const revValues = shopify?.revenueByDay.map((d) => d.value) ?? [];
  const ordValues = shopify?.ordersByDay?.map((d) => d.value) ?? [];
  const revTrend = revValues.length >= 2 ? halfTrend(revValues) : undefined;
  const ordTrend = ordValues.length >= 2 ? halfTrend(ordValues) : undefined;

  return (
    <div className="space-y-4">
      {/* ── Row 1: Hero KPI cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Revenue — 2/3 */}
        <div className="lg:col-span-2">
          <KpiCardHero
            title="Revenue 30d"
            subtitle="vs. quincena anterior"
            value={shopify ? fmt(shopify.totalRevenue) : "—"}
            trendPct={revTrend}
            icon={<DollarSign size={18} />}
            iconColor="#bb9a4c"
            sparklineData={revValues.length >= 2 ? revValues : undefined}
            stats={[
              {
                icon: <ShoppingCart size={13} />,
                label: `${shopify?.totalOrders.toLocaleString("es-MX") ?? "—"} pedidos`,
              },
              {
                icon: <CreditCard size={13} />,
                label: `AOV ${shopify ? fmt(shopify.averageOrderValue) : "—"}`,
              },
            ]}
          />
        </div>

        {/* Orders — 1/3 */}
        <div className="lg:col-span-1">
          <KpiCardHero
            title="Pedidos 30d"
            subtitle="vs. quincena anterior"
            value={shopify ? shopify.totalOrders.toLocaleString("es-MX") : "—"}
            trendPct={ordTrend}
            icon={<ShoppingCart size={18} />}
            iconColor="#4f7a3e"
            sparklineData={ordValues.length >= 2 ? ordValues : undefined}
            stats={[
              {
                icon: <Users size={13} />,
                label: `${shopify?.totalCustomers.toLocaleString("es-MX") ?? "—"} clientes`,
              },
            ]}
          />
        </div>
      </div>

      {/* ── Row 2: Medium KPI cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Gasto Meta 30d"
          value={meta ? fmt(meta.totalSpend) : "—"}
          description={meta?.totalRoas ? `ROAS ${meta.totalRoas.toFixed(2)}x` : ""}
          icon={<TrendingUp size={14} />}
          iconColor="#b07a30"
        />
        <KpiCard
          title="ROAS promedio"
          value={meta?.totalRoas ? `${meta.totalRoas.toFixed(2)}x` : "—"}
          change={
            meta?.totalRoas
              ? meta.totalRoas >= 2
                ? "Rentable"
                : "Bajo objetivo"
              : undefined
          }
          changePositive={meta?.totalRoas ? meta.totalRoas >= 2 : undefined}
          icon={<TrendingUp size={14} />}
          iconColor={meta?.totalRoas && meta.totalRoas >= 2 ? "#4f7a3e" : "#78695a"}
        />
        <KpiCard
          title="Alcance Meta 30d"
          value={meta ? meta.totalReach.toLocaleString("es-MX") : "—"}
          description="Personas únicas"
          icon={<Eye size={14} />}
          iconColor="#78695a"
        />
        <KpiCard
          title="Seguidores IG"
          value={meta ? meta.instagram.followers.toLocaleString("es-MX") : "—"}
          description="Instagram"
          icon={<Users size={14} />}
          iconColor="#a69060"
        />
      </div>

      {/* ── Row 3: Charts ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div
          className="lg:col-span-2 rounded-xl border border-border p-5"
          style={{
            background: "var(--card)",
            boxShadow: "0 1px 3px rgba(11,8,5,0.05)",
          }}
        >
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Revenue por día · 30d
            </p>
            {shopify && (
              <p
                className="mt-1"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.6rem",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {fmt(shopify.totalRevenue)}
              </p>
            )}
          </div>
          <RevenueChart data={shopify?.revenueByDay ?? []} />
        </div>

        {/* Meta summary */}
        <div
          className="rounded-xl border border-border p-5"
          style={{
            background: "var(--card)",
            boxShadow: "0 1px 3px rgba(11,8,5,0.05)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
            Resumen Meta · 30d
          </p>
          {meta ? (
            <div className="space-y-3">
              <StatRow
                label="Campañas activas"
                value={meta.campaigns
                  .filter((c) => c.status === "ACTIVE")
                  .length.toString()}
                accent="#bb9a4c"
              />
              <StatRow
                label="Alcance total"
                value={meta.totalReach.toLocaleString("es-MX")}
              />
              <StatRow label="Gasto total" value={fmt(meta.totalSpend)} />
              <StatRow
                label="ROAS promedio"
                value={meta.totalRoas ? `${meta.totalRoas.toFixed(2)}x` : "—"}
                accent={
                  meta.totalRoas && meta.totalRoas >= 2 ? "#4f7a3e" : undefined
                }
              />
              <div className="h-px" style={{ background: "var(--border)" }} />
              <StatRow
                label="Seguidores FB"
                value={meta.page.followers.toLocaleString("es-MX")}
              />
              <StatRow
                label="Seguidores IG"
                value={meta.instagram.followers.toLocaleString("es-MX")}
                accent="#bb9a4c"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos de Meta</p>
          )}
        </div>
      </div>

      {/* ── Row 4: Correlación + New vs Returning ─────────────────── */}
      {(() => {
        const revenueMap = new Map(
          (shopify?.revenueByDay ?? []).map((d) => [d.date, d.value])
        );
        const spendMap = new Map(
          (meta?.dailySpend ?? []).map((d) => [d.date, d.value])
        );
        const allDates = Array.from(
          new Set([...revenueMap.keys(), ...spendMap.keys()])
        ).sort();
        const correlationData = allDates.map((date) => ({
          date,
          revenue: revenueMap.get(date) ?? 0,
          spend: spendMap.get(date) ?? 0,
        }));

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className="lg:col-span-2 rounded-xl border border-border p-5"
              style={{ background: "var(--card)", boxShadow: "0 1px 3px rgba(11,8,5,0.05)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
                Revenue Shopify vs Gasto Meta · 30d
              </p>
              <CorrelationChart data={correlationData} />
            </div>
            <div
              className="rounded-xl border border-border p-5"
              style={{ background: "var(--card)", boxShadow: "0 1px 3px rgba(11,8,5,0.05)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
                Clientes nuevos vs recurrentes
              </p>
              <NewVsReturning
                newCustomers={shopify?.newCustomers ?? 0}
                returningCustomers={shopify?.returningCustomers ?? 0}
              />
            </div>
          </div>
        );
      })()}

      {/* ── Row 5: Heatmap ────────────────────────────────────────── */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ background: "var(--card)", boxShadow: "0 1px 3px rgba(11,8,5,0.05)" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
          Pedidos por hora y día de semana · 30d
        </p>
        <OrdersHeatmap data={shopify?.heatmap ?? Array.from({ length: 7 }, () => Array(24).fill(0))} />
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span
        className="text-[13px] font-semibold tabular-nums"
        style={accent ? { color: accent } : { color: "var(--foreground)" }}
      >
        {value}
      </span>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-60 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-52 rounded-xl" />
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
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
          Overview
        </h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          Shopify · Meta · Web Pixel
        </p>
      </div>

      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent />
      </Suspense>
    </div>
  );
}
