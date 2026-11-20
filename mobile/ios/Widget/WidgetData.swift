import Foundation

struct WidgetCard {
    let label: String
    let title: String
    let detail: String
    let compactDetail: String
    let footer: String

    init(_ label: String, _ title: String, _ detail: String, _ footer: String, compact: String? = nil) {
        self.label = label
        self.title = title
        self.detail = detail
        self.compactDetail = compact ?? detail
        self.footer = footer
    }
}

enum WidgetData {
    static let onway = WidgetCard("학교생활", "온웨이에듀", "상벌점 · 외출 관리", "로그인 열기  ↗")
    private static let weatherURL = URL(string: "https://gkrtkdlfwjd.yyhhjj1068-c2c.workers.dev/weather")!
    private static let forecastURL = URL(string: "https://api.open-meteo.com/v1/forecast?latitude=36.58415&longitude=128.56654&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FSeoul&forecast_days=1")!

    private struct Weather: Codable {
        let temperature: Int
        let humidity: Int
        let condition: String
        let observedAt: Date
        let source: String

        var card: WidgetCard {
            let time = WidgetData.format(observedAt, "HH:mm")
            return WidgetCard("풍산고 날씨", "\(temperature)°", "\(condition) · 습도 \(humidity)%", "\(time) · \(source)")
        }

        var isFresh: Bool {
            let age = Date().timeIntervalSince(observedAt)
            return age >= -900 && age <= 10_800
        }
    }

    private struct OpoongWeather: Decodable {
        struct Current: Decodable {
            let observedAt: Date
            let temperatureC: Double
            let humidityPercent: Int
            let precipitationType: String?
        }
        struct Hour: Decodable { let sky: String? }
        let ok: Bool
        let current: Current
        let hourly: [Hour]?
    }

    private struct Forecast: Decodable {
        struct Current: Decodable {
            let time: String
            let temperature: Double
            let humidity: Int
            let code: Int

            enum CodingKeys: String, CodingKey {
                case time
                case temperature = "temperature_2m"
                case humidity = "relative_humidity_2m"
                case code = "weather_code"
            }
        }
        let current: Current
    }

    struct SchoolEvent: Codable {
        let title: String
        let seq: String?
    }

    private struct ScheduleMonth: Decodable {
        let ok: Bool
        let ym: String
        let byDate: [String: [SchoolEvent]]
    }

    private struct CachedMonth: Codable {
        let storedAt: Date
        let events: [String: [SchoolEvent]]
    }

    static func missing(_ kind: WidgetKind) -> WidgetCard {
        WidgetCard(kind.label, "업데이트 대기", "잠시 후 다시 확인해 주세요", "풍산고등학교")
    }

    static func meal(_ date: Date) async -> WidgetCard? {
        guard let meals = await SchoolMeals.fetch(date) else { return nil }
        let label = SchoolMeals.label(date)
        guard let lunch = meals.first(where: { $0.code == "2" }) ?? meals.first else {
            return WidgetCard("오늘 급식", "등록된 식단 없음", "급식 페이지에서 확인", label)
        }
        let dishes = lunch.dishes
        return WidgetCard("오늘 급식", lunch.name, dishes.joined(separator: " · "), label,
                          compact: dishes.prefix(3).joined(separator: " · "))
    }

    static func weather() async -> WidgetCard? {
        let key = "widget-weather"
        let value: Weather?
        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let response = try decoder.decode(OpoongWeather.self, from: await request(weatherURL, timeout: 4.5))
            guard response.ok else { throw URLError(.cannotParseResponse) }
            let current = response.current
            let precipitation = current.precipitationType ?? ""
            let sky = !precipitation.isEmpty && precipitation != "없음"
                ? precipitation : response.hourly?.first?.sky ?? "현재 날씨"
            value = try makeWeather(current.temperatureC, current.humidityPercent, sky, current.observedAt, "오풍")
        } catch {
            value = try? await forecast()
        }
        if let value {
            if let data = try? JSONEncoder().encode(value) { UserDefaults.standard.set(data, forKey: key) }
            return value.card
        }
        guard let data = UserDefaults.standard.data(forKey: key),
              let cached = try? JSONDecoder().decode(Weather.self, from: data), cached.isFresh else { return nil }
        return cached.card
    }

    private static func forecast() async throws -> Weather {
        let current = try JSONDecoder().decode(Forecast.self, from: await request(forecastURL, timeout: 6)).current
        let clock = DateFormatter()
        clock.locale = Locale(identifier: "en_US_POSIX")
        clock.calendar = SchoolMeals.calendar
        clock.timeZone = SchoolMeals.timeZone
        clock.dateFormat = "yyyy-MM-dd'T'HH:mm"
        guard let time = clock.date(from: current.time) else { throw URLError(.cannotParseResponse) }
        return try makeWeather(current.temperature, current.humidity, condition(current.code), time, "Open-Meteo")
    }

    private static func makeWeather(_ temperature: Double, _ humidity: Int, _ condition: String,
                                    _ time: Date, _ source: String) throws -> Weather {
        guard temperature.isFinite, (-100...70).contains(temperature), (0...100).contains(humidity) else {
            throw URLError(.cannotParseResponse)
        }
        let reading = Weather(temperature: Int(floor(temperature + 0.5)), humidity: humidity,
                              condition: condition, observedAt: time, source: source)
        guard reading.isFresh else { throw URLError(.cannotParseResponse) }
        return reading
    }

    private static func condition(_ code: Int) -> String {
        switch code {
        case 0: "맑음"
        case 1, 2: "구름 조금"
        case 3: "흐림"
        case 45, 48: "안개"
        case 71, 73, 75, 77, 85, 86: "눈"
        case 95...99: "뇌우"
        case 51...94: "비"
        default: "현재 날씨"
        }
    }

    static func schedule(from day: Date, through lastDay: Date) async -> [String: [String: [SchoolEvent]]] {
        let first = format(day, "yyyyMM")
        let last = format(lastDay, "yyyyMM")
        if first == last {
            return [first: await month(first)].compactMapValues { $0 }
        }
        async let firstMonth = month(first)
        async let lastMonth = month(last)
        let (one, two) = await (firstMonth, lastMonth)
        return [first: one, last: two].compactMapValues { $0 }
    }

    static func scheduleCard(_ date: Date, months: [String: [String: [SchoolEvent]]]) -> WidgetCard? {
        let calendar = SchoolMeals.calendar
        var events: [(date: Date, title: String)] = []
        var seen: Set<String> = []
        var complete = true
        for offset in 0..<7 {
            guard let day = calendar.date(byAdding: .day, value: offset, to: date) else { continue }
            guard let records = months[format(day, "yyyyMM")] else {
                complete = false
                continue
            }
            for item in records[format(day, "yyyy-MM-dd")] ?? [] {
                let title = item.title.trimmingCharacters(in: .whitespacesAndNewlines)
                let seq = item.seq ?? ""
                if !title.isEmpty && seen.insert(seq.isEmpty ? title : seq).inserted { events.append((day, title)) }
            }
        }
        guard let first = events.first else {
            return complete ? WidgetCard("학사일정", "예정된 일정 없음", "오늘부터 7일 기준", "풍산고등학교") : nil
        }
        let more = events.dropFirst().prefix(2).map { eventLabel($0.date, relativeTo: date) + " · " + $0.title }
        let firstDate = eventLabel(first.date, relativeTo: date)
        return WidgetCard("학사일정", first.title, more.isEmpty ? "학교 일정 자세히 보기" : more.joined(separator: "\n"),
                          firstDate + (complete ? " · 앞으로 7일" : " · 일부 일정"),
                          compact: more.first ?? "일정 자세히 보기")
    }

    private static func month(_ month: String) async -> [String: [SchoolEvent]]? {
        let url = URL(string: "https://hyukjunps.github.io/data/schedule/\(month).json")!
        let key = "widget-schedule-" + month
        let defaults = UserDefaults.standard
        do {
            let response = try JSONDecoder().decode(ScheduleMonth.self, from: await request(url, timeout: 7))
            guard response.ok, response.ym == month else { throw URLError(.cannotParseResponse) }
            let cache = CachedMonth(storedAt: .now, events: response.byDate)
            if let data = try? JSONEncoder().encode(cache) { defaults.set(data, forKey: key) }
            let oldest = SchoolMeals.calendar.date(byAdding: .month, value: -1, to: .now) ?? .now
            let oldestKey = "widget-schedule-" + format(oldest, "yyyyMM")
            for name in defaults.dictionaryRepresentation().keys where name.hasPrefix("widget-schedule-") && name < oldestKey {
                defaults.removeObject(forKey: name)
            }
            return response.byDate
        } catch {
            guard let data = defaults.data(forKey: key),
                  let cache = try? JSONDecoder().decode(CachedMonth.self, from: data),
                  Date().timeIntervalSince(cache.storedAt) <= 172_800 else { return nil }
            return cache.events
        }
    }

    private static func eventLabel(_ day: Date, relativeTo date: Date) -> String {
        let calendar = SchoolMeals.calendar
        if calendar.isDate(day, inSameDayAs: date) { return "오늘" }
        if let next = calendar.date(byAdding: .day, value: 1, to: date), calendar.isDate(day, inSameDayAs: next) { return "내일" }
        return format(day, "M.d")
    }

    private static func format(_ date: Date, _ pattern: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = SchoolMeals.calendar
        formatter.timeZone = SchoolMeals.timeZone
        formatter.dateFormat = pattern
        return formatter.string(from: date)
    }

    private static func request(_ url: URL, timeout: TimeInterval) async throws -> Data {
        let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: timeout)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200, data.count <= 524_288 else {
            throw URLError(.badServerResponse)
        }
        return data
    }
}
