import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';

// Global Socket.IO instance — set once when the HTTP server starts.
let _io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  _io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
          ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
        ];
        if (allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
    // Allow both WebSocket and long-polling transports.
    // Long-polling is needed for environments that don't support WebSockets (e.g. Vercel).
    transports: ['websocket', 'polling'],
  });

  _io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] client disconnected: ${socket.id} (${reason})`);
    });

    // Admin joins the "admin" room to receive admin-only events.
    socket.on('join_admin', () => {
      socket.join('admin');
      socket.emit('joined_admin', { ok: true });
    });
  });

  return _io;
}

/** Returns the Socket.IO instance, or null if not yet initialised (e.g. on Vercel). */
export function getIO(): SocketIOServer | null {
  return _io;
}

// ─── Event helpers ──────────────────────────────────────────────────────────

/** Emit a new-booking event to all admin sockets. */
export function emitNewBooking(booking: Record<string, unknown>): void {
  _io?.to('admin').emit('new_booking', booking);
}

/** Emit a visitor-update event to all admin sockets. */
export function emitVisitorUpdate(visitor: Record<string, unknown>): void {
  _io?.to('admin').emit('visitor_update', visitor);
}

/** Emit a booking-status-changed event to all admin sockets. */
export function emitBookingStatusChanged(data: { id: number; status: string }): void {
  _io?.to('admin').emit('booking_status_changed', data);
}
