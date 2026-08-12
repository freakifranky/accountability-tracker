package com.commit.tracker.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
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
        when (intent.action) {
            ACTION_REFRESH -> {
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(ComponentName(context, CommitWidgetProvider::class.java))
                for (id in ids) showLoading(context, manager, id)
                WidgetUpdateService.enqueueWork(context)
            }
            ACTION_COMPLETE_TASK_ROW -> {
                val taskId = intent.getStringExtra(WidgetUpdateService.EXTRA_TASK_ID) ?: return
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(ComponentName(context, CommitWidgetProvider::class.java))
                for (id in ids) showLoading(context, manager, id) // immediate feedback, real state lands on refresh
                WidgetUpdateService.enqueueCompleteTask(context, taskId)
            }
        }
    }

    private fun showLoading(context: Context, manager: AppWidgetManager, id: Int) {
        val layout = pickLayout(manager, id)
        val views = RemoteViews(context.packageName, layout)
        views.setTextViewText(R.id.tv_hero_task, "Loading…")
        manager.updateAppWidget(id, views)
    }

    companion object {
        const val ACTION_REFRESH = "com.commit.tracker.WIDGET_REFRESH"
        const val ACTION_COMPLETE_TASK_ROW = "com.commit.tracker.WIDGET_COMPLETE_TASK_ROW"

        fun applyError(context: Context, manager: AppWidgetManager, id: Int, message: String) {
            val layout = pickLayout(manager, id)
            val views = RemoteViews(context.packageName, layout)
            views.setTextViewText(R.id.tv_hero_task, "⚠ $message")
            manager.updateAppWidget(id, views)
        }

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

        /**
         * Action-first widget, redesigned after feedback that the old
         * multi-row task list was too cramped to read or tap accurately at
         * widget size. Instead of a list, shows ONE task — the next thing to
         * do — in large text, with the whole card as the tap target
         * (Duolingo-style: one clear action, not a mini dashboard). The full
         * task list still lives in the app; the widget's job is just to get
         * you started on the next thing.
         */
        fun applyData(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            todayComplete: Int,
            totalTasks: Int,
            tasks: List<WidgetUpdateService.TaskItem>,
            topStreak: Int
        ) {
            val layout = pickLayout(appWidgetManager, appWidgetId)
            val views = RemoteViews(context.packageName, layout)

            // Already sorted pending-first, priority-ascending by /api/widget —
            // the first pending task is "the next thing to do."
            val pendingTasks = tasks.filter { !it.completed }
            val heroTask = pendingTasks.firstOrNull()
            val remainingAfterHero = (pendingTasks.size - 1).coerceAtLeast(0)

            views.setTextViewText(R.id.tv_streak, "🔥 $topStreak")

            when {
                heroTask != null -> {
                    val prefix = if (heroTask.priority == 1) "● " else ""
                    views.setTextViewText(R.id.tv_hero_task, "$prefix${heroTask.title}")
                    setStatusText(
                        views, layout,
                        if (remainingAfterHero > 0) "+$remainingAfterHero more today" else "Tap to complete"
                    )
                    // Whole card completes this task — the primary action.
                    val completeIntent = Intent(context, CommitWidgetProvider::class.java).apply {
                        action = ACTION_COMPLETE_TASK_ROW
                        putExtra(WidgetUpdateService.EXTRA_TASK_ID, heroTask.id)
                    }
                    val completePending = PendingIntent.getBroadcast(
                        context, appWidgetId, completeIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_root, completePending)
                }
                totalTasks > 0 -> {
                    // Everything scheduled today is done — celebratory state, not
                    // another empty "0/0" that could read as nothing happening.
                    views.setTextViewText(R.id.tv_hero_task, "✓ All done for today")
                    setStatusText(views, layout, "Nice work — $todayComplete/$totalTasks complete")
                    setOpenAppTap(context, views, appWidgetId)
                }
                else -> {
                    views.setTextViewText(R.id.tv_hero_task, "Nothing due today")
                    setStatusText(views, layout, "Open the app to add something")
                    setOpenAppTap(context, views, appWidgetId)
                }
            }

            // Refresh — its own tap target, takes priority over the root's
            // click when tapped directly (standard RemoteViews behavior).
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

        // tv_status doesn't exist on the 4x1 (single-row) layout — no room for it.
        private fun setStatusText(views: RemoteViews, layout: Int, text: String) {
            if (layout == R.layout.widget_layout_4x1) return
            views.setTextViewText(R.id.tv_status, text)
        }

        private fun setOpenAppTap(context: Context, views: RemoteViews, appWidgetId: Int) {
            val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://accountability-tracker-mu.vercel.app/dashboard"))
            val openPending = PendingIntent.getActivity(
                context, appWidgetId, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, openPending)
        }
    }
}
