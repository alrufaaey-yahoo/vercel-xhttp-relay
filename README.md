# Vercel XHTTP Relay

ريلاي XHTTP خفيف مبني على Node.js ويعمل كـ **Vercel Serverless Function**. يمرر طلبات HTTP إلى خادمك الهدف مع تنظيف هيدرز البروكسي غير الضرورية.

## النشر على Vercel

1. استورد مستودع `vercel-xhttp-relay` إلى Vercel.
2. في **Project Settings → Environment Variables** أضف:

   | المتغير | الوصف | القيمة الافتراضية |
   |---|---|---|
   | `TARGET_DOMAIN` | عنوان الخادم الهدف، مثل `https://example.com:443` | `https://vps.thumbayan.com:443` |

3. نفّذ Deploy. كل الطلبات ستُمرر عبر الدالة.

يمكن أيضًا النشر من الطرفية بعد تثبيت Vercel CLI:

```bash
vercel --prod
```

## التشغيل المحلي

```bash
TARGET_DOMAIN=https://example.com npm start
```

ثم افتح `http://localhost:3000`.

## ملاحظات مهمة

- هذا المشروع يعمل كـ reverse proxy عام إلى العنوان الموجود في `TARGET_DOMAIN`؛ احرص على ضبطه وعدم كشفه لخوادم غير موثوقة.
- Vercel Serverless Functions ليست اتصالًا دائمًا، وقد تفرض المنصة حدًا زمنيًا على الطلبات الطويلة.
- يتم تمرير جسم الطلب عبر stream، وتُعاد استجابة الخادم الهدف مع إزالة هيدرز الاتصال الخاصة بالبروكسي.
- لا تضع الأسرار أو ملف `.env` في Git.

## هيكل المشروع

```text
vercel-xhttp-relay/
├── api/index.js   # نقطة دخول Vercel Serverless Function
├── relay.js       # منطق التوجيه المشترك
├── index.js       # مشغل محلي اختياري
├── vercel.json    # إعدادات Vercel والتوجيه
├── package.json
└── README.md
```
