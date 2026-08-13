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
  const request = req as Request & {
    session?: { adminId?: number };
    ip?: string;
    socket?: { remoteAddress?: string | null };
  };
  const session = request.session ?? null;
  const clientIp = request.ip || request.socket?.remoteAddress || 'unknown';
  return { req, res, session, clientIp };
}
