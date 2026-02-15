// pages/create/create.js - 创建比赛
const app = getApp();

Page({
  data: {
    type: 'singles',
    subMode: 'single-turn',
    typeText: '单打',
    subModeText: '单打转',
    name: '',
    minPlayers: 4,
    maxPlayers: 8,
    time: '',
    location: ''
  },

  onLoad(options) {
    const { type = 'singles', subMode = 'single-turn' } = options;
    const typeText = type === 'singles' ? '单打' : '双打';
    const subModeMap = {
      'single-turn': '单打转',
      'team-turn': '小队转',
      'knockout': '晋级赛'
    };
    this.setData({
      type,
      subMode,
      typeText,
      subModeText: subModeMap[subMode] || subMode
    });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onMinPlayersInput(e) {
    this.setData({ minPlayers: parseInt(e.detail.value) || 4 });
  },

  onMaxPlayersInput(e) {
    this.setData({ maxPlayers: parseInt(e.detail.value) || 8 });
  },

  onTimeChange(e) {
    this.setData({ time: e.detail.value });
  },

  onLocationInput(e) {
    this.setData({ location: e.detail.value });
  },

  async onSubmit() {
    const { name, type, subMode, minPlayers, maxPlayers, time, location } = this.data;

    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入比赛名称', icon: 'none' });
      return;
    }

    if (minPlayers > maxPlayers) {
      wx.showToast({ title: '最少人数不能大于最多人数', icon: 'none' });
      return;
    }

    if (minPlayers < 2 || maxPlayers > 16) {
      wx.showToast({ title: '人数范围请设为 2-16', icon: 'none' });
      return;
    }

    const userId = app.globalData.userId;
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '创建中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'createMatch',
        data: {
          name: name.trim(),
          type,
          subMode,
          minPlayers,
          maxPlayers,
          time: time || undefined,
          location: location.trim() || undefined
        }
      });

      const result = res.result;
      if (result && result.success) {
        wx.hideLoading();
        wx.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/match-detail/match-detail?id=${result.matchId}`
          });
        }, 1500);
      } else {
        throw new Error(result?.message || '创建失败');
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: err.message || '创建失败',
        icon: 'none'
      });
    }
  }
});
