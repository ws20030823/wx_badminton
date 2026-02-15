// 云函数：切换队伍（小队转模式，仅报名中）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { matchId, toTeamIndex } = event;

  if (!matchId || toTeamIndex == null) {
    return { success: false, message: '缺少参数' };
  }

  const ti = parseInt(toTeamIndex, 10);

  try {
    const matchRes = await db.collection('matches').doc(matchId).get();
    const match = matchRes.data;

    if (!match) return { success: false, message: '比赛不存在' };
    if (match.status !== 'registering') return { success: false, message: '仅在报名中可切换队伍' };
    if (match.subMode !== 'team-turn' || !match.teamPlayers) return { success: false, message: '该比赛不是小队转模式' };

    const userRes = await db.collection('users').where({ openid }).get();
    const userId = userRes.data && userRes.data[0] ? userRes.data[0]._id : null;
    if (!userId || !match.players || !match.players.includes(userId)) {
      return { success: false, message: '未报名该比赛' };
    }

    const tc = match.teamCount || match.teamPlayers.length;
    if (isNaN(ti) || ti < 0 || ti >= tc) {
      return { success: false, message: '目标队伍无效' };
    }

    const teamPlayers = match.teamPlayers.map(arr => [...(arr || [])]);
    let fromIdx = -1;
    for (let i = 0; i < teamPlayers.length; i++) {
      const idx = (teamPlayers[i] || []).indexOf(userId);
      if (idx >= 0) {
        fromIdx = i;
        teamPlayers[i].splice(idx, 1);
        break;
      }
    }
    if (fromIdx < 0) return { success: false, message: '未找到所在队伍' };
    if (fromIdx === ti) return { success: false, message: '已在当前队伍' };

    teamPlayers[ti].push(userId);
    const players = teamPlayers.flat();

    await db.collection('matches').doc(matchId).update({
      data: { teamPlayers, players }
    });

    return { success: true, message: '切换成功' };
  } catch (err) {
    console.error('switchTeam error:', err);
    return { success: false, message: err.message || '切换失败' };
  }
};
