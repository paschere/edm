import { getShopifyStats, getInventoryData } from "@/lib/shopify";
import { getMetaStats } from "@/lib/meta";

const RESEND_KEY = process.env.RESEND_API_KEY;
const ALERT_EMAIL = process.env.ALERT_EMAIL ?? "musugas@gmail.com";
const ALERT_FROM = process.env.ALERT_FROM ?? "onboarding@resend.dev";

export async function GET(req: Request) {
  console.log("[cron/alerts] triggered at", new Date().toISOString());
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("[cron/alerts] unauthorized request");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts: { level: "error" | "warn"; text: string }[] = [];

  // 1. Inventory alerts
  try {
    const inventory = await getInventoryData();
    const out = inventory.filter((i) => i.inventoryQuantity <= 0);
    const low = inventory.filter((i) => i.inventoryQuantity > 0 && i.inventoryQuantity <= 5);

    if (out.length > 0) {
      const names = out.slice(0, 3).map((i) => i.productTitle).join(", ");
      alerts.push({ level: "error", text: `${out.length} producto${out.length > 1 ? "s" : ""} agotado${out.length > 1 ? "s" : ""}: ${names}${out.length > 3 ? ` y ${out.length - 3} más` : ""}` });
    }
    if (low.length > 0) {
      const names = low.slice(0, 3).map((i) => `${i.productTitle} (${i.inventoryQuantity} uds)`).join(", ");
      alerts.push({ level: "warn", text: `${low.length} producto${low.length > 1 ? "s" : ""} con stock bajo: ${names}${low.length > 3 ? ` y ${low.length - 3} más` : ""}` });
    }
  } catch {
    // skip if inventory API fails
  }

  // 2. Revenue drop: current 7d vs previous 7d
  try {
    const stats = await getShopifyStats(7);
    const fmt = (n: number) =>
      new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

    if (stats.prevRevenue > 0) {
      const drop = ((stats.totalRevenue - stats.prevRevenue) / stats.prevRevenue) * 100;
      if (drop < -20) {
        alerts.push({
          level: "error",
          text: `Revenue cayó ${Math.abs(drop).toFixed(1)}% esta semana — ${fmt(stats.totalRevenue)} vs ${fmt(stats.prevRevenue)} semana anterior`,
        });
      }
    }
  } catch {
    // skip if shopify API fails
  }

  // 3. Meta ROAS alerts
  try {
    const meta = await getMetaStats();
    const activeLowRoas = meta.campaigns.filter(
      (c) => c.status === "ACTIVE" && c.spend > 100 && c.roas > 0 && c.roas < 1.5
    );

    if (activeLowRoas.length > 0) {
      const names = activeLowRoas.map((c) => `${c.name} (${c.roas.toFixed(2)}x)`).join(", ");
      alerts.push({ level: "warn", text: `ROAS bajo en campañas activas: ${names}` });
    }

    if (meta.avgFrequency > 4) {
      alerts.push({
        level: "warn",
        text: `Frecuencia promedio de anuncios alta: ${meta.avgFrequency.toFixed(2)} — posible fatiga de audiencia`,
      });
    }
  } catch {
    // skip if meta API fails
  }

  console.log(`[cron/alerts] ${alerts.length} alerta(s) generada(s)`, alerts.map((a) => a.text));

  if (alerts.length === 0) {
    return Response.json({ ok: true, message: "Sin alertas" });
  }

  // Send email if Resend is configured
  if (RESEND_KEY) {
    const now = new Date().toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const rows = alerts
      .map((a) => {
        const icon = a.level === "error" ? "🔴" : "🟡";
        return `<tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f0ebe0;">
            <span style="font-size:15px; margin-right:8px;">${icon}</span>
            <span style="font-size:13px; color:#1a1a1a;">${a.text}</span>
          </td>
        </tr>`;
      })
      .join("");

    const html = `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #fdf9f2;">
        <div style="border-bottom: 2px solid #bb9a4c; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 20px; color: #0b0805; font-weight: 600;">
            Estrella de Mar · Alertas
          </h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #78695a; font-family: sans-serif;">${now}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #ede8dc;">
          ${rows}
        </table>

        <div style="margin-top: 24px; text-align: center;">
          <a href="https://edmco.vercel.app"
             style="display: inline-block; background: #0b0805; color: #f4eee1; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 13px; font-family: sans-serif;">
            Ver dashboard →
          </a>
        </div>
      </div>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: [ALERT_EMAIL],
        subject: `${alerts.some((a) => a.level === "error") ? "🔴" : "🟡"} ${alerts.length} alerta${alerts.length > 1 ? "s" : ""} · Estrella de Mar`,
        html,
      }),
    });
  }

  return Response.json({ ok: true, alerts });
}
