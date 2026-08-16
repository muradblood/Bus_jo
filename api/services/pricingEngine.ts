import { dbExec, dbQuery } from '../neonDb.js';

type Row = Record<string, any>;

export type TripMode = 'oneway' | 'round';

export type FarePriceResult = {
  fareCode: string;
  displayName: string;
  oneWayPrice: number;
  roundTripPrice: number;
  selectedPrice: number;
  currency: 'SAR';
  breakdown: {
    distanceKm: number;
    basePricePerKm: number;
    effectivePricePerKm: number;
    distanceMultiplier: number;
    regionMultiplier: number;
    routeMultiplier: number;
    discountPercent: number;
    roundTripDiscountPercent: number;
    minimumPrice: number;
    maximumPrice: number;
    matchedDistanceRuleId?: number;
    matchedRegionRuleId?: number;
    matchedRouteRuleId?: number;
  };
};

let schemaPromise: Promise<void> | null = null;

export async function ensurePricingSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await dbExec(`CREATE TABLE IF NOT EXISTS pricing_settings (
        setting_key VARCHAR(80) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await dbExec(`CREATE TABLE IF NOT EXISTS pricing_distance_rules (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        min_km DECIMAL(10,2) NOT NULL DEFAULT 0,
        max_km DECIMAL(10,2) NULL,
        multiplier DECIMAL(10,4) NOT NULL DEFAULT 1,
        discount_percent DECIMAL(6,3) NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await dbExec(`CREATE TABLE IF NOT EXISTS pricing_region_rules (
        id BIGSERIAL PRIMARY KEY,
        origin_region_id INTEGER NOT NULL,
        destination_region_id INTEGER NOT NULL,
        fare_code VARCHAR(30) NULL,
        price_per_km DECIMAL(10,4) NULL,
        multiplier DECIMAL(10,4) NOT NULL DEFAULT 1,
        discount_percent DECIMAL(6,3) NOT NULL DEFAULT 0,
        minimum_price DECIMAL(10,2) NULL,
        maximum_price DECIMAL(10,2) NULL,
        round_trip_discount_percent DECIMAL(6,3) NULL,
        active INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await dbExec(`CREATE TABLE IF NOT EXISTS pricing_route_rules (
        id BIGSERIAL PRIMARY KEY,
        origin_key VARCHAR(80) NOT NULL,
        destination_key VARCHAR(80) NOT NULL,
        fare_code VARCHAR(30) NULL,
        price_per_km DECIMAL(10,4) NULL,
        multiplier DECIMAL(10,4) NOT NULL DEFAULT 1,
        discount_percent DECIMAL(6,3) NOT NULL DEFAULT 0,
        minimum_price DECIMAL(10,2) NULL,
        maximum_price DECIMAL(10,2) NULL,
        round_trip_discount_percent DECIMAL(6,3) NULL,
        active INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 0,
        note VARCHAR(255) NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await dbExec(`CREATE INDEX IF NOT EXISTS idx_pricing_distance_active ON pricing_distance_rules(active,min_km,max_km,priority)`);
      await dbExec(`CREATE INDEX IF NOT EXISTS idx_pricing_region_pair ON pricing_region_rules(origin_region_id,destination_region_id,active,priority)`);
      await dbExec(`CREATE INDEX IF NOT EXISTS idx_pricing_route_pair ON pricing_route_rules(origin_key,destination_key,active,priority)`);
      await dbExec(`INSERT INTO pricing_settings(setting_key,setting_value) VALUES('round_trip_discount_percent','0') ON CONFLICT(setting_key) DO NOTHING`);
    })().catch(error => { schemaPromise = null; throw error; });
  }
  await schemaPromise;
}

function n(value: unknown, fallback = 0): number {
  const out = Number(value);
  return Number.isFinite(out) ? out : fallback;
}

function clampPercent(value: unknown): number {
  return Math.max(0, Math.min(100, n(value)));
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

async function globalRoundTripDiscount(): Promise<number> {
  const rows = await dbQuery<Row>("SELECT setting_value FROM pricing_settings WHERE setting_key='round_trip_discount_percent' LIMIT 1");
  return clampPercent(rows[0]?.setting_value);
}

async function matchingDistanceRule(distanceKm: number): Promise<Row | undefined> {
  const rows = await dbQuery<Row>(`SELECT * FROM pricing_distance_rules
    WHERE active=1 AND min_km <= $1 AND (max_km IS NULL OR max_km >= $1)
    ORDER BY priority DESC,min_km DESC,id DESC LIMIT 1`, [distanceKm]);
  return rows[0];
}

async function matchingRegionRule(originRegionId: number | undefined, destinationRegionId: number | undefined, fareCode: string): Promise<Row | undefined> {
  if (!originRegionId || !destinationRegionId) return undefined;
  const rows = await dbQuery<Row>(`SELECT * FROM pricing_region_rules
    WHERE active=1 AND origin_region_id=$1 AND destination_region_id=$2 AND (fare_code IS NULL OR fare_code='' OR fare_code=$3)
    ORDER BY CASE WHEN fare_code=$3 THEN 1 ELSE 0 END DESC,priority DESC,id DESC LIMIT 1`, [originRegionId, destinationRegionId, fareCode]);
  return rows[0];
}

async function matchingRouteRule(originKey: string, destinationKey: string, fareCode: string): Promise<Row | undefined> {
  const rows = await dbQuery<Row>(`SELECT * FROM pricing_route_rules
    WHERE active=1 AND origin_key=$1 AND destination_key=$2 AND (fare_code IS NULL OR fare_code='' OR fare_code=$3)
    ORDER BY CASE WHEN fare_code=$3 THEN 1 ELSE 0 END DESC,priority DESC,id DESC LIMIT 1`, [originKey, destinationKey, fareCode]);
  return rows[0];
}

export async function calculateFarePrices(input: {
  distanceKm: number;
  originKey: string;
  destinationKey: string;
  originRegionId?: number;
  destinationRegionId?: number;
  tripMode?: TripMode;
}): Promise<FarePriceResult[]> {
  await ensurePricingSchema();
  const distanceKm = Math.max(1, n(input.distanceKm, 1));
  const tripMode: TripMode = input.tripMode === 'round' ? 'round' : 'oneway';
  const fares = await dbQuery<Row>(`SELECT fare_code,display_name,price_per_km,minimum_price,maximum_price,active
    FROM fare_pricing_rules WHERE active=1
    ORDER BY CASE fare_code WHEN 'SAVER' THEN 1 WHEN 'STANDARD' THEN 2 WHEN 'FLEX' THEN 3 WHEN 'VIP' THEN 4 ELSE 5 END`);
  const distanceRule = await matchingDistanceRule(distanceKm);
  const globalRoundDiscount = await globalRoundTripDiscount();
  const results: FarePriceResult[] = [];

  for (const fare of fares) {
    const fareCode = String(fare.fare_code);
    const regionRule = await matchingRegionRule(input.originRegionId, input.destinationRegionId, fareCode);
    const routeRule = await matchingRouteRule(input.originKey, input.destinationKey, fareCode);

    const basePpk = Math.max(0, n(fare.price_per_km));
    const effectivePpk = routeRule?.price_per_km != null ? n(routeRule.price_per_km) : regionRule?.price_per_km != null ? n(regionRule.price_per_km) : basePpk;
    const distanceMultiplier = Math.max(0, n(distanceRule?.multiplier, 1));
    const regionMultiplier = Math.max(0, n(regionRule?.multiplier, 1));
    const routeMultiplier = Math.max(0, n(routeRule?.multiplier, 1));
    const discountPercent = Math.min(100, clampPercent(distanceRule?.discount_percent) + clampPercent(regionRule?.discount_percent) + clampPercent(routeRule?.discount_percent));

    const minimumPrice = Math.max(0, routeRule?.minimum_price != null ? n(routeRule.minimum_price) : regionRule?.minimum_price != null ? n(regionRule.minimum_price) : n(fare.minimum_price));
    const maximumPrice = Math.max(minimumPrice, routeRule?.maximum_price != null ? n(routeRule.maximum_price) : regionRule?.maximum_price != null ? n(regionRule.maximum_price) : n(fare.maximum_price, Number.MAX_SAFE_INTEGER));

    let oneWay = distanceKm * effectivePpk * distanceMultiplier * regionMultiplier * routeMultiplier;
    oneWay *= 1 - discountPercent / 100;
    oneWay = Math.min(maximumPrice, Math.max(minimumPrice, oneWay));
    oneWay = money(oneWay);

    const roundTripDiscountPercent = clampPercent(routeRule?.round_trip_discount_percent ?? regionRule?.round_trip_discount_percent ?? globalRoundDiscount);
    const roundTrip = money(oneWay * 2 * (1 - roundTripDiscountPercent / 100));

    results.push({
      fareCode,
      displayName: String(fare.display_name),
      oneWayPrice: oneWay,
      roundTripPrice: roundTrip,
      selectedPrice: tripMode === 'round' ? roundTrip : oneWay,
      currency: 'SAR',
      breakdown: {
        distanceKm,
        basePricePerKm: basePpk,
        effectivePricePerKm: effectivePpk,
        distanceMultiplier,
        regionMultiplier,
        routeMultiplier,
        discountPercent,
        roundTripDiscountPercent,
        minimumPrice,
        maximumPrice,
        matchedDistanceRuleId: distanceRule ? Number(distanceRule.id) : undefined,
        matchedRegionRuleId: regionRule ? Number(regionRule.id) : undefined,
        matchedRouteRuleId: routeRule ? Number(routeRule.id) : undefined,
      },
    });
  }
  return results;
}
