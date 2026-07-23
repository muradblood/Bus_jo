import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';
import { emitNewBooking, emitBookingStatusChanged } from '../socket.js';

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
      const booking = await db.booking.create({ data: input });
      // Notify admin dashboard in real-time
      emitNewBooking(booking as unknown as Record<string, unknown>);
      return booking;
    }),

  updateStep: publicProcedure
    .input(z.object({
      id: z.number(),
      selectedTrip: z.string().optional(),
      selectedFare: z.string().optional(),
      selectedSeats: z.string().optional(),
      passengerName: z.string().optional(),
      passengerPhone: z.string().optional(),
      paymentMethod: z.string().optional(),
      paymentStatus: z.string().optional(),
      totalAmount: z.number().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const update: Record<string, unknown> = {};
      if (data.selectedTrip !== undefined) update.selectedTrip = data.selectedTrip;
      if (data.selectedFare !== undefined) update.fareClass = data.selectedFare;
      if (data.selectedSeats !== undefined) update.selectedSeats = data.selectedSeats;
      if (data.passengerName !== undefined) update.passengerName = data.passengerName;
      if (data.passengerPhone !== undefined) update.passengerPhone = data.passengerPhone;
      if (data.paymentMethod !== undefined) update.paymentMethod = data.paymentMethod;
      if (data.paymentStatus !== undefined) update.paymentStatus = data.paymentStatus;
      if (data.totalAmount !== undefined) update.totalAmount = data.totalAmount;
      if (data.status !== undefined) {
        update.status = data.status;
        emitBookingStatusChanged({ id, status: data.status });
      }
      const booking = await db.booking.update({ where: { id }, data: update });
      return booking;
    }),

  list: adminProcedure.query(async () => {
    return db.booking.findMany({ orderBy: { createdAt: 'desc' } });
  }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.booking.findUnique({ where: { id: input.id } });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.booking.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
