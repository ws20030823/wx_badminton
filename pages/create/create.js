// pages/create/create.js - 创建比赛
const app = getApp();

Page({
  data: {
    type: 'singles',
    subMode: 'single-turn',
    typeText: '单打',
    subModeText: '单打转',
    name: '',
    playerCount: 8,
    playerCountInvalid: false,
    teamCount: 2,
    teamNames: ['', ''],
    maxPlayersPerTeamHint: 4,
    startDate: '',
    startTimeOnly: '',
    endDate: '',
    endTimeOnly: '',
    location: '',
    locationDetail: null,
    courtNumber: ''
  },

  onLoad(options) {
    const { type = 'singles', subMode = 'single-turn' } = options;
    const typeText = type === 'singles' ? '单打' : '双打';
    const subModeMap = {
      'single-turn': '单打转',
      'team-turn': '小队转',
      'knockout': '晋级赛'
    };
    const teamNames = subMode === 'team-turn' ? ['', ''] : [];
    const maxPlayersPerTeamHint = subMode === 'team-turn' ? 4 : 0;
    this.setData({
      type,
      subMode,
      typeText,
      subModeText: subModeMap[subMode] || subMode,
      teamNames,
      maxPlayersPerTeamHint
    });
  },

  onTeamCountChange(e) {
    const teamCount = parseInt(e.currentTarget.dataset.count, 10) || 2;
    let teamNames = this.data.teamNames || [];
    if (teamNames.length < teamCount) {
      while (teamNames.length < teamCount) teamNames.push('');
    } else {
      teamNames = teamNames.slice(0, teamCount);
    }
    const playerCount = this.data.playerCount || 8;
    const maxPlayersPerTeamHint = Math.max(1, Math.floor(playerCount / teamCount));
    const invalid = this.data.subMode === 'team-turn' && (playerCount % teamCount !== 0);
    this.setData({ teamCount, teamNames, maxPlayersPerTeamHint, playerCountInvalid: !!invalid });
  },

  updateMaxPlayersPerTeamHint() {
    if (this.data.subMode !== 'team-turn') return;
    const { playerCount = 8, teamCount = 2 } = this.data;
    const invalid = this.data.subMode === 'team-turn' && ((parseInt(playerCount, 10) || 8) % teamCount !== 0);
    this.setData({
      maxPlayersPerTeamHint: Math.max(1, Math.floor((parseInt(playerCount, 10) || 8) / teamCount)),
      playerCountInvalid: !!invalid
    });
  },

  onTeamNameInput(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    const val = e.detail.value || '';
    const teamNames = [...(this.data.teamNames || [])];
    teamNames[index] = val;
    this.setData({ teamNames });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onPlayerCountInput(e) {
    const playerCount = parseInt(e.detail.value, 10) || 8;
    const teamCount = this.data.teamCount || 2;
    const playerCountInvalid = this.data.subMode === 'team-turn' && (playerCount % teamCount !== 0);
    this.setData({ playerCount, playerCountInvalid }, () => this.updateMaxPlayersPerTeamHint());
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
  },

  onStartTimeChange(e) {
    this.setData({ startTimeOnly: e.detail.value });
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value });
  },

  onEndTimeChange(e) {
    this.setData({ endTimeOnly: e.detail.value });
  },

  onLocationInput(e) {
    this.setData({ location: e.detail.value });
  },

  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        const location = res.name || res.address || '';
        const locationDetail = {
          name: res.name,
          address: res.address,
          latitude: res.latitude,
          longitude: res.longitude
        };
        this.setData({ location, locationDetail });
      },
      fail: (err) => {
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({ title: '选点失败', icon: 'none' });
        }
      }
    });
  },

  onCourtNumberInput(e) {
    this.setData({ courtNumber: e.detail.value });
  },

  async onSubmit() {
    const { name, type, subMode, playerCount, startDate, startTimeOnly, endDate, endTimeOnly, location, locationDetail, courtNumber, teamCount, teamNames } = this.data;
    const startTime = (startDate && startTimeOnly) ? `${startDate} ${startTimeOnly}` : '';
    const endTime = (endDate && endTimeOnly) ? `${endDate} ${endTimeOnly}` : '';

    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入比赛名称', icon: 'none' });
      return;
    }

    const count = parseInt(playerCount, 10) || 8;
    if (count < 2 || count > 16) {
      wx.showToast({ title: '人数请设为 2-16', icon: 'none' });
      return;
    }
    const tc = parseInt(teamCount, 10) || 2;
    if (subMode === 'team-turn' && count % tc !== 0) {
      wx.showToast({ title: '总人数须能被队伍数整除（每队人数一致）', icon: 'none' });
      return;
    }
    if (subMode === 'team-turn' && teamNames && teamCount >= 2) {
      const names = (teamNames || []).slice(0, teamCount).map(s => (s && String(s).trim()) || '').filter(n => n);
      const set = new Set(names);
      if (names.length !== set.size) {
        wx.showToast({ title: '队伍名称不能重复', icon: 'none' });
        return;
      }
    }

    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
      wx.showToast({ title: '结束时间须晚于开始时间', icon: 'none' });
      return;
    }

    const userId = app.globalData.userId;
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '创建中...' });

    try {
      const payload = {
        name: name.trim(),
        type,
        subMode,
        minPlayers: count,
        maxPlayers: count,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        location: location.trim() || undefined,
        locationDetail: locationDetail || undefined,
        courtNumber: courtNumber.trim() || undefined
      };
      if (subMode === 'team-turn') {
        payload.teamCount = teamCount || 2;
        payload.teamNames = (teamNames || []).slice(0, teamCount || 2).map(s => (s && String(s).trim()) || '');
      }
      const res = await wx.cloud.callFunction({
        name: 'createMatch',
        data: payload
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
