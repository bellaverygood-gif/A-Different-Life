const LIVES = require("../../data/lives");

Page({
  data: {
    livesCount: LIVES.length,
    sample: (LIVES[0] && LIVES[0].sample) || ""
  },
  requireLoginThen(url) {
    const app = getApp();
    const go = () => wx.navigateTo({ url });
    if (app.globalData.loggedIn) {
      go();
      return;
    }
    app.ensureLogin(false).then((result) => {
      if (result && result.ok) {
        go();
      } else {
        wx.showToast({ title: "请先完成微信登录", icon: "none" });
      }
    });
  },
  openBlind() {
    this.requireLoginThen("/pages/life/index?draw=1");
  },
  openScript() {
    this.requireLoginThen("/pages/script/index");
  },
  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
  },
  onMiniLogin() {
    getApp().ensureLogin(true);
  },
  openAgreement() {
    wx.navigateTo({ url: "/pages/agreement/index" });
  },
  onShareAppMessage() {
    return {
      title: "抽一个人生，读完一个人的一生",
      path: "/pages/home/index"
    };
  }
});
