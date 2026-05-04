import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { desc, gte, and, sql } from "drizzle-orm";
import { KpiCard } from "@/components/widgets/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/widgets/period-selector";
import { ShoppingBag, DollarSign, Package, Clock } from "lucide-react";

// ─── Status badges ────────────────────────────────────────────────────────────
function FinancialBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    paid:        { label: "Pagado",      color: "#4f7a3e", bg: "rgba(79,122,62,0.1)",   border: "rgba(79,122,62,0.25)" },
    pending:     { label: "Pendiente",   color: "#b07a30", bg: "rgba(176,122,48,0.1)",  border: "rgba(176,122,48,0.25)" },
    authorized:  { label: "Autorizado",  color: "#bb9a4c", bg: "rgba(187,154,76,0.1)",  border: "rgba(187,154,76,0.25)" },
    refunded:    { label: "Reembolsado", color: "#b43c28", bg: "rgba(180,60,40,0.1)",   border: "rgba(180,60,40,0.25)" },
    voided:      { label: "Cancelado",   color: "#78695a", bg: "rgba(120,105,90,0.1)",  border: "rgba(120,105,90,0.25)" },
    partially_refunded: { label: "Parcial", color: "#b07a30", bg: "rgba(176,122,48,0.1)", border: "rgba(176,122,48,0.25)" },
  };
  const s = map[status ?? ""] ?? { label: status ?? "—", color: "#78695a", bg: "rgba(120,105,90,0.08)", border: "rgba(120,105,90,0.2)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

function FulfillmentBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "#b07a30", background: "rgba(176,122,48,0.08)", border: "1px solid rgba(176,122,48,0.2)" }}>
        Sin enviar
      </span>
    );
  }
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    fulfilled:         { label: "Enviado",   color: "#4f7a3e", bg: "rgba(79,122,62,0.1)",  border: "rgba(79,122,62,0.25)" },
    partial:           { label: "Parcial",   color: "#bb9a4c", bg: "rgba(187,154,76,0.1)", border: "rgba(187,154,76,0.25)" },
    restocked:         { label: "Restock",   color: "#78695a", bg: "rgba(120,105,90,0.1)", border: "rgba(120,105,90,0.25)" },
  };
  const s = map[status] ?? { label: status, color: "#78695a", bg: "rgba(120,105,90,0.08)", border: "rgba(120,105,90,0.2)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

// ─── Geographic map ───────────────────────────────────────────────────────────
function GeoMap({ rows }: { rows: { province: string; orderCount: number; revenue: number }[] }) {
  if (!rows.length) return <p className="text-[13px] text-muted-foreground">Sin datos de dirección de envío aún</p>;
  const maxCount = rows[0]?.orderCount ?? 1;
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        const pct = (r.orderCount / maxCount) * 100;
        return (
          <div key={r.province}>
            <div className="flex items-baseline justify-between mb-1 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-medium text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                <span className="text-[12px] font-medium text-foreground truncate">{r.province || "Sin especificar"}</span>
              </div>
              <div className="flex items-baseline gap-3 shrink-0">
                <span className="text-[11px] text-muted-foreground tabular-nums">{r.orderCount} pedidos</span>
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: "#bb9a4c" }}>{fmt(r.revenue)}</span>
              </div>
            </div>
            <div style={{ height: "5px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: `rgba(187,154,76,${0.35 + (pct / 100) * 0.45})`, borderRadius: "3px" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Line items summary ───────────────────────────────────────────────────────
function LineItemsSummary({ items }: { items: unknown }) {
  if (!Array.isArray(items) || !items.length) return <span className="text-[12px] text-muted-foreground">—</span>;

  const first = items[0] as { title?: string; quantity?: number };
  const rest = items.length - 1;
  return (
    <span className="text-[12px] text-foreground">
      {first.title ?? "Producto"}
      {first.quantity && first.quantity > 1 ? ` ×${first.quantity}` : ""}
      {rest > 0 && (
        <span className="text-muted-foreground ml-1">+{rest} más</span>
      )}
    </span>
  );
}

// ─── Data + UI ────────────────────────────────────────────────────────────────
async function OrdersContent({ days }: { days: number }) {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 60 });

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let rows: typeof orders.$inferSelect[] = [];
  let geoRows: { province: string; orderCount: number; revenue: number }[] = [];
  let totalRevenue = 0;
  let avgOrderValue = 0;
  let pendingCount = 0;
  let dbAvailable = true;

  try {
    const db = getDb();
    const [ordersResult, geoResult] = await Promise.all([
      db.select().from(orders).where(gte(orders.createdAt, since)).orderBy(desc(orders.shopifyCreatedAt)).limit(100),
      db.execute(sql`
        SELECT
          shipping_address->>'province' AS province,
          count(*)::int AS order_count,
          sum(total_price::numeric)::float AS revenue
        FROM ${orders}
        WHERE created_at >= ${since}
          AND shipping_address IS NOT NULL
          AND shipping_address->>'province' IS NOT NULL
        GROUP BY province
        ORDER BY order_count DESC
        LIMIT 15
      `).catch(() => ({ rows: [] })),
    ]);
    rows = ordersResult;
    geoRows = (geoResult.rows as { province: string; order_count: number; revenue: number }[]).map((r) => ({
      province: r.province,
      orderCount: r.order_count,
      revenue: r.revenue,
    }));

    totalRevenue = ordersResult
      .filter((r) => r.financialStatus === "paid")
      .reduce((acc, r) => acc + Number(r.totalPrice ?? 0), 0);

    avgOrderValue = rows.length > 0 ? rows.reduce((a, r) => a + Number(r.totalPrice ?? 0), 0) / rows.length : 0;
    pendingCount = rows.filter((r) => !r.fulfillmentStatus).length;
  } catch {
    dbAvailable = false;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

  const fmtDate = (d: Date | null) => {
    if (!d) return "—";
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(d));
  };

  return (
    <div className="space-y-4">
      {!dbAvailable && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-[13px] text-amber-400">
          Base de datos no disponible. Configura DATABASE_URL para ver órdenes.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title={`Pedidos ${days}d`}
          value={rows.length.toLocaleString("es-MX")}
          description="Recibidos en el período"
          icon={<ShoppingBag size={14} />}
          iconColor="#bb9a4c"
        />
        <KpiCard
          title="Revenue (pagados)"
          value={fmt(totalRevenue)}
          description="Solo órdenes pagadas"
          icon={<DollarSign size={14} />}
          iconColor="#4f7a3e"
        />
        <KpiCard
          title="Ticket promedio"
          value={rows.length > 0 ? fmt(avgOrderValue) : "—"}
          description="Todos los estados"
          icon={<DollarSign size={14} />}
          iconColor="#b07a30"
        />
        <KpiCard
          title="Sin enviar"
          value={pendingCount.toLocaleString("es-MX")}
          description="Pendientes de fulfillment"
          icon={<Package size={14} />}
          iconColor={pendingCount > 0 ? "#b43c28" : "#4f7a3e"}
          change={pendingCount > 0 ? "Requieren acción" : undefined}
          changePositive={false}
        />
      </div>

      {/* Orders table */}
      <div
        className="rounded-xl border border-border"
        style={{ background: "var(--card)", boxShadow: "0 1px 3px rgba(11,8,5,0.05)" }}
      >
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Órdenes · {days}d
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag size={28} className="mx-auto mb-3 opacity-20" />
            <p className="text-[13px] text-muted-foreground">Sin pedidos en este período.</p>
            <p className="text-[11px] text-muted-foreground mt-1 opacity-60">
              Configura el webhook en Shopify para empezar a recibir órdenes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Pedido", "Fecha", "Cliente", "Productos", "Total", "Pago", "Envío"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr
                    key={order.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid rgba(11,8,5,0.05)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(187,154,76,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "";
                    }}
                  >
                    <td className="px-5 py-3">
                      <span
                        className="text-[13px] font-semibold tabular-nums"
                        style={{ fontFamily: "var(--font-display)", color: "#bb9a4c", letterSpacing: "-0.01em" }}
                      >
                        #{order.orderNumber}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} className="opacity-40 shrink-0" />
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {fmtDate(order.shopifyCreatedAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-[12px] font-medium text-foreground">
                          {[order.firstName, order.lastName].filter(Boolean).join(" ") || "—"}
                        </p>
                        {order.email && (
                          <p className="text-[10px] text-muted-foreground">{order.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 max-w-[200px]">
                      <LineItemsSummary items={order.lineItems} />
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="text-[13px] font-semibold tabular-nums"
                        style={{ fontFamily: "var(--font-display)", color: "var(--foreground)", letterSpacing: "-0.02em" }}
                      >
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: order.currency ?? "MXN",
                          maximumFractionDigits: 0,
                        }).format(Number(order.totalPrice ?? 0))}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <FinancialBadge status={order.financialStatus} />
                    </td>
                    <td className="px-5 py-3">
                      <FulfillmentBadge status={order.fulfillmentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Geographic map */}
      {geoRows.length > 0 && (
        <div
          className="rounded-xl border border-border p-5"
          style={{ background: "var(--card)", boxShadow: "0 1px 3px rgba(11,8,5,0.05)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
            Distribución geográfica · {days}d — por estado de envío
          </p>
          <GeoMap rows={geoRows} />
        </div>
      )}

      {/* Setup instructions */}
      {rows.length === 0 && dbAvailable && (
        <div
          className="rounded-xl border border-border p-5 space-y-3"
          style={{ background: "var(--card)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Configuración del webhook
          </p>
          <p className="text-[13px] text-foreground">
            Para recibir pedidos, registra el webhook en Shopify Admin:
          </p>
          <ol className="space-y-2 text-[12px] text-muted-foreground list-decimal list-inside">
            <li>
              Ve a <strong className="text-foreground">Shopify Admin → Settings → Notifications → Webhooks</strong>
            </li>
            <li>
              Crea webhooks para: <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">orders/create</code>,{" "}
              <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">orders/updated</code>,{" "}
              <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">orders/paid</code>,{" "}
              <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">orders/fulfilled</code>,{" "}
              <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">orders/cancelled</code>
            </li>
            <li>
              URL del webhook:{" "}
              <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-foreground">
                https://edmco.vercel.app/api/webhooks/shopify
              </code>
            </li>
            <li>
              Copia el <strong className="text-foreground">Signing Secret</strong> y agrégalo como{" "}
              <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">SHOPIFY_WEBHOOK_SECRET</code> en Vercel
            </li>
            <li>
              Agrega <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">RESEND_API_KEY</code> e{" "}
              <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">INTERNAL_NOTIFICATION_EMAIL</code> en Vercel
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

async function OrdersContentWrapper({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: d } = await searchParams;
  const days = [7, 30, 90].includes(Number(d)) ? Number(d) : 30;
  return <OrdersContent days={days} />;
}

export default function OrdersPage({
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
            Órdenes
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            Pedidos · Estado de pago y envío · Registro para integraciones
          </p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <OrdersContentWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
