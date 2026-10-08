// نصوص بنود العقد بالعربي والإنجليزي لكل نوع (بيع / إيجار / استثمار)
// ملاحظة: العقد محاكاة لمشروع أكاديمي وليس وثيقة قانونية — وهذا مذكور في ذيل المستند.
export type Lang = 'ar' | 'en';
export type TemplateType = 'sale' | 'rent' | 'invest';
export type Clause = { title: string; body: string };

export const TEMPLATE = {
  sale: { title: { ar: 'عقد بيع عقار', en: 'Property Sale Contract' }, a: { ar: 'البائع', en: 'Seller' }, b: { ar: 'المشتري', en: 'Buyer' } },
  rent: { title: { ar: 'عقد إيجار', en: 'Lease Contract' }, a: { ar: 'المؤجّر', en: 'Lessor' }, b: { ar: 'المستأجر', en: 'Lessee' } },
  invest: { title: { ar: 'عقد استثمار عقاري', en: 'Real-Estate Investment Agreement' }, a: { ar: 'صاحب الفرصة', en: 'Opportunity owner' }, b: { ar: 'المستثمر', en: 'Investor' } },
} as const;

// بنود مشتركة بين الأنواع الثلاثة (التأكيد، الإلغاء، النزاعات، التوقيع)
const common = (type: TemplateType): Record<Lang, Clause[]> => {
  const payer = { sale: ['المشتري', 'the Buyer'], rent: ['المستأجر', 'the Lessee'], invest: ['المستثمر', 'the Investor'] }[type];
  const recv = { sale: ['البائع', 'the Seller'], rent: ['المؤجّر', 'the Lessor'], invest: ['صاحب الفرصة', 'the Opportunity owner'] }[type];
  return {
    ar: [
      { title: 'تأكيد التحويل والاستلام', body: `يؤكد ${payer[0]} على المنصة إتمام التحويل بعد تنفيذه فعلياً خارج المنصة، ويؤكد ${recv[0]} استلام المبلغ كاملاً. لا تُعدّ الصفقة مكتملة إلا بتأكيد الطرفين على المنصة، ولا تحتفظ المنصة بأي أموال ولا تتولى تحصيلها.` },
      { title: 'الإلغاء', body: 'يجوز لأي من الطرفين إلغاء الصفقة قبل تأكيد التحويل مع ذكر السبب، وعندها يُعاد العقار للعرض. بعد تأكيد التحويل لا يتاح الإلغاء المباشر، ويُرفع الأمر عبر تذكرة دعم.' },
      { title: 'النزاعات', body: 'يُرفع أي خلاف ينشأ عن هذا العقد عبر تذكرة دعم من داخل غرفة الصفقة، وتُراجَع السجلات المحفوظة (الرسائل والتأكيدات وأوقاتها) للمساعدة في حله وديّاً.' },
      { title: 'التوقيع الإلكتروني', body: 'يُعدّ إدخال كل طرف لاسمه مطابقاً لاسم حسابه وموافقته على هذا العقد توقيعاً إلكترونياً ملزماً له في حدود هذه المنصة، ويُسجَّل وقت التوقيع.' },
    ],
    en: [
      { title: 'Confirmation of transfer and receipt', body: `${payer[1][0].toUpperCase() + payer[1].slice(1)} confirms on the platform that the transfer was actually made outside the platform, and ${recv[1]} confirms receiving the full amount. The deal is complete only when both parties have confirmed on the platform. The platform never holds or collects funds.` },
      { title: 'Cancellation', body: 'Either party may cancel before the transfer is confirmed, stating a reason, and the property returns to the listings. Once the transfer is confirmed, direct cancellation is no longer available and the matter is raised through a support ticket.' },
      { title: 'Disputes', body: 'Any disagreement arising from this contract is raised through a support ticket from the deal room. The saved records (messages, confirmations and their timestamps) are reviewed to help resolve it amicably.' },
      { title: 'Electronic signature', body: 'Each party entering a name that matches their account name and consenting to this contract constitutes a binding electronic signature within this platform. The time of signing is recorded.' },
    ],
  };
};

export function clausesFor(type: TemplateType): Record<Lang, Clause[]> {
  const c = common(type);
  const own: Record<TemplateType, Record<Lang, Clause[]>> = {
    sale: {
      ar: [
        { title: 'موضوع العقد', body: 'يبيع الطرف الأول (البائع) إلى الطرف الثاني (المشتري) العقار الموصوف في هذا العقد، ويقبل المشتري الشراء بالثمن المحدد في الشروط المالية.' },
        { title: 'الثمن وطريقة السداد', body: 'يسدّد المشتري الثمن المتفق عليه إلى البائع مباشرة بالتحويل البنكي خارج المنصة، وبالمبلغ المبيّن في الشروط المالية دون زيادة أو نقصان.' },
        { title: 'إقرار الملكية', body: 'يقرّ البائع بأنه مالك العقار أو مفوّض بالتصرف فيه، وأن البيانات الواردة في هذا العقد صحيحة، وأنه لم يُخفِ أي حق للغير على العقار.' },
        { title: 'نقل الملكية', body: 'يجري إفراغ العقار ونقل صكّه عبر الجهات الرسمية المختصة خارج المنصة، ويتعاون الطرفان في استكمال إجراءاته.' },
      ],
      en: [
        { title: 'Subject of the contract', body: 'The first party (Seller) sells to the second party (Buyer) the property described in this contract, and the Buyer agrees to buy it at the price stated in the financial terms.' },
        { title: 'Price and payment', body: 'The Buyer pays the agreed price directly to the Seller by bank transfer outside the platform, in the exact amount stated in the financial terms.' },
        { title: 'Declaration of ownership', body: 'The Seller declares that they own the property or are authorised to dispose of it, that the details in this contract are correct, and that they have not concealed any third-party right over it.' },
        { title: 'Transfer of title', body: 'Conveyance and transfer of the title deed are carried out through the competent official bodies outside the platform, and both parties cooperate to complete the procedures.' },
      ],
    },
    rent: {
      ar: [
        { title: 'موضوع العقد', body: 'يؤجّر الطرف الأول (المؤجّر) إلى الطرف الثاني (المستأجر) العقار الموصوف في هذا العقد للانتفاع به في الغرض المحدد وللمدة المبيّنة في الشروط المالية.' },
        { title: 'الأجرة وطريقة السداد', body: 'يسدّد المستأجر الأجرة المتفق عليها إلى المؤجّر مباشرة بالتحويل البنكي خارج المنصة، وبالمبلغ المبيّن في الشروط المالية.' },
        { title: 'التزامات المؤجّر', body: 'يسلّم المؤجّر العقار صالحاً للاستخدام، ويقرّ بملكيته أو تفويضه بتأجيره، ويتحمل الإصلاحات الإنشائية الجوهرية.' },
        { title: 'التزامات المستأجر', body: 'يستخدم المستأجر العقار في الغرض المؤجَّر له، ويحافظ عليه، ولا يؤجّره من الباطن دون موافقة كتابية، ويسلّمه عند انتهاء المدة بحالته المسلَّمة عدا الاستهلاك المعتاد.' },
      ],
      en: [
        { title: 'Subject of the contract', body: 'The first party (Lessor) leases to the second party (Lessee) the property described in this contract, for the stated use and the term shown in the financial terms.' },
        { title: 'Rent and payment', body: 'The Lessee pays the agreed rent directly to the Lessor by bank transfer outside the platform, in the amount stated in the financial terms.' },
        { title: 'Lessor obligations', body: 'The Lessor delivers the property fit for use, declares that they own it or are authorised to lease it, and bears major structural repairs.' },
        { title: 'Lessee obligations', body: 'The Lessee uses the property only for the leased purpose, takes care of it, does not sublet without written consent, and returns it at the end of the term in the condition received, normal wear excepted.' },
      ],
    },
    invest: {
      ar: [
        { title: 'موضوع الاتفاقية', body: 'يسهم الطرف الثاني (المستثمر) بالمبلغ المحدد في الفرصة العقارية المعلنة من الطرف الأول (صاحب الفرصة) خلال المدة المبيّنة في الشروط المالية.' },
        { title: 'مبلغ الاستثمار وسداده', body: 'يحوّل المستثمر مبلغ الاستثمار إلى صاحب الفرصة مباشرة بالتحويل البنكي خارج المنصة، وبالمبلغ المبيّن في الشروط المالية.' },
        { title: 'العائد المتوقع والمخاطر', body: 'نسبة العائد المذكورة تقديرية معلنة من صاحب الفرصة، ولا تُعدّ ضماناً من المنصة أو من أي طرف لتحقيق ربح أو لعدم وقوع خسارة. الاستثمار ينطوي على مخاطر.' },
        { title: 'التزامات صاحب الفرصة', body: 'يستخدم صاحب الفرصة المبلغ في الغرض المعلن، ويُطلع المستثمر على مستجدات الفرصة، ويوزّع العوائد وفق ما يُتفق عليه بينهما.' },
      ],
      en: [
        { title: 'Subject of the agreement', body: 'The second party (Investor) contributes the stated amount to the real-estate opportunity announced by the first party (Opportunity owner) for the term shown in the financial terms.' },
        { title: 'Investment amount and payment', body: 'The Investor transfers the investment amount directly to the Opportunity owner by bank transfer outside the platform, in the amount stated in the financial terms.' },
        { title: 'Expected return and risk', body: 'The stated return is an estimate announced by the Opportunity owner. It is not a guarantee by the platform or any party of profit or against loss. Investing involves risk.' },
        { title: 'Opportunity owner obligations', body: 'The Opportunity owner uses the funds for the announced purpose, keeps the Investor informed of developments, and distributes returns as agreed between them.' },
      ],
    },
  };
  return { ar: [...own[type].ar, ...c.ar], en: [...own[type].en, ...c.en] };
}

export const ACADEMIC_NOTE = {
  ar: 'هذا العقد مُحاكى لأغراض مشروع أكاديمي (مقرر CS379)، وليس سنداً قانونياً ولا يرتّب أثراً نظامياً.',
  en: 'This is a simulated contract produced for an academic project (CS379). It is not a legal instrument and has no legal effect.',
};
