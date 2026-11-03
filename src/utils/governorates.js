export const egyptGovernorates = [
  { id: 'cairo', nameEn: 'Cairo', nameAr: 'القاهرة', zoneId: 'cairo_giza' },
  { id: 'giza', nameEn: 'Giza', nameAr: 'الجيزة', zoneId: 'cairo_giza' },
  { id: 'alexandria', nameEn: 'Alexandria', nameAr: 'الإسكندرية', zoneId: 'alex_canal' },
  { id: 'ismailia', nameEn: 'Ismailia', nameAr: 'الإسماعيلية', zoneId: 'alex_canal' },
  { id: 'suez', nameEn: 'Suez', nameAr: 'السويس', zoneId: 'alex_canal' },
  { id: 'port_said', nameEn: 'Port Said', nameAr: 'بورسعيد', zoneId: 'alex_canal' },
  { id: 'damietta', nameEn: 'Damietta', nameAr: 'دمياط', zoneId: 'alex_canal' },
  { id: 'dakahlia', nameEn: 'Dakahlia', nameAr: 'الدقهلية', zoneId: 'delta' },
  { id: 'monufia', nameEn: 'Monufia', nameAr: 'المنوفية', zoneId: 'delta' },
  { id: 'gharbia', nameEn: 'Gharbia', nameAr: 'الغربية', zoneId: 'delta' },
  { id: 'kafr_el_sheikh', nameEn: 'Kafr El Sheikh', nameAr: 'كفر الشيخ', zoneId: 'delta' },
  { id: 'beheira', nameEn: 'Beheira', nameAr: 'البحيرة', zoneId: 'delta' },
  { id: 'sharqia', nameEn: 'Sharqia', nameAr: 'الشرقية', zoneId: 'delta' },
  { id: 'qalyubia', nameEn: 'Qalyubia', nameAr: 'القليوبية', zoneId: 'delta' },
  { id: 'beni_suef', nameEn: 'Beni Suef', nameAr: 'بني سويف', zoneId: 'upper_egypt' },
  { id: 'faiyum', nameEn: 'Faiyum', nameAr: 'الفيوم', zoneId: 'upper_egypt' },
  { id: 'minya', nameEn: 'Minya', nameAr: 'المنيا', zoneId: 'upper_egypt' },
  { id: 'asyut', nameEn: 'Asyut', nameAr: 'أسيوط', zoneId: 'upper_egypt' },
  { id: 'sohag', nameEn: 'Sohag', nameAr: 'سوهاج', zoneId: 'upper_egypt' },
  { id: 'qena', nameEn: 'Qena', nameAr: 'قنا', zoneId: 'upper_egypt' },
  { id: 'luxor', nameEn: 'Luxor', nameAr: 'الأقصر', zoneId: 'upper_egypt' },
  { id: 'aswan', nameEn: 'Aswan', nameAr: 'أسوان', zoneId: 'upper_egypt' },
  { id: 'red_sea', nameEn: 'Red Sea', nameAr: 'البحر الأحمر', zoneId: 'coastal_border' },
  { id: 'south_sinai', nameEn: 'South Sinai', nameAr: 'جنوب سيناء', zoneId: 'coastal_border' },
  { id: 'north_sinai', nameEn: 'North Sinai', nameAr: 'شمال سيناء', zoneId: 'coastal_border' },
  { id: 'matrouh', nameEn: 'Matrouh', nameAr: 'مطروح', zoneId: 'coastal_border' },
  { id: 'new_valley', nameEn: 'New Valley', nameAr: 'الوادي الجديد', zoneId: 'coastal_border' }
];

export const getShippingZoneForGovernorate = (govId) => {
  if (!govId) return 'cairo_giza';
  const governorate = egyptGovernorates.find(g => g.id === govId || g.nameEn?.toLowerCase() === String(govId).toLowerCase());
  return governorate ? governorate.zoneId : 'cairo_giza';
};

/**
 * Resolves a governorate entry by ID, English name, or Arabic name.
 * Safely accepts undefined, null, strings, or object schemas.
 */
export const getGovernorateById = (govIdOrName) => {
  if (!govIdOrName) return null;

  let str = '';
  if (typeof govIdOrName === 'string') {
    str = govIdOrName.trim();
  } else if (typeof govIdOrName === 'object' && govIdOrName !== null) {
    str = String(
      govIdOrName.nameAr ||
      govIdOrName.nameEn ||
      govIdOrName.name ||
      govIdOrName.governorate ||
      govIdOrName.id ||
      govIdOrName.label ||
      ''
    ).trim();
  } else {
    str = String(govIdOrName).trim();
  }

  if (!str) return null;
  const lower = str.toLowerCase();

  return (
    egyptGovernorates.find(
      (g) =>
        g.id.toLowerCase() === lower ||
        g.nameEn.toLowerCase() === lower ||
        g.nameAr.toLowerCase() === lower ||
        g.nameAr === str ||
        g.nameAr.replace(/[أإآ]/g, 'ا') === str.replace(/[أإآ]/g, 'ا')
    ) || null
  );
};

/**
 * Returns the exact localized name of a single governorate (e.g. "الإسكندرية" or "Alexandria").
 * Handles undefined, null, objects, and unknown strings safely without throwing runtime errors.
 */
export const getGovernorateName = (govIdOrName, isArabic = true) => {
  if (!govIdOrName) return '';

  let target = '';
  if (typeof govIdOrName === 'string') {
    target = govIdOrName.trim();
  } else if (typeof govIdOrName === 'object' && govIdOrName !== null) {
    target = String(
      govIdOrName.nameAr ||
      govIdOrName.nameEn ||
      govIdOrName.name ||
      govIdOrName.governorate ||
      govIdOrName.id ||
      govIdOrName.label ||
      ''
    ).trim();
  } else {
    target = String(govIdOrName || '').trim();
  }

  if (!target) return '';

  const gov = getGovernorateById(target);
  if (!gov) return target;
  return isArabic !== false ? gov.nameAr : gov.nameEn;
};

/**
 * Safe resolver for an order object, extracting the governorate from any customerDetails or root property.
 */
export const safeResolveGovernorate = (order, isArabic = true) => {
  if (!order) return '';
  const val =
    order?.governorate ||
    order?.customerDetails?.governorate ||
    order?.customerDetails?.governorateName ||
    order?.customerDetails?.city ||
    '';
  return typeof val === 'string' && val.trim()
    ? getGovernorateName(val.trim(), isArabic)
    : (typeof val === 'object' && val !== null ? getGovernorateName(val, isArabic) : (typeof val === 'string' ? val : ''));
};
