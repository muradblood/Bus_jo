import { router, publicProcedure } from '../trpc.js';
import { authRouter } from './auth.js';
import { adminRouter } from './admin.js';
import { citiesRouter } from './cities.js';
import { bookingsRouter } from './bookings.js';
import { pricesRouter } from './prices.js';
import { settingsRouter } from './settings.js';
import { visitorsRouter } from './visitors.js';
import { banksRouter } from './banks.js';
import { setupRouter } from './setup.js';

export const appRouter = router({
  ping: publicProcedure.query(() => 'pong'),
  setup: setupRouter,
  auth: authRouter,
  admin: adminRouter,
  cities: citiesRouter,
  bookings: bookingsRouter,
  prices: pricesRouter,
  settings: settingsRouter,
  visitors: visitorsRouter,
  banks: banksRouter,
});

export type AppRouter = typeof appRouter;
