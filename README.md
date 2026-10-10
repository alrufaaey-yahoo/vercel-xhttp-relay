# Vercel XHTTP Relay

ريلاي XHTTP خفيف يعمل كـ **Reverse Proxy** على Vercel، ويحوّل الطلبات إلى خادمك الهدف مع تمرير الأساليب والبيانات والهيدرز الضرورية.

## ما الذي تغير؟

تم نقل المشروع من خادم Node.js دائم مخصص لـ Replit إلى **TypeScript Serverless Function** متوافقة مع Vercel:

- نقطة الدخول: `api/[...path].ts`
- إعداد النشر: `vercel.json`
- لا يوجد خادم يستمع إلى منفذ محلي؛ Vercel يدير الدالة تلقائيًا.
- أزيلت ملفات `.replit` و`replit.nix` الخاصة بـ Replit.

## النشر على Vercel

### 1. إنشاء المشروع

ارفع هذا المستودع إلى GitHub ثم:

1. افتح [Vercel](https://vercel.com/new).
2. اختر مستودع GitHub.
3. اترك إعدادات Framework كما هي؛ المشروع يستخدم Vercel Functions مباشرة.
4. اضغط **Deploy**؛ عنوان الخادم الهدف مضمّن داخل `api/[...path].ts`:

| المتغير | الوصف | مثال |
|---|---|---|
| `TARGET_DOMAIN` | عنوان الخادم الهدف المضمّن داخل الكود | `https://vps.thumbayan.com:443` |

5. اضغط **Deploy**.

### 2. اختبار الريلاي

بعد النشر، يمرر الرابط العام الطلبات إلى الخادم الهدف. أمثلة:

```bash
curl https://YOUR-PROJECT.vercel.app/health
curl -X POST https://YOUR-PROJECT.vercel.app/api/login \
  -H 'content-type: application/json' \
  -d '{"username":"demo"}'
```

يستخدم إعداد Vercel إعادة كتابة تلقائية من المسارات العامة (باستثناء `/api`) إلى الدالة `api/[...path].ts`، لذلك لا تحتاج إلى إضافة `/api` عند استخدام الرابط العام. وإذا استدعيت الدالة مباشرة، فالمسار `/api/<path>` مدعوم أيضًا.

## التشغيل والتحقق محليًا

يتطلب Node.js 18 أو أحدث:

```bash
npm install
npm run typecheck
npx vercel dev
```

## ملاحظات مهمة

- عنوان `TARGET_DOMAIN` الحالي مضمّن داخل الكود بقيمة `https://vps.thumbayan.com:443`.
- لتغيير الخادم الهدف، عدّل الثابت `TARGET_DOMAIN` في `api/[...path].ts` ثم أعد النشر.
- يجب أن يكون الخادم الهدف متاحًا من شبكة Vercel وأن يقبل اتصالات HTTPS صحيحة.
- دوال Vercel ليست مناسبة للاتصالات طويلة العمر أو WebSocket؛ هذا المشروع يمرر طلبات HTTP قصيرة/محدودة بمهلة تصل إلى 55 ثانية للوجهة الهدف.
- استخدم هذا الريلاي فقط مع خادم تملكه أو لديك تصريح صريح بإدارته.
- لا تسجل الدالة محتوى الطلبات أو الاستجابات.

## البنية

```text
.
├── api/
│   └── [...path].ts   # دالة Vercel Serverless
├── .env.example       # مثال متغير البيئة
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```
