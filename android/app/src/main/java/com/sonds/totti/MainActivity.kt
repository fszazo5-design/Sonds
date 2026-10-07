package com.sonds.totti

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var database: PlanDatabase
    private lateinit var appUpdater: AppUpdater

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

        webView = WebView(this).apply {
            setBackgroundColor(android.graphics.Color.rgb(247, 248, 252))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = false
            settings.allowFileAccessFromFileURLs = false
            settings.allowUniversalAccessFromFileURLs = false
            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val url = request.url
                    return !(url.scheme == "file" && url.path.orEmpty().startsWith("/android_asset/www/"))
                }
            }
            addJavascriptInterface(AppBridge(), "AndroidBridge")
        }
        setContentView(webView)
        if (savedInstanceState == null) {
            webView.loadUrl("file:///android_asset/www/index.html")
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
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
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
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
