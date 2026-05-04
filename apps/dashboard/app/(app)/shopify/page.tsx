import { Suspense } from "react";
import { getShopifyStats } from "@/lib/shopify";
import type { StatusBreakdown, ProductTypeMetric, DiscountCodeMetric } from "@/lib/shopify";
import { KpiCard } from "@/components/widgets/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OrdersChart } from "@/components/charts/orders-chart";
import { TopProducts } from "@/components/widgets/top-products";
import { OrdersHeatmap } from "@/components/charts/orders-heatmap";
import { NewVsReturning } from "@/components/charts/new-vs-returning";
import { ProvinceBars } from "@/components/charts/province-bars";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/widgets/period-selector";
import { DollarSign, ShoppingCart, CreditCard, Users, Repeat, TrendingUp } from "lucide-react";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

function halfTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const half = Math.floor(values.length / 2);
  const first = values.slice(0, half).reduce((a, b) => a + b, 0);
  const second = values.slice(half).reduce((a, b) => a + b, 0);
  if (first === 0) return second > 0 ? 100 : 0;
  return ((second - first) / first) * 100;
}

function periodTrend(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

function StatusBars({ s }: { s: StatusBreakdown }) {
  const fulfillmentTotal = s.fulfilled + s.unfulfilled + s.partial || 1;
  const financialTotal = s.paid + s.pending + s.refunded || 1;

  const fulfillmentItems = [
    { label: "Completado", value: s.fulfilled, color: "#4f7a3e" },
    { label: "Pendiente", value: s.unfulfilled, color: "#bb9a4c" },
    { label: "Parcial", value: s.partial, color: "#b07a30" },
  ];
  const financialItems = [
    { label: "Pagado", value: s.paid, color: "#4f7a3e" },
    { label: "Pendiente", value: s.pending, color: "#bb9a4c" },
    { label: "Reembolsado", value: s.refunded, color: "#b43c28" },
  ];

  const renderGroup = (
    title: string,
    items: { label: string; value: number; color: string }[],
    total: number
  ) => (
    <div className="mb-4">
      <p
        className="mb-2"
        style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted-foreground)" }}
      >
        {title}
      </p>
      <div className="space-y-2">
        {items.map((item) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.label}>
              <div className="flex items-baseline justify-between mb-0.5">
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{item.label}</span>
                <div className="flex items-baseline gap-2">
                  <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{pct}%</span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1rem",
                      fontWeight: 500,
                      color: item.color,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {item.value.toLocaleString("es-MX")}
                  </span>
                </div>
              </div>
              <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: item.color,
                    borderRadius: "2px",
                    opacity: 0.75,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      {renderGroup("Envío", fulfillmentItems, fulfillmentTotal)}
      {renderGroup("Pago", financialItems, financialTotal)}
    </div>
  );
}

function ProductTypeBars({ items }: { items: ProductTypeMetric[] }) {
  if (!items.length) {
    return <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>Sin datos</p>;
  }
  const maxRev = Math.max(...items.map((i) => i.revenue), 1);
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const pct = (item.revenue / maxRev) * 100;
        const opacity = 0.4 + (pct / 100) * 0.55;
        return (
          <div key={item.type}>
            <div className="flex items-baseline justify-between mb-1">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", minWidth: "14px", textAlign: "right" }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: "12px", color: "var(--foreground)" }}>{item.type}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  {item.count.toLocaleString("es-MX")} uds
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
                  {fmt(item.revenue)}
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

function DiscountCodesTable({ codes }: { codes: DiscountCodeMetric[] }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

  if (!codes.length) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
        No se usaron descuentos en este período
      </p>
    );
  }

  const maxCount = Math.max(...codes.map((c) => c.count), 1);

  return (
    <div className="space-y-2.5">
      {codes.map((c, i) => {
        const pct = (c.count / maxCount) * 100;
        return (
          <div key={c.code}>
            <div className="flex items-baseline justify-between mb-1">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", minWidth: "14px", textAlign: "right" }}>
                  {i + 1}
                </span>
                <span
                  className="font-mono"
                  style={{ fontSize: "12px", color: "var(--foreground)", letterSpacing: "0.04em" }}
                >
                  {c.code}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  {c.count} {c.count === 1 ? "uso" : "usos"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1rem",
                    fontWeight: 500,
                    color: "#4f7a3e",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {fmt(c.totalDiscount)}
                </span>
              </div>
            </div>
            <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "rgba(79,122,62,0.5)", borderRadius: "2px" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function ShopifyContent({ days }: { days: number }) {
  "use cache";
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
        No se pudieron cargar los datos de Shopify. Verifica las variables de entorno.
      </div>
    );
  }

  const revValues = stats.revenueByDay.map((d) => d.value);
  const ordValues = stats.ordersByDay?.map((d) => d.value) ?? [];
  const revTrend = revValues.length >= 2 ? halfTrend(revValues) : undefined;
  const ordTrend = ordValues.length >= 2 ? halfTrend(ordValues) : undefined;

  const revVsPrev = periodTrend(stats.totalRevenue, stats.prevRevenue);
  const ordVsPrev = periodTrend(stats.totalOrders, stats.prevOrders);

  return (
    <div className="space-y-4">
      {/* Row 1: Primary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title={`Revenue ${days}d`}
          value={fmt(stats.totalRevenue)}
          description={`Ant. ${fmt(stats.prevRevenue)}`}
          icon={<DollarSign size={14} />}
          iconColor="#bb9a4c"
          sparklineData={revValues.length >= 2 ? revValues : undefined}
          trendPct={stats.prevRevenue > 0 ? revVsPrev : revTrend}
        />
        <KpiCard
          title={`Pedidos ${days}d`}
          value={stats.totalOrders.toString()}
          description={`Ant. ${stats.prevOrders} pedidos`}
          icon={<ShoppingCart size={14} />}
          iconColor="#4f7a3e"
          sparklineData={ordValues.length >= 2 ? ordValues : undefined}
          trendPct={stats.prevOrders > 0 ? ordVsPrev : ordTrend}
        />
        <KpiCard
          title="Ticket promedio"
          value={fmt(stats.averageOrderValue)}
          icon={<CreditCard size={14} />}
          iconColor="#b07a30"
        />
        <KpiCard
          title="Clientes totales"
          value={stats.totalCustomers.toLocaleString("es-MX")}
          description="Acumulado"
          icon={<Users size={14} />}
          iconColor="#78695a"
        />
      </div>

      {/* Row 2: Secondary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title={`LTV promedio ${days}d`}
          value={fmt(stats.ltv)}
          description="Revenue / cliente único"
          icon={<TrendingUp size={14} />}
          iconColor="#bb9a4c"
        />
        <KpiCard
          title="Tasa de recompra"
          value={`${stats.repeatRate.toFixed(1)}%`}
          description="Clientes recurrentes"
          changePositive={stats.repeatRate >= 30}
          change={
            stats.repeatRate >= 30 ? "Buena retención" :
            stats.repeatRate >= 15 ? "Mejorable" : undefined
          }
          icon={<Repeat size={14} />}
          iconColor={stats.repeatRate >= 30 ? "#4f7a3e" : "#78695a"}
        />
        <KpiCard
          title={`Clientes nuevos ${days}d`}
          value={stats.newCustomers.toLocaleString("es-MX")}
          icon={<Users size={14} />}
          iconColor="#4f7a3e"
        />
        <KpiCard
          title={`Clientes recurrentes ${days}d`}
          value={stats.returningCustomers.toLocaleString("es-MX")}
          icon={<Repeat size={14} />}
          iconColor="#b07a30"
        />
      </div>

      {/* Row 3: Revenue chart + Orders chart + New vs Returning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Revenue por día">
          <RevenueChart data={stats.revenueByDay} />
        </SectionCard>
        <SectionCard title="Pedidos por día">
          <OrdersChart data={stats.ordersByDay ?? []} />
        </SectionCard>
        <SectionCard title="Clientes nuevos vs recurrentes">
          <NewVsReturning
            newCustomers={stats.newCustomers}
            returningCustomers={stats.returningCustomers}
          />
        </SectionCard>
      </div>

      {/* Row 4: Status breakdown + Product type revenue + Discount codes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Estado de pedidos">
          <StatusBars s={stats.statusBreakdown} />
        </SectionCard>
        <SectionCard title="Revenue por tipo de producto">
          <ProductTypeBars items={stats.byProductType} />
        </SectionCard>
        <SectionCard title={`Códigos de descuento · ${days}d`}>
          <DiscountCodesTable codes={stats.discountCodes} />
        </SectionCard>
      </div>

      {/* Row 5: Heatmap */}
      <SectionCard title={`Pedidos por hora y día de semana · ${days}d`}>
        <OrdersHeatmap data={stats.heatmap} />
      </SectionCard>

      {/* Row 6: Top Products + Province */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProducts products={stats.topProducts} />
        <SectionCard title="Pedidos por estado / provincia">
          <ProvinceBars data={stats.ordersByProvince} />
        </SectionCard>
      </div>
    </div>
  );
}

async function ShopifyContentWrapper({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;
  return <ShopifyContent days={days} />;
}

export default function ShopifyPage({
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
            Shopify
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            Últimos 30 días · cambia el período arriba a la derecha
          </p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <ShopifyContentWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
