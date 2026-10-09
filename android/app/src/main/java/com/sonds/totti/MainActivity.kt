package com.sonds.totti

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.content.pm.PackageManager
import android.provider.Settings
import android.webkit.JavascriptInterface
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(247, 248, 252)
        window.navigationBarColor = android.graphics.Color.rgb(247, 248, 252)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            window.decorView.systemUiVisibility = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }

        database = PlanDatabase(this)
        MealAlarmScheduler.ensureChannel(this)
        MealAlarmScheduler(this).scheduleAll()
        appUpdater = AppUpdater(this)
        appUpdater.registerReceiver()
        uiBundleUpdater = UiBundleUpdater(this)

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
            webChromeClient = WebChromeClient()
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

    override fun onResume() {
        super.onResume()
        if (::appUpdater.isInitialized) appUpdater.onResume()
    }

    override fun onDestroy() {
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

    private fun requestStartupPermissions() {
        val permissions = buildList {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                add(Manifest.permission.POST_NOTIFICATIONS)
            }
            if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) add(Manifest.permission.CAMERA)
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) add(Manifest.permission.RECORD_AUDIO)
        }
        if (permissions.isNotEmpty()) requestPermissions(permissions.toTypedArray(), STARTUP_PERMISSION_REQUEST)
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
        const val LOCAL_ASSET_HOST = "appassets.androidplatform.net"
        const val APP_ASSET_START_URL = "https://appassets.androidplatform.net/assets/www/index.html"
        const val OTA_UI_START_URL = "https://appassets.androidplatform.net/ota/index.html"
    }

    inner class AppBridge {
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
        fun requestExactAlarmAccess() = runOnUiThread {
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
                } else {
                    Toast.makeText(this@MainActivity, "دقة مواعيد التنبيه مفعّلة", Toast.LENGTH_SHORT).show()
                }
            }
        }

        private fun requestMediaPermission(permission: String, requestCode: Int) = runOnUiThread {
            if (checkSelfPermission(permission) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this@MainActivity, "الإذن مفعّل بالفعل", Toast.LENGTH_SHORT).show()
            } else {
                requestPermissions(arrayOf(permission), requestCode)
            }
        }
    }
}
