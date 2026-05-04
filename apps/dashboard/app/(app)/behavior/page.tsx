import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { pixelEvents } from "@/lib/db/schema";
import { sql, gte, desc } from "drizzle-orm";
import { KpiCard } from "@/components/widgets/kpi-card";
import { FunnelBars } from "@/components/charts/funnel-bars";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, ShoppingCart, CheckCircle, Percent, TrendingDown } from "lucide-react";

const FUNNEL_EVENTS = [
  { name: "page_viewed", label: "Páginas vistas" },
  { name: "product_viewed", label: "Productos vistos" },
  { name: "product_added_to_cart", label: "Add to cart" },
  { name: "checkout_started", label: "Checkout iniciado" },
  { name: "checkout_completed", label: "Compras" },
];

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

async function BehaviorContent() {
  "use cache";
  let funnelData: { name: string; value: number; label: string }[] = [];
  let topPages: { url: string; count: number }[] = [];
  let recentEvents: {
    eventType: string;
    pageUrl: string | null;
    createdAt: Date | null;
  }[] = [];
  let dbAvailable = true;

  try {
    const db = getDb();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [counts, pages, recent] = await Promise.all([
      db
        .select({ eventType: pixelEvents.eventType, count: sql<number>`count(*)::int` })
        .from(pixelEvents)
        .where(gte(pixelEvents.createdAt, since))
        .groupBy(pixelEvents.eventType),
      db
        .select({ url: pixelEvents.pageUrl, count: sql<number>`count(*)::int` })
        .from(pixelEvents)
        .where(gte(pixelEvents.createdAt, since))
        .groupBy(pixelEvents.pageUrl)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
      db
        .select({
          eventType: pixelEvents.eventType,
          pageUrl: pixelEvents.pageUrl,
          createdAt: pixelEvents.createdAt,
        })
        .from(pixelEvents)
        .orderBy(desc(pixelEvents.createdAt))
        .limit(20),
    ]);

    const countMap = new Map(counts.map((c) => [c.eventType, c.count]));
    funnelData = FUNNEL_EVENTS.map(({ name, label }) => ({
      name,
      label,
      value: countMap.get(name) ?? 0,
    }));
    topPages = pages.filter((p) => p.url).map((p) => ({ url: p.url!, count: p.count }));
    recentEvents = recent;
  } catch {
    dbAvailable = false;
  }

  const totalSessions = funnelData[0]?.value ?? 0;
  const addToCart = funnelData[2]?.value ?? 0;
  const checkoutStarted = funnelData[3]?.value ?? 0;
  const purchases = funnelData[4]?.value ?? 0;
  const convRate = totalSessions > 0 ? ((purchases / totalSessions) * 100).toFixed(2) : "0.00";
  const abandonRate =
    addToCart > 0 ? (((addToCart - purchases) / addToCart) * 100).toFixed(1) : "—";

  const EVENT_COLORS: Record<string, string> = {
    page_viewed: "#bb9a4c",
    product_viewed: "#b07a30",
    product_added_to_cart: "#c8a85e",
    checkout_started: "#7a9a5a",
    checkout_completed: "#4f7a3e",
  };

  return (
    <div className="space-y-5">
      {!dbAvailable && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-[13px] text-amber-400">
          Base de datos no disponible. Configura DATABASE_URL para ver datos del Web Pixel.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard
          title="Páginas vistas 30d"
          value={totalSessions.toLocaleString("es-MX")}
          icon={<Eye size={14} />}
          iconColor="#bb9a4c"
        />
        <KpiCard
          title="Add to carts 30d"
          value={addToCart.toLocaleString("es-MX")}
          icon={<ShoppingCart size={14} />}
          iconColor="#b07a30"
        />
        <KpiCard
          title="Compras 30d"
          value={purchases.toLocaleString("es-MX")}
          icon={<CheckCircle size={14} />}
          iconColor="#4f7a3e"
        />
        <KpiCard
          title="Tasa conversión"
          value={`${convRate}%`}
          icon={<Percent size={14} />}
          iconColor="#78695a"
        />
        <KpiCard
          title="Abandono carrito"
          value={abandonRate === "—" ? "—" : `${abandonRate}%`}
          description="Cart → no compra"
          change={abandonRate !== "—" ? `${abandonRate}%` : undefined}
          changePositive={false}
          icon={<TrendingDown size={14} />}
          iconColor="#b43c28"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SectionCard title="Funnel de conversión 30d">
          <FunnelBars data={funnelData} />
        </SectionCard>

        <SectionCard title="Páginas más visitadas 30d">
          {topPages.length > 0 ? (
            <div className="space-y-2">
              {topPages.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] text-muted-foreground max-w-[75%]">
                    {p.url}
                  </span>
                  <span className="metric text-[12px] font-semibold tabular-nums text-foreground shrink-0">
                    {p.count.toLocaleString("es-MX")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos aún</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Eventos recientes">
        {recentEvents.length > 0 ? (
          <div className="space-y-1.5">
            {recentEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-mono shrink-0 font-medium"
                  style={{
                    background: `color-mix(in oklch, ${EVENT_COLORS[e.eventType] ?? "oklch(0.5 0 0)"} 12%, transparent)`,
                    color: EVENT_COLORS[e.eventType] ?? "oklch(0.5 0 0)",
                    border: `1px solid color-mix(in oklch, ${EVENT_COLORS[e.eventType] ?? "oklch(0.5 0 0)"} 25%, transparent)`,
                  }}
                >
                  {e.eventType}
                </span>
                <span className="truncate text-[12px] text-muted-foreground flex-1">
                  {e.pageUrl ?? "—"}
                </span>
                <span className="metric text-[11px] text-muted-foreground tabular-nums shrink-0">
                  {e.createdAt ? new Date(e.createdAt).toLocaleTimeString("es-MX") : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin eventos recientes</p>
        )}
      </SectionCard>
    </div>
  );
}

export default function BehaviorPage() {
  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 500, lineHeight: 1, letterSpacing: "-0.01em", color: "var(--foreground)" }}>Comportamiento</h1>
        <p className="text-[12px] text-muted-foreground mt-1">Web Pixel · Últimos 30 días</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <BehaviorContent />
      </Suspense>
    </div>
  );
}
