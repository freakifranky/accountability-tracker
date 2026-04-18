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
            CommitWidgetProvider.applyData(
                context = this,
                appWidgetManager = manager,
                appWidgetId = id,
                todayComplete = data.todayComplete,
                totalTasks = data.totalTasks,
                tasks = data.tasks
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

                val todayComplete = json.getInt("todayComplete")
                val totalTasks = json.getInt("totalTasks")

                val tasksArray = json.getJSONArray("tasks")
                val tasks = mutableListOf<TaskItem>()
                for (i in 0 until tasksArray.length()) {
                    val t = tasksArray.getJSONObject(i)
                    tasks.add(TaskItem(
                        id = t.getString("id"),
                        title = t.getString("title"),
                        completed = t.getBoolean("completed"),
                        priority = t.getInt("priority")
                    ))
                }

                WidgetData(todayComplete, totalTasks, tasks)
            }
        } catch (e: Exception) {
            null
        }
    }

    data class TaskItem(
        val id: String,
        val title: String,
        val completed: Boolean,
        val priority: Int
    )

    data class WidgetData(
        val todayComplete: Int,
        val totalTasks: Int,
        val tasks: List<TaskItem>
    )

    companion object {
        private const val JOB_ID = 1001

        fun enqueueWork(context: Context) {
            enqueueWork(context, WidgetUpdateService::class.java, JOB_ID, Intent())
        }
    }
}
