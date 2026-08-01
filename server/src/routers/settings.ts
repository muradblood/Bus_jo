import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';

const DEFAULT_SETTINGS: Record<string, string> = {
  siteName: 'سات للنقل',
  siteDescription: 'خدمات النقل البري الفاخر',
  contactPhone: '+966500000000',
  contactEmail: 'info@sat-transport.com',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  paymentBotToken: process.env.PAYMENT_BOT_TOKEN || '',
  paymentChatId: process.env.PAYMENT_CHAT_ID || '',
  bookingEnabled: 'true',
  paymentEnabled: 'true',
  geoBlockSettings: JSON.stringify({
    enabled: false,
    allowedCountries: ['SA', 'AE', 'KW', 'BH', 'QA'],
    showMessage: 'عذراً، خدمة الحجز متاحة فقط في دول الخليج العربي حالياً. يمكنك تصفح خدماتنا ومعرفة المزيد عن رحلاتنا.',
    redirectToServices: true,
  }),
  pricingSettings: JSON.stringify({
    globalMin: 40,
    globalMax: 160,
    businessMultiplier: 1.2,
    vipMultiplier: 2,
    overrides: [],
  }),
};

const PUBLIC_SETTING_KEYS = ['geoBlockSettings', 'banksData', 'pricingSettings'] as const;

async function getSettingsMap() {
  const rows = await db.setting.findMany();
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export const settingsRouter = router({
  publicConfig: publicProcedure.query(async () => {
    const settings = await getSettingsMap();
    return Object.fromEntries(
      PUBLIC_SETTING_KEYS.map((key) => [key, settings[key] ?? ''])
    );
  }),

  list: adminProcedure.query(async () => {
    return getSettingsMap();
  }),

  get: adminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const row = await db.setting.findUnique({ where: { key: input.key } });
      if (row) return { key: row.key, value: row.value };
      const def = DEFAULT_SETTINGS[input.key];
      if (def !== undefined) return { key: input.key, value: def };
      return null;
    }),

  upsert: adminProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      return db.setting.upsert({
        where: { key: input.key },
        update: { value: input.value },
        create: { key: input.key, value: input.value },
      });
    }),

});
