# 오풍 홈 화면 위젯

풍산고 오늘 급식을 기기의 홈 화면에 표시합니다. 중식을 우선 표시하고, 중식이 없는 날에는 첫 끼니를 표시합니다. 날짜는 한국 시간으로 계산하며, 위젯을 누르면 기존 오풍 급식 화면이 열립니다. 조식·중식·석식 전체와 알레르기 정보는 오풍에서 확인할 수 있습니다.

위젯은 나이스 공개 급식 API를 사용합니다. 연결이 끊겨도 이전에 받아 둔 당일 메뉴가 있으면 표시합니다. 자동 새로고침 시간은 기기에서 결정합니다. 오풍 웹의 시간표는 각 브라우저에 직접 입력해 저장하기 때문에 이 버전의 위젯에는 포함하지 않았습니다.

## Android

1. Android Studio에서 `mobile/android`를 열고 Android SDK 35를 설치합니다.
2. Gradle 8.9와 JDK 17 이상으로 앱을 빌드합니다. Gradle이 설치된 환경에서는 `gradle :app:assembleDebug`를 실행하면 `app/build/outputs/apk/debug/app-debug.apk`가 생성됩니다.
3. Android 8 이상 기기에 앱을 설치합니다. 앱에서 **급식 위젯 추가**를 선택하거나 홈 화면의 위젯 목록에서 **오풍**을 찾습니다.

## iOS

1. Mac에서 Xcode와 XcodeGen을 설치합니다. Homebrew에서는 `brew install xcodegen`으로 XcodeGen을 설치할 수 있습니다.
2. `mobile/ios`에서 `xcodegen generate`를 실행하고 `OPoong.xcodeproj`를 엽니다.
3. iPhone 또는 iPad 실기기에서 실행하려면 Xcode의 Signing & Capabilities에서 앱과 위젯 타깃의 개발 팀을 지정합니다. 기존에 등록된 번들 ID와 충돌하는 경우 앱과 위젯의 번들 ID를 함께 변경합니다. 위젯의 번들 ID는 앱의 번들 ID로 시작해야 합니다.
4. iOS 또는 iPadOS 17 이상에서 오풍 앱을 한 번 연 뒤 홈 화면의 위젯 목록에서 **오풍**을 찾습니다.
