// pages/record-score/record-score.js - 录入比分
Page({
  data: {
    matchId: '',
    gameIndex: null,
    matchup: null,
    score1: '',
    score2: ''
  },

  onLoad(options) {
    const matchId = options.matchId;
    const gameIndex = options.gameIndex ? parseInt(options.gameIndex, 10) : null;
    if (matchId && gameIndex) {
      this.setData({ matchId, gameIndex });
      this.loadMatchup();
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  async loadMatchup() {
    const { matchId, gameIndex } = this.data;
    if (!matchId || !gameIndex) return;

    wx.showLoading({ title: '加载中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'getMatchDetail',
        data: { matchId }
      });
      const result = res.result;

      if (result && result.success && result.matchups) {
        const matchup = result.matchups.find(m => m.gameIndex === gameIndex);
        if (matchup) {
          const score1 = matchup.score1 != null ? String(matchup.score1) : '';
          const score2 = matchup.score2 != null ? String(matchup.score2) : '';
          this.setData({
            matchup,
            score1,
            score2
          });
        } else {
          wx.showToast({ title: '未找到该对局', icon: 'none' });
        }
      } else {
        wx.showToast({ title: result?.message || '加载失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error(err);
    } finally {
      wx.hideLoading();
    }
  },

  onScore1Input(e) {
    this.setData({ score1: e.detail.value });
  },

  onScore2Input(e) {
    this.setData({ score2: e.detail.value });
  },

  async onSubmit() {
    const { matchId, matchup, score1, score2 } = this.data;

    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      wx.showToast({ title: '请输入有效比分', icon: 'none' });
      return;
    }

    if (s1 === s2) {
      wx.showToast({ title: '比分不能相同', icon: 'none' });
      return;
    }

    const winner = s1 > s2 ? matchup.player1._id : matchup.player2._id;
    const loser = s1 > s2 ? matchup.player2._id : matchup.player1._id;

    const matchInfo = {
      winner,
      loser,
      score1: s1,
      score2: s2
    };

    if (matchup.round != null && matchup.matchIndexInRound != null) {
      matchInfo.round = matchup.round;
      matchInfo.matchIndex = matchup.matchIndexInRound;
    } else if (matchup.groupId != null && matchup.matchIndexInGroup != null) {
      matchInfo.groupId = matchup.groupId;
      matchInfo.matchIndex = matchup.matchIndexInGroup;
    } else if (matchup.resultKey) {
      matchInfo.resultKey = matchup.resultKey;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'recordResult',
        data: { matchId, matchInfo }
      });
      const result = res.result;

      if (result && result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 800);
      } else {
        wx.showToast({ title: result?.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(err);
    } finally {
      wx.hideLoading();
    }
  }
});
