import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';
import { ensureCitiesSeeded } from './cities.js';

// Haversine distance calculation
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const CITIES: Record<string, { lat: number; lng: number }> = {
  'الرياض': { lat: 24.7136, lng: 46.6753 },
  'جدة': { lat: 21.5433, lng: 39.1728 },
  'مكة المكرمة': { lat: 21.3891, lng: 39.8579 },
  'المدينة المنورة': { lat: 24.4672, lng: 39.6024 },
  'الدمام': { lat: 26.4207, lng: 50.0888 },
  'الخبر': { lat: 26.2172, lng: 50.1971 },
  'أبها': { lat: 18.2171, lng: 42.5053 },
  'الطائف': { lat: 21.2854, lng: 40.4258 },
  'تبوك': { lat: 28.3835, lng: 36.5662 },
  'بريدة': { lat: 26.3260, lng: 43.9750 },
  'حائل': { lat: 27.5219, lng: 41.6961 },
  'جازان': { lat: 16.8892, lng: 42.5511 },
  'نجران': { lat: 17.5656, lng: 44.2289 },
  'ينبع': { lat: 24.0891, lng: 38.0637 },
  'الباحة': { lat: 20.0125, lng: 41.4653 },
  'دبي': { lat: 25.2048, lng: 55.2708 },
  'أبوظبي': { lat: 24.4539, lng: 54.3773 },
  'الكويت العاصمة': { lat: 29.3759, lng: 47.9774 },
  'الدوحة': { lat: 25.2854, lng: 51.5310 },
  'مسقط': { lat: 23.5859, lng: 58.4059 },
  'عمان': { lat: 31.9539, lng: 35.9106 },
  'القاهرة': { lat: 30.0444, lng: 31.2357 },
};

function getCityCoords(name: string): { lat: number; lng: number } | null {
  ensureCitiesSeeded();
  const stored = db.city.findFirst({ where: { name } });
  if (stored && (stored.lat !== 0 || stored.lng !== 0)) {
    return { lat: stored.lat, lng: stored.lng };
  }
  return CITIES[name] || null;
}

function calcBasePrice(from: string, to: string): number {
  let globalMin = 40;
  let globalMax = 160;
  const setting = db.setting.findUnique({ where: { key: 'pricingSettings' } });
  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value) as Record<string, unknown>;
      if (typeof parsed.globalMin === 'number') globalMin = parsed.globalMin;
      if (typeof parsed.globalMax === 'number') globalMax = parsed.globalMax;
    } catch { /* use defaults */ }
  }
  const c1 = getCityCoords(from);
  const c2 = getCityCoords(to);
  if (!c1 || !c2) return Math.round((globalMin + globalMax) / 2);
  const dist = distanceKm(c1.lat, c1.lng, c2.lat, c2.lng) * 1.18;
  if (dist <= 10) return globalMin;
  if (dist >= 2100) return globalMax;
  return Math.round(globalMin + ((dist - 10) / (2100 - 10)) * (globalMax - globalMin));
}

function getMultipliers() {
  const defaults = { business: 1.2, vip: 2 };
  const setting = db.setting.findUnique({ where: { key: 'pricingSettings' } });
  if (!setting?.value) return defaults;
  try {
    const parsed = JSON.parse(setting.value) as Record<string, unknown>;
    return {
      business: typeof parsed.businessMultiplier === 'number' ? parsed.businessMultiplier : defaults.business,
      vip: typeof parsed.vipMultiplier === 'number' ? parsed.vipMultiplier : defaults.vip,
    };
  } catch {
    return defaults;
  }
}

export function calculateGeneratedRoute(from: string, to: string) {
  const economy = calcBasePrice(from, to);
  const multipliers = getMultipliers();
  const c1 = getCityCoords(from);
  const c2 = getCityCoords(to);
  // Haversine gives straight-line distance. The road factor keeps generated
  // bus distance closer to the actual driven route while remaining deterministic.
  const distance = c1 && c2
    ? Math.max(1, Math.round(distanceKm(c1.lat, c1.lng, c2.lat, c2.lng) * 1.18))
    : 500;
  const duration = Math.max(1, Math.round(distance / 80 + 0.5));
  return {
    fromCity: from,
    toCity: to,
    economy,
    business: Math.round(economy * multipliers.business),
    vip: Math.round(economy * multipliers.vip),
    distance,
    duration,
  };
}

function storedRoute(from: string, to: string) {
  return db.price.findFirst({
    where: {
      OR: [
        { fromCity: from, toCity: to },
        { fromCity: to, toCity: from },
      ],
    },
  });
}

export const pricesRouter = router({
  calculate: publicProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      // Check DB first
      const stored = storedRoute(input.from, input.to);
      if (stored) {
        return {
          fromCity: stored.fromCity,
          toCity: stored.toCity,
          economy: stored.economyPrice,
          business: stored.businessPrice,
          vip: stored.vipPrice,
          distance: stored.distance,
          duration: stored.duration,
          generated: stored.generated ?? false,
        };
      }
      const generated = calculateGeneratedRoute(input.from, input.to);
      db.price.create({
        data: {
          fromCity: generated.fromCity,
          toCity: generated.toCity,
          distance: generated.distance,
          duration: generated.duration,
          economyPrice: generated.economy,
          businessPrice: generated.business,
          vipPrice: generated.vip,
          borderCrossings: JSON.stringify([]),
          generated: true,
        },
      });
      return { ...generated, generated: true };
    }),

  bulkCalculate: publicProcedure
    .input(z.object({ pairs: z.array(z.object({ from: z.string(), to: z.string() })) }))
    .query(async ({ input }) => {
      return input.pairs.map(pair => {
        const stored = storedRoute(pair.from, pair.to);
        if (stored) {
          return { ...pair, economy: stored.economyPrice, business: stored.businessPrice, vip: stored.vipPrice, distance: stored.distance, duration: stored.duration };
        }
        return calculateGeneratedRoute(pair.from, pair.to);
      });
    }),

  get: publicProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      return db.price.findFirst({
        where: {
          OR: [
            { fromCity: input.from, toCity: input.to },
            { fromCity: input.to, toCity: input.from },
          ],
        },
      });
    }),

  list: adminProcedure.query(async () => {
    return db.price.findMany({ orderBy: { fromCity: 'asc' } });
  }),

  catalog: adminProcedure.query(() => {
    ensureCitiesSeeded();
    const cities = db.city.findMany({ orderBy: { name: 'asc' } });
    const rows = [] as Array<{
      id: number;
      fromCity: string;
      toCity: string;
      distance: number;
      duration: number;
      economyPrice: number;
      businessPrice: number;
      vipPrice: number;
      borderCrossings: string[];
      generated: boolean;
    }>;
    let id = 1;
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        const from = cities[i].name;
        const to = cities[j].name;
        const stored = storedRoute(from, to);
        if (stored) {
          rows.push({
            id: stored.id,
            fromCity: from,
            toCity: to,
            distance: stored.distance,
            duration: stored.duration,
            economyPrice: stored.economyPrice,
            businessPrice: stored.businessPrice,
            vipPrice: stored.vipPrice,
            borderCrossings: (() => { try { return JSON.parse(stored.borderCrossings); } catch { return []; } })(),
            generated: stored.generated ?? false,
          });
        } else {
          const generated = calculateGeneratedRoute(from, to);
          rows.push({
            id: -id,
            fromCity: from,
            toCity: to,
            distance: generated.distance,
            duration: generated.duration,
            economyPrice: generated.economy,
            businessPrice: generated.business,
            vipPrice: generated.vip,
            borderCrossings: [],
            generated: true,
          });
        }
        id++;
      }
    }
    return rows;
  }),

  upsert: adminProcedure
    .input(z.object({
      fromCity: z.string(),
      toCity: z.string(),
      distance: z.number().optional().default(0),
      duration: z.number().optional().default(0),
      economyPrice: z.number(),
      businessPrice: z.number(),
      vipPrice: z.number(),
      borderCrossings: z.array(z.string()).optional().default([]),
    }))
    .mutation(async ({ input }) => {
      const { borderCrossings, ...rest } = input;
      return db.price.upsert({
        where: { fromCity_toCity: { fromCity: input.fromCity, toCity: input.toCity } },
        update: { ...rest, borderCrossings: JSON.stringify(borderCrossings), generated: false },
        create: { ...rest, borderCrossings: JSON.stringify(borderCrossings), generated: false },
      });
    }),

  delete: adminProcedure
    .input(z.object({ fromCity: z.string(), toCity: z.string() }))
    .mutation(async ({ input }) => {
      await db.price.deleteMany({
        where: {
          OR: [
            { fromCity: input.fromCity, toCity: input.toCity },
            { fromCity: input.toCity, toCity: input.fromCity },
          ],
        },
      });
      return { success: true };
    }),

  reset: adminProcedure.mutation(() => {
    const result = db.price.deleteMany();
    return { success: true, count: result.count };
  }),
});
