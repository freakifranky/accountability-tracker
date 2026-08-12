package com.commit.tracker.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.core.app.JobIntentService
import com.commit.tracker.BuildConfig
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class WidgetUpdateService : JobIntentService() {

    override fun onHandleWork(intent: Intent) {
        if (intent.action == ACTION_COMPLETE_TASK) {
            val taskId = intent.getStringExtra(EXTRA_TASK_ID)
            if (taskId != null) completeTask(taskId)
        }

        val manager = AppWidgetManager.getInstance(this)
        val ids = manager.getAppWidgetIds(ComponentName(this, CommitWidgetProvider::class.java))
        if (ids.isEmpty()) return

        when (val result = fetchWidgetData()) {
            is FetchResult.Success -> for (id in ids) {
                CommitWidgetProvider.applyData(
                    context = this,
                    appWidgetManager = manager,
                    appWidgetId = id,
                    todayComplete = result.data.todayComplete,
                    totalTasks = result.data.totalTasks,
                    tasks = result.data.tasks
                )
            }
            is FetchResult.Error -> for (id in ids) {
                // Visible failure instead of silently leaving stale/blank content
                // (the outside-voice finding from the eng review: catch(e){null}
                // meant the widget just went blank with no indication why).
                CommitWidgetProvider.applyError(this, manager, id, result.message)
            }
        }
    }

    private fun authorizedRequest(): Request.Builder {
        return Request.Builder()
            .addHeader("Authorization", "Bearer ${BuildConfig.API_SHARED_SECRET}")
    }

    private fun fetchWidgetData(): FetchResult {
        if (BuildConfig.API_SHARED_SECRET.isEmpty()) {
            return FetchResult.Error("Not configured — rebuild with API_SHARED_SECRET set")
        }
        return try {
            val client = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .build()

            val request = authorizedRequest()
                .url("${BuildConfig.API_BASE_URL}/api/widget")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return FetchResult.Error("Server error (${response.code})")
                }
                val body = response.body?.string() ?: return FetchResult.Error("Empty response")
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

                FetchResult.Success(WidgetData(todayComplete, totalTasks, tasks))
            }
        } catch (e: Exception) {
            FetchResult.Error("Connection failed: ${e.message ?: e.javaClass.simpleName}")
        }
    }

    // Fire-and-forget from the widget tap — errors are swallowed here since
    // the subsequent fetchWidgetData() refresh will surface any real problem
    // (e.g. an expired/misconfigured secret) via the visible error state above.
    private fun completeTask(taskId: String) {
        if (BuildConfig.API_SHARED_SECRET.isEmpty()) return
        try {
            val client = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .build()

            val body = JSONObject().put("completed", true).toString()
                .toRequestBody("application/json".toMediaType())

            val request = authorizedRequest()
                .url("${BuildConfig.API_BASE_URL}/api/tasks/$taskId")
                .patch(body)
                .build()

            client.newCall(request).execute().close()
        } catch (_: Exception) {
            // Swallowed intentionally — see comment above.
        }
    }

    sealed class FetchResult {
        data class Success(val data: WidgetData) : FetchResult()
        data class Error(val message: String) : FetchResult()
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
        const val ACTION_COMPLETE_TASK = "com.commit.tracker.WIDGET_COMPLETE_TASK"
        const val EXTRA_TASK_ID = "task_id"

        fun enqueueWork(context: Context) {
            enqueueWork(context, WidgetUpdateService::class.java, JOB_ID, Intent())
        }

        fun enqueueCompleteTask(context: Context, taskId: String) {
            val intent = Intent().apply {
                action = ACTION_COMPLETE_TASK
                putExtra(EXTRA_TASK_ID, taskId)
            }
            enqueueWork(context, WidgetUpdateService::class.java, JOB_ID, intent)
        }
    }
}
