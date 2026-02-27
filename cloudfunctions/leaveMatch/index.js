// 云函数：取消报名（退出比赛）
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

    if (match.status !== 'registering') {
      return { success: false, message: '仅在报名中可取消报名' };
    }

    const userRes = await db.collection('users').where({ openid }).get();
    if (!userRes.data || userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    const userId = userRes.data[0]._id;

    const players = match.players || [];
    if (!players.includes(userId)) {
      return { success: false, message: '未报名该比赛' };
    }

    if (match.subMode === 'team-turn' && match.teamPlayers && Array.isArray(match.teamPlayers)) {
      const teamPlayers = match.teamPlayers.map(arr => [...(arr || [])]);
      let found = false;
      for (let i = 0; i < teamPlayers.length; i++) {
        const idx = (teamPlayers[i] || []).indexOf(userId);
        if (idx !== -1) {
          teamPlayers[i].splice(idx, 1);
          found = true;
          break;
        }
      }
      const newPlayers = teamPlayers.flat();
      await db.collection('matches').doc(matchId).update({
        data: { teamPlayers, players: newPlayers }
      });
    } else {
      const newPlayers = players.filter(id => id !== userId);
      await db.collection('matches').doc(matchId).update({
        data: { players: newPlayers }
      });
    }

    await db.collection('users').doc(userId).update({
      data: { 'stats.totalMatches': db.command.inc(-1) }
    });

    return { success: true, message: '已取消报名' };
  } catch (err) {
    console.error('leaveMatch error:', err);
    return { success: false, message: err.message || '取消报名失败' };
  }
};
