export type SaudiRegion = { id:number; code:string; nameAr:string; nameEn:string };

export const SAUDI_REGIONS: readonly SaudiRegion[] = [
{id:1,code:'riyadh',nameAr:'الرياض',nameEn:'Riyadh'},
{id:2,code:'makkah',nameAr:'مكة المكرمة',nameEn:'Makkah'},
{id:3,code:'madinah',nameAr:'المدينة المنورة',nameEn:'Madinah'},
{id:4,code:'qassim',nameAr:'القصيم',nameEn:'Al-Qassim'},
{id:5,code:'eastern',nameAr:'المنطقة الشرقية',nameEn:'Eastern Province'},
{id:6,code:'asir',nameAr:'عسير',nameEn:'Asir'},
{id:7,code:'tabuk',nameAr:'تبوك',nameEn:'Tabuk'},
{id:8,code:'hail',nameAr:'حائل',nameEn:'Hail'},
{id:9,code:'northern-borders',nameAr:'الحدود الشمالية',nameEn:'Northern Borders'},
{id:10,code:'jazan',nameAr:'جازان',nameEn:'Jazan'},
{id:11,code:'najran',nameAr:'نجران',nameEn:'Najran'},
{id:12,code:'bahah',nameAr:'الباحة',nameEn:'Al-Bahah'},
{id:13,code:'jawf',nameAr:'الجوف',nameEn:'Al-Jawf'}
] as const;

export const SAUDI_REGION_BY_ID = new Map(SAUDI_REGIONS.map(region => [region.id, region]));
