// Standalone Vercel health check. The main /api/health route is served by api/server.ts.
export default function handler(_req: unknown, res: { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } }) {
  const sessionReady = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
  const databaseConfigured = Boolean(process.env.DATABASE_URL && /^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL));

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    runtime: 'vercel',
    sessionReady,
    databaseConfigured,
    databaseBackend: 'neon-postgresql',
    turso: false,
  });
}
