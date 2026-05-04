import { createHmac } from "crypto";
import { after } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { Resend } from "resend";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ShopifyLineItem {
  id: number;
  title: string;
  variant_title: string | null;
  quantity: number;
  price: string;
  sku: string | null;
}

interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  address1?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
}

interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  currency: string;
  note: string | null;
  tags: string;
  created_at: string;
  customer?: { first_name?: string; last_name?: string; phone?: string };
  line_items: ShopifyLineItem[];
  shipping_address?: ShopifyAddress;
}

// ─── HMAC verification ────────────────────────────────────────────────────────
function verifyHmac(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return computed === signature;
}

// ─── Email helper ─────────────────────────────────────────────────────────────
function buildOrderEmail(order: ShopifyOrder): string {
  const fmt = (n: string) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: order.currency }).format(Number(n));

  const itemsHtml = order.line_items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8d8;font-size:13px;color:#2d2416;">
          ${item.title}${item.variant_title ? ` — ${item.variant_title}` : ""}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8d8;font-size:13px;color:#78695a;text-align:center;">
          ×${item.quantity}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e8d8;font-size:13px;color:#2d2416;text-align:right;font-weight:600;">
          ${fmt(item.price)}
        </td>
      </tr>`
    )
    .join("");

  const addr = order.shipping_address;
  const addrText = addr
    ? `${addr.address1 ?? ""}, ${addr.city ?? ""}, ${addr.province ?? ""} ${addr.zip ?? ""}, ${addr.country ?? ""}`.trim()
    : "Sin dirección";

  const statusLabel: Record<string, string> = {
    paid: "Pagado",
    pending: "Pendiente",
    authorized: "Autorizado",
    refunded: "Reembolsado",
    voided: "Cancelado",
  };

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;">

    <!-- Header -->
    <div style="background:#0b0805;padding:24px 28px;">
      <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#bb9a4c;font-weight:600;">Estrella de Mar · Nuevo pedido</p>
      <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#f4eee1;letter-spacing:-0.02em;">#${order.order_number}</p>
    </div>

    <!-- Status + customer -->
    <div style="padding:20px 28px;border-bottom:1px solid #f0e8d8;display:flex;gap:24px;flex-wrap:wrap;">
      <div>
        <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9c8a6e;font-weight:600;">Cliente</p>
        <p style="margin:4px 0 0;font-size:14px;color:#2d2416;font-weight:500;">
          ${order.customer?.first_name ?? ""} ${order.customer?.last_name ?? ""}
        </p>
        <p style="margin:2px 0 0;font-size:12px;color:#78695a;">${order.email ?? "—"}</p>
        ${order.customer?.phone ? `<p style="margin:2px 0 0;font-size:12px;color:#78695a;">${order.customer.phone}</p>` : ""}
      </div>
      <div>
        <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9c8a6e;font-weight:600;">Estado pago</p>
        <p style="margin:4px 0 0;font-size:14px;color:#2d2416;font-weight:500;">
          ${statusLabel[order.financial_status] ?? order.financial_status}
        </p>
      </div>
      <div>
        <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9c8a6e;font-weight:600;">Envío a</p>
        <p style="margin:4px 0 0;font-size:12px;color:#78695a;max-width:200px;">${addrText}</p>
      </div>
    </div>

    <!-- Line items -->
    <div style="padding:20px 28px;">
      <p style="margin:0 0 12px;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9c8a6e;font-weight:600;">Productos</p>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="padding:16px 28px 24px;background:#faf7f2;border-top:1px solid #f0e8d8;">
      ${Number(order.total_discounts) > 0 ? `
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:13px;color:#78695a;">Descuentos</span>
        <span style="font-size:13px;color:#4f7a3e;font-weight:500;">−${fmt(order.total_discounts)}</span>
      </div>` : ""}
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:13px;color:#78695a;">Impuestos</span>
        <span style="font-size:13px;color:#2d2416;">${fmt(order.total_tax)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid #e8dfc8;">
        <span style="font-size:15px;color:#2d2416;font-weight:700;">Total</span>
        <span style="font-size:18px;color:#bb9a4c;font-weight:700;letter-spacing:-0.02em;">${fmt(order.total_price)}</span>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;background:#0b0805;">
      <p style="margin:0;font-size:11px;color:#78695a;text-align:center;">
        Estrella de Mar · Dashboard interno — no responder a este correo
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Webhook handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const topic = req.headers.get("x-shopify-topic");
  const signature = req.headers.get("x-shopify-hmac-sha256");
  const rawBody = await req.text();

  // Verify signature
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (secret && !verifyHmac(rawBody, signature, secret)) {
    console.warn("[webhooks/shopify] invalid HMAC — rejected");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ShopifyOrder;
  try {
    payload = JSON.parse(rawBody) as ShopifyOrder;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[webhooks/shopify] ${topic} — order #${payload.order_number} (${payload.id})`);

  // Persist to DB
  try {
    const db = getDb();
    await db
      .insert(orders)
      .values({
        shopifyOrderId: String(payload.id),
        orderNumber: payload.order_number,
        email: payload.email ?? null,
        firstName: payload.customer?.first_name ?? null,
        lastName: payload.customer?.last_name ?? null,
        phone: payload.customer?.phone ?? null,
        financialStatus: payload.financial_status ?? null,
        fulfillmentStatus: payload.fulfillment_status ?? null,
        totalPrice: payload.total_price,
        subtotalPrice: payload.subtotal_price,
        totalTax: payload.total_tax,
        totalDiscounts: payload.total_discounts,
        currency: payload.currency,
        lineItems: payload.line_items as unknown as Record<string, unknown>[],
        shippingAddress: (payload.shipping_address ?? null) as unknown as Record<string, unknown> | null,
        note: payload.note ?? null,
        tags: payload.tags ?? null,
        rawPayload: payload as unknown as Record<string, unknown>,
        shopifyCreatedAt: new Date(payload.created_at),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: orders.shopifyOrderId,
        set: {
          financialStatus: payload.financial_status ?? null,
          fulfillmentStatus: payload.fulfillment_status ?? null,
          totalPrice: payload.total_price,
          tags: payload.tags ?? null,
          rawPayload: payload as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    console.error("[webhooks/shopify] DB error:", err);
    return Response.json({ error: "DB error" }, { status: 500 });
  }

  // Send internal email async (after response — won't block Shopify's 5s timeout)
  if (topic === "orders/create") {
    after(async () => {
      const apiKey = process.env.RESEND_API_KEY;
      const to = process.env.INTERNAL_NOTIFICATION_EMAIL;
      const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

      if (!apiKey || !to) {
        console.warn("[webhooks/shopify] email skipped — RESEND_API_KEY or INTERNAL_NOTIFICATION_EMAIL not set");
        return;
      }

      try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from,
          to,
          subject: `🛍 Nuevo pedido #${payload.order_number} — ${new Intl.NumberFormat("es-MX", { style: "currency", currency: payload.currency }).format(Number(payload.total_price))}`,
          html: buildOrderEmail(payload),
        });
        console.log(`[webhooks/shopify] email enviado para pedido #${payload.order_number}`);
      } catch (err) {
        console.error("[webhooks/shopify] email error:", err);
      }
    });
  }

  return Response.json({ ok: true });
}
