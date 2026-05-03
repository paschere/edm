const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
const API_VERSION = "2024-01";

const base = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}`;

async function shopifyFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status} ${path}`);
  return res.json();
}

export interface ShopifyOrder {
  id: number;
  created_at: string;
  total_price: string;
  financial_status: string;
  line_items: { product_id: number; title: string; quantity: number; price: string }[];
}

export interface DailyMetric {
  date: string;
  value: number;
}

export interface TopProduct {
  id: number;
  title: string;
  revenue: number;
  quantity: number;
}

export interface ShopifyStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  revenueByDay: DailyMetric[];
  ordersByDay: DailyMetric[];
  topProducts: TopProduct[];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

export async function getShopifyStats(days = 30): Promise<ShopifyStats> {
  const since = daysAgo(days);

  const [ordersRes, customersRes] = await Promise.all([
    shopifyFetch<{ orders: ShopifyOrder[] }>(
      `/orders.json?created_at_min=${since}&status=any&limit=250&fields=id,created_at,total_price,financial_status,line_items`
    ),
    shopifyFetch<{ count: number }>(`/customers/count.json`),
  ]);

  const orders = ordersRes.orders;
  const paidOrders = orders.filter((o) => o.financial_status === "paid");

  const totalRevenue = paidOrders.reduce((s, o) => s + parseFloat(o.total_price), 0);
  const totalOrders = paidOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const revenueMap = new Map<string, number>();
  const ordersMap = new Map<string, number>();

  for (const o of paidOrders) {
    const date = formatDate(o.created_at);
    revenueMap.set(date, (revenueMap.get(date) ?? 0) + parseFloat(o.total_price));
    ordersMap.set(date, (ordersMap.get(date) ?? 0) + 1);
  }

  const productMap = new Map<number, TopProduct>();
  for (const o of paidOrders) {
    for (const item of o.line_items) {
      const existing = productMap.get(item.product_id) ?? {
        id: item.product_id,
        title: item.title,
        revenue: 0,
        quantity: 0,
      };
      existing.revenue += parseFloat(item.price) * item.quantity;
      existing.quantity += item.quantity;
      productMap.set(item.product_id, existing);
    }
  }

  const sortedDates = Array.from(
    new Set([...revenueMap.keys(), ...ordersMap.keys()])
  ).sort();

  return {
    totalRevenue,
    totalOrders,
    totalCustomers: customersRes.count,
    averageOrderValue,
    revenueByDay: sortedDates.map((date) => ({ date, value: revenueMap.get(date) ?? 0 })),
    ordersByDay: sortedDates.map((date) => ({ date, value: ordersMap.get(date) ?? 0 })),
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
  };
}
