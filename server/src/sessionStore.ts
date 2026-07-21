import session from 'express-session';
import { db } from './db.js';

export class JsonSessionStore extends session.Store {
  get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void): void {
    try {
      const s = db.session.findUnique({ where: { id: sid } });
      if (!s || new Date(s.expiresAt) < new Date()) {
        return callback(null, null);
      }
      callback(null, JSON.parse(s.data) as session.SessionData);
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, sessionData: session.SessionData, callback?: (err?: unknown) => void): void {
    try {
      const maxAge = sessionData.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000;
      const expiresAt =
        sessionData.cookie?.expires instanceof Date
          ? sessionData.cookie.expires.toISOString()
          : new Date(Date.now() + maxAge).toISOString();
      db.session.upsert({
        where: { id: sid },
        update: { data: JSON.stringify(sessionData), expiresAt },
        create: { id: sid, data: JSON.stringify(sessionData), expiresAt },
      });
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    try {
      db.session.delete({ where: { id: sid } });
    } catch {
      // ignore if not found
    }
    callback?.();
  }
}
