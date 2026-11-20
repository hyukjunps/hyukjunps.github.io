package kr.opoong.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.json.JSONException;
import org.json.JSONObject;

final class WidgetData {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter LABEL_DATE = DateTimeFormatter.ofPattern("M월 d일 EEE", Locale.KOREAN);
    private static final DateTimeFormatter SHORT_DATE = DateTimeFormatter.ofPattern("M.d", Locale.KOREAN);
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("uuuuMM", Locale.ROOT);
    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm", Locale.ROOT).withZone(SEOUL);
    private static final String WEATHER_URL = "https://gkrtkdlfwjd.yyhhjj1068-c2c.workers.dev/weather";
    private static final String WEATHER_FALLBACK = "https://api.open-meteo.com/v1/forecast"
            + "?latitude=36.58415&longitude=128.56654&current=temperature_2m,relative_humidity_2m,weather_code"
            + "&timezone=Asia%2FSeoul&forecast_days=1";
    private static final String SCHEDULE_URL = "https://hyukjunps.github.io/data/schedule/";

    record Card(String label, String title, String detail, String compactDetail, String footer) {}
    private record Event(LocalDate day, String title) {}

    static Card card(Context context, WidgetKind kind, boolean failed) {
        LocalDate today = SchoolMeals.today();
        if (kind == WidgetKind.DDAY) return SiteSnapshot.ddayCard(context, today);
        if (kind == WidgetKind.ONWAY) {
            return new Card("학교생활", "온웨이에듀", "상벌점 · 외출 관리", "상벌점 · 외출 관리", "로그인 열기  ↗");
        }
        Card card = switch (kind) {
            case MEAL -> mealCard(context, today);
            case WEATHER -> weatherCard(context);
            case SCHEDULE -> scheduleCard(context, today);
            case ONWAY, DDAY -> throw new IllegalStateException();
        };
        if (card != null) return card;
        boolean offline = context.getSystemService(ConnectivityManager.class).getActiveNetwork() == null;
        String status = offline ? "인터넷에 연결해 주세요" : failed ? "잠시 후 다시 확인해 주세요" : "최신 정보를 불러오고 있어요";
        return new Card(kind.label, offline || failed ? "업데이트 대기" : "확인 중", status, status, "풍산고등학교");
    }

    private static Card mealCard(Context context, LocalDate day) {
        var meals = SchoolMeals.cached(context, day);
        if (meals == null) return null;
        String date = day.format(LABEL_DATE);
        if (meals.isEmpty()) return new Card("오늘 급식", "등록된 식단 없음", "급식 페이지에서 확인", "급식 페이지에서 확인", date);
        var meal = meals.stream().filter(item -> item.code() == 2).findFirst().orElse(meals.get(0));
        List<String> dishes = meal.dishes();
        return new Card("오늘 급식", meal.name(), String.join(" · ", dishes),
                String.join(" · ", dishes.subList(0, Math.min(3, dishes.size()))), date);
    }

    private static Card weatherCard(Context context) {
        JSONObject weather = cached(context, "weather", Duration.ofHours(3));
        if (weather == null) return null;
        int temperature = weather.optInt("temperature");
        String details = weather.optString("condition") + " · 습도 " + weather.optInt("humidity") + "%";
        String source = weather.optString("source");
        String time = CLOCK.format(Instant.ofEpochMilli(weather.optLong("observedAt")));
        return new Card("풍산고 날씨", temperature + "°", details, details, time + " · " + source);
    }

    private static Card scheduleCard(Context context, LocalDate today) {
        List<Event> events = new ArrayList<>();
        String selectedMonth = "";
        JSONObject byDate = null;
        boolean complete = true;
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (int offset = 0; offset < 7; offset++) {
            LocalDate day = today.plusDays(offset);
            String month = day.format(MONTH);
            if (!month.equals(selectedMonth)) {
                byDate = cached(context, "schedule-" + month, Duration.ofHours(48));
                selectedMonth = month;
            }
            if (byDate == null) {
                complete = false;
                continue;
            }
            var rows = byDate.optJSONArray(day.toString());
            if (rows == null) continue;
            for (int row = 0; row < rows.length(); row++) {
                var event = rows.optJSONObject(row);
                if (event == null) continue;
                String title = event.optString("title").trim();
                String key = event.optString("seq").trim().isEmpty() ? title : event.optString("seq");
                if (!title.isEmpty() && seen.add(key)) events.add(new Event(day, title));
            }
        }
        if (events.isEmpty()) return complete
                ? new Card("학사일정", "예정된 일정 없음", "오늘부터 7일 기준", "오늘부터 7일 기준", "풍산고등학교") : null;
        Event first = events.get(0);
        List<String> lines = new ArrayList<>();
        for (int i = 1; i < Math.min(3, events.size()); i++) {
            Event event = events.get(i);
            lines.add(eventLabel(event.day(), today) + " · " + event.title());
        }
        String firstDate = eventLabel(first.day(), today);
        return new Card("학사일정", first.title(),
                lines.isEmpty() ? "학교 일정 자세히 보기" : String.join("\n", lines),
                lines.isEmpty() ? "일정 자세히 보기" : lines.get(0),
                complete ? firstDate + " · 앞으로 7일" : firstDate + " · 일부 일정");
    }

    private static String eventLabel(LocalDate day, LocalDate today) {
        return day.equals(today) ? "오늘" : day.equals(today.plusDays(1)) ? "내일" : day.format(SHORT_DATE);
    }

    static void refresh(Context context, WidgetKind kind) throws IOException, JSONException {
        LocalDate today = SchoolMeals.today();
        switch (kind) {
            case MEAL -> SchoolMeals.refresh(context, today);
            case WEATHER -> refreshWeather(context);
            case SCHEDULE -> {
                YearMonth first = YearMonth.from(today);
                YearMonth last = YearMonth.from(today.plusDays(6));
                try {
                    refreshSchedule(context, first);
                } finally {
                    if (!first.equals(last)) refreshSchedule(context, last);
                }
            }
            case ONWAY, DDAY -> { }
        }
    }

    private static void refreshWeather(Context context) throws IOException, JSONException {
        try {
            JSONObject response = request(WEATHER_URL, 4500);
            if (!response.optBoolean("ok")) throw new IOException("Weather service response");
            JSONObject current = response.getJSONObject("current");
            double temperature = current.getDouble("temperatureC");
            int humidity = current.getInt("humidityPercent");
            var hourly = response.optJSONArray("hourly");
            var forecast = hourly == null ? null : hourly.optJSONObject(0);
            String precipitation = current.optString("precipitationType");
            String condition = !precipitation.trim().isEmpty() && !precipitation.equals("없음")
                    ? precipitation : forecast == null ? "현재 날씨" : forecast.optString("sky", "현재 날씨");
            Instant observedAt = OffsetDateTime.parse(current.getString("observedAt")).toInstant();
            storeWeather(context, temperature, humidity, condition, observedAt, "오풍");
        } catch (IOException | JSONException | java.time.DateTimeException error) {
            JSONObject current = request(WEATHER_FALLBACK, 6500).getJSONObject("current");
            try {
                Instant observedAt = LocalDateTime.parse(current.getString("time")).atZone(SEOUL).toInstant();
                storeWeather(context, current.getDouble("temperature_2m"), current.getInt("relative_humidity_2m"),
                        weatherCode(current.getInt("weather_code")), observedAt, "Open-Meteo");
            } catch (java.time.DateTimeException invalidTime) {
                throw new IOException("Weather timestamp", invalidTime);
            }
        }
    }

    private static void storeWeather(Context context, double temperature, int humidity, String condition,
                                     Instant observedAt, String source) throws IOException, JSONException {
        long age = Duration.between(observedAt, Instant.now()).toMinutes();
        if (!Double.isFinite(temperature) || humidity < 0 || humidity > 100 || age < -15 || age > 180) {
            throw new IOException("Invalid or outdated weather");
        }
        JSONObject weather = new JSONObject().put("temperature", Math.round(temperature)).put("humidity", humidity)
                .put("condition", condition).put("observedAt", observedAt.toEpochMilli()).put("source", source);
        save(context, "weather", weather, observedAt.toEpochMilli());
    }

    private static String weatherCode(int code) {
        if (code == 0) return "맑음";
        if (code == 1 || code == 2) return "구름 조금";
        if (code == 3) return "흐림";
        if (code == 45 || code == 48) return "안개";
        if (code == 71 || code == 73 || code == 75 || code == 77 || code == 85 || code == 86) return "눈";
        if (code >= 95) return "뇌우";
        return code >= 51 ? "비" : "현재 날씨";
    }

    private static void refreshSchedule(Context context, YearMonth month) throws IOException, JSONException {
        String key = month.format(MONTH);
        JSONObject data = request(SCHEDULE_URL + key + ".json", 6500);
        if (!data.optBoolean("ok") || !key.equals(data.optString("ym"))) throw new IOException("Schedule month mismatch");
        save(context, "schedule-" + key, data.getJSONObject("byDate"), System.currentTimeMillis());
    }

    private static JSONObject request(String address, int timeout) throws IOException, JSONException {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setConnectTimeout(timeout);
        connection.setReadTimeout(timeout);
        connection.setUseCaches(false);
        try (var input = connection.getInputStream()) {
            byte[] chunk = new byte[4096];
            var output = new ByteArrayOutputStream();
            for (int size; (size = input.read(chunk)) != -1;) {
                if (output.size() + size > 524288) throw new IOException("Widget response too large");
                output.write(chunk, 0, size);
            }
            return new JSONObject(new String(output.toByteArray(), StandardCharsets.UTF_8));
        } finally {
            connection.disconnect();
        }
    }

    private static SharedPreferences cache(Context context) {
        return context.getSharedPreferences("widgets", Context.MODE_PRIVATE);
    }

    private static void save(Context context, String key, JSONObject data, long time) {
        var editor = cache(context).edit();
        if (key.startsWith("schedule-")) {
            String oldest = "schedule-" + YearMonth.from(SchoolMeals.today()).minusMonths(1).format(MONTH);
            for (String item : cache(context).getAll().keySet()) {
                if (item.startsWith("schedule-") && item.compareTo(oldest) < 0) editor.remove(item);
            }
        }
        editor.putString(key, data.toString()).putLong(key + "-time", time).apply();
    }

    private static JSONObject cached(Context context, String key, Duration duration) {
        var cache = cache(context);
        long timestamp = cache.getLong(key + "-time", 0);
        if (timestamp <= 0 || System.currentTimeMillis() - timestamp > duration.toMillis()) return null;
        String data = cache.getString(key, null);
        if (data == null) return null;
        try { return new JSONObject(data); }
        catch (JSONException error) { return null; }
    }
}
