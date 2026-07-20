import { createApp } from './app.js';
import { db } from './db.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = createApp();

app.listen(PORT, async () => {
  try {
    await db.$connect();
    console.log(`✅ Database connected`);
  } catch (e) {
    console.error('❌ Database connection failed:', e);
  }
  console.log(`🚌 SAT Bus Server running on http://localhost:${PORT}`);
  console.log(`📡 tRPC API available at http://localhost:${PORT}/api/trpc`);
});
