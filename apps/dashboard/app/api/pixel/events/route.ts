import { getDb } from "@/lib/db";
import { pixelEvents } from "@/lib/db/schema";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const pixelSecret = process.env.PIXEL_SECRET;
    if (pixelSecret) {
      const token = req.nextUrl.searchParams.get("token");
      if (token !== pixelSecret) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const {
      eventType, sessionId, customerId, url, productId, productTitle,
      collectionId, searchQuery, cartTotal, orderId, referrer,
      utmSource, utmMedium, utmCampaign, metadata,
    } = body;

    if (!eventType) {
      return Response.json({ error: "eventType required" }, { status: 400 });
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

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
