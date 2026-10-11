# Backend تطبيق سندس — Cloudflare Workers + Neon

هذا المجلد يضيف API مزامنة صغيرًا. واجهة React تواصل الحفظ محليًا ما لم يُضبط `VITE_NEON_API_URL` أثناء بناء OTA. لا يُضمَّن `NEON_DATABASE_URL` في React أو APK.

## ما وجدته في حساب Cloudflare الحالي

يوجد Worker باسم `sonds`، لكن مصدره المنشور هو قالب لوحة Cloudflare الافتراضي الذي يعيد `Hello world`. إعداداته لا تحتوي أي secret أو binding. كما أن `workers.dev` غير مفعّل للعامل نفسه، رغم أن النطاق الفرعي للحساب هو `fszazo5`.

الملف `../wrangler.toml` يجهّز الاسم نفسه `sonds`، ويحدد `workers_dev = true`، فيُفترض أن يظهر بعد النشر العنوان العام `https://sonds.fszazo5.workers.dev`. لم أستبدل العامل المنشور؛ يحتاج النشر إلى الأسرار المحددة أدناه.

## الملفات

- `worker.mjs`: Cloudflare Worker، فيه `GET /health` و`POST /v1/sync`، ويتصل بـNeon باستخدام `@neondatabase/serverless`.
- `server.mjs`: بديل Node.js مستقل، غير لازم لنشر Cloudflare.
- `migrations/001_create_device_sync.sql`: migration قابل لإعادة التشغيل؛ ينشئ جدولًا جديدًا وفهرسًا ولا يعدّل جداول أخرى.
- `sync-core.mjs`: تحقق مشترك من بيانات الأجهزة وحجم الخطة.
- `worker.test.mjs` و`sync-core.test.mjs`: اختبارات لا تحتاج إلى اتصال حقيقي بقاعدة Neon.
- `.github/workflows/cloudflare-worker.yml`: نشر يدوي بعد تحقق الأسرار وتشغيل الفحوص.
- `.github/workflows/neon-migrate.yml`: تشغيل يدوي منفصل للـmigration.

الاتصال يستخدم Neon driver عبر HTTP، المناسب لطلبات المزامنة الخفيفة عديمة الحالة. Cloudflare/Neon يوثّقان أيضًا Hyperdrive كخيار pooling للاتصالات ذات الحجم الأكبر؛ لم أُنشئ Hyperdrive أو مستخدم قاعدة بيانات لأن ذلك يحتاج اختيار مشروع Neon وصلاحياته أولًا.

## إعداد GitHub Secrets

في المستودع `fszazo5-design/Sonds`، افتحي **Settings → Secrets and variables → Actions → New repository secret**، ثم أضيفي:

- `NEON_DATABASE_URL`: عنوان الاتصال لقاعدة Neon التي اخترتها، كـSecret لا كـVariable.
- `CLOUDFLARE_API_TOKEN`: Cloudflare API Token بصلاحية **Edit Cloudflare Workers** على الحساب المقصود.
- `CLOUDFLARE_ACCOUNT_ID`: معرّف حساب Cloudflare.

لا ترسلي هذه القيم في المحادثة. Worker لا يحتاج أن تضعي عنوان Neon في ملف Wrangler؛ الـworkflow ينقله كـCloudflare Worker secret باسم `NEON_DATABASE_URL` دون طباعته. عنوان الـAPI العام وحده يدخل لاحقًا في build الواجهة.

## اختيار مشروع Neon قبل الـmigration

لم يظهر مشروع Neon باسم `Sonds` أو `sundus`. المشروع الذي يظهر باسم `zazo` يحتوي حاليًا جداول `neon_auth` وجدولًا عامًا باسم `portfolio_content`؛ لم أستخدمه ولم أشغّل عليه migration. اختاري المشروع/الفرع الذي تريدينه من Neon، وخذي connection string لذلك الاختيار، ثم خزّنيه باسم `NEON_DATABASE_URL` في GitHub Secrets. لا تنفّذي الترحيل قبل التأكد من المشروع والفرع المقصودين.

بعد حفظ السر، شغّلي **Actions → Apply Neon migration → Run workflow**. ثم شغّلي **Actions → Deploy Sonds Cloudflare API → Run workflow**. نشر الـWorker Workflow يدوي ولا يُطلق مع كل commit، لتجنب نشر API قبل تجهيز Neon.

## تفعيل المزامنة في الواجهة بعد نجاح Worker

بعد انتهاء نشر Cloudflare وفحص `https://sonds.fszazo5.workers.dev/health`، أضيفي في **Settings → Secrets and variables → Actions → Variables** متغيرًا عاديًا اسمه `VITE_NEON_API_URL` وقيمته:

```text
https://sonds.fszazo5.workers.dev
```

هذا العنوان عام وليس سرًا. بعد ذلك أعيدي تشغيل **Actions → Publish Android UI OTA to GitHub Releases** حتى تحمل الواجهة عنوان الخدمة وتبدأ المزامنة. إلى ذلك الحين تستمر البيانات محليًا على الجهاز.

## تشغيل محلي وفحوص

```bash
npm ci
npm run backend:test
npm run worker:test
npm run worker:check
```

للتشغيل عبر Wrangler تحتاج `.dev.vars` محليًا، وهو مستثنى من Git. لا تحفظي connection string في ملفات متعقّبة. للاختبار دون قاعدة Neon:

```bash
npx wrangler dev --config wrangler.toml
```

اختبري `GET /health`؛ ستظهر `databaseConfigured: false` ما لم تُضفّي secret محليًا أو على Cloudflare.

## الخصوصية والحدود

يستخدم كل تثبيت معرّفًا عشوائيًا ومفتاحًا محليًا بطول 256 بت. يرسل التطبيق المفتاح عبر HTTPS، لكن قاعدة Neon تحتفظ ببصمة SHA-256 فقط. بيانات الخطة تُحفظ في JSONB؛ وتشمل الوجبات والماء والوزن الاختياري والإنجازات والألعاب. لا يوجد تسجيل دخول أو نقل تلقائي بين الأجهزة في هذا الإصدار.

## مراجع المزودين

- [دليل Neon لاستخدامه مع Cloudflare Workers](https://neon.com/docs/guides/cloudflare-workers)
- [توثيق Cloudflare لتكامل Neon](https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/)
- [تفعيل مسارات workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [النشر باستخدام GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
