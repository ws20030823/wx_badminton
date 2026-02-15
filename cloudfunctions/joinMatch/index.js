// 雲函數：加入比賽
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { matchId } = event;

  if (!matchId) {
    return { success: false, message: '缺少比賽ID' };
  }

  try {
    const matchRes = await db.collection('matches').doc(matchId).get();
    const match = matchRes.data;

    if (!match) {
      return { success: false, message: '比賽不存在' };
    }

    if (match.status !== 'registering') {
      return { success: false, message: '比賽已停止報名' };
    }

    // 查詢用戶
    let userRes = await db.collection('users').where({ openid }).get();
    let userId;
    if (userRes.data && userRes.data.length > 0) {
      userId = userRes.data[0]._id;
    } else {
      const addRes = await db.collection('users').add({
        data: {
          openid,
          nickName: '用戶',
          avatarUrl: '',
          createdAt: db.serverDate(),
          stats: { totalMatches: 0, createdMatches: 0, wins: 0, losses: 0, winRate: 0 }
        }
      });
      userId = addRes._id;
    }

    const players = match.players || [];
    if (players.includes(userId)) {
      return { success: false, message: '已報名' };
    }

    if (players.length >= match.maxPlayers) {
      return { success: false, message: '人數已滿' };
    }

    players.push(userId);
    await db.collection('matches').doc(matchId).update({
      data: { players }
    });

    await db.collection('users').doc(userId).update({
      data: { 'stats.totalMatches': db.command.inc(1) }
    });

    return { success: true, message: '報名成功' };
  } catch (err) {
    console.error('joinMatch error:', err);
    return { success: false, message: err.message || '報名失敗' };
  }
};
