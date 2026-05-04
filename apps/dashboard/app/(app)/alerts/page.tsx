import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { getInventoryData } from "@/lib/shopify";
import { getMetaStats } from "@/lib/meta";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { gte, isNull, lte, sql } from "drizzle-orm";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, XCircle, CheckCircle, Info, Package, ShoppingBag, TrendingUp, Activity } from "lucide-react";

type Severity = "critical" | "warning" | "ok" | "info";
type Category = "inventario" | "pedidos" | "marketing" | "conversión";

interface Alert {
  id: string;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  value?: string;
  hint?: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2, ok: 3 };

const CATEGORY_ICON: Record<Category, React.ReactNode> = {
  inventario: <Package size={13} />,
  pedidos:    <ShoppingBag size={13} />,
  marketing:  <TrendingUp size={13} />,
  conversión: <Activity size={13} />,
};

const SEVERITY_STYLE: Record<Severity, { icon: React.ReactNode; color: string; bg: string; border: string; label: string }> = {
  critical: { icon: <XCircle size={14} />,       color: "#b43c28", bg: "rgba(180,60,40,0.07)",  border: "rgba(180,60,40,0.18)",  label: "Crítico" },
  warning:  { icon: <AlertTriangle size={14} />, color: "#b07a30", bg: "rgba(176,122,48,0.07)", border: "rgba(176,122,48,0.18)", label: "Aviso" },
  info:     { icon: <Info size={14} />,           color: "#bb9a4c", bg: "rgba(187,154,76,0.07)", border: "rgba(187,154,76,0.18)", label: "Info" },
  ok:       { icon: <CheckCircle size={14} />,    color: "#4f7a3e", bg: "rgba(79,122,62,0.07)",  border: "rgba(79,122,62,0.18)",  label: "OK" },
};

function AlertCard({ alert }: { alert: Alert }) {
  const s = SEVERITY_STYLE[alert.severity];
  const catIcon = CATEGORY_ICON[alert.category];
  return (
    <div
      className="flex items-start gap-4 rounded-xl p-4"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      {/* Severity icon */}
      <div className="shrink-0 mt-0.5" style={{ color: s.color }}>{s.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full"
            style={{ color: s.color, background: `${s.color}18` }}
          >
            {s.label}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full"
            style={{ color: "var(--muted-foreground)", background: "rgba(11,8,5,0.06)" }}
          >
            {catIcon}
            {alert.category}
          </span>
        </div>
        <p className="text-[13px] font-medium text-foreground">{alert.title}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{alert.description}</p>
        {alert.hint && (
          <p className="text-[10px] mt-1.5 font-medium italic" style={{ color: s.color, opacity: 0.8 }}>
            → {alert.hint}
          </p>
        )}
      </div>

      {/* Value */}
      {alert.value && (
        <div className="shrink-0 text-right">
          <span
            className="text-[1.2rem] font-semibold tabular-nums"
            style={{ fontFamily: "var(--font-display)", color: s.color, letterSpacing: "-0.02em" }}
          >
            {alert.value}
          </span>
        </div>
      )}
    </div>
  );
}

async function AlertsContent() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 120 });

  const alerts: Alert[] = [];

  // ── Inventario ───────────────────────────────────────────────────────────────
  try {
    const inventory = await getInventoryData();
    const outOfStock = inventory.filter((i) => i.inventoryQuantity <= 0);
    const lowStock = inventory.filter((i) => i.inventoryQuantity > 0 && i.inventoryQuantity <= 5);

    for (const item of outOfStock.slice(0, 6)) {
      alerts.push({
        id: `stock-out-${item.variantId}`,
        severity: "critical",
        category: "inventario",
        title: `Agotado: ${item.productTitle}${item.variantTitle ? ` — ${item.variantTitle}` : ""}`,
        description: "Sin stock disponible. Las ventas de este producto están bloqueadas.",
        value: "0 uds",
        hint: "Reabastecer con urgencia",
      });
    }
    if (outOfStock.length > 6) {
      alerts.push({
        id: "stock-out-more",
        severity: "critical",
        category: "inventario",
        title: `${outOfStock.length - 6} productos más agotados`,
        description: "Revisa el módulo de Inventario para ver la lista completa.",
        hint: "Ir a Inventario",
      });
    }

    for (const item of lowStock.slice(0, 5)) {
      alerts.push({
        id: `stock-low-${item.variantId}`,
        severity: "warning",
        category: "inventario",
        title: `Stock bajo: ${item.productTitle}${item.variantTitle ? ` — ${item.variantTitle}` : ""}`,
        description: "Menos de 5 unidades disponibles.",
        value: `${item.inventoryQuantity} uds`,
        hint: "Planear reabastecimiento",
      });
    }

    if (outOfStock.length === 0 && lowStock.length === 0) {
      alerts.push({
        id: "stock-ok",
        severity: "ok",
        category: "inventario",
        title: "Inventario saludable",
        description: `Todos los SKUs tienen más de 5 unidades disponibles (${inventory.length} SKUs activos).`,
      });
    }
  } catch {
    alerts.push({
      id: "inventory-error",
      severity: "info",
      category: "inventario",
      title: "No se pudo verificar inventario",
      description: "Revisa las credenciales de Shopify.",
    });
  }

  // ── Pedidos (DB) ─────────────────────────────────────────────────────────────
  try {
    const db = getDb();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [staleRows, bigOrderRows, recentOrderRows] = await Promise.all([
      // Unfulfilled orders older than 2 days
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(
          sql`${orders.fulfillmentStatus} IS NULL AND ${orders.financialStatus} = 'paid' AND ${orders.shopifyCreatedAt} <= ${twoDaysAgo}`
        ),

      // High-value orders (>= $2000 MXN) in last 7 days
      db
        .select({
          orderNumber: orders.orderNumber,
          totalPrice: orders.totalPrice,
          firstName: orders.firstName,
          lastName: orders.lastName,
        })
        .from(orders)
        .where(
          sql`${orders.shopifyCreatedAt} >= ${sevenDaysAgo} AND ${orders.totalPrice}::numeric >= 2000`
        )
        .limit(3),

      // Orders in last 24h
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(gte(orders.shopifyCreatedAt, yesterday)),
    ]);

    const staleCount = staleRows[0]?.count ?? 0;
    if (staleCount >= 5) {
      alerts.push({
        id: "orders-stale",
        severity: "critical",
        category: "pedidos",
        title: `${staleCount} pedidos pagados sin enviar hace +2 días`,
        description: "Clientes con pago acreditado esperando el envío de su pedido.",
        value: `${staleCount}`,
        hint: "Ir a Órdenes y filtrar por estado",
      });
    } else if (staleCount > 0) {
      alerts.push({
        id: "orders-stale",
        severity: "warning",
        category: "pedidos",
        title: `${staleCount} pedido${staleCount > 1 ? "s" : ""} pagado${staleCount > 1 ? "s" : ""} sin enviar hace +2 días`,
        description: "Revisar para no afectar la experiencia del cliente.",
        value: `${staleCount}`,
        hint: "Ir a Órdenes",
      });
    }

    for (const o of bigOrderRows) {
      const name = [o.firstName, o.lastName].filter(Boolean).join(" ") || "Cliente";
      alerts.push({
        id: `big-order-${o.orderNumber}`,
        severity: "info",
        category: "pedidos",
        title: `Pedido grande #${o.orderNumber} — ${name}`,
        description: "Pedido de alto valor recibido en los últimos 7 días.",
        value: new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Number(o.totalPrice ?? 0)),
        hint: "Verificar y priorizar envío",
      });
    }

    const recentCount = recentOrderRows[0]?.count ?? 0;
    if (recentCount === 0) {
      alerts.push({
        id: "orders-none-today",
        severity: "warning",
        category: "pedidos",
        title: "Sin pedidos en las últimas 24 horas",
        description: "Inusual si la tienda tiene flujo normal. Puede indicar un problema técnico.",
        hint: "Verificar estado del checkout en Shopify",
      });
    }
  } catch {
    /* orders DB not configured yet — skip silently */
  }

  // ── Marketing (Meta) ─────────────────────────────────────────────────────────
  try {
    const meta = await getMetaStats(7);

    if (meta.totalSpend > 0) {
      if (meta.totalRoas < 1) {
        alerts.push({
          id: "meta-roas-negative",
          severity: "critical",
          category: "marketing",
          title: `ROAS Meta por debajo de 1x — perdiendo dinero en ads`,
          description: `Estás gastando ${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(meta.totalSpend)} y recuperando menos de lo invertido según Meta.`,
          value: `${meta.totalRoas.toFixed(2)}x`,
          hint: "Pausar campañas con peor rendimiento",
        });
      } else if (meta.totalRoas < 1.8) {
        alerts.push({
          id: "meta-roas-low",
          severity: "warning",
          category: "marketing",
          title: "ROAS Meta bajo el objetivo de 2x",
          description: "El retorno de publicidad está por debajo del umbral rentable. Revisar segmentación y creativos.",
          value: `${meta.totalRoas.toFixed(2)}x`,
          hint: "Optimizar audiencias y creativos",
        });
      } else {
        alerts.push({
          id: "meta-roas-ok",
          severity: "ok",
          category: "marketing",
          title: "ROAS Meta en rango saludable",
          description: "Las campañas están generando retorno sobre la inversión.",
          value: `${meta.totalRoas.toFixed(2)}x`,
        });
      }

      if (meta.avgFrequency > 3.5) {
        alerts.push({
          id: "meta-frequency",
          severity: "warning",
          category: "marketing",
          title: "Fatiga de anuncio detectada",
          description: `Frecuencia promedio de ${meta.avgFrequency.toFixed(1)}x — la misma audiencia está viendo los anuncios demasiadas veces.`,
          value: `${meta.avgFrequency.toFixed(1)}x`,
          hint: "Renovar creativos o ampliar audiencia",
        });
      }
    } else {
      alerts.push({
        id: "meta-no-spend",
        severity: "info",
        category: "marketing",
        title: "Sin gasto activo en Meta esta semana",
        description: "No se detectó gasto en campañas de Meta en los últimos 7 días.",
      });
    }
  } catch {
    /* Meta not configured */
  }

  // ── Conversión (Pixel) ───────────────────────────────────────────────────────
  try {
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [convRows] = await Promise.all([
      db.execute(sql`
        SELECT
          count(DISTINCT CASE WHEN event_type = 'page_viewed' THEN session_id END)::int AS sessions,
          count(DISTINCT CASE WHEN event_type = 'checkout_completed' THEN session_id END)::int AS purchases
        FROM pixel_events
        WHERE created_at >= ${sevenDaysAgo} AND session_id IS NOT NULL
      `),
    ]);

    const row = convRows.rows[0] as { sessions: number; purchases: number } | undefined;
    if (row && row.sessions > 50) {
      const convRate = row.sessions > 0 ? (row.purchases / row.sessions) * 100 : 0;
      if (convRate < 0.5) {
        alerts.push({
          id: "conv-critical",
          severity: "critical",
          category: "conversión",
          title: "Tasa de conversión crítica (<0.5%)",
          description: `Solo ${row.purchases} compras de ${row.sessions.toLocaleString()} sesiones en los últimos 7 días. Algo está frenando el checkout.`,
          value: `${convRate.toFixed(2)}%`,
          hint: "Revisar el funnel en Comportamiento",
        });
      } else if (convRate < 1.5) {
        alerts.push({
          id: "conv-low",
          severity: "warning",
          category: "conversión",
          title: "Tasa de conversión mejorable",
          description: `${convRate.toFixed(2)}% de las sesiones terminan en compra. El promedio e-commerce MX es ~2%.`,
          value: `${convRate.toFixed(2)}%`,
          hint: "Analizar abandono en Comportamiento",
        });
      } else {
        alerts.push({
          id: "conv-ok",
          severity: "ok",
          category: "conversión",
          title: "Tasa de conversión saludable",
          description: `${convRate.toFixed(2)}% de las sesiones terminan en compra — por encima del promedio.`,
          value: `${convRate.toFixed(2)}%`,
        });
      }
    }
  } catch {
    /* pixel DB not configured */
  }

  // Sort: critical → warning → info → ok
  alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warning  = alerts.filter((a) => a.severity === "warning").length;
  const ok       = alerts.filter((a) => a.severity === "ok").length;

  return (
    <div className="space-y-4">
      {/* Summary pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: critical > 0 ? "rgba(180,60,40,0.1)" : "rgba(11,8,5,0.04)", border: `1px solid ${critical > 0 ? "rgba(180,60,40,0.2)" : "var(--border)"}` }}
        >
          <XCircle size={13} style={{ color: critical > 0 ? "#b43c28" : "var(--muted-foreground)" }} />
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: critical > 0 ? "#b43c28" : "var(--muted-foreground)" }}>
            {critical} crítico{critical !== 1 ? "s" : ""}
          </span>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: warning > 0 ? "rgba(176,122,48,0.08)" : "rgba(11,8,5,0.04)", border: `1px solid ${warning > 0 ? "rgba(176,122,48,0.18)" : "var(--border)"}` }}
        >
          <AlertTriangle size={13} style={{ color: warning > 0 ? "#b07a30" : "var(--muted-foreground)" }} />
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: warning > 0 ? "#b07a30" : "var(--muted-foreground)" }}>
            {warning} aviso{warning !== 1 ? "s" : ""}
          </span>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "rgba(79,122,62,0.08)", border: "1px solid rgba(79,122,62,0.18)" }}
        >
          <CheckCircle size={13} style={{ color: "#4f7a3e" }} />
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: "#4f7a3e" }}>
            {ok} OK
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground ml-auto">
          Actualiza cada minuto
        </span>
      </div>

      {/* Alert list */}
      <div className="space-y-2.5">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
        {alerts.length === 0 && (
          <div className="py-16 text-center">
            <CheckCircle size={32} className="mx-auto mb-3" style={{ color: "#4f7a3e", opacity: 0.5 }} />
            <p className="text-[14px] font-medium" style={{ color: "#4f7a3e" }}>Todo en orden</p>
            <p className="text-[12px] text-muted-foreground mt-1">No hay alertas activas en este momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <div className="p-6 max-w-4xl">
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
          Centro de Alertas
        </h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          Stock · Pedidos · Meta · Conversión — lo que necesita atención ahora
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <AlertsContent />
      </Suspense>
    </div>
  );
}
