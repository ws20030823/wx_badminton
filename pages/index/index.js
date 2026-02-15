// pages/index/index.js - 首頁
Page({
  data: {},

  onLoad() {},

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  // 點擊單打
  onSinglesTap() {
    wx.navigateTo({
      url: '/pages/singles-mode/singles-mode'
    });
  },

  // 點擊雙打
  onDoublesTap() {
    wx.navigateTo({
      url: '/pages/doubles-mode/doubles-mode'
    });
  }
});
