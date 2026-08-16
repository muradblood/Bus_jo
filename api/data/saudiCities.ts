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
};

const normalizeRegion = (name: string) => name === 'الشرقية' ? 'المنطقة الشرقية' : name;

const regionIdByName = new Map(
  [...SAUDI_REGION_BY_ID.values()].map(region => [region.nameAr, region.id]),
);

export const SAUDI_CITIES: readonly SaudiCity[] = TRANSPORT_CITY_CATALOG
  .filter(city => city.country === 'السعودية')
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

export const SAUDI_CITY_BY_ID = new Map(SAUDI_CITIES.map(city => [city.id, city]));
export const SAUDI_CITY_BY_CODE = new Map(SAUDI_CITIES.map(city => [city.code, city]));

export function findSaudiCity(value: string): SaudiCity | undefined {
  const needle = value.trim().toLowerCase();
  return SAUDI_CITIES.find(city =>
    city.id === needle ||
    city.code.toLowerCase() === needle ||
    city.nameAr.toLowerCase() === needle ||
    city.aliases.some(alias => alias.toLowerCase() === needle),
  );
}
