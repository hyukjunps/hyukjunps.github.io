import SwiftUI
import WidgetKit

struct WidgetEntry: TimelineEntry {
    let date: Date
    let card: WidgetCard
}

struct WidgetTimeline: TimelineProvider {
    let kind: WidgetKind

    func placeholder(in context: Context) -> WidgetEntry {
        let card: WidgetCard
        switch kind {
        case .meal:
            card = WidgetCard("오늘 급식", "중식", "잔치국수 · 고기배추만두찜 · 오이양파무침", "11월 20일 금")
        case .weather:
            card = WidgetCard("풍산고 날씨", "12°", "구름 조금 · 습도 52%", "09:00 · 오풍")
        case .schedule:
            card = WidgetCard("학사일정", "필수 귀가", "11.27 · 교내 행사", "오늘 · 앞으로 7일")
        case .onway:
            card = WidgetData.onway
        }
        return WidgetEntry(date: .now, card: card)
    }

    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
        } else {
            getTimeline(in: context) { timeline in completion(timeline.entries[0]) }
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        let now = Date()
        if kind == .onway {
            completion(Timeline(entries: [WidgetEntry(date: now, card: WidgetData.onway)], policy: .never))
            return
        }
        Task {
            let calendar = SchoolMeals.calendar
            let midnight = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now))!
            let today: WidgetCard?
            let tomorrow: WidgetCard?
            let interval: TimeInterval
            switch kind {
            case .meal:
                async let current = WidgetData.meal(now)
                async let next = WidgetData.meal(midnight)
                (today, tomorrow) = await (current, next)
                interval = today == nil ? 1_800 : 10_800
            case .weather:
                today = await WidgetData.weather()
                tomorrow = nil
                interval = 1_800
            case .schedule:
                let endDate = calendar.date(byAdding: .day, value: 6, to: midnight)!
                let months = await WidgetData.schedule(from: now, through: endDate)
                today = WidgetData.scheduleCard(now, months: months)
                tomorrow = WidgetData.scheduleCard(midnight, months: months)
                interval = today == nil ? 1_800 : 10_800
            case .onway:
                return
            }
            var entries = [WidgetEntry(date: now, card: today ?? WidgetData.missing(kind))]
            if kind == .weather {
                entries.append(WidgetEntry(date: now.addingTimeInterval(10_800), card: WidgetData.missing(kind)))
            } else {
                entries.append(WidgetEntry(date: midnight, card: tomorrow ?? WidgetData.missing(kind)))
            }
            let nextUpdate = now.addingTimeInterval(interval)
            completion(Timeline(entries: entries, policy: .after(kind == .weather ? nextUpdate : min(midnight, nextUpdate))))
        }
    }
}

struct WidgetCardView: View {
    let kind: WidgetKind
    let entry: WidgetEntry
    @Environment(\.widgetFamily) private var size

    private var small: Bool { size == .systemSmall }

    var body: some View {
        let card = entry.card
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(card.label)
                    .font(.caption.weight(.semibold))
                    .lineLimit(1)
                Spacer(minLength: 3)
                Image(systemName: kind.symbol)
                    .font(.system(size: 19, weight: .medium))
                    .widgetAccentable()
                    .accessibilityHidden(true)
            }
            .foregroundStyle(kind.accent)

            Text(card.title)
                .font(kind == .weather && card.title.hasSuffix("°")
                      ? .system(size: 38, weight: .semibold, design: .rounded)
                      : .system(size: small ? 19 : 25, weight: .bold))
                .minimumScaleFactor(0.78)
                .lineLimit(small ? 2 : 1)
                .foregroundStyle(.white)

            Text(small ? card.compactDetail : card.detail)
                .font(.caption)
                .lineLimit(small ? 2 : 3)
                .foregroundStyle(.white.opacity(0.84))

            Spacer(minLength: 0)
            Text(card.footer)
                .font(.caption2.weight(.medium))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
                .foregroundStyle(kind.accent.opacity(0.9))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(for: .widget) { kind.background }
        .widgetURL(kind.widgetURL)
    }
}

struct OPoongWidget: Widget {
    let kind: WidgetKind

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind == .meal ? "OPoongMeal" : "OPoong-\(kind.rawValue)",
                            provider: WidgetTimeline(kind: kind)) { entry in
            WidgetCardView(kind: kind, entry: entry)
        }
        .configurationDisplayName("오풍 · \(kind.label)")
        .description(kind.description)
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct OPoongWidgetBundle: WidgetBundle {
    var body: some Widget {
        OPoongWidget(kind: .meal)
        OPoongWidget(kind: .weather)
        OPoongWidget(kind: .schedule)
        OPoongWidget(kind: .onway)
    }
}
