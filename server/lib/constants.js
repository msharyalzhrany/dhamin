// ثوابت المنصة — مصدر واحد تقرأ منه الواجهة والسيرفر (عبر GET /api/meta)

export const CITY = { id: 'jeddah', ar: 'جدة', en: 'Jeddah' };

// أحياء جدة (عدّل القائمة بحرية، المهم أن يبقى id بالإنجليزي بدون مسافات)
const _DISTRICTS = [
  { id: 'al-rawdah', ar: 'الروضة', en: 'Al Rawdah' },
  { id: 'al-shati', ar: 'الشاطئ', en: 'Al Shati' },
  { id: 'al-hamra', ar: 'الحمراء', en: 'Al Hamra' },
  { id: 'al-salamah', ar: 'السلامة', en: 'Al Salamah' },
  { id: 'al-zahraa', ar: 'الزهراء', en: 'Al Zahraa' },
  { id: 'al-nahda', ar: 'النهضة', en: 'Al Nahda' },
  { id: 'al-safa', ar: 'الصفا', en: 'Al Safa' },
  { id: 'al-marwah', ar: 'المروة', en: 'Al Marwah' },
  { id: 'al-basateen', ar: 'البساتين', en: 'Al Basateen' },
  { id: 'al-fayhaa', ar: 'الفيحاء', en: 'Al Fayhaa' },
  { id: 'al-andalus', ar: 'الأندلس', en: 'Al Andalus' },
  { id: 'al-aziziyah', ar: 'العزيزية', en: 'Al Aziziyah' },
  { id: 'al-khalidiyah', ar: 'الخالدية', en: 'Al Khalidiyah' },
  { id: 'al-naeem', ar: 'النعيم', en: 'Al Naeem' },
  { id: 'al-muhammadiyah', ar: 'المحمدية', en: 'Al Muhammadiyah' },
  { id: 'obhur-north', ar: 'أبحر الشمالية', en: 'Obhur North' },
  { id: 'obhur-south', ar: 'أبحر الجنوبية', en: 'Obhur South' },
  { id: 'al-sharafeyah', ar: 'الشرفية', en: 'Al Sharafeyah' },
  { id: 'al-ruwais', ar: 'الرويس', en: 'Al Ruwais' },
  { id: 'al-balad', ar: 'البلد', en: 'Al Balad' },
  { id: 'al-faisaliyah', ar: 'الفيصلية', en: 'Al Faisaliyah' },
  { id: 'al-rehab', ar: 'الرحاب', en: 'Al Rehab' },
  { id: 'al-hamdaniyah', ar: 'الحمدانية', en: 'Al Hamdaniyah' },
  { id: 'as-sawari', ar: 'الصواري', en: 'As Sawari' },
  { id: 'al-yaqut', ar: 'الياقوت', en: 'Al Yaqut' },
  { id: 'al-bawadi', ar: 'البوادي', en: 'Al Bawadi' },
  { id: 'al-muruj', ar: 'المروج', en: 'Al Muruj' },
  { id: 'az-zumurrud', ar: 'الزمرد', en: 'Az Zumurrud' },
  { id: 'ar-rabwah', ar: 'الربوة', en: 'Ar Rabwah' },
  { id: 'an-nuzhah', ar: 'النزهة', en: 'An Nuzhah' },
  { id: 'ath-thaalibah', ar: 'الثعالبة', en: 'Ath Thaalibah' },
  { id: 'al-jamiah', ar: 'الجامعة', en: 'Al Jamiah' },
  { id: 'briman', ar: 'بريمان', en: 'Briman' },
  { id: 'mishrifah', ar: 'مشرفة', en: 'Mishrifah' },
  { id: 'an-nakheel', ar: 'النخيل', en: 'An Nakheel' },
  { id: 'al-waha', ar: 'الواحة', en: 'Al Waha' },
  { id: 'as-sanabil', ar: 'السنابل', en: 'As Sanabil' },
  { id: 'al-wurud', ar: 'الورود', en: 'Al Wurud' },
  { id: 'al-ajawid', ar: 'الأجاويد', en: 'Al Ajawid' },
  { id: 'as-sahifah', ar: 'الصحيفة', en: 'As Sahifah' },
  { id: 'ghulail', ar: 'غليل', en: 'Ghulail' },
  { id: 'petromin', ar: 'بترومين', en: 'Petromin' },
  { id: 'prince-fawaz', ar: 'الأمير فواز', en: 'Prince Fawaz' },
  { id: 'prince-sultan', ar: 'الأمير سلطان', en: 'Prince Sultan' },
  { id: 'al-khumrah', ar: 'الخمرة', en: 'Al Khumrah' },
  { id: 'al-hindawiyah', ar: 'الهنداوية', en: 'Al Hindawiyah' },
  { id: 'al-kandarah', ar: 'الكندرة', en: 'Al Kandarah' },
  { id: 'al-amariyah', ar: 'العمارية', en: 'Al Amariyah' },
  { id: 'al-lulu', ar: 'اللؤلؤ', en: 'Al Lulu' },
  { id: 'al-manar', ar: 'المنار', en: 'Al Manar' },
  { id: 'an-naseem', ar: 'النسيم', en: 'An Naseem' },
  { id: 'al-qurayyat', ar: 'القريات', en: 'Al Qurayyat' },
  { id: 'al-harazat', ar: 'الحرازات', en: 'Al Harazat' },
  { id: 'madain-al-fahd', ar: 'مدائن الفهد', en: 'Madain Al Fahd' },
  { id: 'al-mahjar', ar: 'المحجر', en: 'Al Mahjar' },
  { id: 'as-sabeel', ar: 'السبيل', en: 'As Sabeel' },
  { id: 'ash-sharqiyah', ar: 'الشرقية', en: 'Ash Sharqiyah' },
  { id: 'bani-malik', ar: 'بني مالك', en: 'Bani Malik' },
  { id: 'al-adl', ar: 'العدل', en: 'Al Adl' },
  { id: 'al-quwayzah', ar: 'القويزة', en: 'Al Quwayzah' },
  { id: 'al-wafa', ar: 'الوفاء', en: 'Al Wafa' },
  { id: 'as-salhiyah', ar: 'الصالحية', en: 'As Salhiyah' },
  { id: 'ar-raghamah', ar: 'الرغامة', en: 'Ar Raghamah' },
  { id: 'umm-as-salam', ar: 'أم السلم', en: 'Umm As Salam' },
  { id: 'al-amanah', ar: 'الأمانة', en: 'Al Amanah' },
  { id: 'dhahban', ar: 'ذهبان', en: 'Dhahban' },
  { id: 'an-nouri', ar: 'النوري', en: 'An Nouri' },
  { id: 'al-marjan', ar: 'المرجان', en: 'Al Marjan' },
  { id: 'al-baghdadiyah', ar: 'البغدادية', en: 'Al Baghdadiyah' },
  { id: 'al-jawharah', ar: 'الجوهرة', en: 'Al Jawharah' },
  { id: 'al-muntazahat', ar: 'المنتزهات', en: 'Al Muntazahat' },
  { id: 'ar-rahmaniyah', ar: 'الرحمانية', en: 'Ar Rahmaniyah' },
  { id: 'ar-rawabi', ar: 'الروابي', en: 'Ar Rawabi' },
  { id: 'ar-riyadh', ar: 'الرياض', en: 'Ar Riyadh' },
  { id: 'al-safwah', ar: 'الصفوة', en: 'Al Safwah' },
  { id: 'al-faisaliyah-north', ar: 'الفيصلية الشمالية', en: 'North Al Faisaliyah' },
  { id: 'al-nuzlah', ar: 'النزلة اليمانية', en: 'An Nuzlah Al Yamaniyah' },
  { id: 'al-nuzlah-sh', ar: 'النزلة الشرقية', en: 'An Nuzlah Ash Sharqiyah' },
  { id: 'al-thaghr', ar: 'الثغر', en: 'Ath Thaghr' },
  { id: 'al-hizam', ar: 'الحزام', en: 'Al Hizam' },
  { id: 'al-ruwais-north', ar: 'الرويس الشمالي', en: 'North Ar Ruwais' },
  { id: 'al-samer', ar: 'السامر', en: 'As Samer' },
  { id: 'al-hamra-north', ar: 'الحمراء الشمالية', en: 'North Al Hamra' },
  { id: 'al-sulaymaniyah', ar: 'السليمانية', en: 'As Sulaymaniyah' },
  { id: 'al-bawadi-north', ar: 'البوادي الشمالية', en: 'North Al Bawadi' },
  { id: 'al-ulayya', ar: 'العليا', en: 'Al Ulayya' },
  { id: 'al-thalatheen', ar: 'الثلاثين', en: 'Ath Thalatheen' },
  { id: 'al-shulah', ar: 'الشلة', en: 'Ash Shulah' },
  { id: 'al-fadeylah', ar: 'الفضيلة', en: 'Al Fadeylah' },
  { id: 'al-masif', ar: 'المصيف', en: 'Al Masif' },
  { id: 'al-nawras', ar: 'النورس', en: 'An Nawras' },
  { id: 'al-bandariyah', ar: 'البندرية', en: 'Al Bandariyah' },
  { id: 'al-rayyan', ar: 'الريان', en: 'Ar Rayyan' },
];

// مرتبة أبجدياً بالعربي لتسهيل الاختيار
export const JEDDAH_DISTRICTS = [..._DISTRICTS].sort((a, b) => a.ar.localeCompare(b.ar, 'ar'));

export const LISTING_TYPES = [
  { id: 'sale', ar: 'للبيع', en: 'For sale' },
  { id: 'rent', ar: 'للإيجار', en: 'For rent' },
  { id: 'invest', ar: 'فرصة استثمارية', en: 'Investment' },
];

export const PROPERTY_TYPES = [
  { id: 'villa', ar: 'فيلا', en: 'Villa' },
  { id: 'apartment', ar: 'شقة', en: 'Apartment' },
  { id: 'building', ar: 'عمارة', en: 'Building' },
  { id: 'floor', ar: 'دور', en: 'Floor' },
  { id: 'land', ar: 'أرض', en: 'Land' },
  { id: 'shop', ar: 'محل', en: 'Shop' },
  { id: 'office', ar: 'مكتب', en: 'Office' },
];

export const USAGES = [
  { id: 'residential', ar: 'سكني', en: 'Residential' },
  { id: 'commercial', ar: 'تجاري', en: 'Commercial' },
  { id: 'mixed', ar: 'سكني تجاري', en: 'Mixed use' },
];

export const RENT_PERIODS = [
  { id: 'monthly', ar: 'شهري', en: 'Monthly' },
  { id: 'yearly', ar: 'سنوي', en: 'Yearly' },
];

// المرافق (تُخزَّن معرّفاتها فقط في العقار)
export const AMENITIES = [
  { id: 'parking', ar: 'مواقف سيارات', en: 'Parking' },
  { id: 'elevator', ar: 'مصعد', en: 'Elevator' },
  { id: 'pool', ar: 'مسبح', en: 'Swimming pool' },
  { id: 'garden', ar: 'حديقة', en: 'Garden' },
  { id: 'gym', ar: 'نادي رياضي', en: 'Gym' },
  { id: 'security', ar: 'حراسة أمنية', en: 'Security' },
  { id: 'maid-room', ar: 'غرفة خادمة', en: "Maid's room" },
  { id: 'driver-room', ar: 'غرفة سائق', en: "Driver's room" },
  { id: 'furnished', ar: 'مفروش', en: 'Furnished' },
  { id: 'central-ac', ar: 'تكييف مركزي', en: 'Central A/C' },
  { id: 'kitchen', ar: 'مطبخ راكب', en: 'Fitted kitchen' },
  { id: 'balcony', ar: 'شرفة', en: 'Balcony' },
  { id: 'sea-view', ar: 'إطلالة بحرية', en: 'Sea view' },
  { id: 'smart-home', ar: 'منزل ذكي', en: 'Smart home' },
];

// حالات الصفقة والتذاكر (للعرض في الواجهة)
export const DEAL_STATUSES = [
  { id: 'negotiating', ar: 'قيد التفاوض', en: 'Negotiating' },
  { id: 'agreed', ar: 'تم الاتفاق', en: 'Agreed' },
  { id: 'awaiting_signatures', ar: 'بانتظار التوقيع', en: 'Awaiting signatures' },
  { id: 'awaiting_transfer', ar: 'بانتظار التحويل', en: 'Awaiting transfer' },
  { id: 'awaiting_receipt', ar: 'بانتظار تأكيد الاستلام', en: 'Awaiting receipt' },
  { id: 'completed', ar: 'مكتملة', en: 'Completed' },
  { id: 'cancelled', ar: 'ملغاة', en: 'Cancelled' },
  { id: 'disputed', ar: 'متنازع عليها', en: 'Disputed' },
];

export const TICKET_STATUSES = [
  { id: 'open', ar: 'مفتوحة', en: 'Open' },
  { id: 'in_review', ar: 'قيد المراجعة', en: 'In review' },
  { id: 'resolved', ar: 'تم الحل', en: 'Resolved' },
  { id: 'closed', ar: 'مغلقة', en: 'Closed' },
];

// حدود الفرد العادي. تُطبَّق من السيرفر (مو من الواجهة فقط).
export const LIMITS = {
  individual: { activeListings: 5, activeDeals: 3 },
};

export const ids = (list) => list.map((x) => x.id);
