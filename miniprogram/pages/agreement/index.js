Page({
  data: {
    updatedAt: "2026-11-16"
  },
  goBack() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: "/pages/home/index" })
    });
  },
  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
  },
  onShareAppMessage() {
    return {
      title: "此生之外 · 用户协议",
      path: "/pages/home/index"
    };
  }
});
