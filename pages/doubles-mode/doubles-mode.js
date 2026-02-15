// pages/doubles-mode/doubles-mode.js - 双打模式选择
Page({
  data: {},

  onLoad() {},

  // 双打单打转
  onSingleTurnTap() {
    this.navigateToCreate('doubles', 'single-turn');
  },

  // 双打小队转
  onTeamTurnTap() {
    this.navigateToCreate('doubles', 'team-turn');
  },

  // 双打晋级赛
  onKnockoutTap() {
    this.navigateToCreate('doubles', 'knockout');
  },

  navigateToCreate(type, subMode) {
    wx.navigateTo({
      url: `/pages/create/create?type=${type}&subMode=${subMode}`
    });
  }
});
