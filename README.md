# MK Asmar — PUBG Marketplace

نسخة جاهزة للاستضافة على خدمات Node.js التي توفر PostgreSQL، ومهيأة أيضًا للعمل عبر Docker.

## المتطلبات
- Node.js 20+
- PostgreSQL
- متغيرات البيئة في `.env.example`

## التشغيل المحلي
1. أنشئ قاعدة PostgreSQL.
2. انسخ `.env.example` إلى `.env` وعدّل القيم.
3. نفّذ `npm install` ثم `npm start`.
4. افتح `http://localhost:3000`.

## لوحة المالك
- `/admin.html`
- اسم المستخدم الافتراضي: `admin`
- كلمة المرور الافتراضية: `MK2026`
- غيّر كلمة المرور عبر `ADMIN_PASSWORD` قبل النشر.

## نشر سريع
يمكن ربط المشروع بمستودع Git ثم إنشاء خدمة Node.js/Docker، وإنشاء PostgreSQL في نفس المشروع، ثم إضافة `DATABASE_URL` و`SESSION_SECRET` وباقي المتغيرات. المنصات مثل Northflank توثق نشر خدمة من مستودع Git وإنشاء PostgreSQL داخل المشروع.

> ملاحظة: تداول حسابات الألعاب قد يخضع لشروط PUBG أو المنصات الأخرى. استخدم الموقع بما يتوافق مع الشروط والقوانين المعمول بها.
