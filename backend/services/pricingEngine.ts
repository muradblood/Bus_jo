import { dbExec, dbQuery } from '../neonDb.js';

type Row = Record<string, any>;
export type TripMode = 'oneway' | 'round';
export type PricingDraftRule = {
  type: 'distance' | 'region' | 'route';
  fareCode?: string | null;
  pricePerKm?: number | null;
  multiplier?: number | null;
  discountPercent?: number | null;
  minimumPrice?: number | null;
  maximumPrice?: number | null;
  roundTripDiscountPercent?: number | null;
  minKm?: number;
  maxKm?: number | null;
  originRegionId?: number;
  destinationRegionId?: number;
  originKey?: string;
  destinationKey?: string;
};

export type FarePriceResult = {
  fareCode: string;
  displayName: string;
  oneWayPrice: number;
  returnOneWayPrice?: number;
  roundTripPrice: number;
  selectedPrice: number;
  currency: 'SAR';
  breakdown: {
    distanceKm: number;
    returnDistanceKm?: number;
    basePricePerKm: number;
    effectivePricePerKm: number;
    returnEffectivePricePerKm?: number;
    distanceMultiplier: number;
    regionMultiplier: number;
    routeMultiplier: number;
    discountPercent: number;
    returnDiscountPercent?: number;
    roundTripDiscountPercent: number;
    minimumPrice: number;
    maximumPrice: number;
    matchedDistanceRuleId?: number;
    matchedRegionRuleId?: number;
    matchedRouteRuleId?: number;
    returnMatchedDistanceRuleId?: number;
    returnMatchedRegionRuleId?: number;
    returnMatchedRouteRuleId?: number;
  };
};

let schemaPromise: Promise<void> | null = null;
export async function ensurePricingSchema(): Promise<void> {
  if (!schemaPromise) schemaPromise = (async () => {
    await dbExec(`CREATE TABLE IF NOT EXISTS pricing_settings (setting_key VARCHAR(80) PRIMARY KEY,setting_value TEXT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await dbExec(`CREATE TABLE IF NOT EXISTS pricing_distance_rules (id BIGSERIAL PRIMARY KEY,name VARCHAR(120) NOT NULL,min_km DECIMAL(10,2) NOT NULL DEFAULT 0,max_km DECIMAL(10,2) NULL,multiplier DECIMAL(10,4) NOT NULL DEFAULT 1,discount_percent DECIMAL(6,3) NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,priority INTEGER NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await dbExec(`CREATE TABLE IF NOT EXISTS pricing_region_rules (id BIGSERIAL PRIMARY KEY,origin_region_id INTEGER NOT NULL,destination_region_id INTEGER NOT NULL,fare_code VARCHAR(30) NULL,price_per_km DECIMAL(10,4) NULL,multiplier DECIMAL(10,4) NOT NULL DEFAULT 1,discount_percent DECIMAL(6,3) NOT NULL DEFAULT 0,minimum_price DECIMAL(10,2) NULL,maximum_price DECIMAL(10,2) NULL,round_trip_discount_percent DECIMAL(6,3) NULL,active INTEGER NOT NULL DEFAULT 1,priority INTEGER NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await dbExec(`CREATE TABLE IF NOT EXISTS pricing_route_rules (id BIGSERIAL PRIMARY KEY,origin_key VARCHAR(80) NOT NULL,destination_key VARCHAR(80) NOT NULL,fare_code VARCHAR(30) NULL,price_per_km DECIMAL(10,4) NULL,multiplier DECIMAL(10,4) NOT NULL DEFAULT 1,discount_percent DECIMAL(6,3) NOT NULL DEFAULT 0,minimum_price DECIMAL(10,2) NULL,maximum_price DECIMAL(10,2) NULL,round_trip_discount_percent DECIMAL(6,3) NULL,active INTEGER NOT NULL DEFAULT 1,priority INTEGER NOT NULL DEFAULT 0,note VARCHAR(255) NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await dbExec(`CREATE INDEX IF NOT EXISTS idx_pricing_distance_active ON pricing_distance_rules(active,min_km,max_km,priority)`);
    await dbExec(`CREATE INDEX IF NOT EXISTS idx_pricing_region_pair ON pricing_region_rules(origin_region_id,destination_region_id,active,priority)`);
    await dbExec(`CREATE INDEX IF NOT EXISTS idx_pricing_route_pair ON pricing_route_rules(origin_key,destination_key,active,priority)`);
    await dbExec(`INSERT INTO pricing_settings(setting_key,setting_value) VALUES('round_trip_discount_percent','0') ON CONFLICT(setting_key) DO NOTHING`);
  })().catch(error => { schemaPromise = null; throw error; });
  await schemaPromise;
}

const n=(v:unknown,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const pct=(v:unknown)=>Math.max(0,Math.min(100,n(v)));
const money=(v:number)=>Math.round(v*100)/100;
async function globalRoundDiscount(){const r=await dbQuery<Row>("SELECT setting_value FROM pricing_settings WHERE setting_key='round_trip_discount_percent' LIMIT 1");return pct(r[0]?.setting_value)}
async function distanceRule(km:number){return (await dbQuery<Row>(`SELECT * FROM pricing_distance_rules WHERE active=1 AND min_km<=$1 AND (max_km IS NULL OR max_km>=$1) ORDER BY priority DESC,min_km DESC,id DESC LIMIT 1`,[km]))[0]}
async function regionRule(a:number|undefined,b:number|undefined,fare:string){if(!a||!b)return undefined;return (await dbQuery<Row>(`SELECT * FROM pricing_region_rules WHERE active=1 AND origin_region_id=$1 AND destination_region_id=$2 AND (fare_code IS NULL OR fare_code='' OR fare_code=$3) ORDER BY CASE WHEN fare_code=$3 THEN 1 ELSE 0 END DESC,priority DESC,id DESC LIMIT 1`,[a,b,fare]))[0]}
async function routeRule(a:string,b:string,fare:string){return (await dbQuery<Row>(`SELECT * FROM pricing_route_rules WHERE active=1 AND origin_key=$1 AND destination_key=$2 AND (fare_code IS NULL OR fare_code='' OR fare_code=$3) ORDER BY CASE WHEN fare_code=$3 THEN 1 ELSE 0 END DESC,priority DESC,id DESC LIMIT 1`,[a,b,fare]))[0]}
function draftApplies(d:PricingDraftRule|undefined,input:{distanceKm:number;originKey:string;destinationKey:string;originRegionId?:number;destinationRegionId?:number},fare:string){if(!d||d.fareCode&&d.fareCode!==fare)return false;if(d.type==='distance')return input.distanceKm>=n(d.minKm)&& (d.maxKm==null||input.distanceKm<=n(d.maxKm));if(d.type==='region')return Number(d.originRegionId)===Number(input.originRegionId)&&Number(d.destinationRegionId)===Number(input.destinationRegionId);return d.originKey===input.originKey&&d.destinationKey===input.destinationKey}
function asRule(d:PricingDraftRule|undefined){if(!d)return undefined;return {price_per_km:d.pricePerKm,multiplier:d.multiplier??1,discount_percent:d.discountPercent??0,minimum_price:d.minimumPrice,maximum_price:d.maximumPrice,round_trip_discount_percent:d.roundTripDiscountPercent,id:'draft'}}

type DirectionInput={distanceKm:number;originKey:string;destinationKey:string;originRegionId?:number;destinationRegionId?:number};
type DirectionPrice={fareCode:string;displayName:string;price:number;basePpk:number;effectivePpk:number;distanceMultiplier:number;regionMultiplier:number;routeMultiplier:number;discountPercent:number;roundDiscount:number;minimumPrice:number;maximumPrice:number;distanceRule?:Row;regionRule?:Row;routeRule?:Row};
async function directionPrices(input:DirectionInput,draft?:PricingDraftRule):Promise<DirectionPrice[]>{
  const fares=await dbQuery<Row>(`SELECT fare_code,display_name,price_per_km,minimum_price,maximum_price FROM fare_pricing_rules WHERE active=1 ORDER BY CASE fare_code WHEN 'SAVER' THEN 1 WHEN 'STANDARD' THEN 2 WHEN 'FLEX' THEN 3 WHEN 'VIP' THEN 4 ELSE 5 END`);
  const baseDistance=await distanceRule(input.distanceKm),globalRound=await globalRoundDiscount(),out:DirectionPrice[]=[];
  for(const fare of fares){const code=String(fare.fare_code);let dr=baseDistance,rr=await regionRule(input.originRegionId,input.destinationRegionId,code),pr=await routeRule(input.originKey,input.destinationKey,code);if(draftApplies(draft,input,code)){const x=asRule(draft);if(draft?.type==='distance')dr=x;if(draft?.type==='region')rr=x;if(draft?.type==='route')pr=x}const basePpk=Math.max(0,n(fare.price_per_km)),effectivePpk=pr?.price_per_km!=null?n(pr.price_per_km):rr?.price_per_km!=null?n(rr.price_per_km):basePpk,dm=Math.max(0,n(dr?.multiplier,1)),rm=Math.max(0,n(rr?.multiplier,1)),pm=Math.max(0,n(pr?.multiplier,1)),discount=Math.min(100,pct(dr?.discount_percent)+pct(rr?.discount_percent)+pct(pr?.discount_percent)),min=Math.max(0,pr?.minimum_price!=null?n(pr.minimum_price):rr?.minimum_price!=null?n(rr.minimum_price):n(fare.minimum_price)),max=Math.max(min,pr?.maximum_price!=null?n(pr.maximum_price):rr?.maximum_price!=null?n(rr.maximum_price):n(fare.maximum_price,Number.MAX_SAFE_INTEGER));let price=input.distanceKm*effectivePpk*dm*rm*pm;price*=1-discount/100;price=money(Math.min(max,Math.max(min,price)));out.push({fareCode:code,displayName:String(fare.display_name),price,basePpk,effectivePpk,distanceMultiplier:dm,regionMultiplier:rm,routeMultiplier:pm,discountPercent:discount,roundDiscount:pct(pr?.round_trip_discount_percent??rr?.round_trip_discount_percent??globalRound),minimumPrice:min,maximumPrice:max,distanceRule:dr,regionRule:rr,routeRule:pr})}
  return out;
}

export async function calculateFarePrices(input:DirectionInput & {tripMode?:TripMode;returnDistanceKm?:number;returnOriginKey?:string;returnDestinationKey?:string;returnOriginRegionId?:number;returnDestinationRegionId?:number},draft?:PricingDraftRule):Promise<FarePriceResult[]>{
  await ensurePricingSchema();const mode=input.tripMode==='round'?'round':'oneway',outbound=await directionPrices(input,draft);let inbound:DirectionPrice[]=[];if(mode==='round')inbound=await directionPrices({distanceKm:Math.max(1,n(input.returnDistanceKm,input.distanceKm)),originKey:input.returnOriginKey||input.destinationKey,destinationKey:input.returnDestinationKey||input.originKey,originRegionId:input.returnOriginRegionId??input.destinationRegionId,destinationRegionId:input.returnDestinationRegionId??input.originRegionId},draft);
  return outbound.map(o=>{const back=inbound.find(x=>x.fareCode===o.fareCode),returnOne=back?.price??o.price,roundDiscount=Math.max(o.roundDiscount,back?.roundDiscount??0),round=money((o.price+returnOne)*(1-roundDiscount/100));return {fareCode:o.fareCode,displayName:o.displayName,oneWayPrice:o.price,returnOneWayPrice:mode==='round'?returnOne:undefined,roundTripPrice:round,selectedPrice:mode==='round'?round:o.price,currency:'SAR',breakdown:{distanceKm:input.distanceKm,returnDistanceKm:mode==='round'?Math.max(1,n(input.returnDistanceKm,input.distanceKm)):undefined,basePricePerKm:o.basePpk,effectivePricePerKm:o.effectivePpk,returnEffectivePricePerKm:back?.effectivePpk,distanceMultiplier:o.distanceMultiplier,regionMultiplier:o.regionMultiplier,routeMultiplier:o.routeMultiplier,discountPercent:o.discountPercent,returnDiscountPercent:back?.discountPercent,roundTripDiscountPercent:roundDiscount,minimumPrice:o.minimumPrice,maximumPrice:o.maximumPrice,matchedDistanceRuleId:Number.isFinite(Number(o.distanceRule?.id))?Number(o.distanceRule?.id):undefined,matchedRegionRuleId:Number.isFinite(Number(o.regionRule?.id))?Number(o.regionRule?.id):undefined,matchedRouteRuleId:Number.isFinite(Number(o.routeRule?.id))?Number(o.routeRule?.id):undefined,returnMatchedDistanceRuleId:Number.isFinite(Number(back?.distanceRule?.id))?Number(back?.distanceRule?.id):undefined,returnMatchedRegionRuleId:Number.isFinite(Number(back?.regionRule?.id))?Number(back?.regionRule?.id):undefined,returnMatchedRouteRuleId:Number.isFinite(Number(back?.routeRule?.id))?Number(back?.routeRule?.id):undefined}}});
}

export async function previewFarePrices(input:Parameters<typeof calculateFarePrices>[0],draft:PricingDraftRule){return calculateFarePrices(input,draft)}
