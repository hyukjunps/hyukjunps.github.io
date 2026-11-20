import SwiftUI

enum WidgetKind: String, CaseIterable, Identifiable {
    case meal, weather, schedule, onway

    var id: String { rawValue }

    var label: String {
        switch self {
        case .meal: "오늘 급식"
        case .weather: "풍산고 날씨"
        case .schedule: "학사일정"
        case .onway: "온웨이에듀"
        }
    }

    var description: String {
        switch self {
        case .meal: "오늘 식단"
        case .weather: "현재 기온과 날씨"
        case .schedule: "오늘부터 7일"
        case .onway: "상벌점 · 외출 관리"
        }
    }

    var symbol: String {
        switch self {
        case .meal: "fork.knife"
        case .weather: "cloud.sun"
        case .schedule: "calendar"
        case .onway: "arrow.up.right.square"
        }
    }

    var accent: Color {
        switch self {
        case .meal: Color(rgb: 0xFEC1AB)
        case .weather: Color(rgb: 0xB4DEFF)
        case .schedule: Color(rgb: 0xDDCDFF)
        case .onway: Color(rgb: 0xA3F3DC)
        }
    }

    var background: LinearGradient {
        let colors: (UInt32, UInt32)
        switch self {
        case .meal: colors = (0x68342D, 0x281A24)
        case .weather: colors = (0x204E77, 0x131E3D)
        case .schedule: colors = (0x483571, 0x211A3A)
        case .onway: colors = (0x185959, 0x142E38)
        }
        return LinearGradient(colors: [Color(rgb: colors.0), Color(rgb: colors.1)],
                              startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    var widgetURL: URL { URL(string: "opoong://\(rawValue)")! }

    var destination: URL {
        let address: String
        switch self {
        case .meal: address = "https://hyukjunps.github.io/?page=meal"
        case .weather: address = "https://hyukjunps.github.io/"
        case .schedule: address = "https://hyukjunps.github.io/?page=schedule"
        case .onway: address = "https://ps.onwayedu.co.kr/login/login.php"
        }
        return URL(string: address)!
    }
}

private extension Color {
    init(rgb: UInt32) {
        self.init(red: Double((rgb >> 16) & 255) / 255,
                  green: Double((rgb >> 8) & 255) / 255,
                  blue: Double(rgb & 255) / 255)
    }
}
