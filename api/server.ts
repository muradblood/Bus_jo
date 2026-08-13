import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '../server/src/routers/index.js';
import { createContext } from '../server/src/context.js';
import { db } from '../server/src/db.js';

const SESSION_SECRET = process.env.SESSION_SECRET || '';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim() || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const NODE_ENV = process.env.NODE_ENV || 'production';
const SESSION_COOKIE = 'sat_admin_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

if (NODE_ENV === 'production') {
  if (SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters in production');
  }
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD are required in production');
  }
}

const app = express();

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

app.use(express.json());

let adminBootstrapPromise: Promise<number> | null = null;

async function ensureVercelAdmin(): Promise<number> {
  if (!adminBootstrapPromise) {
    adminBootstrapPromise = (async () => {
      const existing = await db.admin.findUnique({ where: { username: ADMIN_USERNAME } });
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

      if (existing) {
        if (!(await bcrypt.compare(ADMIN_PASSWORD, existing.passwordHash))) {
          const updated = await db.admin.update({
            where: { id: existing.id },
            data: { passwordHash },
          });
          return updated.id;
        }
        return existing.id;
      }

      const created = await db.admin.create({
        data: { username: ADMIN_USERNAME, passwordHash },
      });
      return created.id;
    })();
  }
  return adminBootstrapPromise;
}

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

function encodeSession(username: string): string {
  const payload = Buffer.from(JSON.stringify({
    username,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  })).toString('base64url');
  return `${payload}.${signPayload(payload)}`;
}

function decodeSession(token: string | undefined): { username: string } | null {
  if (!token) return null;
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
      username?: string;
      exp?: number;
    };
    if (!parsed.username || !parsed.exp || parsed.exp <= Date.now()) return null;
    return { username: parsed.username };
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
    const adminId = await ensureVercelAdmin();
    const cookies = parseCookies(req.headers.cookie);
    const decoded = decodeSession(cookies[SESSION_COOKIE]);

    const sessionState: {
      adminId?: number;
      regenerate: (callback: (error?: unknown) => void) => void;
      save: (callback: (error?: unknown) => void) => void;
      destroy: (callback: (error?: unknown) => void) => void;
    } = {
      adminId: decoded?.username === ADMIN_USERNAME ? adminId : undefined,
      regenerate(callback) {
        delete sessionState.adminId;
        callback();
      },
      save(callback) {
        try {
          if (!sessionState.adminId) {
            res.setHeader('Set-Cookie', sessionCookie('', 0));
          } else {
            res.setHeader('Set-Cookie', sessionCookie(encodeSession(ADMIN_USERNAME)));
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

app.get(['/health', '/api/health'], (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok', time: new Date().toISOString(), runtime: 'vercel' });
});

export default app;
