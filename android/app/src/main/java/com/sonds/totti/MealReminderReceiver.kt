package com.sonds.totti

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import java.util.Calendar

internal class MealAlarmScheduler(private val context: Context) {
    private val database = PlanDatabase(context)

    fun scheduleAll() = database.getMeals().forEach(::scheduleNext)

    fun scheduleNext(meal: ScheduledMeal) {
        val (hour, minute) = meal.time.split(":").map(String::toInt)
        val at = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (!time.after(Calendar.getInstance().time)) add(Calendar.DAY_OF_YEAR, 1)
        }
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = pendingIntent(meal)
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at.timeInMillis, pendingIntent)
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at.timeInMillis, pendingIntent)
            }
        } catch (_: SecurityException) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at.timeInMillis, pendingIntent)
        }
    }

    fun cancelAll() = database.getMeals().forEach { meal ->
        val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarms.cancel(pendingIntent(meal))
    }

    private fun pendingIntent(meal: ScheduledMeal): PendingIntent {
        val intent = Intent(context, MealReminderReceiver::class.java).apply {
            action = "com.sonds.totti.MEAL_${meal.id}"
            putExtra(EXTRA_MEAL_ID, meal.id)
        }
        val requestCode = (meal.id.hashCode() and 0x7fffffff) % 100000 + 2000
        return PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    companion object {
        const val EXTRA_MEAL_ID = "meal_id"
        const val CHANNEL_ID = "meal_schedule_with_audio_v1"

        fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val soundUri = Uri.parse("android.resource://${context.packageName}/${R.raw.sondos_meal_reminder}")
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                val channel = android.app.NotificationChannel(
                    CHANNEL_ID, "تذكيرات مواعيد الوجبات", NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "تنبيهات محلية لمواعيد خطة التغذية بالصوت المرفق"
                    setSound(soundUri, audioAttributes)
                }
                manager.createNotificationChannel(channel)
            }
        }
    }
}

class MealReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val mealId = intent.getStringExtra(MealAlarmScheduler.EXTRA_MEAL_ID) ?: return
        val database = PlanDatabase(context)
        val meal = database.getMeals().firstOrNull { it.id == mealId } ?: return
        MealAlarmScheduler.ensureChannel(context)

        val notificationAllowed = Build.VERSION.SDK_INT < 33 ||
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        if (notificationAllowed) {
            val openApp = PendingIntent.getActivity(
                context, 0, Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val notification = Notification.Builder(context, MealAlarmScheduler.CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle("حان موعد ${meal.title}")
                .setContentText("تذكير لطيف من توتي — خطتك الصحية بانتظارك")
                .setStyle(Notification.BigTextStyle().bigText("تذكير لطيف من توتي — حان الآن موعد ${meal.title} ضمن خطتك الصحية."))
                .setAutoCancel(true)
                .setContentIntent(openApp)
                .setCategory(Notification.CATEGORY_REMINDER)
                .build()
            val notificationId = (meal.id.hashCode() and 0x7fffffff) % 100000 + 2000
            (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .notify(notificationId, notification)
        }
        MealAlarmScheduler(context).scheduleNext(meal)
    }
}

class SystemScheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == Intent.ACTION_TIME_CHANGED ||
            intent.action == Intent.ACTION_TIMEZONE_CHANGED ||
            intent.action == AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED) {
            MealAlarmScheduler.ensureChannel(context)
            MealAlarmScheduler(context).scheduleAll()
        }
    }
}
