const store = require("./utils/store");

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
    store.bumpVisit();
  },
  globalData: {
    statusBarHeight: 20,
    windowWidth: 375
  }
});
