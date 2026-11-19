const cloud = require("wx-server-sdk");
const crypto = require("crypto");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const db = cloud.database();
  const ticket = String(
    (event && event.queryStringParameters && event.queryStringParameters.ticket) ||
    (event && event.ticket) || ""
  );
  if (!ticket) return { ok: false, code: "NO_TICKET" };
  try {
    const result = await db.collection("auth_tickets").doc(ticket).get();
    const data = result.data || {};
    if (!data.status) return { ok: false, code: "EXPIRED" };
    if (Date.now() > Number(data.expiresAt || 0)) {
      await db.collection("auth_tickets").doc(ticket).remove().catch(() => {});
      return { ok: false, code: "EXPIRED" };
    }
    if (data.status !== "bound" || !data.openid) return { ok: true, status: "pending" };
    const session = crypto.randomBytes(24).toString("hex");
    await db.collection("auth_sessions").doc(session).set({
      data: { openid: data.openid, createdAt: Date.now(), expiresAt: Date.now() + 7 * 86400000 }
    });
    await db.collection("auth_tickets").doc(ticket).remove().catch(() => {});
    return { ok: true, status: "bound", session };
  } catch (error) {
    return { ok: false, code: "EXPIRED" };
  }
};
