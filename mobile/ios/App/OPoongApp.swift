import SwiftUI

@main
struct OPoongApp: App {
    @Environment(\.openURL) private var openURL
    private let mealPage = URL(string: "https://hyukjunps.github.io/?page=meal")!

    var body: some Scene {
        WindowGroup {
            VStack(spacing: 18) {
                Text("오풍")
                    .font(.largeTitle.bold())
                Text("홈 화면을 길게 누른 뒤, 위젯 목록에서 ‘오풍’을 선택하세요.")
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Link("오풍 급식 열기", destination: mealPage)
                    .buttonStyle(.borderedProminent)
            }
            .padding(24)
            .onOpenURL { url in
                if url.scheme == "opoong", url.host == "meal" {
                    openURL(mealPage)
                }
            }
        }
    }
}
