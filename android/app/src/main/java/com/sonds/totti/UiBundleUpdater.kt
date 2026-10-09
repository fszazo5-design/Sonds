package com.sonds.totti

import android.content.Context
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicBoolean
import java.util.zip.ZipInputStream

internal data class UiBundleRefreshResult(val updated: Boolean, val error: String? = null)

internal class UiBundleUpdater(context: Context) {
    private val appContext = context.applicationContext
    private val installDirectory = File(appContext.filesDir, "ota-ui")
    private val stagingDirectory = File(appContext.filesDir, "ota-ui-staging")
    private val backupDirectory = File(appContext.filesDir, "ota-ui-backup")
    private val checking = AtomicBoolean(false)

    fun checkForUpdate(onComplete: (UiBundleRefreshResult) -> Unit) {
        if (!checking.compareAndSet(false, true)) {
            onComplete(UiBundleRefreshResult(updated = false, error = "يجري بالفعل التحقق من تحديث الواجهة"))
            return
        }
        Thread {
            val result = try {
                refreshBundle()
            } catch (error: Exception) {
                UiBundleRefreshResult(updated = false, error = error.message ?: "تعذّر تنزيل حزمة الواجهة")
            } finally {
                checking.set(false)
            }
            onComplete(result)
        }.start()
    }

    private fun refreshBundle(): UiBundleRefreshResult {
        val release = JSONObject(readText(RELEASE_API_URL, MAX_MANIFEST_BYTES))
        require(release.optString("tag_name") == UI_RELEASE_TAG) { "إصدار واجهة GitHub غير متاح" }
        val assets = release.optJSONArray("assets") ?: error("إصدار الواجهة لا يحتوي ملفات")
        var manifestUrl: String? = null
        var bundleUrl: String? = null
        for (index in 0 until assets.length()) {
            val asset = assets.optJSONObject(index) ?: continue
            when (asset.optString("name")) {
                UI_MANIFEST_NAME -> manifestUrl = asset.optString("browser_download_url")
                UI_BUNDLE_NAME -> bundleUrl = asset.optString("browser_download_url")
            }
        }
        val safeManifestUrl = trustedReleaseUrl(manifestUrl)
        val safeBundleUrl = trustedReleaseUrl(bundleUrl)
        val manifest = JSONObject(readText(safeManifestUrl, MAX_MANIFEST_BYTES))
        val version = manifest.optString("version").trim()
        val expectedSha256 = manifest.optString("sha256").trim().lowercase()
        require(version.matches(Regex("[a-fA-F0-9]{7,64}"))) { "رقم إصدار الواجهة غير صالح" }
        require(expectedSha256.matches(Regex("[a-f0-9]{64}"))) { "بصمة حزمة الواجهة غير صالحة" }

        val localVersionFile = File(installDirectory, VERSION_FILE_NAME)
        if (File(installDirectory, "index.html").isFile && localVersionFile.isFile &&
            localVersionFile.readText().trim() == version
        ) return UiBundleRefreshResult(updated = false)

        val archive = File(appContext.cacheDir, UI_BUNDLE_NAME)
        download(safeBundleUrl, archive, MAX_ARCHIVE_BYTES)
        require(sha256(archive) == expectedSha256) { "فشل التحقق من سلامة حزمة الواجهة" }
        installArchive(archive, version)
        archive.delete()
        return UiBundleRefreshResult(updated = true)
    }

    private fun installArchive(archive: File, version: String) {
        stagingDirectory.deleteRecursively()
        backupDirectory.deleteRecursively()
        require(stagingDirectory.mkdirs()) { "تعذّر تجهيز مساحة تثبيت الواجهة" }
        var totalBytes = 0L
        var entries = 0
        val rootPath = stagingDirectory.canonicalPath + File.separator
        ZipInputStream(BufferedInputStream(archive.inputStream())).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                entries += 1
                require(entries <= MAX_ARCHIVE_ENTRIES) { "حزمة الواجهة تحتوي ملفات كثيرة جدًا" }
                val output = File(stagingDirectory, entry.name)
                val outputPath = output.canonicalPath
                require(outputPath.startsWith(rootPath)) { "مسار غير آمن داخل حزمة الواجهة" }
                if (entry.isDirectory) {
                    require(output.isDirectory || output.mkdirs()) { "تعذّر إنشاء مجلد الواجهة" }
                } else {
                    output.parentFile?.let { require(it.isDirectory || it.mkdirs()) { "تعذّر إنشاء مجلد ملفات الواجهة" } }
                    FileOutputStream(output).use { file ->
                        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                        while (true) {
                            val count = zip.read(buffer)
                            if (count < 0) break
                            totalBytes += count
                            require(totalBytes <= MAX_UNCOMPRESSED_BYTES) { "حجم الواجهة بعد فك الضغط أكبر من المسموح" }
                            file.write(buffer, 0, count)
                        }
                    }
                }
                zip.closeEntry()
                entry = zip.nextEntry
            }
        }
        require(File(stagingDirectory, "index.html").isFile) { "حزمة GitHub لا تحتوي index.html" }
        File(stagingDirectory, VERSION_FILE_NAME).writeText(version)

        if (installDirectory.exists()) require(installDirectory.renameTo(backupDirectory)) { "تعذّر استبدال نسخة الواجهة السابقة" }
        if (!stagingDirectory.renameTo(installDirectory)) {
            if (backupDirectory.exists()) backupDirectory.renameTo(installDirectory)
            error("تعذّر اعتماد تحديث الواجهة")
        }
        backupDirectory.deleteRecursively()
    }

    private fun trustedReleaseUrl(value: String?): String {
        val url = value?.trim().orEmpty()
        require(url.startsWith(RELEASE_DOWNLOAD_PREFIX)) { "رابط تنزيل الواجهة ليس من GitHub Releases" }
        return url
    }

    private fun readText(address: String, maximumBytes: Int): String {
        val connection = openConnection(address)
        try {
            require(connection.responseCode in 200..299) { "تعذّر قراءة ملفات GitHub (HTTP ${connection.responseCode})" }
            val bytes = connection.inputStream.use { input ->
                val output = java.io.ByteArrayOutputStream()
                val buffer = ByteArray(8192)
                var total = 0
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    total += count
                    require(total <= maximumBytes) { "استجابة GitHub أكبر من الحد المسموح" }
                    output.write(buffer, 0, count)
                }
                output.toByteArray()
            }
            return bytes.toString(Charsets.UTF_8)
        } finally {
            connection.disconnect()
        }
    }

    private fun download(address: String, destination: File, maximumBytes: Long) {
        val connection = openConnection(address)
        try {
            require(connection.responseCode in 200..299) { "تعذّر تنزيل حزمة الواجهة (HTTP ${connection.responseCode})" }
            val advertisedSize = connection.contentLengthLong
            require(advertisedSize < 0 || advertisedSize <= maximumBytes) { "حزمة الواجهة أكبر من الحد المسموح" }
            var total = 0L
            connection.inputStream.use { input ->
                FileOutputStream(destination).use { output ->
                    val buffer = ByteArray(16 * 1024)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        total += count
                        require(total <= maximumBytes) { "حزمة الواجهة أكبر من الحد المسموح" }
                        output.write(buffer, 0, count)
                    }
                }
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun openConnection(address: String): HttpURLConnection =
        (URL(address).openConnection() as HttpURLConnection).apply {
            connectTimeout = CONNECT_TIMEOUT_MS
            readTimeout = READ_TIMEOUT_MS
            instanceFollowRedirects = true
            requestMethod = "GET"
            setRequestProperty("User-Agent", "Sonds-Android-UI-Updater")
            setRequestProperty("Accept", "application/vnd.github+json, application/octet-stream, */*")
            setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
        }

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(16 * 1024)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                digest.update(buffer, 0, count)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private companion object {
        const val REPOSITORY = "fszazo5-design/Sonds"
        const val UI_RELEASE_TAG = "ui-ota"
        const val RELEASE_API_URL = "https://api.github.com/repos/$REPOSITORY/releases/tags/$UI_RELEASE_TAG"
        const val RELEASE_DOWNLOAD_PREFIX = "https://github.com/$REPOSITORY/releases/download/$UI_RELEASE_TAG/"
        const val UI_MANIFEST_NAME = "Sonds-UI.json"
        const val UI_BUNDLE_NAME = "Sonds-UI.zip"
        const val VERSION_FILE_NAME = ".ui-version"
        const val CONNECT_TIMEOUT_MS = 20_000
        const val READ_TIMEOUT_MS = 45_000
        const val MAX_MANIFEST_BYTES = 128 * 1024
        const val MAX_ARCHIVE_BYTES = 100L * 1024 * 1024
        const val MAX_UNCOMPRESSED_BYTES = 100L * 1024 * 1024
        const val MAX_ARCHIVE_ENTRIES = 2_000
    }
}
