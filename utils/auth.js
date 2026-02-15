// utils/auth.js - 登录相关工具
/**
 * 检查是否已登录
 */
function isLoggedIn() {
  const app = getApp();
  return !!(app.globalData.userId && app.globalData.userInfo);
}

/**
 * 獲取用戶資訊（需用戶主動觸發）
 */
function getUserProfile() {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料与赛事身份识别',
      success: (res) => resolve(res.userInfo),
      fail: (err) => reject(err)
    });
  });
}

/**
 * 保存用户信息到云端（通过云函数或直接写入）
 */
async function saveUserToCloud(userInfo, openid) {
  const db = wx.cloud.database();
  const { nickName, avatarUrl } = userInfo;

  const existRes = await db.collection('users').where({ openid }).get();
  if (existRes.data && existRes.data.length > 0) {
    await db.collection('users').doc(existRes.data[0]._id).update({
      data: { nickName, avatarUrl, updatedAt: db.serverDate() }
    });
    return existRes.data[0]._id;
  }

  const addRes = await db.collection('users').add({
    data: {
      openid,
      nickName: nickName || '用户',
      avatarUrl: avatarUrl || '',
      createdAt: db.serverDate(),
      stats: {
        totalMatches: 0,
        createdMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0
      }
    }
  });
  return addRes._id;
}

/**
 * 登出
 */
function logout() {
  const app = getApp();
  app.clearUserInfo();
}

module.exports = {
  isLoggedIn,
  getUserProfile,
  saveUserToCloud,
  logout
};
