import 'dotenv/config';
import { createServer } from 'http';
import { createApp, createSessionMiddleware } from './app.js';
import { initSocketIO } from './socket.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const sessionMiddleware = createSessionMiddleware();
const app = createApp(sessionMiddleware);
const httpServer = createServer(app);

initSocketIO(httpServer, sessionMiddleware);

httpServer.listen(PORT, () => {
  console.log(`🚌 SAT Bus Server running on http://localhost:${PORT}`);
  console.log(`📡 tRPC API available at http://localhost:${PORT}/api/trpc`);
  console.log(`🔌 Socket.IO available at http://localhost:${PORT}/socket.io`);
});
