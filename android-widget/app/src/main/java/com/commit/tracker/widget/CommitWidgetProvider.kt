package com.commit.tracker.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.commit.tracker.R

class CommitWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
        // Fetch fresh data from API
        WidgetUpdateService.enqueueWork(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, CommitWidgetProvider::class.java))
            for (id in ids) {
                updateWidget(context, manager, id, loading = true)
            }
            WidgetUpdateService.enqueueWork(context)
        }
    }

    companion object {
        const val ACTION_REFRESH = "com.commit.tracker.WIDGET_REFRESH"

        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            loading: Boolean = false,
            totalStreak: Int = 0,
            todayComplete: Int = 0,
            totalGoals: Int = 0,
            goalNames: List<Pair<String, Boolean>> = emptyList()
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_layout)

            if (loading) {
                views.setTextViewText(R.id.tv_progress, "Loading…")
                views.setTextViewText(R.id.tv_streak, "🔥 —")
                views.setTextViewText(R.id.tv_goals, "")
            } else {
                views.setTextViewText(R.id.tv_progress, "$todayComplete / $totalGoals goals today")
                views.setTextViewText(R.id.tv_streak, "🔥 $totalStreak day streak")

                // Show up to 2 goal names with done/pending indicator
                val goalText = goalNames.take(2).joinToString("  ·  ") { (name, done) ->
                    if (done) "✓ $name" else "○ $name"
                }
                views.setTextViewText(R.id.tv_goals, goalText)
            }

            // Check in button → opens dashboard in browser
            val openIntent = Intent(Intent.ACTION_VIEW,
                Uri.parse("https://accountability-tracker-mu.vercel.app/dashboard"))
            val openPending = PendingIntent.getActivity(
                context, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_checkin, openPending)

            // Refresh button → triggers manual refresh
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
