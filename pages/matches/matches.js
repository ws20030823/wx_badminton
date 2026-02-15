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
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({ activeTab: index });
  },

  async loadMatches() {
    const userId = app.globalData.userId;
    if (!userId) {
      this.setData({ joinedList: [], createdList: [] });
      return Promise.resolve();
    }

    wx.showLoading({ title: '加载中...' });

    try {
      const db = wx.cloud.database();

      const [joinedRes, createdRes] = await Promise.all([
        db.collection('matches').where({ players: userId }).limit(50).get(),
        db.collection('matches').where({ creatorId: userId }).limit(50).get()
      ]);

      const joined = (joinedRes.data || []).sort((a, b) => {
        const ta = (a.createdAt && a.createdAt.seconds) || 0;
        const tb = (b.createdAt && b.createdAt.seconds) || 0;
        return tb - ta;
      });
      const created = (createdRes.data || []).sort((a, b) => {
        const ta = (a.createdAt && a.createdAt.seconds) || 0;
        const tb = (b.createdAt && b.createdAt.seconds) || 0;
        return tb - ta;
      });

      this.setData({
        joinedList: joined.map(m => this.formatMatch(m)),
        createdList: created.map(m => this.formatMatch(m))
      });
    } catch (err) {
      console.error('loadMatches error:', err);
      this.setData({ joinedList: [], createdList: [] });
      const msg = (err.errMsg || err.message || '').includes('INVALID_ENV')
        ? '请先在 app.js 中配置云开发环境 ID'
        : '加载失败';
      wx.showToast({ title: msg, icon: 'none', duration: 3000 });
    } finally {
      wx.hideLoading();
    }
    return Promise.resolve();
  },

  onPullDownRefresh() {
    this.loadMatches().then(() => {
      wx.stopPullDownRefresh();
    });
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
      timeText: (m.startTime && m.endTime) ? `${m.startTime} - ${m.endTime}` : (m.startTime || m.time || '时间待定'),
      locationText: m.location ? (m.courtNumber ? `${m.location} (${m.courtNumber})` : m.location) : '地点待定'
    };
  }
});
