import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db } from '../db.js';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;
const loginFailures = new Map<string, { count: number; resetAt: number }>();

function getLoginFailure(ip: string) {
  const current = loginFailures.get(ip);
  if (!current || current.resetAt <= Date.now()) {
    loginFailures.delete(ip);
    return null;
  }
  return current;
}

function recordLoginFailure(ip: string) {
  const current = getLoginFailure(ip);
  loginFailures.set(ip, current
    ? { ...current, count: current.count + 1 }
    : { count: 1, resetAt: Date.now() + LOGIN_WINDOW_MS });
}

function assertLoginAllowed(ip: string) {
  const current = getLoginFailure(ip);
  if (current && current.count >= MAX_LOGIN_FAILURES) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'محاولات تسجيل دخول كثيرة. يرجى المحاولة لاحقاً',
    });
  }
}

async function ensureDefaultAdmin() {
  const count = await db.admin.count();
  if (count > 0) return;

  const configuredUsername = process.env.ADMIN_USERNAME?.trim();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === 'production' && (!configuredUsername || !configuredPassword)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'تعذر تهيئة حساب الإدارة',
    });
  }

  const username = configuredUsername || 'admin';
  const password = configuredPassword || 'sat123';
  const passwordHash = await bcrypt.hash(password, 12);
  await db.admin.create({
    data: { username, passwordHash },
  });
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
    .input(z.object({
      username: z.string().trim().min(1).max(120),
      password: z.string().min(1).max(200),
    }))
    .mutation(async ({ input, ctx }) => {
      assertLoginAllowed(ctx.clientIp);
      await ensureDefaultAdmin();
      const admin = await db.admin.findUnique({ where: { username: input.username } });
      if (!admin || !(await bcrypt.compare(input.password, admin.passwordHash))) {
        recordLoginFailure(ctx.clientIp);
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      }

      loginFailures.delete(ctx.clientIp);
      const requestSession = (ctx.req as any).session;
      await new Promise<void>((resolve, reject) => {
        requestSession.regenerate((error: unknown) => error ? reject(error) : resolve());
      });
      const regeneratedSession = (ctx.req as any).session;
      regeneratedSession.adminId = admin.id;
      await new Promise<void>((resolve, reject) => {
        regeneratedSession.save((error: unknown) => error ? reject(error) : resolve());
      });
      return { id: admin.id, username: admin.username };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const requestSession = (ctx.req as any).session;
    if (requestSession?.destroy) {
      await new Promise<void>((resolve, reject) => {
        requestSession.destroy((error: unknown) => error ? reject(error) : resolve());
      });
    }
    return { success: true };
  }),

  changePassword: adminProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(200),
    }))
    .mutation(async ({ input, ctx }) => {
      const admin = await db.admin.findUnique({ where: { id: ctx.adminId } });
      if (!admin || !(await bcrypt.compare(input.currentPassword, admin.passwordHash))) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'كلمة المرور الحالية غير صحيحة' });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, 12);
      await db.admin.update({ where: { id: ctx.adminId }, data: { passwordHash } });
      return { success: true };
    }),
});
