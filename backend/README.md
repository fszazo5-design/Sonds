# Sonds API مع Neon

يضيف هذا المجلد واجهة HTTP مستقلة لمزامنة خطة التطبيق مع PostgreSQL في Neon. الواجهة اختيارية: إذا لم يُضبط `VITE_NEON_API_URL` في بناء React، يستمر التطبيق في حفظ بياناته محليًا بالطريقة الحالية ولا يرسل طلبات إلى الإنترنت.

## الملفات والواجهة

- `server.mjs`: خادم Node.js مع `GET /health` و`POST /v1/sync`.
- `migrations/001_create_device_sync.sql`: migration آمن وقابل لإعادة التشغيل؛ ينشئ جدولًا وفهرسًا جديدين ولا يغيّر جداول أخرى.
- `sync-core.mjs`: التحقق من مفاتيح التثبيت وحجم البيانات والحقول السرية.
- `sync-core.test.mjs`: اختبارات وحدات لا تحتاج إلى حساب Neon أو أي أسرار.

يدعم `POST /v1/sync` إجراءي `pull` و`push`. يستخدم التطبيق معرّفًا عشوائيًا لكل تثبيت ومفتاحًا عشوائيًا محليًا بطول 256 بت. يُحفظ المفتاح في SQLite/localStorage على الجهاز؛ يرسل التطبيق المفتاح إلى الـAPI عبر HTTPS، لكن قاعدة البيانات تحفظ بصمة SHA-256 فقط. لا توجد حسابات دخول أو مزامنة بين أجهزة مختلفة في هذا الإصدار.

## تشغيل الاختبارات والخادم محليًا

المشروع يتطلب Node.js 22، وهو إصدار CI المستخدم لبناء واجهة OTA.

```bash
npm ci
npm run backend:test
npm run backend:check
```

للتشغيل المحلي، انسخي `backend/.env.example` إلى `backend/.env` وضعي عنوان Neon في ذلك الملف المحلي غير المتعقّب، ثم:

```bash
node --env-file=backend/.env backend/server.mjs
```

اختبري حالة الخدمة عبر `GET http://localhost:8787/health`. لا يطبّق الخادم migration تلقائيًا؛ يجب إنشاء الجدول أولًا.

## إعداد GitHub Secret وتشغيل migration يدويًا

1. في GitHub افتحي مستودع `fszazo5-design/Sonds` ثم **Settings → Secrets and variables → Actions → New repository secret**.
2. أنشئي Secret باسم `NEON_DATABASE_URL`، وضعي فيه connection string لقاعدة Neon. لا ترسليه في المحادثة، ولا تضعيه في ملف داخل Git أو في متغير يبدأ بـ`VITE_`.
3. افتحي **Actions → Apply Neon migration → Run workflow** لتشغيل الملف `migrations/001_create_device_sync.sql` مرة واحدة. الـworkflow يدوي فقط ولا يعمل تلقائيًا مع كل دفع.

المهاجرات لا تُطبّق في هذه الجلسة؛ أضيفي السر أولًا ثم شغّليها من GitHub عندما تكونين جاهزة. الملف `CREATE TABLE IF NOT EXISTS` قابل لإعادة التشغيل.

## الاستضافة عند اختيارها لاحقًا

يحتاج هذا الكود إلى مضيف Node.js يشغّل `node backend/server.mjs` ويتيح اتصال HTTPS صادرًا إلى Neon. لم يُنشأ مضيف أو عنوان API ضمن هذا التغيير.

على المضيف المختار، عيّني `NEON_DATABASE_URL` كسرّ **وقت التشغيل**، وعيّني `ALLOWED_ORIGINS` إذا تغيّر أصل التطبيق. لا يكفي تخزين السر في GitHub Actions وحده كي يراه خادم التشغيل.

بعد معرفة عنوان الخدمة، أضيفي متغير مستودع عادي (ليس Secret) باسم `VITE_NEON_API_URL` إلى **Settings → Secrets and variables → Actions → Variables**، وقيمته أصل الـAPI فقط مثل `https://api.example.com`. عنوان API عام بطبيعته؛ بيانات الاتصال بقاعدة Neon ليست كذلك. أعيدي بعدها تشغيل Workflow **Publish Android UI OTA to GitHub Releases** من `Actions` حتى تُبنى الواجهة مع هذا العنوان.

يُسمح CORS افتراضيًا لأصل Android `https://appassets.androidplatform.net`، وGitHub Pages للمستودع، وVite على `localhost:5173`. إذا استُخدم أصل مختلف، مرّري القائمة الدقيقة مفصولة بفواصل في `ALLOWED_ORIGINS` على المضيف. لا تضيفي `*`.

## الخصوصية والحدود

يبقى التخزين المحلي هو النسخة العاملة دون اتصال. عند تهيئة عنوان الـAPI، يدفع التطبيق الخطة الحالية إلى Neon بعد التغييرات، ويحاول جلب نسخة أحدث عند بدء التشغيل. تشمل الخطة سجل الوجبات والماء والوزن الاختياري والمكافآت والألعاب؛ تُستثنى مفاتيح المزامنة المحلية وتوقيتها من بيانات JSON المرسلة إلى Neon.

مفتاح التثبيت ليس حسابًا ولا وسيلة لاستعادة البيانات بعد حذف بيانات التطبيق أو الانتقال إلى جهاز آخر؛ يلزم في هذه الحالة إصدار لاحق يتيح نقل/استعادة بيانات الاعتماد أو إضافة تسجيل دخول. حاليًا يُحفظ سجل الخطة في JSONB دون تشفير على مستوى التطبيق؛ استخدمي اتصال HTTPS، واحفظي مفتاح Neon لدى الخادم فقط.

## مصادر Neon الرسمية

- [دليل Neon للاتصال من Node.js](https://neon.com/docs/guides/node)
- [مرجع Neon Serverless Driver](https://neon.com/docs/serverless/serverless-driver)
