import { io, Socket } from 'socket.io-client';

// Connect to the backend Socket.IO server.
// In development, Vite proxies /socket.io → localhost:3001.
// In production (Vercel), this will fall back gracefully: Socket.IO
// cannot connect to a serverless function, so the socket stays
// disconnected and the dashboard uses tRPC polling as a fallback.
const SOCKET_URL =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:3001'
    : window.location.origin;

export const socket: Socket = io(SOCKET_URL, {
  // Try WebSocket first, fall back to long-polling.
  transports: ['websocket', 'polling'],
  // Don't block the app if Socket.IO is unavailable.
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  autoConnect: true,
  // Do not throw on connection errors — dashboard gracefully falls back to polling.
  timeout: 5000,
});

socket.on('connect_error', (err) => {
  // Silently ignore — the dashboard uses tRPC refetchInterval as fallback.
  if (import.meta.env.DEV) {
    console.warn('[socket] connection error:', err.message);
  }
});
