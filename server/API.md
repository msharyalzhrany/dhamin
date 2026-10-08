# واجهة ضامن البرمجية / Dhamin API

كل المسارات تحت `/api`. الجلسة عبر كوكي Better Auth (`credentials: 'include'` أو نفس الأصل عبر بروكسي Vite).
كل الأخطاء بهذا الشكل: `{ "error": { "code": "NOT_FOUND", "message": "رسالة عربية للمستخدم" } }`

- **Auth: public** = بدون دخول، **optional** = يعمل بدون دخول ويُضيف حقولاً إذا سجّل، **required** = يرجع `401 UNAUTHENTICATED` بدونه.
- التواريخ بصيغة ISO (`2026-10-08T00:11:34.260Z`). المبالغ أعداد صحيحة بالريال.
- الطلبات المغيّرة (POST/PATCH/DELETE) من `Origin` غير موثوق → `403 FORBIDDEN_ORIGIN`.
- حد الطلبات: `429 RATE_LIMIT` (تسجيل دخول/تسجيل 20/دقيقة/IP، المساعد 20/دقيقة/IP، الرفع 30/دقيقة/مستخدم).
- حجم الطلب: 1MB لكل `/api` عدا `/api/uploads` (6MB) → `413 TOO_LARGE`.

## رموز الأخطاء الشائعة / Error codes
`UNAUTHENTICATED 401` · `FORBIDDEN 403` · `NOT_FOUND 404` · `VALIDATION 400` (الرسالة تسرد الحقول) · `LIMIT_REACHED 409` (إعلانات) · `DEAL_LIMIT 409` · `DEAL_EXISTS 409` · `PROPERTY_UNAVAILABLE 409` · `BAD_STATE 409` (الحالة لا تسمح بالإجراء) · `NAME_MISMATCH 400` · `ALREADY_SIGNED 409` · `USE_TICKET 409` · `ALREADY_REVIEWED 409` · `OWN_PROPERTY 400` · `BAD_FILE 400` · `TOO_LARGE 413` · `RATE_LIMIT 429` · `FORBIDDEN_ORIGIN 403`

---
## 1) المصادقة Auth (Better Auth) — `/api/auth/*`
| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/sign-up/email` | `{name, email, password(>=8)}` ← يسجّل ويدخل مباشرة |
| POST | `/api/auth/sign-in/email` | `{email, password}` |
| POST | `/api/auth/sign-out` | `{}` |
| GET | `/api/auth/get-session` | → `{session, user}` أو `null` |

## 2) عام Public
### GET `/api/health` → `{ok:true,time}`
### GET `/api/meta` (public)
`{city, districts[{id,ar,en}], listingTypes, propertyTypes, usages, rentPeriods, amenities[{id,ar,en}], dealStatuses[{id,ar,en}], ticketStatuses[{id,ar,en}], limits:{individual:{activeListings:5,activeDeals:3}}}`

معرّفات المرافق: `parking elevator pool garden gym security maid-room driver-room furnished central-ac kitchen balcony sea-view smart-home`

### GET `/api/stats` (public)
`{ "activeListings": 12, "completedDeals": 1, "members": 8, "districts": 10 }`

## 3) الرفع Uploads
### POST `/api/uploads` (required) — `multipart/form-data`, الحقل `file`
JPEG/PNG/WebP فقط، ≤5MB، يُتحقق من البايتات الفعلية. → `201 {"url":"/uploads/<uuid>.png"}`
أخطاء: `400 BAD_FILE`, `413 TOO_LARGE`. الملفات تُقدَّم من `GET /uploads/<uuid>.<ext>` (كاش سنة).
استخدم هذا الرابط في `images` للعقار أو `avatarUrl` للملف الشخصي.

## 4) العقارات Properties
شكل عنصر العقار (list/mine/favorites):
```json
{ "id":"…", "ownerId":"…", "ownerFirstName":"خالد", "listingType":"sale|rent|invest", "propertyType":"villa",
  "usage":"residential", "title":"…", "description":"…", "price":4800000, "rentPeriod":null|"yearly"|"monthly",
  "areaSqm":600, "bedrooms":5, "bathrooms":6, "city":"jeddah", "district":"al-shati", "addressNote":"…",
  "amenities":["parking","pool"], "status":"active|reserved|closed|archived", "createdAt":"…", "updatedAt":"…",
  "cover":"/uploads/x.jpg"|null, "mediaCount":2,
  "isFavorite":false,           // فقط إذا المستخدم مسجّل
  "viewsCount":12,              // فقط في /mine (وفي التفاصيل لأي زائر)
  "investment":{ "targetAmount":3000000, "raisedAmount":1210000, "progressPct":40, "minInvestment":2000, "durationMonths":24, "expectedReturnPct":9.5 } // فقط invest
}
```
### GET `/api/properties` (optional)
Query (كلها اختيارية): `listingType, propertyType, usage, district, minPrice, maxPrice, minArea, maxArea, bedrooms(>=), amenity(واحد), maxMinInvestment, q, sort=newest|price_asc|price_desc, page=1, pageSize=12(<=50)`
→ `{items:[عنصر…], page, pageSize, total}` — يعرض `active` فقط.

### GET `/api/properties/mine` (required) → `{items:[…]}` كل حالاتي، مع `viewsCount`.
### GET `/api/properties/favorites` (required) → `{items:[…]}`

### GET `/api/properties/:id` (optional)
نفس حقول العنصر + (يسجّل مشاهدة إلا للمالك):
```json
{ "...": "…", "media":["/uploads/a.png","/uploads/b.jpg"], "amenities":[…], "isFavorite":false, "viewsCount":7,
  "owner":{ "id":"…","firstName":"خالد","avatarUrl":null,"ratingAvg":5,"ratingCount":1,"memberSince":"…","verified":{"phone":true,"address":true} } }
```
لا يحوي أسماء العائلة ولا البريد ولا الجوال. `404` إذا غير موجود أو `archived`.

### POST `/api/properties` (required) → `201 {id}`
```json
{ "listingType":"sale", "propertyType":"villa", "usage":"residential", "title":"(5-120)", "description":"", "price":2500000,
  "rentPeriod":"yearly",            // مطلوب للإيجار
  "areaSqm":450, "bedrooms":5, "bathrooms":4, "district":"al-shati", "addressNote":"…",
  "images":["/uploads/….png"],      // حتى 10، لازم تبدأ بـ /uploads/
  "amenities":["parking","pool"],   // حتى 14 من القائمة
  "investment":{ "targetAmount":1000000, "minInvestment":5000, "durationMonths":24, "expectedReturnPct":8.5 } // مطلوب لـ invest
}
```
`409 LIMIT_REACHED` عند تجاوز 5 إعلانات نشطة.

### PATCH `/api/properties/:id` (required، المالك فقط) → `{ok:true}`
أي من: `title, description, price, bedrooms, bathrooms, areaSqm, district, addressNote, amenities[], images[] (يستبدل الكل), status: active|closed|archived`. `403` لغير المالك.

### POST / DELETE `/api/properties/:id/favorite` (required) → `201 {ok}` / `{ok}`

## 5) الحساب Profile
### GET `/api/me` (required)
```json
{ "user":{"id","name","email","emailVerified","accountType":"individual","phone":"+966500000001"},
  "profile":{"userId","avatarUrl":null,"bio":"…","nationalAddress":"KHLD1001","nationalAddressVerified":true,"phoneVerified":true,"updatedAt":"…","ratingAvg":5,"ratingCount":1},
  "stats":{"completedDeals":1,"favorites":3},
  "welcome":{"ar":"مرحباً خالد","en":"Welcome, خالد"},
  "limits":{"activeListings":5,"activeDeals":3},
  "usage":{"activeListings":2,"activeDeals":2} }   // activeDeals = صفقات غير نهائية أنا طرف فيها (مالك أو مقابل)
```
### PATCH `/api/me` (required) → `{ok:true}`
`{name?, phone? ("05xxxxxxxx"), nationalAddress? ("ABCD1234"), bio?(<=300), avatarUrl? ("" لحذفها أو "/uploads/…")}`

### GET `/api/users/:id` (public)
```json
{ "id","firstName":"خالد","avatarUrl":null,"bio":"…","memberSince":"…","ratingAvg":5,"ratingCount":1,
  "verified":{"phone":true,"address":true},"completedDeals":1,"activeListings":2,
  "reviews":[{"rating":5,"comment":"…","createdAt":"…","reviewerFirstName":"ريم"}] }   // آخر 20
```

## 6) المحادثات Conversations (كلها required)
### POST `/api/conversations` `{propertyId}` → `201 {id}` جديدة، `200 {id}` موجودة
`400 OWN_PROPERTY` (عقارك)، `404` (غير موجود/غير نشط).
### GET `/api/conversations`
```json
{ "items":[ { "id":"…",
  "property":{"id","title","cover","listingType","price","district","propertyType"},
  "other":{"id","name":"سارة","avatarUrl":null},          // الاسم الأول فقط حتى مرحلة "تم الاتفاق" فما بعد ثم الاسم الكامل
  "lastMessage":{"body","createdAt","senderId","kind":"text|system"} | null,
  "unread":2, "deal":{"id","status"} | null, "updatedAt":"…" } ] }   // مرتبة بآخر نشاط
```
### GET `/api/conversations/:id` → `{id, property:{…}, other:{…}, deal, meId}` (`403/404` لغير المشارك)
### GET `/api/conversations/:id/messages?after=<ISO|ms>`
`{ "items":[{"id","senderId","body","kind":"text|system","createdAt"}] }` تصاعدي. بدون `after` = كل الرسائل. يعلّم رسائل الطرف الآخر مقروءة. الواجهة تستعلم كل ~3 ثوانٍ بآخر `createdAt` وصلها.
### POST `/api/conversations/:id/messages` `{body}` (1..1000، يُقصّ) → `201 {id,senderId,body,kind,createdAt}`

## 7) الصفقات Deals (كلها required)
الأدوار: **owner** = صاحب العقار (المستلم)، **counterparty** = بادئ المحادثة (الدافع). `kind` = نوع إعلان العقار (`sale|rent|invest`).
الحالات: `negotiating → agreed → awaiting_signatures → awaiting_transfer → awaiting_receipt → completed`، نهائيتان: `cancelled`, `disputed`. (`agreed` لحظية: القبول ينشئ العقد وينقل فوراً إلى `awaiting_signatures`.)

`nextAction` للمستخدم الحالي: `accept | wait | sign | wait_signature | confirm_transfer | wait_transfer | confirm_receipt | wait_receipt | review | null`

### POST `/api/deals` `{conversationId, agreedPrice, durationMonths?}` → `201 {id,status:"negotiating"}`
- إيجار: `durationMonths` (1..120) مطلوبة. استثمار: `minInvestment <= agreedPrice <= target-raised` والمدة افتراضياً مدة الفرصة. بيع: تُتجاهل.
- أخطاء: `409 DEAL_EXISTS` (صفقة جارية في المحادثة)، `409 DEAL_LIMIT` (3 صفقات نشطة)، `409 PROPERTY_UNAVAILABLE`.
- يضيف رسالة نظام للمحادثة (وكل تغيّر حالة لاحق).

### GET `/api/deals` → `{items:[…]}` (الأحدث تحديثاً أولاً)
```json
{ "id","status","kind","agreedPrice":820000,"durationMonths":null,"role":"owner|counterparty","payerIsMe":false,
  "proposedBy":"<userId>","property":{"id","title","cover"},"other":{"id","name","avatarUrl"},
  "conversationId":"…","contractNumber":"DH-2026-000002"|null,"nextAction":"sign","createdAt","updatedAt" }
```
### GET `/api/deals/:id` (طرف في الصفقة فقط، وإلا 403)
```json
{ "id","status","kind","agreedPrice","durationMonths","proposedBy","cancelReason":null,
  "payerConfirmedAt":null,"receiverConfirmedAt":null,"createdAt","updatedAt",
  "property":{"id","title","cover","district","propertyType","price","listingType"},
  "owner":{"id","name","avatarUrl","phone","ratingAvg"}, "counterparty":{"id","name","avatarUrl","phone","ratingAvg"},
  "role":"owner","payerIsMe":false,"nextAction":"accept","conversationId":"…",
  "contract":{ "id","number":"DH-2026-000002","status":"pending_signatures|signed|cancelled","sealHash":"<sha256 hex>","signedAt":null,
     "snapshot":{ "number","templateType":"sale|rent|invest","createdAt","price","durationMonths","rentPeriod?","investment?":{"expectedReturnPct","durationMonths"},
        "property":{"id","title","propertyType","usage","district","areaSqm","addressNote"},
        "owner":{"id","name","email","phone","nationalAddress"}, "counterparty":{"…"} },
     "signatures":[{"userId","role":"owner|counterparty","signedName","signedAt"}] } | null,
  "reviews":{"mine":{"rating":5,"comment":"…"}|null,"theirs":null} }
```
`phone` وأسماء الأطراف الكاملة تظهر فقط من `agreed` فصاعداً (قبلها `phone:null` والاسم الأول).

### POST `/api/deals/:id/accept` (الطرف غير المقترِح) → `{id,status:"awaiting_signatures",contractNumber}`
ينشئ العقد (رقم + ختم sha256) ويحجز العقار `reserved` (الاستثمار يبقى `active`). `403` للمقترِح، `409 DEAL_LIMIT` إذا تجاوز القابل حدّه.
### POST `/api/deals/:id/sign` `{signedName}` → `{ok:true, allSigned:boolean}`
الاسم = اسم حسابك (بدون حساسية للمسافات/الحروف) وإلا `400 NAME_MISMATCH`. عند توقيع الطرفين: العقد `signed` والصفقة `awaiting_transfer`.
### POST `/api/deals/:id/confirm-transfer` (الدافع فقط) → `{id,status:"awaiting_receipt"}`
### POST `/api/deals/:id/confirm-receipt` (صاحب العقار فقط) → `{id,status:"completed"}`
بيع/إيجار: العقار `closed`. استثمار: `raisedAmount += agreedPrice` ويُغلق العقار إن بلغ الهدف.
### POST `/api/deals/:id/cancel` `{reason (3..300)}` → `{id,status:"cancelled"}`
مسموح في `negotiating|agreed|awaiting_signatures|awaiting_transfer`؛ في `awaiting_receipt` → `409 USE_TICKET`. يعيد العقار `active` إن كان محجوزاً.
### POST `/api/deals/:id/review` `{rating 1..5, comment?}` → `201 {ok:true}`
بعد `completed` فقط، مرة لكل طرف (`409 ALREADY_REVIEWED`).

## 8) التذاكر Tickets (required)
### POST `/api/tickets` `{subject(3..120), body(10..3000), dealId?}` → `201 {id,status:"open"}`
مع `dealId` (صفقتي، وإلا 404): إن كانت `awaiting_transfer|awaiting_receipt` تتحول إلى `disputed` وتصل رسالة نظام.
### GET `/api/tickets` → `{items:[{id,userId,dealId,subject,body,status,createdAt,updatedAt}]}` · GET `/api/tickets/:id`
الحالة فقط للمستخدم: `open|in_review|resolved|closed`.

## 9) لوحة التحكم Dashboard — GET `/api/dashboard` (required)
```json
{ "kpis":{"activeListings":2,"views30d":80,"favoritesReceived":1,"activeDeals":2,"completedDeals":1,"unreadMessages":6,"ratingAvg":5,"ratingCount":1},
  "viewsSeries":[{"date":"2026-09-09","views":0}, "... 30 يوماً شاملاً اليوم بتوقيت السعودية"],
  "dealsByStatus":{"negotiating":1,"agreed":0,"awaiting_signatures":1,"awaiting_transfer":0,"awaiting_receipt":0,"completed":1,"cancelled":0,"disputed":0},
  "topProperty":{"id","title","cover","price","viewsCount","listingType","district"}|null,
  "actions":[{"dealId","action":"accept|sign|confirm_transfer|confirm_receipt|review","propertyTitle","other":{"id","name"}}],
  "leads":[{"conversationId","name":"سارة","property":{"id","title"},"lastMessage":"…"|null,"unread":1,"at":"…"}],   // حتى 6
  "recentDeals":[ عناصر مثل GET /api/deals ]   // حتى 5
}
```

## 10) المساعد Assistant — POST `/api/assistant` (optional auth)
`{message (1..500), lang:"ar"|"en", page?, history?:[{role:"user"|"assistant", text}]}` → `{reply, source:"gemini"|"faq"}`
بدون `GEMINI_API_KEY` (أو عند أي فشل/مهلة 12ث) يرجع إجابة جاهزة `source:"faq"`.

## 11) ملفات ثابتة
`/uploads/<uuid>.<jpg|png|webp>` الصور المرفوعة · `/img/seed/*.jpg` صور البيانات التجريبية (من public/) · في الإنتاج يُقدَّم `dist/` مع SPA fallback.
