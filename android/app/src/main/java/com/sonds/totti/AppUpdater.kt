package com.sonds.totti

import android.app.AlertDialog
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.widget.Toast
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

internal class AppUpdater(private val activity: MainActivity) {
    private val downloads = activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    private val preferences = activity.getSharedPreferences("app_updates", Context.MODE_PRIVATE)
    private val checking = AtomicBoolean(false)
    private var receiverRegistered = false

    private val downloadReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
            val pendingId = preferences.getLong(KEY_DOWNLOAD_ID, -1L)
            if (completedId == pendingId && activity.hasWindowFocus()) handleCompletedDownload(completedId)
        }
    }

    fun registerReceiver() {
        if (receiverRegistered) return
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            activity.registerReceiver(downloadReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            activity.registerReceiver(downloadReceiver, filter)
        }
        receiverRegistered = true
    }

    fun unregisterReceiver() {
        if (receiverRegistered) {
            activity.unregisterReceiver(downloadReceiver)
            receiverRegistered = false
        }
    }

    fun onResume() {
        val pendingId = preferences.getLong(KEY_DOWNLOAD_ID, -1L)
        if (pendingId > 0) handleCompletedDownload(pendingId)
    }

    fun checkForUpdate() {
        if (!checking.compareAndSet(false, true)) return
        activity.runOnUiThread {
            Toast.makeText(activity, "جارٍ البحث عن إصدار جديد على GitHub…", Toast.LENGTH_SHORT).show()
        }
        Thread {
            try {
                val connection = (URL(LATEST_RELEASE_API).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 15_000
                    readTimeout = 15_000
                    requestMethod = "GET"
                    setRequestProperty("Accept", "application/vnd.github+json")
                    setRequestProperty("User-Agent", "Sonds-Android-Updater")
                    setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
                }
                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_NOT_FOUND) {
                    showMessage("لا توجد إصدارات منشورة بعد", "عند نشر إصدار APK في GitHub Releases سيظهر هنا.")
                    connection.disconnect()
                    return@Thread
                }
                if (responseCode !in 200..299) error("GitHub أعاد رمز HTTP $responseCode")
                val release = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
                connection.disconnect()

                val tag = release.optString("tag_name").trim()
                val assets = release.optJSONArray("assets") ?: error("الإصدار لا يحتوي ملفات تنزيل")
                var apkUrl: String? = null
                for (index in 0 until assets.length()) {
                    val asset = assets.optJSONObject(index) ?: continue
                    if (asset.optString("name") == APK_ASSET_NAME) {
                        apkUrl = asset.optString("browser_download_url")
                        break
                    }
                }
                val safeUrl = apkUrl?.takeIf {
                    it.startsWith("https://github.com/$REPOSITORY/releases/download/")
                } ?: error("لم يُعثر على ملف $APK_ASSET_NAME في الإصدار")

                val installedVersion = installedVersionName()
                if (!isNewer(tag, installedVersion)) {
                    showMessage("التطبيق محدّث", "الإصدار المثبّت $installedVersion هو الأحدث ($tag).")
                } else {
                    showUpdatePrompt(tag, safeUrl)
                }
            } catch (error: Exception) {
                showMessage("تعذّر فحص التحديث", "تحقق من اتصال الإنترنت وحاول مجددًا. ${error.message.orEmpty()}")
            } finally {
                checking.set(false)
            }
        }.start()
    }

    private fun showUpdatePrompt(version: String, apkUrl: String) = activity.runOnUiThread {
        if (activity.isFinishing) return@runOnUiThread
        AlertDialog.Builder(activity)
            .setTitle("يتوفر تحديث لسندس دي أنا")
            .setMessage("الإصدار $version متاح. هل تريد تنزيل ملف التحديث وتثبيته؟")
            .setNegativeButton("لاحقًا", null)
            .setPositiveButton("تنزيل التحديث") { _, _ -> beginDownload(version, apkUrl) }
            .show()
    }

    private fun beginDownload(version: String, apkUrl: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !activity.packageManager.canRequestPackageInstalls()) {
            AlertDialog.Builder(activity)
                .setTitle("السماح بتثبيت التحديث")
                .setMessage("اسمح لتطبيق سندس دي أنا بتثبيت التحديث من هذا المصدر في إعدادات Android، ثم عُد واضغط «فحص تحديث التطبيق» مرة أخرى.")
                .setNegativeButton("إلغاء", null)
                .setPositiveButton("فتح الإعدادات") { _, _ ->
                    activity.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:${activity.packageName}")
                    })
                }
                .show()
            return
        }

        try {
            val request = DownloadManager.Request(Uri.parse(apkUrl))
                .setTitle("تحديث سندس دي أنا $version")
                .setDescription("تنزيل APK الرسمي من GitHub Releases")
                .setMimeType(APK_MIME_TYPE)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setAllowedOverMetered(true)
                .setAllowedOverRoaming(false)
                .setDestinationInExternalFilesDir(
                    activity, Environment.DIRECTORY_DOWNLOADS, "Sonds-$version.apk"
                )
            val id = downloads.enqueue(request)
            preferences.edit().putLong(KEY_DOWNLOAD_ID, id).apply()
            Toast.makeText(activity, "بدأ تنزيل التحديث. سيظهر طلب التثبيت عند اكتماله.", Toast.LENGTH_LONG).show()
        } catch (error: Exception) {
            showMessage("تعذّر بدء التنزيل", error.message.orEmpty())
        }
    }

    private fun handleCompletedDownload(downloadId: Long) {
        if (!activity.hasWindowFocus()) return
        val cursor = downloads.query(DownloadManager.Query().setFilterById(downloadId)) ?: return
        val status: Int
        val reason: Int
        cursor.use {
            if (!it.moveToFirst()) return
            status = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            reason = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
        }
        when (status) {
            DownloadManager.STATUS_SUCCESSFUL -> {
                val apkUri = downloads.getUriForDownloadedFile(downloadId)
                if (apkUri == null) {
                    showMessage("تعذّر فتح ملف التحديث", "أعد فحص التحديث وحاول تنزيله مرة أخرى.")
                    preferences.edit().remove(KEY_DOWNLOAD_ID).apply()
                    return
                }
                try {
                    val installIntent = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(apkUri, APK_MIME_TYPE)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    activity.startActivity(installIntent)
                    preferences.edit().remove(KEY_DOWNLOAD_ID).apply()
                } catch (error: Exception) {
                    showMessage("تعذّر فتح مُثبّت Android", error.message.orEmpty())
                }
            }
            DownloadManager.STATUS_FAILED -> {
                preferences.edit().remove(KEY_DOWNLOAD_ID).apply()
                showMessage("فشل تنزيل التحديث", "رمز الخطأ: $reason. تحقق من الإنترنت وحاول مجددًا.")
            }
        }
    }

    private fun showMessage(title: String, message: String) = activity.runOnUiThread {
        if (!activity.isFinishing) AlertDialog.Builder(activity)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("حسنًا", null)
            .show()
    }

    private fun isNewer(candidate: String, current: String): Boolean {
        fun parts(value: String): List<Long> = value.trim().removePrefix("v").removePrefix("V")
            .substringBefore('-').split('.').map { it.toLongOrNull() ?: 0L }
        val left = parts(candidate)
        val right = parts(current)
        for (index in 0 until maxOf(left.size, right.size)) {
            val a = left.getOrElse(index) { 0L }
            val b = right.getOrElse(index) { 0L }
            if (a != b) return a > b
        }
        return false
    }

    @Suppress("DEPRECATION")
    private fun installedVersionName(): String =
        activity.packageManager.getPackageInfo(activity.packageName, 0).versionName ?: "1.0.0"

    companion object {
        private const val REPOSITORY = "fszazo5-design/Sonds"
        private const val LATEST_RELEASE_API = "https://api.github.com/repos/$REPOSITORY/releases/latest"
        private const val APK_ASSET_NAME = "Sonds.apk"
        private const val APK_MIME_TYPE = "application/vnd.android.package-archive"
        private const val KEY_DOWNLOAD_ID = "pending_download_id"
    }
}
