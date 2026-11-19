Page({
  data: {
    updatedAt: "2026-11-17"
  },
  openAgreement() {
    wx.navigateTo({ url: "/pages/agreement/index" });
  },
  onShareAppMessage() {
    return {
      title: "此生之外 · 隐私说明",
      path: "/pages/home/index"
    };
  }
});
