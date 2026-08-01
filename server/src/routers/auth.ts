import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db } from '../db.js';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';

// Default admin credentials
const DEFAULT_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'sat123';

async function ensureDefaultAdmin() {
  const count = await db.admin.count();
  if (count === 0) {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    await db.admin.create({
      data: { username: DEFAULT_USERNAME, passwordHash },
    });
  }
}

export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    const adminId = (ctx.req as any).session?.adminId;
    if (!adminId) return null;
    const admin = await db.admin.findUnique({ where: { id: adminId } });
    if (!admin) return null;
    return { id: admin.id, username: admin.username };
  }),

  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ensureDefaultAdmin();
      const admin = await db.admin.findUnique({ where: { username: input.username } });
      if (!admin || !(await bcrypt.compare(input.password, admin.passwordHash))) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      }
      (ctx.req as any).session.adminId = admin.id;
      return { id: admin.id, username: admin.username };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    (ctx.req as any).session.destroy?.();
    return { success: true };
  }),

  changePassword: publicProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      const adminId = (ctx.req as any).session?.adminId;
      if (!adminId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول أولاً' });
      }

      const admin = await db.admin.findUnique({ where: { id: adminId } });
      if (!admin || !(await bcrypt.compare(input.currentPassword, admin.passwordHash))) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'كلمة المرور الحالية غير صحيحة' });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, 12);
      await db.admin.update({ where: { id: adminId }, data: { passwordHash } });
      return { success: true };
    }),
});
