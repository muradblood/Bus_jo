import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, content) => {
  const full = path.join(root, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.replace(/\r\n/g, '\n'), 'utf8');
};
const mustIndex = (text, marker, label) => {
  const i = text.indexOf(marker);
  if (i < 0) throw new Error(`Missing marker for ${label}: ${marker}`);
  return i;
};

// ─────────────────────────────────────────────────────────────
// AdminDashboard: split each functional tab into its own module.
// The chunks are copied verbatim between existing section markers.
// ─────────────────────────────────────────────────────────────
const adminPath = 'src/features/admin/pages/AdminDashboard.tsx';
const admin = read(adminPath);
const importEnd = mustIndex(admin, '\ntype AdminTab =', 'admin import boundary');
const sharedImports = admin.slice(0, importEnd).trimEnd();
const statusStart = mustIndex(admin, '/* ═════ Status Badge', 'status badge');
const loadingStart = mustIndex(admin, '/* ═════ Loading Screen', 'loading screen');
const statusBadge = admin.slice(statusStart, loadingStart).trim();

const markers = {
  banks: '/* ═════ Bank Storage Helpers ═════════════ */',
  dashboard: '/* ═════ Dashboard Tab ════════════════════ */',
  visitors: '/* ═════ Visitors Tab — Card Layout + Modal ═══════════ */',
  settings: '/* ═════ Settings Tab ═════════════════════ */',
  design: '/* ═══════════════════════════════════════════\n   DESIGN TAB — Control colors, cards, theme\n   ═══════════════════════════════════════════ */',
  telegram: '/* ═════ Telegram Tab ═════════════════════ */',
  finalExport: 'export default AdminDashboard;',
};
for (const [name, marker] of Object.entries(markers)) mustIndex(admin, marker, `admin ${name}`);

const pos = Object.fromEntries(Object.entries(markers).map(([k, m]) => [k, admin.indexOf(m)]));
const chunk = (from, to) => admin.slice(pos[from], pos[to]).trim();
const tabHeader = `${sharedImports}\n\n`;

write('src/features/admin/pages/admin-tabs/BanksTab.tsx', `${tabHeader}${chunk('banks', 'dashboard')}\n\nexport { BanksTab };\n`);
write('src/features/admin/pages/admin-tabs/BookingManagementTabs.tsx', `${tabHeader}${statusBadge}\n\n${chunk('dashboard', 'visitors')}\n\nexport { DashboardTab, BookingsTab, CitiesTab, PricesTab };\n`);
write('src/features/admin/pages/admin-tabs/VisitorsTab.tsx', `${tabHeader}${chunk('visitors', 'settings')}\n\nexport { VisitorsTab };\n`);
write('src/features/admin/pages/admin-tabs/SettingsTab.tsx', `${tabHeader}${chunk('settings', 'design')}\n\nexport { SettingsTab };\n`);
write('src/features/admin/pages/admin-tabs/DesignTab.tsx', `${tabHeader}${chunk('design', 'telegram')}\n\nexport { DesignTab };\n`);
write('src/features/admin/pages/admin-tabs/TelegramTab.tsx', `${tabHeader}${admin.slice(pos.telegram, pos.finalExport).trim()}\n\nexport { TelegramTab };\n`);
write('src/features/admin/pages/admin-tabs/index.ts', [
  "export { BanksTab } from './BanksTab';",
  "export { DashboardTab, BookingsTab, CitiesTab, PricesTab } from './BookingManagementTabs';",
  "export { VisitorsTab } from './VisitorsTab';",
  "export { SettingsTab } from './SettingsTab';",
  "export { DesignTab } from './DesignTab';",
  "export { TelegramTab } from './TelegramTab';",
  '',
].join('\n'));

let adminShell = admin.slice(0, pos.banks).trimEnd();
const socketImport = "import { socket } from '@/lib/socket';";
const tabImports = "import { BanksTab, DashboardTab, BookingsTab, CitiesTab, PricesTab, VisitorsTab, SettingsTab, DesignTab, TelegramTab } from './admin-tabs';";
if (!adminShell.includes(tabImports)) {
  if (!adminShell.includes(socketImport)) throw new Error('Admin socket import anchor missing');
  adminShell = adminShell.replace(socketImport, `${socketImport}\n${tabImports}`);
}
write(adminPath, `${adminShell}\n\nexport default AdminDashboard;\n`);

// ─────────────────────────────────────────────────────────────
// SearchResults: move all types/constants/calculation helpers before the
// main component to a support module. The main JSX and handlers stay verbatim.
// ─────────────────────────────────────────────────────────────
const searchPath = 'src/features/booking/components/SearchResults.tsx';
const search = read(searchPath);
const mainMarker = '// ─── Main Component ───────────────────────────────────────────';
const mainPos = mustIndex(search, mainMarker, 'SearchResults main component');
const firstHelperMarker = '// ─── Use the route prices calculated by the server ────────────';
const helperPos = mustIndex(search, firstHelperMarker, 'SearchResults support start');
const originalImports = search.slice(0, helperPos).trimEnd();
let support = search.slice(0, mainPos).trimEnd();
support = support
  .replace("import LoadingScreen from './LoadingScreen';", "import LoadingScreen from '../LoadingScreen';")
  .replace("import type { BookingData } from './BookingPanel';", "import type { BookingData } from '../BookingPanel';");
support += `\n\nexport {\n  getFareMultiplier, notifyPaymentEntry, fareTypes, featureIconsMap, VisaIcon, MastercardIcon, MadaIcon,\n  basePaymentMethods, CardTypeIconInField, loadingMessages, sleep, generateTrips, formatDate, generateSeats,\n  detectCardType, formatCardNumber, luhnCheck, isExpiryValid, getCardLength, notifyStep,\n};\nexport type { Props, Trip, Passenger, BookerInfo, Step };\n`;
write('src/features/booking/components/search-results/support.tsx', support);

const supportImport = `import {\n  getFareMultiplier, notifyPaymentEntry, fareTypes, featureIconsMap, VisaIcon, MastercardIcon, MadaIcon,\n  basePaymentMethods, CardTypeIconInField, loadingMessages, sleep, generateTrips, formatDate, generateSeats,\n  detectCardType, luhnCheck, isExpiryValid, getCardLength, notifyStep,\n  type Props, type Passenger, type BookerInfo, type Step,\n} from './search-results/support';`;
const searchMain = search.slice(mainPos).trimStart();
write(searchPath, `${originalImports}\n${supportImport}\n\n${searchMain}`);

// Document the second-stage structure without changing runtime behavior.
const structurePath = 'PROJECT_STRUCTURE.md';
let structure = read(structurePath);
const stage2Doc = `\n## Stage 2 module split\n\n- \`src/features/admin/pages/admin-tabs/\` — individual admin dashboard tabs.\n- \`src/features/booking/components/search-results/support.tsx\` — SearchResults types, UI constants, route calculations, validation helpers, and notification-step helpers.\n- \`AdminDashboard.tsx\` is now the dashboard shell/router only; tab JSX lives in the tab modules.\n- \`SearchResults.tsx\` keeps the existing booking/payment step JSX and state flow, while reusable pre-component support code lives separately.\n`;
if (!structure.includes('## Stage 2 module split')) structure += stage2Doc;
write(structurePath, structure);

// Remove this one-shot automation from the final working tree.
if (process.env.CI) {
  for (const p of ['scripts/refactor-stage2.mjs', '.github/workflows/refactor-stage2.yml']) {
    const full = path.join(root, p);
    if (fs.existsSync(full)) fs.rmSync(full);
  }
}

console.log('Stage 2 refactor completed.');
