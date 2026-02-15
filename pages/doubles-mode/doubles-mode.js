// pages/doubles-mode/doubles-mode.js - 雙打模式選擇
Page({
  data: {},

  onLoad() {},

  // 雙打單打轉
  onSingleTurnTap() {
    this.navigateToCreate('doubles', 'single-turn');
  },

  // 雙打小隊轉
  onTeamTurnTap() {
    this.navigateToCreate('doubles', 'team-turn');
  },

  // 雙打晉級賽
  onKnockoutTap() {
    this.navigateToCreate('doubles', 'knockout');
  },

  navigateToCreate(type, subMode) {
    wx.navigateTo({
      url: `/pages/create/create?type=${type}&subMode=${subMode}`
    });
  }
});
