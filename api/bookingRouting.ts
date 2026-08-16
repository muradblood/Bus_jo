import type { Request, Response } from 'express';
import { dbExec, ensureArchiveDatabase, neonConfigured } from './neonDb.js';
import { getManagedSaudiCities } from './services/locationCatalog.js';
import { calculateSaudiRoute } from './services/routeCalculator.js';
import { calculateFarePrices, type FarePriceResult } from './services/pricingEngine.js';
import { getInternationalCity, listInternationalCities, listInternationalCountries, findInternationalRoute } from './services/internationalCatalog.js';

type PublicCity = {
  cityId: number; cityKey: string; nameAr: string; nameEn: string; countryCode:'SA'; active:boolean;
  region:string; regionId?:number; latitude:number; longitude:number; source:'base'|'admin';
};
const json=(res:Response,body:unknown,status=200)=>res.status(status).setHeader('Cache-Control','no-store').json(body);
const text=(v:unknown,max=160)=>String(v??'').trim().slice(0,max);
const num=(v:unknown,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const bool=(v:unknown)=>v===true||v===1||v==='1'||v==='true'||v==='on';
const dateOnly=(v:unknown)=>/^\d{4}-\d{2}-\d{2}$/.test(text(v,10))?text(v,10):null;
const ip=(req:Request)=>(String(req.headers['x-forwarded-for']||'').split(',')[0].trim()||req.ip||req.socket.remoteAddress||'0.0.0.0').slice(0,45);
const sessionId=(req:Request)=>{const v=text(req.headers['x-session-id'],80);return /^SES-[A-Za-z0-9-]{12,70}$/.test(v)?v:''};
function syntheticCityId(key:string){let hash=2166136261;for(let i=0;i<key.length;i++){hash^=key.charCodeAt(i);hash=Math.imul(hash,16777619)}return 900000+((hash>>>0)%90000000)}
function numericCityId(city:{id:string;nationalAddressCityId?:number}){return city.nationalAddressCityId??syntheticCityId(city.id)}
async function publicCities():Promise<PublicCity[]>{const items=await getManagedSaudiCities();return items.map(c=>({cityId:numericCityId(c),cityKey:c.id,nameAr:c.nameAr,nameEn:c.nameEn||c.nameAr,countryCode:'SA',active:c.active,region:c.regionAr,regionId:c.regionId,latitude:c.lat,longitude:c.lng,source:c.source}))}
async function resolveSaudiCity(value:unknown){const items=await getManagedSaudiCities(),raw=text(value,100).toLowerCase();return items.find(c=>c.active&&(c.id===raw||c.code.toLowerCase()===raw||String(numericCityId(c))===raw||c.nameAr.toLowerCase()===raw||String(c.nameEn||'').toLowerCase()===raw))}
function localTime(value:Date){return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(value)}
function fareOptions(prices:FarePriceResult[],tripMode:'oneway'|'round'){return prices.map(p=>({code:p.fareCode,name:p.displayName,available:true,one_way_min:p.oneWayPrice,one_way_max:p.oneWayPrice,round_trip_price:p.roundTripPrice,selected_price:p.selectedPrice,trip_mode:tripMode,baggage:p.fareCode==='VIP'?'أمتعة واسعة وخدمة مميزة':'حقيبة يد وأمتعة شحن',pricing_breakdown:p.breakdown}))}
function tripSlots(date:string,durationMinutes:number,routeId:string,distanceKm:number,fares:any[],stops:string[]=[]){const slots:Array<[string,string,number]>=[['05:30','direct',0],['08:00','standard',0],['11:30','transit',45],['15:00','direct',0],['19:30','standard',0]];const standard=fares.find(f=>f.code==='STANDARD')||fares[0]||{selected_price:0};return slots.map(([time,kind,extra],index)=>{const departure=new Date(`${date}T${time}:00+03:00`),duration=durationMinutes+extra,arrival=new Date(departure.getTime()+duration*60000);return{id:`${routeId}-${date}-${index+1}`,departure:departure.toISOString(),arrival:arrival.toISOString(),departure_time:`${time}:00`,arrival_time:localTime(arrival),duration_minutes:duration,distance_km:distanceKm,trip_type:kind,price:num(standard.selected_price),available_seats:Math.max(8,34-index*4),bus_class:index===3?'VIP':'STANDARD',fare_options:fares,stops}})}
async function recordSearch(req:Request,origin:any,destination:any,date:string,serviceType:'domestic'|'international'){await dbExec('INSERT INTO booking_searches(session_id,ip_address,origin_city_id,destination_city_id,origin_name,destination_name,travel_date,return_date,service_type,trip_type,passenger_count,ticket_type,direct_only) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[sessionId(req)||null,ip(req),serviceType==='domestic'?numericCityId(origin):0,serviceType==='domestic'?numericCityId(destination):0,origin.nameAr,destination.nameAr,date,dateOnly(req.body?.returnDate),serviceType,bool(req.body?.isRoundTrip)?'round':'oneway',Math.max(1,Math.min(12,Math.trunc(num(req.body?.passengerCount,1)))),text(req.body?.ticketType,40)||null,bool(req.body?.directOnly)?1:0])}

export async function handleBookingRouting(req:Request,res:Response):Promise<boolean>{
  if(!req.path.startsWith('/api/booking'))return false;
  const path=req.path.replace(/^\/api\/booking\/?/,'');
  const supported=['lookups/cities','lookups/countries','lookups/international-cities','trips/search','route/preview'];
  if(!supported.includes(path))return false;
  if(!neonConfigured()){json(res,{status:'error',message:'DATABASE_URL غير مربوط'},503);return true}
  await ensureArchiveDatabase();

  if(path==='lookups/cities'&&req.method==='GET'){
    let items=await publicCities();if(bool(req.query.activeOnly))items=items.filter(c=>c.active);const regionId=Math.trunc(num(req.query.regionId));if(regionId)items=items.filter(c=>Number(c.regionId)===regionId);const q=text(req.query.q,100).toLowerCase();if(q)items=items.filter(c=>[c.nameAr,c.nameEn,c.cityKey,String(c.cityId)].join(' ').toLowerCase().includes(q));json(res,{status:'success',count:items.length,data:items});return true;
  }
  if(path==='lookups/countries'&&req.method==='GET'){const data=await listInternationalCountries(bool(req.query.activeOnly));json(res,{status:'success',count:data.length,data});return true}
  if(path==='lookups/international-cities'&&req.method==='GET'){const data=await listInternationalCities(text(req.query.countryCode,2)||undefined,bool(req.query.activeOnly));json(res,{status:'success',count:data.length,data});return true}

  const serviceType=text(req.body?.serviceType,30)==='international'||bool(req.body?.isInternational)?'international':'domestic';
  const tripMode: 'oneway'|'round'=bool(req.body?.isRoundTrip)||text(req.body?.tripType,20)==='round'?'round':'oneway';

  if(path==='route/preview'&&req.method==='POST'){
    if(serviceType==='international'){
      const origin=await getInternationalCity(text(req.body?.originCityId??req.body?.originCityKey,60)),destination=await getInternationalCity(text(req.body?.destinationCityId??req.body?.destinationCityKey,60));if(!origin||!destination||origin.id===destination.id){json(res,{status:'error',message:'المدن الدولية المحددة غير صالحة'},422);return true}const route=await findInternationalRoute(origin.id,destination.id);if(!route){json(res,{status:'error',message:'لا يوجد مسار دولي مفعّل بين المدينتين'},404);return true}const prices=await calculateFarePrices({distanceKm:route.distanceKm,originKey:`INTL:${origin.id}`,destinationKey:`INTL:${destination.id}`,tripMode});json(res,{status:'success',data:{...route,origin,destination,fares:fareOptions(prices,tripMode)}});return true;
    }
    const origin=await resolveSaudiCity(req.body?.originCityId??req.body?.originCityKey??req.body?.origin),destination=await resolveSaudiCity(req.body?.destinationCityId??req.body?.destinationCityKey??req.body?.destination);if(!origin||!destination||origin.id===destination.id){json(res,{status:'error',message:'المدن المحددة غير صالحة'},422);return true}const route=await calculateSaudiRoute(origin.id,destination.id);const prices=await calculateFarePrices({distanceKm:route.distanceKm,originKey:origin.id,destinationKey:destination.id,originRegionId:origin.regionId,destinationRegionId:destination.regionId,tripMode});json(res,{status:'success',data:{...route,fares:fareOptions(prices,tripMode)}});return true;
  }

  if(path==='trips/search'&&req.method==='POST'){
    const date=dateOnly(req.body?.travelDate);if(!date){json(res,{status:'error',message:'تاريخ الرحلة غير صالح'},422);return true}
    if(serviceType==='international'){
      const origin=await getInternationalCity(text(req.body?.originCityId??req.body?.originCityKey,60)),destination=await getInternationalCity(text(req.body?.destinationCityId??req.body?.destinationCityKey,60));if(!origin||!destination||origin.id===destination.id){json(res,{status:'error',message:'بيانات المدن الدولية غير صالحة'},422);return true}const route=await findInternationalRoute(origin.id,destination.id);if(!route){json(res,{status:'error',message:'لا يوجد مسار دولي مفعّل بين المدينتين'},404);return true}const prices=await calculateFarePrices({distanceKm:route.distanceKm,originKey:`INTL:${origin.id}`,destinationKey:`INTL:${destination.id}`,tripMode});const fares=fareOptions(prices,tripMode),routeId=`INTL-${route.routeCode}`,trips=tripSlots(date,route.durationMinutes,routeId,route.distanceKm,fares,route.stops);await recordSearch(req,origin,destination,date,'international');const data=trips.map(t=>({tripId:t.id,originCity:origin.nameAr,destinationCity:destination.nameAr,originCityId:origin.id,destinationCityId:destination.id,originCountryCode:origin.countryCode,destinationCountryCode:destination.countryCode,departureTime:t.departure_time,arrivalTime:t.arrival_time,departureDateTime:t.departure,arrivalDateTime:t.arrival,busType:t.bus_class==='VIP'?'VIP':'دولي',busCapacity:t.bus_class==='VIP'?32:45,baseFare:t.price,currency:'SAR',availableSeats:t.available_seats,fareOptions:t.fare_options,routeId,distanceKm:t.distance_km,durationMinutes:t.duration_minutes,routeSource:'verified',routeProvider:'admin-international-route',routeDurationText:`${Math.floor(route.durationMinutes/60)} س ${route.durationMinutes%60} د`,isInternational:true,routeMode:'road',routeStops:route.stops,routePath:route.routePath,ferryFeeNote:''}));json(res,{status:'success',meta:{serviceType:'international',origin,destination,distanceKm:route.distanceKm,durationMinutes:route.durationMinutes,routeSource:'verified',routeProvider:'admin-international-route',pricingSource:'flexible-pricing-engine',tripMode},data});return true;
    }

    const origin=await resolveSaudiCity(req.body?.originCityId??req.body?.originCityKey),destination=await resolveSaudiCity(req.body?.destinationCityId??req.body?.destinationCityKey);if(!origin||!destination||origin.id===destination.id){json(res,{status:'error',message:'بيانات المدن والتاريخ غير صالحة'},422);return true}const route=await calculateSaudiRoute(origin.id,destination.id);const prices=await calculateFarePrices({distanceKm:route.distanceKm,originKey:origin.id,destinationKey:destination.id,originRegionId:origin.regionId,destinationRegionId:destination.regionId,tripMode});const fares=fareOptions(prices,tripMode),routeId=`SA-${origin.id}-${destination.id}`,trips=tripSlots(date,route.durationMinutes,routeId,route.distanceKm,fares);await recordSearch(req,origin,destination,date,'domestic');const data=trips.map(t=>({tripId:t.id,originCity:origin.nameAr,destinationCity:destination.nameAr,originCityId:numericCityId(origin),destinationCityId:numericCityId(destination),departureTime:t.departure_time,arrivalTime:t.arrival_time,departureDateTime:t.departure,arrivalDateTime:t.arrival,busType:t.bus_class==='VIP'?'VIP':'اقتصادية',busCapacity:t.bus_class==='VIP'?32:45,baseFare:t.price,currency:'SAR',availableSeats:t.available_seats,fareOptions:t.fare_options,routeId,distanceKm:t.distance_km,durationMinutes:t.duration_minutes,routeSource:route.source,routeProvider:route.provider,routeDurationText:route.durationTextAr,isInternational:false,routeMode:'road',routeStops:[],ferryFeeNote:''}));json(res,{status:'success',meta:{serviceType:'domestic',origin:{cityId:numericCityId(origin),id:origin.id,nameAr:origin.nameAr,lat:origin.lat,lng:origin.lng},destination:{cityId:numericCityId(destination),id:destination.id,nameAr:destination.nameAr,lat:destination.lat,lng:destination.lng},distanceKm:route.distanceKm,durationMinutes:route.durationMinutes,routeSource:route.source,routeProvider:route.provider,pricingSource:'flexible-pricing-engine',tripMode},data});return true;
  }
  return false;
}
