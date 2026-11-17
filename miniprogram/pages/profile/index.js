const store = require("../../utils/store");
const auth = require("../../utils/auth");
const guard = require("../../utils/guard");

Page({
  data: {
    name: "",
    initial: "客",
    stats: {
      lives: 0,
      ssr: 0,
      modes: 0
    },
    nameDraft: "",
    editing: false,
    loggedIn: false,
    wechatLabel: "",
    loginBusy: false
  },
  onShow() {
    if (!guard.requireLogin()) return;
    this.refresh();
  },
  refresh() {
    const state = store.getState();
    const name = String(state.user.name || "").trim();
    this.setData({
      name,
      initial: (name || "客").slice(0, 1),
      nameDraft: name,
      stats: {
        lives: store.countReadLives(),
        ssr: store.countSsrMoments(),
        modes: store.countSeenModes()
      },
      loggedIn: auth.isLoggedIn(),
      wechatLabel: auth.maskedOpenid()
    });
  },
  toggleEdit() {
    this.setData({ editing: !this.data.editing, nameDraft: this.data.name });
  },
  onNameInput(event) {
    this.setData({ nameDraft: event.detail.value });
  },
  loginWechat() {
    if (this.data.loginBusy) return;
    this.setData({ loginBusy: true });
    wx.showLoading({ title: "正在连接微信", mask: true });
    auth.login()
      .then(() => {
        wx.hideLoading();
        this.setData({ loginBusy: false });
        this.refresh();
        wx.showToast({ title: "微信已连接", icon: "none" });
      })
      .catch((error) => {
        wx.hideLoading();
        this.setData({ loginBusy: false });
        wx.showModal({
          title: "登录未完成",
          content: (error && error.message) || "请先在开发者工具中开通云开发，并部署登录云函数。",
          showCancel: false,
          confirmText: "知道了"
        });
      });
  },
  logoutWechat() {
    wx.showModal({
      title: "退出微信登录？",
      content: "退出后，本机人生记录仍会保留。",
      confirmText: "退出",
      confirmColor: "#b57b6e",
      cancelText: "取消",
      success: (res) => {
        if (!res.confirm) return;
        auth.logout();
        wx.reLaunch({ url: "/pages/login/index" });
      }
    });
  },
  saveName() {
    const name = String(this.data.nameDraft || "").trim();
    store.updateUser({ name });
    this.setData({ editing: false });
    this.refresh();
    wx.showToast({ title: name ? "名字已保存" : "已恢复为访客", icon: "none" });
  },
  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
  },
  clearData() {
    wx.showModal({
      title: "清除本机数据？",
      content: "将删除昵称、出生信息、抽到的人生、高光统计、微信登录状态和所有暂停注脚。此操作不可恢复。",
      confirmText: "清除",
      confirmColor: "#b57b6e",
      cancelText: "取消",
      success: (res) => {
        if (!res.confirm) return;
        store.resetState();
        wx.reLaunch({ url: "/pages/login/index" });
      }
    });
  },
  onShareAppMessage() {
    return {
      title: "我的此生之外星图",
      path: "/pages/home/index"
    };
  }
});
