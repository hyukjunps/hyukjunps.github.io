import SwiftUI

@main
struct OPoongApp: App {
    @Environment(\.openURL) private var openURL

    var body: some Scene {
        WindowGroup {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text("오풍 위젯")
                        .font(.largeTitle.bold())
                        .foregroundStyle(.white)
                    Text("홈 화면을 길게 누른 뒤, 위젯 목록에서 ‘오풍’을 선택하세요.")
                        .font(.subheadline)
                        .foregroundStyle(Color(red: 0.73, green: 0.75, blue: 0.82))
                        .padding(.bottom, 12)
                    ForEach(WidgetKind.allCases) { kind in
                        Link(destination: kind.destination) {
                            HStack(spacing: 14) {
                                Image(systemName: kind.symbol)
                                    .font(.title3)
                                    .foregroundStyle(kind.accent)
                                    .frame(width: 30)
                                    .accessibilityHidden(true)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(kind.label)
                                        .font(.headline)
                                        .foregroundStyle(.white)
                                    Text(kind.description)
                                        .font(.caption)
                                        .foregroundStyle(kind.accent)
                                }
                                Spacer()
                                Image(systemName: "arrow.up.right")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(kind.accent)
                                    .accessibilityHidden(true)
                            }
                            .padding(16)
                            .background(kind.background, in: RoundedRectangle(cornerRadius: 20))
                        }
                    }
                }
                .frame(maxWidth: 560)
                .padding(24)
                .padding(.top, 22)
                .frame(maxWidth: .infinity)
            }
            .background(Color(red: 0.063, green: 0.075, blue: 0.125).ignoresSafeArea())
            .preferredColorScheme(.dark)
            .onOpenURL { url in
                guard url.scheme == "opoong", let route = url.host, let kind = WidgetKind(rawValue: route) else { return }
                openURL(kind.destination)
            }
        }
    }
}
