package kr.opoong.mobile;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.PersistableBundle;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import org.json.JSONException;

public final class MorningMeal extends BroadcastReceiver {
    static final int JOB_ID = 101;
    static final String JOB_DAY = "meal-day";
    private static final String PREFS = "morning-meal";
    private static final String ACTION = "kr.opoong.mobile.MORNING_MEAL";
    private static final String CHANNEL = "morning-meal";
    private static final int NOTIFICATION_ID = 107;
    private static final LocalTime START = LocalTime.of(7, 0);
    private static final LocalTime END = LocalTime.of(10, 0);

    static boolean enabled(Context context) {
        return prefs(context).getBoolean("enabled", false);
    }

    static synchronized void setEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean("enabled", enabled).apply();
        var alarm = context.getSystemService(AlarmManager.class);
        if (enabled) schedule(context);
        else {
            alarm.cancel(trigger(context));
            context.getSystemService(JobScheduler.class).cancel(JOB_ID);
            context.getSystemService(NotificationManager.class).cancel(NOTIFICATION_ID);
        }
    }

    static ZonedDateTime nextAlarm(ZonedDateTime now) {
        var next = now.toLocalDate().atTime(START).atZone(MealTime.SEOUL);
        return next.isAfter(now) ? next : next.plusDays(1);
    }

    static boolean inWindow(LocalDate day, ZonedDateTime now) {
        return day.equals(now.toLocalDate()) && !now.toLocalTime().isBefore(START) && now.toLocalTime().isBefore(END);
    }

    private static void schedule(Context context) {
        var next = nextAlarm(ZonedDateTime.now(MealTime.SEOUL));
        context.getSystemService(AlarmManager.class).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,
                next.toInstant().toEpochMilli(), trigger(context));
    }

    private static PendingIntent trigger(Context context) {
        return PendingIntent.getBroadcast(context, 0, new Intent(context, MorningMeal.class).setAction(ACTION),
                PendingIntent.FLAG_IMMUTABLE);
    }

    @Override public void onReceive(Context context, Intent intent) {
        if (!enabled(context)) return;
        ZonedDateTime now = ZonedDateTime.now(MealTime.SEOUL);
        schedule(context);
        if (!ACTION.equals(intent.getAction()) || !inWindow(now.toLocalDate(), now)) return;
        var scheduler = context.getSystemService(JobScheduler.class);
        if (scheduler.getPendingJob(JOB_ID) != null) return;
        var extras = new PersistableBundle();
        extras.putString(JOB_DAY, now.toLocalDate().toString());
        scheduler.schedule(new JobInfo.Builder(JOB_ID, new ComponentName(context, WidgetRefreshJob.class))
                .setExtras(extras)
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setBackoffCriteria(10 * 60_000L, JobInfo.BACKOFF_POLICY_EXPONENTIAL)
                .build());
    }

    static boolean deliver(Context context, String dayValue) {
        if (dayValue == null) return false;
        LocalDate day = LocalDate.parse(dayValue);
        if (!enabled(context) || !inWindow(day, ZonedDateTime.now(MealTime.SEOUL))
                || dayValue.equals(prefs(context).getString("sent", ""))) return false;
        var manager = context.getSystemService(NotificationManager.class);
        if (!manager.areNotificationsEnabled()) return false;

        var meals = SchoolMeals.cached(context, day);
        if (meals == null) {
            try {
                SchoolMeals.refresh(context, day);
                meals = SchoolMeals.cached(context, day);
            } catch (IOException | JSONException error) { return true; }
        }
        if (meals == null || meals.isEmpty() || !enabled(context) || Thread.currentThread().isInterrupted()) return false;
        StringBuilder text = new StringBuilder();
        for (var meal : meals) {
            if (text.length() > 0) text.append('\n');
            text.append(meal.name()).append(" · ").append(String.join(", ", meal.dishes()));
        }
        if (!inWindow(day, ZonedDateTime.now(MealTime.SEOUL))) return false;
        manager.createNotificationChannel(new NotificationChannel(CHANNEL, "아침 급식 알림", NotificationManager.IMPORTANCE_DEFAULT));
        if (manager.getNotificationChannel(CHANNEL).getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
        var route = new Intent(Intent.ACTION_VIEW, Uri.parse(WidgetKind.MEAL.url), context, MainActivity.class);
        var open = PendingIntent.getActivity(context, 107, route, PendingIntent.FLAG_IMMUTABLE);
        var first = meals.get(0);
        String preview = first.name() + " · " + String.join(", ", first.dishes());
        var notification = new Notification.Builder(context, CHANNEL).setSmallIcon(R.drawable.widget_icon)
                .setContentTitle("오늘 풍산고 급식").setContentText(preview)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(open).setAutoCancel(true).setOnlyAlertOnce(true).build();
        synchronized (MorningMeal.class) {
            if (!enabled(context) || dayValue.equals(prefs(context).getString("sent", ""))) return false;
            try { manager.notify(NOTIFICATION_ID, notification); }
            catch (SecurityException permissionRevoked) { return false; }
            prefs(context).edit().putString("sent", dayValue).apply();
        }
        return false;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
