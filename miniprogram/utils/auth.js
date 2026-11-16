const config = require("../config");
const store = require("./store");

let cloudInitialized = false;
let cloudInitError = null;

function initCloud() {
  if (cloudInitialized) return true;
  if (!wx.cloud) {
    cloudInitError = new Error("当前微信版本不支持云开发，请升级微信后重试。");
    return false;
  }
  try {
    const options = { traceUser: true };
    if (config.CLOUD_ENV) options.env = config.CLOUD_ENV;
    wx.cloud.init(options);
    cloudInitialized = true;
    cloudInitError = null;
    return true;
  } catch (error) {
    cloudInitError = new Error("云开发初始化失败，请检查 miniprogram/config.js 中的环境 ID。");
    return false;
  }
}

function login() {
  return new Promise((resolve, reject) => {
    if (!initCloud()) {
      reject(cloudInitError || new Error("云开发不可用，请稍后重试。"));
      return;
    }

    wx.cloud.callFunction({
      name: "login",
      success: (response) => {
        const result = response.result || {};
        const openid = String(result.openid || "").trim();
        if (!openid) {
          reject(new Error("登录服务没有返回身份标识，请确认登录云函数已部署。"));
          return;
        }
        const current = store.getUser();
        const patch = {
          loggedIn: true,
          openid,
          loginAt: Date.now()
        };
        if (!String(current.name || "").trim()) patch.name = "微信旅人";
        resolve(store.updateUser(patch));
      },
      fail: (error) => {
        const raw = String((error && error.errMsg) || "");
        const friendly = /function|cloud|env|FUNCTION_NOT_FOUND|系统错误/i.test(raw)
          ? "登录服务尚未配置。请先在开发者工具中开通云开发，并部署登录云函数。"
          : "微信登录失败：" + (raw || "请稍后重试。");
        reject(new Error(friendly));
      }
    });
  });
}

function logout() {
  return store.updateUser({
    loggedIn: false,
    openid: "",
    loginAt: 0
  });
}

function isLoggedIn() {
  return Boolean(store.getUser().loggedIn && store.getUser().openid);
}

function maskedOpenid() {
  const openid = String(store.getUser().openid || "");
  if (!openid) return "";
  if (openid.length <= 10) return openid;
  return openid.slice(0, 6) + "…" + openid.slice(-4);
}

module.exports = {
  initCloud,
  login,
  logout,
  isLoggedIn,
  maskedOpenid
};
