import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';

// Saudi + Gulf cities data (subset for server-side)
const CITIES = [
  { name: 'الرياض', lat: 24.7136, lng: 46.6753, region: 'الرياض', country: 'السعودية' },
  { name: 'جدة', lat: 21.5433, lng: 39.1728, region: 'مكة المكرمة', country: 'السعودية' },
  { name: 'مكة المكرمة', lat: 21.3891, lng: 39.8579, region: 'مكة المكرمة', country: 'السعودية' },
  { name: 'المدينة المنورة', lat: 24.4672, lng: 39.6024, region: 'المدينة المنورة', country: 'السعودية' },
  { name: 'الدمام', lat: 26.4207, lng: 50.0888, region: 'الشرقية', country: 'السعودية' },
  { name: 'الخبر', lat: 26.2172, lng: 50.1971, region: 'الشرقية', country: 'السعودية' },
  { name: 'الظهران', lat: 26.2361, lng: 50.1113, region: 'الشرقية', country: 'السعودية' },
  { name: 'الأحساء', lat: 25.3622, lng: 49.5657, region: 'الشرقية', country: 'السعودية' },
  { name: 'الجبيل', lat: 27.0117, lng: 49.6583, region: 'الشرقية', country: 'السعودية' },
  { name: 'القطيف', lat: 26.5510, lng: 50.0035, region: 'الشرقية', country: 'السعودية' },
  { name: 'أبها', lat: 18.2171, lng: 42.5053, region: 'عسير', country: 'السعودية' },
  { name: 'خميس مشيط', lat: 18.3064, lng: 42.7350, region: 'عسير', country: 'السعودية' },
  { name: 'جازان', lat: 16.8892, lng: 42.5511, region: 'جازان', country: 'السعودية' },
  { name: 'ينبع', lat: 24.0891, lng: 38.0637, region: 'المدينة المنورة', country: 'السعودية' },
  { name: 'الطائف', lat: 21.2854, lng: 40.4258, region: 'مكة المكرمة', country: 'السعودية' },
  { name: 'تبوك', lat: 28.3835, lng: 36.5662, region: 'تبوك', country: 'السعودية' },
  { name: 'حائل', lat: 27.5219, lng: 41.6961, region: 'حائل', country: 'السعودية' },
  { name: 'نجران', lat: 17.5656, lng: 44.2289, region: 'نجران', country: 'السعودية' },
  { name: 'بريدة', lat: 26.3260, lng: 43.9750, region: 'القصيم', country: 'السعودية' },
  { name: 'عنيزة', lat: 26.0844, lng: 44.1311, region: 'القصيم', country: 'السعودية' },
  { name: 'الباحة', lat: 20.0125, lng: 41.4653, region: 'الباحة', country: 'السعودية' },
  { name: 'سكاكا', lat: 29.9697, lng: 40.2064, region: 'الجوف', country: 'السعودية' },
  { name: 'عرعر', lat: 30.9753, lng: 41.0381, region: 'الحدود الشمالية', country: 'السعودية' },
  { name: 'دبي', lat: 25.2048, lng: 55.2708, region: 'دبي', country: 'الإمارات' },
  { name: 'أبوظبي', lat: 24.4539, lng: 54.3773, region: 'أبوظبي', country: 'الإمارات' },
  { name: 'الشارقة', lat: 25.3463, lng: 55.4209, region: 'الشارقة', country: 'الإمارات' },
  { name: 'الكويت العاصمة', lat: 29.3759, lng: 47.9774, region: 'العاصمة', country: 'الكويت' },
  { name: 'المنامة', lat: 26.2285, lng: 50.5860, region: 'العاصمة', country: 'البحرين' },
  { name: 'مسقط', lat: 23.5859, lng: 58.4059, region: 'مسقط', country: 'عمان' },
  { name: 'الدوحة', lat: 25.2854, lng: 51.5310, region: 'الدوحة', country: 'قطر' },
  { name: 'عمان', lat: 31.9539, lng: 35.9106, region: 'العاصمة', country: 'الأردن' },
  { name: 'القاهرة', lat: 30.0444, lng: 31.2357, region: 'القاهرة', country: 'مصر' },
  { name: 'بيروت', lat: 33.8938, lng: 35.5018, region: 'بيروت', country: 'لبنان' },
  { name: 'دمشق', lat: 33.5138, lng: 36.2765, region: 'دمشق', country: 'سوريا' },
  { name: 'بغداد', lat: 33.3128, lng: 44.3615, region: 'بغداد', country: 'العراق' },
];

export const citiesRouter = router({
  list: publicProcedure.query(async () => {
    return CITIES;
  }),

  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const q = input.query.toLowerCase();
      return CITIES.filter(c =>
        c.name.includes(input.query) ||
        c.region.includes(input.query) ||
        c.country.includes(input.query)
      );
    }),

  autoComplete: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      if (!input.query.trim()) return CITIES.slice(0, 10);
      return CITIES.filter(c =>
        c.name.includes(input.query) ||
        c.region.includes(input.query)
      ).slice(0, 10);
    }),
});
