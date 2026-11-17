const LIVES = require("../../data/lives");

Page({
  data: {
    livesCount: LIVES.length,
    sample: (LIVES[0] && LIVES[0].sample) || ""
  },
  openBlind() {
    wx.navigateTo({ url: "/pages/life/index?draw=1" });
  },
  openScript() {
    wx.navigateTo({ url: "/pages/script/index" });
  },
  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
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
