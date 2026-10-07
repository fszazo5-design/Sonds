package com.sonds.totti

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray

internal data class ScheduledMeal(val id: String, val title: String, val time: String)

internal class PlanDatabase(context: Context) : SQLiteOpenHelper(context, "sonds_private.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE app_state (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL)")
        db.execSQL("CREATE TABLE meal_schedule (id TEXT PRIMARY KEY, title TEXT NOT NULL, time TEXT NOT NULL)")
        val defaults = listOf(
            ScheduledMeal("breakfast", "الفطار", "08:00"),
            ScheduledMeal("snack-1", "سناك 1", "11:00"),
            ScheduledMeal("lunch", "الغداء", "14:30"),
            ScheduledMeal("snack-2", "سناك 2", "17:30"),
            ScheduledMeal("dinner", "العشاء", "20:00")
        )
        defaults.forEach { meal ->
            val values = ContentValues().apply {
                put("id", meal.id); put("title", meal.title); put("time", meal.time)
            }
            db.insert("meal_schedule", null, values)
        }
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    fun loadState(): String? = readableDatabase.rawQuery("SELECT payload FROM app_state WHERE id = 1", null).use { cursor ->
        if (cursor.moveToFirst()) cursor.getString(0) else null
    }

    fun saveState(payload: String) {
        val values = ContentValues().apply { put("id", 1); put("payload", payload) }
        writableDatabase.insertWithOnConflict("app_state", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getMeals(): List<ScheduledMeal> = readableDatabase.rawQuery(
        "SELECT id, title, time FROM meal_schedule ORDER BY rowid", null
    ).use { cursor ->
        buildList {
            while (cursor.moveToNext()) add(ScheduledMeal(cursor.getString(0), cursor.getString(1), cursor.getString(2)))
        }
    }

    fun saveMeals(meals: JSONArray) {
        val parsed = mutableListOf<ScheduledMeal>()
        for (index in 0 until meals.length()) {
            val item = meals.optJSONObject(index) ?: continue
            val id = item.optString("id").trim()
            val title = item.optString("title").trim()
            val time = item.optString("time").trim()
            require(id.matches(Regex("[A-Za-z0-9_-]{1,80}"))) { "معرّف الوجبة غير صالح" }
            require(title.isNotBlank() && title.length <= 100) { "اسم الوجبة غير صالح" }
            require(time.matches(Regex("(?:[01]\\d|2[0-3]):[0-5]\\d"))) { "صيغة الوقت يجب أن تكون HH:mm" }
            parsed.add(ScheduledMeal(id, title, time))
        }
        require(parsed.isNotEmpty() && parsed.map { it.id }.distinct().size == parsed.size) { "جدول الوجبات غير صالح" }
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.delete("meal_schedule", null, null)
            parsed.forEach { meal ->
                val values = ContentValues().apply {
                    put("id", meal.id); put("title", meal.title); put("time", meal.time)
                }
                db.insertOrThrow("meal_schedule", null, values)
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }
}
