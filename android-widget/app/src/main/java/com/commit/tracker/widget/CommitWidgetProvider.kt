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
                // 4x1's whole-row tap-to-complete (hero layout only).
                val taskId = intent.getStringExtra(WidgetUpdateService.EXTRA_TASK_ID) ?: return
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(ComponentName(context, CommitWidgetProvider::class.java))
                for (id in ids) showLoading(context, manager, id) // immediate feedback, real state lands on refresh
                WidgetUpdateService.enqueueCompleteTask(context, taskId)
            }
            ACTION_ROW_TAP -> {
                // 3x2/4x2 scrollable list: one row, two independent tap targets —
                // routed here via a single PendingIntent template (setPendingIntentTemplate)
                // with per-row fill-in intents supplying which task and which action.
                val taskId = intent.getStringExtra(WidgetUpdateService.EXTRA_TASK_ID) ?: return
                when (intent.getStringExtra(EXTRA_TAP_KIND)) {
                    TAP_KIND_OPEN -> {
                        val url = intent.getStringExtra(EXTRA_SOURCE_URL)?.takeIf { it.isNotBlank() } ?: OPEN_APP_URL
                        val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        context.startActivity(openIntent)
                    }
                    TAP_KIND_COMPLETE -> {
                        // No optimistic loading state here (unlike the hero path) —
                        // the row stays visible until notifyAppWidgetViewDataChanged
                        // (fired at the end of the same work item) reloads the list,
                        // which is fast enough not to need one.
                        WidgetUpdateService.enqueueCompleteTask(context, taskId)
                    }
                }
            }
        }
    }

    private fun showLoading(context: Context, manager: AppWidgetManager, id: Int) {
        val layout = pickLayout(manager, id)
        val views = RemoteViews(context.packageName, layout)
        if (layout == R.layout.widget_layout_4x1) {
            views.setTextViewText(R.id.tv_hero_task, "Loading…")
        } else {
            applyListSkeleton(context, views, id, "Loading…")
        }
        manager.updateAppWidget(id, views)
    }

    companion object {
        const val ACTION_REFRESH = "com.commit.tracker.WIDGET_REFRESH"
        const val ACTION_COMPLETE_TASK_ROW = "com.commit.tracker.WIDGET_COMPLETE_TASK_ROW"
        const val ACTION_ROW_TAP = "com.commit.tracker.WIDGET_ROW_TAP"
        const val EXTRA_TAP_KIND = "tap_kind"
        const val EXTRA_SOURCE_URL = "source_url"
        const val TAP_KIND_OPEN = "open"
        const val TAP_KIND_COMPLETE = "complete"
        const val OPEN_APP_URL = "https://accountability-tracker-mu.vercel.app/dashboard"

        fun applyError(context: Context, manager: AppWidgetManager, id: Int, message: String) {
            val layout = pickLayout(manager, id)
            val views = RemoteViews(context.packageName, layout)
            if (layout == R.layout.widget_layout_4x1) {
                views.setTextViewText(R.id.tv_hero_task, "⚠ $message")
            } else {
                applyListSkeleton(context, views, id, "⚠ $message")
            }
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
            views.setTextViewText(R.id.tv_streak, "🔥 $topStreak")

            if (layout == R.layout.widget_layout_4x1) {
                applyHeroData(context, views, appWidgetId, tasks)
            } else {
                val emptyText = if (totalTasks == 0) "Nothing due today" else "✓ All done for today"
                applyListSkeleton(context, views, appWidgetId, emptyText)
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

        /**
         * 4x1 only: a single row has no room for a scrollable list or two
         * separate tap targets, so it keeps the original action-first design —
         * shows the next pending task, whole row completes it on tap.
         */
        private fun applyHeroData(
            context: Context,
            views: RemoteViews,
            appWidgetId: Int,
            tasks: List<WidgetUpdateService.TaskItem>
        ) {
            // Already sorted pending-first, priority-ascending by /api/widget —
            // the first pending task is "the next thing to do."
            val heroTask = tasks.firstOrNull { !it.completed }

            if (heroTask != null) {
                val prefix = if (heroTask.priority == 1) "● " else ""
                views.setTextViewText(R.id.tv_hero_task, "$prefix${heroTask.title}")
                val completeIntent = Intent(context, CommitWidgetProvider::class.java).apply {
                    action = ACTION_COMPLETE_TASK_ROW
                    putExtra(WidgetUpdateService.EXTRA_TASK_ID, heroTask.id)
                }
                val completePending = PendingIntent.getBroadcast(
                    context, appWidgetId, completeIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, completePending)
            } else if (tasks.isNotEmpty()) {
                // Everything scheduled today is done — celebratory state, not
                // another empty "0/0" that could read as nothing happening.
                views.setTextViewText(R.id.tv_hero_task, "✓ All done for today")
                setOpenAppTap(context, views, appWidgetId, R.id.widget_root)
            } else {
                views.setTextViewText(R.id.tv_hero_task, "Nothing due today")
                setOpenAppTap(context, views, appWidgetId, R.id.widget_root)
            }
        }

        /**
         * 3x2/4x2: wires the scrollable list to WidgetItemsService's
         * RemoteViewsFactory (which does its own independent /api/widget fetch
         * to build rows) and the shared tap-routing template every row's
         * fill-in intent merges into. Called for every push to this layout —
         * loading, error, and real data alike — so the adapter binding and
         * empty-state view are always freshly, consistently established
         * rather than assumed to carry over from a previous push.
         *
         * FLAG_MUTABLE is required on the template PendingIntent (not
         * FLAG_IMMUTABLE like the other PendingIntents in this file) — Android
         * 12+ silently drops fill-in intent extras on an immutable template,
         * which would make every row look tappable but do nothing.
         */
        private fun applyListSkeleton(context: Context, views: RemoteViews, appWidgetId: Int, emptyText: String) {
            views.setTextViewText(R.id.tv_empty, emptyText)
            views.setRemoteAdapter(R.id.lv_tasks, Intent(context, WidgetItemsService::class.java))
            views.setEmptyView(R.id.lv_tasks, R.id.tv_empty)

            val rowTapIntent = Intent(context, CommitWidgetProvider::class.java).apply {
                action = ACTION_ROW_TAP
            }
            val rowTapPending = PendingIntent.getBroadcast(
                context, appWidgetId, rowTapIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            views.setPendingIntentTemplate(R.id.lv_tasks, rowTapPending)

            // Row taps and the refresh button are both already spoken for, so
            // the "Commit" wordmark in the header is one way into the full app.
            // tv_empty also gets it — when the list is empty, that message
            // ("Nothing due today" / "✓ All done for today") IS the widget as
            // far as tap area goes, and it had no handler at all before this,
            // so most of the widget was dead space with nothing due.
            setOpenAppTap(context, views, appWidgetId, R.id.tv_app_name)
            setOpenAppTap(context, views, appWidgetId, R.id.tv_empty)
        }

        private fun setOpenAppTap(context: Context, views: RemoteViews, appWidgetId: Int, targetViewId: Int) {
            val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse(OPEN_APP_URL))
            val openPending = PendingIntent.getActivity(
                context, appWidgetId, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(targetViewId, openPending)
        }
    }
}
