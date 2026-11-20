package kr.opoong.mobile;

import android.appwidget.AppWidgetProvider;
import android.graphics.Color;

enum WidgetKind {
    MEAL("오늘 급식", "오늘 식단", "https://hyukjunps.github.io/?page=meal",
            MealWidget.class, R.drawable.meal_background, R.drawable.meal_symbol, "#FEC1AB", 1),
    WEATHER("풍산고 날씨", "현재 기온과 날씨", "https://hyukjunps.github.io/",
            WidgetProvider.Weather.class, R.drawable.weather_background, R.drawable.weather_symbol, "#B4DEFF", 2),
    SCHEDULE("학사일정", "오늘부터 7일", "https://hyukjunps.github.io/?page=schedule",
            WidgetProvider.Schedule.class, R.drawable.schedule_background, R.drawable.schedule_symbol, "#DDCDFF", 3),
    ONWAY("온웨이에듀", "상벌점 · 외출 관리", "https://ps.onwayedu.co.kr/login/login.php",
            WidgetProvider.Onway.class, R.drawable.onway_background, R.drawable.onway_symbol, "#A3F3DC", 0);

    final String label;
    final String description;
    final String url;
    final Class<? extends AppWidgetProvider> provider;
    final int background;
    final int symbol;
    final int accent;
    final int jobId;

    WidgetKind(String label, String description, String url, Class<? extends AppWidgetProvider> provider,
               int background, int symbol, String accent, int jobId) {
        this.label = label;
        this.description = description;
        this.url = url;
        this.provider = provider;
        this.background = background;
        this.symbol = symbol;
        this.accent = Color.parseColor(accent);
        this.jobId = jobId;
    }
}
