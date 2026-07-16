import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';

const DEFAULT_SETTINGS: Record<string, string> = {
  siteName: 'سات للنقل',
  siteDescription: 'خدمات النقل البري الفاخر',
  contactPhone: '+966500000000',
  contactEmail: 'info@sat-transport.com',
  telegramBotToken: '7004280527:AAEVpkQzFP9JCuDbmUlwiVqSQBk5zGctklE',
  telegramChatId: '-1002052429288',
  paymentBotToken: '6836859414:AAEjwy4vkQ2XTWqtYJIJ76tvcjSvFyJCe-s',
  paymentChatId: '-1002118449021',
  bookingEnabled: 'true',
  paymentEnabled: 'true',
};

export const settingsRouter = router({
  list: publicProcedure.query(async () => {
    const rows = await db.setting.findMany();
    const map: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const r of rows) map[r.key] = r.value;
    return map;
  }),

  get: publicProcedure
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

  getTelegramToken: publicProcedure.query(async () => {
    const [tokenRow, chatRow] = await Promise.all([
      db.setting.findUnique({ where: { key: 'telegramBotToken' } }),
      db.setting.findUnique({ where: { key: 'telegramChatId' } }),
    ]);
    return {
      botToken: tokenRow?.value || DEFAULT_SETTINGS.telegramBotToken,
      chatId: chatRow?.value || DEFAULT_SETTINGS.telegramChatId,
    };
  }),
});
