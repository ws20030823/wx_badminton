// 云函数：更新用户基础资料（昵称、头像、性别、水平）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { nickName, avatarUrl, gender, levelTag } = event;

  if (!openid) {
    return { success: false, message: '未获取到 openid' };
  }

  try {
    const userRes = await db.collection('users').where({ openid }).get();
    if (!userRes.data || userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }

    const user = userRes.data[0];
    const updateData = {};

    if (typeof nickName === 'string') {
      const trimmed = nickName.trim();
      if (trimmed) {
        updateData.nickName = trimmed;
      }
    }

    if (typeof avatarUrl === 'string' && avatarUrl) {
      updateData.avatarUrl = avatarUrl;
    }

    if (typeof gender === 'string' && gender) {
      updateData.gender = gender;
    }

    if (typeof levelTag === 'string' && levelTag) {
      updateData.levelTag = levelTag;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true, message: '无需更新', userId: user._id };
    }

    updateData.updatedAt = db.serverDate();

    await db.collection('users').doc(user._id).update({
      data: updateData
    });

    return { success: true, userId: user._id };
  } catch (err) {
    console.error('updateUserProfile error:', err);
    return { success: false, message: err.message || '更新失败' };
  }
};

