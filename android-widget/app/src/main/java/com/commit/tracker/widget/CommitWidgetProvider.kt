package com.commit.tracker.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import com.commit.tracker.R

class CommitWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            showLoading(context, appWidgetManager, id)
        }
        WidgetUpdateService.enqueueWork(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        // Re-render with correct layout when widget is resized
        WidgetUpdateService.enqueueWork(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, CommitWidgetProvider::class.java))
            for (id in ids) showLoading(context, manager, id)
            WidgetUpdateService.enqueueWork(context)
        }
    }

    private fun showLoading(context: Context, manager: AppWidgetManager, id: Int) {
        val layout = pickLayout(manager, id)
        val views = RemoteViews(context.packageName, layout)
        views.setTextViewText(R.id.tv_progress, "Loading…")
        manager.updateAppWidget(id, views)
    }

    companion object {
        const val ACTION_REFRESH = "com.commit.tracker.WIDGET_REFRESH"

        /** Choose layout based on current widget width in dp */
        fun pickLayout(manager: AppWidgetManager, id: Int): Int {
            val options = manager.getAppWidgetOptions(id)
            val minW = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 180)
            val minH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110)

            return when {
                minH < 80 -> R.layout.widget_layout_4x1   // single row
                minW >= 270 -> R.layout.widget_layout_4x2  // wide
                else -> R.layout.widget_layout_3x2         // default medium
            }
        }

        fun applyData(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            todayComplete: Int,
            totalTasks: Int,
            tasks: List<WidgetUpdateService.TaskItem>
        ) {
            val layout = pickLayout(appWidgetManager, appWidgetId)
            val views = RemoteViews(context.packageName, layout)

            val pendingTasks = tasks.filter { !it.completed }
            val doneTasks = tasks.filter { it.completed }

            // Progress text
            val progressText = when (layout) {
                R.layout.widget_layout_4x2 -> "$todayComplete / $totalTasks tasks done"
                R.layout.widget_layout_4x1 -> "$todayComplete / $totalTasks tasks"
                else -> "$todayComplete / $totalTasks"
            }
            views.setTextViewText(R.id.tv_progress, progressText)

            // Fill task rows (pending first, then done)
            val ordered = pendingTasks + doneTasks
            val taskIds = listOf(R.id.tv_task1, R.id.tv_task2, R.id.tv_task3, R.id.tv_task4, R.id.tv_task5)
            val maxRows = when (layout) {
                R.layout.widget_layout_4x2 -> 5
                R.layout.widget_layout_3x2 -> 3
                else -> 0
            }

            taskIds.forEachIndexed { i, viewId ->
                // Only set task rows that exist in this layout
                if (i >= maxRows) return@forEachIndexed
                try {
                    val task = ordered.getOrNull(i)
                    if (task != null) {
                        val prefix = if (task.completed) "✓ " else "○ "
                        val color = if (task.completed) 0xFF9CA3AF.toInt() else 0xFF374151.toInt()
                        views.setTextViewText(viewId, "$prefix${task.title}")
                        views.setTextColor(viewId, color)
                        views.setViewVisibility(viewId, View.VISIBLE)
                    } else {
                        views.setViewVisibility(viewId, View.GONE)
                    }
                } catch (_: Exception) { /* view doesn't exist in this layout */ }
            }

            // Check in button → opens dashboard
            val openIntent = Intent(Intent.ACTION_VIEW,
                Uri.parse("https://accountability-tracker-mu.vercel.app/dashboard"))
            val openPending = PendingIntent.getActivity(
                context, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_checkin, openPending)

            // Refresh button
            val refreshIntent = Intent(context, CommitWidgetProvider::class.java).apply {
                action = ACTION_REFRESH
            }
            val refreshPending = PendingIntent.getBroadcast(
                context, 1, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_refresh, refreshPending)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
