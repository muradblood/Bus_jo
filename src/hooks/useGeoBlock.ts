import { useState, useEffect, useCallback, useRef } from 'react';

// Gulf countries (default — admin can change via dashboard)
export const GULF_COUNTRIES = ['SA', 'AE', 'KW', 'BH', 'QA'];

export const COUNTRY_NAMES: Record<string, string> = {
  SA: 'المملكة العربية السعودية',
  AE: 'الإمارات العربية المتحدة',
  KW: 'الكويت',
  BH: 'البحرين',
  QA: 'قطر',
};

interface GeoData {
  countryCode: string;
  countryName: string;
  city: string;
  isAllowed: boolean;
  loading: boolean;
  error: string | null;
}

const GEO_SETTINGS_KEY = 'geoblock_settings_v2';
const GEO_CACHE_KEY = 'geo_country';

export interface GeoBlockSettings {
  enabled: boolean;
  allowedCountries: string[];
  showMessage: string;
  redirectToServices: boolean;
}

export const defaultSettings: GeoBlockSettings = {
  enabled: false, // DISABLED by default — admin must enable manually
  allowedCountries: [...GULF_COUNTRIES],
  showMessage: 'عذراً، خدمة الحجز متاحة فقط في دول الخليج العربي حالياً. يمكنك تصفح خدماتنا ومعرفة المزيد عن رحلاتنا.',
  redirectToServices: true,
};

/** Read settings from localStorage */
export function getStoredSettings(): GeoBlockSettings {
  try {
    const stored = localStorage.getItem(GEO_SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { ...defaultSettings };
}

/** Save settings to localStorage */
export function saveSettings(settings: GeoBlockSettings) {
  localStorage.setItem(GEO_SETTINGS_KEY, JSON.stringify(settings));
}

/** Check if geo-blocking is currently enabled */
export function isGeoBlockingEnabled(): boolean {
  return getStoredSettings().enabled;
}

/** Check if a specific country code is allowed */
export function isAllowedCountry(countryCode: string): boolean {
  const settings = getStoredSettings();
  if (!settings.enabled) return true; // if disabled, all countries allowed
  return settings.allowedCountries.includes(countryCode);
}

/** Clear cached geo data so next visit re-detects */
export function clearGeoCache() {
  try { sessionStorage.removeItem(GEO_CACHE_KEY); } catch { /* ignore */ }
}

// ─── Bot Detection ───────────────────────────────────────────
const BOT_UAS = /bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot/i;

export function isBot(): boolean {
  return BOT_UAS.test(navigator.userAgent);
}

// ─── Should user see blocked page? ───────────────────────────
export function shouldShowBlockedPage(): boolean {
  const settings = getStoredSettings();
  // If blocking is disabled, no one sees blocked page
  if (!settings.enabled) return false;
  // If bot and blocking enabled → show blocked page (bots don't need booking)
  if (isBot()) return true;
  // For humans: check cached country first
  try {
    const cached = sessionStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const code = (parsed.countryCode || '').toUpperCase();
      return !settings.allowedCountries.includes(code);
    }
  } catch { /* ignore */ }
  // No cached data yet → let them through (will be checked on next render)
  return false;
}

// ─── Main Hook ───────────────────────────────────────────────
export function useGeoBlock() {
  const settingsRef = useRef(getStoredSettings());
  const [geo, setGeo] = useState<GeoData>({
    countryCode: '',
    countryName: '',
    city: '',
    isAllowed: true,
    loading: true,
    error: null,
  });

  const [settings, setSettingsState] = useState<GeoBlockSettings>(settingsRef.current);

  // Poll localStorage for external changes (from admin dashboard)
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = getStoredSettings();
      const current = JSON.stringify(settingsRef.current);
      const updated = JSON.stringify(fresh);
      if (current !== updated) {
        settingsRef.current = fresh;
        setSettingsState(fresh);
        // If country already detected, re-check against new settings
        setGeo(prev => {
          if (!prev.countryCode || prev.loading) return prev;
          return {
            ...prev,
            isAllowed: !fresh.enabled || fresh.allowedCountries.includes(prev.countryCode),
          };
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const detectCountry = useCallback(async () => {
    // Bots: treat as allowed (they see the blocked page via shouldShowBlockedPage)
    if (isBot()) {
      setGeo({
        countryCode: 'BOT',
        countryName: 'Search Engine Bot',
        city: '',
        isAllowed: true,
        loading: false,
        error: null,
      });
      return;
    }

    // Check cached country first
    try {
      const cached = sessionStorage.getItem(GEO_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const code = (parsed.countryCode || '').toUpperCase();
        const freshSettings = getStoredSettings();
        settingsRef.current = freshSettings;
        setSettingsState(freshSettings);
        setGeo({
          countryCode: code,
          countryName: parsed.countryName || '',
          city: parsed.city || '',
          isAllowed: !freshSettings.enabled || freshSettings.allowedCountries.includes(code),
          loading: false,
          error: null,
        });
        return;
      }
    } catch { /* ignore, fetch fresh */ }

    // Safe sessionStorage wrapper (Safari private mode may throw)
    const safeSet = (key: string, val: string) => {
      try { sessionStorage.setItem(key, val); } catch { /* ignore */ }
    };

    // Try primary API with 5s timeout
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch('https://ipapi.co/json/', { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        const code = (data.country_code || '').toUpperCase();
        const freshSettings = getStoredSettings();
        settingsRef.current = freshSettings;
        setSettingsState(freshSettings);
        const result: GeoData = {
          countryCode: code,
          countryName: data.country_name || '',
          city: data.city || '',
          isAllowed: !freshSettings.enabled || freshSettings.allowedCountries.includes(code),
          loading: false,
          error: null,
        };
        setGeo(result);
        safeSet(GEO_CACHE_KEY, JSON.stringify({ countryCode: code, countryName: data.country_name, city: data.city }));
        return;
      }
    } catch { /* try fallback */ }

    // Fallback API with timeout
    try {
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 5000);
      const res2 = await fetch('https://ipgeolocation.io/api/v1/ipgeo?apiKey=demo', { cache: 'no-store', signal: ctrl2.signal });
      clearTimeout(t2);
      if (res2.ok) {
        const data = await res2.json();
        const code = (data.country_code2 || '').toUpperCase();
        const freshSettings = getStoredSettings();
        settingsRef.current = freshSettings;
        setSettingsState(freshSettings);
        setGeo({
          countryCode: code,
          countryName: data.country_name || '',
          city: data.city || '',
          isAllowed: !freshSettings.enabled || freshSettings.allowedCountries.includes(code),
          loading: false,
          error: null,
        });
        safeSet(GEO_CACHE_KEY, JSON.stringify({ countryCode: code, countryName: data.country_name, city: data.city }));
        return;
      }
    } catch { /* fail-open below */ }

    // If all detection fails → allow access (fail-open)
    setGeo({
      countryCode: 'SA',
      countryName: 'المملكة العربية السعودية',
      city: 'الرياض',
      isAllowed: true,
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    detectCountry();
  }, [detectCountry]);

  // Derived values
  const canBook = !settings.enabled || (settings.enabled && geo.isAllowed);
  const isBlocked = settings.enabled && !geo.isAllowed && !geo.loading && geo.countryCode !== '';

  const updateSettings = useCallback((newSettings: GeoBlockSettings) => {
    setSettingsState(newSettings);
    saveSettings(newSettings);
    settingsRef.current = newSettings;
    // Re-evaluate current geo against new settings
    setGeo(prev => {
      if (!prev.countryCode || prev.loading) return prev;
      return {
        ...prev,
        isAllowed: !newSettings.enabled || newSettings.allowedCountries.includes(prev.countryCode),
      };
    });
  }, []);

  return {
    geo,
    settings,
    updateSettings,
    canBook,
    isBlocked,
    detectCountry,
  };
}
