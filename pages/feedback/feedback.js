// pages/feedback/feedback.js - 意见反馈
Page({
  data: {
    content: '',
    contact: '',
    submitting: false,
    canSubmit: false
  },

  onContentInput(e) {
    const value = (e.detail.value || '').trim();
    this.setData({
      content: value,
      canSubmit: value.length >= 5 && value.length <= 500
    });
  },

  onContactInput(e) {
    this.setData({
      contact: e.detail.value || ''
    });
  },

  async onSubmitTap() {
    if (this.data.submitting || !this.data.canSubmit) return;

    this.setData({ submitting: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'addFeedback',
        data: {
          content: this.data.content,
          contact: this.data.contact
        }
      });
      const result = res.result;
      if (!result || !result.success) {
        wx.showToast({ title: result?.message || '提交失败', icon: 'none' });
        this.setData({ submitting: false });
        return;
      }
      wx.showToast({ title: '已提交，感谢反馈', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 600);
    } catch (err) {
      console.error('submit feedback error:', err);
      wx.showToast({ title: '提交失败，请稍后重试', icon: 'none' });
      this.setData({ submitting: false });
      return;
    }
  }
});

