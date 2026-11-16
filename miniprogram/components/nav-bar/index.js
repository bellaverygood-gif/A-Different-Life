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
    statusBarHeight: 20
  },
  lifetimes: {
    attached() {
      const app = getApp();
      const statusBarHeight = (app && app.globalData && app.globalData.statusBarHeight) || 20;
      this.setData({ statusBarHeight });
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
