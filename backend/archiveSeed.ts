import { TRANSPORT_CITY_CATALOG } from './transportCities.js';

export type ArchiveDocumentName = 'stations' | 'cities' | 'buses' | 'routes';

type Row = Record<string, unknown>;

function countryCode(country: string): string {
  const value = String(country || '').trim().toLowerCase();
  if (!value || value.includes('السعود')) return 'SA';
  if (value.includes('الأرد') || value.includes('الارد')) return 'JO';
  if (value.includes('عمان')) return 'OM';
  if (value.includes('مصر')) return 'EG';
  return 'SA';
}

function archiveCities(): Row[] {
  return TRANSPORT_CITY_CATALOG.map((city, index) => ({
    cityId: index + 1,
    nameAr: city.name,
    nameEn: city.name,
    countryCode: countryCode(city.country),
    active: true,
    stationIds: city.terminals.map((_, terminalIndex) => `${index + 1}-${terminalIndex + 1}`),
    region: city.region,
    aliases: city.aliases ?? [],
  }));
}

function archiveStations(): Row[] {
  return TRANSPORT_CITY_CATALOG.flatMap((city, cityIndex) => {
    const cityId = cityIndex + 1;
    const terminals = city.terminals.length ? city.terminals : [`محطة ${city.name}`];
    return terminals.map((terminal, terminalIndex) => {
      const stationNumber = `${cityId}-${terminalIndex + 1}`;
      const displayName = terminal.includes(city.name) ? terminal : `${city.name} - ${terminal}`;
      return {
        id: `ST-${city.code}-${terminalIndex + 1}`,
        city: city.name,
        name: displayName,
        displayName,
        type: 'both',
        country: countryCode(city.country),
        active: true,
        stationId: stationNumber,
        cityId,
        latitude: city.lat,
        longitude: city.lng,
        gps: { lat: city.lat, lng: city.lng },
        isMain: city.isMain && terminalIndex === 0,
        region: city.region,
        mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${city.lat},${city.lng}`)}`,
      };
    });
  });
}

const BUSES: Row[] = [
  { busTypeId: 1, code: 'VIP32', nameAr: 'VIP', nameEn: 'VIP', capacity: 32, layout: '2+1', active: true },
  { busTypeId: 2, code: 'ECO45', nameAr: 'اقتصادية', nameEn: 'Economy', capacity: 45, layout: '2+2', active: true },
];

export function archiveSeedDocument(name: ArchiveDocumentName): Row[] {
  if (name === 'stations') return archiveStations();
  if (name === 'cities') return archiveCities();
  if (name === 'buses') return BUSES;
  return [];
}

export function seedUiSettings(): Row[] {
  return [
    ['announcement', ''], ['maintenance_mode', 'false'], ['home_title', 'سافر معنا بكل راحة'], ['support_phone', '920000000'],
    ['telegram_enabled', 'false'], ['telegram_bot_token', ''], ['telegram_chat_id', ''],
    ['telegram_events', '["search_created","ticket_selected","passenger_details","booking_created","system_error"]'],
    ['domestic_trips_enabled', 'true'], ['international_trips_enabled', 'true'], ['otp_expiry_minutes', '5'], ['otp_max_attempts', '5'],
    ['theme_primary', '#d6a92f'], ['theme_font', 'Tajawal'], ['home_sections', '["hero","booking","services","faq"]'],
    ['privacy_content', ''], ['terms_content', ''], ['faq_content', '[]'], ['social_links', '{}'],
    ['payment_method_labels', '{"mada":"مدى","visa_mastercard":"فيزا أو ماستركارد"}'], ['error_messages', '{}'],
    ['logo_url', 'assets/images/logo.png'], ['banner_url', ''], ['geo_blocking_enabled', 'true'],
    ['geo_allowed_countries', '["SA","AE","KW","BH","QA"]'], ['geo_cloudflare_enabled', 'false'],
    ['geo_cloudflare_trusted_proxies', ''], ['geo_outside_title', 'خدماتنا متاحة حاليًا داخل دول الخليج المحددة'],
    ['geo_outside_message', 'نعمل على توسيع نطاق خدماتنا إلى منطقتك قريبًا. يمكنك متابعة آخر الأخبار أو التواصل معنا.'],
    ['geo_outside_cta_label', 'تواصل معنا'], ['geo_outside_cta_url', ''], ['geo_unknown_policy', 'allow'],
  ].map(([setting_key, setting_value]) => ({ setting_key, setting_value }));
}

export function seedFarePricingRules(): Row[] {
  return [
    { fare_code: 'SAVER', display_name: 'التوفيرية', price_per_km: 0.13, minimum_price: 29, maximum_price: 180, active: 1 },
    { fare_code: 'STANDARD', display_name: 'الأساسية', price_per_km: 0.18, minimum_price: 45, maximum_price: 260, active: 1 },
    { fare_code: 'FLEX', display_name: 'المرنة', price_per_km: 0.22, minimum_price: 60, maximum_price: 320, active: 1 },
    { fare_code: 'VIP', display_name: 'المميزة', price_per_km: 0.315, minimum_price: 90, maximum_price: 480, active: 1 },
  ];
}

export function seedPaymentBanks(): Row[] {
  return [
    { bank_key: 'mada', name: 'مدى', name_en: 'Mada', color: '#16A34A', bins_json: '[]', enabled: 1, sort_order: 10 },
    { bank_key: 'visa', name: 'فيزا', name_en: 'Visa', color: '#1A1F71', bins_json: '[]', enabled: 1, sort_order: 20 },
    { bank_key: 'mastercard', name: 'ماستركارد', name_en: 'Mastercard', color: '#EB001B', bins_json: '[]', enabled: 1, sort_order: 30 },
  ];
}

export function seedTrustedDomains(): Row[] { return [{ domain: 'localhost', active: 1 }, { domain: '127.0.0.1', active: 1 }]; }
export function seedChannelConnectors(): Row[] { return ['sms', 'email', 'whatsapp'].map(channel_code => ({ channel_code, enabled: 0, status: 'not_configured' })); }
export function seedRouteOverrides(): Row[] { return []; }
