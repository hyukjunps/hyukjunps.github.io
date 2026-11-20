package kr.opoong.mobile;

import android.content.Context;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class SiteSnapshot {
    static final String SCRIPT = """
        (() => {
          if (location.origin !== 'https://hyukjunps.github.io' ||
              typeof ddayToday !== 'function') return null;
          const clean = items => (Array.isArray(items) ? items : [])
            .filter(item => item && typeof item.title === 'string' && typeof item.date === 'string')
            .slice(0, 100)
            .map(({title, date}) => ({title: title.trim().slice(0, 60), date: date.slice(0, 10)}));
          const read = (key, fallback) => {
            try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
            catch (_) { return fallback; }
          };
          const date = ddayToday();
          const keepPast = localStorage.getItem('opoong_dday_expire_v1') === '0';
          const saved = clean(read('opoong_ddays_v1', []));
          const auto = localStorage.getItem('opoong_dday_auto_v1') !== '0';
          const automatic = auto
            ? clean((typeof ddayAutoItems !== 'undefined' && ddayAutoItems.length)
                ? ddayAutoItems : read('opoong_dday_auto_cache_v1', {}).items).filter(item => item.date >= date)
            : [];
          return {keepPast, auto, ddays: automatic.concat(saved)};
        })()
        """;

    private static final DateTimeFormatter DATE_LABEL = DateTimeFormatter.ofPattern("M월 d일 EEE", Locale.KOREAN);
    private static final String CACHE = "opoong-site";
    record Dday(LocalDate date, String title) {}

    static void saveDdays(Context context, JSONObject snapshot) {
        JSONArray ddays = snapshot.optJSONArray("ddays");
        if (ddays == null) return;
        String data = ddays.toString();
        boolean keepPast = snapshot.optBoolean("keepPast");
        var cache = context.getSharedPreferences(CACHE, Context.MODE_PRIVATE);
        boolean auto = snapshot.optBoolean("auto", true);
        if (data.equals(cache.getString("ddays", null)) && keepPast == cache.getBoolean("keepPast", false)
                && auto == cache.getBoolean("auto", true)) return;
        cache.edit().putString("ddays", data).putBoolean("keepPast", keepPast).putBoolean("auto", auto).apply();
        WidgetProvider.renderAll(context, WidgetKind.DDAY, false);
    }

    static WidgetData.Card ddayCard(Context context, LocalDate today) {
        var cache = context.getSharedPreferences(CACHE, Context.MODE_PRIVATE);
        Dday upcoming = null;
        Dday past = null;
        try {
            JSONArray items = new JSONArray(cache.getString("ddays", "[]"));
            for (int index = 0; index < items.length(); index++) {
                JSONObject item = items.optJSONObject(index);
                if (item == null) continue;
                String title = item.optString("title").trim();
                if (title.isEmpty()) continue;
                LocalDate date;
                try { date = LocalDate.parse(item.optString("date")); }
                catch (java.time.DateTimeException error) { continue; }
                if (!date.isBefore(today)) {
                    if (upcoming == null || date.isBefore(upcoming.date())) upcoming = new Dday(date, title);
                } else if (past == null || date.isAfter(past.date())) {
                    past = new Dday(date, title);
                }
            }
        } catch (JSONException error) {
            // A fresh snapshot will repopulate the cache on opening the app.
        }
        if (cache.getBoolean("auto", true)) {
            var recommendation = WidgetData.suggestedDday(context, today);
            if (recommendation != null && (upcoming == null || !recommendation.day().isAfter(upcoming.date()))) {
                upcoming = new Dday(recommendation.day(), recommendation.title());
            }
        }
        Dday choice = upcoming == null && cache.getBoolean("keepPast", false) ? past : upcoming;
        if (choice == null) {
            if (cache.getBoolean("auto", true)) {
                return new WidgetData.Card("나의 D-DAY", "일정 확인 중", "가까운 학교 일정을 찾아요",
                        "학교 일정 자동 추천", "");
            }
            return new WidgetData.Card("나의 D-DAY", "일정 추가", "누르고 날짜를 등록하세요",
                    "누르고 날짜를 등록하세요", "");
        }
        return ddayEventCard("나의 D-DAY", today, choice.title(), choice.date());
    }

    static WidgetData.Card ddayEventCard(String label, LocalDate today, String title, LocalDate date) {
        long days = ChronoUnit.DAYS.between(today, date);
        String count = days > 0 ? "D-" + days : days < 0 ? "D+" + -days : "D-DAY";
        String footer = date.format(DATE_LABEL);
        return new WidgetData.Card(label, count, title, title, footer);
    }

}
