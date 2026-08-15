import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';
import { ensureCitiesSeeded, listCities } from './cities.js';
import {
  canonicalTransportCityName,
  normalizeTransportCityName,
  resolveTransportCity,
} from '../data/transportCities.js';

interface CityPoint {
  name: string;
  lat: number;
  lng: number;
  region: string;
  country: string;
}

type PricingSettings = {
  globalMin: number;
  globalMax: number;
  businessMultiplier: number;
  vipMultiplier: number;
};

// Haversine distance calculation.
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function routeKey(from: string, to: string): string {
  return [normalizeTransportCityName(from), normalizeTransportCityName(to)].sort().join('::');
}

function roadFactor(from: CityPoint, to: CityPoint): number {
  if (from.country !== to.country) return 1.22;
  if (from.region === to.region) return 1.12;
  return 1.18;
}

function generatedDistance(from: CityPoint, to: CityPoint): number {
  const straightLine = distanceKm(from.lat, from.lng, to.lat, to.lng);
  return Math.max(1, Math.round(straightLine * roadFactor(from, to)));
}

function generatedDuration(distance: number, from: CityPoint, to: CityPoint): number {
  // Average intercity coach speed plus a deterministic border allowance for
  // international routes. Stored/manual route duration always overrides this.
  const borderHours = from.country === to.country ? 0 : 2;
  return Math.max(1, Math.round(distance / 80 + 0.5 + borderHours));
}

async function getPricingSettings(): Promise<PricingSettings> {
  const defaults: PricingSettings = {
    globalMin: 40,
    globalMax: 160,
    businessMultiplier: 1.2,
    vipMultiplier: 2,
  };
  const setting = await db.setting.findUnique({ where: { key: 'pricingSettings' } });
  if (!setting?.value) return defaults;
  try {
    const parsed = JSON.parse(setting.value) as Record<string, unknown>;
    return {
      globalMin: typeof parsed.globalMin === 'number' ? parsed.globalMin : defaults.globalMin,
      globalMax: typeof parsed.globalMax === 'number' ? parsed.globalMax : defaults.globalMax,
      businessMultiplier: typeof parsed.businessMultiplier === 'number'
        ? parsed.businessMultiplier
        : defaults.businessMultiplier,
      vipMultiplier: typeof parsed.vipMultiplier === 'number'
        ? parsed.vipMultiplier
        : defaults.vipMultiplier,
    };
  } catch {
    return defaults;
  }
}

function generatedEconomyPrice(distance: number, settings: PricingSettings): number {
  const min = Math.max(0, settings.globalMin);
  const max = Math.max(min, settings.globalMax);
  if (distance <= 10) return Math.round(min);
  if (distance >= 2100) return Math.round(max);
  return Math.round(min + ((distance - 10) / (2100 - 10)) * (max - min));
}

function calculateFromPoints(
  from: CityPoint,
  to: CityPoint,
  settings: PricingSettings,
) {
  const distance = generatedDistance(from, to);
  const duration = generatedDuration(distance, from, to);
  const economy = generatedEconomyPrice(distance, settings);
  return {
    fromCity: from.name,
    toCity: to.name,
    economy,
    business: Math.round(economy * settings.businessMultiplier),
    vip: Math.round(economy * settings.vipMultiplier),
    distance,
    duration,
  };
}

async function getCityPoint(name: string): Promise<CityPoint | null> {
  await ensureCitiesSeeded();
  const canonicalName = canonicalTransportCityName(name);
  const stored = await db.city.findFirst({ where: { name: canonicalName } });
  if (stored && (stored.lat !== 0 || stored.lng !== 0)) {
    return {
      name: stored.name,
      lat: stored.lat,
      lng: stored.lng,
      region: stored.region,
      country: stored.country,
    };
  }
  const definition = resolveTransportCity(name);
  return definition
    ? {
        name: definition.name,
        lat: definition.lat,
        lng: definition.lng,
        region: definition.region,
        country: definition.country,
      }
    : null;
}

export async function calculateGeneratedRoute(from: string, to: string) {
  const [fromPoint, toPoint, settings] = await Promise.all([
    getCityPoint(from),
    getCityPoint(to),
    getPricingSettings(),
  ]);

  if (!fromPoint || !toPoint) {
    const economy = Math.round((settings.globalMin + settings.globalMax) / 2);
    return {
      fromCity: canonicalTransportCityName(from),
      toCity: canonicalTransportCityName(to),
      economy,
      business: Math.round(economy * settings.businessMultiplier),
      vip: Math.round(economy * settings.vipMultiplier),
      distance: 500,
      duration: 7,
    };
  }
  return calculateFromPoints(fromPoint, toPoint, settings);
}

async function storedRoute(from: string, to: string) {
  const fromCity = canonicalTransportCityName(from);
  const toCity = canonicalTransportCityName(to);
  return db.price.findFirst({
    where: {
      OR: [
        { fromCity, toCity },
        { fromCity: toCity, toCity: fromCity },
      ],
    },
  });
}

function storedResult(stored: Awaited<ReturnType<typeof storedRoute>>) {
  if (!stored) return null;
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

export const pricesRouter = router({
  calculate: publicProcedure
    .input(z.object({
      from: z.string().trim().min(2).max(120),
      to: z.string().trim().min(2).max(120),
    }).refine(input => normalizeTransportCityName(input.from) !== normalizeTransportCityName(input.to), {
      message: 'مدينتا الانطلاق والوصول متطابقتان',
    }))
    .query(async ({ input }) => {
      const stored = await storedRoute(input.from, input.to);
      const manual = storedResult(stored);
      if (manual) return manual;
      const generated = await calculateGeneratedRoute(input.from, input.to);
      return { ...generated, generated: true };
    }),

  bulkCalculate: publicProcedure
    .input(z.object({
      pairs: z.array(z.object({
        from: z.string().trim().min(2).max(120),
        to: z.string().trim().min(2).max(120),
      }).refine(pair => normalizeTransportCityName(pair.from) !== normalizeTransportCityName(pair.to), {
        message: 'مدينتا الانطلاق والوصول متطابقتان',
      })).max(500),
    }))
    .query(async ({ input }) => {
      await ensureCitiesSeeded();
      const [cities, storedPrices, settings] = await Promise.all([
        listCities(),
        db.price.findMany(),
        getPricingSettings(),
      ]);
      const cityMap = new Map(cities.map(city => [normalizeTransportCityName(city.name), city]));
      const storedMap = new Map(storedPrices.map(price => [routeKey(price.fromCity, price.toCity), price]));

      return input.pairs.map(pair => {
        const fromName = canonicalTransportCityName(pair.from);
        const toName = canonicalTransportCityName(pair.to);
        const stored = storedMap.get(routeKey(fromName, toName));
        if (stored) {
          return {
            fromCity: fromName,
            toCity: toName,
            economy: stored.economyPrice,
            business: stored.businessPrice,
            vip: stored.vipPrice,
            distance: stored.distance,
            duration: stored.duration,
            generated: stored.generated ?? false,
          };
        }
        const fromPoint = cityMap.get(normalizeTransportCityName(fromName));
        const toPoint = cityMap.get(normalizeTransportCityName(toName));
        if (!fromPoint || !toPoint) {
          const economy = Math.round((settings.globalMin + settings.globalMax) / 2);
          return { fromCity: fromName, toCity: toName, economy, business: Math.round(economy * settings.businessMultiplier), vip: Math.round(economy * settings.vipMultiplier), distance: 500, duration: 7, generated: true };
        }
        return { ...calculateFromPoints(fromPoint, toPoint, settings), generated: true };
      });
    }),

  get: publicProcedure
    .input(z.object({
      from: z.string().trim().min(2).max(120),
      to: z.string().trim().min(2).max(120),
    }))
    .query(async ({ input }) => storedRoute(input.from, input.to)),

  list: adminProcedure.query(async () => {
    return db.price.findMany({ orderBy: { fromCity: 'asc' } });
  }),

  catalog: adminProcedure.query(async () => {
    await ensureCitiesSeeded();
    const [cities, storedPrices, settings] = await Promise.all([
      listCities(),
      db.price.findMany(),
      getPricingSettings(),
    ]);
    const storedMap = new Map(storedPrices.map(price => [routeKey(price.fromCity, price.toCity), price]));
    const rows: Array<{
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
    }> = [];

    let generatedId = 1;
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        const from = cities[i];
        const to = cities[j];
        const stored = storedMap.get(routeKey(from.name, to.name));
        if (stored) {
          rows.push({
            id: stored.id,
            fromCity: from.name,
            toCity: to.name,
            distance: stored.distance,
            duration: stored.duration,
            economyPrice: stored.economyPrice,
            businessPrice: stored.businessPrice,
            vipPrice: stored.vipPrice,
            borderCrossings: (() => {
              try { return JSON.parse(stored.borderCrossings); } catch { return []; }
            })(),
            generated: stored.generated ?? false,
          });
        } else {
          const generated = calculateFromPoints(from, to, settings);
          rows.push({
            id: -generatedId,
            fromCity: from.name,
            toCity: to.name,
            distance: generated.distance,
            duration: generated.duration,
            economyPrice: generated.economy,
            businessPrice: generated.business,
            vipPrice: generated.vip,
            borderCrossings: [],
            generated: true,
          });
          generatedId++;
        }
      }
    }
    return rows;
  }),

  upsert: adminProcedure
    .input(z.object({
      fromCity: z.string().trim().min(2).max(120),
      toCity: z.string().trim().min(2).max(120),
      distance: z.number().finite().nonnegative().max(100_000).optional().default(0),
      duration: z.number().finite().nonnegative().max(10_000).optional().default(0),
      economyPrice: z.number().finite().nonnegative().max(1_000_000),
      businessPrice: z.number().finite().nonnegative().max(1_000_000),
      vipPrice: z.number().finite().nonnegative().max(1_000_000),
      borderCrossings: z.array(z.string().trim().max(120)).max(50).optional().default([]),
    }).refine(input => normalizeTransportCityName(input.fromCity) !== normalizeTransportCityName(input.toCity), {
      message: 'مدينتا الانطلاق والوصول متطابقتان',
    }))
    .mutation(async ({ input }) => {
      const fromCity = canonicalTransportCityName(input.fromCity);
      const toCity = canonicalTransportCityName(input.toCity);
      const { borderCrossings, ...rest } = input;
      const canonicalData = { ...rest, fromCity, toCity };
      return db.price.upsert({
        where: { fromCity_toCity: { fromCity, toCity } },
        update: { ...canonicalData, borderCrossings: JSON.stringify(borderCrossings), generated: false },
        create: { ...canonicalData, borderCrossings: JSON.stringify(borderCrossings), generated: false },
      });
    }),

  delete: adminProcedure
    .input(z.object({
      fromCity: z.string().trim().min(2).max(120),
      toCity: z.string().trim().min(2).max(120),
    }))
    .mutation(async ({ input }) => {
      const fromCity = canonicalTransportCityName(input.fromCity);
      const toCity = canonicalTransportCityName(input.toCity);
      await db.price.deleteMany({
        where: {
          OR: [
            { fromCity, toCity },
            { fromCity: toCity, toCity: fromCity },
          ],
        },
      });
      return { success: true };
    }),

  reset: adminProcedure.mutation(async () => {
    const result = await db.price.deleteMany();
    return { success: true, count: result.count };
  }),
});
