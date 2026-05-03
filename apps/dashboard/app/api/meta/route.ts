import { getMetaStats } from "@/lib/meta";

export async function GET() {
  try {
    const stats = await getMetaStats();
    return Response.json(stats);
  } catch (err) {
    console.error("[api/meta]", err);
    return Response.json({ error: "Error al obtener datos de Meta" }, { status: 500 });
  }
}
