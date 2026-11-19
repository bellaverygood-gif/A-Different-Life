const TICKET_TTL = 180;
const SESSION_TTL = 7 * 24 * 60 * 60;
const TOKEN_TTL = 7000;

function cors(env, request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
  const allow = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bridge-Secret",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(env, request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(env, request) }
  });
}

function randomHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function accessToken(env) {
  if (!env.WECHAT_APPID || !env.WECHAT_APPSECRET) {
    throw Object.assign(new Error("AUTH_NOT_CONFIGURED"), { code: "AUTH_NOT_CONFIGURED" });
  }
  const cached = await env.AUTH_KV.get("wechat:access_token");
  if (cached) return cached;
  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", env.WECHAT_APPID);
  url.searchParams.set("secret", env.WECHAT_APPSECRET);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!data.access_token) throw Object.assign(new Error("WECHAT_TOKEN_FAILED"), { code: "WECHAT_TOKEN_FAILED" });
  await env.AUTH_KV.put("wechat:access_token", data.access_token, { expirationTtl: Math.min(Number(data.expires_in) || TOKEN_TTL, TOKEN_TTL) });
  return data.access_token;
}

async function miniCode(env, ticket) {
  const token = await accessToken(env);
  const res = await fetch(`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scene: ticket,
      page: "pages/auth/bridge/index",
      check_path: false,
      env_version: env.WECHAT_ENV_VERSION || "release"
    })
  });
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("image")) {
    const text = await res.text();
    throw Object.assign(new Error("WECHAT_QR_FAILED"), { code: "WECHAT_QR_FAILED", detail: text.slice(0, 200) });
  }
  const buffer = await res.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

async function start(env, request) {
  const ticket = randomHex(16);
  await env.AUTH_KV.put(`ticket:${ticket}`, JSON.stringify({ status: "pending", createdAt: Date.now() }), { expirationTtl: TICKET_TTL });
  const qr = await miniCode(env, ticket);
  return json(env, request, { ok: true, ticket, qr, expiresIn: TICKET_TTL });
}

async function status(env, request) {
  const ticket = new URL(request.url).searchParams.get("ticket") || "";
  if (!ticket) return json(env, request, { ok: false, code: "NO_TICKET" }, 400);
  const raw = await env.AUTH_KV.get(`ticket:${ticket}`);
  if (!raw) return json(env, request, { ok: false, code: "EXPIRED" }, 410);
  const data = JSON.parse(raw);
  if (data.status !== "bound" || !data.openid) return json(env, request, { ok: true, status: "pending" });
  const session = randomHex(32);
  await env.AUTH_KV.put(`session:${session}`, JSON.stringify({ openid: data.openid, createdAt: Date.now() }), { expirationTtl: SESSION_TTL });
  await env.AUTH_KV.delete(`ticket:${ticket}`);
  return json(env, request, { ok: true, status: "bound", session, expiresIn: SESSION_TTL });
}

async function bind(env, request) {
  if (!env.BRIDGE_SECRET || request.headers.get("X-Bridge-Secret") !== env.BRIDGE_SECRET) {
    return json(env, request, { ok: false, code: "UNAUTHORIZED" }, 401);
  }
  let body;
  try { body = await request.json(); } catch (error) { return json(env, request, { ok: false, code: "BAD_JSON" }, 400); }
  const ticket = String(body.ticket || "");
  const openid = String(body.openid || "");
  if (!ticket || !openid) return json(env, request, { ok: false, code: "BAD_INPUT" }, 400);
  const raw = await env.AUTH_KV.get(`ticket:${ticket}`);
  if (!raw) return json(env, request, { ok: false, code: "EXPIRED" }, 410);
  await env.AUTH_KV.put(`ticket:${ticket}`, JSON.stringify({ status: "bound", openid, createdAt: Date.now() }), { expirationTtl: TICKET_TTL });
  return json(env, request, { ok: true });
}

async function me(env, request) {
  const auth = request.headers.get("Authorization") || "";
  const session = auth.replace(/^Bearer\s+/i, "");
  if (!session) return json(env, request, { ok: true, loggedIn: false });
  const raw = await env.AUTH_KV.get(`session:${session}`);
  return json(env, request, { ok: true, loggedIn: Boolean(raw) });
}

async function logout(env, request) {
  const auth = request.headers.get("Authorization") || "";
  const session = auth.replace(/^Bearer\s+/i, "");
  if (session) await env.AUTH_KV.delete(`session:${session}`);
  return json(env, request, { ok: true });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, request) });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/auth/start" && request.method === "GET") return await start(env, request);
      if (url.pathname === "/api/auth/status" && request.method === "GET") return await status(env, request);
      if (url.pathname === "/api/auth/bind" && request.method === "POST") return await bind(env, request);
      if (url.pathname === "/api/auth/me" && request.method === "GET") return await me(env, request);
      if (url.pathname === "/api/auth/logout" && request.method === "POST") return await logout(env, request);
      return json(env, request, { ok: false, code: "NOT_FOUND" }, 404);
    } catch (error) {
      return json(env, request, { ok: false, code: error.code || "AUTH_ERROR" }, error.code === "AUTH_NOT_CONFIGURED" ? 503 : 500);
    }
  }
};
