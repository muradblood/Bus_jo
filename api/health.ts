export default function handler(_req: unknown, res: { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } }) {
  const sessionSecretReady = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
  const adminReady = Boolean(process.env.ADMIN_USERNAME?.trim() && process.env.ADMIN_PASSWORD);

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    runtime: 'vercel',
    authReady: sessionSecretReady && adminReady,
  });
}
