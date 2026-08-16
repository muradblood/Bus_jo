import type { Request, Response } from 'express';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { SAUDI_REGIONS } from './data/saudiRegions.js';
import {
  getManagedLocationSnapshot,
  resetAllLocationManagement,
  resetManagedSaudiCity,
  saveManagedSaudiCity,
  saveManagedSaudiRoute,
  setManagedSaudiCityState,
  deleteManagedSaudiRoute,
} from './services/locationCatalog.js';
import { calculateSaudiRoute, clearRouteCalculationCache } from './services/routeCalculator.js';

const COOKIE = 'sat_archive_admin';
const SECRET = process.env.SESSION_SECRET || '';

type AdminSession = {
  user: { id: number; name: string; email: string; role: string };
  csrf: string;
  exp: number;
};

function cookies(header?: string) {
  const out: Record<string, string> = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function key() {
  return createHash('sha256').update(SECRET || 'unconfigured').digest();
}

function sign(value: string) {
  return createHmac('sha256', key()).update(value).digest('base64url');
}

function readSession(req: Request): AdminSession | null {
  const token = cookies(req.headers.cookie)[COOKIE];
  if (!token || SECRET.length < 32) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSession;
    return session?.user?.id && session.csrf && session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function text(value: unknown, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}

function number(value: unknown) {
  return Number(value);
}

function bool(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

function json(res: Response, body: unknown, status = 200) {
  return res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}

function htmlPage() {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>إدارة المدن والمسارات</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#f6f7f9;color:#172033}.top{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e5e7eb;padding:14px 18px;display:flex;gap:10px;align-items:center;justify-content:space-between}.brand{font-size:20px;font-weight:900;color:#a77c17}.actions{display:flex;gap:8px;flex-wrap:wrap}.btn{border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;background:#b58a24;color:white}.btn.light{background:#fff;color:#273142;border:1px solid #d7dce3}.btn.danger{background:#b42318}.wrap{padding:18px;max-width:1500px;margin:auto}.tabs{display:flex;gap:8px;margin-bottom:16px}.tab{padding:10px 16px;border-radius:12px;border:1px solid #dfe3e9;background:#fff;font-weight:800;cursor:pointer}.tab.active{background:#b58a24;color:#fff;border-color:#b58a24}.grid{display:grid;grid-template-columns:minmax(320px,430px) 1fr;gap:16px}.card{background:#fff;border:1px solid #e2e6eb;border-radius:16px;padding:16px;box-shadow:0 8px 30px #00000008}.card h2{margin:0 0 14px;font-size:18px}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.field{margin-bottom:10px}.field label{display:block;font-size:13px;font-weight:800;margin-bottom:5px}.field input,.field select,.field textarea{width:100%;padding:10px;border:1px solid #d5dae1;border-radius:9px;background:#fff}.field textarea{min-height:70px;resize:vertical}.toolbar{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}.toolbar input,.toolbar select{padding:10px;border:1px solid #d5dae1;border-radius:9px}.table-wrap{overflow:auto;max-height:70vh;border:1px solid #eceff3;border-radius:12px}table{width:100%;border-collapse:collapse;min-width:850px}th,td{padding:10px;border-bottom:1px solid #edf0f3;text-align:right;font-size:13px}th{position:sticky;top:0;background:#fafbfc;z-index:1}.badge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:800;background:#eef2f6}.ok{background:#e8f7ee;color:#176b39}.off{background:#fdecec;color:#a61b1b}.muted{color:#6b7280}.msg{min-height:24px;margin:8px 0;font-weight:700}.hidden{display:none}@media(max-width:900px){.grid{grid-template-columns:1fr}.top{align-items:flex-start;flex-direction:column}.wrap{padding:10px}.row{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="top"><div><div class="brand">SAT Control</div><div class="muted">إدارة المدن والمسارات السعودية</div></div><div class="actions"><button class="btn light" onclick="top.location.hash='/admin'">العودة للوحة التحكم</button><button class="btn danger" id="resetAll">استعادة جميع البيانات الأصلية</button></div></div>
<div class="wrap">
<div class="tabs"><button class="tab active" data-tab="cities">المدن</button><button class="tab" data-tab="routes">المسارات</button></div>
<div id="message" class="msg"></div>
<section id="citiesTab" class="grid">
<div class="card"><h2>إضافة / تعديل مدينة</h2><form id="cityForm">
<div class="row"><div class="field"><label>ID</label><input id="cityId" placeholder="riyadh" required></div><div class="field"><label>الكود</label><input id="cityCode" placeholder="RUH" required></div></div>
<div class="row"><div class="field"><label>الاسم العربي</label><input id="cityNameAr" required></div><div class="field"><label>الاسم الإنجليزي</label><input id="cityNameEn"></div></div>
<div class="row"><div class="field"><label>المنطقة</label><select id="cityRegion" required></select></div><div class="field"><label>مدينة رئيسية</label><select id="cityMain"><option value="0">لا</option><option value="1">نعم</option></select></div></div>
<div class="row"><div class="field"><label>Latitude</label><input id="cityLat" type="number" step="any" required></div><div class="field"><label>Longitude</label><input id="cityLng" type="number" step="any" required></div></div>
<div class="field"><label>الأسماء البديلة - افصل بفاصلة</label><input id="cityAliases"></div><div class="field"><label>المحطات - افصل بفاصلة</label><input id="cityTerminals"></div>
<div class="field"><label>الحالة</label><select id="cityActive"><option value="1">مفعّلة</option><option value="0">معطّلة</option></select></div>
<div class="actions"><button class="btn" type="submit">حفظ المدينة</button><button class="btn light" type="button" id="clearCity">جديد</button></div></form></div>
<div class="card"><div class="toolbar"><input id="citySearch" placeholder="بحث بالمدينة أو الكود"><select id="regionFilter"><option value="">كل المناطق</option></select></div><div class="table-wrap"><table><thead><tr><th>المدينة</th><th>المنطقة</th><th>الإحداثيات</th><th>المصدر</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody id="cityRows"></tbody></table></div></div>
</section>
<section id="routesTab" class="grid hidden">
<div class="card"><h2>إضافة / تعديل مسار مؤكد</h2><form id="routeForm"><div class="field"><label>من</label><select id="routeFrom" required></select></div><div class="field"><label>إلى</label><select id="routeTo" required></select></div><div class="row"><div class="field"><label>المسافة كم</label><input id="routeDistance" type="number" step="0.1" min="0.1" required></div><div class="field"><label>المدة بالدقائق</label><input id="routeDuration" type="number" min="1" required></div></div><div class="field"><label>ملاحظة</label><textarea id="routeNote"></textarea></div><div class="field"><label>الحالة</label><select id="routeActive"><option value="1">مفعّل</option><option value="0">معطّل</option></select></div><div class="actions"><button class="btn" type="submit">حفظ المسار</button><button class="btn light" type="button" id="previewRoute">حساب المسار الآن</button></div></form></div>
<div class="card"><div class="toolbar"><input id="routeSearch" placeholder="بحث في المسارات"></div><div class="table-wrap"><table><thead><tr><th>من</th><th>إلى</th><th>المسافة</th><th>المدة</th><th>المصدر</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody id="routeRows"></tbody></table></div></div>
</section>
</div>
<script>
let csrf='',cities=[],routes=[],regions=[];const $=id=>document.getElementById(id);function msg(t,ok=true){$('message').textContent=t;$('message').style.color=ok?'#176b39':'#b42318'}
async function api(action,method='GET',body){const r=await fetch('/api/admin-locations?action='+encodeURIComponent(action),{method,headers:{'Content-Type':'application/json',...(method==='POST'?{'X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined,credentials:'include'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'تعذر تنفيذ الطلب');return d}
function regionName(id){return regions.find(r=>Number(r.id)===Number(id))?.nameAr||''}function cityName(id){return cities.find(c=>c.id===id)?.nameAr||id}function fmtMin(m){m=Number(m)||0;const h=Math.floor(m/60),x=m%60;return h?(x?h+' س '+x+' د':h+' س'):x+' د'}
function fillRegions(){const opts=regions.map(r=>'<option value="'+r.id+'">'+r.nameAr+'</option>').join('');$('cityRegion').innerHTML=opts;$('regionFilter').innerHTML='<option value="">كل المناطق</option>'+opts}
function fillCitySelects(){const active=cities.filter(c=>c.active).sort((a,b)=>a.nameAr.localeCompare(b.nameAr,'ar'));const opts=active.map(c=>'<option value="'+c.id+'">'+c.nameAr+' - '+c.regionAr+'</option>').join('');$('routeFrom').innerHTML=opts;$('routeTo').innerHTML=opts}
function renderCities(){const q=$('citySearch').value.trim().toLowerCase(),rf=$('regionFilter').value;$('cityRows').innerHTML=cities.filter(c=>(!rf||String(c.regionId)===rf)&&(!q||[c.nameAr,c.nameEn,c.code,c.id].join(' ').toLowerCase().includes(q))).map(c=>'<tr><td><b>'+c.nameAr+'</b><br><span class="muted">'+c.code+' / '+c.id+'</span></td><td>'+c.regionAr+'</td><td>'+Number(c.lat).toFixed(5)+', '+Number(c.lng).toFixed(5)+'</td><td><span class="badge">'+(c.source==='admin'?'معدل':'أساسي')+'</span></td><td><span class="badge '+(c.active?'ok':'off')+'">'+(c.active?'مفعلة':'معطلة')+'</span></td><td><button class="btn light" onclick="editCity(\''+c.id+'\')">تعديل</button> <button class="btn light" onclick="toggleCity(\''+c.id+'\','+(!c.active)+')">'+(c.active?'تعطيل':'تفعيل')+'</button> '+(c.source==='admin'?'<button class="btn light" onclick="resetCity(\''+c.id+'\')">استعادة</button>':'')+'</td></tr>').join('')}
function renderRoutes(){const q=$('routeSearch').value.trim().toLowerCase();$('routeRows').innerHTML=routes.filter(r=>!q||[cityName(r.originId),cityName(r.destinationId),r.originId,r.destinationId].join(' ').toLowerCase().includes(q)).map(r=>'<tr><td>'+cityName(r.originId)+'</td><td>'+cityName(r.destinationId)+'</td><td>'+r.distanceKm+' كم</td><td>'+fmtMin(r.durationMinutes)+'</td><td><span class="badge">'+(r.source==='admin'?'يدوي':'أساسي')+'</span></td><td><span class="badge '+(r.active?'ok':'off')+'">'+(r.active?'مفعّل':'معطّل')+'</span></td><td>'+(r.source==='admin'?'<button class="btn light" onclick="editRoute(\''+r.originId+'\',\''+r.destinationId+'\')">تعديل</button> <button class="btn danger" onclick="deleteRoute(\''+r.originId+'\',\''+r.destinationId+'\')">حذف</button>':'—')+'</td></tr>').join('')}
async function load(){try{const d=await api('list');csrf=d.data.csrf;cities=d.data.cities;routes=d.data.routes;regions=d.data.regions;fillRegions();fillCitySelects();renderCities();renderRoutes();msg('تم تحميل البيانات')}catch(e){msg(e.message,false)}}
window.editCity=id=>{const c=cities.find(x=>x.id===id);if(!c)return;$('cityId').value=c.id;$('cityCode').value=c.code;$('cityNameAr').value=c.nameAr;$('cityNameEn').value=c.nameEn||'';$('cityRegion').value=String(c.regionId||'');$('cityMain').value=c.isMain?'1':'0';$('cityLat').value=c.lat;$('cityLng').value=c.lng;$('cityAliases').value=(c.aliases||[]).join(', ');$('cityTerminals').value=(c.terminals||[]).join(', ');$('cityActive').value=c.active?'1':'0';scrollTo({top:0,behavior:'smooth'})}
window.toggleCity=async(id,active)=>{try{await api('city-state','POST',{id,active});await load();msg('تم تحديث حالة المدينة')}catch(e){msg(e.message,false)}};window.resetCity=async id=>{if(!confirm('استعادة البيانات الأصلية لهذه المدينة؟'))return;try{await api('city-reset','POST',{id});await load();msg('تمت استعادة المدينة')}catch(e){msg(e.message,false)}}
$('cityForm').onsubmit=async e=>{e.preventDefault();const region=regions.find(r=>String(r.id)===$('cityRegion').value);try{await api('city-save','POST',{id:$('cityId').value,code:$('cityCode').value,nameAr:$('cityNameAr').value,nameEn:$('cityNameEn').value,regionId:Number($('cityRegion').value),regionAr:region?.nameAr||'',lat:Number($('cityLat').value),lng:Number($('cityLng').value),isMain:$('cityMain').value==='1',active:$('cityActive').value==='1',aliases:$('cityAliases').value.split(',').map(x=>x.trim()).filter(Boolean),terminals:$('cityTerminals').value.split(',').map(x=>x.trim()).filter(Boolean)});await load();msg('تم حفظ المدينة')}catch(e){msg(e.message,false)}};$('clearCity').onclick=()=>{$('cityForm').reset()};
window.editRoute=(from,to)=>{const r=routes.find(x=>x.originId===from&&x.destinationId===to);if(!r)return;$('routeFrom').value=from;$('routeTo').value=to;$('routeDistance').value=r.distanceKm;$('routeDuration').value=r.durationMinutes;$('routeNote').value=r.note||'';$('routeActive').value=r.active?'1':'0'}
window.deleteRoute=async(from,to)=>{if(!confirm('حذف هذا المسار اليدوي؟'))return;try{await api('route-delete','POST',{originId:from,destinationId:to});await load();msg('تم حذف المسار اليدوي')}catch(e){msg(e.message,false)}}
$('routeForm').onsubmit=async e=>{e.preventDefault();try{await api('route-save','POST',{originId:$('routeFrom').value,destinationId:$('routeTo').value,distanceKm:Number($('routeDistance').value),durationMinutes:Number($('routeDuration').value),active:$('routeActive').value==='1',note:$('routeNote').value});await load();msg('تم حفظ المسار')}catch(e){msg(e.message,false)}};$('previewRoute').onclick=async()=>{try{const d=await api('route-preview','POST',{originId:$('routeFrom').value,destinationId:$('routeTo').value});$('routeDistance').value=d.data.distanceKm;$('routeDuration').value=d.data.durationMinutes;msg('تم الحساب: '+d.data.distanceKm+' كم، '+d.data.durationTextAr+' - '+d.data.source)}catch(e){msg(e.message,false)}}
$('resetAll').onclick=async()=>{if(!confirm('سيتم حذف كل تعديلات المدن والمسارات والعودة لبيانات المشروع الأصلية. متابعة؟'))return;try{await api('reset-all','POST',{});await load();msg('تمت استعادة جميع البيانات الأصلية')}catch(e){msg(e.message,false)}};$('citySearch').oninput=renderCities;$('regionFilter').onchange=renderCities;$('routeSearch').oninput=renderRoutes;document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('citiesTab').classList.toggle('hidden',b.dataset.tab!=='cities');$('routesTab').classList.toggle('hidden',b.dataset.tab!=='routes')});load();
</script></body></html>`;
}

export default async function handler(req: Request, res: Response) {
  if (req.method === 'GET' && !req.query?.action) {
    res.type('text/html').setHeader('Cache-Control', 'no-store');
    res.send(htmlPage());
    return;
  }

  const session = readSession(req);
  if (!session) {
    json(res, { status: 'error', message: 'يجب تسجيل الدخول إلى لوحة التحكم أولًا' }, 401);
    return;
  }
  if (req.method === 'POST' && String(req.headers['x-csrf-token'] || '') !== session.csrf) {
    json(res, { status: 'error', message: 'انتهت صلاحية الطلب، أعد فتح الصفحة' }, 419);
    return;
  }

  const action = text(req.query?.action || 'list', 40);
  try {
    if (action === 'list' && req.method === 'GET') {
      const snapshot = await getManagedLocationSnapshot(true);
      json(res, { status: 'success', data: { ...snapshot, regions: SAUDI_REGIONS, csrf: session.csrf } });
      return;
    }
    if (action === 'city-save' && req.method === 'POST') {
      const p = req.body || {};
      await saveManagedSaudiCity({
        id: text(p.id, 80), code: text(p.code, 40), nameAr: text(p.nameAr, 160), nameEn: text(p.nameEn, 160) || undefined,
        regionAr: text(p.regionAr, 160), regionId: Number.isFinite(number(p.regionId)) ? number(p.regionId) : undefined,
        lat: number(p.lat), lng: number(p.lng), isMain: bool(p.isMain), terminals: Array.isArray(p.terminals) ? p.terminals.map((x: unknown) => text(x, 160)).filter(Boolean) : [],
        aliases: Array.isArray(p.aliases) ? p.aliases.map((x: unknown) => text(x, 160)).filter(Boolean) : [], active: bool(p.active),
      });
      clearRouteCalculationCache();
      json(res, { status: 'success', message: 'تم حفظ المدينة' });
      return;
    }
    if (action === 'city-state' && req.method === 'POST') {
      await setManagedSaudiCityState(text(req.body?.id, 80), { active: bool(req.body?.active) });
      clearRouteCalculationCache();
      json(res, { status: 'success' });
      return;
    }
    if (action === 'city-reset' && req.method === 'POST') {
      await resetManagedSaudiCity(text(req.body?.id, 80));
      clearRouteCalculationCache();
      json(res, { status: 'success' });
      return;
    }
    if (action === 'route-save' && req.method === 'POST') {
      await saveManagedSaudiRoute({
        originId: text(req.body?.originId, 80), destinationId: text(req.body?.destinationId, 80),
        distanceKm: number(req.body?.distanceKm), durationMinutes: number(req.body?.durationMinutes), active: bool(req.body?.active), note: text(req.body?.note, 1000) || undefined,
      });
      clearRouteCalculationCache();
      json(res, { status: 'success', message: 'تم حفظ المسار' });
      return;
    }
    if (action === 'route-delete' && req.method === 'POST') {
      await deleteManagedSaudiRoute(text(req.body?.originId, 80), text(req.body?.destinationId, 80));
      clearRouteCalculationCache();
      json(res, { status: 'success' });
      return;
    }
    if (action === 'route-preview' && req.method === 'POST') {
      const route = await calculateSaudiRoute(text(req.body?.originId, 80), text(req.body?.destinationId, 80));
      json(res, { status: 'success', data: route });
      return;
    }
    if (action === 'reset-all' && req.method === 'POST') {
      await resetAllLocationManagement();
      clearRouteCalculationCache();
      json(res, { status: 'success' });
      return;
    }
    json(res, { status: 'error', message: 'الإجراء غير موجود' }, 404);
  } catch (error) {
    json(res, { status: 'error', message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع' }, 422);
  }
}
