const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const context = cloud.getWXContext();
  const openid = String(context.OPENID || "");
  const code = String((event && event.code) || "").replace(/\D/g, "");
  if (!openid || code.length !== 6) return { ok: false, code: "BAD_INPUT" };
  const db = cloud.database();
  try {
    const result = await db.collection("auth_tickets").where({ code, status: "pending" }).limit(1).get();
    const doc = (result.data || [])[0];
    if (!doc) return { ok: false, code: "INVALID_CODE" };
    if (Date.now() > Number(doc.expiresAt || 0)) return { ok: false, code: "EXPIRED" };
    if (Number(doc.attempts || 0) >= 5) return { ok: false, code: "TOO_MANY_ATTEMPTS" };
    await db.collection("auth_tickets").doc(doc._id).update({
      data: { status: "bound", openid, boundAt: Date.now() }
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, code: "BIND_FAILED" };
  }
};
