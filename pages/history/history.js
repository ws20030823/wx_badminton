// pages/history/history.js - 历史战绩
const app = getApp();

Page({
  data: {
    historyList: []
  },

  onLoad() {},

  onShow() {
    this.loadHistory();
  },

  async loadHistory() {
    const userId = app.globalData.userId;
    if (!userId) {
      this.setData({ historyList: [] });
      return;
    }

    wx.showLoading({ title: '加载中...' });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('matches')
        .where({
          status: 'finished',
          players: userId
        })
        .limit(100)
        .get();

      const raw = res.data || [];
      raw.sort((a, b) => {
        const ta = (a.finishedAt && a.finishedAt.seconds) || (a.startedAt && a.startedAt.seconds) || (a.createdAt && a.createdAt.seconds) || 0;
        const tb = (b.finishedAt && b.finishedAt.seconds) || (b.startedAt && b.startedAt.seconds) || (b.createdAt && b.createdAt.seconds) || 0;
        return tb - ta;
      });
      const list = raw.map(m => this.formatHistoryItem(m, userId));
      this.setData({ historyList: list });
    } catch (err) {
      console.error('loadHistory error:', err);
      this.setData({ historyList: [] });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onPullDownRefresh() {
    this.loadHistory().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onMatchTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/match-detail/match-detail?id=${id}`
    });
  },

  formatHistoryItem(m, userId) {
    const typeMap = { singles: '单打', doubles: '双打' };
    const subMap = { 'single-turn': '单打转', 'team-turn': '小队转', knockout: '晋级赛' };

    let dateStr = '';
    if (m.finishedAt && m.finishedAt.seconds) {
      const d = new Date(m.finishedAt.seconds * 1000);
      dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } else if (m.startedAt && m.startedAt.seconds) {
      const d = new Date(m.startedAt.seconds * 1000);
      dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else if (m.createdAt && m.createdAt.seconds) {
      const d = new Date(m.createdAt.seconds * 1000);
      dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
      ...m,
      dateStr,
      typeText: typeMap[m.type] || m.type,
      subModeText: subMap[m.subMode] || m.subMode,
      myWins: wins,
      myLosses: losses,
      winRate: wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(0) : 0
    };
  }
});
