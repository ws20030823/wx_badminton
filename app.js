// app.js - 羽毛球組隊小程序入口
App({
  onLaunch() {
    // 初始化雲開發環境（請替換為你的雲環境 ID）
    if (wx.cloud) {
      wx.cloud.init({
        env: 'YOUR_CLOUD_ENV_ID',
        traceUser: true
      });
    }

    // 全域用戶資訊
    this.globalData = {
      userInfo: null,
      openid: null,
      userId: null
    };

    // 檢查登入狀態
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

  // 設定用戶資訊
  setUserInfo(userInfo, userId) {
    this.globalData.userInfo = userInfo;
    this.globalData.userId = userId;
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('userId', userId);
  },

  // 清除用戶資訊
  clearUserInfo() {
    this.globalData.userInfo = null;
    this.globalData.userId = null;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('userId');
  }
});
