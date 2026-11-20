package kr.opoong.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public final class ClassNowNotification {
    private static final String CHANNEL = "opoong_class_now";
    private static final int ID = 100;
    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm", Locale.KOREAN)
            .withZone(ZoneId.of("Asia/Seoul"));

    static boolean post(Context context, SiteSnapshot.Lesson lesson) {
        long duration = lesson.deadline() - System.currentTimeMillis();
        var manager = context.getSystemService(NotificationManager.class);
        if (duration <= 0 || !manager.areNotificationsEnabled()) return false;
        manager.createNotificationChannel(new NotificationChannel(CHANNEL, "수업 Now Bar", NotificationManager.IMPORTANCE_LOW));
        if (manager.getNotificationChannel(CHANNEL).getImportance() == NotificationManager.IMPORTANCE_NONE) return false;

        var destination = Uri.parse("https://hyukjunps.github.io/?page=timetable");
        var open = PendingIntent.getActivity(context, 101, new Intent(Intent.ACTION_VIEW, destination, context, MainActivity.class),
                PendingIntent.FLAG_IMMUTABLE);
        var stop = PendingIntent.getBroadcast(context, 102, new Intent(context, End.class), PendingIntent.FLAG_IMMUTABLE);
        String clock = CLOCK.format(Instant.ofEpochMilli(lesson.deadline()));
        var builder = new Notification.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.widget_icon)
                .setContentTitle(lesson.period() + "교시 · " + lesson.subject())
                .setContentText(clock + (lesson.upcoming() ? " 시작" : " 종료"))
                .setCategory(Notification.CATEGORY_STOPWATCH)
                .setWhen(lesson.deadline())
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setTimeoutAfter(duration)
                .setContentIntent(open)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .addAction(new Notification.Action.Builder(null, "종료", stop).build());
        if (Build.VERSION.SDK_INT >= 36) {
            var extras = new Bundle();
            extras.putBoolean("android.requestPromotedOngoing", true);
            builder.addExtras(extras);
        }
        try {
            manager.notify(ID, builder.build());
            return true;
        } catch (SecurityException revoked) {
            return false;
        }
    }

    public static final class End extends BroadcastReceiver {
        @Override public void onReceive(Context context, Intent intent) {
            context.getSystemService(NotificationManager.class).cancel(ID);
        }
    }
}
