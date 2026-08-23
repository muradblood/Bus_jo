import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const partsDir = path.join(root, 'ui-source', 'core4');
const publicDir = path.join(root, 'public');
const bookingDir = path.join(publicDir, 'booking-ui');
const archivePath = path.join(root, '.booking-ui-local.tar.gz');
const expectedSha256 = 'eb1779678c57b59182f70eb8f49f2328e82c6d00c724696f62ccbe0e02ed69f4';

const orderedParts = [
  'part-00.b64',
  'part-01a.b64',
  'part-01b.b64',
  'part-01c.b64',
  'part-01d.b64',
  'part-02.b64',
  'part-03.b64',
];

const encoded = (await Promise.all(
  orderedParts.map(name => readFile(path.join(partsDir, name), 'utf8')),
)).join('').replace(/\s+/g, '');

const archive = Buffer.from(encoded, 'base64');
const actualSha256 = createHash('sha256').update(archive).digest('hex');
if (actualSha256 !== expectedSha256) {
  throw new Error(`Local booking UI bundle checksum mismatch: ${actualSha256}`);
}

await mkdir(publicDir, { recursive: true });
await rm(bookingDir, { recursive: true, force: true });
await writeFile(archivePath, archive);
try {
  execFileSync('tar', ['-xzf', archivePath, '-C', publicDir], { stdio: 'inherit' });
} finally {
  await rm(archivePath, { force: true });
}

const indexPath = path.join(bookingDir, 'index.html');
const appPath = path.join(bookingDir, 'assets', 'app.js');
const configPath = path.join(bookingDir, 'assets', 'config.js');
const stylePath = path.join(bookingDir, 'assets', 'style.css');

for (const required of [indexPath, appPath, configPath, stylePath]) {
  await readFile(required);
}

let html = await readFile(indexPath, 'utf8');
// The original page references a separate Lottie vendor file. The booking app already
// guards animation usage when window.lottie is unavailable, so remove only that script
// reference rather than depending on a remote or missing asset.
html = html.replace(/<script[^>]+src=["']assets\/vendor\/lottie\.min\.js[^"']*["'][^>]*><\/script>\s*/i, '');
await writeFile(indexPath, html);

await writeFile(configPath, `window.SAT_CONFIG=Object.freeze({apiBaseUrl:'/api/booking',socketUrl:'',apiVersion:'5.3.0-neon-local',loadingAnimation:'',transitionLoadingMinimumMs:650,demoPaymentMode:false,sessionDurationSeconds:900});\n`);

let appSource = await readFile(appPath, 'utf8');
if (!appSource.includes('BUSJO_LOCAL_SAFE_ADAPTER')) {
  const signature = /async function api\(path, opts = \{\}\) \{\s*/;
  if (!signature.test(appSource)) throw new Error('Booking UI api() signature changed');
  appSource = appSource.replace(signature, `async function api(path, opts = {}) {\n  /* BUSJO_LOCAL_SAFE_ADAPTER */\n  if (path === 'payment/initiate') throw new Error('الدفع بالبطاقة غير مفعّل حتى يتم ربط بوابة دفع رسمية');\n  if (path === 'payment/verify-otp') throw new Error('التحقق OTP غير مفعّل دون مزود دفع رسمي');\n  if (opts && opts.body) {\n    try {\n      const raw = JSON.parse(opts.body);\n      const scrub = value => {\n        if (Array.isArray(value)) return value.map(scrub);\n        if (!value || typeof value !== 'object') return value;\n        const out = {};\n        Object.entries(value).forEach(([key, item]) => {\n          out[key] = /(card(number|cvv|expiry)|cvv|otp|password|identity_number|document_number)/i.test(key) ? '[محجوب]' : scrub(item);\n        });\n        return out;\n      };\n      opts = { ...opts, body: JSON.stringify(scrub(raw)) };\n    } catch (_) {}\n  }\n`);
}

const roundTripEnhancement = await readFile(path.join(root, 'scripts', 'roundtrip-enhancement.js'), 'utf8');
if (!appSource.includes('BUSJO_ROUND_TRIP_FLOW_V1')) appSource += `\n${roundTripEnhancement}\n`;
await writeFile(appPath, appSource);

console.log('[booking-ui] local core UI prepared without remote fetch');
