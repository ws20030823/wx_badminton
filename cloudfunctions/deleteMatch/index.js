// 云函数：删除比赛（仅创建者可删）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { matchId } = event;

  if (!matchId) {
    return { success: false, message: '缺少比赛ID' };
  }

  try {
    const matchRes = await db.collection('matches').doc(matchId).get();
    const match = matchRes.data;

    if (!match) {
      return { success: false, message: '比赛不存在' };
    }

    const userRes = await db.collection('users').where({ openid }).get();
    const userId = userRes.data && userRes.data[0] ? userRes.data[0]._id : null;

    if (!userId || match.creatorId !== userId) {
      return { success: false, message: '仅创建者可删除该比赛' };
    }

    await db.collection('matches').doc(matchId).remove();
    return { success: true, message: '已删除' };
  } catch (err) {
    console.error('deleteMatch error:', err);
    return { success: false, message: err.message || '删除失败' };
  }
};
