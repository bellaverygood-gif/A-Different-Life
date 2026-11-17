const config = require("../config");

let initialized = false;

function initCloud() {
  if (initialized) return true;
  if (!wx.cloud) return false;
  try {
    const options = { traceUser: false };
    if (config.CLOUD_ENV) options.env = config.CLOUD_ENV;
    wx.cloud.init(options);
    initialized = true;
    return true;
  } catch (error) {
    return false;
  }
}

function generate(payload) {
  return new Promise((resolve, reject) => {
    if (!initCloud()) {
      reject(new Error("当前微信版本不支持云开发。"));
      return;
    }
    wx.cloud.callFunction({
      name: "deepseek",
      data: { payload },
      success: (response) => {
        const result = (response && response.result) || {};
        if (!result.ok) {
          const messages = {
            AI_NOT_CONFIGURED: "AI 还没有配置，先继续读免费剧本。",
            BUDGET: result.message || "本月 AI 次数已经用完。",
            CRISIS_CONTENT: "这段文字不适合继续生成，请先照顾好自己。",
            AI_TIMEOUT: "这次生成超时了，先继续读免费剧本。",
            INVALID_OUTPUT: "这次没有生成成功，先继续读免费剧本。"
          };
          reject(new Error(messages[result.code] || "这次没有生成成功。"));
          return;
        }
        resolve(result.data);
      },
      fail: () => reject(new Error("云函数调用失败，请确认 deepseek 云函数已部署。"))
    });
  });
}

module.exports = { generate };
