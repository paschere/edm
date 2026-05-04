import { getShopifyStats } from "@/lib/shopify";
import { getMetaStats } from "@/lib/meta";
import { Resend } from "resend";
import type { NextRequest } from "next/server";

function pct(current: number, prev: number): string {
  if (prev === 0) return current > 0 ? "+100%" : "—";
  const p = ((current - prev) / prev) * 100;
  return `${p > 0 ? "+" : ""}${p.toFixed(1)}%`;
}

function arrow(current: number, prev: number): string {
  if (prev === 0) return "";
  return current >= prev ? "▲" : "▼";
}

function arrowColor(current: number, prev: number, lowerIsBetter = false): string {
  const better = lowerIsBetter ? current <= prev : current >= prev;
  return better ? "#4f7a3e" : "#b43c28";
}

function buildScorecardEmail(
  shopify: Awaited<ReturnType<typeof getShopifyStats>>,
  meta: Awaited<ReturnType<typeof getMetaStats>> | null,
  weekLabel: string,
): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

  const revChange = pct(shopify.totalRevenue, shopify.prevRevenue);
  const ordChange = pct(shopify.totalOrders, shopify.prevOrders);
  const revArrow  = arrow(shopify.totalRevenue, shopify.prevRevenue);
  const ordArrow  = arrow(shopify.totalOrders, shopify.prevOrders);

  const topProduct = shopify.topProducts[0];
  const convRate = shopify.totalOrders > 0 && shopify.newCustomers + shopify.returningCustomers > 0
    ? "—"
    : "—";

  const metaBlock = meta && meta.totalSpend > 0 ? `
    <tr>
      <td style="padding:16px 28px;border-top:1px solid #f0e8d8;">
        <p style="margin:0 0 12px;font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:#9c8a6e;font-weight:600;">Marketing Meta</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:0 16px 0 0;vertical-align:top;">
              <p style="margin:0;font-size:10px;color:#9c8a6e;text-transform:uppercase;letter-spacing:0.1em;">Gasto</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#2d2416;letter-spacing:-0.02em;">${fmt(meta.totalSpend)}</p>
            </td>
            <td style="padding:0 16px 0 0;vertical-align:top;">
              <p style="margin:0;font-size:10px;color:#9c8a6e;text-transform:uppercase;letter-spacing:0.1em;">ROAS</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${meta.totalRoas >= 2 ? "#4f7a3e" : "#b07a30"};letter-spacing:-0.02em;">${meta.totalRoas > 0 ? meta.totalRoas.toFixed(2) + "x" : "—"}</p>
            </td>
            <td style="vertical-align:top;">
              <p style="margin:0;font-size:10px;color:#9c8a6e;text-transform:uppercase;letter-spacing:0.1em;">Compras attr.</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#2d2416;letter-spacing:-0.02em;">${meta.totalPurchases > 0 ? meta.totalPurchases : "—"}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : "";

  const topProductBlock = topProduct ? `
    <tr>
      <td style="padding:4px 28px 16px;">
        <div style="background:#faf7f2;border-radius:8px;padding:12px 16px;border:1px solid #f0e8d8;">
          <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9c8a6e;font-weight:600;">Producto estrella de la semana</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#2d2416;">${topProduct.title}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#78695a;">${topProduct.quantity} unidades · ${fmt(topProduct.revenue)}</p>
        </div>
      </td>
    </tr>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;">

    <!-- Header -->
    <div style="background:#0b0805;padding:24px 28px;">
      <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#bb9a4c;font-weight:600;">Estrella de Mar · Scorecard semanal</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#f4eee1;letter-spacing:-0.01em;">${weekLabel}</p>
    </div>

    <!-- Main KPIs -->
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:24px 28px 16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <!-- Revenue -->
              <td style="padding:0 12px 0 0;width:33%;vertical-align:top;">
                <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9c8a6e;font-weight:600;">Revenue</p>
                <p style="margin:6px 0 4px;font-size:26px;font-weight:700;color:#2d2416;letter-spacing:-0.02em;">${fmt(shopify.totalRevenue)}</p>
                <p style="margin:0;font-size:12px;font-weight:600;color:${arrowColor(shopify.totalRevenue, shopify.prevRevenue)};">
                  ${revArrow} ${revChange} vs semana ant.
                </p>
              </td>
              <!-- Orders -->
              <td style="padding:0 12px;width:33%;vertical-align:top;border-left:1px solid #f0e8d8;">
                <p style="margin:0 0 0 12px;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9c8a6e;font-weight:600;">Pedidos</p>
                <p style="margin:6px 0 4px 12px;font-size:26px;font-weight:700;color:#2d2416;letter-spacing:-0.02em;">${shopify.totalOrders}</p>
                <p style="margin:0 0 0 12px;font-size:12px;font-weight:600;color:${arrowColor(shopify.totalOrders, shopify.prevOrders)};">
                  ${ordArrow} ${ordChange} vs semana ant.
                </p>
              </td>
              <!-- Ticket -->
              <td style="padding:0 0 0 12px;width:33%;vertical-align:top;border-left:1px solid #f0e8d8;">
                <p style="margin:0 0 0 12px;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#9c8a6e;font-weight:600;">Ticket prom.</p>
                <p style="margin:6px 0 4px 12px;font-size:26px;font-weight:700;color:#2d2416;letter-spacing:-0.02em;">${fmt(shopify.averageOrderValue)}</p>
                <p style="margin:0 0 0 12px;font-size:12px;color:#9c8a6e;">${shopify.newCustomers} clientes nuevos</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${topProductBlock}
      ${metaBlock}

      <!-- Footer -->
      <tr>
        <td style="padding:16px 28px;background:#0b0805;">
          <p style="margin:0;font-size:11px;color:#78695a;text-align:center;">
            Estrella de Mar · Scorecard automático — no responder
          </p>
          <p style="margin:4px 0 0;font-size:11px;color:#4d3c28;text-align:center;">
            Ver dashboard completo en edmco.vercel.app
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  // Validate cron secret to prevent unauthorized calls
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to     = process.env.INTERNAL_NOTIFICATION_EMAIL;
  const from   = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  if (!apiKey || !to) {
    return Response.json({ error: "RESEND_API_KEY or INTERNAL_NOTIFICATION_EMAIL not set" }, { status: 500 });
  }

  try {
    const [shopify, meta] = await Promise.all([
      getShopifyStats(7),
      getMetaStats(7).catch(() => null),
    ]);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const label = `Semana ${weekStart.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${now.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`;

    const html = buildScorecardEmail(shopify, meta, label);

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      subject: `📊 Scorecard Estrella de Mar — ${label}`,
      html,
    });

    console.log(`[cron/weekly-scorecard] Scorecard enviado para ${label}`);
    return Response.json({ ok: true, week: label });
  } catch (err) {
    console.error("[cron/weekly-scorecard] error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
