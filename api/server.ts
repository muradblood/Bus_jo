import express from 'express';
import cors from 'cors';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { ZodError } from 'zod';
import { appRouter } from '../server/src/routers/index.js';
import { createContext } from '../server/src/context.js';
import { db, databaseBackend, isDurableDatabaseConfigured } from '../server/src/db.js';
import { sendBookingNotification, sendPaymentNotification } from '../server/src/telegramNotifications.js';

const SESSION_SECRET = process.env.SESSION_SECRET || '';
const NODE_ENV = process.env.NODE_ENV || 'production';
const SESSION_COOKIE = 'sat_admin_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const SESSION_READY = SESSION_SECRET.length >= 32;

const app = express();
const notificationRate = new Map<string, { count: number; resetAt: number }>();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      ...(process.env.ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean) ?? []),
    ];
    if (allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

app.get(['/health', '/api/health'], (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    runtime: 'vercel',
    sessionReady: SESSION_READY,
    databaseReady: isDurableDatabaseConfigured(),
    databaseBackend,
  });
});

app.use('/api/notifications', (req, res, next) => {
  const fetchSite = req.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    res.status(403).json({ success: false, message: 'Notification origin is not allowed' });
    return;
  }

  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const current = notificationRate.get(key);
  if (!current || current.resetAt <= now) {
    notificationRate.set(key, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  if (current.count >= 30) {
    res.status(429).json({ success: false, message: 'Too many notification events' });
    return;
  }
  current.count += 1;
  next();
});

app.post('/api/notifications/booking', async (req, res) => {
  try {
    const sent = await sendBookingNotification(req.body);
    res.json({ success: true, sent });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, message: 'Invalid notification event' });
      return;
    }
    res.status(502).json({ success: false, message: 'Notification service unavailable' });
  }
});

app.post('/api/notifications/payment', async (req, res) => {
  try {
    const sent = await sendPaymentNotification(req.body);
    res.json({ success: true, sent });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, message: 'Invalid notification event' });
      return;
    }
    res.status(502).json({ success: false, message: 'Notification service unavailable' });
  }
});

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function signPayload(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

function encodeSession(adminId: number): string {
  const payload = Buffer.from(JSON.stringify({
    adminId,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  })).toString('base64url');
  return `${payload}.${signPayload(payload)}`;
}

function decodeSession(token: string | undefined): { adminId: number } | null {
  if (!SESSION_READY || !token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      adminId?: number;
      exp?: number;
    };
    if (!Number.isInteger(parsed.adminId) || !parsed.adminId || !parsed.exp || parsed.exp <= Date.now()) return null;
    return { adminId: parsed.adminId };
  } catch {
    return null;
  }
}

function sessionCookie(value: string, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): string {
  const secure = NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

app.use(async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const decoded = decodeSession(cookies[SESSION_COOKIE]);

    let adminId: number | undefined;
    if (decoded?.adminId) {
      const admin = await db.admin.findUnique({ where: { id: decoded.adminId } });
      if (admin) adminId = admin.id;
    }

    const sessionState: {
      adminId?: number;
      regenerate: (callback: (error?: unknown) => void) => void;
      save: (callback: (error?: unknown) => void) => void;
      destroy: (callback: (error?: unknown) => void) => void;
    } = {
      adminId,
      regenerate(callback) {
        delete sessionState.adminId;
        callback();
      },
      save(callback) {
        try {
          if (!sessionState.adminId || !SESSION_READY) {
            res.setHeader('Set-Cookie', sessionCookie('', 0));
          } else {
            res.setHeader('Set-Cookie', sessionCookie(encodeSession(sessionState.adminId)));
          }
          callback();
        } catch (error) {
          callback(error);
        }
      },
      destroy(callback) {
        delete sessionState.adminId;
        res.setHeader('Set-Cookie', sessionCookie('', 0));
        callback();
      },
    };

    (req as typeof req & { session?: typeof sessionState }).session = sessionState;
    next();
  } catch (error) {
    next(error);
  }
});

app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => createContext({ req, res }),
  })
);

export default app;
