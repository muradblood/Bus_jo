import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';
import { emitBookingStatusChanged } from '../socket.js';

export const adminRouter = router({
  stats: adminProcedure.query(async () => {
    const [total, newCount, pending, confirmed, cancelled, revenue] = await Promise.all([
      db.booking.count(),
      db.booking.count({ where: { status: 'new' } }),
      db.booking.count({ where: { status: 'pending' } }),
      db.booking.count({ where: { status: 'confirmed' } }),
      db.booking.count({ where: { status: 'cancelled' } }),
      db.booking.aggregate({ _sum: { totalAmount: true } }),
    ]);
    const unseen = await db.booking.count({ where: { isNew: true } });
    return {
      total,
      new: newCount,
      pending,
      confirmed,
      cancelled,
      unseen,
      revenue: revenue._sum.totalAmount ?? 0,
    };
  }),

  bookings: adminProcedure.query(async () => {
    return db.booking.findMany({ orderBy: { createdAt: 'desc' } });
  }),

  contacts: adminProcedure.query(async () => {
    return db.contact.findMany({ orderBy: { createdAt: 'desc' } });
  }),

  deleteContact: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.contact.delete({ where: { id: input.id } });
      return { success: true };
    }),

  reviews: adminProcedure.query(async () => {
    return db.review.findMany({ orderBy: { createdAt: 'desc' } });
  }),

  deleteReview: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.review.delete({ where: { id: input.id } });
      return { success: true };
    }),

  createNotification: adminProcedure
    .input(z.object({
      title: z.string(),
      message: z.string(),
      type: z.string().optional().default('info'),
    }))
    .mutation(async ({ input }) => {
      return db.notification.create({ data: input });
    }),

  getNotifications: adminProcedure.query(async () => {
    return db.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }),

  markNotificationRead: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.notification.update({ where: { id: input.id }, data: { isRead: true } });
      return { success: true };
    }),

  updateBookingStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.string() }))
    .mutation(async ({ input }) => {
      const booking = await db.booking.update({ where: { id: input.id }, data: { status: input.status } });
      emitBookingStatusChanged({ id: input.id, status: input.status });
      return booking;
    }),

  markBookingSeen: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.booking.update({ where: { id: input.id }, data: { isNew: false } });
      return { success: true };
    }),

  markAllBookingsSeen: adminProcedure
    .mutation(async () => {
      await db.booking.updateMany({ where: { isNew: true }, data: { isNew: false } });
      return { success: true };
    }),
});
