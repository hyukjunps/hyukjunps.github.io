package kr.opoong.mobile;

import android.app.PendingIntent;
import android.app.job.JobScheduler;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.TypedValue;
import android.widget.RemoteViews;

public abstract class WidgetProvider extends AppWidgetProvider {
    abstract WidgetKind kind();

    public static final class Weather extends WidgetProvider {
        @Override WidgetKind kind() { return WidgetKind.WEATHER; }
    }

    public static final class Schedule extends WidgetProvider {
        @Override WidgetKind kind() { return WidgetKind.SCHEDULE; }
    }

    public static final class Onway extends WidgetProvider {
        @Override WidgetKind kind() { return WidgetKind.ONWAY; }
    }

    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (Intent.ACTION_DATE_CHANGED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            renderAll(context, kind(), false);
            WidgetRefreshJob.schedule(context, kind());
        }
    }

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        render(context, kind(), manager, ids, false);
        WidgetRefreshJob.schedule(context, kind());
    }

    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        render(context, kind(), manager, new int[]{id}, false);
    }

    @Override public void onDisabled(Context context) {
        if (kind().jobId != 0) context.getSystemService(JobScheduler.class).cancel(kind().jobId);
    }

    static int[] ids(Context context, WidgetKind kind) {
        return AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, kind.provider));
    }

    static void renderAll(Context context, WidgetKind kind, boolean failed) {
        render(context, kind, AppWidgetManager.getInstance(context), ids(context, kind), failed);
    }

    private static void render(Context context, WidgetKind kind, AppWidgetManager manager, int[] ids, boolean failed) {
        if (ids.length == 0) return;
        var card = WidgetData.card(context, kind, failed);
        for (int id : ids) {
            var options = manager.getAppWidgetOptions(id);
            boolean narrow = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 190) < 165;
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_card);
            views.setInt(R.id.widget_root, "setBackgroundResource", kind.background);
            views.setImageViewResource(R.id.widget_symbol, kind.symbol);
            views.setTextColor(R.id.widget_label, kind.accent);
            views.setTextViewText(R.id.widget_label, card.label());
            views.setTextViewText(R.id.widget_title, card.title());
            views.setTextViewText(R.id.widget_detail, narrow ? card.compactDetail() : card.detail());
            views.setTextViewText(R.id.widget_footer, card.footer());
            int titleSize = kind == WidgetKind.WEATHER && card.title().endsWith("°") ? 29 : (narrow ? 17 : 20);
            views.setTextViewTextSize(R.id.widget_title, TypedValue.COMPLEX_UNIT_SP, titleSize);
            var intent = new Intent(Intent.ACTION_VIEW, Uri.parse(kind.url), context, MainActivity.class);
            views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(
                    context, kind.ordinal(), intent, PendingIntent.FLAG_IMMUTABLE));
            manager.updateAppWidget(id, views);
        }
    }
}
