/**
 * SAT Saudi Domestic Transport - Inter-city Bus Routes
 * 128 Saudi cities with routes connecting all regions
 */

import { cities, distanceKm, calculatePrice, cityNames } from './cities-data';

export interface InternationalCity {
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  region: string;
}

export interface RouteStop {
  city: string;
  duration: string;
  type: 'pickup' | 'dropoff' | 'rest' | 'border' | 'transit';
}

export interface InternationalRoute {
  from: string;
  to: string;
  distanceKm: number;
  durationHours: number;
  vipPrice: number;
  businessPrice: number;
  economyPrice: number;
  routeType: 'direct' | 'connection';
  borderCrossings: string[];
  description?: string;
  stops?: RouteStop[];
  routePath?: string[];
}

// ═══════════════════════════════════════════════════
// SAUDI CITIES (128 cities from cities-data.ts)
// ═══════════════════════════════════════════════════

export const internationalCities: InternationalCity[] = cities.map(c => ({
  name: c.name,
  country: 'السعودية',
  countryCode: 'SA',
  lat: c.lat,
  lng: c.lng,
  region: c.region,
}));

// ═══════════════════════════════════════════════════
// REGIONS & THEIR CITIES (for grouped dropdown)
// ═══════════════════════════════════════════════════

export function getRegionsWithCities(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const city of cities) {
    if (!map[city.region]) map[city.region] = [];
    map[city.region].push(city.name);
  }
  // Sort cities within each region
  for (const region of Object.keys(map)) {
    map[region].sort();
  }
  return map;
}

// Keep old function name for backward compatibility
export function getCountriesWithCities(): Record<string, string[]> {
  return getRegionsWithCities();
}

export const allCityNames = cityNames;

export function getCityInfo(name: string): InternationalCity | undefined {
  return internationalCities.find(c => c.name === name);
}

// ═══════════════════════════════════════════════════
// AUTO-GENERATED ROUTES (all city pairs)
// ═══════════════════════════════════════════════════

function generateRoutes(): InternationalRoute[] {
  const routes: InternationalRoute[] = [];
  const majorCities = [
    'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام',
    'أبها', 'تبوك', 'جازان', 'نجران', 'الطائف', 'الخبر', 'الأحساء',
    'القصيم', 'حائل', 'الجوف', 'ينبع', 'العلا', 'بريدة', 'عنيزة',
  ];

  for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
      const c1 = cities[i];
      const c2 = cities[j];
      const dist = distanceKm(c1.name, c2.name);
      const duration = Math.round(dist / 80 + 0.5); // ~80 km/h average
      const price = calculatePrice(c1.name, c2.name);

      // Determine route type
      const isMajor = majorCities.includes(c1.name) && majorCities.includes(c2.name);

      // Generate stops (intermediate major cities along the way)
      const stops: RouteStop[] = [];
      stops.push({ city: c1.name, duration: '00:00', type: 'pickup' });

      // Add rest stop for long routes
      if (dist > 300) {
        const midIdx = Math.floor(majorCities.length / 2);
        const restCity = majorCities[midIdx % majorCities.length];
        if (restCity !== c1.name && restCity !== c2.name) {
          stops.push({ city: restCity, duration: `${Math.floor(duration / 2)}:00`, type: 'rest' });
        }
      }

      stops.push({ city: c2.name, duration: `${duration}:00`, type: 'dropoff' });

      routes.push({
        from: c1.name,
        to: c2.name,
        distanceKm: Math.round(dist),
        durationHours: duration,
        vipPrice: Math.round(price * 1.5),
        businessPrice: Math.round(price * 1.2),
        economyPrice: price,
        routeType: isMajor ? 'direct' : 'connection',
        borderCrossings: [],
        description: `رحلة ${isMajor ? 'مباشرة' : 'مع توقف'} من ${c1.name} إلى ${c2.name}`,
        stops,
        routePath: [c1.name, c2.name],
      });
    }
  }

  return routes;
}

export const internationalRoutes: InternationalRoute[] = generateRoutes();

// ═══════════════════════════════════════════════════
// PRICE & ROUTE LOOKUP (synced with admin dashboard)
// ═══════════════════════════════════════════════════

export function findRoute(from: string, to: string): InternationalRoute | undefined {
  return internationalRoutes.find(
    r => (r.from === from && r.to === to) || (r.from === to && r.to === from)
  );
}

export function getRouteDistance(from: string, to: string): number {
  const route = findRoute(from, to);
  return route ? route.distanceKm : Math.round(distanceKm(from, to));
}

export function getRouteDuration(from: string, to: string): number {
  const route = findRoute(from, to);
  return route ? route.durationHours : Math.round(distanceKm(from, to) / 80);
}

export function getBorderCrossings(from: string, to: string): string[] {
  return []; // Domestic routes have no borders
}

export function getRouteDetails(from: string, to: string): {
  distance: number;
  duration: number;
  stops: RouteStop[];
  routePath: string[];
} {
  const route = findRoute(from, to);
  if (route) {
    return {
      distance: route.distanceKm,
      duration: route.durationHours,
      stops: route.stops || [],
      routePath: route.routePath || [from, to],
    };
  }
  // Fallback
  return {
    distance: Math.round(distanceKm(from, to)),
    duration: Math.round(distanceKm(from, to) / 80),
    stops: [
      { city: from, duration: '00:00', type: 'pickup' },
      { city: to, duration: `${Math.round(distanceKm(from, to) / 80)}:00`, type: 'dropoff' },
    ],
    routePath: [from, to],
  };
}

export function calculateRoutePrice(
  from: string,
  to: string,
  fareClass: 'economy' | 'business' | 'vip' = 'economy'
): number {
  // Check admin pricing settings first
  const pricingKey = 'sat_pricing_settings_v3';
  try {
    const raw = localStorage.getItem(pricingKey);
    if (raw) {
      const settings = JSON.parse(raw);
      const base = calculatePrice(from, to);
      const min = settings.globalMin || 40;
      const max = settings.globalMax || 160;
      const clamped = Math.max(min, Math.min(max, base));
      if (fareClass === 'vip') return Math.round(clamped * (settings.vipMultiplier || 2));
      if (fareClass === 'business') return Math.round(clamped * (settings.businessMultiplier || 1.2));
      return clamped;
    }
  } catch { /* ignore */ }

  // Default pricing
  const price = calculatePrice(from, to);
  if (fareClass === 'vip') return Math.round(price * 2);
  if (fareClass === 'business') return Math.round(price * 1.2);
  return price;
}

// ═══════════════════════════════════════════════════
// REGION INFO
// ═══════════════════════════════════════════════════

export const countryFlags: Record<string, string> = {
  'الرياض': '🇸🇦',
  'مكة المكرمة': '🇸🇦',
  'المدينة المنورة': '🇸🇦',
  'الشرقية': '🇸🇦',
  'عسير': '🇸🇦',
  'جازان': '🇸🇦',
  'القصيم': '🇸🇦',
  'حائل': '🇸🇦',
  'تبوك': '🇸🇦',
  'الجوف': '🇸🇦',
  'الحدود الشمالية': '🇸🇦',
  'نجران': '🇸🇦',
  'الباحة': '🇸🇦',
};

export const countryNames: Record<string, string> = {
  'SA': 'المملكة العربية السعودية',
};

export const regionNames: Record<string, string> = {
  'الرياض': 'منطقة الرياض',
  'مكة المكرمة': 'منطقة مكة المكرمة',
  'المدينة المنورة': 'منطقة المدينة المنورة',
  'الشرقية': 'المنطقة الشرقية',
  'عسير': 'منطقة عسير',
  'جازان': 'منطقة جازان',
  'القصيم': 'منطقة القصيم',
  'حائل': 'منطقة حائل',
  'تبوك': 'منطقة تبوك',
  'الجوف': 'منطقة الجوف',
  'الحدود الشمالية': 'المنطقة الشمالية',
  'نجران': 'منطقة نجران',
  'الباحة': 'منطقة الباحة',
};

// Backward compatibility exports
export const gccCountries = ['SA'];
export const levantCountries: string[] = [];
export const northAfricaCountries: string[] = [];
export const hornAfricaCountries: string[] = [];

export type RouteDetails = ReturnType<typeof getRouteDetails>;
