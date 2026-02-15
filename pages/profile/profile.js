// pages/profile/profile.js - 我的
const app = getApp();

Page({
  data: {
    userInfo: null,
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
    const userInfo = app.globalData.userInfo;
    const userId = app.globalData.userId;

    this.setData({ userInfo });

    if (!userId) {
      return;
    }

    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').doc(userId).get();
      if (res.data && res.data.stats) {
        const stats = res.data.stats;
        const winRate = stats.wins + stats.losses > 0
          ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
          : 0;
        this.setData({
          stats: {
            ...stats,
            winRate
          }
        });
      }
    } catch (err) {
      console.error('加载用户统计失败', err);
    }
  },

  onLoginTap() {
    wx.getUserProfile({
      desc: '用於完善用戶資料',
      success: async (res) => {
        const userInfo = res.userInfo;
        app.setUserInfo(userInfo, userInfo._id || 'temp');
        this.loadUserInfo();

        try {
          const cloudRes = await wx.cloud.callFunction({ name: 'createMatch', data: {} });
          // 實際應有專門的 saveUser 雲函數，此處省略
        } catch (e) {}
      },
      fail: (err) => {
        wx.showToast({ title: '授权失败', icon: 'none' });
      }
    });
  }
});
