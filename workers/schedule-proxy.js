const SCHOOL_ORIGIN = "https://school.gyo6.net";
const SCHOOL_MAIN_URL = `${SCHOOL_ORIGIN}/poongsanhs/main.do?sysId=poongsanhs`;
const SCHOOL_SCHEDULE_URL = `${SCHOOL_ORIGIN}/poongsanhs/schl/sv/schdulView/schdulCalendarView.do`;
const SCHOOL_SCHEDULE_MI = "167079";
const SCHOOL_SYS_ID = "poongsanhs";
const CACHE_TTL_SECONDS = 60 * 60 * 6;

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return corsResponse(null, 204);
    if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

    const url = new URL(request.url);
    const ym = normalizeYm(url.searchParams.get("ym"));
    const debug = url.searchParams.get("debug") === "1";

    if (!ym) {
      return json({ ok: false, error: "ym must be YYYYMM or YYYY-MM" }, 400);
    }

    try {
      const cache = caches.default;
      const cacheKey = new Request(`https://opoong.local/schedule/${ym}`);
      const cached = debug ? null : await cache.match(cacheKey);
      if (cached) return withCors(cached);

      const fetched = await fetchOfficialScheduleHtml(ym);
      const byDate = parseScheduleHtml(fetched.html, ym);
      const count = Object.values(byDate).reduce((sum, items) => sum + items.length, 0);

      if (!count) {
        throw new ScheduleMarkupError("Official schedule items were not found", fetched);
      }

      const response = json({
        ok: true,
        source: "school.gyo6.net",
        method: fetched.method,
        ym,
        count,
        byDate,
        ...(debug ? { debug: makeDebug(fetched) } : {}),
      });

      response.headers.set("Cache-Control", `public, max-age=${CACHE_TTL_SECONDS}`);
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      return json({
        ok: false,
        source: "school.gyo6.net",
        ym,
        count: 0,
        byDate: {},
        error: error instanceof Error ? error.message : String(error),
        ...(error && error.debug ? { debug: error.debug } : {}),
      }, 502);
    }
  },
};

class ScheduleMarkupError extends Error {
  constructor(message, fetched) {
    super(message);
    this.name = "ScheduleMarkupError";
    this.debug = makeDebug(fetched);
  }
}

function normalizeYm(value) {
  const raw = String(value || "").replace(/[^0-9]/g, "");
  if (!/^20\d{4}$/.test(raw)) return "";

  const month = Number(raw.slice(4, 6));
  if (month < 1 || month > 12) return "";

  return raw;
}

async function fetchOfficialScheduleHtml(ym) {
  const session = await warmSchoolSession();
  const attempts = [
    () => fetchScheduleByGet(ym, session.cookie),
    () => fetchScheduleByPost(ym, session.cookie),
  ];

  let last = null;
  const attemptDebug = [session.debug];

  for (const attempt of attempts) {
    const fetched = await attempt();
    fetched.attempts = attemptDebug;
    last = fetched;
    attemptDebug.push(makeDebug(fetched));
    if (hasScheduleMarkup(fetched.html)) return fetched;
  }

  if (last) last.attempts = attemptDebug;
  throw new ScheduleMarkupError("Official schedule markup was not found", last);
}

async function warmSchoolSession() {
  try {
    const res = await fetch(SCHOOL_MAIN_URL, {
      method: "GET",
      redirect: "follow",
      headers: browserHeaders({ referer: `${SCHOOL_ORIGIN}/poongsanhs/main.do` }),
    });
    const html = await res.text();
    const cookie = mergeCookies(
      "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=ko",
      readSetCookieHeaders(res.headers),
    );

    return {
      cookie,
      debug: makeDebug({
        method: "WARMUP",
        requestedUrl: SCHOOL_MAIN_URL,
        finalUrl: res.url,
        status: res.status,
        contentType: res.headers.get("content-type") || "",
        html,
      }),
    };
  } catch (error) {
    return {
      cookie: "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=ko",
      debug: {
        method: "WARMUP",
        requestedUrl: SCHOOL_MAIN_URL,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function fetchScheduleByGet(ym, cookie) {
  const url = new URL(SCHOOL_SCHEDULE_URL);
  url.searchParams.set("sysId", SCHOOL_SYS_ID);
  url.searchParams.set("mi", SCHOOL_SCHEDULE_MI);
  url.searchParams.set("selectType", "haksa");
  url.searchParams.set("selectYearMonth", ym);

  const res = await fetch(url.toString(), {
    method: "GET",
    redirect: "follow",
    headers: schoolHeaders(cookie),
  });

  return readScheduleResponse(res, "GET", url.toString());
}

async function fetchScheduleByPost(ym, cookie) {
  const body = new URLSearchParams({
    sysId: SCHOOL_SYS_ID,
    mi: SCHOOL_SCHEDULE_MI,
    schdulSn: "",
    selectType: "haksa",
    selectYearMonth: ym,
    schdulType: "",
    schdulSeq: "",
    schdulDate: "",
  });

  const url = new URL(SCHOOL_SCHEDULE_URL);
  url.searchParams.set("sysId", SCHOOL_SYS_ID);
  url.searchParams.set("mi", SCHOOL_SCHEDULE_MI);

  const res = await fetch(url.toString(), {
    method: "POST",
    redirect: "follow",
    headers: {
      ...schoolHeaders(cookie),
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Origin": SCHOOL_ORIGIN,
    },
    body,
  });

  return readScheduleResponse(res, "POST", url.toString());
}

function schoolHeaders(cookie) {
  return browserHeaders({
    referer: `${SCHOOL_SCHEDULE_URL}?sysId=${SCHOOL_SYS_ID}&mi=${SCHOOL_SCHEDULE_MI}`,
    cookie,
  });
}

function browserHeaders({ referer, cookie = "" }) {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Referer": referer,
    ...(cookie ? { "Cookie": cookie } : {}),
  };
}

async function readScheduleResponse(res, method, requestedUrl) {
  const html = await res.text();

  if (!res.ok) {
    throw new ScheduleMarkupError(`Official schedule HTTP ${res.status}`, {
      method,
      requestedUrl,
      finalUrl: res.url,
      status: res.status,
      contentType: res.headers.get("content-type") || "",
      html,
    });
  }

  return {
    method,
    requestedUrl,
    finalUrl: res.url,
    status: res.status,
    contentType: res.headers.get("content-type") || "",
    html,
  };
}

function hasScheduleMarkup(html) {
  return /class=["'][^"']*monthcal/i.test(html) && /data-schdulTitle\s*=/i.test(html);
}

function parseScheduleHtml(html, ym) {
  const byDate = {};
  const cellPattern = /<td\b[^>]*\bid=(['"]?)(20\d{6})\1[^>]*>([\s\S]*?)(?=<td\b|<\/tr>|<\/tbody>|<\/table>)/gi;
  let cellMatch;

  while ((cellMatch = cellPattern.exec(html))) {
    const ymd = cellMatch[2];
    if (!ymd.startsWith(ym)) continue;

    const iso = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
    const cellHtml = cellMatch[3];
    const items = parseCellItems(cellHtml);

    if (items.length) byDate[iso] = dedupeItems(items);
  }

  return byDate;
}

function parseCellItems(cellHtml) {
  const items = [];
  const itemPattern = /<p\b[^>]*\bclass=["'][^"']*\bcalLink\b[^"']*\bbtnInfo\b[^"']*["'][^>]*>/gi;
  let itemMatch;

  while ((itemMatch = itemPattern.exec(cellHtml))) {
    const tag = itemMatch[0];
    const title = decodeHtml(readAttr(tag, "data-schdulTitle")).trim();
    if (!title) continue;

    items.push({
      title,
      seq: readAttr(tag, "data-seq") || "",
      type: readAttr(tag, "data-clType") || "",
      color: normalizeColor(readStyleColor(tag)),
    });
  }

  return items;
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.title}\u0000${item.seq}\u0000${item.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readAttr(tag, name) {
  const pattern = new RegExp(`${escapeRegExp(name)}\\s*=\\s*(["'])(.*?)\\1`, "i");
  const match = tag.match(pattern);
  return match ? match[2] : "";
}

function readStyleColor(tag) {
  const style = readAttr(tag, "style");
  const match = style.match(/background-color\s*:\s*([^;]+)/i);
  return match ? match[1].trim() : "";
}

function normalizeColor(color) {
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : "";
}

function decodeHtml(value) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    const lower = entity.toLowerCase();
    if (lower[0] === "#") {
      const code = lower[1] === "x" ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return named[lower] || `&${entity};`;
  });
}

function readSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function mergeCookies(baseCookie, setCookieHeaders) {
  const jar = new Map();
  addCookieString(baseCookie, jar);

  for (const header of setCookieHeaders || []) {
    const pair = String(header || "").split(";", 1)[0];
    addCookieString(pair, jar);
  }

  return Array.from(jar.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
}

function addCookieString(cookie, jar) {
  String(cookie || "").split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx <= 0) return;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) jar.set(name, value);
  });
}

function makeDebug(fetched) {
  if (!fetched) return {};
  const sample = String(fetched.html || "")
    .replace(/\s+/g, " ")
    .slice(0, 1200);

  return {
    method: fetched.method || "",
    requestedUrl: fetched.requestedUrl || "",
    finalUrl: fetched.finalUrl || "",
    status: fetched.status || 0,
    contentType: fetched.contentType || "",
    htmlLength: String(fetched.html || "").length,
    hasMonthcal: /monthcal/i.test(fetched.html || ""),
    hasScheduleTitle: /data-schdulTitle\s*=/i.test(fetched.html || ""),
    hasSelectYearMonth: /selectYearMonth/i.test(fetched.html || ""),
    sample,
    ...(fetched.attempts ? { attempts: fetched.attempts } : {}),
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function json(payload, status = 200) {
  return corsResponse(JSON.stringify(payload, null, 2), status, {
    "Content-Type": "application/json; charset=utf-8",
  });
}

function corsResponse(body, status = 200, headers = {}) {
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

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
