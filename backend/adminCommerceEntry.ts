import type { Request, Response } from 'express';
import { handleAdminCommerce } from './adminCommerce.js';

export default async function handler(req: Request, res: Response) {
  const query = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  req.url = `/api/admin-commerce${query}`;
  const handled = await handleAdminCommerce(req, res);
  if (!handled && !res.headersSent) res.status(404).json({ status: 'error', message: 'المسار غير موجود' });
}
