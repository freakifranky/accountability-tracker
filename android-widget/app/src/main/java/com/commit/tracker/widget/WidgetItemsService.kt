package com.commit.tracker.widget

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.commit.tracker.BuildConfig
import com.commit.tracker.R
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

// Entry point AppWidgetManager binds to for the scrollable list (3x2/4x2).
// Required by the platform: RemoteViews.setRemoteAdapter() points at this
// service's Intent, not directly at the factory.
class WidgetItemsService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return WidgetRemoteViewsFactory(applicationContext)
    }
}

class WidgetRemoteViewsFactory(private val context: Context) : RemoteViewsService.RemoteViewsFactory {

    private var items: List<WidgetUpdateService.TaskItem> = emptyList()

    override fun onCreate() {}

    override fun onDestroy() {
        items = emptyList()
    }

    // Runs synchronously on a dedicated binder thread the widget host manages
    // for this factory — a blocking network call here is the documented
    // Android pattern for collection widgets, not something to move off-thread
    // ourselves. Triggered by AppWidgetManager.notifyAppWidgetViewDataChanged().
    override fun onDataSetChanged() {
        items = try {
            fetchPendingTasks()
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun fetchPendingTasks(): List<WidgetUpdateService.TaskItem> {
        if (BuildConfig.API_SHARED_SECRET.isEmpty()) return emptyList()

        val client = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .build()

        val request = Request.Builder()
            .addHeader("Authorization", "Bearer ${BuildConfig.API_SHARED_SECRET}")
            .url("${BuildConfig.API_BASE_URL}/api/widget")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return emptyList()
            val body = response.body?.string() ?: return emptyList()
            val json = JSONObject(body)
            val tasksArray = json.getJSONArray("tasks")

            val result = mutableListOf<WidgetUpdateService.TaskItem>()
            for (i in 0 until tasksArray.length()) {
                val t = tasksArray.getJSONObject(i)
                if (t.getBoolean("completed")) continue // the list only shows what's left to do
                result.add(
                    WidgetUpdateService.TaskItem(
                        id = t.getString("id"),
                        title = t.getString("title"),
                        completed = false,
                        priority = t.getInt("priority"),
                        sourceUrl = if (t.isNull("sourceUrl")) null else t.optString("sourceUrl", null)
                    )
                )
            }
            return result
        }
    }

    override fun getCount(): Int = items.size

    override fun getViewAt(position: Int): RemoteViews {
        val item = items[position]
        val rv = RemoteViews(context.packageName, R.layout.widget_list_item)

        val prefix = if (item.priority == 1) "● " else ""
        rv.setTextViewText(R.id.tv_title, "$prefix${item.title}")

        // Tapping the title opens the captured link (or the app, if this task
        // has no link) — it never marks anything complete.
        val openFillIn = Intent().apply {
            putExtra(WidgetUpdateService.EXTRA_TASK_ID, item.id)
            putExtra(CommitWidgetProvider.EXTRA_TAP_KIND, CommitWidgetProvider.TAP_KIND_OPEN)
            putExtra(CommitWidgetProvider.EXTRA_SOURCE_URL, item.sourceUrl)
        }
        rv.setOnClickFillInIntent(R.id.tv_title, openFillIn)

        // Tapping the checkmark marks it complete — it never opens anything.
        val completeFillIn = Intent().apply {
            putExtra(WidgetUpdateService.EXTRA_TASK_ID, item.id)
            putExtra(CommitWidgetProvider.EXTRA_TAP_KIND, CommitWidgetProvider.TAP_KIND_COMPLETE)
        }
        rv.setOnClickFillInIntent(R.id.btn_check, completeFillIn)

        return rv
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = items[position].id.hashCode().toLong()
    override fun hasStableIds(): Boolean = true
}
