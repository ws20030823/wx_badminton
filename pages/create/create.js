// pages/create/create.js - 創建比賽
const app = getApp();

Page({
  data: {
    type: 'singles',
    subMode: 'single-turn',
    typeText: '單打',
    subModeText: '單打轉',
    name: '',
    minPlayers: 4,
    maxPlayers: 8,
    time: '',
    location: ''
  },

  onLoad(options) {
    const { type = 'singles', subMode = 'single-turn' } = options;
    const typeText = type === 'singles' ? '單打' : '雙打';
    const subModeMap = {
      'single-turn': '單打轉',
      'team-turn': '小隊轉',
      'knockout': '晉級賽'
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
      wx.showToast({ title: '請輸入比賽名稱', icon: 'none' });
      return;
    }

    if (minPlayers > maxPlayers) {
      wx.showToast({ title: '最少人數不能大於最多人數', icon: 'none' });
      return;
    }

    if (minPlayers < 2 || maxPlayers > 16) {
      wx.showToast({ title: '人數範圍請設為 2-16', icon: 'none' });
      return;
    }

    const userId = app.globalData.userId;
    if (!userId) {
      wx.showToast({ title: '請先登入', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '創建中...' });

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
        wx.showToast({ title: '創建成功', icon: 'success' });
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/match-detail/match-detail?id=${result.matchId}`
          });
        }, 1500);
      } else {
        throw new Error(result?.message || '創建失敗');
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: err.message || '創建失敗',
        icon: 'none'
      });
    }
  }
});
