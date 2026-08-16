import { dbExec, dbQuery } from '../neonDb.js';

type Row = Record<string, any>;

export type InternationalCountry = { code: string; nameAr: string; nameEn: string; active: boolean; sortOrder: number };
export type InternationalCity = { id: string; countryCode: string; nameAr: string; nameEn: string; lat: number; lng: number; active: boolean; sortOrder: number };
export type InternationalRoute = {
  id: number;
  routeCode: string;
  originCityId: string;
  destinationCityId: string;
  distanceKm: number;
  durationMinutes: number;
  stops: string[];
  routePath: Array<{ cityId?: string; name?: string; lat?: number; lng?: number }>;
  active: boolean;
  note: string;
};

let schemaPromise: Promise<void> | null = null;
export async function ensureInternationalSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await dbExec(`CREATE TABLE IF NOT EXISTS international_countries (
        country_code CHAR(2) PRIMARY KEY,
        name_ar VARCHAR(120) NOT NULL,
        name_en VARCHAR(120) NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await dbExec(`CREATE TABLE IF NOT EXISTS international_cities (
        city_id VARCHAR(60) PRIMARY KEY,
        country_code CHAR(2) NOT NULL REFERENCES international_countries(country_code) ON DELETE CASCADE,
        name_ar VARCHAR(160) NOT NULL,
        name_en VARCHAR(160) NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await dbExec(`CREATE TABLE IF NOT EXISTS international_routes (
        id BIGSERIAL PRIMARY KEY,
        route_code VARCHAR(80) NOT NULL UNIQUE,
        origin_city_id VARCHAR(60) NOT NULL REFERENCES international_cities(city_id) ON DELETE CASCADE,
        destination_city_id VARCHAR(60) NOT NULL REFERENCES international_cities(city_id) ON DELETE CASCADE,
        distance_km DECIMAL(10,2) NOT NULL,
        duration_minutes INTEGER NOT NULL,
        stops_json TEXT NOT NULL DEFAULT '[]',
        route_path_json TEXT NOT NULL DEFAULT '[]',
        active INTEGER NOT NULL DEFAULT 1,
        note VARCHAR(255) NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await dbExec(`CREATE INDEX IF NOT EXISTS idx_intl_city_country ON international_cities(country_code,active,sort_order)`);
      await dbExec(`CREATE INDEX IF NOT EXISTS idx_intl_route_pair ON international_routes(origin_city_id,destination_city_id,active)`);
      const seeds: InternationalCountry[] = [
        { code:'SA', nameAr:'المملكة العربية السعودية', nameEn:'Saudi Arabia', active:true, sortOrder:1 },
        { code:'JO', nameAr:'الأردن', nameEn:'Jordan', active:true, sortOrder:10 },
        { code:'AE', nameAr:'الإمارات العربية المتحدة', nameEn:'United Arab Emirates', active:true, sortOrder:20 },
        { code:'KW', nameAr:'الكويت', nameEn:'Kuwait', active:true, sortOrder:30 },
        { code:'BH', nameAr:'البحرين', nameEn:'Bahrain', active:true, sortOrder:40 },
        { code:'QA', nameAr:'قطر', nameEn:'Qatar', active:true, sortOrder:50 },
        { code:'OM', nameAr:'عُمان', nameEn:'Oman', active:true, sortOrder:60 },
      ];
      for (const country of seeds) {
        await dbExec(`INSERT INTO international_countries(country_code,name_ar,name_en,active,sort_order)
          VALUES($1,$2,$3,$4,$5) ON CONFLICT(country_code) DO NOTHING`, [country.code,country.nameAr,country.nameEn,country.active?1:0,country.sortOrder]);
      }
    })().catch(error => { schemaPromise = null; throw error; });
  }
  await schemaPromise;
}

const parse = <T>(value: unknown, fallback: T): T => { try { return typeof value === 'string' ? JSON.parse(value) as T : fallback; } catch { return fallback; } };

export async function listInternationalCountries(activeOnly = false): Promise<InternationalCountry[]> {
  await ensureInternationalSchema();
  const rows = await dbQuery<Row>(`SELECT country_code,name_ar,name_en,active,sort_order FROM international_countries ${activeOnly?'WHERE active=1':''} ORDER BY sort_order,name_ar`);
  return rows.map(r => ({ code:String(r.country_code), nameAr:String(r.name_ar), nameEn:String(r.name_en), active:Number(r.active)===1, sortOrder:Number(r.sort_order)||0 }));
}

export async function listInternationalCities(countryCode?: string, activeOnly = false): Promise<InternationalCity[]> {
  await ensureInternationalSchema();
  const params: unknown[] = [];
  const where: string[] = [];
  if (countryCode) { params.push(countryCode.toUpperCase()); where.push(`country_code=$${params.length}`); }
  if (activeOnly) where.push('active=1');
  const rows = await dbQuery<Row>(`SELECT city_id,country_code,name_ar,name_en,latitude,longitude,active,sort_order FROM international_cities${where.length?' WHERE '+where.join(' AND '):''} ORDER BY sort_order,name_ar`, params);
  return rows.map(r => ({ id:String(r.city_id), countryCode:String(r.country_code), nameAr:String(r.name_ar), nameEn:String(r.name_en), lat:Number(r.latitude), lng:Number(r.longitude), active:Number(r.active)===1, sortOrder:Number(r.sort_order)||0 }));
}

export async function listInternationalRoutes(activeOnly = false): Promise<InternationalRoute[]> {
  await ensureInternationalSchema();
  const rows = await dbQuery<Row>(`SELECT * FROM international_routes ${activeOnly?'WHERE active=1':''} ORDER BY route_code`);
  return rows.map(r => ({ id:Number(r.id), routeCode:String(r.route_code), originCityId:String(r.origin_city_id), destinationCityId:String(r.destination_city_id), distanceKm:Number(r.distance_km), durationMinutes:Number(r.duration_minutes), stops:parse<string[]>(r.stops_json,[]), routePath:parse<any[]>(r.route_path_json,[]), active:Number(r.active)===1, note:String(r.note||'') }));
}

export async function findInternationalRoute(originCityId: string, destinationCityId: string): Promise<InternationalRoute | null> {
  const routes = await listInternationalRoutes(true);
  return routes.find(r => r.originCityId===originCityId && r.destinationCityId===destinationCityId) || null;
}

export async function getInternationalCity(cityId: string): Promise<InternationalCity | null> {
  const rows = await listInternationalCities();
  return rows.find(c => c.id===cityId) || null;
}
