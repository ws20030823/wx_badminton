// pages/user-settings/user-settings.js - 用户信息详情与编辑
const app = getApp();

Page({
  data: {
    avatar: '',
    wxAvatarUrl: '',
    nickName: '',
    wxNickName: '微信用户',
    gender: 'secret',
    levelTag: 'beginner',
    nickNameError: false,
    saving: false,
    avatarChanged: false
  },

  async onLoad() {
    const globalUser = app.globalData.userInfo || {};
    const baseNick = globalUser.nickName || '微信用户';
    const baseAvatar = globalUser.avatarUrl || '';

    this.setData({
      wxNickName: baseNick,
      wxAvatarUrl: baseAvatar,
      avatar: baseAvatar,
      nickName: baseNick
    });

    // 从云端获取更多用户基础资料（含 gender / levelTag）
    try {
      const res = await wx.cloud.callFunction({ name: 'getUserStats' });
      const result = res.result;
      const userBase = result && result.userBase;
      if (userBase) {
        const finalNick = userBase.nickName || baseNick;
        const finalAvatar = userBase.avatarUrl || baseAvatar;
        this.setData({
          wxNickName: finalNick,
          wxAvatarUrl: finalAvatar,
          avatar: finalAvatar,
          nickName: finalNick,
          gender: userBase.gender || 'secret',
          levelTag: userBase.levelTag || 'beginner'
        });
      }
    } catch (err) {
      // 忽略错误，保持默认值
      console.error('load user base error:', err);
    }
  },

  onChooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths && res.tempFilePaths[0];
        if (tempFilePath) {
          this.setData({
            avatar: tempFilePath,
            avatarChanged: true
          });
        }
      }
    });
  },

  onNickNameInput(e) {
    const value = (e.detail.value || '').trim();
    const nickNameError = value.length > 20;
    this.setData({
      nickName: value,
      nickNameError
    });
  },

  onGenderTap(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    this.setData({ gender: value });
  },

  onLevelTap(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    this.setData({ levelTag: value });
  },

  async onSaveTap() {
    if (this.data.saving || this.data.nickNameError) return;

    this.setData({ saving: true });

    try {
      let avatarUrl = this.data.avatar || '';

      // 如头像有本地变更，则上传到云存储
      if (this.data.avatarChanged && avatarUrl && !avatarUrl.startsWith('cloud://')) {
        const ext = avatarUrl.split('.').pop() || 'jpg';
        const cloudPath = `user-avatars/${Date.now()}-${Math.floor(Math.random() * 100000)}.${ext}`;
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: avatarUrl
        });
        avatarUrl = uploadRes.fileID;
      }

      const payload = {
        gender: this.data.gender,
        levelTag: this.data.levelTag
      };

      if (this.data.nickName) {
        payload.nickName = this.data.nickName;
      }
      if (avatarUrl) {
        payload.avatarUrl = avatarUrl;
      }

      const res = await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: payload
      });
      const result = res.result;
      if (!result || !result.success) {
        wx.showToast({ title: result?.message || '保存失败', icon: 'none' });
        this.setData({ saving: false });
        return;
      }

      // 同步更新全局 userInfo
      const current = app.globalData.userInfo || {};
      const finalNick = this.data.nickName || current.nickName || this.data.wxNickName;
      const finalAvatar = avatarUrl || current.avatarUrl || this.data.wxAvatarUrl;
      const updated = {
        ...current,
        nickName: finalNick,
        avatarUrl: finalAvatar,
        gender: this.data.gender,
        levelTag: this.data.levelTag
      };
      const userId = app.globalData.userId || null;
      if (typeof app.setUserInfo === 'function') {
        app.setUserInfo(updated, userId);
      } else {
        app.globalData.userInfo = updated;
      }

      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 500);
    } catch (err) {
      console.error('onSaveTap error:', err);
      wx.showToast({ title: '保存失败，请稍后重试', icon: 'none' });
      this.setData({ saving: false });
      return;
    }
  }
});

