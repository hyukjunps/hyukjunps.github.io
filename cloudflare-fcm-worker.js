const PROJECT_ID = "opoong-9e2f1";
const ALLOWED_ORIGIN = "https://hyukjunps.github.io";
const APP_URL = "https://hyukjunps.github.io/";
const SCHEDULE_BASE_URL = "https://raw.githubusercontent.com/hyukjunps/hyukjunps.github.io/main/data/schedule";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

// O.Poong에서 급식 조회에 사용하는 NEIS 설정과 동일합니다.
const NEIS_API_KEY = "c5eac2fb880e4aa185e7957a756dd126";
const ATPT_OFCDC_SC_CODE = "R10";
const SD_SCHUL_CODE = "8750475";

const enc = new TextEncoder();

function cors(origin = ALLOWED_ORIGIN) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origin) }
  });
}

function isAllowedRequest(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === ALLOWED_ORIGIN;
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function tokenKey(token) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(token));
  return `fcm:${base64Url(new Uint8Array(digest))}`;
}

function pemToBytes(pem) {
  const clean = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(clean);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function getServiceAccount(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON secret is missing");
  }
  let account;
  try {
    account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (_) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  if (!account?.client_email || !account?.private_key) {
    throw new Error("Firebase service account JSON is missing client_email/private_key");
  }
  return account;
}

async function signJwt(env) {
  const account = getServiceAccount(env);
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64Url(enc.encode(JSON.stringify({
    iss: account.client_email,
    scope: FCM_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  })));
  const unsigned = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned));
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

async function getAccessToken(env) {
  const assertion = await signJwt(env);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(`OAuth token error ${response.status}: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function sendFcm(accessToken, token, { title, body, url, tag }) {
  const response = await fetch(FCM_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      message: {
        token,
        data: {
          title: String(title || "O.Poong 알림"),
          body: String(body || "새 알림이 도착했어요."),
          url: String(url || APP_URL),
          tag: String(tag || `opoong-${Date.now()}`)
        },
        webpush: {
          headers: {
            TTL: "86400",
            Urgency: "normal"
          }
        }
      }
    })
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

function isDeadToken(result) {
  if (result.status === 404) return true;
  return /UNREGISTERED|registration-token-not-registered/i.test(result.text || "");
}

async function listTokens(env) {
  if (!env.FCM_TOKENS) throw new Error("FCM_TOKENS KV binding is missing");
  const tokens = [];
  let cursor;
  do {
    const page = await env.FCM_TOKENS.list({ prefix: "fcm:", cursor, limit: 1000 });
    for (const key of page.keys) {
      const record = await env.FCM_TOKENS.get(key.name, "json");
      if (record?.token) tokens.push({ key: key.name, token: record.token });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return tokens;
}

function getKstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const year = values.year;
  const month = values.month;
  const day = values.day;
  return {
    dateKey: `${year}-${month}-${day}`,
    ym: `${year}${month}`,
    ymd: `${year}${month}${day}`
  };
}

function decodeBasicEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function mealMenuText(raw) {
  return decodeBasicEntities(raw)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n");
}

async function fetchTodaySchedule(today) {
  const response = await fetch(`${SCHEDULE_BASE_URL}/${today.ym}.json?d=${today.ymd}`, {
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) throw new Error(`schedule HTTP ${response.status}`);
  const data = await response.json();
  const events = Array.isArray(data?.byDate?.[today.dateKey]) ? data.byDate[today.dateKey] : [];
  const titles = events.map(event => String(event?.title || "").trim()).filter(Boolean);
  return titles.length ? titles.join("\n") : "오늘 등록된 학사일정이 없습니다.";
}

async function fetchTodayMeals(today) {
  const params = new URLSearchParams({
    KEY: NEIS_API_KEY,
    Type: "json",
    pIndex: "1",
    pSize: "100",
    ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE,
    MLSV_YMD: today.ymd
  });
  const response = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?${params.toString()}`);
  if (!response.ok) throw new Error(`NEIS HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.mealServiceDietInfo?.[1]?.row) ? data.mealServiceDietInfo[1].row : [];
}

function findMeal(rows, code, name) {
  return rows.find(row => String(row?.MMEAL_SC_CODE || "") === String(code))
    || rows.find(row => String(row?.MMEAL_SC_NM || "").includes(name));
}

async function buildTodayNotifications() {
  const today = getKstDateParts();

  let scheduleBody;
  try {
    scheduleBody = await fetchTodaySchedule(today);
  } catch (error) {
    console.error("[DATA] schedule fetch failed", error);
    scheduleBody = "학사일정을 불러오지 못했습니다.";
  }

  let mealRows = [];
  try {
    mealRows = await fetchTodayMeals(today);
  } catch (error) {
    console.error("[DATA] meal fetch failed", error);
  }

  const lunch = findMeal(mealRows, "2", "중식");
  const dinner = findMeal(mealRows, "3", "석식");
  const lunchBody = lunch ? mealMenuText(lunch.DDISH_NM) : "오늘 점심 급식 정보가 없습니다.";
  const dinnerBody = dinner ? mealMenuText(dinner.DDISH_NM) : "오늘 저녁 급식 정보가 없습니다.";

  return [
    {
      title: "오늘의 학사일정",
      body: scheduleBody,
      url: `${APP_URL}?page=schedule`,
      tag: `opoong-schedule-${today.ymd}`
    },
    {
      title: "오늘의 점심",
      body: lunchBody || "오늘 점심 급식 정보가 없습니다.",
      url: `${APP_URL}?page=meal`,
      tag: `opoong-lunch-${today.ymd}`
    },
    {
      title: "오늘의 저녁",
      body: dinnerBody || "오늘 저녁 급식 정보가 없습니다.",
      url: `${APP_URL}?page=meal`,
      tag: `opoong-dinner-${today.ymd}`
    }
  ];
}

async function sendSetToToken(accessToken, token, notifications) {
  const results = [];
  for (const notification of notifications) {
    const result = await sendFcm(accessToken, token, notification);
    results.push({ notification, result });
    if (isDeadToken(result)) break;
  }
  return results;
}

async function sendDailyNotifications(env) {
  const records = await listTokens(env);
  if (!records.length) {
    console.log("[FCM] no registered tokens");
    return { tokens: 0, messagesSent: 0, failed: 0 };
  }

  const [accessToken, notifications] = await Promise.all([
    getAccessToken(env),
    buildTodayNotifications()
  ]);

  let messagesSent = 0;
  let failed = 0;

  for (const record of records) {
    try {
      const results = await sendSetToToken(accessToken, record.token, notifications);
      for (const { notification, result } of results) {
        if (result.ok) {
          messagesSent += 1;
          console.log(`[FCM] sent ${notification.tag} to ${record.key} status=${result.status}`);
        } else {
          failed += 1;
          console.error(`[FCM] failed ${notification.tag} to ${record.key} status=${result.status} ${result.text}`);
          if (isDeadToken(result)) {
            await env.FCM_TOKENS.delete(record.key);
            break;
          }
        }
      }
    } catch (error) {
      failed += 1;
      console.error(`[FCM] exception ${record.key}`, error);
    }
  }

  console.log(`[FCM] 08:00 set done tokens=${records.length} sent=${messagesSent} failed=${failed}`);
  return { tokens: records.length, messagesSent, failed };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || ALLOWED_ORIGIN;
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (!isAllowedRequest(request)) return json({ ok: false, error: "origin_not_allowed" }, 403, origin);

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: "opoong-fcm",
        projectId: PROJECT_ID,
        kv: Boolean(env.FCM_TOKENS),
        firebaseSecret: Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON),
        dailyNotifications: ["schedule", "lunch", "dinner"],
        schedule: "08:00 Asia/Seoul"
      }, 200, origin);
    }

    if (request.method !== "POST") return json({ ok: false, error: "not_found" }, 404, origin);

    let data;
    try {
      data = await request.json();
    } catch (_) {
      return json({ ok: false, error: "invalid_json" }, 400, origin);
    }

    const token = typeof data?.token === "string" ? data.token.trim() : "";
    if (!token || token.length < 20 || token.length > 4096) {
      return json({ ok: false, error: "invalid_fcm_token" }, 400, origin);
    }

    if (!env.FCM_TOKENS) return json({ ok: false, error: "FCM_TOKENS KV binding is missing" }, 500, origin);
    const key = await tokenKey(token);

    if (url.pathname === "/fcm/subscribe") {
      await env.FCM_TOKENS.put(key, JSON.stringify({
        token,
        updatedAt: new Date().toISOString()
      }));
      console.log(`[FCM] subscribed ${key}`);
      return json({ ok: true }, 200, origin);
    }

    if (url.pathname === "/fcm/unsubscribe") {
      await env.FCM_TOKENS.delete(key);
      console.log(`[FCM] unsubscribed ${key}`);
      return json({ ok: true }, 200, origin);
    }

    if (url.pathname === "/fcm/test") {
      try {
        const [accessToken, notifications] = await Promise.all([
          getAccessToken(env),
          buildTodayNotifications()
        ]);
        const results = await sendSetToToken(accessToken, token, notifications);
        const failedResult = results.find(({ result }) => !result.ok);
        if (failedResult) {
          return json({
            ok: false,
            status: failedResult.result.status,
            error: failedResult.result.text,
            sent: results.filter(({ result }) => result.ok).length
          }, 502, origin);
        }
        return json({
          ok: true,
          sent: results.length,
          titles: notifications.map(item => item.title)
        }, 200, origin);
      } catch (error) {
        return json({ ok: false, error: String(error?.message || error) }, 500, origin);
      }
    }

    return json({ ok: false, error: "not_found" }, 404, origin);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendDailyNotifications(env));
  }
};
