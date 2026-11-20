# 오풍 홈 화면 위젯

| 위젯 | 홈 화면에 표시되는 정보 | 누르면 열리는 화면 |
| --- | --- | --- |
| 오늘 급식 | 오늘 식단. 중식을 우선 표시하며, 중식이 없으면 첫 끼니를 표시합니다. | 오풍 급식 |
| 풍산고 날씨 | 풍산고의 현재 기온·하늘 상태·습도와 관측 시각 | 오풍 홈의 날씨 카드 |
| 학사일정 | 오늘부터 7일 동안 예정된 학사일정 | 오풍 학사일정 |
| 온웨이에듀 | 상벌점·외출 관리 시스템 바로가기 | 온웨이에듀 로그인 |

날짜는 한국 시간 기준입니다. 급식은 나이스 공개 API, 학사일정은 오풍에 공개된 학교 공식 일정 자료를 사용합니다. 날씨는 오풍의 기존 날씨 API를 사용합니다. 최신 오풍 날씨를 받을 수 없으면 풍산고 위치의 [Open-Meteo](https://open-meteo.com/) 데이터를 사용하고 위젯에 출처를 표시합니다. 기기 위치 권한은 필요하지 않습니다. 새로고침 시각은 기기가 정합니다.

## Android

1. Android 8 이상 기기에 APK를 설치합니다.
2. 오풍 앱에서 원하는 위젯의 **추가**를 누르거나, 홈 화면을 길게 눌러 위젯 목록에서 **오풍**을 선택합니다.
3. 이전 디버그 APK와 서명이 다르다는 메시지가 나오면 기존 오풍 테스트 앱을 삭제한 뒤 새 APK를 설치합니다. 설치 후 위젯을 다시 추가합니다.

소스에서 빌드하려면 Android Studio에서 `mobile/android`를 열고 Android SDK 35를 설치합니다. JDK 17과 Gradle 8.9 환경에서 `gradle :app:assembleDebug`를 실행하면 `app/build/outputs/apk/debug/app-debug.apk`가 생성됩니다.

## iOS

1. Mac에서 Xcode와 XcodeGen을 설치합니다. Homebrew에서는 `brew install xcodegen`을 실행합니다.
2. `mobile/ios`에서 `xcodegen generate`를 실행한 다음 `OPoong.xcodeproj`를 엽니다.
3. iPhone 또는 iPad에 설치하려면 앱과 위젯 타깃의 Signing & Capabilities에서 개발 팀을 설정하고 실행합니다. 번들 ID 충돌 시 두 타깃의 ID를 함께 수정합니다. 위젯의 번들 ID는 앱의 번들 ID로 시작해야 합니다.
4. iOS 17 이상에서 오풍 앱을 한 번 연 뒤 홈 화면 위젯 목록에서 **오풍**을 검색합니다.
5. 시뮬레이터용 ZIP으로 확인하려면 Mac에서 압축을 풀고, 실행 중인 iOS 시뮬레이터에 `xcrun simctl install booted OPoong.app`으로 설치합니다.
