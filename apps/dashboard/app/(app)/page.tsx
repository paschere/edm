import { Suspense } from "react";
import { getShopifyStats } from "@/lib/shopify";
import { getMetaStats } from "@/lib/meta";
import { KpiCard } from "@/components/widgets/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
} from "lucide-react";

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

  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Revenue 30d"
          value={shopify ? fmt(shopify.totalRevenue) : "—"}
          description="Pedidos pagados"
          icon={<DollarSign size={14} />}
          iconColor="#bb9a4c"
        />
        <KpiCard
          title="Pedidos 30d"
          value={shopify ? shopify.totalOrders.toString() : "—"}
          description={shopify ? `AOV ${fmt(shopify.averageOrderValue)}` : ""}
          icon={<ShoppingCart size={14} />}
          iconColor="#4f7a3e"
        />
        <KpiCard
          title="Gasto Meta 30d"
          value={meta ? fmt(meta.totalSpend) : "—"}
          description={meta?.totalRoas ? `ROAS ${meta.totalRoas.toFixed(2)}x` : ""}
          icon={<TrendingUp size={14} />}
          iconColor="#b07a30"
        />
        <KpiCard
          title="Clientes totales"
          value={shopify ? shopify.totalCustomers.toLocaleString("es-MX") : "—"}
          description="Todos los tiempos"
          icon={<Users size={14} />}
          iconColor="#78695a"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Revenue chart — wider */}
        <div
          className="lg:col-span-2 rounded-xl border border-border p-5"
          style={{ background: "var(--card)", boxShadow: "0 1px 3px rgba(11,8,5,0.05)" }}
        >
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Revenue por día
            </p>
            {shopify && (
              <p className="display-num mt-1" style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 500, color: "var(--foreground)" }}>
                {fmt(shopify.totalRevenue)}
              </p>
            )}
          </div>
          <RevenueChart data={shopify?.revenueByDay ?? []} />
        </div>

        {/* Meta summary */}
        <div
          className="rounded-xl border border-border p-5"
          style={{ background: "var(--card)", boxShadow: "0 1px 3px rgba(11,8,5,0.05)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
            Resumen Meta 30d
          </p>
          {meta ? (
            <div className="space-y-3">
              <StatRow
                label="Campañas activas"
                value={meta.campaigns.filter((c) => c.status === "ACTIVE").length.toString()}
                accent="#bb9a4c"
              />
              <StatRow
                label="Alcance total"
                value={meta.totalReach.toLocaleString("es-MX")}
              />
              <StatRow
                label="Gasto total"
                value={fmt(meta.totalSpend)}
              />
              <StatRow
                label="ROAS promedio"
                value={meta.totalRoas ? `${meta.totalRoas.toFixed(2)}x` : "—"}
                accent={meta.totalRoas && meta.totalRoas >= 2 ? "#4f7a3e" : undefined}
              />
              <div className="h-px bg-border my-1" />
              <StatRow
                label="Seguidores FB"
                value={meta.page.followers.toLocaleString("es-MX")}
              />
              <StatRow
                label="Seguidores IG"
                value={meta.instagram.followers.toLocaleString("es-MX")}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos de Meta</p>
          )}
        </div>
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
        className="metric text-[13px] font-semibold tabular-nums"
        style={accent ? { color: accent } : { color: "var(--foreground)" }}
      >
        {value}
      </span>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Skeleton className="lg:col-span-2 h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="p-6 max-w-7xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 500, lineHeight: 1, letterSpacing: "-0.01em", color: "var(--foreground)" }}>Overview</h1>
        <p className="text-[12px] text-muted-foreground mt-1">Shopify · Meta · Web Pixel</p>
      </div>

      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent />
      </Suspense>
    </div>
  );
}
