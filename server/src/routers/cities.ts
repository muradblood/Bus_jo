import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';
import {
  TRANSPORT_CITY_CATALOG,
  canonicalTransportCityName,
  normalizeTransportCityName,
  resolveTransportCity,
} from '../data/transportCities.js';

let citiesSeedPromise: Promise<void> | null = null;

async function runInChunks<T>(items: T[], chunkSize: number, worker: (item: T) => Promise<unknown>) {
  for (let index = 0; index < items.length; index += chunkSize) {
    await Promise.all(items.slice(index, index + chunkSize).map(worker));
  }
}

export async function ensureCitiesSeeded(): Promise<void> {
  if (!citiesSeedPromise) {
    citiesSeedPromise = (async () => {
      const existing = await db.city.findMany();
      const existingNames = new Set(existing.map(city => normalizeTransportCityName(city.name)));
      const missing = TRANSPORT_CITY_CATALOG.filter(
        city => !existingNames.has(normalizeTransportCityName(city.name)),
      );

      // Turso is network-backed on Vercel. Seed missing rows in bounded parallel
      // chunks so a fresh database does not require hundreds of serial round trips.
      await runInChunks(missing, 12, async city => {
        await db.city.create({
          data: {
            name: city.name,
            lat: city.lat,
            lng: city.lng,
            region: city.region,
            country: city.country,
          },
        });
      });
    })().catch((error) => {
      citiesSeedPromise = null;
      throw error;
    });
  }
  await citiesSeedPromise;
}

export async function listCities() {
  await ensureCitiesSeeded();
  const rows = await db.city.findMany({ orderBy: { name: 'asc' } });
  return rows.map(city => {
    const metadata = resolveTransportCity(city.name);
    return {
      ...city,
      isMain: metadata?.isMain ?? false,
      terminals: metadata?.terminals ?? [],
      aliases: metadata?.aliases ?? [],
      code: metadata?.code ?? `CUSTOM-${city.id}`,
    };
  });
}

export const citiesRouter = router({
  list: publicProcedure.query(async () => listCities()),

  search: publicProcedure
    .input(z.object({ query: z.string().max(120) }))
    .query(async ({ input }) => {
      const q = normalizeTransportCityName(input.query);
      const cities = await listCities();
      return cities.filter(city => {
        const values = [city.name, city.region, city.country, ...city.aliases];
        return values.some(value => normalizeTransportCityName(value).includes(q));
      });
    }),

  autoComplete: publicProcedure
    .input(z.object({ query: z.string().max(120) }))
    .query(async ({ input }) => {
      const cities = await listCities();
      const q = normalizeTransportCityName(input.query);
      if (!q) return cities.slice(0, 10);
      return cities.filter(city => {
        const values = [city.name, city.region, city.country, ...city.aliases];
        return values.some(value => normalizeTransportCityName(value).includes(q));
      }).slice(0, 10);
    }),

  resolve: publicProcedure
    .input(z.object({ name: z.string().trim().min(1).max(120) }))
    .query(({ input }) => {
      const city = resolveTransportCity(input.name);
      return city
        ? {
            name: city.name,
            region: city.region,
            country: city.country,
            terminals: city.terminals,
            aliases: city.aliases ?? [],
            isMain: city.isMain,
          }
        : { name: canonicalTransportCityName(input.name) };
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().trim().min(2).max(120),
      region: z.string().trim().max(120).default(''),
      country: z.string().trim().max(120).default('السعودية'),
      lat: z.number().finite().min(-90).max(90),
      lng: z.number().finite().min(-180).max(180),
    }).refine(input => input.lat !== 0 || input.lng !== 0, {
      message: 'يجب إدخال إحداثيات فعلية للمدينة',
      path: ['lat'],
    }))
    .mutation(async ({ input }) => {
      await ensureCitiesSeeded();
      const canonicalName = canonicalTransportCityName(input.name);
      const duplicate = (await db.city.findMany()).find(
        city => normalizeTransportCityName(city.name) === normalizeTransportCityName(canonicalName),
      );
      if (duplicate) {
        throw new TRPCError({ code: 'CONFLICT', message: 'المدينة موجودة مسبقاً' });
      }
      return db.city.create({ data: { ...input, name: canonicalName } });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.city.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
