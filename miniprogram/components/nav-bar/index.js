Component({
  options: {
    styleIsolation: "apply-shared"
  },
  properties: {
    title: {
      type: String,
      value: ""
    },
    back: {
      type: Boolean,
      value: true
    }
  },
  data: {
    statusBarHeight: 20,
    menuHeight: 32,
    menuOffset: 4,
    rightGap: 100
  },
  lifetimes: {
    attached() {
      const app = getApp();
      const statusBarHeight = (app && app.globalData && app.globalData.statusBarHeight) || 20;
      let menu = { top: statusBarHeight + 4, left: 280, height: 32 };
      let windowWidth = (app && app.globalData && app.globalData.windowWidth) || 375;
      try {
        if (wx.getMenuButtonBoundingClientRect) menu = wx.getMenuButtonBoundingClientRect();
      } catch (error) {}
      const menuOffset = Math.max(0, Number(menu.top || statusBarHeight + 4) - statusBarHeight);
      const rightGap = Math.max(96, windowWidth - Number(menu.left || windowWidth - 96) + 8);
      this.setData({
        statusBarHeight,
        menuHeight: Number(menu.height || 32),
        menuOffset,
        rightGap
      });
    }
  },
  methods: {
    goBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.reLaunch({ url: "/pages/home/index" });
      }
    },
    goHome() {
      wx.reLaunch({ url: "/pages/home/index" });
    }
  }
});
