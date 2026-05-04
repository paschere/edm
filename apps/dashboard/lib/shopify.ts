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
  total_discounts?: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer?: {
    id: number;
    orders_count: number;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  shipping_address?: { province: string; province_code: string };
  line_items: {
    product_id: number;
    title: string;
    quantity: number;
    price: string;
    vendor?: string;
    product_type?: string;
  }[];
  discount_codes?: { code: string; amount: string; type: string }[];
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

export interface DiscountCodeMetric {
  code: string;
  count: number;
  totalDiscount: number;
}

export interface TopCustomer {
  id: number;
  email: string;
  name: string;
  ordersCount: number;
  totalSpent: number;
}

export interface InventoryItem {
  productId: number;
  productTitle: string;
  variantId: number;
  variantTitle: string;
  sku: string;
  price: number;
  inventoryQuantity: number;
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
  // New metrics
  ltv: number;
  repeatRate: number;
  discountCodes: DiscountCodeMetric[];
  topCustomers: TopCustomer[];
  prevRevenue: number;
  prevOrders: number;
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

const ORDER_FIELDS =
  "id,created_at,total_price,total_discounts,financial_status,fulfillment_status,customer,shipping_address,line_items,discount_codes";

export async function getShopifyStats(days = 30): Promise<ShopifyStats> {
  const since = daysAgo(days);
  const prevEnd = daysAgo(days);
  const prevStart = daysAgo(days * 2);

  const [ordersRes, customersRes, newCustomersRes, prevOrdersRes] = await Promise.all([
    shopifyFetch<{ orders: ShopifyOrder[] }>(
      `/orders.json?created_at_min=${since}&status=any&limit=250&fields=${ORDER_FIELDS}`
    ),
    shopifyFetch<{ count: number }>(`/customers/count.json`),
    shopifyFetch<{ customers: { id: number }[] }>(
      `/customers.json?created_at_min=${since}&limit=250&fields=id`
    ),
    shopifyFetch<{ orders: { total_price: string; financial_status: string }[] }>(
      `/orders.json?created_at_min=${prevStart}&created_at_max=${prevEnd}&status=any&limit=250&fields=id,total_price,financial_status`
    ),
  ]);

  const orders = ordersRes.orders;
  const paidOrders = orders.filter((o) => o.financial_status === "paid");
  const newCustomerIds = new Set(newCustomersRes.customers.map((c) => c.id));

  // Previous period
  const prevPaidOrders = prevOrdersRes.orders.filter((o) => o.financial_status === "paid");
  const prevRevenue = prevPaidOrders.reduce((s, o) => s + parseFloat(o.total_price), 0);
  const prevOrders = prevPaidOrders.length;

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

  // Status breakdown
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

  // Discount codes
  const discountMap = new Map<string, DiscountCodeMetric>();

  // Top customers
  const customerMap = new Map<
    number,
    { id: number; email: string; name: string; ordersCount: number; totalSpent: number }
  >();

  for (const o of orders) {
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

    // New vs returning
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

    // Discount codes
    for (const dc of o.discount_codes ?? []) {
      const code = dc.code.toUpperCase();
      const existing = discountMap.get(code) ?? { code, count: 0, totalDiscount: 0 };
      existing.count++;
      existing.totalDiscount += parseFloat(dc.amount);
      discountMap.set(code, existing);
    }

    // Top customers
    if (o.customer?.id) {
      const cid = o.customer.id;
      const existing = customerMap.get(cid) ?? {
        id: cid,
        email: o.customer.email ?? "",
        name: [o.customer.first_name, o.customer.last_name].filter(Boolean).join(" ") || `Cliente #${cid}`,
        ordersCount: 0,
        totalSpent: 0,
      };
      existing.ordersCount++;
      existing.totalSpent += revenue;
      customerMap.set(cid, existing);
    }
  }

  // Classify new vs returning
  let newCustomers = 0;
  let returningCustomers = 0;
  for (const id of purchasingCustomerIds) {
    if (newCustomerIds.has(id)) newCustomers++;
    else returningCustomers++;
  }

  // LTV: avg revenue per purchasing customer
  const uniquePurchasing = purchasingCustomerIds.size + guestOrders;
  const ltv = uniquePurchasing > 0 ? totalRevenue / uniquePurchasing : 0;

  // Repeat rate: % of purchasing customers who are returning (have previous orders)
  const totalPurchasing = newCustomers + returningCustomers;
  const repeatRate = totalPurchasing > 0 ? (returningCustomers / totalPurchasing) * 100 : 0;

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
    ltv,
    repeatRate,
    discountCodes: Array.from(discountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    topCustomers: Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 20),
    prevRevenue,
    prevOrders,
  };
}

export async function getInventoryData(): Promise<InventoryItem[]> {
  const res = await shopifyFetch<{
    products: {
      id: number;
      title: string;
      status: string;
      variants: {
        id: number;
        title: string;
        sku: string;
        price: string;
        inventory_quantity: number;
      }[];
    }[];
  }>(`/products.json?limit=250&fields=id,title,status,variants&status=active`);

  const items: InventoryItem[] = [];
  for (const product of res.products) {
    for (const variant of product.variants) {
      items.push({
        productId: product.id,
        productTitle: product.title,
        variantId: variant.id,
        variantTitle: variant.title === "Default Title" ? "" : variant.title,
        sku: variant.sku ?? "",
        price: parseFloat(variant.price),
        inventoryQuantity: variant.inventory_quantity,
      });
    }
  }
  return items.sort((a, b) => a.inventoryQuantity - b.inventoryQuantity);
}
