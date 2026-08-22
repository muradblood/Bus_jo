import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ORIGIN = 'https://sailt.satrsll.site';
const OUT = join(process.cwd(), 'public', 'booking-ui');
const textExt = /\.(?:html?|js|css|json)$/i;
const assetExt = /\.(?:png|jpe?g|webp|svg|json|js|css|woff2?|ttf)(?:\?.*)?$/i;
const roundTripEnhancement = await readFile(join(process.cwd(), 'scripts', 'roundtrip-enhancement.js'), 'utf8');

async function request(path, required = false) {
  const url = new URL(path, ORIGIN);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BusJo-Static-UI-Build/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      if (required) throw new Error(`Required booking UI asset failed: ${url.pathname} (${response.status})`);
      console.warn(`[booking-ui] skip ${url.pathname}: ${response.status}`);
      return null;
    }
    return response;
  } catch (error) {
    if (required) throw error;
    console.warn(`[booking-ui] skip ${url.pathname}: ${error?.message || error}`);
    return null;
  }
}

function safePath(path) {
  const clean = decodeURIComponent(path.split('?')[0]).replace(/^\/+/, '');
  if (!clean || clean.includes('..') || clean.includes('\\')) return null;
  return clean;
}

function collectRefs(source, basePath) {
  const refs = new Set();
  const add = value => {
    if (!value || /^(?:data:|https?:|#|mailto:|tel:|javascript:)/i.test(value)) return;
    try {
      const resolved = new URL(value, new URL(basePath, ORIGIN));
      if (resolved.origin === ORIGIN && assetExt.test(resolved.pathname)) refs.add(resolved.pathname);
    } catch {}
  };
  for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) add(match[1]);
  for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) add(match[1]);
  for (const match of source.matchAll(/["'`](\/?assets\/[A-Za-z0-9_./@%+-]+\.(?:png|jpe?g|webp|svg|json|js|css|woff2?|ttf)(?:\?[^"'`]*)?)["'`]/gi)) add(match[1]);
  return refs;
}

function patchApp(source) {
  const signature = /async function api\(path, opts = \{\}\) \{\s*/;
  if (!signature.test(source)) throw new Error('Booking UI api() signature changed');
  const safePatched = source.replace(signature, `async function api(path, opts = {}) {\n  /* BUSJO_LOCAL_SAFE_ADAPTER */\n  if (path === 'payment/initiate') throw new Error('الدفع بالبطاقة غير مفعّل حتى يتم ربط بوابة دفع رسمية');\n  if (path === 'payment/verify-otp') throw new Error('التحقق OTP غير مفعّل دون مزود دفع رسمي');\n  if (opts && opts.body) {\n    try {\n      const raw = JSON.parse(opts.body);\n      const scrub = value => {\n        if (Array.isArray(value)) return value.map(scrub);\n        if (!value || typeof value !== 'object') return value;\n        const out = {};\n        Object.entries(value).forEach(([key, item]) => {\n          out[key] = /(card(number|cvv|expiry)|cvv|otp|password|identity_number|document_number)/i.test(key) ? '[محجوب]' : scrub(item);\n        });\n        return out;\n      };\n      opts = { ...opts, body: JSON.stringify(scrub(raw)) };\n    } catch (_) {}\n  }\n`);
  if (!safePatched.includes('BUSJO_LOCAL_SAFE_ADAPTER')) throw new Error('Safe booking adapter was not installed');
  return `${safePatched}\n${roundTripEnhancement}\n`;
}

async function save(path, body) {
  const clean = safePath(path);
  if (!clean) return;
  const target = join(OUT, clean);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, body);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'assets'), { recursive: true });

let rootResponse;
try {
  rootResponse = await request('/', true);
} catch (error) {
  console.warn(`[booking-ui] remote UI unavailable; skipping generated booking UI: ${error?.message || error}`);
  console.log('[booking-ui] continuing Vite build without remote booking UI');
  process.exit(0);
}

let html = await rootResponse.text();
html = html
  .replace(/<script\s+src=["']assets\/config\.js[^"']*["']><\/script>/i, '<script src="assets/config.js"></script>')
  .replace(/<script\s+src=["']assets\/app\.js[^"']*["']><\/script>/i, '<script src="assets/app.js"></script>');
await writeFile(join(OUT, 'index.html'), html);

const appResponse = await request('/assets/app.js', true);
const appSource = patchApp(await appResponse.text());
await save('/assets/app.js', appSource);

const styleResponse = await request('/assets/style.css', true);
const styleSource = await styleResponse.text();
await save('/assets/style.css', styleSource);

await save('/assets/config.js', `window.SAT_CONFIG=Object.freeze({apiBaseUrl:'/api/booking',socketUrl:'',apiVersion:'5.3.0-neon-local',loadingAnimation:'assets/lottie/loading_logo.json',transitionLoadingMinimumMs:650,demoPaymentMode:false,sessionDurationSeconds:900});\n`);

const pending = new Set([
  ...collectRefs(html, '/'),
  ...collectRefs(appSource, '/assets/app.js'),
  ...collectRefs(styleSource, '/assets/style.css'),
]);
for (const fixed of ['/assets/app.js', '/assets/style.css', '/assets/config.js']) pending.delete(fixed);
const done = new Set();

while (pending.size) {
  const path = pending.values().next().value;
  pending.delete(path);
  if (!path || done.has(path)) continue;
  done.add(path);
  const response = await request(path, false);
  if (!response) continue;
  const clean = safePath(path);
  if (!clean) continue;
  if (textExt.test(clean)) {
    const text = await response.text();
    await save(path, text);
    for (const ref of collectRefs(text, path)) if (!done.has(ref)) pending.add(ref);
  } else {
    await save(path, Buffer.from(await response.arrayBuffer()));
  }
}

console.log(`[booking-ui] prepared local UI with ${done.size + 4} files and round-trip flow`);
