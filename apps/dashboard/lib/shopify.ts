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
  fulfillment_status: string | null;
  customer?: { id: number; orders_count: number };
  shipping_address?: { province: string; province_code: string };
  line_items: {
    product_id: number;
    title: string;
    quantity: number;
    price: string;
    vendor?: string;
    product_type?: string;
  }[];
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

export interface ProvinceMetric {
  province: string;
  count: number;
  revenue: number;
}

export interface StatusBreakdown {
  fulfilled: number;
  unfulfilled: number;
  partial: number;
  paid: number;
  pending: number;
  refunded: number;
}

export interface ProductTypeMetric {
  type: string;
  revenue: number;
  count: number;
}

export interface ShopifyStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  revenueByDay: DailyMetric[];
  ordersByDay: DailyMetric[];
  topProducts: TopProduct[];
  // Enriched analytics
  heatmap: number[][]; // [dow 0=Sun..6=Sat][hour 0-23]
  newCustomers: number;
  returningCustomers: number;
  ordersByProvince: ProvinceMetric[];
  statusBreakdown: StatusBreakdown;
  byProductType: ProductTypeMetric[];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

// Extract local hour/dow from an ISO timestamp that includes offset (e.g. "-06:00")
function parseLocalTime(isoString: string): { hour: number; dow: number } {
  const utcMs = new Date(isoString).getTime();
  const offsetMatch = isoString.match(/([+-])(\d{2}):(\d{2})$/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === "+" ? 1 : -1;
    const offsetMs =
      sign *
      (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3])) *
      60000;
    const local = new Date(utcMs + offsetMs);
    return { hour: local.getUTCHours(), dow: local.getUTCDay() };
  }
  const d = new Date(isoString);
  return { hour: d.getUTCHours(), dow: d.getUTCDay() };
}

export async function getShopifyStats(days = 30): Promise<ShopifyStats> {
  const since = daysAgo(days);

  const [ordersRes, customersRes, newCustomersRes] = await Promise.all([
    shopifyFetch<{ orders: ShopifyOrder[] }>(
      `/orders.json?created_at_min=${since}&status=any&limit=250&fields=id,created_at,total_price,financial_status,fulfillment_status,customer,shipping_address,line_items`
    ),
    shopifyFetch<{ count: number }>(`/customers/count.json`),
    // Customers created in the period = "new customers acquired"
    shopifyFetch<{ customers: { id: number }[] }>(
      `/customers.json?created_at_min=${since}&limit=250&fields=id`
    ),
  ]);

  const orders = ordersRes.orders;
  const paidOrders = orders.filter((o) => o.financial_status === "paid");
  const newCustomerIds = new Set(newCustomersRes.customers.map((c) => c.id));

  const totalRevenue = paidOrders.reduce(
    (s, o) => s + parseFloat(o.total_price),
    0
  );
  const totalOrders = paidOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Daily revenue and orders
  const revenueMap = new Map<string, number>();
  const ordersMap = new Map<string, number>();

  // Heatmap [dow][hour]
  const heatmap: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0)
  );

  // New vs returning: unique purchasing customers
  const purchasingCustomerIds = new Set<number>();
  let guestOrders = 0;

  // Geographic
  const provinceMap = new Map<string, { count: number; revenue: number }>();

  // Status breakdown (financial from ALL orders, fulfillment from paid)
  const statusBreakdown: StatusBreakdown = {
    fulfilled: 0,
    unfulfilled: 0,
    partial: 0,
    paid: 0,
    pending: 0,
    refunded: 0,
  };

  // Product type metrics
  const typeMap = new Map<string, ProductTypeMetric>();

  for (const o of orders) {
    // Financial status from all orders
    if (o.financial_status === "paid") statusBreakdown.paid++;
    else if (o.financial_status === "pending") statusBreakdown.pending++;
    else if (
      o.financial_status === "refunded" ||
      o.financial_status === "partially_refunded"
    )
      statusBreakdown.refunded++;
  }

  for (const o of paidOrders) {
    const date = formatDate(o.created_at);
    const revenue = parseFloat(o.total_price);
    revenueMap.set(date, (revenueMap.get(date) ?? 0) + revenue);
    ordersMap.set(date, (ordersMap.get(date) ?? 0) + 1);

    // Heatmap
    const { hour, dow } = parseLocalTime(o.created_at);
    heatmap[dow][hour]++;

    // New vs returning (dedupe by customer id)
    if (o.customer?.id) {
      purchasingCustomerIds.add(o.customer.id);
    } else {
      guestOrders++;
    }

    // Geographic
    const province = o.shipping_address?.province ?? "Desconocido";
    const geo = provinceMap.get(province) ?? { count: 0, revenue: 0 };
    geo.count++;
    geo.revenue += revenue;
    provinceMap.set(province, geo);

    // Fulfillment status
    if (o.fulfillment_status === "fulfilled") statusBreakdown.fulfilled++;
    else if (o.fulfillment_status === "partial") statusBreakdown.partial++;
    else statusBreakdown.unfulfilled++;

    // Product type metrics
    for (const item of o.line_items) {
      const type =
        item.product_type?.trim() ||
        item.vendor?.trim() ||
        "Sin categoría";
      const itemRevenue = parseFloat(item.price) * item.quantity;
      const t = typeMap.get(type) ?? { type, revenue: 0, count: 0 };
      t.revenue += itemRevenue;
      t.count += item.quantity;
      typeMap.set(type, t);
    }
  }

  // Classify new vs returning by customer id
  let newCustomers = 0;
  let returningCustomers = 0;
  for (const id of purchasingCustomerIds) {
    if (newCustomerIds.has(id)) newCustomers++;
    else returningCustomers++;
  }

  // Top products
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
    revenueByDay: sortedDates.map((date) => ({
      date,
      value: revenueMap.get(date) ?? 0,
    })),
    ordersByDay: sortedDates.map((date) => ({
      date,
      value: ordersMap.get(date) ?? 0,
    })),
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    heatmap,
    newCustomers: newCustomers + guestOrders,
    returningCustomers,
    ordersByProvince: Array.from(provinceMap.entries())
      .map(([province, data]) => ({ province, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    statusBreakdown,
    byProductType: Array.from(typeMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8),
  };
}
