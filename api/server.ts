import express from 'express';
import cors from 'cors';
import { handleArchiveAdmin } from './archiveAdmin.js';
import { handleArchivePublic } from './archivePublic.js';
import { dbExec, dbQuery, ensureArchiveDatabase, neonConfigured } from './neonDb.js';

const REFERENCE_ORIGIN = 'https://sailt.satrsll.site';
const REFERENCE_CACHE_MS = 5 * 60 * 1000;
const app = express();
const referenceCache = new Map<string, { value: string; expiresAt: number }>();

app.disable('x-powered-by');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173',
      ...(process.env.ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean) ?? []),
    ];
    if (allowed.includes(origin) || /\.vercel\.app$/i.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.get(['/health', '/api/health'], async (_req, res) => {
  let databaseReady = false;
  let latencyMs: number | null = null;
  if (neonConfigured()) {
    const started = Date.now();
    try {
      await ensureArchiveDatabase();
      await dbQuery('SELECT 1 AS ok');
      databaseReady = true;
      latencyMs = Date.now() - started;
    } catch (error) {
      console.error('[health-neon]', error);
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    runtime: 'vercel',
    databaseBackend: 'neon-postgresql',
    databaseConfigured: neonConfigured(),
    databaseReady,
    latencyMs,
    sessionReady: String(process.env.SESSION_SECRET || '').length >= 32,
    adminPanel: 'archive-v5.3',
    turso: false,
    time: new Date().toISOString(),
  });
});

async function fetchReferenceText(path: string): Promise<string> {
  const cached = referenceCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const response = await fetch(`${REFERENCE_ORIGIN}${path}`, {
    headers: { 'User-Agent': 'SAT-Archive-UI-Bridge/2.0', Accept: path.endsWith('.js') ? 'application/javascript,text/plain,*/*' : 'text/html,*/*' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Reference UI request failed: ${response.status}`);
  const value = await response.text();
  referenceCache.set(path, { value, expiresAt: Date.now() + REFERENCE_CACHE_MS });
  return value;
}

function transformReferenceHtml(source: string): string {
  let html = source
    .replace(/<script\s+src=["']assets\/config\.js[^"']*["']><\/script>/i, '<script src="/api/booking-shell/config.js"></script>')
    .replace(/<script\s+src=["']assets\/app\.js[^"']*["']><\/script>/i, '<script src="/api/booking-shell/app.js"></script>')
    .replaceAll('assets/', '/api/booking-assets/');
  if (!/<base\s/i.test(html)) html = html.replace(/<head>/i, '<head><base href="/">');
  return html;
}

function transformReferenceApp(source: string): string {
  const signature = /async function api\(path, opts = \{\}\) \{\s*/;
  if (!signature.test(source)) throw new Error('Reference app API bridge signature changed');
  let patched = source.replace(signature, `async function api(path, opts = {}) {\n  /* SAT_NEON_SAFE_PAYMENT_ADAPTER */\n  if (path === 'payment/initiate') {\n    throw new Error('الدفع بالبطاقة غير مفعّل حتى يتم ربط بوابة دفع رسمية');\n  }\n  if (path === 'payment/verify-otp') {\n    throw new Error('التحقق OTP غير مفعّل دون مزود دفع رسمي');\n  }\n  if (opts && opts.body) {\n    try {\n      const raw = JSON.parse(opts.body);\n      const scrub = (value) => {\n        if (Array.isArray(value)) return value.map(scrub);\n        if (!value || typeof value !== 'object') return value;\n        const out = {};\n        Object.entries(value).forEach(([key, item]) => {\n          out[key] = /(card(number|cvv|expiry)|cvv|otp|password|identity_number|document_number)/i.test(key) ? '[محجوب]' : scrub(item);\n        });\n        return out;\n      };\n      opts = { ...opts, body: JSON.stringify(scrub(raw)) };\n    } catch (_) {}\n  }\n`);
  patched = patched.replaceAll('assets/', '/api/booking-assets/');
  if (!patched.includes('SAT_NEON_SAFE_PAYMENT_ADAPTER')) throw new Error('Safe adapter was not installed');
  return patched;
}

app.get('/api/booking-assets/*', async (req, res) => {
  try {
    const assetPath = String(req.params[0] || '').replace(/^\/+/, '');
    if (!assetPath || assetPath.includes('..') || assetPath.includes('\\')) return void res.status(400).send('Invalid asset path');
    const response = await fetch(`${REFERENCE_ORIGIN}/assets/${assetPath}`, { headers: { 'User-Agent': 'SAT-Archive-Asset-Bridge/2.0' }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return void res.status(response.status).send('Asset unavailable');
    const type = response.headers.get('content-type'); if (type) res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error('[booking-asset]', error); res.status(502).send('Asset unavailable'); }
});

app.get(['/api/booking-shell', '/api/booking-shell/'], async (_req, res) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.send(transformReferenceHtml(await fetchReferenceText('/')));
  } catch (error) {
    console.error('[booking-shell]', error);
    res.status(502).send('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial,sans-serif;padding:32px;text-align:center">تعذر تحميل واجهة الحجز مؤقتًا.</body></html>');
  }
});
app.get('/api/booking-shell/config.js', (_req, res) => {
  res.type('application/javascript').setHeader('Cache-Control', 'public, max-age=300');
  res.send(`window.SAT_CONFIG=Object.freeze({apiBaseUrl:'/api/booking',socketUrl:'',apiVersion:'5.3.0-neon',loadingAnimation:'/api/booking-assets/lottie/loading_logo.json',transitionLoadingMinimumMs:650,demoPaymentMode:false,sessionDurationSeconds:900});`);
});
app.get('/api/booking-shell/app.js', async (_req, res) => {
  try { res.type('application/javascript').setHeader('Cache-Control','public, max-age=120'); res.send(transformReferenceApp(await fetchReferenceText('/assets/app.js'))); }
  catch (error) { console.error('[booking-shell-app]', error); res.status(502).type('text/plain').send('console.error("تعذر تحميل منطق واجهة الحجز");'); }
});

function transformAdminHtml(source: string): string {
  let html = source
    .replace(/(?:\.\.\/)?style\.css(?:\?[^"']*)?/g, '/api/admin-shell/style.css')
    .replace(/(?:\.\.\/)?app\.js(?:\?[^"']*)?/g, '/api/admin-shell/app.js')
    .replace(/<script[^>]+src=["'][^"']*(?:socket\.io|config\.js)[^"']*["'][^>]*><\/script>/gi, '');
  if (!/<base\s/i.test(html)) html = html.replace(/<head>/i, '<head><base href="/">');
  return html;
}

function transformAdminApp(source: string): string {
  return source
    .replace(/const API\s*=\s*['"][^'"]*api\/admin\/index\.php['"];?/, "const API = '/api/admin/index.php';")
    .replace(/\(window\.SAT_CONFIG\s*&&\s*window\.SAT_CONFIG\.socketUrl\)\s*\|\|\s*['"][^'"]*['"]/, "''");
}

app.get(['/api/admin-shell', '/api/admin-shell/'], async (_req, res) => {
  try {
    res.type('text/html').setHeader('Cache-Control', 'public, max-age=120');
    res.send(transformAdminHtml(await fetchReferenceText('/admin/')));
  } catch (error) {
    console.error('[admin-shell]', error);
    res.status(502).type('text/html').send('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><body style="font-family:Arial;padding:32px;text-align:center">تعذر تحميل لوحة التحكم مؤقتًا.</body></html>');
  }
});
app.get('/api/admin-shell/style.css', async (_req, res) => {
  try { res.type('text/css').setHeader('Cache-Control','public, max-age=300'); res.send(await fetchReferenceText('/admin/style.css')); }
  catch { res.status(502).type('text/css').send(''); }
});
app.get('/api/admin-shell/app.js', async (_req, res) => {
  try { res.type('application/javascript').setHeader('Cache-Control','public, max-age=120'); res.send(transformAdminApp(await fetchReferenceText('/admin/app.js'))); }
  catch { res.status(502).type('application/javascript').send('console.error("تعذر تحميل لوحة التحكم");'); }
});
app.get('/api/admin-install-shell', (_req, res) => {
  res.type('text/html').setHeader('Cache-Control','no-store');
  res.send(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تثبيت SAT Control</title><style>body{margin:0;background:#f5f6f8;font-family:Arial,sans-serif;color:#172033}.wrap{min-height:100vh;display:grid;place-items:center;padding:20px}.card{width:min(440px,100%);background:#fff;border-radius:20px;padding:28px;box-shadow:0 18px 50px #0001}.brand{text-align:center;font-size:32px;font-weight:900;color:#b58a24}label{display:block;margin:14px 0 6px;font-weight:700}input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #dce0e6;border-radius:10px}button{width:100%;margin-top:18px;padding:13px;border:0;border-radius:10px;background:#b58a24;color:#fff;font-weight:800}.muted{color:#6b7280}.err{color:#b91c1c}</style></head><body><div class="wrap"><form class="card" id="f"><div class="brand">SAT</div><h1>إنشاء حساب المدير</h1><p id="state" class="muted">جاري فحص قاعدة البيانات…</p><label>الاسم</label><input id="name" value="مدير النظام" required><label>البريد الإلكتروني</label><input id="email" type="email" placeholder="admin@example.com" required><label>كلمة المرور</label><input id="password" type="password" minlength="8" required><label>تأكيد كلمة المرور</label><input id="confirm" type="password" minlength="8" required><button id="submit">تثبيت وإنشاء الحساب</button><p id="error" class="err"></p></form></div><script>const f=document.getElementById('f'),state=document.getElementById('state'),error=document.getElementById('error'),submit=document.getElementById('submit');async function check(){try{const r=await fetch('/api/admin/install'),d=await r.json();if(!r.ok)throw new Error(d.message||'قاعدة البيانات غير جاهزة');if(d.data.installed){state.textContent='تم التثبيت مسبقًا. سيتم نقلك لتسجيل الدخول.';submit.disabled=true;setTimeout(()=>top.location.hash='/admin-login',900)}else if(!d.data.sessionReady){state.textContent='Neon متصل لكن SESSION_SECRET غير جاهز.';submit.disabled=true}else state.textContent='Neon جاهز. اختر بيانات دخول لوحة التحكم.'}catch(e){state.textContent='قاعدة البيانات غير جاهزة';error.textContent=e.message}}f.onsubmit=async e=>{e.preventDefault();error.textContent='';if(password.value!==confirm.value){error.textContent='كلمتا المرور غير متطابقتين';return}submit.disabled=true;try{const r=await fetch('/api/admin/install',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.value,email:email.value,password:password.value})}),d=await r.json();if(!r.ok)throw new Error(d.message||'تعذر التثبيت');state.textContent='تم إنشاء الحساب';setTimeout(()=>top.location.hash='/admin-login',700)}catch(e){error.textContent=e.message;submit.disabled=false}};check();</script></body></html>`);
});

app.use(async (req, res, next) => {
  try {
    if (await handleArchiveAdmin(req, res)) return;
    if (await handleArchivePublic(req, res)) return;
    next();
  } catch (error) {
    next(error);
  }
});

app.use(async (error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api-error]', error);
  if (neonConfigured()) {
    try {
      await ensureArchiveDatabase();
      await dbExec('INSERT INTO system_logs(error_code,severity,component,request_path,ip_address,message,context_json) VALUES($1,$2,$3,$4,$5,$6,$7)', [
        'NODE_API_ERROR', 'error', 'api', req.path, req.ip || null,
        error instanceof Error ? error.message.slice(0,1500) : 'Unknown error', '{}',
      ]);
    } catch {}
  }
  if (!res.headersSent) res.status(500).json({ status: 'error', message: 'حدث خطأ داخلي في الخادم' });
});

export default app;
