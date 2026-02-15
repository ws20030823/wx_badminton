// 雲函數：記錄比賽結果
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { matchId, matchInfo } = event;

  if (!matchId || !matchInfo) {
    return { success: false, message: '缺少參數' };
  }

  const { winner, loser } = matchInfo;

  try {
    const matchRes = await db.collection('matches').doc(matchId).get();
    const match = matchRes.data;

    if (!match) return { success: false, message: '比賽不存在' };

    const userRes = await db.collection('users').where({ openid }).get();
    const userId = userRes.data && userRes.data[0] ? userRes.data[0]._id : null;
    const isCreator = match.creatorId === userId;
    const isParticipant = match.players && match.players.includes(userId);
    if (!isCreator && !isParticipant) {
      return { success: false, message: '無權限記錄' };
    }

    // 更新用戶統計
    if (winner) {
      await db.collection('users').doc(winner).update({
        data: { 'stats.wins': db.command.inc(1) }
      });
    }
    if (loser) {
      await db.collection('users').doc(loser).update({
        data: { 'stats.losses': db.command.inc(1) }
      });
    }

    // 更新比賽結果（結構依具體模式擴充）
    const results = match.results || {};
    const key = matchInfo.round
      ? `r${matchInfo.round}-m${matchInfo.matchId || ''}`
      : matchInfo.matchId || 'm1';
    results[key] = { winner, loser };

    await db.collection('matches').doc(matchId).update({
      data: {
        results,
        status: 'playing'
      }
    });

    return { success: true, message: '結果已保存' };
  } catch (err) {
    console.error('recordResult error:', err);
    return { success: false, message: err.message || '記錄失敗' };
  }
};
