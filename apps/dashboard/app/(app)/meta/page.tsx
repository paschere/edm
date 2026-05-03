import { Suspense } from "react";
import { getMetaStats } from "@/lib/meta";
import { KpiCard } from "@/components/widgets/kpi-card";
import { MetaCampaignTable } from "@/components/charts/meta-campaign-table";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Users, ImageIcon } from "lucide-react";

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

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
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

async function MetaContent() {
  "use cache";
  const meta = await getMetaStats().catch(() => null);

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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Gasto Meta 30d"
          value={fmt(meta.totalSpend)}
          icon={<DollarSign size={14} />}
          iconColor="#b07a30"
        />
        <KpiCard
          title="ROAS promedio"
          value={meta.totalRoas > 0 ? `${meta.totalRoas.toFixed(2)}x` : "—"}
          description="Compras / Gasto"
          changePositive={meta.totalRoas >= 2}
          change={meta.totalRoas > 0 ? `${meta.totalRoas.toFixed(2)}x` : undefined}
          icon={<TrendingUp size={14} />}
          iconColor="#4f7a3e"
        />
        <KpiCard
          title="Alcance total"
          value={meta.totalReach.toLocaleString("es-MX")}
          icon={<Users size={14} />}
          iconColor="#bb9a4c"
        />
        <KpiCard
          title="Seguidores IG"
          value={meta.instagram.followers.toLocaleString("es-MX")}
          icon={<ImageIcon size={14} />}
          iconColor="#78695a"
        />
      </div>

      <SectionCard title="Campañas 30d">
        <MetaCampaignTable campaigns={meta.campaigns} />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SectionCard title="Página de Facebook">
          <div className="space-y-3">
            <StatRow label="Seguidores" value={meta.page.followers.toLocaleString("es-MX")} />
            <StatRow label="Impresiones 30d" value={meta.page.impressions.toLocaleString("es-MX")} />
            <StatRow label="Alcance 30d" value={meta.page.reach.toLocaleString("es-MX")} />
            <StatRow label="Usuarios comprometidos" value={meta.page.engagedUsers.toLocaleString("es-MX")} />
            <StatRow label="Vistas de página" value={meta.page.pageViews.toLocaleString("es-MX")} />
          </div>
        </SectionCard>

        <SectionCard title="Instagram">
          <div className="space-y-3">
            <StatRow
              label="Seguidores"
              value={meta.instagram.followers.toLocaleString("es-MX")}
              accent="#bb9a4c"
            />
            <StatRow label="Impresiones 28d" value={meta.instagram.impressions.toLocaleString("es-MX")} />
            <StatRow label="Alcance 28d" value={meta.instagram.reach.toLocaleString("es-MX")} />
            <StatRow label="Vistas de perfil 28d" value={meta.instagram.profileViews.toLocaleString("es-MX")} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default function MetaPage() {
  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 500, lineHeight: 1, letterSpacing: "-0.01em", color: "var(--foreground)" }}>Meta / Facebook</h1>
        <p className="text-[12px] text-muted-foreground mt-1">Ads · Página · Instagram · Últimos 30 días</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <MetaContent />
      </Suspense>
    </div>
  );
}
