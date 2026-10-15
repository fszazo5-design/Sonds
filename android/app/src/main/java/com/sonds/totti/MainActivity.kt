package com.sonds.totti

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.media.MediaPlayer
import android.speech.tts.TextToSpeech
import java.util.Locale
import android.content.pm.PackageManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.File
import android.widget.Toast
import androidx.webkit.WebViewAssetLoader

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private lateinit var database: PlanDatabase
    private lateinit var appUpdater: AppUpdater
    private lateinit var uiBundleUpdater: UiBundleUpdater
    private var userRequestedOtaRefresh = false
    private var countdownPlayer: MediaPlayer? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var textToSpeech: TextToSpeech? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(247, 248, 252)
        window.navigationBarColor = android.graphics.Color.rgb(247, 248, 252)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            window.decorView.systemUiVisibility = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }

        database = PlanDatabase(this)
        MealAlarmScheduler.ensureChannel(this)
        GameEndNotification.ensureChannel(this)
        MealAlarmScheduler(this).scheduleAll()
        appUpdater = AppUpdater(this)
        appUpdater.registerReceiver()
        uiBundleUpdater = UiBundleUpdater(this)
        textToSpeech = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                textToSpeech?.language = Locale("ar", "SA")
                textToSpeech?.setSpeechRate(0.65f)
            }
        }

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/ota/", WebViewAssetLoader.InternalStoragePathHandler(this, File(filesDir, "ota-ui")))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(android.graphics.Color.rgb(247, 248, 252))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.allowFileAccessFromFileURLs = false
            settings.allowUniversalAccessFromFileURLs = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView?,
                    filePath: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = filePath
                    val chooserIntent = try {
                        fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = "image/*"
                        }
                    } catch (_: Exception) {
                        Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = "image/*"
                        }
                    }
                    return try {
                        startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST)
                        true
                    } catch (_: Exception) {
                        this@MainActivity.filePathCallback = null
                        filePath?.onReceiveValue(null)
                        false
                    }
                }
            }
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? {
                    return if (request.url.host == LOCAL_ASSET_HOST) {
                        assetLoader.shouldInterceptRequest(request.url)
                    } else {
                        null
                    }
                }

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val url = request.url
                    val isLocalAsset = url.scheme == "https" && url.host == LOCAL_ASSET_HOST
                    return !isLocalAsset
                }

                override fun onReceivedError(
                    view: WebView,
                    request: WebResourceRequest,
                    error: WebResourceError
                ) {
                    super.onReceivedError(view, request, error)
                    if (request.isForMainFrame && request.url.host == LOCAL_ASSET_HOST && request.url.path.orEmpty().startsWith("/ota/")) {
                        loadBundledUi()
                    }
                }

                override fun onReceivedHttpError(
                    view: WebView,
                    request: WebResourceRequest,
                    errorResponse: WebResourceResponse
                ) {
                    super.onReceivedHttpError(view, request, errorResponse)
                    if (request.isForMainFrame && request.url.host == LOCAL_ASSET_HOST &&
                        request.url.path.orEmpty().startsWith("/ota/") && errorResponse.statusCode >= 400
                    ) loadBundledUi()
                }

                override fun onPageFinished(view: WebView, url: String) {
                    view.settings.cacheMode = WebSettings.LOAD_DEFAULT
                    if (url.startsWith(OTA_UI_START_URL) && userRequestedOtaRefresh) {
                        userRequestedOtaRefresh = false
                        Toast.makeText(this@MainActivity, "تم تحميل واجهة GitHub على الجهاز", Toast.LENGTH_SHORT).show()
                    }
                    super.onPageFinished(view, url)
                }
            }
            addJavascriptInterface(AppBridge(), "AndroidBridge")
        }
        setContentView(webView)
        loadSavedUi()
        uiBundleUpdater.checkForUpdate { result ->
            runOnUiThread {
                if (isFinishing) return@runOnUiThread
                if (result.error == null && result.updated) {
                    loadSavedUi()
                    if (userRequestedOtaRefresh) {
                        userRequestedOtaRefresh = false
                        Toast.makeText(this, "تم تنزيل أحدث واجهة من GitHub Releases", Toast.LENGTH_SHORT).show()
                    }
                } else if (userRequestedOtaRefresh) {
                    userRequestedOtaRefresh = false
                    if (result.error == null) {
                        loadSavedUi()
                        Toast.makeText(this, "الواجهة محدّثة بالفعل من GitHub", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this, "تعذّر تحديث الواجهة من GitHub: ${result.error}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
        Handler(Looper.getMainLooper()).postDelayed({ requestStartupPermissions() }, 500)
    }

    @Deprecated("Deprecated in Android API; retained for broad device compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            val callback = filePathCallback
            filePathCallback = null
            if (callback != null) {
                val results = if (resultCode == RESULT_OK && data != null) {
                    val clipData = data.clipData
                    when {
                        clipData != null -> Array(clipData.itemCount) { index -> clipData.getItemAt(index).uri }
                        data.data != null -> arrayOf(data.data!!)
                        else -> null
                    }
                } else null
                callback.onReceiveValue(results)
            }
            return
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    override fun onResume() {
        super.onResume()
        if (::appUpdater.isInitialized) appUpdater.onResume()
    }

    override fun onDestroy() {
        countdownPlayer?.release()
        countdownPlayer = null
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null
        if (::appUpdater.isInitialized) appUpdater.unregisterReceiver()
        super.onDestroy()
    }

    @Deprecated("Deprecated in Android API; retained for broad device compatibility")
    override fun onBackPressed() {
        if (!::webView.isInitialized) {
            super.onBackPressed()
            return
        }
        webView.evaluateJavascript("window.__sondsHandleBack ? window.__sondsHandleBack() : false") { handled ->
            if (handled != "true") {
                if (webView.canGoBack()) webView.goBack() else super@MainActivity.onBackPressed()
            }
        }
    }

    private fun requestExactAlarmAccessOnStartup() = runOnUiThread {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = getSystemService(ALARM_SERVICE) as AlarmManager
            if (!alarmManager.canScheduleExactAlarms()) {
                try {
                    startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                        data = Uri.parse("package:$packageName")
                    })
                } catch (_: Exception) {
                    startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:$packageName")
                    })
                }
            }
        }
    }

    private fun requestStartupPermissions() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), STARTUP_PERMISSION_REQUEST)
        } else {
            requestExactAlarmAccessOnStartup()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == STARTUP_PERMISSION_REQUEST) {
            requestExactAlarmAccessOnStartup()
        }
    }

    private fun loadSavedUi() {
        webView.settings.cacheMode = WebSettings.LOAD_DEFAULT
        val installedUi = File(filesDir, "ota-ui/index.html")
        val startUrl = if (installedUi.isFile) "$OTA_UI_START_URL?ota=${System.currentTimeMillis()}" else APP_ASSET_START_URL
        webView.loadUrl(startUrl)
    }

    private fun loadBundledUi() = runOnUiThread {
        webView.loadUrl(APP_ASSET_START_URL)
    }

    private fun refreshGitHubUi() = runOnUiThread {
        userRequestedOtaRefresh = true
        Toast.makeText(this, "جارٍ التحقق من تحديث واجهة GitHub Releases…", Toast.LENGTH_SHORT).show()
        uiBundleUpdater.checkForUpdate { result ->
            runOnUiThread {
                if (isFinishing) return@runOnUiThread
                if (result.error == null) {
                    userRequestedOtaRefresh = false
                    loadSavedUi()
                    Toast.makeText(this, if (result.updated) "تم تنزيل أحدث واجهة من GitHub" else "الواجهة محدّثة بالفعل من GitHub", Toast.LENGTH_SHORT).show()
                } else {
                    userRequestedOtaRefresh = false
                    Toast.makeText(this, "تعذّر تحديث الواجهة من GitHub: ${result.error}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private companion object {
        const val STARTUP_PERMISSION_REQUEST = 300
        const val FILE_CHOOSER_REQUEST = 401
        const val LOCAL_ASSET_HOST = "appassets.androidplatform.net"
        const val APP_ASSET_START_URL = "https://appassets.androidplatform.net/assets/www/index.html"
        const val OTA_UI_START_URL = "https://appassets.androidplatform.net/ota/index.html"
    }

    inner class AppBridge {
        @JavascriptInterface
        fun playGameCountdownSound() = playGameSound(0.72f, R.raw.game_countdown_laufey)

        @JavascriptInterface
        fun playGameEndSound() = playGameSound(1.0f, R.raw.game_countdown_laufey)

        @JavascriptInterface
        fun notifyGameEnd(title: String, body: String) = runOnUiThread {
            GameEndNotification.notify(this@MainActivity, title, body)
        }

        @JavascriptInterface
        fun speakArabic(text: String) = runOnUiThread {
            if (text.length > 120_000) return@runOnUiThread
            textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "sonds-adhkar")
        }

        @JavascriptInterface
        fun stopSpeech() = runOnUiThread { textToSpeech?.stop() }

        private fun playGameSound(volume: Float, soundResource: Int) = runOnUiThread {
            countdownPlayer?.release()
            countdownPlayer = MediaPlayer.create(this@MainActivity, soundResource)?.apply {
                setVolume(volume, volume)
                setOnCompletionListener {
                    if (countdownPlayer === this) countdownPlayer = null
                    release()
                }
                start()
            }
        }

        @JavascriptInterface
        fun loadState(): String = database.loadState().orEmpty()

        @JavascriptInterface
        fun saveState(payload: String): String = try {
            require(payload.length <= 1_000_000) { "البيانات أكبر من الحد المسموح" }
            database.saveState(payload)
            "ok"
        } catch (error: Exception) {
            "error:${error.message.orEmpty()}"
        }

        @JavascriptInterface
        fun saveSchedule(json: String): String = try {
            val meals = org.json.JSONArray(json)
            database.saveMeals(meals)
            MealAlarmScheduler(this@MainActivity).scheduleAll()
            "ok"
        } catch (error: Exception) {
            "error:${error.message.orEmpty()}"
        }

        @JavascriptInterface
        fun refreshWebApp() = refreshGitHubUi()

        @JavascriptInterface
        fun checkForAppUpdate() = appUpdater.checkForUpdate()

        @JavascriptInterface
        fun requestNotificationPermission() = runOnUiThread {
            if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 301)
            else Toast.makeText(this@MainActivity, "تذكيرات الوجبات جاهزة", Toast.LENGTH_SHORT).show()
        }

        @JavascriptInterface
        fun requestCameraPermission() = requestMediaPermission(Manifest.permission.CAMERA, 302)

        @JavascriptInterface
        fun requestMicrophonePermission() = requestMediaPermission(Manifest.permission.RECORD_AUDIO, 303)

        @JavascriptInterface
        fun requestExactAlarmAccess() = requestExactAlarmAccessOnStartup()

        private fun requestMediaPermission(permission: String, requestCode: Int) = runOnUiThread {
            if (checkSelfPermission(permission) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this@MainActivity, "الإذن مفعّل بالفعل", Toast.LENGTH_SHORT).show()
            } else {
                requestPermissions(arrayOf(permission), requestCode)
            }
        }
    }
}

private object GameEndNotification {
    private const val CHANNEL_ID = "game_end_with_audio_v3"
    private const val NOTIFICATION_ID = 4101
    private val mainHandler = Handler(Looper.getMainLooper())
    private var endSoundSequence = 0

    fun ensureChannel(context: android.content.Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val channel = android.app.NotificationChannel(
            CHANNEL_ID, "انتهاء جولة اللعب", NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "إشعار عند انتهاء الجولة؛ يستخدم نفس نغمة بدء الجولة"
            setSound(null, null)
            enableVibration(true)
        }
        manager.createNotificationChannel(channel)
    }

    fun notify(context: android.content.Context, title: String, body: String) {
        ensureChannel(context)
        playEndCountdown(context)
        val notificationsAllowed = Build.VERSION.SDK_INT < 33 ||
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        if (!notificationsAllowed) {
            return
        }
        val openApp = PendingIntent.getActivity(
            context, NOTIFICATION_ID, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(context, CHANNEL_ID)
        } else {
            Notification.Builder(context)
        }
        val notification = builder
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle(title.take(120))
            .setContentText(body.take(240))
            .setAutoCancel(true)
            .setContentIntent(openApp)
            .setCategory(Notification.CATEGORY_EVENT)
            .setOnlyAlertOnce(false)
            .build()
        context.getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification)
    }

    private fun playAndroidGameSound(context: android.content.Context) {
        // نفس الملف الذي يعمل عند بدء الجولة، لضمان نفس الصوت ومدته على Android.
        MediaPlayer.create(context, R.raw.game_countdown_laufey)?.apply {
            setVolume(1.0f, 1.0f)
            setOnCompletionListener { it.release() }
            start()
        }
    }

    private fun playEndCountdown(context: android.content.Context) {
        val sequence = ++endSoundSequence
        for (beep in 0 until 5) {
            mainHandler.postDelayed({
                if (sequence == endSoundSequence) playAndroidGameSound(context)
            }, beep * 1_000L)
        }
    }
}
