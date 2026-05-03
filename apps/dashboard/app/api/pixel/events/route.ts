import { getDb } from "@/lib/db";
import { pixelEvents } from "@/lib/db/schema";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, sessionId, customerId, url, productId, cartTotal, orderId } = body;

    if (!eventType) {
      return Response.json({ error: "eventType required" }, { status: 400 });
    }

    const db = getDb();
    await db.insert(pixelEvents).values({
      eventType,
      sessionId: sessionId ?? null,
      customerId: customerId ?? null,
      pageUrl: url ?? null,
      productId: productId ?? null,
      cartTotal: cartTotal ? String(cartTotal) : null,
      orderId: orderId ?? null,
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
