// app.js - 羽毛球组队小程序入口
App({
  onLaunch() {
    // 初始化云开发环境（请替换为你的云环境 ID）
    if (wx.cloud) {
      wx.cloud.init({
        env: 'YOUR_CLOUD_ENV_ID',
        traceUser: true
      });
    }

    // 全局用户信息
    this.globalData = {
      userInfo: null,
      openid: null,
      userId: null
    };

    // 检查登录状态
    this.checkLogin();
  },

  onShow() {
    // 小程序顯示時
  },

  onHide() {
    // 小程序隱藏時
  },

  // 檢查登入狀態
  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo');
    const userId = wx.getStorageSync('userId');
    if (userInfo && userId) {
      this.globalData.userInfo = userInfo;
      this.globalData.userId = userId;
    }
  },

  // 设置用户信息
  setUserInfo(userInfo, userId) {
    this.globalData.userInfo = userInfo;
    this.globalData.userId = userId;
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('userId', userId);
  },

  // 清除用户信息
  clearUserInfo() {
    this.globalData.userInfo = null;
    this.globalData.userId = null;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('userId');
  }
});
