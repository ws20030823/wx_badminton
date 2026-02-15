// pages/match-detail/match-detail.js - 比赛详情
const app = getApp();

Page({
  data: {
    matchId: '',
    match: null,
    isCreator: false,
    hasJoined: false,
    playerList: [],
    userMap: {},
    activeTab: 0,
    rankings: [],
    matchups: []
  },

  onLoad(options) {
    const matchId = options.id;
    if (matchId) {
      this.setData({ matchId });
      this.loadMatch();
    }
  },

  onShow() {
    if (this.data.matchId) {
      this.loadMatch();
    }
  },

  async loadMatch() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'getMatchDetail',
        data: { matchId: this.data.matchId }
      });
      const result = res.result;

      if (result && result.success) {
        const { match, isCreator, hasJoined, playerList, userMap, rankings, matchups } = result;
        this.setData({
          match,
          isCreator,
          hasJoined,
          playerList,
          userMap: userMap || {},
          rankings,
          matchups
        });
      } else {
        wx.showToast({ title: result?.message || '比赛不存在', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error(err);
    } finally {
      wx.hideLoading();
    }
  },

  async onJoinTap() {
    const userId = app.globalData.userId;
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'joinMatch',
        data: { matchId: this.data.matchId }
      });
      const result = res.result;
      if (result && result.success) {
        wx.showToast({ title: '报名成功', icon: 'success' });
        this.loadMatch();
      } else {
        wx.showToast({ title: result?.message || '报名失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '报名失败', icon: 'none' });
    }
  },

  async onAddRobotTap() {
    if (!this.data.isCreator) return;

    try {
      const res = await wx.cloud.callFunction({
        name: 'addRobot',
        data: { matchId: this.data.matchId, count: 1 }
      });
      const result = res.result;
      if (result && result.success) {
        wx.showToast({ title: `已添加 ${result.added} 个机器人`, icon: 'success' });
        this.loadMatch();
      } else {
        wx.showToast({ title: result?.message || '添加失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },

  async onStartTeamTap() {
    if (!this.data.isCreator) return;

    try {
      const res = await wx.cloud.callFunction({
        name: 'generateTeams',
        data: { matchId: this.data.matchId }
      });
      const result = res.result;
      if (result && result.success) {
        wx.showToast({ title: '组队成功', icon: 'success' });
        this.loadMatch();
      } else {
        wx.showToast({ title: result?.message || '组队失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '组队失败', icon: 'none' });
    }
  },

  getStatusText(status) {
    const map = { registering: '报名中', teaming: '组队中', playing: '进行中', finished: '已结束' };
    return map[status] || status;
  },

  onTabChange(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({ activeTab: index });
  }
});
