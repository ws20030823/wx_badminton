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
        joinedList: (joinedRes.data || []).map(m => this.formatMatch(m)),
        createdList: (createdRes.data || []).map(m => this.formatMatch(m))
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
  },

  formatMatch(m) {
    const statusMap = { registering: '报名中', teaming: '组队中', playing: '进行中', finished: '已结束' };
    const typeMap = { singles: '单打', doubles: '双打' };
    const subMap = { 'single-turn': '单打转', 'team-turn': '小队转', knockout: '晋级赛' };
    let dateMonth = 'JAN', dateDay = '1';
    if (m.createdAt && m.createdAt.seconds) {
      const d = new Date(m.createdAt.seconds * 1000);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      dateMonth = months[d.getMonth()];
      dateDay = String(d.getDate());
    }
    return {
      ...m,
      statusText: statusMap[m.status] || m.status,
      typeText: typeMap[m.type] || m.type,
      subModeText: subMap[m.subMode] || m.subMode,
      dateMonth,
      dateDay,
      timeText: m.time || '时间待定',
      locationText: m.location || '地点待定'
    };
  }
});
