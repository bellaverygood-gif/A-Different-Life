const auth = require("./auth");

function requireLogin() {
  if (auth.isLoggedIn()) return true;
  wx.reLaunch({ url: "/pages/login/index" });
  return false;
}

module.exports = {
  requireLogin
};
