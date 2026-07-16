import { router, publicProcedure } from '../trpc.js';
import { authRouter } from './auth.js';
import { adminRouter } from './admin.js';
import { citiesRouter } from './cities.js';
import { bookingsRouter } from './bookings.js';
import { pricesRouter } from './prices.js';
import { settingsRouter } from './settings.js';
import { visitorsRouter } from './visitors.js';

export const appRouter = router({
  ping: publicProcedure.query(() => 'pong'),
  auth: authRouter,
  admin: adminRouter,
  cities: citiesRouter,
  bookings: bookingsRouter,
  prices: pricesRouter,
  settings: settingsRouter,
  visitors: visitorsRouter,
});

export type AppRouter = typeof appRouter;
