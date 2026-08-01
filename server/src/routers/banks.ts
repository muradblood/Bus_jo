import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db, type Bank } from '../db.js';

type BankSeed = Omit<Bank, 'id' | 'createdAt' | 'updatedAt'>;

const walletKeys = new Set(['stcpay', 'urpay', 'alinmapay', 'mobily-pay', 'enjaz-wallet', 'barq', 'tiqmo', 'hala', 'sifi', 'darbpay']);

function inferType(key: string, bins: string): Bank['type'] {
  return walletKeys.has(key.toLowerCase()) || !bins.trim() ? 'wallet' : 'bank';
}

function makeBank(
  key: string,
  name: string,
  nameEn: string,
  color: string,
  bins: string,
  options: Partial<BankSeed> = {},
): BankSeed {
  return {
    key,
    type: options.type ?? inferType(key, bins),
    name,
    nameEn,
    color,
    colorDark: options.colorDark ?? color,
    colorLight: options.colorLight ?? '#F5F5F5',
    otpMessage: options.otpMessage ?? `أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى ${name}`,
    supportPhone: options.supportPhone ?? '',
    website: options.website ?? '',
    bins,
    logoUrl: options.logoUrl ?? '',
    enabled: options.enabled ?? true,
  };
}

const DEFAULT_BANKS: BankSeed[] = [
  makeBank('alrajhi', 'مصرف الراجحي', 'AL RAJHI BANK', '#1B3A5C', '409201, 429927, 445827, 457553, 484783', { colorDark: '#0F2440', colorLight: '#E8F0F8', supportPhone: '920003344', website: 'alrajhibank.com.sa', logoUrl: '/assets/logos/alrajhi-bank.png' }),
  makeBank('snb', 'البنك الأهلي السعودي', 'SAUDI NATIONAL BANK', '#1A3A5C', '524197, 535825, 545205', { colorDark: '#0F2440', colorLight: '#EDF2F7', supportPhone: '920001000', website: 'alahlisaudi.com' }),
  makeBank('alinma', 'مصرف الإنماء', 'ALINMA BANK', '#1B6B3B', '432328', { colorDark: '#124D29', colorLight: '#E8F5EE', supportPhone: '8001248888', website: 'alinma.com' }),
  makeBank('riyad', 'بنك الرياض', 'RIYAD BANK', '#004B8D', '454683, 457927', { colorDark: '#003566', colorLight: '#E6F0FA', supportPhone: '920002470', website: 'riyadbank.com' }),
  makeBank('bsf', 'البنك السعودي الفرنسي', 'BANQUE SAUDI FRANSI', '#C41E3A', '440647, 457865', { colorDark: '#8A1530', colorLight: '#FDE8EC', supportPhone: '8001244124', website: 'saudifransi.com.sa' }),
  makeBank('anb', 'البنك العربي الوطني', 'ARAB NATIONAL BANK', '#2E5C8A', '455036', { colorDark: '#1E3D5C', colorLight: '#EBF2F8', supportPhone: '920001878', website: 'anb.com.sa' }),
  makeBank('albilad', 'بنك البلاد', 'AL BILAD BANK', '#006F3C', '468540', { colorDark: '#004D29', colorLight: '#E6F5ED', supportPhone: '8001240001', website: 'albilad.com' }),
  makeBank('saib', 'البنك السعودي للاستثمار', 'SAUDI INVESTMENT BANK', '#1A1A2E', '483010', { colorDark: '#0D0D1A', colorLight: '#F0F0F5', supportPhone: '8001249090', website: 'saib.com.sa' }),
  makeBank('stcbank', 'بنك إس تي سي', 'STC BANK', '#4F2D7F', '410685, 457823, 588848, 489022, 489674', { colorDark: '#3D1E63', colorLight: '#F2EDF9', supportPhone: '8001180008', website: 'stcbank.com.sa' }),
  makeBank('stcpay', 'STC Pay', 'STC PAY', '#4F2D7F', '489022, 489674', { type: 'wallet', colorDark: '#3D1E63', colorLight: '#F2EDF9', supportPhone: '8001180008', website: 'stcpay.com.sa' }),
  makeBank('urpay', 'urpay', 'URPAY', '#0A1128', '455720, 455737', { type: 'wallet', colorDark: '#050814', colorLight: '#EEF0F5', supportPhone: '8001241010', website: 'urpay.com.sa', logoUrl: '/assets/logos/urpay-white.png' }),
  makeBank('d360', 'D360 Bank', 'D360 BANK', '#00A9CE', '442463', { colorDark: '#007A96', colorLight: '#E6F8FC', supportPhone: '8001203600', website: 'd360.com.sa' }),
  makeBank('sab', 'البنك السعودي الأول', 'SAUDI AWWAL BANK', '#D11242', '422119', { colorDark: '#A00E33', colorLight: '#FDE8EC', supportPhone: '8001248080', website: 'sab.com' }),
  makeBank('enbd', 'بنك الإمارات دبي الوطني', 'EMIRATES NBD', '#003366', '402283, 423630, 452973', { colorDark: '#002244', colorLight: '#E6EDF5', supportPhone: '600540001', website: 'emiratesnbd.com' }),
  makeBank('fab', 'بنك أبوظبي الأول', 'FAB', '#132247', '401676, 452443', { colorDark: '#0C1630', colorLight: '#E8EBF0', supportPhone: '600525500', website: 'bankfab.com' }),
  makeBank('adcb', 'بنك أبوظبي التجاري', 'ADCB', '#A6192E', '425215, 485125', { colorDark: '#7A1122', colorLight: '#FCE8EB', supportPhone: '600522221', website: 'adcb.com' }),
  makeBank('dib', 'بنك دبي الإسلامي', 'DUBAI ISLAMIC BANK', '#0A5C36', '452402', { colorDark: '#073D24', colorLight: '#E6F5ED', supportPhone: '600500400', website: 'dib.ae' }),
  makeBank('mashreq', 'بنك المشرق', 'MASHREQ BANK', '#FF5F00', '421689', { colorDark: '#CC4C00', colorLight: '#FFF0E6', supportPhone: '600540040', website: 'mashreqbank.com' }),
  makeBank('adib', 'مصرف أبوظبي الإسلامي', 'ADIB', '#005F87', '469415', { colorDark: '#004462', colorLight: '#E6F3F8', supportPhone: '600543216', website: 'adib.ae' }),
  makeBank('liv', 'Liv.', 'LIV. DIGITAL BANK', '#E00074', '434195', { colorDark: '#AD005A', colorLight: '#FDE8F2', supportPhone: '600540000', website: 'liv.me' }),
  makeBank('wio', 'Wio Bank', 'WIO BANK', '#111111', '472531', { colorDark: '#000000', colorLight: '#F0F0F0', supportPhone: '600555020', website: 'wio.io' }),
];

function normalizeLegacyBank(value: unknown): BankSeed | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const key = String(row.key ?? '').trim().toLowerCase();
  const name = String(row.name ?? '').trim();
  if (!key || !name) return null;
  const bins = String(row.bins ?? '');
  return {
    key,
    type: row.type === 'wallet' || row.type === 'bank' ? row.type : inferType(key, bins),
    name,
    nameEn: String(row.nameEn ?? ''),
    color: String(row.color ?? '#1A3A5C'),
    colorDark: String(row.colorDark ?? '#0F2440'),
    colorLight: String(row.colorLight ?? '#EDF2F7'),
    otpMessage: String(row.otpMessage ?? ''),
    supportPhone: String(row.supportPhone ?? ''),
    website: String(row.website ?? ''),
    bins,
    logoUrl: String(row.logoUrl ?? ''),
    enabled: row.enabled !== false,
  };
}

function ensureSeeded(): void {
  if (db.bank.count() > 0) return;
  const legacy = db.setting.findUnique({ where: { key: 'banksData' } });
  let seeds: BankSeed[] = [];
  if (legacy?.value) {
    try {
      const parsed = JSON.parse(legacy.value);
      if (Array.isArray(parsed)) seeds = parsed.map(normalizeLegacyBank).filter((bank): bank is BankSeed => bank !== null);
    } catch {
      seeds = [];
    }
  }
  for (const bank of seeds.length > 0 ? seeds : DEFAULT_BANKS) db.bank.create({ data: bank });
}

const bankFields = {
  name: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().max(160),
  color: z.string().trim().max(32),
  colorDark: z.string().trim().max(32),
  colorLight: z.string().trim().max(32),
  otpMessage: z.string().max(500),
  supportPhone: z.string().max(80),
  website: z.string().max(300),
  bins: z.string().max(1000),
  logoUrl: z.string().max(1_500_000),
  enabled: z.boolean(),
};

const createInput = z.object({
  key: z.string().trim().min(2).max(80).regex(/^[a-z0-9_-]+$/i),
  type: z.enum(['bank', 'wallet']).optional(),
  ...bankFields,
});

const updateInput = z.object({
  key: z.string().trim().min(2).max(80),
  data: z.object({ type: z.enum(['bank', 'wallet']).optional(), ...bankFields }).partial(),
});

export const banksRouter = router({
  publicList: publicProcedure.query(() => {
    ensureSeeded();
    return db.bank.findMany({ where: { enabled: true }, orderBy: { id: 'asc' } });
  }),

  list: adminProcedure.query(() => {
    ensureSeeded();
    return db.bank.findMany({ orderBy: { id: 'asc' } });
  }),

  create: adminProcedure.input(createInput).mutation(({ input }) => {
    ensureSeeded();
    const key = input.key.toLowerCase();
    if (db.bank.findUnique({ where: { key } })) {
      throw new TRPCError({ code: 'CONFLICT', message: 'معرف البنك أو المحفظة مستخدم مسبقاً' });
    }
    return db.bank.create({ data: { ...input, key, type: input.type ?? inferType(key, input.bins) } });
  }),

  update: adminProcedure.input(updateInput).mutation(({ input }) => {
    ensureSeeded();
    const current = db.bank.findUnique({ where: { key: input.key } });
    if (!current) throw new TRPCError({ code: 'NOT_FOUND', message: 'البنك أو المحفظة غير موجود' });
    const nextBins = input.data.bins ?? current.bins;
    return db.bank.update({
      where: { key: input.key },
      data: { ...input.data, type: input.data.type ?? inferType(current.key, nextBins) },
    });
  }),

  toggle: adminProcedure.input(z.object({ key: z.string(), enabled: z.boolean() })).mutation(({ input }) => {
    ensureSeeded();
    return db.bank.update({ where: { key: input.key }, data: { enabled: input.enabled } });
  }),

  delete: adminProcedure.input(z.object({ key: z.string() })).mutation(({ input }) => {
    ensureSeeded();
    db.bank.delete({ where: { key: input.key } });
    return { success: true };
  }),
});
