import type { Request, Response } from 'express';

export interface SessionData {
  adminId?: number;
}

export interface Context {
  req: Request;
  res: Response;
  session: SessionData | null;
  clientIp: string;
}

export function createContext({ req, res }: { req: Request; res: Response }): Context {
  const session = (req as Request & { session?: { adminId?: number } }).session ?? null;
  const clientIp =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  return { req, res, session, clientIp };
}
