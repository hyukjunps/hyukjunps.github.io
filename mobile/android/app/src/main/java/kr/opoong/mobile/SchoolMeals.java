package kr.opoong.mobile;

import android.content.Context;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class SchoolMeals {
    private static final String ENDPOINT = "https://open.neis.go.kr/hub/mealServiceDietInfo"
            + "?Type=json&pSize=10&ATPT_OFCDC_SC_CODE=R10&SD_SCHUL_CODE=8750475&MLSV_YMD=";
    record Meal(int code, String name, List<String> dishes) {}

    static LocalDate today() {
        return LocalDate.now(ZoneId.of("Asia/Seoul"));
    }

    static List<Meal> cached(Context context, LocalDate day) {
        String raw = context.getSharedPreferences("meals", Context.MODE_PRIVATE).getString(day.toString(), null);
        if (raw == null) return null;
        try {
            return parse(raw);
        } catch (JSONException | IOException error) {
            return null;
        }
    }

    static void refresh(Context context, LocalDate day) throws IOException, JSONException {
        HttpURLConnection connection = (HttpURLConnection)
                new URL(ENDPOINT + day.format(DateTimeFormatter.BASIC_ISO_DATE)).openConnection();
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(8000);
        try (InputStream input = connection.getInputStream()) {
            byte[] bytes = new byte[65537];
            int length = 0;
            while (length < bytes.length) {
                int count = input.read(bytes, length, bytes.length - length);
                if (count < 0) break;
                length += count;
            }
            if (length == bytes.length) throw new IOException("Meal response exceeds 64 KiB");
            String raw = new String(bytes, 0, length, StandardCharsets.UTF_8);
            parse(raw);
            var preferences = context.getSharedPreferences("meals", Context.MODE_PRIVATE);
            var editor = preferences.edit();
            for (String key : preferences.getAll().keySet()) {
                if (key.compareTo(day.minusDays(1).toString()) < 0) editor.remove(key);
            }
            editor.putString(day.toString(), raw).apply();
        } finally {
            connection.disconnect();
        }
    }

    static List<Meal> parse(String raw) throws JSONException, IOException {
        JSONObject response = new JSONObject(raw);
        JSONObject result = response.optJSONObject("RESULT");
        if (result != null && "INFO-200".equals(result.optString("CODE"))) return Collections.emptyList();
        JSONArray rows = response.getJSONArray("mealServiceDietInfo").getJSONObject(1).getJSONArray("row");
        List<Meal> meals = new ArrayList<>();
        for (int index = 0; index < rows.length(); index++) {
            JSONObject row = rows.getJSONObject(index);
            String name = row.getString("MMEAL_SC_NM").trim();
            List<String> dishes = new ArrayList<>();
            for (String line : row.getString("DDISH_NM").split("(?i)<br\\s*/?>|\\R")) {
                String dish = line.replaceAll("\\s*\\([0-9.]+\\)", "").trim();
                if (!dish.isEmpty()) dishes.add(dish);
            }
            if (!name.isEmpty() && !dishes.isEmpty()) meals.add(new Meal(row.getInt("MMEAL_SC_CODE"), name, dishes));
        }
        if (meals.isEmpty()) throw new IOException("No usable meal records");
        meals.sort(Comparator.comparingInt(Meal::code));
        return meals;
    }
}
