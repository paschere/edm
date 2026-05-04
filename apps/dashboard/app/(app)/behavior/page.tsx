import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { pixelEvents } from "@/lib/db/schema";
import { sql, gte, and, inArray, desc, isNotNull } from "drizzle-orm";
import { KpiCard } from "@/components/widgets/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/widgets/period-selector";
import { Eye, ShoppingCart, CheckCircle, Percent, Search, TrendingDown, MapPin } from "lucide-react";

const FUNNEL_STEPS = [
  { key: "page_viewed",             label: "Páginas vistas",      color: "#bb9a4c" },
  { key: "product_viewed",          label: "Producto visto",       color: "#c4904a" },
  { key: "product_added_to_cart",   label: "Añadido al carrito",   color: "#b07a30" },
  { key: "checkout_started",        label: "Checkout iniciado",    color: "#7a9a5a" },
  { key: "checkout_completed",      label: "Compra realizada",     color: "#4f7a3e" },
];

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

// ─── Journey Flow (horizontal funnel with drop-offs) ─────────────────────────
function JourneyFlow({
  steps,
}: {
  steps: { key: string; label: string; color: string; sessions: number }[];
}) {
  const max = steps[0]?.sessions ?? 1;

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const pct = max > 0 ? (step.sessions / max) * 100 : 0;
        const prev = steps[i - 1];
        const convFromPrev = prev && prev.sessions > 0
          ? (step.sessions / prev.sessions) * 100
          : null;
        const dropOff = prev ? prev.sessions - step.sessions : 0;

        return (
          <div key={step.key}>
            {/* Drop-off row between steps */}
            {i > 0 && (
              <div
                className="flex items-center gap-3 py-1 pl-1"
                style={{ marginLeft: `${Math.max(pct, 2)}%`, transition: "margin 0.3s" }}
              >
                <div
                  className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded tabular-nums"
                  style={{
                    background: "rgba(180,60,40,0.1)",
                    color: "#b43c28",
                    border: "1px solid rgba(180,60,40,0.15)",
                  }}
                >
                  ↓ {dropOff.toLocaleString("es-MX")} abandonan
                </div>
                {convFromPrev !== null && (
                  <div
                    className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded tabular-nums"
                    style={{
                      background:
                        convFromPrev >= 50
                          ? "rgba(79,122,62,0.12)"
                          : convFromPrev >= 25
                          ? "rgba(187,154,76,0.12)"
                          : "rgba(180,60,40,0.1)",
                      color:
                        convFromPrev >= 50
                          ? "#4f7a3e"
                          : convFromPrev >= 25
                          ? "#bb9a4c"
                          : "#b43c28",
                      border: `1px solid ${
                        convFromPrev >= 50
                          ? "rgba(79,122,62,0.2)"
                          : convFromPrev >= 25
                          ? "rgba(187,154,76,0.2)"
                          : "rgba(180,60,40,0.15)"
                      }`,
                    }}
                  >
                    {convFromPrev.toFixed(1)}% continúan
                  </div>
                )}
              </div>
            )}

            {/* Step bar */}
            <div className="flex items-center gap-3">
              <div
                className="rounded-r-sm flex items-center justify-end pr-3 transition-all duration-500"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  minWidth: "2%",
                  height: "36px",
                  background: `linear-gradient(to right, ${step.color}55, ${step.color}cc)`,
                  borderRight: `3px solid ${step.color}`,
                }}
              />
              <div className="flex items-baseline gap-2 shrink-0">
                <span
                  className="tabular-nums font-semibold"
                  style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: step.color, letterSpacing: "-0.02em" }}
                >
                  {step.sessions.toLocaleString("es-MX")}
                </span>
                <span className="text-[11px] text-muted-foreground">{step.label}</span>
                {max > 0 && (
                  <span className="text-[10px] tabular-nums" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
                    ({pct.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Product Funnel (view → cart conversion per product) ─────────────────────
function ProductFunnel({
  viewed,
  carted,
}: {
  viewed: { title: string; count: number }[];
  carted: { title: string; count: number }[];
}) {
  if (!viewed.length) {
    return <p className="text-[13px] text-muted-foreground">Sin datos de productos aún</p>;
  }

  const cartMap = new Map(carted.map((c) => [c.title, c.count]));
  const maxViews = viewed[0]?.count ?? 1;

  return (
    <div className="space-y-3">
      {viewed.slice(0, 8).map((p) => {
        const adds = cartMap.get(p.title) ?? 0;
        const cartRate = p.count > 0 ? (adds / p.count) * 100 : 0;
        const viewPct = (p.count / maxViews) * 100;

        return (
          <div key={p.title}>
            <div className="flex items-baseline justify-between mb-1 gap-2">
              <span className="text-[12px] text-foreground truncate max-w-[55%]">{p.title}</span>
              <div className="flex items-baseline gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground">
                  {p.count.toLocaleString("es-MX")} vistas
                </span>
                {adds > 0 && (
                  <>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span
                      className="text-[11px] font-medium tabular-nums"
                      style={{ color: "#4f7a3e" }}
                    >
                      {adds} al carrito ({cartRate.toFixed(0)}%)
                    </span>
                  </>
                )}
              </div>
            </div>
            <div
              className="relative rounded-sm overflow-hidden"
              style={{ height: "6px", background: "var(--border)" }}
            >
              {/* Views bar */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${viewPct}%`,
                  background: "rgba(187,154,76,0.35)",
                  borderRadius: "2px",
                }}
              />
              {/* Cart bar */}
              {adds > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: `${(adds / maxViews) * 100}%`,
                    background: "rgba(79,122,62,0.75)",
                    borderRadius: "2px",
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ background: "rgba(187,154,76,0.35)" }} />
          <span className="text-[10px] text-muted-foreground">Vistas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ background: "rgba(79,122,62,0.75)" }} />
          <span className="text-[10px] text-muted-foreground">Add to cart</span>
        </div>
      </div>
    </div>
  );
}

// ─── UTM Attribution ──────────────────────────────────────────────────────────
function UtmAttribution({
  rows,
}: {
  rows: { source: string | null; medium: string | null; campaign: string | null; purchases: number }[];
}) {
  if (!rows.length) {
    return <p className="text-[13px] text-muted-foreground">Sin compras atribuidas aún</p>;
  }

  const max = rows[0]?.purchases ?? 1;

  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        const label = r.source
          ? [r.source, r.medium].filter(Boolean).join(" / ")
          : "directo / orgánico";
        const campaign = r.campaign;
        const pct = (r.purchases / max) * 100;

        return (
          <div key={i}>
            <div className="flex items-baseline justify-between mb-1 gap-2">
              <div className="min-w-0">
                <span className="text-[12px] text-foreground">{label}</span>
                {campaign && (
                  <span className="text-[10px] text-muted-foreground ml-1.5 truncate">
                    · {campaign}
                  </span>
                )}
              </div>
              <span
                className="tabular-nums font-semibold shrink-0"
                style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "#4f7a3e", letterSpacing: "-0.02em" }}
              >
                {r.purchases}
              </span>
            </div>
            <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "rgba(79,122,62,0.6)",
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

// ─── Data layer ───────────────────────────────────────────────────────────────
async function BehaviorContent({ days }: { days: number }) {
  "use cache";

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const funnelKeys = FUNNEL_STEPS.map((s) => s.key);

  let funnelMap = new Map<string, number>();
  let topViewed: { title: string; count: number }[] = [];
  let topCarted: { title: string; count: number }[] = [];
  let utmRows: { source: string | null; medium: string | null; campaign: string | null; purchases: number }[] = [];
  let searchRows: { query: string; count: number }[] = [];
  let topPages: { url: string; count: number }[] = [];
  let dbAvailable = true;

  try {
    const db = getDb();

    const [funnel, viewed, carted, utms, searches, pages] = await Promise.all([
      // Session-based funnel (unique sessions per step)
      db
        .select({
          eventType: pixelEvents.eventType,
          sessions: sql<number>`count(distinct ${pixelEvents.sessionId})::int`,
        })
        .from(pixelEvents)
        .where(
          and(
            gte(pixelEvents.createdAt, since),
            inArray(pixelEvents.eventType, funnelKeys),
            isNotNull(pixelEvents.sessionId),
          )
        )
        .groupBy(pixelEvents.eventType),

      // Top products viewed
      db
        .select({
          title: pixelEvents.productTitle,
          count: sql<number>`count(*)::int`,
        })
        .from(pixelEvents)
        .where(
          and(
            gte(pixelEvents.createdAt, since),
            sql`${pixelEvents.eventType} = 'product_viewed'`,
            isNotNull(pixelEvents.productTitle),
          )
        )
        .groupBy(pixelEvents.productTitle)
        .orderBy(desc(sql`count(*)`))
        .limit(8),

      // Top products added to cart
      db
        .select({
          title: pixelEvents.productTitle,
          count: sql<number>`count(*)::int`,
        })
        .from(pixelEvents)
        .where(
          and(
            gte(pixelEvents.createdAt, since),
            sql`${pixelEvents.eventType} = 'product_added_to_cart'`,
            isNotNull(pixelEvents.productTitle),
          )
        )
        .groupBy(pixelEvents.productTitle)
        .orderBy(desc(sql`count(*)`))
        .limit(8),

      // UTM attribution for purchases
      db
        .select({
          source: pixelEvents.utmSource,
          medium: pixelEvents.utmMedium,
          campaign: pixelEvents.utmCampaign,
          purchases: sql<number>`count(*)::int`,
        })
        .from(pixelEvents)
        .where(
          and(
            gte(pixelEvents.createdAt, since),
            sql`${pixelEvents.eventType} = 'checkout_completed'`,
          )
        )
        .groupBy(pixelEvents.utmSource, pixelEvents.utmMedium, pixelEvents.utmCampaign)
        .orderBy(desc(sql`count(*)`))
        .limit(8),

      // Top search terms
      db
        .select({
          query: pixelEvents.searchQuery,
          count: sql<number>`count(*)::int`,
        })
        .from(pixelEvents)
        .where(
          and(
            gte(pixelEvents.createdAt, since),
            sql`${pixelEvents.eventType} = 'search_submitted'`,
            isNotNull(pixelEvents.searchQuery),
          )
        )
        .groupBy(pixelEvents.searchQuery)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // Top pages
      db
        .select({
          url: pixelEvents.pageUrl,
          count: sql<number>`count(*)::int`,
        })
        .from(pixelEvents)
        .where(
          and(
            gte(pixelEvents.createdAt, since),
            sql`${pixelEvents.eventType} = 'page_viewed'`,
            isNotNull(pixelEvents.pageUrl),
          )
        )
        .groupBy(pixelEvents.pageUrl)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
    ]);

    funnelMap = new Map(funnel.map((r) => [r.eventType, r.sessions]));
    topViewed = viewed.map((r) => ({ title: r.title!, count: r.count }));
    topCarted = carted.map((r) => ({ title: r.title!, count: r.count }));
    utmRows = utms;
    searchRows = searches.map((r) => ({ query: r.query!, count: r.count }));
    topPages = pages.filter((p) => p.url).map((p) => ({ url: p.url!, count: p.count }));
  } catch {
    dbAvailable = false;
  }

  const funnelSteps = FUNNEL_STEPS.map((s) => ({
    ...s,
    sessions: funnelMap.get(s.key) ?? 0,
  }));

  const totalSessions = funnelSteps[0]?.sessions ?? 0;
  const addToCart = funnelSteps[2]?.sessions ?? 0;
  const purchases = funnelSteps[4]?.sessions ?? 0;
  const convRate = totalSessions > 0 ? (purchases / totalSessions) * 100 : 0;
  const cartAbandonment = addToCart > 0 ? ((addToCart - purchases) / addToCart) * 100 : 0;

  return (
    <div className="space-y-4">
      {!dbAvailable && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-[13px] text-amber-400">
          Base de datos no disponible. Configura DATABASE_URL para ver datos del Web Pixel.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title={`Sesiones ${days}d`}
          value={totalSessions.toLocaleString("es-MX")}
          description="Sesiones únicas con pixel"
          icon={<Eye size={14} />}
          iconColor="#bb9a4c"
        />
        <KpiCard
          title="Tasa de conversión"
          value={`${convRate.toFixed(2)}%`}
          description="Visita → Compra"
          icon={<Percent size={14} />}
          iconColor={convRate >= 2 ? "#4f7a3e" : "#78695a"}
        />
        <KpiCard
          title="Compras pixel"
          value={purchases.toLocaleString("es-MX")}
          description="checkout_completed"
          icon={<CheckCircle size={14} />}
          iconColor="#4f7a3e"
        />
        <KpiCard
          title="Abandono carrito"
          value={`${cartAbandonment.toFixed(1)}%`}
          description="Carrito → no compra"
          icon={<TrendingDown size={14} />}
          iconColor="#b43c28"
          changePositive={false}
        />
      </div>

      {/* Journey Flow */}
      <SectionCard title={`Journey de conversión · ${days}d · sesiones únicas`}>
        {totalSessions > 0 ? (
          <JourneyFlow steps={funnelSteps} />
        ) : (
          <div className="py-8 text-center">
            <p className="text-[13px] text-muted-foreground">Sin sesiones registradas aún.</p>
            <p className="text-[11px] text-muted-foreground mt-1 opacity-70">
              Activa el pixel en Shopify Customer Events para empezar a capturar datos.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Products + UTM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title={`Funnel por producto · ${days}d`}>
          <ProductFunnel viewed={topViewed} carted={topCarted} />
        </SectionCard>

        <SectionCard title={`Atribución de compras · ${days}d`}>
          <UtmAttribution rows={utmRows} />
        </SectionCard>
      </div>

      {/* Search + Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title={`Búsquedas más frecuentes · ${days}d`}>
          {searchRows.length > 0 ? (
            <div className="space-y-2">
              {searchRows.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Search size={11} className="shrink-0 opacity-40" />
                    <span className="text-[12px] text-foreground truncate">{s.query}</span>
                  </div>
                  <span className="tabular-nums text-[12px] font-semibold shrink-0" style={{ color: "#bb9a4c" }}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">Sin búsquedas registradas aún</p>
          )}
        </SectionCard>

        <SectionCard title={`Páginas más visitadas · ${days}d`}>
          {topPages.length > 0 ? (
            <div className="space-y-2">
              {topPages.map((p, i) => {
                const path = (() => {
                  try { return new URL(p.url).pathname; } catch { return p.url; }
                })();
                return (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={11} className="shrink-0 opacity-40" />
                      <span className="text-[12px] text-foreground truncate" title={p.url}>{path}</span>
                    </div>
                    <span className="tabular-nums text-[12px] font-semibold shrink-0" style={{ color: "#bb9a4c" }}>
                      {p.count.toLocaleString("es-MX")}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">Sin páginas registradas aún</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

async function BehaviorContentWrapper({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: d } = await searchParams;
  const days = [7, 30, 90].includes(Number(d)) ? Number(d) : 30;
  return <BehaviorContent days={days} />;
}

export default function BehaviorPage({
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
            Comportamiento
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            Web Pixel · Journey de usuario · Sesiones únicas
          </p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <BehaviorContentWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
