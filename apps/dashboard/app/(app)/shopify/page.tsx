import { Suspense } from "react";
import { getShopifyStats } from "@/lib/shopify";
import { KpiCard } from "@/components/widgets/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OrdersChart } from "@/components/charts/orders-chart";
import { TopProducts } from "@/components/widgets/top-products";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, ShoppingCart, CreditCard, Users } from "lucide-react";

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

async function ShopifyContent() {
  "use cache";
  const stats = await getShopifyStats(30).catch(() => null);

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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Revenue 30d"
          value={fmt(stats.totalRevenue)}
          description="Pedidos pagados"
          icon={<DollarSign size={14} />}
          iconColor="#bb9a4c"
        />
        <KpiCard
          title="Pedidos 30d"
          value={stats.totalOrders.toString()}
          icon={<ShoppingCart size={14} />}
          iconColor="#4f7a3e"
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
          icon={<Users size={14} />}
          iconColor="#78695a"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SectionCard title="Revenue por día">
          <RevenueChart data={stats.revenueByDay} />
        </SectionCard>
        <SectionCard title="Pedidos por día">
          <OrdersChart data={stats.ordersByDay ?? []} />
        </SectionCard>
      </div>

      <TopProducts products={stats.topProducts} />
    </div>
  );
}

export default function ShopifyPage() {
  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 500, lineHeight: 1, letterSpacing: "-0.01em", color: "var(--foreground)" }}>Shopify</h1>
        <p className="text-[12px] text-muted-foreground mt-1">Últimos 30 días</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <ShopifyContent />
      </Suspense>
    </div>
  );
}
