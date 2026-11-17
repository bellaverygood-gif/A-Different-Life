const cloud = require("wx-server-sdk");
const https = require("https");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function post(url, body, secret) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(url, {
      method: "POST",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "X-Bridge-Secret": secret
      }
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error("WEB_AUTH_" + res.statusCode));
          return;
        }
        resolve(raw);
      });
    });
    req.on("timeout", () => req.destroy(new Error("WEB_AUTH_TIMEOUT")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

exports.main = async (event) => {
  const context = cloud.getWXContext();
  const openid = String(context.OPENID || "");
  const ticket = String((event && event.ticket) || "");
  const webUrl = String(process.env.WEB_AUTH_URL || "");
  const secret = String(process.env.BRIDGE_SECRET || "");
  if (!ticket || !openid) return { ok: false, code: "BAD_INPUT" };
  if (!webUrl || !secret) return { ok: false, code: "NOT_CONFIGURED" };
  try {
    await post(`${webUrl.replace(/\/$/, "")}/api/auth/bind`, { ticket, openid }, secret);
    return { ok: true };
  } catch (error) {
    return { ok: false, code: "BIND_FAILED" };
  }
};
