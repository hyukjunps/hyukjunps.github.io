# O.Poong 학사일정 Cloudflare Worker

`workers/schedule-proxy.js`는 O.Poong의 기존 학사일정 프론트 코드가 기대하는 응답 형식에 맞춘 Cloudflare Worker입니다.

## 왜 바꿨나요?

기존 Worker는 외부 중간 서비스가 `429 Per IP rate limit exceeded`를 반환하면서 학사일정 조회가 실패했습니다. NEIS `SchoolSchedule` API는 풍산고 실제 홈페이지 학사일정과 다른 항목이 있어 사용하지 않습니다.

이 Worker는 풍산고 공식 홈페이지의 실제 학사일정 페이지를 직접 가져와 파싱합니다.

공식 원본:

```text
https://school.gyo6.net/poongsanhs/schl/sv/schdulView/schdulCalendarView.do?mi=167079&selectYearMonth=YYYYMM
```

## 응답 형식

기존 프론트의 `fetchScheduleMonthProxy(yyyymm)`와 호환됩니다.

요청:

```text
/?ym=202607
/?ym=2026-07
```

응답 예시:

```json
{
  "ok": true,
  "source": "school.gyo6.net",
  "ym": "202607",
  "count": 33,
  "byDate": {
    "2026-07-03": [
      { "title": "기말고사", "seq": "1818834", "type": "", "color": "" },
      { "title": "필수 귀가", "seq": "1818837", "type": "", "color": "" }
    ]
  }
}
```

## 배포

기존 Worker 주소가 아래처럼 `index.html`에 들어 있습니다.

```js
const SCHEDULE_PROXY_BASE = "https://gkrtkdlfwjd.yyhhjj1068-c2c.workers.dev/?ym=";
```

따라서 Cloudflare Workers 대시보드에서 해당 Worker의 코드를 `workers/schedule-proxy.js` 내용으로 교체하면 프론트 코드는 그대로 작동합니다.

Wrangler를 쓰는 경우에는 Worker 프로젝트에 이 파일을 넣고 배포하세요.

```bash
wrangler deploy workers/schedule-proxy.js
```

배포 후 확인:

```bash
curl "https://gkrtkdlfwjd.yyhhjj1068-c2c.workers.dev/?ym=202607"
```

`ok: true`와 `byDate`가 나오면 정상입니다.
