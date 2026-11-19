const config = require("./config");

App({
  onLaunch() {
    let statusBarHeight = 20;
    let windowWidth = 375;
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      statusBarHeight = info.statusBarHeight || statusBarHeight;
      windowWidth = info.windowWidth || windowWidth;
    } catch (error) {
      // 使用默认值。
    }
    this.globalData.statusBarHeight = statusBarHeight;
    this.globalData.windowWidth = windowWidth;
    this.ensureLogin();
  },
  ensureLogin(showToast) {
    const self = this;
    return new Promise((resolve) => {
      if (!wx.cloud) {
        if (showToast) wx.showToast({ title: "当前微信版本不支持", icon: "none" });
        resolve({ ok: false });
        return;
      }
      try {
        const options = { traceUser: false };
        if (config.CLOUD_ENV) options.env = config.CLOUD_ENV;
        wx.cloud.init(options);
      } catch (error) {
        if (showToast) wx.showToast({ title: "云开发初始化失败", icon: "none" });
        resolve({ ok: false });
        return;
      }
      wx.login({
        success: () => {
          wx.cloud.callFunction({
            name: "login",
            success: (response) => {
              const result = (response && response.result) || {};
              self.globalData.openid = result.openid || "";
              self.globalData.loggedIn = Boolean(result.ok && result.openid);
              if (showToast) wx.showToast({ title: self.globalData.loggedIn ? "已登录" : "登录失败", icon: "none" });
              resolve(result);
            },
            fail: () => {
              if (showToast) wx.showToast({ title: "登录失败，请重试", icon: "none" });
              resolve({ ok: false });
            }
          });
        },
        fail: () => {
          if (showToast) wx.showToast({ title: "微信登录失败", icon: "none" });
          resolve({ ok: false });
        }
      });
    });
  },
  globalData: {
    statusBarHeight: 20,
    windowWidth: 375,
    openid: "",
    loggedIn: false
  }
});
