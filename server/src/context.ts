import type { Request, Response } from 'express';

export interface SessionData {
  adminId?: number;
}

export interface Context {
  req: Request;
  res: Response;
  session: SessionData | null;
}

export function createContext({ req, res }: { req: Request; res: Response }): Context {
  const session = (req as Request & { session?: { adminId?: number } }).session ?? null;
  return { req, res, session };
}
