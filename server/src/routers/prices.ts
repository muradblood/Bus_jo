import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';

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
  return CITIES[name] || null;
}

function calcBasePrice(from: string, to: string): number {
  const c1 = getCityCoords(from);
  const c2 = getCityCoords(to);
  if (!c1 || !c2) return 100;
  const dist = distanceKm(c1.lat, c1.lng, c2.lat, c2.lng);
  if (dist <= 50) return 33;
  if (dist >= 1400) return 125;
  return Math.round(33 + (dist - 50) / (1400 - 50) * (125 - 33));
}

export const pricesRouter = router({
  calculate: publicProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      // Check DB first
      const stored = await db.price.findFirst({
        where: {
          OR: [
            { fromCity: input.from, toCity: input.to },
            { fromCity: input.to, toCity: input.from },
          ],
        },
      });
      if (stored) {
        return {
          fromCity: stored.fromCity,
          toCity: stored.toCity,
          economy: stored.economyPrice,
          business: stored.businessPrice,
          vip: stored.vipPrice,
          distance: stored.distance,
          duration: stored.duration,
        };
      }
      const economy = calcBasePrice(input.from, input.to);
      const c1 = getCityCoords(input.from);
      const c2 = getCityCoords(input.to);
      const dist = (c1 && c2) ? Math.round(distanceKm(c1.lat, c1.lng, c2.lat, c2.lng)) : 500;
      return {
        fromCity: input.from,
        toCity: input.to,
        economy,
        business: Math.round(economy * 1.2),
        vip: Math.round(economy * 1.5),
        distance: dist,
        duration: Math.round(dist / 80 + 0.5),
      };
    }),

  bulkCalculate: publicProcedure
    .input(z.object({ pairs: z.array(z.object({ from: z.string(), to: z.string() })) }))
    .query(async ({ input }) => {
      return input.pairs.map(pair => {
        const economy = calcBasePrice(pair.from, pair.to);
        return { ...pair, economy, business: Math.round(economy * 1.2), vip: Math.round(economy * 1.5) };
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
        update: { ...rest, borderCrossings: JSON.stringify(borderCrossings) },
        create: { ...rest, borderCrossings: JSON.stringify(borderCrossings) },
      });
    }),
});
