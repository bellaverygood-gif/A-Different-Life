const cloud = require("wx-server-sdk");
const https = require("https");
const crypto = require("crypto");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const API_HOST = "api.deepseek.com";
const API_PATH = "/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const MONTHLY_LIMIT = Number(process.env.AI_MONTHLY_LIMIT || 100);
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 3);
const cache = new Map();
const daily = new Map();
let monthlyCount = 0;
let monthKey = "";

const CRISIS = /自杀|自残|不想活|结束生命|伤害自己|活不下去/i;
const BANNED = /命中注定|改命|克夫克妻|必然|你本可以|你一定/;

function monthStamp() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
}

function checkBudget(openid) {
  const currentMonth = monthStamp();
  if (monthKey !== currentMonth) {
    monthKey = currentMonth;
    monthlyCount = 0;
  }
  if (monthlyCount >= MONTHLY_LIMIT) return "本月 AI 预算已用完";
  const day = new Date().toISOString().slice(0, 10);
  const key = `${openid}:${day}`;
  const used = daily.get(key) || 0;
  if (used >= DAILY_LIMIT) return "今天已经生成过了，明天再来";
  daily.set(key, used + 1);
  monthlyCount += 1;
  return "";
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function prompt(payload) {
  return [
    "你是中文文化叙事作者，为微信小程序「此生之外」写一份个性化剧本。",
    "定位：文化叙事，不是命运预测。不断言吉凶、寿命、疾病、婚姻成败、财富数额。",
    "必须遵守：",
    "1. 用第二人称“你”，但不要替用户做决定。",
    "2. 不写“命中注定”“改命”“克夫克妻”“必然”。",
    "3. 不写医疗、法律、投资建议。",
    "4. 不写系统性更好或更差的结论；得到与失去必须并存。",
    "5. 只输出 JSON，不要 Markdown，不要解释。",
    "JSON 结构：",
    '{"title":"片名","prologue":"序章，120字内","acts":[{"label":"早年","text":"200字内"},{"label":"中年","text":"200字内"},{"label":"后来","text":"200字内"}],"choiceAct":"不由星辰决定的一幕，150字内","closing":"一句落点，80字内","diff":{"summary":{"gained":["得到1"],"lost":["失去1"],"unchanged":["没有变1"]},"sections":[{"stage":"早年","status":"unchanged|changed|new|removed","text":"变化后的句子","original":"原句"}]}}',
    "如果用户没有填写选择，diff 可以为 null。",
    "用户信息（已匿名，不含出生日期、地点、昵称、openid）：",
    JSON.stringify(payload)
  ].join("\n");
}

function requestDeepSeek(payload) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Promise.reject(Object.assign(new Error("AI_NOT_CONFIGURED"), { code: "AI_NOT_CONFIGURED" }));
  }
  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: "你只输出合法 JSON。" },
      { role: "user", content: prompt(payload) }
    ],
    temperature: 0.7,
    max_tokens: 1800,
    response_format: { type: "json_object" }
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: API_HOST,
      path: API_PATH,
      method: "POST",
      timeout: 25000,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Authorization: `Bearer ${apiKey}`
      }
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(Object.assign(new Error("AI_UPSTREAM_ERROR"), { code: "AI_UPSTREAM_ERROR", status: res.statusCode }));
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          const content = parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content;
          if (!content) throw new Error("EMPTY_AI_RESPONSE");
          resolve(content);
        } catch (error) {
          reject(Object.assign(new Error("AI_BAD_RESPONSE"), { code: "AI_BAD_RESPONSE" }));
        }
      });
    });
    req.on("timeout", () => req.destroy(Object.assign(new Error("AI_TIMEOUT"), { code: "AI_TIMEOUT" })));
    req.on("error", (error) => reject(error));
    req.write(body);
    req.end();
  });
}

function parseJSON(text) {
  const cleaned = String(text || "").replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

function validate(data) {
  if (!data || typeof data !== "object") return false;
  if (!data.title || !data.prologue || !data.choiceAct || !data.closing) return false;
  if (!Array.isArray(data.acts) || data.acts.length !== 3) return false;
  return data.acts.every((act) => act && act.label && act.text);
}

exports.main = async (event) => {
  const context = cloud.getWXContext();
  const openid = context.OPENID || "anonymous";
  const payload = event && event.payload;
  if (!payload || !payload.chart || !payload.script) {
    return { ok: false, code: "BAD_INPUT" };
  }
  const choice = payload.choice || {};
  if (CRISIS.test(JSON.stringify(choice))) {
    return { ok: false, code: "CRISIS_CONTENT" };
  }
  const sanitized = {
    chart: payload.chart,
    script: payload.script,
    choice: choice.theme || choice.stage ? { theme: choice.theme, stage: choice.stage } : null
  };
  const key = hash(JSON.stringify(sanitized));
  if (cache.has(key)) {
    return { ok: true, data: cache.get(key), cached: true };
  }
  const budgetError = checkBudget(openid);
  if (budgetError) return { ok: false, code: "BUDGET", message: budgetError };

  try {
    const raw = await requestDeepSeek(sanitized);
    const data = parseJSON(raw);
    if (!validate(data)) return { ok: false, code: "INVALID_OUTPUT" };
    const serialized = JSON.stringify(data);
    if (serialized.length > 12000) return { ok: false, code: "TOO_LONG" };
    if (BANNED.test(serialized)) return { ok: false, code: "INVALID_OUTPUT" };
    cache.set(key, data);
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      code: error.code || "AI_ERROR",
      message: error.code === "AI_NOT_CONFIGURED" ? "AI 尚未配置" : "这次没有生成成功"
    };
  }
};
