package com.commit.tracker.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.core.app.JobIntentService
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class WidgetUpdateService : JobIntentService() {

    override fun onHandleWork(intent: Intent) {
        val data = fetchWidgetData() ?: return
        val manager = AppWidgetManager.getInstance(this)
        val ids = manager.getAppWidgetIds(ComponentName(this, CommitWidgetProvider::class.java))

        for (id in ids) {
            CommitWidgetProvider.updateWidget(
                context = this,
                appWidgetManager = manager,
                appWidgetId = id,
                totalStreak = data.totalStreak,
                todayComplete = data.todayComplete,
                totalGoals = data.totalGoals,
                goalNames = data.goals
            )
        }
    }

    private fun fetchWidgetData(): WidgetData? {
        return try {
            val client = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .build()

            val request = Request.Builder()
                .url("https://accountability-tracker-mu.vercel.app/api/widget")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return null
                val body = response.body?.string() ?: return null
                val json = JSONObject(body)

                val totalStreak = json.getInt("totalStreak")
                val todayComplete = json.getInt("todayComplete")
                val totalGoals = json.getInt("totalGoals")

                val goalsArray = json.getJSONArray("goals")
                val goals = mutableListOf<Pair<String, Boolean>>()
                for (i in 0 until goalsArray.length()) {
                    val g = goalsArray.getJSONObject(i)
                    goals.add(Pair(g.getString("name"), g.getBoolean("completedToday")))
                }

                WidgetData(totalStreak, todayComplete, totalGoals, goals)
            }
        } catch (e: Exception) {
            null
        }
    }

    data class WidgetData(
        val totalStreak: Int,
        val todayComplete: Int,
        val totalGoals: Int,
        val goals: List<Pair<String, Boolean>>
    )

    companion object {
        private const val JOB_ID = 1001

        fun enqueueWork(context: Context) {
            enqueueWork(context, WidgetUpdateService::class.java, JOB_ID, Intent())
        }
    }
}
