// pages/match-detail/match-detail.js - 比賽詳情
const app = getApp();

Page({
  data: {
    matchId: '',
    match: null,
    isCreator: false,
    hasJoined: false,
    playerList: []
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
    wx.showLoading({ title: '載入中...' });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('matches').doc(this.data.matchId).get();

      if (res.data) {
        const match = res.data;
        const userId = app.globalData.userId || '';
        const isCreator = match.creatorId === userId;
        const hasJoined = match.players && match.players.includes(userId);

        // 獲取報名用戶資訊
        let playerList = [];
        if (match.players && match.players.length > 0) {
          const usersRes = await db.collection('users')
            .where({ _id: db.command.in(match.players) })
            .get();
          playerList = usersRes.data || [];
        }

        this.setData({
          match,
          isCreator,
          hasJoined,
          playerList
        });
      } else {
        wx.showToast({ title: '比賽不存在', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '載入失敗', icon: 'none' });
      console.error(err);
    } finally {
      wx.hideLoading();
    }
  },

  async onJoinTap() {
    const userId = app.globalData.userId;
    if (!userId) {
      wx.showToast({ title: '請先登入', icon: 'none' });
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'joinMatch',
        data: { matchId: this.data.matchId }
      });
      const result = res.result;
      if (result && result.success) {
        wx.showToast({ title: '報名成功', icon: 'success' });
        this.loadMatch();
      } else {
        wx.showToast({ title: result?.message || '報名失敗', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '報名失敗', icon: 'none' });
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
        wx.showToast({ title: '組隊成功', icon: 'success' });
        this.loadMatch();
      } else {
        wx.showToast({ title: result?.message || '組隊失敗', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '組隊失敗', icon: 'none' });
    }
  },

  getStatusText(status) {
    const map = { registering: '報名中', teaming: '組隊中', playing: '進行中', finished: '已結束' };
    return map[status] || status;
  }
});
