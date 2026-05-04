import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { getInventoryData } from "@/lib/shopify";
import type { InventoryItem } from "@/lib/shopify";
import { KpiCard } from "@/components/widgets/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertTriangle, XCircle, CheckCircle } from "lucide-react";

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

function StockBadge({ qty }: { qty: number }) {
  if (qty <= 0) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
        style={{ background: "rgba(180,60,40,0.1)", color: "#b43c28", border: "1px solid rgba(180,60,40,0.2)" }}
      >
        <XCircle size={9} />
        Agotado
      </span>
    );
  }
  if (qty <= 5) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
        style={{ background: "rgba(176,122,48,0.1)", color: "#b07a30", border: "1px solid rgba(176,122,48,0.2)" }}
      >
        <AlertTriangle size={9} />
        Stock bajo
      </span>
    );
  }
  return null;
}

function InventoryRow({ item }: { item: InventoryItem }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  const isOut = item.inventoryQuantity <= 0;
  const isLow = item.inventoryQuantity > 0 && item.inventoryQuantity <= 5;
  const qtyColor = isOut ? "#b43c28" : isLow ? "#b07a30" : "#4f7a3e";

  return (
    <tr style={{ borderBottom: "1px solid rgba(11,8,5,0.05)" }}>
      <td className="py-2.5 pr-3">
        <div>
          <p className="text-[12px] font-medium text-foreground leading-tight">
            {item.productTitle}
          </p>
          {item.variantTitle && (
            <p className="text-[10px] text-muted-foreground">{item.variantTitle}</p>
          )}
        </div>
      </td>
      <td className="py-2.5 pr-3">
        <span className="font-mono text-[11px] text-muted-foreground">
          {item.sku || "—"}
        </span>
      </td>
      <td className="py-2.5 pr-3 text-right">
        <span className="text-[12px] text-muted-foreground">{fmt(item.price)}</span>
      </td>
      <td className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <StockBadge qty={item.inventoryQuantity} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.1rem",
              fontWeight: 500,
              color: qtyColor,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {item.inventoryQuantity}
          </span>
        </div>
      </td>
    </tr>
  );
}

function InventoryAlertsList({ items }: { items: InventoryItem[] }) {
  const alerts = items.filter((i) => i.inventoryQuantity <= 5);
  if (!alerts.length) {
    return (
      <div className="flex items-center gap-2 py-2">
        <CheckCircle size={14} style={{ color: "#4f7a3e" }} />
        <p className="text-[13px]" style={{ color: "#4f7a3e" }}>
          Todo el inventario está bien abastecido
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {alerts.map((item) => (
        <div
          key={item.variantId}
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{
            background: item.inventoryQuantity <= 0
              ? "rgba(180,60,40,0.06)"
              : "rgba(176,122,48,0.06)",
            border: `1px solid ${item.inventoryQuantity <= 0 ? "rgba(180,60,40,0.15)" : "rgba(176,122,48,0.15)"}`,
          }}
        >
          <div>
            <p className="text-[12px] font-medium text-foreground">{item.productTitle}</p>
            {item.variantTitle && (
              <p className="text-[10px] text-muted-foreground">{item.variantTitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StockBadge qty={item.inventoryQuantity} />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.2rem",
                fontWeight: 500,
                color: item.inventoryQuantity <= 0 ? "#b43c28" : "#b07a30",
                letterSpacing: "-0.02em",
              }}
            >
              {item.inventoryQuantity}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

async function InventoryContent() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 60 });
  const items = await getInventoryData().catch(() => null);

  if (!items) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        No se pudieron cargar los datos de inventario. Verifica las variables de entorno.
      </div>
    );
  }

  const totalSKUs = items.length;
  const outOfStock = items.filter((i) => i.inventoryQuantity <= 0).length;
  const lowStock = items.filter((i) => i.inventoryQuantity > 0 && i.inventoryQuantity <= 5).length;
  const healthy = totalSKUs - outOfStock - lowStock;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="SKUs activos"
          value={totalSKUs.toLocaleString("es-MX")}
          description="Variantes en catálogo"
          icon={<Package size={14} />}
          iconColor="#78695a"
        />
        <KpiCard
          title="Con buen stock"
          value={healthy.toLocaleString("es-MX")}
          description="> 5 unidades"
          icon={<CheckCircle size={14} />}
          iconColor="#4f7a3e"
        />
        <KpiCard
          title="Stock bajo"
          value={lowStock.toLocaleString("es-MX")}
          description="1 – 5 unidades"
          change={lowStock > 0 ? "Reabastecer pronto" : undefined}
          changePositive={false}
          icon={<AlertTriangle size={14} />}
          iconColor={lowStock > 0 ? "#b07a30" : "#78695a"}
        />
        <KpiCard
          title="Agotados"
          value={outOfStock.toLocaleString("es-MX")}
          description="Sin stock"
          change={outOfStock > 0 ? "Acción requerida" : undefined}
          changePositive={false}
          icon={<XCircle size={14} />}
          iconColor={outOfStock > 0 ? "#b43c28" : "#78695a"}
        />
      </div>

      {/* Alerts */}
      <SectionCard title="Alertas de stock">
        <InventoryAlertsList items={items} />
      </SectionCard>

      {/* Full inventory table */}
      <SectionCard title={`Inventario completo · ${totalSKUs} SKUs`}>
        {items.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Sin productos activos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(11,8,5,0.1)" }}>
                  <th className="text-left pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Producto</th>
                  <th className="text-left pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">SKU</th>
                  <th className="text-right pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Precio</th>
                  <th className="text-right pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Stock</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <InventoryRow key={item.variantId} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <div className="p-6 max-w-7xl">
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
          Inventario
        </h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          Stock por SKU · Alertas de reabastecimiento
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <InventoryContent />
      </Suspense>
    </div>
  );
}
