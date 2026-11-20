import SwiftUI
import WidgetKit

struct MealEntry: TimelineEntry {
    let date: Date
    let title: String
    let menu: String

    init(date: Date, title: String = "오늘 급식", menu: String) {
        self.date = date
        self.title = title
        self.menu = menu
    }

    init(date: Date, meals: [Meal]?) {
        if let meal = meals?.first(where: { $0.code == "2" }) ?? meals?.first {
            self.init(date: date, title: "오늘 \(meal.name)", menu: meal.dishes.joined(separator: " · "))
        } else {
            self.init(date: date, menu: meals == nil ? "급식을 불러오지 못했어요" : "등록된 급식이 없어요")
        }
    }
}

struct MealTimeline: TimelineProvider {
    func placeholder(in context: Context) -> MealEntry {
        MealEntry(date: .now, title: "오늘 중식", menu: "쌀밥 · 미역국 · 닭볶음탕 · 배추김치")
    }

    func getSnapshot(in context: Context, completion: @escaping (MealEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
        } else {
            Task {
                let now = Date()
                completion(MealEntry(date: now, meals: await SchoolMeals.fetch(now)))
            }
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MealEntry>) -> Void) {
        Task {
            let now = Date()
            let calendar = SchoolMeals.calendar
            let midnight = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now))!
            async let today = SchoolMeals.fetch(now)
            async let tomorrow = SchoolMeals.fetch(midnight)
            let (todayMeals, tomorrowMeals) = await (today, tomorrow)
            let entries = [
                MealEntry(date: now, meals: todayMeals),
                MealEntry(date: midnight, meals: tomorrowMeals)
            ]
            let interval: TimeInterval = todayMeals == nil ? 1_800 : 10_800
            completion(Timeline(entries: entries, policy: .after(min(midnight, now.addingTimeInterval(interval)))))
        }
    }
}

struct MealWidgetView: View {
    let entry: MealEntry
    @Environment(\.widgetFamily) private var size

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("오풍  ·  \(SchoolMeals.label(entry.date))")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(Color(red: 0.72, green: 0.80, blue: 0.98))
                .lineLimit(1)
            Text(entry.title)
                .font(size == .systemSmall ? .headline : .title3.bold())
                .lineLimit(1)
            Text(entry.menu)
                .font(.footnote)
                .lineLimit(size == .systemSmall ? 4 : 5)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(for: .widget) {
            Color(red: 0.071, green: 0.157, blue: 0.376)
        }
        .widgetURL(URL(string: "opoong://meal"))
    }
}

@main
struct MealWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "OPoongMeal", provider: MealTimeline()) { entry in
            MealWidgetView(entry: entry)
        }
        .configurationDisplayName("오풍 · 오늘 급식")
        .description("풍산고의 오늘 급식을 보고 오풍 급식 화면을 열어요.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
