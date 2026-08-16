export interface TransportCityDefinition {
  code: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  isMain: boolean;
  terminals: string[];
  aliases?: string[];
}

const SA = 'السعودية';

export const TRANSPORT_CITY_CATALOG: TransportCityDefinition[] = [
  // منطقة الرياض
  { code: 'RUH', name: 'الرياض', region: 'الرياض', country: SA, lat: 24.7136, lng: 46.6753, isMain: true, terminals: ['مركز النقل العام بالرياض'] },
  { code: 'RUH-BUS', name: 'الرياض مركز النقل العام', region: 'الرياض', country: SA, lat: 24.6539, lng: 46.7606, isMain: false, terminals: ['مركز النقل العام بالرياض'] },
  { code: 'KHARJ', name: 'الخرج', region: 'الرياض', country: SA, lat: 24.151, lng: 47.311, isMain: false, terminals: ['موقف الخرج'] },
  { code: 'DIL', name: 'الدلم', region: 'الرياض', country: SA, lat: 23.9915, lng: 47.1618, isMain: false, terminals: ['موقف الدلم'] },
  { code: 'DUW', name: 'الدوادمي', region: 'الرياض', country: SA, lat: 24.5075, lng: 44.3917, isMain: false, terminals: ['موقف الدوادمي'] },
  { code: 'ZUL', name: 'الزلفي', region: 'الرياض', country: SA, lat: 26.2944, lng: 44.8236, isMain: false, terminals: ['موقف الزلفي'] },
  { code: 'MAJMAA', name: 'المجمعة', region: 'الرياض', country: SA, lat: 25.9014, lng: 45.3372, isMain: false, terminals: ['موقف المجمعة'] },
  { code: 'WAD', name: 'وادي الدواسر', region: 'الرياض', country: SA, lat: 20.45, lng: 44.8, isMain: false, terminals: ['موقف الوادي'] },
  { code: 'QUW', name: 'القويعية', region: 'الرياض', country: SA, lat: 24.05, lng: 45.2667, isMain: false, terminals: ['موقف القويعية'] },
  { code: 'SHA', name: 'شقراء', region: 'الرياض', country: SA, lat: 25.2447, lng: 45.2472, isMain: false, terminals: ['موقف شقراء'] },
  { code: 'AFI', name: 'عفيف', region: 'الرياض', country: SA, lat: 23.9, lng: 42.9167, isMain: false, terminals: ['موقف عفيف'] },
  { code: 'THU', name: 'ثادق', region: 'الرياض', country: SA, lat: 25.2167, lng: 45.8833, isMain: false, terminals: ['موقف ثادق'] },
  { code: 'HUR', name: 'حريملاء', region: 'الرياض', country: SA, lat: 25.1333, lng: 46.1167, isMain: false, terminals: ['موقف حريملاء'] },
  { code: 'AFL', name: 'الأفلاج', region: 'الرياض', country: SA, lat: 22.2833, lng: 46.7333, isMain: false, terminals: ['موقف الأفلاج'] },
  { code: 'USH', name: 'أشيقر', region: 'الرياض', country: SA, lat: 25.3333, lng: 45.1833, isMain: false, terminals: ['موقف أشيقر'], aliases: ['اشيقر'] },
  { code: 'RAD', name: 'الرديفة', region: 'الرياض', country: SA, lat: 24.29481, lng: 43.67088, isMain: false, terminals: ['موقف الرديفة'] },

  // منطقة مكة المكرمة
  { code: 'JED', name: 'جدة', region: 'مكة المكرمة', country: SA, lat: 21.5433, lng: 39.1728, isMain: true, terminals: ['محطة جدة'] },
  { code: 'JED-SAPTCO', name: 'جدة سابتكو (سار)', region: 'مكة المكرمة', country: SA, lat: 21.5433, lng: 39.1728, isMain: false, terminals: ['جدة سابتكو (سار)'], aliases: ['جدة  سابتكو (سار)'] },
  { code: 'JED-AIR', name: 'مطار الملك عبد العزيز الدولي', region: 'مكة المكرمة', country: SA, lat: 21.6702, lng: 39.1525, isMain: false, terminals: ['مطار الملك عبد العزيز الدولي'], aliases: ['مطار جدة الدولي', 'مطار الملك عبدالعزيز الدولي'] },
  { code: 'MAK', name: 'مكة المكرمة', region: 'مكة المكرمة', country: SA, lat: 21.3891, lng: 39.8579, isMain: true, terminals: ['محطة مكة المكرمة'] },
  { code: 'HARAM', name: 'الحرم المكي', region: 'مكة المكرمة', country: SA, lat: 21.4225, lng: 39.8262, isMain: false, terminals: ['الحرم المكي'] },
  { code: 'SHAR', name: 'الشرائع', region: 'مكة المكرمة', country: SA, lat: 21.4895, lng: 39.9687, isMain: false, terminals: ['موقف الشرائع'] },
  { code: 'TIF', name: 'الطائف', region: 'مكة المكرمة', country: SA, lat: 21.2854, lng: 40.4258, isMain: true, terminals: ['محطة الطائف'] },
  { code: 'RAB', name: 'رابغ', region: 'مكة المكرمة', country: SA, lat: 22.7986, lng: 39.0347, isMain: false, terminals: ['موقف رابغ'] },
  { code: 'LIT', name: 'الليث', region: 'مكة المكرمة', country: SA, lat: 20.15, lng: 40.2667, isMain: false, terminals: ['موقف الليث'] },
  { code: 'QUN', name: 'القنفذة', region: 'مكة المكرمة', country: SA, lat: 19.1264, lng: 41.0789, isMain: false, terminals: ['موقف القنفذة'], aliases: ['قنفذة'] },
  { code: 'ZULM', name: 'ظلم', region: 'مكة المكرمة', country: SA, lat: 22.72, lng: 42.18, isMain: false, terminals: ['موقف ظلم'] },

  // منطقة المدينة المنورة
  { code: 'MED', name: 'المدينة المنورة', region: 'المدينة المنورة', country: SA, lat: 24.4672, lng: 39.6024, isMain: true, terminals: ['محطة المدينة المنورة'] },
  { code: 'MED-SHUTTLE', name: 'المدينة المنورة النقل الترددي', region: 'المدينة المنورة', country: SA, lat: 24.4672, lng: 39.6024, isMain: false, terminals: ['النقل الترددي بالمدينة المنورة'] },
  { code: 'YNB', name: 'ينبع', region: 'المدينة المنورة', country: SA, lat: 24.0891, lng: 38.0637, isMain: true, terminals: ['محطة ينبع'] },
  { code: 'ULA', name: 'العلا', region: 'المدينة المنورة', country: SA, lat: 26.6167, lng: 37.9167, isMain: false, terminals: ['موقف العلا'] },
  { code: 'BAD', name: 'بدر', region: 'المدينة المنورة', country: SA, lat: 23.7823, lng: 38.7902, isMain: false, terminals: ['موقف بدر'] },

  // المنطقة الشرقية
  { code: 'DMM', name: 'الدمام', region: 'الشرقية', country: SA, lat: 26.4207, lng: 50.0888, isMain: true, terminals: ['محطة الدمام'] },
  { code: 'KHB', name: 'الخبر', region: 'الشرقية', country: SA, lat: 26.2172, lng: 50.1971, isMain: true, terminals: ['محطة الخبر'] },
  { code: 'DHA', name: 'الظهران', region: 'الشرقية', country: SA, lat: 26.2361, lng: 50.1113, isMain: false, terminals: ['موقف الظهران'] },
  { code: 'AHS', name: 'الأحساء', region: 'الشرقية', country: SA, lat: 25.3622, lng: 49.5657, isMain: true, terminals: ['محطة الأحساء'] },
  { code: 'HOF', name: 'الهفوف', region: 'الشرقية', country: SA, lat: 25.3622, lng: 49.5657, isMain: false, terminals: ['موقف الهفوف'] },
  { code: 'MBR', name: 'المبرز', region: 'الشرقية', country: SA, lat: 25.4182, lng: 49.5862, isMain: false, terminals: ['موقف المبرز'] },
  { code: 'JUB', name: 'الجبيل', region: 'الشرقية', country: SA, lat: 27.0117, lng: 49.6583, isMain: true, terminals: ['محطة الجبيل'] },
  { code: 'QAIF', name: 'القطيف', region: 'الشرقية', country: SA, lat: 26.551, lng: 50.0035, isMain: false, terminals: ['موقف القطيف'] },
  { code: 'HBT', name: 'حفر الباطن', region: 'الشرقية', country: SA, lat: 28.4328, lng: 45.9708, isMain: true, terminals: ['محطة حفر الباطن'] },
  { code: 'KHF', name: 'الخفجي', region: 'الشرقية', country: SA, lat: 28.4385, lng: 48.4907, isMain: false, terminals: ['موقف الخفجي'] },
  { code: 'RTN', name: 'رأس تنورة', region: 'الشرقية', country: SA, lat: 26.6376, lng: 50.1104, isMain: false, terminals: ['موقف رأس تنورة'] },
  { code: 'BUQ', name: 'بقيق', region: 'الشرقية', country: SA, lat: 25.934, lng: 49.6688, isMain: false, terminals: ['موقف بقيق'], aliases: ['ابقيق', 'أبقيق'] },
  { code: 'SAIRA', name: 'السعيرة', region: 'الشرقية', country: SA, lat: 27.827429, lng: 47.508175, isMain: false, terminals: ['موقف السعيرة'] },
  { code: 'LAY', name: 'العيون', region: 'الشرقية', country: SA, lat: 25.603, lng: 49.564, isMain: false, terminals: ['موقف العيون'] },
  { code: 'SAI', name: 'سيهات', region: 'الشرقية', country: SA, lat: 26.4852, lng: 50.0405, isMain: false, terminals: ['موقف سيهات'] },
  { code: 'SAF', name: 'صفوى', region: 'الشرقية', country: SA, lat: 26.6497, lng: 49.9545, isMain: false, terminals: ['موقف صفوى'] },

  // منطقة عسير
  { code: 'AHB', name: 'أبها', region: 'عسير', country: SA, lat: 18.2171, lng: 42.5053, isMain: true, terminals: ['محطة أبها'], aliases: ['ابها'] },
  { code: 'KHA', name: 'خميس مشيط', region: 'عسير', country: SA, lat: 18.3064, lng: 42.735, isMain: true, terminals: ['محطة الخميس'] },
  { code: 'BISH', name: 'بيشة', region: 'عسير', country: SA, lat: 19.9844, lng: 42.6033, isMain: false, terminals: ['موقف بيشة'] },
  { code: 'MHL', name: 'محايل', region: 'عسير', country: SA, lat: 18.5522, lng: 42.0436, isMain: false, terminals: ['موقف محايل'] },
  { code: 'NAM', name: 'النماص', region: 'عسير', country: SA, lat: 19.1167, lng: 42.1333, isMain: false, terminals: ['موقف النماص'] },
  { code: 'MAJARDA', name: 'المجاردة', region: 'عسير', country: SA, lat: 19.1236, lng: 41.9118, isMain: false, terminals: ['موقف المجاردة'] },
  { code: 'BRK', name: 'البرك', region: 'عسير', country: SA, lat: 18.216, lng: 41.535, isMain: false, terminals: ['موقف البرك'] },
  { code: 'BASHAIR', name: 'البشاير', region: 'عسير', country: SA, lat: 19.75, lng: 41.91, isMain: false, terminals: ['موقف البشائر'], aliases: ['البشائر'] },
  { code: 'ASIR-HUB', name: 'عسير', region: 'عسير', country: SA, lat: 18.2171, lng: 42.5053, isMain: false, terminals: ['مركز منطقة عسير'] },

  // منطقة جازان
  { code: 'JAZ', name: 'جازان', region: 'جازان', country: SA, lat: 16.8892, lng: 42.5511, isMain: true, terminals: ['محطة جازان'], aliases: ['جيزان'] },
  { code: 'AHD', name: 'أحد المسارحة', region: 'جازان', country: SA, lat: 16.69862, lng: 42.956674, isMain: false, terminals: ['موقف أحد المسارحة'], aliases: ['احد المسارحة'] },
  { code: 'ABU', name: 'أبو عريش', region: 'جازان', country: SA, lat: 16.9667, lng: 42.8333, isMain: false, terminals: ['موقف أبو عريش'], aliases: ['ابو عريش'] },
  { code: 'SAB', name: 'صبيا', region: 'جازان', country: SA, lat: 17.1528, lng: 42.6253, isMain: false, terminals: ['موقف صبيا'] },
  { code: 'SAM', name: 'صامطة', region: 'جازان', country: SA, lat: 16.5917, lng: 42.9444, isMain: false, terminals: ['موقف صامطة'] },
  { code: 'DRB', name: 'الدرب', region: 'جازان', country: SA, lat: 17.7167, lng: 42.25, isMain: false, terminals: ['موقف الدرب'] },

  // منطقة تبوك
  { code: 'TAB', name: 'تبوك', region: 'تبوك', country: SA, lat: 28.3835, lng: 36.5662, isMain: true, terminals: ['محطة تبوك'] },
  { code: 'AML', name: 'أملج', region: 'تبوك', country: SA, lat: 25.0333, lng: 37.2667, isMain: false, terminals: ['موقف أملج'] },
  { code: 'ALW', name: 'الوجه', region: 'تبوك', country: SA, lat: 26.2333, lng: 36.45, isMain: false, terminals: ['موقف الوجه'] },
  { code: 'DUBA', name: 'ضباء', region: 'تبوك', country: SA, lat: 27.35, lng: 35.6833, isMain: false, terminals: ['موقف ضباء'] },
  { code: 'HAQ', name: 'حقل', region: 'تبوك', country: SA, lat: 29.3, lng: 34.9333, isMain: false, terminals: ['موقف حقل'] },
  { code: 'BADAA', name: 'البدع', region: 'تبوك', country: SA, lat: 28.4833, lng: 35.0333, isMain: false, terminals: ['موقف البدع'] },
  { code: 'TAY', name: 'تيماء', region: 'تبوك', country: SA, lat: 27.6333, lng: 38.55, isMain: false, terminals: ['موقف تيماء'] },
  { code: 'NEOM', name: 'نيوم', region: 'تبوك', country: SA, lat: 28.161, lng: 34.8, isMain: true, terminals: ['محطة نيوم'] },

  // منطقة حائل
  { code: 'HAI', name: 'حائل', region: 'حائل', country: SA, lat: 27.5219, lng: 41.6961, isMain: true, terminals: ['محطة حائل'] },
  { code: 'HAI-KF', name: 'حائل طريق الملك فيصل', region: 'حائل', country: SA, lat: 27.5219, lng: 41.6961, isMain: false, terminals: ['طريق الملك فيصل - حائل'] },
  { code: 'SHN', name: 'الشنان', region: 'حائل', country: SA, lat: 27.1667, lng: 42.4333, isMain: false, terminals: ['موقف الشنان'] },
  { code: 'GHA', name: 'الغزالة', region: 'حائل', country: SA, lat: 26.7, lng: 41.3, isMain: false, terminals: ['موقف الغزالة'] },

  // منطقة القصيم
  { code: 'BUR', name: 'بريدة', region: 'القصيم', country: SA, lat: 26.326, lng: 43.975, isMain: true, terminals: ['محطة القصيم'] },
  { code: 'UNA', name: 'عنيزة', region: 'القصيم', country: SA, lat: 26.0844, lng: 44.1311, isMain: false, terminals: ['موقف عنيزة'] },
  { code: 'RAS', name: 'الرس', region: 'القصيم', country: SA, lat: 25.8667, lng: 43.5, isMain: false, terminals: ['موقف الرس'] },
  { code: 'QASSIM-HUB', name: 'القصيم', region: 'القصيم', country: SA, lat: 26.326, lng: 43.975, isMain: false, terminals: ['محطة القصيم'] },

  // منطقة الباحة
  { code: 'BAH', name: 'الباحة', region: 'الباحة', country: SA, lat: 20.0125, lng: 41.4653, isMain: true, terminals: ['محطة الباحة'] },
  { code: 'BEL', name: 'بلجرشي', region: 'الباحة', country: SA, lat: 19.85, lng: 41.5667, isMain: false, terminals: ['موقف بلجرشي'] },
  { code: 'MUK', name: 'المخواة', region: 'الباحة', country: SA, lat: 19.7833, lng: 41.4333, isMain: false, terminals: ['موقف المخواة'] },
  { code: 'QAL', name: 'قلوة', region: 'الباحة', country: SA, lat: 19.8333, lng: 41.1833, isMain: false, terminals: ['موقف قلوة'] },

  // منطقة الجوف
  { code: 'SAK', name: 'سكاكا', region: 'الجوف', country: SA, lat: 29.9697, lng: 40.2064, isMain: true, terminals: ['محطة الجوف'] },
  { code: 'QUR', name: 'القريات', region: 'الجوف', country: SA, lat: 31.3317, lng: 37.3417, isMain: false, terminals: ['موقف القريات'] },
  { code: 'DOM', name: 'دومة الجندل', region: 'الجوف', country: SA, lat: 29.8167, lng: 39.8667, isMain: false, terminals: ['موقف دومة الجندل'] },
  { code: 'TBR', name: 'طبرجل', region: 'الجوف', country: SA, lat: 30.5, lng: 38.2, isMain: false, terminals: ['موقف طبرجل'] },
  { code: 'JOUF-HUB', name: 'الجوف', region: 'الجوف', country: SA, lat: 29.9697, lng: 40.2064, isMain: false, terminals: ['محطة الجوف'] },

  // منطقة الحدود الشمالية
  { code: 'ARR', name: 'عرعر', region: 'الحدود الشمالية', country: SA, lat: 30.9753, lng: 41.0381, isMain: true, terminals: ['محطة عرعر'] },
  { code: 'RAF', name: 'رفحاء', region: 'الحدود الشمالية', country: SA, lat: 29.6333, lng: 43.4833, isMain: false, terminals: ['موقف رفحاء'] },
  { code: 'TURF', name: 'طريف', region: 'الحدود الشمالية', country: SA, lat: 31.6725, lng: 38.6636, isMain: false, terminals: ['موقف طريف'] },
  { code: 'OWQ', name: 'العويقيلة', region: 'الحدود الشمالية', country: SA, lat: 30.3333, lng: 42.1833, isMain: false, terminals: ['موقف العويقيلة'] },

  // منطقة نجران
  { code: 'NAJ', name: 'نجران', region: 'نجران', country: SA, lat: 17.5656, lng: 44.2289, isMain: true, terminals: ['محطة نجران'] },
  { code: 'SHAQ', name: 'شرورة', region: 'نجران', country: SA, lat: 17.4833, lng: 47.1167, isMain: false, terminals: ['موقف شرورة'] },

  // وجهات دولية مدرجة في الطلب
  { code: 'AMM', name: 'عمان', region: 'العاصمة', country: 'الأردن', lat: 31.9539, lng: 35.9106, isMain: true, terminals: ['محطة عمان'] },
  { code: 'SAFAGA', name: 'سفاجا', region: 'البحر الأحمر', country: 'مصر', lat: 26.7507, lng: 33.9386, isMain: true, terminals: ['محطة سفاجا'] },
  { code: 'SALALAH-VIEW', name: 'مطل الصلالة', region: 'ظفار', country: 'عُمان', lat: 17.0197, lng: 54.0897, isMain: false, terminals: ['مطل الصلالة'] },

  // وجهات خليجية ودولية موجودة سابقاً في المشروع للحفاظ على التوافق
  { code: 'DXB', name: 'دبي', region: 'دبي', country: 'الإمارات', lat: 25.2048, lng: 55.2708, isMain: true, terminals: ['محطة دبي'] },
  { code: 'AUH', name: 'أبوظبي', region: 'أبوظبي', country: 'الإمارات', lat: 24.4539, lng: 54.3773, isMain: true, terminals: ['محطة أبوظبي'] },
  { code: 'SHJ', name: 'الشارقة', region: 'الشارقة', country: 'الإمارات', lat: 25.3463, lng: 55.4209, isMain: true, terminals: ['محطة الشارقة'] },
  { code: 'KWI', name: 'الكويت العاصمة', region: 'العاصمة', country: 'الكويت', lat: 29.3759, lng: 47.9774, isMain: true, terminals: ['محطة الكويت'] },
  { code: 'BAH-BH', name: 'المنامة', region: 'العاصمة', country: 'البحرين', lat: 26.2285, lng: 50.586, isMain: true, terminals: ['محطة المنامة'] },
  { code: 'MCT', name: 'مسقط', region: 'مسقط', country: 'عُمان', lat: 23.5859, lng: 58.4059, isMain: true, terminals: ['محطة مسقط'] },
  { code: 'DOH', name: 'الدوحة', region: 'الدوحة', country: 'قطر', lat: 25.2854, lng: 51.531, isMain: true, terminals: ['محطة الدوحة'] },
  { code: 'CAI', name: 'القاهرة', region: 'القاهرة', country: 'مصر', lat: 30.0444, lng: 31.2357, isMain: true, terminals: ['محطة القاهرة'] },
  { code: 'BEY', name: 'بيروت', region: 'بيروت', country: 'لبنان', lat: 33.8938, lng: 35.5018, isMain: true, terminals: ['محطة بيروت'] },
  { code: 'DAM', name: 'دمشق', region: 'دمشق', country: 'سوريا', lat: 33.5138, lng: 36.2765, isMain: true, terminals: ['محطة دمشق'] },
  { code: 'BGW', name: 'بغداد', region: 'بغداد', country: 'العراق', lat: 33.3128, lng: 44.3615, isMain: true, terminals: ['محطة بغداد'] },
];

export function normalizeTransportCityName(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/ـ/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const cityByNormalizedName = new Map<string, TransportCityDefinition>();
for (const city of TRANSPORT_CITY_CATALOG) {
  cityByNormalizedName.set(normalizeTransportCityName(city.name), city);
  for (const alias of city.aliases ?? []) {
    cityByNormalizedName.set(normalizeTransportCityName(alias), city);
  }
}

export function resolveTransportCity(name: string): TransportCityDefinition | undefined {
  return cityByNormalizedName.get(normalizeTransportCityName(name));
}

export function canonicalTransportCityName(name: string): string {
  return resolveTransportCity(name)?.name ?? name.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
