// pages/index/index.js - 首页
Page({
  data: {},

  onLoad() {},

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  // 点击单打
  onSinglesTap() {
    wx.navigateTo({
      url: '/pages/singles-mode/singles-mode'
    });
  },

  // 点击双打
  onDoublesTap() {
    wx.navigateTo({
      url: '/pages/doubles-mode/doubles-mode'
    });
  }
});
