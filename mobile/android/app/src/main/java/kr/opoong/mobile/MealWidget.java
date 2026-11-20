package kr.opoong.mobile;

import android.app.PendingIntent;
import android.app.job.JobScheduler;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public final class MealWidget extends AppWidgetProvider {
    private static final DateTimeFormatter DATE_LABEL =
            DateTimeFormatter.ofPattern("M월 d일 EEE", Locale.KOREAN);

    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (Intent.ACTION_DATE_CHANGED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            renderAll(context, false);
            if (widgetIds(context).length > 0) MealRefreshJob.schedule(context);
        }
    }

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        render(context, manager, ids, false);
        MealRefreshJob.schedule(context);
    }

    @Override public void onDisabled(Context context) {
        context.getSystemService(JobScheduler.class).cancel(MealRefreshJob.ID);
    }

    static void renderAll(Context context, boolean failed) {
        render(context, AppWidgetManager.getInstance(context), widgetIds(context), failed);
    }

    private static int[] widgetIds(Context context) {
        return AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, MealWidget.class));
    }

    private static void render(Context context, AppWidgetManager manager, int[] ids, boolean failed) {
        if (ids.length == 0) return;
        LocalDate day = SchoolMeals.today();
        var meals = SchoolMeals.cached(context, day);
        String title = "오늘 급식";
        String menu = failed ? "급식을 불러오지 못했어요" : "급식을 불러오는 중";
        if (meals != null && meals.isEmpty()) menu = "등록된 급식이 없어요";
        if (meals != null && !meals.isEmpty()) {
            var meal = meals.stream().filter(item -> item.code() == 2).findFirst().orElse(meals.get(0));
            title = "오늘 " + meal.name();
            menu = String.join(" · ", meal.dishes());
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.meal_widget);
        views.setTextViewText(R.id.widget_date, "오풍  ·  " + day.format(DATE_LABEL));
        views.setTextViewText(R.id.widget_title, title);
        views.setTextViewText(R.id.widget_menu, menu);
        Intent intent = new Intent(Intent.ACTION_VIEW, null, context, MainActivity.class);
        views.setOnClickPendingIntent(R.id.widget_root,
                PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE));
        manager.updateAppWidget(ids, views);
    }
}
