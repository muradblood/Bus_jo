import { cities as NATIONAL_ADDRESS_CITIES, regions as NATIONAL_ADDRESS_REGIONS } from 'saudi-national-address';
import { TRANSPORT_CITY_CATALOG } from '../transportCities.js';
import { SAUDI_REGION_BY_ID } from './saudiRegions.js';

export type SaudiCity = {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  regionAr: string;
  regionId?: number;
  lat: number;
  lng: number;
  isMain: boolean;
  terminals: string[];
  aliases: string[];
  nationalAddressCityId?: number;
};

const normalizeRegion = (name: string) => name === 'الشرقية' ? 'المنطقة الشرقية' : name;
const normalizeName = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[إأآ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ى/g, 'ي')
  .replace(/\s+/g, ' ');

const regionIdByName = new Map(
  [...SAUDI_REGION_BY_ID.values()].map(region => [normalizeRegion(region.nameAr), region.id]),
);

const nationalRegionById = new Map(NATIONAL_ADDRESS_REGIONS.map(region => [region.region_id, region]));
const capitalCityIds = new Set(NATIONAL_ADDRESS_REGIONS.map(region => region.capital_city_id));
const transportRows = TRANSPORT_CITY_CATALOG.filter(city => city.country === 'السعودية');

function transportKey(regionId: number | undefined, nameAr: string): string {
  return `${regionId ?? 0}:${normalizeName(nameAr)}`;
}

const transportByOfficialKey = new Map<string, (typeof transportRows)[number]>();
for (const city of transportRows) {
  const regionId = regionIdByName.get(normalizeRegion(city.region));
  const key = transportKey(regionId, city.name);
  if (!transportByOfficialKey.has(key)) transportByOfficialKey.set(key, city);
}

const matchedTransportCodes = new Set<string>();
const officialCities: SaudiCity[] = NATIONAL_ADDRESS_CITIES.map(city => {
  const region = nationalRegionById.get(city.region_id);
  const regionAr = normalizeRegion(region?.name_ar || SAUDI_REGION_BY_ID.get(city.region_id)?.nameAr || '');
  const transport = transportByOfficialKey.get(transportKey(city.region_id, city.name_ar));
  if (transport) matchedTransportCodes.add(transport.code);
  return {
    id: transport ? transport.code.toLowerCase() : `spl-${city.city_id}`,
    code: transport?.code || `SA-${city.city_id}`,
    nameAr: city.name_ar,
    nameEn: city.name_en,
    regionAr,
    regionId: city.region_id,
    lat: city.center[0],
    lng: city.center[1],
    isMain: transport?.isMain ?? capitalCityIds.has(city.city_id),
    terminals: [...(transport?.terminals || [])],
    aliases: [...(transport?.aliases || [])],
    nationalAddressCityId: city.city_id,
  };
});

const transportOnlyCities: SaudiCity[] = transportRows
  .filter(city => !matchedTransportCodes.has(city.code))
  .map(city => ({
    id: city.code.toLowerCase(),
    code: city.code,
    nameAr: city.name,
    regionAr: normalizeRegion(city.region),
    regionId: regionIdByName.get(normalizeRegion(city.region)),
    lat: city.lat,
    lng: city.lng,
    isMain: city.isMain,
    terminals: [...city.terminals],
    aliases: [...(city.aliases || [])],
  }));

export const SAUDI_CITIES: readonly SaudiCity[] = [...officialCities, ...transportOnlyCities];
export const SAUDI_CITY_BY_ID = new Map(SAUDI_CITIES.map(city => [city.id, city]));
export const SAUDI_CITY_BY_CODE = new Map(SAUDI_CITIES.map(city => [city.code.toLowerCase(), city]));
export const SAUDI_CITY_BY_NATIONAL_ADDRESS_ID = new Map(
  SAUDI_CITIES.filter(city => city.nationalAddressCityId != null).map(city => [city.nationalAddressCityId as number, city]),
);

const citySearchIndex = new Map<string, SaudiCity>();
for (const city of SAUDI_CITIES) {
  const keys = [city.id, city.code, city.nameAr, city.nameEn || '', ...city.aliases];
  for (const key of keys) {
    const normalized = normalizeName(key);
    if (normalized && !citySearchIndex.has(normalized)) citySearchIndex.set(normalized, city);
  }
  if (city.nationalAddressCityId != null) citySearchIndex.set(String(city.nationalAddressCityId), city);
}

export function findSaudiCity(value: string): SaudiCity | undefined {
  return citySearchIndex.get(normalizeName(value));
}

export function listSaudiCitiesByRegion(regionId: number): SaudiCity[] {
  return SAUDI_CITIES.filter(city => city.regionId === regionId);
}

export const SAUDI_CITY_STATS = Object.freeze({
  officialCities: NATIONAL_ADDRESS_CITIES.length,
  transportOnlyPoints: transportOnlyCities.length,
  totalCatalogEntries: SAUDI_CITIES.length,
  regions: NATIONAL_ADDRESS_REGIONS.length,
});
