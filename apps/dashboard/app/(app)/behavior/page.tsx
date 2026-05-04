import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { pixelEvents } from "@/lib/db/schema";
import { sql, gte, and, inArray, desc, isNotNull } from "drizzle-orm";
import { KpiCard } from "@/components/widgets/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/widgets/period-selector";
import { Eye, ShoppingCart, CheckCircle, Percent, Search, TrendingDown, MapPin, Clock, BarChart2, Globe, Zap } from "lucide-react";

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

// ─── Journey Flow ─────────────────────────────────────────────────────────────
function JourneyFlow({
  steps,
}: {
  steps: { key: string; label: string; color: string; sessions: number }[];
}) {
  const top = steps[0]?.sessions ?? 0;

  return (
    <div>
      {steps.map((step, i) => {
        const pct = top > 0 ? Math.min((step.sessions / top) * 100, 100) : 0;
        const prev = steps[i - 1];
        const dropOff = prev && prev.sessions > step.sessions ? prev.sessions - step.sessions : 0;
        const dropPct = prev && prev.sessions > 0 ? (dropOff / prev.sessions) * 100 : 0;
        const contPct = prev && prev.sessions > 0
          ? (Math.min(step.sessions, prev.sessions) / prev.sessions) * 100
          : null;
        const isEmpty = step.sessions === 0;

        return (
          <div key={step.key}>
            {/* Connector between steps */}
            {i > 0 && (
              <div className="flex items-stretch gap-3 my-0" style={{ paddingLeft: "11px" }}>
                {/* Vertical line */}
                <div style={{ width: "2px", background: "var(--border)", borderRadius: "1px", minHeight: "28px", flexShrink: 0 }} />
                {/* Drop-off info */}
                <div className="flex items-center gap-2 py-1">
                  {dropOff > 0 ? (
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full tabular-nums"
                      style={{ background: "rgba(180,60,40,0.08)", color: "#b43c28", border: "1px solid rgba(180,60,40,0.15)" }}
                    >
                      ↓ {dropOff} no continúan · {dropPct.toFixed(0)}%
                    </span>
                  ) : contPct !== null && step.sessions > 0 ? (
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full tabular-nums"
                      style={{ background: "rgba(79,122,62,0.08)", color: "#4f7a3e", border: "1px solid rgba(79,122,62,0.15)" }}
                    >
                      ✓ todos continúan
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground px-2">sin datos</span>
                  )}
                </div>
              </div>
            )}

            {/* Step row */}
            <div className="flex items-center gap-3">
              {/* Step number badge */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                style={{
                  background: isEmpty ? "var(--border)" : `${step.color}18`,
                  color: isEmpty ? "var(--muted-foreground)" : step.color,
                  border: `1.5px solid ${isEmpty ? "var(--border)" : step.color + "44"}`,
                }}
              >
                {i + 1}
              </div>

              {/* Bar + label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5 gap-3">
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: isEmpty ? "var(--muted-foreground)" : "var(--foreground)" }}
                  >
                    {step.label}
                  </span>
                  <div className="flex items-baseline gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {top > 0 ? `${pct.toFixed(0)}%` : "—"}
                    </span>
                    <span
                      className="tabular-nums font-semibold"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1rem",
                        letterSpacing: "-0.02em",
                        color: isEmpty ? "var(--muted-foreground)" : step.color,
                      }}
                    >
                      {step.sessions.toLocaleString("es-MX")}
                    </span>
                  </div>
                </div>
                <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.max(pct, isEmpty ? 0 : 0.5)}%`,
                      height: "100%",
                      background: isEmpty
                        ? "transparent"
                        : `linear-gradient(to right, ${step.color}88, ${step.color})`,
                      borderRadius: "3px",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
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

// ─── Abandonment Section ─────────────────────────────────────────────────────
function AbandonmentSection({
  cartNoCheckout,
  checkoutNoPurchase,
  products,
}: {
  cartNoCheckout: number;
  checkoutNoPurchase: number;
  products: { title: string; count: number }[];
}) {
  const hasData = cartNoCheckout > 0 || checkoutNoPurchase > 0;

  const stages = [
    {
      label: "Añadieron al carrito sin ir a checkout",
      sub: "Posibles causas: precio, duda, distracción",
      count: cartNoCheckout,
      color: "#b07a30",
      bg: "rgba(176,122,48,0.08)",
      border: "rgba(176,122,48,0.2)",
    },
    {
      label: "Iniciaron checkout sin completar la compra",
      sub: "Posibles causas: método de pago, envío, confusión en el proceso",
      count: checkoutNoPurchase,
      color: "#b43c28",
      bg: "rgba(180,60,40,0.07)",
      border: "rgba(180,60,40,0.18)",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Abandonment stages */}
      <div className="space-y-3">
        {stages.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-lg px-4 py-3"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.2rem",
                  fontWeight: 500,
                  color: s.color,
                  letterSpacing: "-0.02em",
                }}
              >
                {s.count}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-foreground">{s.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)", opacity: 0.8 }}>
                {s.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Abandoned products */}
      {products.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
            Productos que quedan en carritos abandonados
          </p>
          <div className="space-y-2">
            {products.map((p, i) => {
              const maxCount = products[0]?.count ?? 1;
              const pct = (p.count / maxCount) * 100;
              return (
                <div key={p.title}>
                  <div className="flex items-baseline justify-between mb-1 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0 w-3.5 text-right">
                        {i + 1}
                      </span>
                      <span className="text-[12px] text-foreground truncate">{p.title}</span>
                    </div>
                    <span
                      className="tabular-nums font-semibold shrink-0 text-[11px]"
                      style={{ color: "#b07a30" }}
                    >
                      {p.count} {p.count === 1 ? "vez" : "veces"}
                    </span>
                  </div>
                  <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: "rgba(176,122,48,0.55)",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasData && products.length === 0 && (
        <p className="text-[13px] text-muted-foreground">
          Sin abandonos registrados en este período — ¡buena señal!
        </p>
      )}
    </div>
  );
}

// ─── Hourly Activity ─────────────────────────────────────────────────────────
function HourlyActivity({ data }: { data: { hour: number; count: number }[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: data.find((d) => d.hour === i)?.count ?? 0,
  }));
  const max = Math.max(...hours.map((h) => h.count), 1);
  const peakHour = hours.reduce((a, b) => (a.count >= b.count ? a : b));
  const totalEvents = hours.reduce((a, h) => a + h.count, 0);

  const blocks = [
    { label: "Madrugada", start: 0 },
    { label: "Mañana", start: 6 },
    { label: "Tarde", start: 12 },
    { label: "Noche", start: 18 },
  ];

  if (totalEvents === 0) {
    return <p className="text-[13px] text-muted-foreground">Sin datos de actividad aún</p>;
  }

  return (
    <div>
      {/* Bars */}
      <div className="flex items-end gap-px h-14 mb-1.5">
        {hours.map((h) => {
          const pct = h.count > 0 ? Math.max((h.count / max) * 100, 6) : 2;
          const isPeak = h.hour === peakHour.hour && peakHour.count > 0;
          return (
            <div
              key={h.hour}
              className="flex-1 rounded-sm"
              style={{
                height: `${pct}%`,
                minHeight: "3px",
                background: isPeak
                  ? "#bb9a4c"
                  : h.count > 0
                  ? `rgba(187,154,76,${0.15 + (h.count / max) * 0.55})`
                  : "var(--border)",
                transition: "height 0.4s ease",
              }}
              title={`${h.hour}:00 — ${h.count} eventos`}
            />
          );
        })}
      </div>
      {/* Hour labels */}
      <div className="flex justify-between text-[9px] mb-3" style={{ color: "var(--muted-foreground)", opacity: 0.5 }}>
        {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((h) => (
          <span key={h}>{h}h</span>
        ))}
      </div>
      {/* Time block summaries */}
      <div className="grid grid-cols-4 gap-2">
        {blocks.map((b) => {
          const blockHours = hours.slice(b.start, b.start + 6);
          const total = blockHours.reduce((a, h) => a + h.count, 0);
          const pct = totalEvents > 0 ? ((total / totalEvents) * 100).toFixed(0) : "0";
          const isPeakBlock = blockHours.some((h) => h.hour === peakHour.hour && peakHour.count > 0);
          return (
            <div
              key={b.label}
              className="rounded-lg p-2.5 text-center"
              style={{
                background: isPeakBlock ? "rgba(187,154,76,0.08)" : "transparent",
                border: `1px solid ${isPeakBlock ? "rgba(187,154,76,0.2)" : "var(--border)"}`,
              }}
            >
              <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
                {b.label}
              </p>
              <p
                className="text-[13px] font-semibold tabular-nums"
                style={{ color: isPeakBlock ? "#bb9a4c" : "var(--foreground)" }}
              >
                {pct}%
              </p>
              <p className="text-[9px] tabular-nums" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
                {total} eventos
              </p>
            </div>
          );
        })}
      </div>
      {peakHour.count > 0 && (
        <p className="text-[11px] mt-3" style={{ color: "var(--muted-foreground)" }}>
          Hora pico:{" "}
          <span style={{ color: "#bb9a4c", fontWeight: 600 }}>
            {peakHour.hour}:00–{peakHour.hour + 1}:00
          </span>{" "}
          con {peakHour.count} eventos
        </p>
      )}
    </div>
  );
}

// ─── Channel Performance ──────────────────────────────────────────────────────
function ChannelPerformance({
  rows,
}: {
  rows: { source: string; sessions: number; cartRate: number; convRate: number }[];
}) {
  if (!rows.length) {
    return <p className="text-[13px] text-muted-foreground">Sin datos de canales aún</p>;
  }

  const maxSessions = rows[0]?.sessions ?? 1;

  return (
    <div className="space-y-0">
      <div className="grid grid-cols-4 gap-2 pb-2 mb-1" style={{ borderBottom: "1px solid rgba(11,8,5,0.08)" }}>
        {["Canal", "Sesiones", "Tasa carrito", "Conversión"].map((h) => (
          <p key={h} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground last:text-right">
            {h}
          </p>
        ))}
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-4 gap-2 py-2.5 items-center"
          style={{ borderBottom: "1px solid rgba(11,8,5,0.04)" }}
        >
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-foreground truncate capitalize">{r.source}</p>
            <div
              className="mt-1 rounded-sm"
              style={{
                height: "3px",
                background: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(r.sessions / maxSessions) * 100}%`,
                  height: "100%",
                  background: "rgba(187,154,76,0.5)",
                  borderRadius: "2px",
                }}
              />
            </div>
          </div>
          <p className="text-[12px] tabular-nums text-muted-foreground">
            {r.sessions.toLocaleString("es-MX")}
          </p>
          <p
            className="text-[12px] tabular-nums font-medium"
            style={{
              color:
                r.cartRate >= 10
                  ? "#4f7a3e"
                  : r.cartRate >= 4
                  ? "#bb9a4c"
                  : "var(--muted-foreground)",
            }}
          >
            {r.cartRate.toFixed(1)}%
          </p>
          <p
            className="text-[13px] tabular-nums font-semibold text-right"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
              color: r.convRate >= 2 ? "#4f7a3e" : r.convRate >= 0.5 ? "#bb9a4c" : "#b43c28",
            }}
          >
            {r.convRate.toFixed(1)}%
          </p>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground/50 pt-2">
        Sesiones únicas por canal · tasa carrito = añadieron al carrito / sesiones · conversión = compras / sesiones
      </p>
    </div>
  );
}

// ─── Data layer ───────────────────────────────────────────────────────────────
async function BehaviorContent({ days }: { days: number }) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 60 });

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const funnelKeys = FUNNEL_STEPS.map((s) => s.key);

  let funnelMap = new Map<string, number>();
  let topViewed: { title: string; count: number }[] = [];
  let topCarted: { title: string; count: number }[] = [];
  let utmRows: { source: string | null; medium: string | null; campaign: string | null; purchases: number }[] = [];
  let searchRows: { query: string; count: number }[] = [];
  let topPages: { url: string; count: number }[] = [];
  let abandonedProducts: { title: string; count: number }[] = [];
  let hourlyActivity: { hour: number; count: number }[] = [];
  let avgDepth = 0;
  let bounceRate = 0;
  let channelPerfData: { source: string; sessions: number; cartRate: number; convRate: number }[] = [];
  let avgCartValue: number | null = null;
  let dbAvailable = true;

  try {
    const db = getDb();

    const [funnel, viewed, carted, utms, searches, pages, abandoned, hourly, sessionDepths, channelRows, avgCartRows] = await Promise.all([
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

      // Products in abandoned carts (added to cart but session never completed checkout)
      db.execute(sql`
        SELECT product_title, count(*)::int as ct
        FROM pixel_events
        WHERE event_type = 'product_added_to_cart'
          AND product_title IS NOT NULL
          AND session_id IS NOT NULL
          AND created_at >= ${since}
          AND session_id NOT IN (
            SELECT DISTINCT session_id FROM pixel_events
            WHERE event_type = 'checkout_completed'
              AND session_id IS NOT NULL
              AND created_at >= ${since}
          )
        GROUP BY product_title
        ORDER BY ct DESC
        LIMIT 8
      `),

      // Hourly activity distribution
      db.execute(sql`
        SELECT
          EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Mexico_City')::int AS hr,
          count(*)::int AS ct
        FROM pixel_events
        WHERE event_type = 'page_viewed'
          AND created_at >= ${since}
        GROUP BY hr
        ORDER BY hr
      `),

      // Session depth (event count per session)
      db.execute(sql`
        SELECT count(*)::int AS evt_count
        FROM pixel_events
        WHERE session_id IS NOT NULL
          AND created_at >= ${since}
        GROUP BY session_id
      `),

      // Channel conversion performance
      db.execute(sql`
        SELECT
          COALESCE(utm_source, 'directo') AS src,
          count(DISTINCT session_id)::int AS sessions,
          count(DISTINCT CASE WHEN event_type = 'product_added_to_cart' THEN session_id END)::int AS carts,
          count(DISTINCT CASE WHEN event_type = 'checkout_completed' THEN session_id END)::int AS purchases
        FROM pixel_events
        WHERE created_at >= ${since}
          AND session_id IS NOT NULL
        GROUP BY utm_source
        HAVING count(DISTINCT session_id) > 0
        ORDER BY sessions DESC
        LIMIT 8
      `),

      // Average cart value at checkout start
      db.execute(sql`
        SELECT avg(cart_total::numeric)::float AS avg_val
        FROM pixel_events
        WHERE event_type = 'checkout_started'
          AND cart_total IS NOT NULL
          AND created_at >= ${since}
      `),
    ]);

    funnelMap = new Map(funnel.map((r) => [r.eventType, r.sessions]));
    topViewed = viewed.map((r) => ({ title: r.title!, count: r.count }));
    topCarted = carted.map((r) => ({ title: r.title!, count: r.count }));
    utmRows = utms;
    searchRows = searches.map((r) => ({ query: r.query!, count: r.count }));
    topPages = pages.filter((p) => p.url).map((p) => ({ url: p.url!, count: p.count }));
    abandonedProducts = (abandoned.rows as { product_title: string; ct: number }[])
      .map((r) => ({ title: r.product_title, count: r.ct }));

    hourlyActivity = (hourly.rows as { hr: number; ct: number }[])
      .map((r) => ({ hour: r.hr, count: r.ct }));

    const depths = (sessionDepths.rows as { evt_count: number }[]).map((r) => r.evt_count);
    avgDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
    bounceRate = depths.length > 0 ? (depths.filter((d) => d <= 1).length / depths.length) * 100 : 0;

    channelPerfData = (channelRows.rows as { src: string; sessions: number; carts: number; purchases: number }[]).map((r) => ({
      source: r.src,
      sessions: r.sessions,
      cartRate: r.sessions > 0 ? (r.carts / r.sessions) * 100 : 0,
      convRate: r.sessions > 0 ? (r.purchases / r.sessions) * 100 : 0,
    }));

    avgCartValue = (avgCartRows.rows as { avg_val: number | null }[])[0]?.avg_val ?? null;
  } catch {
    dbAvailable = false;
  }

  const funnelSteps = FUNNEL_STEPS.map((s) => ({
    ...s,
    sessions: funnelMap.get(s.key) ?? 0,
  }));

  const totalSessions = funnelSteps[0]?.sessions ?? 0;
  const addToCart = funnelSteps[2]?.sessions ?? 0;
  const checkoutStarted = funnelSteps[3]?.sessions ?? 0;
  const purchases = funnelSteps[4]?.sessions ?? 0;
  const convRate = totalSessions > 0 ? (purchases / totalSessions) * 100 : 0;
  const cartAbandonment = addToCart > 0 ? ((addToCart - purchases) / addToCart) * 100 : 0;
  const cartNoCheckout = Math.max(0, addToCart - checkoutStarted);
  const checkoutNoPurchase = Math.max(0, checkoutStarted - purchases);

  const peakHour = hourlyActivity.length > 0
    ? hourlyActivity.reduce((a, b) => (a.count >= b.count ? a : b))
    : null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

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

      {/* Session quality KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Profundidad sesión"
          value={avgDepth > 0 ? avgDepth.toFixed(1) : "—"}
          description="Eventos promedio / sesión"
          icon={<BarChart2 size={14} />}
          iconColor="#78695a"
        />
        <KpiCard
          title="Tasa de rebote"
          value={bounceRate > 0 ? `${bounceRate.toFixed(1)}%` : "—"}
          description="Sesiones con 1 solo evento"
          icon={<Zap size={14} />}
          iconColor={bounceRate >= 50 ? "#b43c28" : bounceRate >= 30 ? "#b07a30" : "#4f7a3e"}
          changePositive={bounceRate < 40}
          change={bounceRate >= 50 ? "Alta — revisar landing" : bounceRate < 20 ? "Excelente engagement" : undefined}
        />
        <KpiCard
          title="Carrito promedio"
          value={avgCartValue !== null ? fmt(avgCartValue) : "—"}
          description="Valor al iniciar checkout"
          icon={<ShoppingCart size={14} />}
          iconColor="#bb9a4c"
        />
        <KpiCard
          title="Hora pico"
          value={peakHour !== null ? `${peakHour.hour}:00` : "—"}
          description={peakHour !== null ? `${peakHour.count} eventos` : "Sin datos"}
          icon={<Clock size={14} />}
          iconColor="#4f7a3e"
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

      {/* Abandonment */}
      <SectionCard title={`Abandono de carrito · ${days}d`}>
        <AbandonmentSection
          cartNoCheckout={cartNoCheckout}
          checkoutNoPurchase={checkoutNoPurchase}
          products={abandonedProducts}
        />
      </SectionCard>

      {/* Hourly + Channel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title={`Actividad por hora · ${days}d · hora local MX`}>
          <HourlyActivity data={hourlyActivity} />
        </SectionCard>

        <SectionCard title={`Rendimiento por canal · ${days}d`}>
          <ChannelPerformance rows={channelPerfData} />
        </SectionCard>
      </div>

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
                  try {
                    const raw = new URL(p.url).pathname;
                    if (raw.startsWith("/checkouts/")) return "/checkouts/…";
                    if (raw.startsWith("/cart/")) return "/cart/…";
                    return raw;
                  } catch { return p.url; }
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
