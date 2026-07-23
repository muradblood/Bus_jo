import { createServer } from 'http';
import { createApp } from './app.js';
import { initSocketIO } from './socket.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = createApp();
const httpServer = createServer(app);

initSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚌 SAT Bus Server running on http://localhost:${PORT}`);
  console.log(`📡 tRPC API available at http://localhost:${PORT}/api/trpc`);
  console.log(`🔌 Socket.IO available at http://localhost:${PORT}/socket.io`);
});
