// pages/matches/matches.js - 我的对战
const app = getApp();

Page({
  data: {
    activeTab: 0,
    joinedList: [],
    createdList: []
  },

  onLoad() {},

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadMatches();
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.index });
  },

  async loadMatches() {
    const userId = app.globalData.userId;
    if (!userId) {
      this.setData({ joinedList: [], createdList: [] });
      return;
    }

    wx.showLoading({ title: '加载中...' });

    try {
      const db = wx.cloud.database();

      const [joinedRes, createdRes] = await Promise.all([
        db.collection('matches').where({
          players: userId
        }).orderBy('createdAt', 'desc').limit(50).get(),
        db.collection('matches').where({
          creatorId: userId
        }).orderBy('createdAt', 'desc').limit(50).get()
      ]);

      this.setData({
        joinedList: joinedRes.data || [],
        createdList: createdRes.data || []
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onPullDownRefresh() {
    this.loadMatches().then(() => wx.stopPullDownRefresh());
  },

  onMatchTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/match-detail/match-detail?id=${id}`
    });
  },

  getStatusText(status) {
    const map = { registering: '报名中', teaming: '组队中', playing: '进行中', finished: '已结束' };
    return map[status] || status;
  }
});
