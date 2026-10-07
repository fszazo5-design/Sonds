plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

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
        versionCode = 1
        versionName = "1.0.0"
    }

    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/assets"))

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

tasks.named("preBuild") { dependsOn(prepareWebAssets) }
