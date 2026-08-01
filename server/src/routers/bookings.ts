import { z } from 'zod';
import { randomBytes } from 'crypto';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';
import { emitNewBooking } from '../socket.js';
import { calculateGeneratedRoute } from './prices.js';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateOnly = (dateStr: string) => {
  if (!DATE_ONLY_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const getTodayDateOnly = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const bookingCreateInput = z.object({
  tripType: z.string().optional().default('one-way'),
  fromLocation: z.string(),
  toLocation: z.string(),
  pickupDate: z.string(),
  pickupTime: z.string().optional().default('10:00'),
  returnDate: z.string().optional(),
  returnTime: z.string().optional(),
  passengers: z.number().optional().default(1),
  adults: z.number().optional().default(1),
  children: z.number().optional().default(0),
  infants: z.number().optional().default(0),
}).superRefine((input, ctx) => {
  const today = getTodayDateOnly();

  if (!isValidDateOnly(input.pickupDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pickupDate'],
      message: 'pickupDate must be a valid YYYY-MM-DD date',
    });
    return;
  }

  if (input.pickupDate < today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pickupDate'],
      message: 'pickupDate cannot be in the past',
    });
  }

  if (input.tripType === 'round-trip' && !input.returnDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['returnDate'],
      message: 'returnDate is required for round-trip bookings',
    });
    return;
  }

  if (input.returnDate) {
    if (!isValidDateOnly(input.returnDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['returnDate'],
        message: 'returnDate must be a valid YYYY-MM-DD date',
      });
      return;
    }

    if (input.returnDate < input.pickupDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['returnDate'],
        message: 'returnDate cannot be earlier than pickupDate',
      });
    }
  }
});

export const bookingsRouter = router({
  create: publicProcedure
    .input(bookingCreateInput)
    .mutation(async ({ input }) => {
      const booking = await db.booking.create({
        data: {
          ...input,
          accessToken: randomBytes(24).toString('hex'),
          paymentStatus: 'pending',
          totalAmount: 0,
          status: 'new',
          isNew: true,
        },
      });
      // Notify admin dashboard in real-time
      emitNewBooking(booking as unknown as Record<string, unknown>);
      return booking;
    }),

  updateStep: publicProcedure
    .input(z.object({
      id: z.number(),
      accessToken: z.string().length(48),
      selectedTrip: z.string().optional(),
      selectedFare: z.string().optional(),
      selectedSeats: z.string().optional(),
      passengerName: z.string().optional(),
      passengerPhone: z.string().optional(),
      paymentMethod: z.string().optional(),
      paymentStatus: z.literal('pending').optional(),
      totalAmount: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, accessToken, ...data } = input;
      const current = db.booking.findUnique({ where: { id } });
      if (!current || !current.accessToken || current.accessToken !== accessToken) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'تعذر التحقق من صلاحية الحجز' });
      }
      const update: Record<string, unknown> = {};
      if (data.selectedTrip !== undefined) update.selectedTrip = data.selectedTrip;
      if (data.selectedFare !== undefined) update.fareClass = data.selectedFare;
      if (data.selectedSeats !== undefined) update.selectedSeats = data.selectedSeats;
      if (data.passengerName !== undefined) update.passengerName = data.passengerName;
      if (data.passengerPhone !== undefined) update.passengerPhone = data.passengerPhone;
      if (data.paymentMethod !== undefined) update.paymentMethod = data.paymentMethod;
      if (data.paymentStatus !== undefined) update.paymentStatus = data.paymentStatus;
      if (data.totalAmount !== undefined) {
        const storedPrice = db.price.findFirst({
          where: {
            OR: [
              { fromCity: current.fromLocation, toCity: current.toLocation },
              { fromCity: current.toLocation, toCity: current.fromLocation },
            ],
          },
        });
        const generated = calculateGeneratedRoute(current.fromLocation, current.toLocation);
        const economy = storedPrice?.economyPrice ?? generated.economy;
        const business = storedPrice?.businessPrice ?? generated.business;
        const vip = storedPrice?.vipPrice ?? generated.vip;
        const fare = String(data.selectedFare ?? current.fareClass ?? 'economy').toLowerCase();
        const passengerBase = fare === 'vip' ? vip : fare === 'business' ? business : economy;
        const adults = current.adults || current.passengers || 1;
        const children = current.children || 0;
        const infants = current.infants || 0;
        const subtotal = adults * passengerBase + children * passengerBase * 0.5 + infants * passengerBase * 0.25;
        const withVat = Math.ceil(subtotal * 1.15 * 100) / 100;
        update.totalAmount = current.tripType === 'round-trip' ? Math.floor(withVat * 0.85) : withVat;
      }
      const booking = await db.booking.update({ where: { id }, data: update });
      return booking;
    }),

  list: adminProcedure.query(async () => {
    return db.booking.findMany({ orderBy: { createdAt: 'desc' } });
  }),

  get: publicProcedure
    .input(z.object({ id: z.number(), accessToken: z.string().length(48) }))
    .query(async ({ input }) => {
      const booking = db.booking.findUnique({ where: { id: input.id } });
      if (!booking || !booking.accessToken || booking.accessToken !== input.accessToken) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الحجز غير موجود' });
      }
      return booking;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.booking.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
