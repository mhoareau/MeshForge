import { getNodeReach } from "@/lib/queries/reach";

export const dynamic = "force-dynamic";

// Arêtes d'atteignabilité (NeighborInfo + Traceroute) pour le survol carte.
export async function GET() {
  return Response.json(await getNodeReach());
}
