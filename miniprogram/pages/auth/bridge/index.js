const config = require("../../../config");

Page({
  data: {
    status: "loading",
    ticket: "",
    message: "正在连接微信登录…"
  },
  onLoad(options) {
    const ticket = decodeURIComponent((options && options.scene) || "");
    if (!ticket) {
      this.setData({ status: "error", message: "这个登录链接不完整，请回到网页重新生成二维码。" });
      return;
    }
    this.setData({ ticket });
    this.login();
  },
  initCloud() {
    if (!wx.cloud) return false;
    try {
      const options = { traceUser: false };
      if (config.CLOUD_ENV) options.env = config.CLOUD_ENV;
      wx.cloud.init(options);
      return true;
    } catch (error) {
      return false;
    }
  },
  login() {
    if (this.data.status === "authorizing") return;
    if (!this.initCloud()) {
      this.setData({ status: "error", message: "当前微信版本不支持云开发。" });
      return;
    }
    this.setData({ status: "authorizing", message: "正在获取微信登录状态…" });
    wx.login({
      success: () => {
        wx.cloud.callFunction({
          name: "auth",
          data: { ticket: this.data.ticket },
          success: (response) => {
            const result = (response && response.result) || {};
            if (!result.ok) {
              this.setData({ status: "error", message: result.code === "NOT_CONFIGURED" ? "登录服务尚未配置。" : "这次没有完成登录，请重试。" });
              return;
            }
            this.setData({ status: "success", message: "微信登录已完成。" });
          },
          fail: () => this.setData({ status: "error", message: "云函数调用失败，请确认 auth 云函数已部署。" })
        });
      },
      fail: () => this.setData({ status: "error", message: "微信登录失败，请重试。" })
    });
  },
  retry() {
    if (this.data.status === "error") this.login();
  },
  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
  }
});
