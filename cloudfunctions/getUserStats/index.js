// 云函数：获取当前用户统计（避免客户端直接查 users 的权限问题）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, message: '未获取到 openid' };
  }

  try {
    const userRes = await db.collection('users').where({ openid }).get();
    if (!userRes.data || userRes.data.length === 0) {
      return { success: true, userId: null, stats: null };
    }

    const user = userRes.data[0];
    const stats = user.stats || { totalMatches: 0, createdMatches: 0, wins: 0, losses: 0, winRate: 0 };
    const winRate = stats.wins + stats.losses > 0
      ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
      : 0;

    return {
      success: true,
      userId: user._id,
      stats: {
        ...stats,
        winRate: parseFloat(winRate)
      }
    };
  } catch (err) {
    console.error('getUserStats error:', err);
    return { success: false, message: err.message || '加载失败' };
  }
};
