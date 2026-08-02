import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/index.js';
import { createContext } from './context.js';
import { JsonSessionStore } from './sessionStore.js';
import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import { sendBookingNotification, sendPaymentNotification } from './telegramNotifications.js';

export function createSessionMiddleware(): RequestHandler {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const configuredSecret = process.env.SESSION_SECRET;
  if (NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
    throw new Error('SESSION_SECRET must contain at least 32 characters in production');
  }
  const SESSION_SECRET = configuredSecret || 'sat-bus-secret-change-in-production';

  return session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new JsonSessionStore(),
    cookie: {
      secure: NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  });
}

export function createApp(sessionMiddleware = createSessionMiddleware()) {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  for (const configured of [process.env.CORS_ORIGIN, process.env.ALLOWED_ORIGINS]) {
    if (!configured) continue;
    allowedOrigins.push(...configured.split(',').map(origin => origin.trim()).filter(Boolean));
  }
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }

  const app = express();
  const notificationRate = new Map<string, { count: number; resetAt: number }>();

  if (NODE_ENV === 'production') {
    // FastPanel/Nginx terminates HTTPS before forwarding to this process.
    app.set('trust proxy', 1);
  }

  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));

  // Bank logos can be saved as data URLs from the existing admin form.
  app.use(express.json({ limit: '2mb' }));

  app.use(sessionMiddleware);

  app.use('/api/notifications', (req, res, next) => {
    const requestOrigin = req.get('origin');
    const fetchSite = req.get('sec-fetch-site');
    if (fetchSite === 'cross-site' || (requestOrigin && !allowedOrigins.includes(requestOrigin))) {
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

  app.use(
    '/api/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }) => createContext({ req, res }),
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  return app;
}
