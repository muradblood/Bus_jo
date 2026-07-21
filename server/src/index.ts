import { createApp } from './app.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = createApp();

app.listen(PORT, () => {
  console.log(`🚌 SAT Bus Server running on http://localhost:${PORT}`);
  console.log(`📡 tRPC API available at http://localhost:${PORT}/api/trpc`);
});
