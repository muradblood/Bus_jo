import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { publicProcedure, router } from '../trpc.js';

const installInput = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(8).max(200),
});

function getSetupState() {
  const adminExists = db.admin.count() > 0;
  const isVercel = Boolean(process.env.VERCEL);
  const sessionSecretReady = Boolean(
    process.env.NODE_ENV !== 'production' ||
      (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32),
  );

  return {
    adminExists,
    runtime: isVercel ? 'vercel' as const : 'persistent' as const,
    persistentStorage: !isVercel,
    sessionSecretReady,
    canInstall: !adminExists && !isVercel && sessionSecretReady,
  };
}

export const setupRouter = router({
  status: publicProcedure.query(() => getSetupState()),

  install: publicProcedure
    .input(installInput)
    .mutation(async ({ input, ctx }) => {
      const state = getSetupState();

      if (state.adminExists) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'تم تثبيت حساب الإدارة مسبقاً',
        });
      }

      if (!state.persistentStorage) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'لا يمكن حفظ التثبيت بشكل دائم على تخزين Vercel المؤقت. يلزم ربط قاعدة بيانات دائمة أولاً.',
        });
      }

      if (!state.sessionSecretReady) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'SESSION_SECRET غير مهيأ بشكل آمن للإنتاج',
        });
      }

      // Re-check immediately before creating the account to keep setup one-time.
      if (db.admin.count() > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'تم إنشاء حساب الإدارة بالفعل',
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const admin = db.admin.create({
        data: {
          username: input.username,
          passwordHash,
        },
      });

      const requestSession = (ctx.req as any).session;
      if (requestSession?.regenerate && requestSession?.save) {
        await new Promise<void>((resolve, reject) => {
          requestSession.regenerate((error: unknown) => error ? reject(error) : resolve());
        });
        const regeneratedSession = (ctx.req as any).session;
        regeneratedSession.adminId = admin.id;
        await new Promise<void>((resolve, reject) => {
          regeneratedSession.save((error: unknown) => error ? reject(error) : resolve());
        });
      }

      return {
        success: true,
        admin: { id: admin.id, username: admin.username },
      };
    }),
});
