// pages/match-detail/match-detail.js - 比赛详情
const app = getApp();

Page({
  data: {
    matchId: '',
    match: null,
    isCreator: false,
    hasJoined: false,
    playerList: [],
    teamList: [],
    myTeamIndex: -1,
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
        const { match, isCreator, hasJoined, playerList, teamList, myTeamIndex, userMap, rankings, matchups } = result;
        this.setData({
          match,
          isCreator,
          hasJoined,
          playerList,
          teamList: teamList || [],
          myTeamIndex: myTeamIndex != null ? myTeamIndex : -1,
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

    const { match, teamList } = this.data;
    const isTeamTurn = match && match.subMode === 'team-turn' && teamList && teamList.length > 0;

    if (isTeamTurn) {
      const itemList = teamList.map(t => `${t.teamLabel} (${(t.players || []).length}人)`);
      wx.showActionSheet({
        itemList,
        success: (res) => {
          const teamIndex = res.tapIndex;
          this.doJoinMatch(teamIndex);
        },
        fail: () => {}
      });
    } else {
      this.doJoinMatch();
    }
  },

  async doJoinMatch(teamIndex) {
    const payload = { matchId: this.data.matchId };
    if (teamIndex != null) payload.teamIndex = teamIndex;

    try {
      wx.showLoading({ title: '报名中...' });
      const res = await wx.cloud.callFunction({
        name: 'joinMatch',
        data: payload
      });
      wx.hideLoading();
      const result = res.result;
      if (result && result.success) {
        wx.showToast({ title: '报名成功', icon: 'success' });
        this.loadMatch();
      } else {
        wx.showToast({ title: result?.message || '报名失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '报名失败', icon: 'none' });
    }
  },

  onSwitchTeamTap() {
    const { teamList, myTeamIndex } = this.data;
    if (!teamList || teamList.length < 2 || myTeamIndex < 0) return;

    const options = teamList
      .map((t, i) => ({ index: i, label: `${t.teamLabel} (${(t.players || []).length}人)` }))
      .filter(t => t.index !== myTeamIndex);

    wx.showActionSheet({
      itemList: options.map(o => o.label),
      success: (res) => {
        const toTeamIndex = options[res.tapIndex].index;
        this.doSwitchTeam(toTeamIndex);
      }
    });
  },

  async doSwitchTeam(toTeamIndex) {
    try {
      wx.showLoading({ title: '切换中...' });
      const res = await wx.cloud.callFunction({
        name: 'switchTeam',
        data: { matchId: this.data.matchId, toTeamIndex }
      });
      wx.hideLoading();
      const result = res.result;
      if (result && result.success) {
        wx.showToast({ title: '切换成功', icon: 'success' });
        this.loadMatch();
      } else {
        wx.showToast({ title: result?.message || '切换失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '切换失败', icon: 'none' });
    }
  },

  onAddRobotTap() {
    if (!this.data.isCreator) return;

    const { match, teamList } = this.data;
    const isTeamTurn = match && match.subMode === 'team-turn' && teamList && teamList.length > 0;

    if (isTeamTurn) {
      const itemList = teamList.map(t => `${t.teamLabel} (${(t.players || []).length}人)`);
      wx.showActionSheet({
        itemList,
        success: (res) => {
          this.doAddRobot(res.tapIndex);
        },
        fail: () => {}
      });
    } else {
      this.doAddRobot();
    }
  },

  async doAddRobot(teamIndex) {
    const payload = { matchId: this.data.matchId, count: 1 };
    if (teamIndex != null) payload.teamIndex = teamIndex;

    try {
      wx.showLoading({ title: '添加中...' });
      const res = await wx.cloud.callFunction({
        name: 'addRobot',
        data: payload
      });
      wx.hideLoading();
      const result = res.result;
      if (result && result.success) {
        wx.showToast({ title: `已添加 ${result.added} 个机器人`, icon: 'success' });
        this.loadMatch();
      } else {
        wx.showToast({ title: result?.message || '添加失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
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
  },

  onMatchupTap(e) {
    const gameIndex = e.currentTarget.dataset.gameIndex;
    if (!gameIndex) return;
    wx.navigateTo({
      url: `/pages/record-score/record-score?matchId=${this.data.matchId}&gameIndex=${gameIndex}`
    });
  }
});
