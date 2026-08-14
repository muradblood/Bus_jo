export default function handler(_req: unknown, res: { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } }) {
  const sessionReady = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
  const databaseReady = Boolean(process.env.TURSO_DATABASE_URL?.trim() && process.env.TURSO_AUTH_TOKEN);

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    runtime: 'vercel',
    sessionReady,
    databaseReady,
    databaseBackend: databaseReady ? 'turso' : 'sqlite',
  });
}
