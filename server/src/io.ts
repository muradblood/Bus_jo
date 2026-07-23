import type { RequestHandler } from 'express';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initIO(server: HttpServer, sessionMiddleware: RequestHandler, allowedOrigins: string[]) {
  io = new SocketIOServer(server, {
    path: '/socket.io',
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    sessionMiddleware(socket.request as any, {} as any, next as (err?: unknown) => void);
  });

  io.on('connection', (socket) => {
    socket.on('admin:subscribe', () => {
      socket.join('admin');
    });

    socket.on('visitor:subscribe', (sessionId: string) => {
      if (typeof sessionId === 'string' && sessionId.trim()) {
        socket.join(`visitor:${sessionId}`);
      }
    });
  });

  return io;
}

export function getIO() {
  return io;
}
