// pages/singles-mode/singles-mode.js - 单打模式选择
Page({
  data: {},

  onLoad() {},

  // 单打转
  onSingleTurnTap() {
    this.navigateToCreate('singles', 'single-turn');
  },

  // 小队转
  onTeamTurnTap() {
    this.navigateToCreate('singles', 'team-turn');
  },

  // 晋级赛
  onKnockoutTap() {
    this.navigateToCreate('singles', 'knockout');
  },

  navigateToCreate(type, subMode) {
    wx.navigateTo({
      url: `/pages/create/create?type=${type}&subMode=${subMode}`
    });
  }
});
