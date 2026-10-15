# Backend تطبيق سندس — Cloudflare Workers + Neon

هذا المجلد يضيف API مزامنة صغيرًا. واجهة React تواصل الحفظ محليًا ما لم يُضبط `VITE_NEON_API_URL` أثناء بناء OTA. لا يُضمَّن `NEON_DATABASE_URL` في React أو APK.

## حالة الخدمة المتصلة

العنوان `https://sonds.fszazo5.workers.dev/health` يجيب `{"ok":true,"databaseConfigured":true}`، وأكد المستخدم أن مشروع Neon وجداوله مربوطان. يبقى `NEON_DATABASE_URL` سرًا خاصًا على Worker/GitHub Actions؛ لا يُضمّن في React أو APK.

## الملفات

- `worker.mjs`: Cloudflare Worker، فيه `GET /health` و`POST /v1/sync` و`GET /v1/media` و`GET /v1/media/:id`، إضافة إلى `POST /v1/game-images` و`GET /v1/game-images/:id` لرفع صور الألعاب إلى Neon وخدمتها كرابط Cloudflare.
- `server.mjs`: بديل Node.js مستقل، غير لازم لنشر Cloudflare.
- `migrations/001_create_device_sync.sql`: migration قابل لإعادة التشغيل؛ ينشئ جدولًا جديدًا وفهرسًا ولا يعدّل جداول أخرى.
- `migrations/004_create_sonds_video_library.sql`: ينشئ جدول مكتبة الفيديوهات بصورة إضافية وآمنة.
- `migrations/005_create_sonds_game_images.sql`: ينشئ تخزين صور الألعاب خارج حالة JSON؛ حالة اللعبة تحفظ رابط Worker فقط.
- `video-manifest.json` و`../scripts/import-neon-videos.mjs`: فهرس ورفع تكراري آمن لفيديوهات المستودع إلى Neon.
- `sync-core.mjs`: تحقق مشترك من بيانات الأجهزة وحجم الخطة.
- `worker.test.mjs` و`sync-core.test.mjs`: اختبارات لا تحتاج إلى اتصال حقيقي بقاعدة Neon.
- `.github/workflows/cloudflare-worker.yml`: نشر يدوي بعد تحقق الأسرار وتشغيل الفحوص.
- `.github/workflows/neon-migrate.yml`: تشغيل يدوي لمهاجرات المخطط.
- `.github/workflows/upload-videos-neon.yml`: إجراء يدوي لتطبيق جدول الفيديوهات ورفع المقاطع الستة والتحقق منها.

تستخدم مسارات المزامنة والفيديو Neon driver عبر HTTP؛ ويطلب مشغل الفيديو أجزاءً صغيرة باستخدام `Range` بدل تنزيل كل ملف في كل مرة. رفع الملفات في GitHub Actions يستخدم PostgreSQL client عبر السر الموجود بالفعل. لم يُضف Hyperdrive أو حساب قاعدة بيانات جديد.

## إعداد GitHub Secrets

في المستودع `fszazo5-design/Sonds`، افتحي **Settings → Secrets and variables → Actions → New repository secret**، ثم أضيفي:

- `NEON_DATABASE_URL`: عنوان الاتصال لقاعدة Neon التي اخترتها، كـSecret لا كـVariable.
- `CLOUDFLARE_API_TOKEN`: Cloudflare API Token بصلاحية **Edit Cloudflare Workers** على الحساب المقصود.
- `CLOUDFLARE_ACCOUNT_ID`: معرّف حساب Cloudflare.

لا ترسلي هذه القيم في المحادثة. Worker لا يحتاج أن تضعي عنوان Neon في ملف Wrangler؛ الـworkflow ينقله كـCloudflare Worker secret باسم `NEON_DATABASE_URL` دون طباعته. عنوان الـAPI العام وحده يدخل لاحقًا في build الواجهة.

## رفع الفيديوهات ونشر API

استخدمي مشروع Neon المرتبط الذي أكّدتِه، واتركي `NEON_DATABASE_URL` في GitHub Actions Secret دون نسخه إلى ملفات الواجهة. بعد دمج التغييرات إلى `main`:

1. شغّلي **Actions → Upload Sundus videos to Neon → Run workflow**. ينشئ الإجراء جدول `public.sonds_video_library` إذا لم يكن موجودًا، ثم يرفع ملفات MP4 الستة ويحدّثها حسب المعرّف دون حذف السجلات الأخرى.
2. شغّلي **Actions → Deploy Sonds Cloudflare API → Run workflow** لنشر مسارات الفيديو الجديدة بعد تجهيز الجدول.
3. ينشر دمج الواجهة تلقائيًا حزمة **Publish Android UI OTA to GitHub Releases**؛ افتحي التطبيق بعد اكتمالها ليحمّل التحديث.

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
npm run media:test
npm run typecheck
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
