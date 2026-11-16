const auth = require("../../utils/auth");

Page({
  data: {
    statusBarHeight: 20,
    loading: false
  },
  onLoad() {
    const app = getApp();
    const statusBarHeight = (app && app.globalData && app.globalData.statusBarHeight) || 20;
    this.setData({ statusBarHeight });
  },
  onShow() {
    if (auth.isLoggedIn()) {
      wx.reLaunch({ url: "/pages/home/index" });
    }
  },
  login() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    auth.login()
      .then(() => {
        wx.reLaunch({ url: "/pages/home/index" });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showModal({
          title: "登录未完成",
          content: (error && error.message) || "请稍后重试。",
          showCancel: false,
          confirmText: "知道了"
        });
      });
  },
  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
  }
});
