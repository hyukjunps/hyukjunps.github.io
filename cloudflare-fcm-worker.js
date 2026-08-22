const PROJECT_ID = "opoong-9e2f1";
const ALLOWED_ORIGIN = "https://hyukjunps.github.io";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

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

async function sendFcm(accessToken, token, { title, body, url }) {
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
          title: String(title || "O.Poong 아침 알림"),
          body: String(body || "오늘의 급식과 학교생활 정보를 확인해 보세요."),
          url: String(url || "https://hyukjunps.github.io/")
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

async function sendMorningNotifications(env) {
  const records = await listTokens(env);
  if (!records.length) {
    console.log("[FCM] no registered tokens");
    return { total: 0, sent: 0, failed: 0 };
  }

  const accessToken = await getAccessToken(env);
  let sent = 0;
  let failed = 0;

  for (const record of records) {
    try {
      const result = await sendFcm(accessToken, record.token, {
        title: "O.Poong 아침 알림",
        body: "오늘의 급식과 학교생활 정보를 확인해 보세요.",
        url: "https://hyukjunps.github.io/"
      });
      if (result.ok) {
        sent += 1;
        console.log(`[FCM] sent ${record.key} status=${result.status}`);
      } else {
        failed += 1;
        console.error(`[FCM] failed ${record.key} status=${result.status} ${result.text}`);
        if (isDeadToken(result)) await env.FCM_TOKENS.delete(record.key);
      }
    } catch (error) {
      failed += 1;
      console.error(`[FCM] exception ${record.key}`, error);
    }
  }

  console.log(`[FCM] morning done total=${records.length} sent=${sent} failed=${failed}`);
  return { total: records.length, sent, failed };
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
        firebaseSecret: Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON)
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
        const accessToken = await getAccessToken(env);
        const result = await sendFcm(accessToken, token, {
          title: "O.Poong FCM 테스트",
          body: "FCM 서버 전송까지 정상적으로 연결되었습니다.",
          url: "https://hyukjunps.github.io/"
        });
        if (!result.ok) return json({ ok: false, status: result.status, error: result.text }, 502, origin);
        return json({ ok: true, status: result.status }, 200, origin);
      } catch (error) {
        return json({ ok: false, error: String(error?.message || error) }, 500, origin);
      }
    }

    return json({ ok: false, error: "not_found" }, 404, origin);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendMorningNotifications(env));
  }
};
