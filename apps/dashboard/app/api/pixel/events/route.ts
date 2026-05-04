import { getDb } from "@/lib/db";
import { pixelEvents } from "@/lib/db/schema";
import type { NextRequest } from "next/server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(req: NextRequest) {
  try {
    const pixelSecret = process.env.PIXEL_SECRET;
    if (pixelSecret) {
      const token = req.nextUrl.searchParams.get("token");
      if (token !== pixelSecret) {
        return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
      }
    }

    const body = await req.json();
    const {
      eventType, sessionId, customerId, url, productId, productTitle,
      collectionId, searchQuery, cartTotal, orderId, referrer,
      utmSource, utmMedium, utmCampaign, metadata,
    } = body;

    if (!eventType) {
      return Response.json({ error: "eventType required" }, { status: 400, headers: CORS });
    }

    const db = getDb();
    await db.insert(pixelEvents).values({
      eventType,
      sessionId: sessionId ?? null,
      customerId: customerId ?? null,
      pageUrl: url ?? null,
      referrer: referrer ?? null,
      productId: productId ?? null,
      productTitle: productTitle ?? null,
      collectionId: collectionId ?? null,
      searchQuery: searchQuery ?? null,
      cartTotal: cartTotal ? String(cartTotal) : null,
      orderId: orderId ?? null,
      utmSource: utmSource ?? null,
      utmMedium: utmMedium ?? null,
      utmCampaign: utmCampaign ?? null,
      metadata: metadata ?? null,
    });

    console.log(`[pixel] ${eventType} sid=${sessionId ?? "—"} url=${url ?? "—"}`);
    return Response.json({ ok: true }, { headers: CORS });
  } catch (err) {
    console.error("[pixel/events] error:", err);
    return Response.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
