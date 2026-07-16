import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';

export const bookingsRouter = router({
  create: publicProcedure
    .input(z.object({
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
    }))
    .mutation(async ({ input }) => {
      const booking = await db.booking.create({ data: input });
      return { id: booking.id, ...booking };
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
      if (data.status !== undefined) update.status = data.status;
      const booking = await db.booking.update({ where: { id }, data: update });
      return { id: booking.id, ...booking };
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
