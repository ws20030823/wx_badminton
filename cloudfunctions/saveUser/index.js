// 云函数：保存用户信息（登录时调用，创建或更新 users 集合）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { nickName, avatarUrl } = event;

  if (!openid) {
    return { success: false, message: '未获取到 openid' };
  }

  try {
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data && userRes.data.length > 0) {
      const userId = userRes.data[0]._id;
      await db.collection('users').doc(userId).update({
        data: {
          nickName: nickName || userRes.data[0].nickName || '用户',
          avatarUrl: avatarUrl || userRes.data[0].avatarUrl || '',
          updatedAt: db.serverDate()
        }
      });
      return { success: true, userId };
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

    return { success: true, userId: addRes._id };
  } catch (err) {
    console.error('saveUser error:', err);
    return { success: false, message: err.message || '保存失败' };
  }
};
