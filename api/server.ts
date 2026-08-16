import type { Request, Response, NextFunction } from 'express';
import app from '../backend/serverApp.js';
import adminLocations from '../backend/adminLocations.js';
import adminPricingRules from '../backend/adminPricingRules.js';
import adminPricingPreview from '../backend/adminPricingPreview.js';
import adminInternationalCatalog from '../backend/adminInternationalCatalog.js';
import internationalBooking from '../backend/internationalBooking.js';
import { handleAdminCommerce } from '../backend/adminCommerce.js';

const mount = (path: string, handler: (req: Request, res: Response) => unknown | Promise<unknown>) => {
  app.all(path, async (req: Request, res: Response, next: NextFunction) => {
    try { await handler(req, res); } catch (error) { next(error); }
  });
};

mount('/api/admin-locations', adminLocations);
mount('/api/admin-pricing-rules', adminPricingRules);
mount('/api/admin-pricing-preview', adminPricingPreview);
mount('/api/admin-international', adminInternationalCatalog);
mount('/api/international-booking', internationalBooking);
app.all('/api/admin-commerce', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const handled = await handleAdminCommerce(req, res);
    if (!handled && !res.headersSent) res.status(404).json({ status: 'error', message: 'المسار غير موجود' });
  } catch (error) { next(error); }
});

export default app;
