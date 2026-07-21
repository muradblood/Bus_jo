import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/index.js';
import { createContext } from './context.js';
import { PrismaSessionStore } from './sessionStore.js';

export function createApp() {
  const SESSION_SECRET = process.env.SESSION_SECRET || 'sat-bus-secret-change-in-production';
  const NODE_ENV = process.env.NODE_ENV || 'development';

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    ...(process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? []),
  ];

  if (process.env.CORS_ORIGIN) {
    allowedOrigins.push(process.env.CORS_ORIGIN);
  }
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }

  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));

  app.use(express.json());

  app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(),
    cookie: {
      secure: NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    },
  }));

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
