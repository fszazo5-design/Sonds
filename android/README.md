# تطبيق سندس دي أنا لنظام Android

تعمل واجهة React داخل WebView باستخدام ملفات محلية. يضمّن APK واجهة احتياطية، كما ينزّل التطبيق حزمة OTA الأحدث من GitHub Releases إلى مساحة التطبيق الخاصة ويثبتها بعد التحقق من بصمة SHA-256. تُحفظ الخطة اليومية ومواعيد الوجبات في قاعدة SQLite خاصة بالتطبيق (`sonds_private.db`). لا يعتمد مسار OTA على GitHub Pages ولا على روابط `raw.githubusercontent.com`.

## البناء المحلي

من جذر المستودع:

```bash
npm ci
npm run build
cd android
./gradlew assembleDebug
```

ينتج APK التجربة في `android/app/build/outputs/apk/debug/app-debug.apk`. يبني Vite الواجهة بمسارات نسبية لتعمل من حزمة OTA أو من النسخة المضمّنة في APK. يتطلب البناء Android SDK API 35 وJDK 17+.

## التحديث الهوائي لواجهة React

ينشر `.github/workflows/ui-ota.yml` حزمتي `Sonds-UI.zip` و`Sonds-UI.json` إلى إصدار GitHub Release ذي الوسم الثابت `ui-ota` عند الدفع إلى `main`. يتضمن الملف التعريفي رقم commit وبصمة SHA-256. يفحص التطبيق الإصدار عند التشغيل، وينزّل الحزمة عند توفر تغيير، ويتحقق منها قبل فك الضغط؛ ويحافظ على النسخة السابقة إذا فشل التحديث.

زر التحديث أعلى التطبيق يفحص GitHub Releases مباشرة. إذا انقطع الإنترنت يستمر آخر إصدار OTA محلي، وإذا لم يكن مثبتًا أو تعذّر فتحه، يستخدم التطبيق واجهة React المضمّنة في APK. تعديلات React وCSS لا تحتاج APK بعد تثبيت النسخة الأصلية الداعمة لـOTA من GitHub Releases. يلزم تثبيت APK جديد مرة واحدة للانتقال من النسخة الأصلية القديمة التي كانت تفتح GitHub Pages؛ بعد ذلك تُنزّل الواجهة من GitHub Releases دون تحديث APK.

## تحديث APK الأصلي

ينشئ `.github/workflows/android-apk.yml` ملف APK عند دفع tag يبدأ بـ `v` أو عند تشغيل workflow يدويًا. من «إعدادات الأذونات» اختر «تحديث نظام Android (APK)» لتنزيل `Sonds.apk` من أحدث GitHub Release ثم وافق على التثبيت في Android. قد يلزم السماح مرة واحدة بالتثبيت من هذا المصدر؛ لا يدعم Android التثبيت الصامت خارج Google Play.

يتطلب إصدار APK الموقّع secret باسم `ANDROID_DEBUG_KEYSTORE_BASE64` في إعدادات GitHub Actions. يجب أن يطابق مفتاح التوقيع شهادة النسخة الحالية كي يُثبّت التحديث ويحافظ على بيانات التطبيق؛ لا تغيّر المفتاح ما لم تختر الانتقال المتعمد إلى مفتاح توقيع جديد.
