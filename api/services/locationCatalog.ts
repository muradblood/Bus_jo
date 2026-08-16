import { SAUDI_CITIES, type SaudiCity } from '../data/saudiCities.js';
import { VERIFIED_SAUDI_ROUTES, type VerifiedSaudiRoute, routeKey } from '../data/saudiRoutes.js';
import { dbExec, dbQuery } from '../neonDb.js';

export type ManagedSaudiCity = SaudiCity & {
  active: boolean;
  deleted: boolean;
  source: 'base' | 'admin';
};

export type ManagedSaudiRoute = VerifiedSaudiRoute & {
  active: boolean;
  source: 'base' | 'admin';
};

export async function ensureLocationManagementSchema(): Promise<void> {
  await dbExec(`CREATE TABLE IF NOT EXISTS location_city_overrides (
    city_id VARCHAR(80) PRIMARY KEY,
    city_code VARCHAR(40) NOT NULL,
    name_ar VARCHAR(160) NOT NULL,
    name_en VARCHAR(160) NULL,
    region_ar VARCHAR(160) NOT NULL,
    region_id INTEGER NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    is_main INTEGER NOT NULL DEFAULT 0,
    terminals_json TEXT NOT NULL DEFAULT '[]',
    aliases_json TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    deleted INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await dbExec(`CREATE TABLE IF NOT EXISTS location_route_overrides (
    route_key VARCHAR(180) PRIMARY KEY,
    origin_id VARCHAR(80) NOT NULL,
    destination_id VARCHAR(80) NOT NULL,
    distance_km DOUBLE PRECISION NOT NULL,
    duration_minutes INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    note TEXT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await dbExec(`CREATE TABLE IF NOT EXISTS routing_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}

function safeStringArray(value: unknown, fallback: string[] = []): string[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.map(item => String(item).trim()).filter(Boolean) : fallback;
  } catch {
    return fallback;
  }
}

export async function getManagedSaudiCities(): Promise<ManagedSaudiCity[]> {
  await ensureLocationManagementSchema();
  const rows = await dbQuery<Record<string, unknown>>('SELECT * FROM location_city_overrides');
  const merged = new Map<string, ManagedSaudiCity>(
    SAUDI_CITIES.map(city => [city.id, { ...city, active: true, deleted: false, source: 'base' as const }]),
  );

  for (const row of rows) {
    const id = String(row.city_id || '').trim().toLowerCase();
    if (!id) continue;
    const base = merged.get(id);
    merged.set(id, {
      id,
      code: String(row.city_code || base?.code || id).toUpperCase(),
      nameAr: String(row.name_ar || base?.nameAr || id),
      nameEn: String(row.name_en || base?.nameEn || '') || undefined,
      regionAr: String(row.region_ar || base?.regionAr || ''),
      regionId: row.region_id == null ? base?.regionId : Number(row.region_id),
      lat: Number(row.latitude ?? base?.lat ?? 0),
      lng: Number(row.longitude ?? base?.lng ?? 0),
      isMain: Number(row.is_main ?? (base?.isMain ? 1 : 0)) === 1,
      terminals: safeStringArray(row.terminals_json, base?.terminals || []),
      aliases: safeStringArray(row.aliases_json, base?.aliases || []),
      active: Number(row.active ?? 1) === 1,
      deleted: Number(row.deleted ?? 0) === 1,
      source: 'admin',
    });
  }

  return [...merged.values()].filter(city => !city.deleted);
}

export async function saveManagedSaudiCity(city: SaudiCity & { active?: boolean }): Promise<void> {
  await ensureLocationManagementSchema();
  await dbExec(`INSERT INTO location_city_overrides(
      city_id,city_code,name_ar,name_en,region_ar,region_id,latitude,longitude,is_main,terminals_json,aliases_json,active,deleted,updated_at
    ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,CURRENT_TIMESTAMP)
    ON CONFLICT(city_id) DO UPDATE SET
      city_code=EXCLUDED.city_code,name_ar=EXCLUDED.name_ar,name_en=EXCLUDED.name_en,region_ar=EXCLUDED.region_ar,
      region_id=EXCLUDED.region_id,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,is_main=EXCLUDED.is_main,
      terminals_json=EXCLUDED.terminals_json,aliases_json=EXCLUDED.aliases_json,active=EXCLUDED.active,deleted=0,updated_at=CURRENT_TIMESTAMP`, [
    city.id.toLowerCase(), city.code.toUpperCase(), city.nameAr, city.nameEn || null, city.regionAr, city.regionId || null,
    city.lat, city.lng, city.isMain ? 1 : 0, JSON.stringify(city.terminals || []), JSON.stringify(city.aliases || []), city.active === false ? 0 : 1,
  ]);
}

export async function setManagedSaudiCityState(id: string, options: { active?: boolean; deleted?: boolean }): Promise<void> {
  await ensureLocationManagementSchema();
  const base = SAUDI_CITIES.find(city => city.id === id.toLowerCase());
  if (!base) throw new Error('Unknown base city; save the city first');
  await saveManagedSaudiCity({ ...base, active: options.active ?? !options.deleted });
  if (options.deleted) await dbExec('UPDATE location_city_overrides SET deleted=1,active=0,updated_at=CURRENT_TIMESTAMP WHERE city_id=$1', [id.toLowerCase()]);
}

export async function resetManagedSaudiCity(id: string): Promise<void> {
  await ensureLocationManagementSchema();
  await dbExec('DELETE FROM location_city_overrides WHERE city_id=$1', [id.toLowerCase()]);
}

export async function getManagedSaudiRoutes(): Promise<ManagedSaudiRoute[]> {
  await ensureLocationManagementSchema();
  const baseRows: ManagedSaudiRoute[] = VERIFIED_SAUDI_ROUTES.map(route => ({ ...route, active: true, source: 'base' }));
  const merged = new Map(baseRows.map(route => [routeKey(route.originId, route.destinationId), route]));
  const rows = await dbQuery<Record<string, unknown>>('SELECT * FROM location_route_overrides');
  for (const row of rows) {
    const originId = String(row.origin_id || '').toLowerCase();
    const destinationId = String(row.destination_id || '').toLowerCase();
    if (!originId || !destinationId) continue;
    merged.set(routeKey(originId, destinationId), {
      originId,
      destinationId,
      distanceKm: Number(row.distance_km),
      durationMinutes: Number(row.duration_minutes),
      source: 'admin',
      verifiedAt: new Date().toISOString(),
      note: row.note ? String(row.note) : undefined,
      active: Number(row.active ?? 1) === 1,
    });
  }
  return [...merged.values()];
}

export async function saveManagedSaudiRoute(input: {
  originId: string;
  destinationId: string;
  distanceKm: number;
  durationMinutes: number;
  active?: boolean;
  note?: string;
}): Promise<void> {
  await ensureLocationManagementSchema();
  const originId = input.originId.toLowerCase();
  const destinationId = input.destinationId.toLowerCase();
  if (!originId || !destinationId || originId === destinationId) throw new Error('Invalid route');
  await dbExec(`INSERT INTO location_route_overrides(route_key,origin_id,destination_id,distance_km,duration_minutes,active,note,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)
    ON CONFLICT(route_key) DO UPDATE SET origin_id=EXCLUDED.origin_id,destination_id=EXCLUDED.destination_id,
      distance_km=EXCLUDED.distance_km,duration_minutes=EXCLUDED.duration_minutes,active=EXCLUDED.active,note=EXCLUDED.note,updated_at=CURRENT_TIMESTAMP`, [
    routeKey(originId, destinationId), originId, destinationId, Math.max(0.1, input.distanceKm), Math.max(1, Math.round(input.durationMinutes)), input.active === false ? 0 : 1, input.note || null,
  ]);
}

export async function deleteManagedSaudiRoute(originId: string, destinationId: string): Promise<void> {
  await ensureLocationManagementSchema();
  await dbExec('DELETE FROM location_route_overrides WHERE route_key=$1', [routeKey(originId, destinationId)]);
}

export async function resetAllLocationManagement(): Promise<void> {
  await ensureLocationManagementSchema();
  await dbExec('DELETE FROM location_city_overrides');
  await dbExec('DELETE FROM location_route_overrides');
  await dbExec('DELETE FROM routing_settings');
}
