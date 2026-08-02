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
  // Express resolves the trusted proxy chain according to app.set('trust proxy').
  // Reading x-forwarded-for directly would let clients spoof the address.
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  return { req, res, session, clientIp };
}
