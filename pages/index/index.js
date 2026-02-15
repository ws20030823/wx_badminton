// pages/index/index.js - 首页
const app = getApp();

Page({
  data: {
    recentRecords: []
  },

  onLoad() {},

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.loadRecentRecords();
  },

  async loadRecentRecords() {
    const userId = app.globalData.userId;
    if (!userId) {
      this.setData({ recentRecords: [] });
      return;
    }

    try {
      const db = wx.cloud.database();
      const res = await db.collection('matches')
        .where({ status: 'finished', players: userId })
        .limit(3)
        .get();

      const raw = res.data || [];
      raw.sort((a, b) => {
        const ta = (a.finishedAt && a.finishedAt.seconds) || (a.startedAt && a.startedAt.seconds) || (a.createdAt && a.createdAt.seconds) || 0;
        const tb = (b.finishedAt && b.finishedAt.seconds) || (b.startedAt && b.startedAt.seconds) || (b.createdAt && b.createdAt.seconds) || 0;
        return tb - ta;
      });
      const list = raw.map(m => this.formatRecordItem(m, userId));
      this.setData({ recentRecords: list });
    } catch (err) {
      this.setData({ recentRecords: [] });
    }
  },

  formatRecordItem(m, userId) {
    const typeMap = { singles: '单打', doubles: '双打' };
    const subMap = { 'single-turn': '单打转', 'team-turn': '小队转', knockout: '晋级赛' };

    let dateStr = '';
    if (m.finishedAt && m.finishedAt.seconds) {
      const d = new Date(m.finishedAt.seconds * 1000);
      dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
    } else if (m.createdAt && m.createdAt.seconds) {
      const d = new Date(m.createdAt.seconds * 1000);
      dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
    } else {
      dateStr = '--';
    }

    const results = m.results || {};
    let wins = 0;
    let losses = 0;
    Object.values(results).forEach(r => {
      if (r.winner === userId) wins++;
      if (r.loser === userId) losses++;
    });

    return {
      _id: m._id,
      name: m.name,
      dateStr,
      typeText: typeMap[m.type] || m.type,
      subModeText: subMap[m.subMode] || m.subMode,
      myWins: wins,
      myLosses: losses
    };
  },

  onRecordTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/match-detail/match-detail?id=${id}` });
    }
  },

  // 点击单打
  onSinglesTap() {
    wx.navigateTo({
      url: '/pages/singles-mode/singles-mode'
    });
  },

  // 点击双打
  onDoublesTap() {
    wx.navigateTo({
      url: '/pages/doubles-mode/doubles-mode'
    });
  },

  onAnnouncementTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onViewAllRecords() {
    wx.navigateTo({ url: '/pages/history/history' });
  }
});
