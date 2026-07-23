import { createServer } from 'http';
import { createApp } from './app.js';
import { initIO } from './io.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const { app, sessionMiddleware, allowedOrigins } = createApp();
const server = createServer(app);

initIO(server, sessionMiddleware, allowedOrigins);

server.listen(PORT, () => {
  console.log(`🚌 SAT Bus Server running on http://localhost:${PORT}`);
  console.log(`📡 tRPC API available at http://localhost:${PORT}/api/trpc`);
});
