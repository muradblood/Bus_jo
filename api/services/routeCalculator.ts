import type { SaudiCity } from '../data/saudiCities.js';
import { findManagedSaudiCity, getManagedSaudiRoute } from './locationCatalog.js';

export type RouteSource = 'verified' | 'routing-engine' | 'estimated';

export type RouteCalculation = {
  origin: SaudiCity;
  destination: SaudiCity;
  distanceKm: number;
  durationMinutes: number;
  durationTextAr: string;
  source: RouteSource;
  provider: string;
};

const memoryCache = new Map<string, { value: RouteCalculation; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function clearRouteCalculationCache(): void {
  memoryCache.clear();
}

function haversineKm(a: SaudiCity, b: SaudiCity): number {
  const toRad = (v: number) => v * Math.PI / 180;
  const R = 6371.0088;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function durationTextAr(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins} دقيقة`;
  if (!mins) return `${hours} ساعة`;
  return `${hours} ساعة و${mins} دقيقة`;
}

function cacheKey(origin: SaudiCity, destination: SaudiCity): string {
  return `${origin.id}:${destination.id}`;
}

async function routeViaOsrm(origin: SaudiCity, destination: SaudiCity): Promise<RouteCalculation | null> {
  const baseUrl = (process.env.ROUTING_BASE_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
  const url = `${baseUrl}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false&steps=false`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json() as { code?: string; routes?: Array<{ distance?: number; duration?: number }> };
    const route = data.routes?.[0];
    if (data.code !== 'Ok' || !route?.distance || !route?.duration) return null;
    const distanceKm = Math.round(route.distance / 100) / 10;
    const durationMinutes = Math.max(1, Math.round(route.duration / 60));
    return {
      origin,
      destination,
      distanceKm,
      durationMinutes,
      durationTextAr: durationTextAr(durationMinutes),
      source: 'routing-engine',
      provider: 'osrm',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function estimatedRoute(origin: SaudiCity, destination: SaudiCity): RouteCalculation {
  const airKm = haversineKm(origin, destination);
  const roadFactor = airKm < 100 ? 1.18 : airKm < 500 ? 1.22 : 1.25;
  const distanceKm = Math.round(airKm * roadFactor * 10) / 10;
  const drivingMinutes = Math.round((distanceKm / 78) * 60);
  const restMinutes = distanceKm >= 800 ? 90 : distanceKm >= 400 ? 45 : distanceKm >= 200 ? 20 : 0;
  const durationMinutes = drivingMinutes + restMinutes;
  return {
    origin,
    destination,
    distanceKm,
    durationMinutes,
    durationTextAr: durationTextAr(durationMinutes),
    source: 'estimated',
    provider: 'haversine-fallback',
  };
}

export async function calculateSaudiRoute(originValue: string, destinationValue: string): Promise<RouteCalculation> {
  const [origin, destination] = await Promise.all([
    findManagedSaudiCity(originValue),
    findManagedSaudiCity(destinationValue),
  ]);
  if (!origin) throw new Error(`Unknown or inactive origin city: ${originValue}`);
  if (!destination) throw new Error(`Unknown or inactive destination city: ${destinationValue}`);
  if (origin.id === destination.id) throw new Error('Origin and destination must be different');

  const verified = await getManagedSaudiRoute(origin.id, destination.id);
  if (verified) {
    return {
      origin,
      destination,
      distanceKm: verified.distanceKm,
      durationMinutes: verified.durationMinutes,
      durationTextAr: durationTextAr(verified.durationMinutes),
      source: 'verified',
      provider: verified.source === 'admin' ? 'admin-override' : 'project-data',
    };
  }

  const key = cacheKey(origin, destination);
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const calculated = await routeViaOsrm(origin, destination) || estimatedRoute(origin, destination);
  memoryCache.set(key, { value: calculated, expiresAt: Date.now() + CACHE_TTL_MS });
  return calculated;
}
