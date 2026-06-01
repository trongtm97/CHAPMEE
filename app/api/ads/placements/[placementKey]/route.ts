import { NextResponse } from "next/server";
import { getAdPlacementByKey } from "@/lib/ads/getAdPlacement";
import { isAdAllowedRoute } from "@/lib/ads/routeRules";

type RouteContext = {
  params: Promise<{ placementKey: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { placementKey } = await context.params;
  const { searchParams } = new URL(request.url);
  const route = searchParams.get("route") ?? "";

  if (route && !isAdAllowedRoute(route)) {
    return NextResponse.json({ placement: null, blocked: true, reason: "route_blocked" });
  }

  const { placement, error } = await getAdPlacementByKey(placementKey);

  if (error) {
    return NextResponse.json({ placement: null, error }, { status: 500 });
  }

  if (!placement || !placement.is_enabled) {
    return NextResponse.json({ placement: null });
  }

  if (route && placement.excluded_routes?.length) {
    const excluded = placement.excluded_routes.some(
      (pattern) => route === pattern || route.startsWith(`${pattern}/`)
    );
    if (excluded) {
      return NextResponse.json({ placement: null, blocked: true, reason: "excluded_route" });
    }
  }

  return NextResponse.json({ placement });
}
