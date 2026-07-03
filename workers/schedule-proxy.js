const SCHOOL_SCHEDULE_URL = "https://school.gyo6.net/poongsanhs/schl/sv/schdulView/schdulCalendarView.do";
const SCHOOL_SCHEDULE_MI = "167079";
const CACHE_TTL_SECONDS = 60 * 60 * 6;

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return corsResponse(null, 204);
    if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

    const url = new URL(request.url);
    const ym = normalizeYm(url.searchParams.get("ym"));

    if (!ym) {
      return json({ ok: false, error: "ym must be YYYYMM or YYYY-MM" }, 400);
    }

    try {
      const cache = caches.default;
      const cacheKey = new Request(`https://opoong.local/schedule/${ym}`);
      const cached = await cache.match(cacheKey);
      if (cached) return withCors(cached);

      const html = await fetchOfficialScheduleHtml(ym);
      const byDate = parseScheduleHtml(html, ym);
      const count = Object.values(byDate).reduce((sum, items) => sum + items.length, 0);

      const response = json({
        ok: true,
        source: "school.gyo6.net",
        ym,
        count,
        byDate,
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
      }, 502);
    }
  },
};

function normalizeYm(value) {
  const raw = String(value || "").replace(/[^0-9]/g, "");
  if (!/^20\d{4}$/.test(raw)) return "";

  const month = Number(raw.slice(4, 6));
  if (month < 1 || month > 12) return "";

  return raw;
}

async function fetchOfficialScheduleHtml(ym) {
  const url = new URL(SCHOOL_SCHEDULE_URL);
  url.searchParams.set("mi", SCHOOL_SCHEDULE_MI);
  url.searchParams.set("selectYearMonth", ym);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; O.Poong-Schedule/1.0)",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      "Referer": "https://school.gyo6.net/poongsanhs/main.do?sysId=poongsanhs",
    },
  });

  if (!res.ok) throw new Error(`Official schedule HTTP ${res.status}`);

  const html = await res.text();
  if (!html.includes("monthcal") || !html.includes("data-schdulTitle")) {
    throw new Error("Official schedule markup was not found");
  }

  return html;
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
