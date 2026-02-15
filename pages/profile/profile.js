// pages/profile/profile.js - 我的
const app = getApp();

Page({
  data: {
    userInfo: null,
    userIdShort: '',
    levelText: '羽球新手 Lv.1',
    stats: {
      totalMatches: 0,
      createdMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0
    }
  },

  onLoad() {},

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.loadUserInfo();
  },

  async loadUserInfo() {
    let userInfo = app.globalData.userInfo;
    let userId = app.globalData.userId;

    // 清除无效的 userId（如旧版本存储的 'temp'），仅清除 userId 保留头像昵称
    if (userId === 'temp' || userId === 'undefined' || String(userId) === 'null') {
      app.globalData.userId = null;
      wx.removeStorageSync('userId');
      userId = null;
    }

    const short = userId ? String(userId).slice(-4) : '';
    this.setData({ userInfo, userIdShort: short || '---' });

    try {
      const res = await wx.cloud.callFunction({ name: 'getUserStats' });
      const result = res.result;
      if (result && result.success && result.stats) {
        this.setData({ stats: result.stats });
      }
      if (result && result.success && result.userId && !userId) {
        app.globalData.userId = result.userId;
        wx.setStorageSync('userId', result.userId);
        this.setData({ userIdShort: String(result.userId).slice(-4) });
      }
    } catch (err) {
      console.error('加载用户统计失败', err);
    }
  },

  onLoginTap() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: async (res) => {
        const userInfo = res.userInfo;
        app.setUserInfo(userInfo, null);
        this.loadUserInfo();

        try {
          const cloudRes = await wx.cloud.callFunction({
            name: 'saveUser',
            data: {
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl
            }
          });
          const result = cloudRes.result;
          if (result && result.success && result.userId) {
            app.setUserInfo(userInfo, result.userId);
            this.loadUserInfo();
            wx.showToast({ title: '登录成功', icon: 'success' });
          }
        } catch (err) {
          console.error('saveUser error:', err);
          wx.showToast({ title: '登录成功，数据同步失败', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '授权失败', icon: 'none' });
      }
    });
  },

  onLevelTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },
  onRecordTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },
  onMatchesTap() {
    wx.switchTab({ url: '/pages/matches/matches' });
  },
  onFeedbackTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },
  onPrivacyTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },
  onAboutTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },
  onLogoutTap() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.clearUserInfo();
          this.setData({ userInfo: null, stats: { totalMatches: 0, createdMatches: 0, wins: 0, losses: 0, winRate: 0 } });
          wx.showToast({ title: '已退出', icon: 'none' });
        }
      }
    });
  }
});
