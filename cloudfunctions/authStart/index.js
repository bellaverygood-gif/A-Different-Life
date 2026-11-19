const cloud = require("wx-server-sdk");
const crypto = require("crypto");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function ticket() {
  return crypto.randomBytes(8).toString("hex");
}

function sixDigitCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

exports.main = async () => {
  const db = cloud.database();
  const value = ticket();
  const now = Date.now();
  let code = sixDigitCode();
  for (let i = 0; i < 5; i += 1) {
    const existing = await db.collection("auth_tickets").where({ code, status: "pending" }).limit(1).get().catch(() => ({ data: [] }));
    if (!(existing.data || []).length) break;
    code = sixDigitCode();
  }
  await db.collection("auth_tickets").doc(value).set({
    data: { status: "pending", code, openid: "", attempts: 0, createdAt: now, expiresAt: now + 180000 }
  });
  return { ok: true, ticket: value, code, expiresIn: 180 };
};
