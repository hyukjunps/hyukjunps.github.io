package kr.opoong.mobile;

import android.app.PendingIntent;
import android.app.job.JobScheduler;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.SizeF;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;
import java.util.LinkedHashMap;
import java.util.Map;

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

    public static final class Dday extends WidgetProvider {
        @Override WidgetKind kind() { return WidgetKind.DDAY; }
        @Override public void onDeleted(Context context, int[] ids) { DdayChoice.remove(context, ids); }
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
        manager.updateAppWidget(id, sizedViews(context, kind(), card(context, kind(), id, false), options, id));
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
        var sharedCard = kind == WidgetKind.DDAY ? null : WidgetData.card(context, kind, failed);
        for (int id : ids) {
            var contents = sharedCard == null ? card(context, kind, id, failed) : sharedCard;
            manager.updateAppWidget(id, sizedViews(context, kind, contents, manager.getAppWidgetOptions(id), id));
        }
    }

    private static WidgetData.Card card(Context context, WidgetKind kind, int id, boolean failed) {
        var choice = kind == WidgetKind.DDAY ? DdayChoice.load(context, id) : null;
        return choice == null ? WidgetData.card(context, kind, failed) : choice.card(context, SchoolMeals.today(), failed);
    }

    @SuppressWarnings("deprecation")
    private static RemoteViews sizedViews(Context context, WidgetKind kind, WidgetData.Card card, Bundle options, int id) {
        if (Build.VERSION.SDK_INT >= 31) {
            var sizes = options.<SizeF>getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES);
            if (sizes != null && !sizes.isEmpty()) {
                Map<SizeF, RemoteViews> layouts = new LinkedHashMap<>();
                for (SizeF size : sizes) {
                    if (size.getWidth() > 0 && size.getHeight() > 0 && layouts.size() < 16) {
                        layouts.put(size, cardView(context, kind, card, size.getWidth(), size.getHeight(), id));
                    }
                }
                if (!layouts.isEmpty()) return new RemoteViews(layouts);
            }
        }

        int minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 160);
        int maxWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, minWidth);
        int minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 120);
        int maxHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, minHeight);
        return new RemoteViews(cardView(context, kind, card, maxWidth, minHeight, id),
                cardView(context, kind, card, minWidth, maxHeight, id));
    }

    private static RemoteViews cardView(Context context, WidgetKind kind, WidgetData.Card card, float width, float height, int id) {
        var metrics = context.getResources().getDisplayMetrics();
        float fontScale = Math.max(1, context.getResources().getConfiguration().fontScale);
        float usableHeight = height / fontScale;
        boolean compact = width < 175 || usableHeight < 128;
        boolean large = width >= 255 && usableHeight >= 160;
        boolean showFooter = usableHeight >= 158 && !card.footer().isEmpty();
        boolean numeric = (kind == WidgetKind.WEATHER && card.title().endsWith("°"))
                || (kind == WidgetKind.DDAY && card.title().startsWith("D"));
        int padding = Math.round((large ? 17 : compact ? 8 : 12) * metrics.density);
        int topBottom = Math.round((large ? 12 : compact ? 6 : 8) * metrics.density);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_card);
        views.setInt(R.id.widget_root, "setBackgroundResource", kind.background);
        views.setViewPadding(R.id.widget_root, padding, topBottom, padding, topBottom);
        views.setViewVisibility(R.id.widget_header, usableHeight < 107 ? View.GONE : View.VISIBLE);
        views.setImageViewResource(R.id.widget_symbol, kind.symbol);
        views.setViewVisibility(R.id.widget_symbol, width < 135 ? View.GONE : View.VISIBLE);
        views.setTextColor(R.id.widget_label, kind.accent);
        views.setTextColor(R.id.widget_footer, kind.accent);
        views.setTextViewText(R.id.widget_label, card.label());
        views.setTextViewText(R.id.widget_title, card.title());
        views.setTextViewText(R.id.widget_detail, compact ? card.compactDetail() : card.detail());
        views.setTextViewText(R.id.widget_footer, card.footer());
        views.setViewVisibility(R.id.widget_footer, showFooter ? View.VISIBLE : View.GONE);
        views.setTextViewTextSize(R.id.widget_label, TypedValue.COMPLEX_UNIT_SP, large ? 16 : 13);
        boolean narrow = width / Math.min(fontScale, 1.5f) < 140;
        int titleSize = numeric ? (large ? 50 : compact ? 32 : 41)
                : (large ? 32 : compact ? (narrow && kind == WidgetKind.ONWAY ? 20 : 23) : 27);
        views.setTextViewTextSize(R.id.widget_title, TypedValue.COMPLEX_UNIT_SP, titleSize);
        views.setTextViewTextSize(R.id.widget_detail, TypedValue.COMPLEX_UNIT_SP,
                large ? 20 : compact ? 16 : 18);
        views.setTextViewTextSize(R.id.widget_footer, TypedValue.COMPLEX_UNIT_SP, large ? 15 : 13);
        views.setInt(R.id.widget_title, "setMaxLines", large && !numeric ? 2 : 1);
        views.setInt(R.id.widget_detail, "setMaxLines", large ? 5 : compact ? 2 : 3);

        Intent intent = kind == WidgetKind.DDAY
                ? new Intent(context, DdayConfigureActivity.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
                : new Intent(Intent.ACTION_VIEW, Uri.parse(kind.url), context, MainActivity.class);
        views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(
                context, kind == WidgetKind.DDAY ? id : kind.ordinal(), intent, PendingIntent.FLAG_IMMUTABLE));
        return views;
    }
}
