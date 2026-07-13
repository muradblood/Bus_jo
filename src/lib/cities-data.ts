export interface City {
  name: string;
  lat: number;
  lng: number;
  region: string;
}

export const cities: City[] = [
  { name: "الرياض", lat: 24.7136, lng: 46.6753, region: "الرياض" },
  { name: "جدة", lat: 21.5433, lng: 39.1728, region: "مكة المكرمة" },
  { name: "مكة المكرمة", lat: 21.3891, lng: 39.8579, region: "مكة المكرمة" },
  { name: "المدينة المنورة", lat: 24.4672, lng: 39.6024, region: "المدينة المنورة" },
  { name: "الدمام", lat: 26.4207, lng: 50.0888, region: "الشرقية" },
  { name: "الخبر", lat: 26.2172, lng: 50.1971, region: "الشرقية" },
  { name: "الظهران", lat: 26.2361, lng: 50.1113, region: "الشرقية" },
  { name: "الأحساء", lat: 25.3622, lng: 49.5657, region: "الشرقية" },
  { name: "الهفوف", lat: 25.3622, lng: 49.5657, region: "الشرقية" },
  { name: "المبرز", lat: 25.4182, lng: 49.5862, region: "الشرقية" },
  { name: "الجبيل", lat: 27.0117, lng: 49.6583, region: "الشرقية" },
  { name: "القطيف", lat: 26.5510, lng: 50.0035, region: "الشرقية" },
  { name: "حفر الباطن", lat: 28.4328, lng: 45.9708, region: "الشرقية" },
  { name: "الخفجي", lat: 28.4385, lng: 48.4907, region: "الشرقية" },
  { name: "رأس تنورة", lat: 26.6376, lng: 50.1104, region: "الشرقية" },
  { name: "أبها", lat: 18.2171, lng: 42.5053, region: "عسير" },
  { name: "خميس مشيط", lat: 18.3064, lng: 42.7350, region: "عسير" },
  { name: "بيشة", lat: 19.9844, lng: 42.6033, region: "عسير" },
  { name: "محايل", lat: 18.5522, lng: 42.0436, region: "عسير" },
  { name: "النماص", lat: 19.1167, lng: 42.1333, region: "عسير" },
  { name: "تنومة", lat: 18.9400, lng: 42.1600, region: "عسير" },
  { name: "سراة عبيدة", lat: 18.0833, lng: 43.1333, region: "عسير" },
  { name: "جازان", lat: 16.8892, lng: 42.5511, region: "جازان" },
  { name: "صبيا", lat: 17.1528, lng: 42.6253, region: "جازان" },
  { name: "صامطة", lat: 16.5917, lng: 42.9444, region: "جازان" },
  { name: "أبو عريش", lat: 16.9667, lng: 42.8333, region: "جازان" },
  { name: "الدرب", lat: 17.7167, lng: 42.2500, region: "جازان" },
  { name: "ينبع", lat: 24.0891, lng: 38.0637, region: "المدينة المنورة" },
  { name: "العلا", lat: 26.6167, lng: 37.9167, region: "المدينة المنورة" },
  { name: "الطائف", lat: 21.2854, lng: 40.4258, region: "مكة المكرمة" },
  { name: "الخرمة", lat: 21.9167, lng: 42.0000, region: "مكة المكرمة" },
  { name: "رنية", lat: 21.2500, lng: 42.8500, region: "مكة المكرمة" },
  { name: "المويه", lat: 22.4167, lng: 41.7333, region: "مكة المكرمة" },
  { name: "القنفذة", lat: 19.1264, lng: 41.0789, region: "مكة المكرمة" },
  { name: "الليث", lat: 20.1500, lng: 40.2667, region: "مكة المكرمة" },
  { name: "الزلفي", lat: 26.2944, lng: 44.8236, region: "الرياض" },
  { name: "المجمعة", lat: 25.9014, lng: 45.3372, region: "الرياض" },
  { name: "الدوادمي", lat: 24.5075, lng: 44.3917, region: "الرياض" },
  { name: "الخرج", lat: 24.1510, lng: 47.3110, region: "الرياض" },
  { name: "الدرعية", lat: 24.7500, lng: 46.5333, region: "الرياض" },
  { name: "وادي الدواسر", lat: 20.4500, lng: 44.8000, region: "الرياض" },
  { name: "شقراء", lat: 25.2447, lng: 45.2472, region: "الرياض" },
  { name: "بريدة", lat: 26.3260, lng: 43.9750, region: "القصيم" },
  { name: "عنيزة", lat: 26.0844, lng: 44.1311, region: "القصيم" },
  { name: "الرس", lat: 25.8667, lng: 43.5000, region: "القصيم" },
  { name: "حائل", lat: 27.5219, lng: 41.6961, region: "حائل" },
  { name: "تيماء", lat: 27.6333, lng: 38.5500, region: "تبوك" },
  { name: "أملج", lat: 25.0333, lng: 37.2667, region: "تبوك" },
  { name: "الوجه", lat: 26.2333, lng: 36.4500, region: "تبوك" },
  { name: "ضباء", lat: 27.3500, lng: 35.6833, region: "تبوك" },
  { name: "تبوك", lat: 28.3835, lng: 36.5662, region: "تبوك" },
  { name: "نيوم", lat: 28.1610, lng: 34.8000, region: "تبوك" },
  { name: "سكاكا", lat: 29.9697, lng: 40.2064, region: "الجوف" },
  { name: "القريات", lat: 31.3317, lng: 37.3417, region: "الجوف" },
  { name: "عرعر", lat: 30.9753, lng: 41.0381, region: "الحدود الشمالية" },
  { name: "رفحاء", lat: 29.6333, lng: 43.4833, region: "الحدود الشمالية" },
  { name: "طريف", lat: 31.6725, lng: 38.6636, region: "الحدود الشمالية" },
  { name: "نجران", lat: 17.5656, lng: 44.2289, region: "نجران" },
  { name: "شرورة", lat: 17.4833, lng: 47.1167, region: "نجران" },
  { name: "الباحة", lat: 20.0125, lng: 41.4653, region: "الباحة" },
  { name: "بلجرشي", lat: 19.8500, lng: 41.5667, region: "الباحة" },
  { name: "المخواة", lat: 19.7833, lng: 41.4333, region: "الباحة" },
  { name: "رابغ", lat: 22.7986, lng: 39.0347, region: "مكة المكرمة" },
  { name: "خليص", lat: 22.1333, lng: 39.3167, region: "مكة المكرمة" },
  { name: "الرين", lat: 23.5500, lng: 45.5167, region: "الرياض" },
  { name: "حوطة بني تميم", lat: 23.5167, lng: 46.8500, region: "الرياض" },
  { name: "الأفلاج", lat: 22.2833, lng: 46.7333, region: "الرياض" },
  { name: "السليل", lat: 20.4667, lng: 45.5667, region: "الرياض" },
  { name: "الغاط", lat: 26.0167, lng: 44.9667, region: "الرياض" },
  { name: "تمير", lat: 25.7000, lng: 45.8667, region: "الرياض" },
  { name: "عفيف", lat: 23.9000, lng: 42.9167, region: "الرياض" },
  { name: "القويعية", lat: 24.0500, lng: 45.2667, region: "الرياض" },
  { name: "ضرما", lat: 24.6167, lng: 46.1333, region: "الرياض" },
  { name: "مرات", lat: 25.2000, lng: 45.4500, region: "الرياض" },
  { name: "حريملاء", lat: 25.1333, lng: 46.1167, region: "الرياض" },
  { name: "المزاحمية", lat: 24.4833, lng: 46.2500, region: "الرياض" },
  { name: "رماح", lat: 25.4000, lng: 47.1667, region: "الرياض" },
  { name: "ثادق", lat: 25.2167, lng: 45.8833, region: "الرياض" },
  { name: "المذنب", lat: 25.8667, lng: 44.2167, region: "القصيم" },
  { name: "البكيرية", lat: 26.1500, lng: 43.6667, region: "القصيم" },
  { name: "البدائع", lat: 25.9833, lng: 43.8333, region: "القصيم" },
  { name: "عيون الجواء", lat: 26.5000, lng: 43.6500, region: "القصيم" },
  { name: "رياض الخبراء", lat: 26.0500, lng: 43.6000, region: "القصيم" },
  { name: "الشماسية", lat: 26.3000, lng: 44.3500, region: "القصيم" },
  { name: "النبهانية", lat: 25.8500, lng: 43.0333, region: "القصيم" },
  { name: "ضرية", lat: 24.7500, lng: 43.0333, region: "القصيم" },
  { name: "بقعاء", lat: 27.9167, lng: 42.3333, region: "حائل" },
  { name: "الشملي", lat: 27.2000, lng: 40.1833, region: "حائل" },
  { name: "الحائط", lat: 25.9833, lng: 40.4333, region: "حائل" },
  { name: "السليمي", lat: 26.2833, lng: 41.3833, region: "حائل" },
  { name: "الغزالة", lat: 26.7000, lng: 41.3000, region: "حائل" },
  { name: "الشنان", lat: 27.1667, lng: 42.4333, region: "حائل" },
  { name: "سميراء", lat: 26.5000, lng: 42.1333, region: "حائل" },
  { name: "تربة حائل", lat: 28.2333, lng: 42.9333, region: "حائل" },
  { name: "البدع", lat: 28.4833, lng: 35.0333, region: "تبوك" },
  { name: "حقل", lat: 29.3000, lng: 34.9333, region: "تبوك" },
  { name: "دومة الجندل", lat: 29.8167, lng: 39.8667, region: "الجوف" },
  { name: "طبرجل", lat: 30.5000, lng: 38.2000, region: "الجوف" },
  { name: "العويقيلة", lat: 30.3333, lng: 42.1833, region: "الحدود الشمالية" },
  { name: "حبونا", lat: 17.8500, lng: 44.3667, region: "نجران" },
  { name: "قلوة", lat: 19.8333, lng: 41.1833, region: "الباحة" },
  { name: "العقيق", lat: 20.1667, lng: 41.6500, region: "الباحة" },
  { name: "المندق", lat: 20.1667, lng: 41.2833, region: "الباحة" },
  { name: "ثول", lat: 22.2833, lng: 39.1167, region: "مكة المكرمة" },
  { name: "أشيقر", lat: 25.3333, lng: 45.1833, region: "الرياض" },
  { name: "أم الجماجم", lat: 26.5833, lng: 45.1833, region: "الرياض" },
  { name: "حوطة سدير", lat: 25.6000, lng: 45.6167, region: "الرياض" },
  { name: "الأرطاوية", lat: 26.4833, lng: 45.3333, region: "الرياض" },
  { name: "سلوى", lat: 24.9333, lng: 50.7667, region: "الشرقية" },
  { name: "العقير", lat: 25.6333, lng: 50.1333, region: "الشرقية" },
  { name: "العيّينة", lat: 24.9000, lng: 46.3667, region: "الرياض" },
  { name: "الجبيلة", lat: 24.8833, lng: 46.4333, region: "الرياض" },
  { name: "نفي", lat: 24.7833, lng: 43.7667, region: "الرياض" },
  { name: "بحرة", lat: 21.3833, lng: 39.4833, region: "مكة المكرمة" },
  { name: "المظيلف", lat: 19.1667, lng: 41.0500, region: "مكة المكرمة" },
  { name: "حلي", lat: 18.8167, lng: 41.3500, region: "مكة المكرمة" },
  { name: "القوز", lat: 18.9167, lng: 41.2833, region: "مكة المكرمة" },
  { name: "بللحمر", lat: 18.5167, lng: 42.5167, region: "عسير" },
  { name: "بللسمر", lat: 18.7333, lng: 42.3667, region: "عسير" },
  { name: "دومة الجندل", lat: 29.8167, lng: 39.8667, region: "الجوف" },
];

export const cityNames = cities.map(c => c.name);

/** Haversine distance in km */
export function distanceKm(from: string, to: string): number {
  const c1 = cities.find(c => c.name === from);
  const c2 = cities.find(c => c.name === to);
  if (!c1 || !c2) return 500;

  const R = 6371;
  const dLat = (c2.lat - c1.lat) * Math.PI / 180;
  const dLng = (c2.lng - c1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(c1.lat * Math.PI/180) * Math.cos(c2.lat * Math.PI/180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Calculate price based on distance: min 33 SAR, max 125 SAR */
export function calculatePrice(from: string, to: string): number {
  const dist = distanceKm(from, to);
  if (dist <= 50) return 33;
  if (dist >= 1400) return 125;
  return Math.round(33 + (dist - 50) / (1400 - 50) * (125 - 33));
}
