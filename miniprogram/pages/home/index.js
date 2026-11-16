Page({
  data: {
    livesCount: 18
  },
  openBlind() {
    wx.navigateTo({ url: "/pages/life/index" });
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
      title: "抽一个盲盒，读完一个人的一生",
      path: "/pages/home/index"
    };
  }
});
