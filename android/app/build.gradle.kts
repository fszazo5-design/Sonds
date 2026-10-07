plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val useStableDebugSigning = providers.gradleProperty("useStableDebugSigning").orNull == "true"
val stableDebugKeystorePath = providers.gradleProperty("stableDebugKeystorePath").orNull

val prepareWebAssets by tasks.registering(Sync::class) {
    from(file("../../dist"))
    into(layout.buildDirectory.dir("generated/assets/www"))
}

android {
    namespace = "com.sonds.totti"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.sonds.totti"
        minSdk = 26
        targetSdk = 35
        versionCode = providers.gradleProperty("appVersionCode").orNull?.toIntOrNull() ?: 1
        versionName = providers.gradleProperty("appVersionName").orNull ?: "1.0.0"
    }

    signingConfigs {
        create("otaDebug") {
            if (useStableDebugSigning) {
                storeFile = file(requireNotNull(stableDebugKeystorePath))
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }

    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/assets"))

    buildTypes {
        getByName("debug") {
            if (useStableDebugSigning) signingConfig = signingConfigs.getByName("otaDebug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.webkit:webkit:1.17.0")
}

tasks.named("preBuild") { dependsOn(prepareWebAssets) }
