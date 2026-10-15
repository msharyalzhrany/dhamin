// نصوص الشريط الإعلاني في الصفحة الرئيسية — عدّلها هنا بحرية (نصوص تجريبية للمشروع).
// kind: نوع العقار، offer: نص العرض، tag: الخصم أو الشارة، to: الصفحة التي تفتح عند الضغط
export type Promo = { kind: { ar: string; en: string }; offer: { ar: string; en: string }; tag: { ar: string; en: string }; to: string };

export const PROMOS: Promo[] = [
  { kind: { ar: 'فلل للبيع', en: 'Villas for sale' }, offer: { ar: 'خصم على رسوم الوساطة للصفقات المكتملة هذا الشهر', en: 'Brokerage-fee discount on deals completed this month' }, tag: { ar: 'خصم 5%', en: '5% off' }, to: '/properties?listingType=sale&propertyType=villa' },
  { kind: { ar: 'شقق للإيجار', en: 'Apartments for rent' }, offer: { ar: 'خصم على رسوم الخدمة عند توقيع عقد سنة كاملة', en: 'Service-fee discount on a full-year lease' }, tag: { ar: 'خصم 10%', en: '10% off' }, to: '/properties?listingType=rent&propertyType=apartment' },
  { kind: { ar: 'أراضي', en: 'Land' }, offer: { ar: 'عرض خاص على أراضي شمال جدة', en: 'Special offer on north Jeddah land' }, tag: { ar: 'عرض خاص', en: 'Special' }, to: '/properties?propertyType=land' },
  { kind: { ar: 'عمائر استثمارية', en: 'Investment buildings' }, offer: { ar: 'حد أدنى أقل للمستثمرين الجدد', en: 'Lower minimum for new investors' }, tag: { ar: 'جديد', en: 'New' }, to: '/invest' },
  { kind: { ar: 'محلات ومكاتب', en: 'Shops & offices' }, offer: { ar: 'الشهر الأول بدون رسوم خدمة', en: 'First month with no service fee' }, tag: { ar: 'مجاناً', en: 'Free' }, to: '/properties?usage=commercial' },
  { kind: { ar: 'شقق للبيع', en: 'Apartments for sale' }, offer: { ar: 'خصم على رسوم العقد الموثّق', en: 'Discount on the sealed-contract fee' }, tag: { ar: 'خصم 3%', en: '3% off' }, to: '/properties?listingType=sale&propertyType=apartment' },
];
