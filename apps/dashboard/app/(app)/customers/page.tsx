import { Suspense } from "react";
import { getShopifyStats } from "@/lib/shopify";
import type { TopCustomer } from "@/lib/shopify";
import { KpiCard } from "@/components/widgets/kpi-card";
import { NewVsReturning } from "@/components/charts/new-vs-returning";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/widgets/period-selector";
import { Users, Repeat, TrendingUp, UserCheck } from "lucide-react";

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

function TopCustomersTable({ customers }: { customers: TopCustomer[] }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  if (!customers.length) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
        Sin datos de clientes identificados en este período
      </p>
    );
  }

  const maxSpent = customers[0]?.totalSpent ?? 1;

  return (
    <div className="space-y-2.5">
      {customers.map((c, i) => {
        const pct = (c.totalSpent / maxSpent) * 100;
        const initials = c.name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0] ?? "")
          .join("")
          .toUpperCase() || "?";

        return (
          <div key={c.id}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold"
                  style={{
                    background: `rgba(187,154,76,${0.08 + (1 - i / customers.length) * 0.12})`,
                    color: "#bb9a4c",
                    border: "1px solid rgba(187,154,76,0.2)",
                  }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate max-w-[160px]">
                    {c.name}
                  </p>
                  {c.email && (
                    <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                      {c.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2 shrink-0">
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                  {c.ordersCount} {c.ordersCount === 1 ? "pedido" : "pedidos"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.1rem",
                    fontWeight: 500,
                    color: "#bb9a4c",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {fmt(c.totalSpent)}
                </span>
              </div>
            </div>
            <div style={{ height: "3px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: `rgba(187,154,76,${0.35 + (pct / 100) * 0.45})`,
                  borderRadius: "2px",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RetentionGauge({ repeatRate }: { repeatRate: number }) {
  const angle = (repeatRate / 100) * 180;
  const color = repeatRate >= 40 ? "#4f7a3e" : repeatRate >= 20 ? "#bb9a4c" : "#b43c28";
  const r = 48;
  const cx = 60;
  const cy = 60;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const pointOnArc = (deg: number) => ({
    x: cx + r * Math.cos(toRad(180 + deg)),
    y: cy + r * Math.sin(toRad(180 + deg)),
  });

  const start = pointOnArc(0);
  const end = pointOnArc(Math.min(angle, 179.9));
  const largeArc = angle > 90 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        {/* Background arc */}
        <path
          d={`M ${60 - r} ${cy} A ${r} ${r} 0 0 1 ${60 + r} ${cy}`}
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {angle > 0 && (
          <path
            d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        )}
        {/* Value text */}
        <text x="60" y="58" textAnchor="middle" style={{ fill: color, fontSize: "18px", fontWeight: 600 }}>
          {repeatRate.toFixed(0)}%
        </text>
      </svg>
      <p className="text-[11px] text-muted-foreground -mt-1">tasa de recompra</p>
      <p
        className="text-[10px] mt-1 font-medium"
        style={{
          color,
        }}
      >
        {repeatRate >= 40 ? "Excelente retención" : repeatRate >= 20 ? "Retención aceptable" : "Retención baja"}
      </p>
    </div>
  );
}

async function CustomersContent({ days }: { days: number }) {
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
        No se pudieron cargar los datos de clientes. Verifica las variables de entorno.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Clientes totales"
          value={stats.totalCustomers.toLocaleString("es-MX")}
          description="Acumulado en la tienda"
          icon={<Users size={14} />}
          iconColor="#78695a"
        />
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
          description="Clientes con >1 pedido"
          changePositive={stats.repeatRate >= 30}
          change={
            stats.repeatRate >= 30
              ? "Buena retención"
              : stats.repeatRate >= 15
              ? "Mejorable"
              : undefined
          }
          icon={<Repeat size={14} />}
          iconColor={stats.repeatRate >= 30 ? "#4f7a3e" : "#78695a"}
        />
        <KpiCard
          title={`Clientes nuevos ${days}d`}
          value={stats.newCustomers.toLocaleString("es-MX")}
          description={`${stats.returningCustomers} recurrentes`}
          icon={<UserCheck size={14} />}
          iconColor="#4f7a3e"
        />
      </div>

      {/* New vs returning + Retention gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title={`Nuevos vs recurrentes · ${days}d`}>
          <NewVsReturning
            newCustomers={stats.newCustomers}
            returningCustomers={stats.returningCustomers}
          />
        </SectionCard>

        <SectionCard title="Retención">
          <div className="flex flex-col items-center justify-center h-[180px]">
            <RetentionGauge repeatRate={stats.repeatRate} />
          </div>
        </SectionCard>

        <SectionCard title="Resumen de segmentación">
          <div className="space-y-4 pt-2">
            <div>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted-foreground)", marginBottom: "8px" }}>
                {days} días activos
              </p>
              <div className="space-y-2">
                {[
                  { label: "Clientes nuevos", value: stats.newCustomers, color: "#4f7a3e" },
                  { label: "Clientes recurrentes", value: stats.returningCustomers, color: "#bb9a4c" },
                ].map(({ label, value, color }) => {
                  const total = stats.newCustomers + stats.returningCustomers || 1;
                  const pct = Math.round((value / total) * 100);
                  return (
                    <div key={label}>
                      <div className="flex justify-between mb-0.5">
                        <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{label}</span>
                        <span style={{ fontSize: "11px", fontWeight: 600, color }}>{value} ({pct}%)</span>
                      </div>
                      <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, opacity: 0.7, borderRadius: "2px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
              <div className="flex justify-between">
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Ticket promedio</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>
                  {fmt(stats.averageOrderValue)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Top customers */}
      <SectionCard title={`Top ${Math.min(stats.topCustomers.length, 20)} clientes · ${days}d`}>
        {stats.topCustomers.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0">
            <TopCustomersTable customers={stats.topCustomers.slice(0, 10)} />
            {stats.topCustomers.length > 10 && (
              <TopCustomersTable customers={stats.topCustomers.slice(10, 20)} />
            )}
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
            Sin clientes identificados (pedidos de invitados)
          </p>
        )}
      </SectionCard>
    </div>
  );
}

async function CustomersContentWrapper({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;
  return <CustomersContent days={days} />;
}

export default function CustomersPage({
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
            Clientes
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            LTV · Retención · Top compradores
          </p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <CustomersContentWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
