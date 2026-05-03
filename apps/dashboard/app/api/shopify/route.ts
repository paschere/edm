import { getShopifyStats } from "@/lib/shopify";

export async function GET() {
  try {
    const stats = await getShopifyStats(30);
    return Response.json(stats);
  } catch (err) {
    console.error("[api/shopify]", err);
    return Response.json({ error: "Error al obtener datos de Shopify" }, { status: 500 });
  }
}
