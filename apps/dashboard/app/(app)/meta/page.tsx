import { Suspense } from "react";
import { getMetaStats } from "@/lib/meta";
import { getShopifyStats } from "@/lib/shopify";
import { KpiCard } from "@/components/widgets/kpi-card";
import { MetaCampaignTable } from "@/components/charts/meta-campaign-table";
import { CorrelationChart } from "@/components/charts/correlation-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/widgets/period-selector";
import { DollarSign, TrendingUp, Users, ImageIcon, Target, Layers, Eye } from "lucide-react";

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

function StatRow({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className="flex flex-col">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        {sub && <span className="text-[10px] text-muted-foreground/60">{sub}</span>}
      </div>
      <span
        className="metric text-[13px] font-semibold tabular-nums shrink-0"
        style={accent ? { color: accent } : { color: "var(--foreground)" }}
      >
        {value}
      </span>
    </div>
  );
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-0.5 rounded-lg p-3 text-center"
      style={{ background: `${color}0d`, border: `1px solid ${color}22` }}
    >
      <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 500, color, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted-foreground)" }}>
        {label}
      </span>
    </div>
  );
}

async function MetaContent({ days }: { days: number }) {
  "use cache";
  const [meta, shopify] = await Promise.all([
    getMetaStats(days).catch(() => null),
    getShopifyStats(days).catch(() => null),
  ]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  if (!meta) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-[13px] text-destructive">
        No se pudieron cargar los datos de Meta. Verifica las variables de entorno.
      </div>
    );
  }

  // Build correlation data
  const revenueMap = new Map(
    (shopify?.revenueByDay ?? []).map((d) => [d.date, d.value])
  );
  const spendMap = new Map(meta.dailySpend.map((d) => [d.date, d.value]));
  const allDates = Array.from(
    new Set([...revenueMap.keys(), ...spendMap.keys()])
  ).sort();
  const correlationData = allDates.map((date) => ({
    date,
    revenue: revenueMap.get(date) ?? 0,
    spend: spendMap.get(date) ?? 0,
  }));

  const spendValues = meta.dailySpend.map((d) => d.value);
  const spendTrend =
    spendValues.length >= 4
      ? (() => {
          const half = Math.floor(spendValues.length / 2);
          const first = spendValues.slice(0, half).reduce((a, b) => a + b, 0);
          const second = spendValues.slice(half).reduce((a, b) => a + b, 0);
          return first === 0 ? (second > 0 ? 100 : 0) : ((second - first) / first) * 100;
        })()
      : undefined;

  // Estimated ROAS from Shopify revenue / Meta spend (only if both available)
  const estimatedRoas = shopify && meta.totalSpend > 0
    ? shopify.totalRevenue / meta.totalSpend
    : null;

  return (
    <div className="space-y-5">
      {/* Row 1: Primary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title={`Gasto Meta ${days}d`}
          value={fmt(meta.totalSpend)}
          icon={<DollarSign size={14} />}
          iconColor="#b07a30"
          sparklineData={spendValues.length >= 2 ? spendValues : undefined}
          trendPct={spendTrend}
        />
        <KpiCard
          title="ROAS promedio"
          value={meta.totalRoas > 0 ? `${meta.totalRoas.toFixed(2)}x` : "—"}
          description="Reportado por Meta"
          changePositive={meta.totalRoas >= 2}
          change={
            meta.totalRoas > 0
              ? meta.totalRoas >= 2
                ? "Rentable"
                : "Bajo objetivo"
              : undefined
          }
          icon={<TrendingUp size={14} />}
          iconColor={meta.totalRoas >= 2 ? "#4f7a3e" : "#78695a"}
        />
        <KpiCard
          title="Compras atribuidas"
          value={meta.totalPurchases > 0 ? meta.totalPurchases.toLocaleString("es-MX") : "—"}
          description={meta.totalPurchases > 0 ? `CPA ${fmt(meta.totalSpend / meta.totalPurchases)}` : undefined}
          icon={<Target size={14} />}
          iconColor="#4f7a3e"
        />
        <KpiCard
          title="Alcance total"
          value={meta.totalReach > 0 ? meta.totalReach.toLocaleString("es-MX") : "—"}
          description="Personas únicas"
          icon={<Users size={14} />}
          iconColor="#bb9a4c"
        />
      </div>

      {/* Row 2: Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title={`Impresiones ${days}d`}
          value={meta.totalImpressions > 0 ? meta.totalImpressions.toLocaleString("es-MX") : "—"}
          icon={<Eye size={14} />}
          iconColor="#78695a"
        />
        <KpiCard
          title="CPM promedio"
          value={meta.avgCPM > 0 ? fmt(meta.avgCPM) : "—"}
          description="Costo por mil impresiones"
          icon={<Layers size={14} />}
          iconColor="#bb9a4c"
        />
        <KpiCard
          title="Frecuencia promedio"
          value={meta.avgFrequency > 0 ? meta.avgFrequency.toFixed(2) : "—"}
          description="Impresiones / Alcance"
          change={meta.avgFrequency > 3 ? "Fatiga de anuncio" : meta.avgFrequency > 2 ? "Óptima" : undefined}
          changePositive={meta.avgFrequency > 0 && meta.avgFrequency <= 3}
          icon={<Layers size={14} />}
          iconColor={meta.avgFrequency > 3 ? "#b43c28" : "#4f7a3e"}
        />
        <KpiCard
          title="Seguidores Instagram"
          value={meta.instagram.followers.toLocaleString("es-MX")}
          icon={<ImageIcon size={14} />}
          iconColor="#78695a"
        />
      </div>

      {/* Row 3: Cruce Meta vs Shopify */}
      {correlationData.length >= 2 && (
        <SectionCard title={`Revenue Shopify vs Gasto Meta · ${days}d — Cruce de canales`}>
          <div className="flex items-center gap-6 mb-4 flex-wrap">
            {estimatedRoas !== null && (
              <MetricPill
                label="ROAS real (Shopify/Meta)"
                value={`${estimatedRoas.toFixed(2)}x`}
                color={estimatedRoas >= 3 ? "#4f7a3e" : estimatedRoas >= 1.5 ? "#bb9a4c" : "#b43c28"}
              />
            )}
            {shopify && (
              <MetricPill
                label="Revenue 30d"
                value={fmt(shopify.totalRevenue)}
                color="#bb9a4c"
              />
            )}
            {meta.totalSpend > 0 && (
              <MetricPill
                label="Gasto Meta 30d"
                value={fmt(meta.totalSpend)}
                color="#b07a30"
              />
            )}
          </div>
          <CorrelationChart data={correlationData} />
        </SectionCard>
      )}

      {/* Row 4: Campaigns table */}
      <SectionCard title={`Campañas ${days}d`}>
        <MetaCampaignTable campaigns={meta.campaigns} />
      </SectionCard>

      {/* Row 5: Page + IG */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SectionCard title="Página de Facebook">
          <div className="space-y-3">
            <StatRow label="Seguidores" value={meta.page.followers.toLocaleString("es-MX")} accent="#bb9a4c" />
            <StatRow label="Impresiones 30d" value={meta.page.impressions.toLocaleString("es-MX")} />
            <StatRow label="Alcance 30d" value={meta.page.reach.toLocaleString("es-MX")} />
            <StatRow label="Usuarios comprometidos" value={meta.page.engagedUsers.toLocaleString("es-MX")} />
            <StatRow label="Vistas de página" value={meta.page.pageViews.toLocaleString("es-MX")} />
          </div>
        </SectionCard>

        <SectionCard title="Instagram">
          <div className="space-y-3">
            <StatRow label="Seguidores" value={meta.instagram.followers.toLocaleString("es-MX")} accent="#bb9a4c" />
            <StatRow label="Impresiones 28d" value={meta.instagram.impressions.toLocaleString("es-MX")} />
            <StatRow label="Alcance 28d" value={meta.instagram.reach.toLocaleString("es-MX")} />
            <StatRow label="Vistas de perfil 28d" value={meta.instagram.profileViews.toLocaleString("es-MX")} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

async function MetaContentWrapper({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: d } = await searchParams;
  const days = [7, 30, 90].includes(Number(d)) ? Number(d) : 30;
  return <MetaContent days={days} />;
}

export default function MetaPage({
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
            Meta / Facebook
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            Ads · Página · Instagram · Cruce con Shopify
          </p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <MetaContentWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
