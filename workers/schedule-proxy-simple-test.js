const SCHOOL_URL = "https://school.gyo6.net/poongsanhs/schl/sv/schdulView/schdulCalendarView.do";
const SCHOOL_MI = "167079";

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return cors(null, 204);

    const url = new URL(request.url);
    const ym = String(url.searchParams.get("ym") || "").replace(/[^0-9]/g, "");
    if (!/^20\d{4}$/.test(ym)) {
      return json({ ok: false, error: "ym must be YYYYMM" }, 400);
    }

    const target = `${SCHOOL_URL}?mi=${SCHOOL_MI}&selectYearMonth=${ym}`;
    const res = await fetch(target, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://school.gyo6.net/poongsanhs/main.do",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
      },
    });

    const html = await res.text();
    const hasSchedule = /data-schdulTitle\s*=/i.test(html);
    const hasErrorPage =
      html.includes("\ud648\ud398\uc774\uc9c0 \uc624\ub958 \uc54c\ub9bc") ||
      html.includes("\uc694\uccad\ud558\uc2e0 \ud398\uc774\uc9c0\uac00 \uc815\uc0c1\uc801\uc73c\ub85c \ucc98\ub9ac\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4");

    return json({
      ok: hasSchedule,
      target,
      finalUrl: res.url,
      status: res.status,
      contentType: res.headers.get("content-type") || "",
      htmlLength: html.length,
      hasSchedule,
      hasErrorPage,
      sample: html.replace(/\s+/g, " ").slice(0, 1200),
    }, hasSchedule ? 200 : 502);
  },
};

function json(payload, status = 200) {
  return cors(JSON.stringify(payload, null, 2), status, {
    "Content-Type": "application/json; charset=utf-8",
  });
}

function cors(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      ...headers,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
