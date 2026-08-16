export type VerifiedSaudiRoute = {
  originId: string;
  destinationId: string;
  distanceKm: number;
  durationMinutes: number;
  source: 'verified' | 'base' | 'admin';
  verifiedAt: string;
  note?: string;
};

/**
 * Only manually verified road routes belong here.
 * Unknown routes are calculated by the routing engine in routeCalculator.ts.
 */
export const VERIFIED_SAUDI_ROUTES: readonly VerifiedSaudiRoute[] = [];

export function routeKey(originId: string, destinationId: string): string {
  return `${originId.toLowerCase()}:${destinationId.toLowerCase()}`;
}

const routeMap = new Map<string, VerifiedSaudiRoute>();
for (const route of VERIFIED_SAUDI_ROUTES) {
  routeMap.set(routeKey(route.originId, route.destinationId), route);
  routeMap.set(routeKey(route.destinationId, route.originId), {
    ...route,
    originId: route.destinationId,
    destinationId: route.originId,
  });
}

export function getVerifiedSaudiRoute(originId: string, destinationId: string): VerifiedSaudiRoute | undefined {
  return routeMap.get(routeKey(originId, destinationId));
}
