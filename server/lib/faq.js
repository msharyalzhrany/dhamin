// إجابات جاهزة تُستخدم عندما لا يتوفر مفتاح Gemini (أو فشل الاتصال).
// نختار أفضل إجابة بحساب عدد الكلمات المفتاحية المطابقة (الكلمة الأطول لها وزن أكبر).

const E = (id, kw, ar, en) => ({ id, kw, ar, en });

export const FAQ = [
  E('login', ['تسجيل', 'دخول', 'حساب', 'اشتراك', 'login', 'sign in', 'sign up', 'register', 'account'],
    'التصفح مفتوح للجميع بدون حساب. عند أي إجراء (مراسلة، مفضلة، إضافة عقار، صفقة) نطلب منك تسجيل الدخول أو إنشاء حساب بالبريد وكلمة مرور (8 أحرف على الأقل)، ثم نعيدك لنفس الصفحة.',
    'Browsing is open without an account. For any action (messaging, favorites, adding a listing, deals) you sign in or register with an email and a password (8+ characters), then you return to the same page.'),
  E('limits', ['حد', 'حدود', 'اقصى', 'مسموح', 'عدد العقارات', 'عدد الصفقات', 'كم عقار', 'كم صفقة', 'limit', 'maximum', 'how many', 'quota'],
    'لكل فرد حد أقصى 5 إعلانات نشطة و3 صفقات نشطة. لإضافة إعلان جديد أغلق أو أرشف إعلاناً قديماً، ولصفقة جديدة أنهِ أو ألغِ صفقة جارية.',
    'Each individual can have up to 5 active listings and 3 active deals. To add a new listing close or archive an old one; for a new deal finish or cancel a current one.'),
  E('add-property', ['اضيف عقار', 'اضافة عقار', 'انشر', 'اعلان', 'اعرض عقار', 'ابيع', 'add property', 'add listing', 'post', 'list my', 'publish', 'sell my'],
    'من لوحة التحكم اختر "إضافة عقار"، حدّد نوع العملية (بيع، إيجار، استثمار) والحي والسعر والمساحة وأضف حتى 10 صور والمرافق. الإعلان يظهر فوراً للجميع.',
    'From the dashboard choose "Add property", pick the operation (sale, rent, investment), district, price, area, and add up to 10 photos and amenities. The listing goes live immediately.'),
  E('deal-steps', ['خطوات', 'مراحل', 'كيف تتم الصفقة', 'صفقة', 'steps', 'deal', 'process', 'how does it work', 'flow'],
    'خطوات الصفقة: 1) تتفاوضان في المحادثة ويقترح أحدكما سعراً ويقبله الآخر. 2) يُنشأ العقد تلقائياً بختم وبصمة. 3) يوقّع الطرفان إلكترونياً. 4) الدافع يضغط "تم التحويل". 5) المستلم يضغط "تم الاستلام" فتكتمل الصفقة. 6) تقييم متبادل.',
    'Deal steps: 1) negotiate in chat; one side proposes a price and the other accepts. 2) A contract is generated with a seal and fingerprint. 3) Both sign electronically. 4) The payer presses "Transferred". 5) The receiver presses "Received" and the deal completes. 6) Mutual reviews.'),
  E('contract', ['عقد', 'العقد', 'ختم', 'بصمة', 'نموذج', 'contract', 'seal', 'template', 'agreement'],
    'يُنشأ العقد تلقائياً بعد قبول السعر من بيانات الطرفين والعقار، برقم فريد وختم وبصمة رقمية تمنع التلاعب. القالب يختلف حسب العملية: بيع أو إيجار أو استثمار.',
    'The contract is generated automatically after the price is accepted, from both parties and the property data, with a unique number, a seal and a digital fingerprint against tampering. The template depends on the operation: sale, rent or investment.'),
  E('signature', ['توقيع', 'وقع', 'اوقع', 'sign', 'signature', 'signing'],
    'التوقيع إلكتروني: تكتب اسمك تماماً كما هو في حسابك ثم تضغط توقيع. عندما يوقّع الطرفان ينتقل العقد لمرحلة التحويل.',
    'Signing is electronic: type your name exactly as in your account and press sign. When both parties have signed the deal moves on to the transfer step.'),
  E('cancel', ['الغاء', 'الغي', 'تراجع', 'cancel', 'withdraw', 'back out'],
    'يمكنك إلغاء الصفقة في أي مرحلة قبل تأكيد التحويل مع كتابة السبب، ويعود العقار متاحاً. بعد "تم التحويل" لا يمكن الإلغاء مباشرة، افتح تذكرة دعم.',
    'You can cancel a deal at any stage before the transfer is confirmed, with a reason, and the property becomes available again. After "Transferred" you cannot cancel directly; open a support ticket.'),
  E('ticket', ['تذكرة', 'دعم', 'شكوى', 'مشكلة', 'نزاع', 'ticket', 'support', 'complaint', 'problem', 'dispute', 'help'],
    'عند وجود مشكلة (خصوصاً بعد التحويل) افتح تذكرة دعم من صفحة الدعم واربطها بالصفقة. تتحول الصفقة إلى "متنازع عليها" ويراجعها فريق ضامن، وترى أنت حالة التذكرة فقط.',
    'If there is a problem (especially after the transfer) open a support ticket and link it to the deal. The deal becomes "disputed", the Dhamin team reviews it, and you can see the ticket status only.'),
  E('invest', ['استثمار', 'استثمر', 'مستثمر', 'عائد', 'اسهم', 'invest', 'investment', 'return', 'shares', 'roi'],
    'الفرص الاستثمارية محاكاة فقط (لا أسهم ولا أموال حقيقية). لكل فرصة حد أدنى للاستثمار ومدة وعائد متوقع، ويظهر المبلغ المحصّل مقابل المطلوب.',
    'Investment opportunities are simulation only (no real shares or money). Each has a minimum investment, a duration and an expected return, and shows the amount raised versus the target.'),
  E('auctions', ['مزاد', 'مزادات', 'auction', 'auctions', 'bid'],
    'المزادات قريباً بإذن الله. حالياً المتاح: البيع والإيجار والفرص الاستثمارية.',
    'Auctions are coming soon. For now you can use sales, rentals and investment opportunities.'),
  E('profile', ['ملف', 'جوال', 'عنوان وطني', 'العنوان', 'توثيق', 'صورة شخصية', 'profile', 'phone', 'national address', 'verify', 'avatar'],
    'من صفحة الحساب أضف رقم جوالك (05xxxxxxxx) والعنوان الوطني المختصر (4 حروف + 4 أرقام مثل RRRD2929) وصورة ونبذة. هذه البيانات تدخل في العقد، ولا تظهر أرقام الجوال للطرف الآخر إلا بعد الاتفاق.',
    'On the account page add your phone (05xxxxxxxx), your short national address (4 letters + 4 digits, e.g. RRRD2929), a photo and a bio. They feed into the contract; phone numbers are shown to the other party only after the agreement.'),
  E('prefs', ['لغة', 'انجليزي', 'داكن', 'ليلي', 'مظلم', 'خط', 'حجم الخط', 'language', 'english', 'arabic', 'dark', 'font', 'theme'],
    'يمكنك تبديل اللغة (عربي/English) والوضع الداكن وتكبير حجم الخط من أدوات الواجهة في أعلى الصفحة.',
    'You can switch the language (Arabic/English), dark mode and font size from the interface controls at the top of the page.'),
  E('safety', ['امان', 'آمن', 'دفع', 'مدفوعات', 'احتيال', 'نصب', 'ثقة', 'فلوس', 'safe', 'safety', 'payment', 'pay', 'scam', 'fraud', 'trust', 'secure'],
    'للأمان: لا تحوّل أي مبلغ قبل توقيع العقد من الطرفين، ولا تشارك بياناتك البنكية في المحادثة. الأسماء الكاملة والجوالات لا تظهر إلا بعد الاتفاق، ويمكنك فتح تذكرة دعم في أي وقت. ضامن لا يقدّم نصيحة قانونية أو مالية.',
    'For safety: never transfer money before both parties sign the contract and never share bank details in chat. Full names and phones appear only after agreement, and you can open a support ticket anytime. Dhamin does not give legal or financial advice.'),
  E('reviews', ['تقييم', 'تقييمات', 'قيم', 'review', 'rating', 'rate', 'reviews'],
    'بعد اكتمال الصفقة يقيّم كل طرف الآخر مرة واحدة (1 إلى 5 نجوم مع تعليق اختياري)، ويظهر متوسط التقييم في ملف المستخدم وإعلاناته.',
    'After a deal completes each party reviews the other once (1 to 5 stars with an optional comment). The average rating appears on the user profile and listings.'),
  E('search', ['بحث', 'ابحث', 'فلتر', 'حي', 'احياء', 'search', 'filter', 'district', 'find'],
    'في صفحة العقارات استخدم الفلاتر: نوع العملية، نوع العقار، الحي، السعر، المساحة، غرف النوم والمرافق، مع ترتيب حسب الأحدث أو السعر. التغطية حالياً مدينة جدة فقط.',
    'On the listings page use filters: operation, property type, district, price, area, bedrooms and amenities, sorted by newest or price. Coverage is currently Jeddah only.'),
  E('greeting', ['مرحبا', 'السلام', 'اهلا', 'هلا', 'hello', 'hi', 'hey', 'salam'],
    'أهلاً بك في ضامن! أنا هنا لأجيبك عن الصفقات والعقود والحدود والاستثمار والدعم. ماذا تود أن تعرف؟',
    'Welcome to Dhamin! I can answer questions about deals, contracts, limits, investment and support. What would you like to know?'),
];

// تطبيع النص العربي/الإنجليزي للمقارنة: حروف صغيرة، بدون تشكيل، توحيد الألف والياء والتاء المربوطة
export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DEFAULT_REPLY = {
  ar: 'ما فهمت سؤالك تماماً، ممكن تعيد صياغته؟ أقدر أساعدك في: تسجيل الدخول، الحدود، إضافة عقار، خطوات الصفقة، العقد والتوقيع، الإلغاء، تذاكر الدعم، الاستثمار، المزادات، الملف الشخصي، اللغة والوضع الداكن، والأمان.',
  en: "I didn't quite get that, could you rephrase? I can help with: login, limits, adding a property, deal steps, contract and signing, cancelling, support tickets, investment, auctions, your profile, language and dark mode, and safety.",
};

export function faqAnswer(message, lang) {
  const l = lang === 'en' ? 'en' : 'ar';
  const text = ` ${normalize(message)} `;
  let best = null;
  let bestScore = 0;
  for (const e of FAQ) {
    let score = 0;
    for (const k of e.kw) {
      const nk = normalize(k);
      if (!nk) continue;
      // الكلمات القصيرة جداً (حرف/حرفان) نطابقها ككلمة كاملة حتى لا تتطابق عشوائياً
      const hit = nk.length <= 3 ? text.includes(` ${nk} `) : text.includes(nk);
      if (hit) score += nk.length;
    }
    // تحية عامة تأتي آخراً حتى لا تغلب سؤالاً حقيقياً
    if (e.id === 'greeting') score *= 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best ? best[l] : DEFAULT_REPLY[l];
}
