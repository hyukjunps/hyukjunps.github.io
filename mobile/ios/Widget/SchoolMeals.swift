import Foundation

struct Meal: Decodable {
    let code: String
    let name: String
    private let menu: String

    enum CodingKeys: String, CodingKey {
        case code = "MMEAL_SC_CODE"
        case name = "MMEAL_SC_NM"
        case menu = "DDISH_NM"
    }

    var dishes: [String] {
        menu.replacingOccurrences(of: #"(?i)<br\s*/?>"#, with: "\n", options: .regularExpression)
            .split(whereSeparator: \.isNewline)
            .map {
                $0.replacingOccurrences(of: #"\s*\([0-9.]+\)"#, with: "", options: .regularExpression)
                    .trimmingCharacters(in: .whitespaces)
            }
            .filter { !$0.isEmpty }
    }
}

enum SchoolMeals {
    static let timeZone = TimeZone(identifier: "Asia/Seoul")!

    private struct Response: Decodable {
        struct Status: Decodable {
            let code: String
            enum CodingKeys: String, CodingKey { case code = "CODE" }
        }

        struct Section: Decodable {
            let row: [Meal]?
        }

        let mealServiceDietInfo: [Section]?
        let result: Status?
        enum CodingKeys: String, CodingKey {
            case mealServiceDietInfo
            case result = "RESULT"
        }
    }

    static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar
    }

    static func label(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        formatter.timeZone = timeZone
        formatter.dateFormat = "M월 d일 EEE"
        return formatter.string(from: date)
    }

    static func fetch(_ date: Date) async -> [Meal]? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = calendar
        formatter.timeZone = timeZone
        formatter.dateFormat = "yyyyMMdd"
        let day = formatter.string(from: date)
        let url = URL(string: "https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pSize=10&ATPT_OFCDC_SC_CODE=R10&SD_SCHUL_CODE=8750475&MLSV_YMD=\(day)")!
        let cacheKey = "school-meal-" + day

        do {
            let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 9)
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200, data.count <= 65_536 else {
                throw URLError(.badServerResponse)
            }
            let meals = try parse(data)
            let defaults = UserDefaults.standard
            defaults.set(data, forKey: cacheKey)
            let oldestDay = calendar.date(byAdding: .day, value: -1, to: Date()) ?? Date()
            let oldestKey = "school-meal-" + formatter.string(from: oldestDay)
            for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("school-meal-") && key < oldestKey {
                defaults.removeObject(forKey: key)
            }
            return meals
        } catch {
            guard let cached = UserDefaults.standard.data(forKey: cacheKey) else { return nil }
            return try? parse(cached)
        }
    }

    private static func parse(_ data: Data) throws -> [Meal] {
        let response = try JSONDecoder().decode(Response.self, from: data)
        if response.result?.code == "INFO-200" { return [] }
        let meals = response.mealServiceDietInfo?
            .compactMap(\.row)
            .flatMap { $0 }
            .filter { !$0.name.isEmpty && !$0.dishes.isEmpty }
            .sorted { $0.code < $1.code }
        guard let meals, !meals.isEmpty else { throw URLError(.cannotParseResponse) }
        return meals
    }
}
