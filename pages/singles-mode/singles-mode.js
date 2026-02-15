// pages/singles-mode/singles-mode.js - 單打模式選擇
Page({
  data: {},

  onLoad() {},

  // 單打轉
  onSingleTurnTap() {
    this.navigateToCreate('singles', 'single-turn');
  },

  // 小隊轉
  onTeamTurnTap() {
    this.navigateToCreate('singles', 'team-turn');
  },

  // 晉級賽
  onKnockoutTap() {
    this.navigateToCreate('singles', 'knockout');
  },

  navigateToCreate(type, subMode) {
    wx.navigateTo({
      url: `/pages/create/create?type=${type}&subMode=${subMode}`
    });
  }
});
