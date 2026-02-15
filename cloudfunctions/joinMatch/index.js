// 云函数：加入比赛
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { matchId, teamIndex } = event;

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
      return { success: false, message: '比赛已停止报名' };
    }

    // 查询用户
    let userRes = await db.collection('users').where({ openid }).get();
    let userId;
    if (userRes.data && userRes.data.length > 0) {
      userId = userRes.data[0]._id;
    } else {
      const addRes = await db.collection('users').add({
        data: {
          openid,
          nickName: '用户',
          avatarUrl: '',
          createdAt: db.serverDate(),
          stats: { totalMatches: 0, createdMatches: 0, wins: 0, losses: 0, winRate: 0 }
        }
      });
      userId = addRes._id;
    }

    const players = match.players || [];
    if (players.includes(userId)) {
      return { success: false, message: '已报名' };
    }

    if (players.length >= match.maxPlayers) {
      return { success: false, message: '人数已满' };
    }

    if (match.subMode === 'team-turn' && match.teamPlayers) {
      const ti = parseInt(teamIndex, 10);
      const tc = match.teamCount || match.teamPlayers.length;
      if (isNaN(ti) || ti < 0 || ti >= tc) {
        return { success: false, message: '请选择队伍' };
      }
      const maxPerTeam = match.maxPlayersPerTeam != null
        ? match.maxPlayersPerTeam
        : Math.max(1, Math.floor((match.maxPlayers || 8) / tc));
      const currentTeamSize = (match.teamPlayers[ti] || []).length;
      if (currentTeamSize >= maxPerTeam) {
        return { success: false, message: '该队人数已满，请选择其他队伍' };
      }
      const teamPlayers = match.teamPlayers.map(arr => [...(arr || [])]);
      teamPlayers[ti].push(userId);
      const newPlayers = teamPlayers.flat();
      await db.collection('matches').doc(matchId).update({
        data: { teamPlayers, players: newPlayers }
      });
    } else {
      players.push(userId);
      await db.collection('matches').doc(matchId).update({
        data: { players }
      });
    }

    await db.collection('users').doc(userId).update({
      data: { 'stats.totalMatches': db.command.inc(1) }
    });

    return { success: true, message: '报名成功' };
  } catch (err) {
    console.error('joinMatch error:', err);
    return { success: false, message: err.message || '报名失败' };
  }
};
