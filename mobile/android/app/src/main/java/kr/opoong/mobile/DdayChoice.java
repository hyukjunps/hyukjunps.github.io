package kr.opoong.mobile;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import java.time.LocalDate;

record DdayChoice(String mode, String title, LocalDate date) {
    static final String HOME = "home";
    static final String EXAM = "exam";
    static final String CUSTOM = "custom";
    private static final String PREFS = "dday-widgets";

    static boolean bound(Context context, int id) {
        var info = AppWidgetManager.getInstance(context).getAppWidgetInfo(id);
        return info != null && new ComponentName(context, WidgetProvider.Dday.class).equals(info.provider);
    }

    static DdayChoice load(Context context, int id) {
        var prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return parse(prefs.getString("mode-" + id, ""), prefs.getString("title-" + id, ""),
                prefs.getString("date-" + id, ""));
    }

    static DdayChoice fromIntent(Intent intent) {
        return parse(intent.getStringExtra("mode"), intent.getStringExtra("title"), intent.getStringExtra("date"));
    }

    private static DdayChoice parse(String mode, String title, String date) {
        if (HOME.equals(mode) || EXAM.equals(mode)) return new DdayChoice(mode, "", null);
        if (CUSTOM.equals(mode) && title != null && !title.trim().isEmpty() && title.length() <= 40 && date != null) {
            try { return new DdayChoice(mode, title.trim(), LocalDate.parse(date)); }
            catch (java.time.DateTimeException ignored) {}
        }
        return null;
    }

    Intent addTo(Intent intent) {
        return intent.putExtra("mode", mode).putExtra("title", title)
                .putExtra("date", date == null ? "" : date.toString());
    }

    void save(Context context, int id) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("mode-" + id, mode)
                .putString("title-" + id, title).putString("date-" + id, date == null ? "" : date.toString()).apply();
    }

    static void remove(Context context, int[] ids) {
        var editor = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        for (int id : ids) editor.remove("mode-" + id).remove("title-" + id).remove("date-" + id);
        editor.apply();
    }

    WidgetData.Card card(Context context, LocalDate today, boolean failed) {
        if (CUSTOM.equals(mode)) return SiteSnapshot.ddayEventCard("나의 D-DAY", today, title, date);
        boolean home = HOME.equals(mode);
        String label = home ? "귀가 D-DAY" : "시험 D-DAY";
        var event = WidgetData.suggestedDday(context, today, home ? WidgetData::isHomeDay : WidgetData::isExamDay);
        if (event != null) return SiteSnapshot.ddayEventCard(label, today, event.title(), event.day());
        if (!WidgetData.hasSchoolSchedule(context, today)) {
            String detail = failed ? "학교 일정을 다시 불러와 주세요" : "학교 일정을 불러오고 있어요";
            return new WidgetData.Card(label, failed ? "조회 실패" : "확인 중", detail, detail, "");
        }
        String detail = "새 일정이 올라오면 표시돼요";
        return new WidgetData.Card(label, home ? "예정된 귀가 없음" : "예정된 시험 없음", detail, detail, "");
    }
}
