package kr.opoong.mobile;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import java.time.ZonedDateTime;

public final class MealWidget extends WidgetProvider {
    private static final String CHANGE_MEAL = "kr.opoong.mobile.CHANGE_MEAL";

    @Override WidgetKind kind() { return WidgetKind.MEAL; }

    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (CHANGE_MEAL.equals(action) || Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            renderAll(context, kind(), false);
            WidgetRefreshJob.schedule(context, kind());
        }
        if (ids(context, kind()).length > 0) scheduleSwitch(context);
    }

    @Override public void onDisabled(Context context) {
        super.onDisabled(context);
        context.getSystemService(AlarmManager.class).cancel(switchAlarm(context));
    }

    private static void scheduleSwitch(Context context) {
        var next = MealTime.nextChange(ZonedDateTime.now(MealTime.SEOUL));
        context.getSystemService(AlarmManager.class).set(AlarmManager.RTC,
                next.toInstant().toEpochMilli(), switchAlarm(context));
    }

    private static PendingIntent switchAlarm(Context context) {
        return PendingIntent.getBroadcast(context, 0, new Intent(context, MealWidget.class).setAction(CHANGE_MEAL),
                PendingIntent.FLAG_IMMUTABLE);
    }
}
