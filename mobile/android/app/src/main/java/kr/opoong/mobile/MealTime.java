package kr.opoong.mobile;

import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

final class MealTime {
    static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final LocalTime LUNCH = LocalTime.of(10, 0);
    private static final LocalTime DINNER = LocalTime.of(15, 0);

    static <T> T select(List<T> meals, java.util.function.ToIntFunction<T> code, LocalTime now) {
        int wanted = now.isBefore(LUNCH) ? 1 : now.isBefore(DINNER) ? 2 : 3;
        T latest = meals.get(0);
        for (T meal : meals) {
            if (code.applyAsInt(meal) >= wanted) return meal;
            latest = meal;
        }
        return latest;
    }

    static ZonedDateTime nextChange(ZonedDateTime now) {
        var date = now.toLocalDate();
        LocalTime time = now.toLocalTime();
        if (time.isBefore(LUNCH)) return date.atTime(LUNCH).atZone(SEOUL);
        if (time.isBefore(DINNER)) return date.atTime(DINNER).atZone(SEOUL);
        return date.plusDays(1).atStartOfDay(SEOUL);
    }
}
