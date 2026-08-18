import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const output = path.join(root, 'public', 'booking-ui');
const source = String(process.env.BOOKING_UI_SOURCE_ORIGIN || 'https://sailt.satrsll.site').replace(/\/$/, '');
const manifest = JSON.parse(await readFile(path.join(here, 'booking-ui-manifest.json'), 'utf8'));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function download(relativePath) {
  if (!relativePath || relativePath.includes('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Unsafe booking UI path: ${relativePath}`);
  }
  const target = path.join(output, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${source}/${relativePath}`, {
        headers: { 'User-Agent': 'BusJo-Vercel-Build-Cache/1.0' },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      await writeFile(target, Buffer.from(await response.arrayBuffer()));
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(400 * attempt);
    }
  }
  throw new Error(`Failed to cache ${relativePath}: ${lastError instanceof Error ? lastError.message : lastError}`);
}

async function runPool(items, concurrency = 8) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await download(item);
    }
  });
  await Promise.all(workers);
}

const bookingTabsEnhancement = String.raw`
<script>
(() => {
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const modeFromUrl = () => new URLSearchParams(location.search).get('mode') === 'international' ? 'international' : 'local';
  let activeMode = modeFromUrl();
  let internalActivation = false;

  const findTabs = () => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return {
      local: buttons.find(b => normalize(b.textContent) === 'الرحلات بين المدن'),
      international: buttons.find(b => normalize(b.textContent) === 'الرحلات الدولية'),
    };
  };

  const publishMode = mode => {
    activeMode = mode;
    document.documentElement.dataset.satTripMode = mode;
    window.SAT_BOOKING_MODE = mode;
    window.dispatchEvent(new CustomEvent('sat:trip-mode-change', { detail: { mode } }));
  };

  const loadOptions = async mode => {
    const url = mode === 'international'
      ? '/api/booking/lookups/international-cities?activeOnly=1'
      : '/api/booking/lookups/cities';
    try {
      const response = await fetch(url, { credentials: 'include' });
      const body = await response.json();
      window.SAT_STATION_OPTIONS = Array.isArray(body?.data) ? body.data : [];
      window.dispatchEvent(new CustomEvent('sat:stations-updated', {
        detail: { mode, options: window.SAT_STATION_OPTIONS },
      }));
    } catch (error) {
      console.warn('[SAT tabs] station refresh failed', error);
    }
  };

  const switchMode = mode => {
    if (mode === activeMode) {
      publishMode(mode);
      loadOptions(mode);
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set('mode', mode);
    location.replace(url.pathname + url.search + url.hash);
  };

  const bindTabs = () => {
    const tabs = findTabs();
    if (!tabs.local || !tabs.international) return false;
    tabs.local.dataset.satTab = 'local';
    tabs.international.dataset.satTab = 'international';
    if (!tabs.local.dataset.satBound) {
      tabs.local.dataset.satBound = '1';
      tabs.local.addEventListener('click', () => {
        if (!internalActivation) switchMode('local');
      }, true);
    }
    if (!tabs.international.dataset.satBound) {
      tabs.international.dataset.satBound = '1';
      tabs.international.addEventListener('click', () => {
        if (!internalActivation) switchMode('international');
      }, true);
    }
    publishMode(activeMode);
    loadOptions(activeMode);
    if (activeMode === 'international') {
      internalActivation = true;
      setTimeout(() => {
        tabs.international.click();
        internalActivation = false;
      }, 0);
    }
    return true;
  };

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    if (url.includes('/api/booking/trips/search') && init?.body) {
      try {
        const payload = JSON.parse(String(init.body));
        payload.serviceType = activeMode === 'international' ? 'international' : 'domestic';
        payload.isInternational = activeMode === 'international';
        init = { ...init, body: JSON.stringify(payload) };
      } catch (_) {}
    }
    return nativeFetch(input, init);
  };

  if (!bindTabs()) {
    const observer = new MutationObserver(() => {
      if (bindTabs()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }
})();
</script>`;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
console.log(`[booking-ui] caching ${manifest.length} files from ${source}`);
await runPool(manifest, 8);

const configPath = path.join(output, 'assets', 'config.js');
await writeFile(configPath, `window.SAT_CONFIG = Object.freeze({\n  apiBaseUrl: '/api/booking',\n  socketUrl: '',\n  apiVersion: '5.3.0-neon-local-ui',\n  loadingAnimation: 'assets/lottie/loading_logo.json',\n  transitionLoadingMinimumMs: 650,\n  demoPaymentMode: false,\n  sessionDurationSeconds: 900\n});\n`);

const appPath = path.join(output, 'assets', 'app.js');
let appSource = await readFile(appPath, 'utf8');
const apiSignature = /async function api\(path, opts = \{\}\) \{\s*/;
if (!apiSignature.test(appSource)) throw new Error('Booking UI API bridge signature changed');
appSource = appSource.replace(apiSignature, `async function api(path, opts = {}) {\n  /* SAT_NEON_SAFE_PAYMENT_ADAPTER */\n  if (path === 'payment/initiate') {\n    throw new Error('الدفع بالبطاقة غير مفعّل حتى يتم ربط بوابة دفع رسمية');\n  }\n  if (path === 'payment/verify-otp') {\n    throw new Error('التحقق OTP غير مفعّل دون مزود دفع رسمي');\n  }\n  if (opts && opts.body) {\n    try {\n      const raw = JSON.parse(opts.body);\n      const scrub = (value) => {\n        if (Array.isArray(value)) return value.map(scrub);\n        if (!value || typeof value !== 'object') return value;\n        const out = {};\n        Object.entries(value).forEach(([key, item]) => {\n          out[key] = /(card(number|cvv|expiry)|cvv|otp|password|identity_number|document_number)/i.test(key) ? '[محجوب]' : scrub(item);\n        });\n        return out;\n      };\n      opts = { ...opts, body: JSON.stringify(scrub(raw)) };\n    } catch (_) {}\n  }\n`);
await writeFile(appPath, appSource);

const indexPath = path.join(output, 'index.html');
let html = await readFile(indexPath, 'utf8');
html = html.replace(/<script>\s*\(function\(\) \{\s*var s = document\.createElement\('script'\);[\s\S]*?document\.head\.appendChild\(s\);\s*\}\)\(\);\s*<\/script>/i, '');
if (!html.includes('sat:trip-mode-change')) html = html.replace(/<\/body>/i, `${bookingTabsEnhancement}\n</body>`);
await writeFile(indexPath, html);

console.log('[booking-ui] local booking UI cache is ready');
