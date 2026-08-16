import express, { type Request, type Response, type NextFunction } from 'express';
import coreApp from '../backend/serverApp.js';
import adminLocations from '../backend/adminLocations.js';
import adminPricingRules from '../backend/adminPricingRules.js';
import adminPricingPreview from '../backend/adminPricingPreview.js';
import adminInternationalCatalog from '../backend/adminInternationalCatalog.js';
import internationalBooking from '../backend/internationalBooking.js';
import { handleAdminCommerce } from '../backend/adminCommerce.js';

const app = express();
const REFERENCE_ORIGIN = 'https://sailt.satrsll.site';
const SHELL_CACHE_MS = 2 * 60 * 1000;
const shellCache = new Map<string, { value: string; expiresAt: number }>();

async function fetchShell(path: string): Promise<string> {
  const cached = shellCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const response = await fetch(`${REFERENCE_ORIGIN}${path}`, {
    headers: { 'User-Agent': 'SAT-UI-Enhancement/1.0', Accept: 'text/html,*/*' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Shell request failed: ${response.status}`);
  const value = await response.text();
  shellCache.set(path, { value, expiresAt: Date.now() + SHELL_CACHE_MS });
  return value;
}

const bookingTabsEnhancement = String.raw`
<style>
  html[data-sat-trip-mode="international"] [data-sat-tab="international"],
  html[data-sat-trip-mode="local"] [data-sat-tab="local"] { outline-offset: 2px; }
</style>
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

    // Let the original booking application update its own visual state and form logic.
    // The shell reload on real mode changes guarantees origin/destination are reset.
    if (activeMode === 'international') {
      internalActivation = true;
      setTimeout(() => {
        tabs.international.click();
        internalActivation = false;
      }, 0);
    }
    return true;
  };

  // Guarantee every search request carries the active service type while keeping
  // the original form markup, date picker, passenger counter and search button intact.
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

const adminQuickActionsEnhancement = String.raw`
<style>
  #sat-admin-quick-actions{margin:18px 0;padding:16px;border:1px solid #e2e6eb;border-radius:16px;background:#fff;box-shadow:0 8px 28px rgba(15,23,42,.05)}
  #sat-admin-quick-actions .sat-qa-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  #sat-admin-quick-actions .sat-qa-title{font-size:15px;font-weight:900;color:#172033}
  #sat-admin-quick-actions .sat-qa-sub{font-size:12px;color:#77808d;margin-top:3px}
  #sat-admin-quick-actions .sat-qa-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}
  #sat-admin-quick-actions .sat-qa-btn{min-height:78px;border:1px solid #d8dde5;border-radius:12px;background:#273142;color:#fff;padding:11px 10px;cursor:pointer;text-align:right;font:inherit;font-weight:800;transition:.18s ease;display:flex;flex-direction:column;justify-content:center;gap:4px}
  #sat-admin-quick-actions .sat-qa-btn small{font-size:10px;color:#c8ced7;font-weight:500;line-height:1.45}
  #sat-admin-quick-actions .sat-qa-btn:hover,#sat-admin-quick-actions .sat-qa-btn:focus-visible{background:#b58a24;border-color:#b58a24;transform:translateY(-1px);outline:none;box-shadow:0 7px 18px rgba(181,138,36,.18)}
  #sat-admin-quick-actions .sat-qa-btn:active{transform:translateY(0);background:#98731d}
  @media(max-width:900px){#sat-admin-quick-actions{margin:12px 0;padding:12px}#sat-admin-quick-actions .sat-qa-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#sat-admin-quick-actions .sat-qa-btn{min-height:70px}}
  @media(max-width:420px){#sat-admin-quick-actions .sat-qa-grid{grid-template-columns:1fr 1fr;gap:7px}#sat-admin-quick-actions .sat-qa-btn{padding:10px 8px;font-size:12px}}
</style>
<script>
(() => {
  const actions = [
    ['/admin-locations','المدن والمسارات','إدارة المدن والمسافات'],
    ['/admin-commerce','التسعير','الأسعار والإعدادات'],
    ['/admin-pricing-rules','قواعد الأسعار','المسافة والمنطقة والمسار'],
    ['/admin-pricing-preview','معاينة سعر','اختبار السعر قبل الحفظ'],
    ['/admin-international','الرحلات الدولية','الدول والمدن والتوقفات'],
  ];
  const normalize = value => String(value || '').replace(/\s+/g,' ').trim();
  const createCard = () => {
    const card = document.createElement('section');
    card.id = 'sat-admin-quick-actions';
    card.innerHTML = '<div class="sat-qa-head"><div><div class="sat-qa-title">الوصول السريع</div><div class="sat-qa-sub">إدارة إعدادات التشغيل والحجوزات</div></div></div><div class="sat-qa-grid"></div>';
    const grid = card.querySelector('.sat-qa-grid');
    actions.forEach(([path,label,desc]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sat-qa-btn';
      button.innerHTML = '<span>' + label + '</span><small>' + desc + '</small>';
      button.addEventListener('click', () => { top.location.hash = path; });
      grid.appendChild(button);
    });
    return card;
  };
  const placeCard = () => {
    if (document.getElementById('sat-admin-quick-actions')) return true;
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,.card-title,.section-title'));
    const paymentHeading = headings.find(el => normalize(el.textContent).includes('أحدث عمليات الدفع'));
    if (paymentHeading) {
      const section = paymentHeading.closest('section,article,.card,.panel,.dashboard-card') || paymentHeading.parentElement;
      if (section?.parentElement) {
        section.parentElement.insertBefore(createCard(), section);
        return true;
      }
    }
    const dashboard = document.querySelector('main,.dashboard,.dashboard-content,.content,#dashboard,#overview');
    if (dashboard && dashboard.children.length) {
      const anchor = dashboard.children[Math.min(1, dashboard.children.length - 1)];
      anchor.insertAdjacentElement('afterend', createCard());
      return true;
    }
    return false;
  };
  if (!placeCard()) {
    const observer = new MutationObserver(placeCard);
    observer.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 20000);
  }
})();
</script>`;

function transformBookingShell(source: string): string {
  let html = source
    .replace(/<script\s+src=["']assets\/config\.js[^"']*["']><\/script>/i, '<script src="/api/booking-shell/config.js"></script>')
    .replace(/<script\s+src=["']assets\/app\.js[^"']*["']><\/script>/i, '<script src="/api/booking-shell/app.js"></script>')
    .replaceAll('assets/', '/api/booking-assets/');
  if (!/<base\s/i.test(html)) html = html.replace(/<head>/i, '<head><base href="/">');
  return html.replace(/<\/body>/i, `${bookingTabsEnhancement}</body>`);
}

function transformAdminShell(source: string): string {
  let html = source
    .replace(/(?:\.\.\/)?style\.css(?:\?[^"']*)?/g, '/api/admin-shell/style.css')
    .replace(/(?:\.\.\/)?app\.js(?:\?[^"']*)?/g, '/api/admin-shell/app.js')
    .replace(/<script[^>]+src=["'][^"']*(?:socket\.io|config\.js)[^"']*["'][^>]*><\/script>/gi, '');
  if (!/<base\s/i.test(html)) html = html.replace(/<head>/i, '<head><base href="/">');
  return html.replace(/<\/body>/i, `${adminQuickActionsEnhancement}</body>`);
}

app.get(['/api/booking-shell', '/api/booking-shell/'], async (_req, res, next) => {
  try {
    res.type('text/html').setHeader('Cache-Control','public, max-age=120');
    res.send(transformBookingShell(await fetchShell('/')));
  } catch (error) {
    console.error('[enhanced-booking-shell]', error);
    next();
  }
});

app.get(['/api/admin-shell', '/api/admin-shell/'], async (_req, res, next) => {
  try {
    res.type('text/html').setHeader('Cache-Control','public, max-age=120');
    res.send(transformAdminShell(await fetchShell('/admin/')));
  } catch (error) {
    console.error('[enhanced-admin-shell]', error);
    next();
  }
});

app.use(coreApp);

const mount = (path: string, handler: (req: Request, res: Response) => unknown | Promise<unknown>) => {
  app.all(path, async (req: Request, res: Response, next: NextFunction) => {
    try { await handler(req, res); } catch (error) { next(error); }
  });
};

mount('/api/admin-locations', adminLocations);
mount('/api/admin-pricing-rules', adminPricingRules);
mount('/api/admin-pricing-preview', adminPricingPreview);
mount('/api/admin-international', adminInternationalCatalog);
mount('/api/international-booking', internationalBooking);
app.all('/api/admin-commerce', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const handled = await handleAdminCommerce(req, res);
    if (!handled && !res.headersSent) res.status(404).json({ status: 'error', message: 'المسار غير موجود' });
  } catch (error) { next(error); }
});

export default app;
