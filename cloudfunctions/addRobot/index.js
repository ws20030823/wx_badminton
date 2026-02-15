// 云函数：添加机器人（测试用）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { matchId, count = 1, teamIndex } = event;

  if (!matchId) {
    return { success: false, message: '缺少比赛ID' };
  }

  try {
    const matchRes = await db.collection('matches').doc(matchId).get();
    const match = matchRes.data;

    if (!match) return { success: false, message: '比赛不存在' };
    if (match.status !== 'registering') return { success: false, message: '比赛已停止报名' };

    const userRes = await db.collection('users').where({ openid }).get();
    const userId = userRes.data && userRes.data[0] ? userRes.data[0]._id : null;
    if (match.creatorId !== userId) {
      return { success: false, message: '仅创建者可添加机器人' };
    }

    const isTeamTurn = match.subMode === 'team-turn' && match.teamPlayers && Array.isArray(match.teamPlayers);
    if (isTeamTurn && (teamIndex == null || teamIndex < 0 || teamIndex >= (match.teamCount || match.teamPlayers.length))) {
      return { success: false, message: '请选择要加入的队伍' };
    }

    const players = match.players || [];
    let toAdd = Math.min(count, match.maxPlayers - players.length);
    if (isTeamTurn) {
      const tc = match.teamCount || match.teamPlayers.length;
      const maxPerTeam = match.maxPlayersPerTeam != null ? match.maxPlayersPerTeam : Math.max(1, Math.floor((match.maxPlayers || 8) / tc));
      const currentTeamSize = (match.teamPlayers[teamIndex] || []).length;
      toAdd = Math.min(toAdd, Math.max(0, maxPerTeam - currentTeamSize));
    }
    if (toAdd <= 0) return { success: false, message: '人数已满或该队人数已满' };

    const newPlayerIds = [];
    for (let i = 0; i < toAdd; i++) {
      const robotOpenid = `robot_${matchId}_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`;
      const robotNickName = `机器人${players.length + newPlayerIds.length}`;

      const addRes = await db.collection('users').add({
        data: {
          openid: robotOpenid,
          nickName: robotNickName,
          avatarUrl: '',
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
      newPlayerIds.push(addRes._id);
    }

    const updatedPlayers = [...players, ...newPlayerIds];
    const updateData = { players: updatedPlayers };

    if (isTeamTurn) {
      const ti = parseInt(teamIndex, 10);
      const teamPlayers = (match.teamPlayers || []).map(arr => [...(arr || [])]);
      if (!teamPlayers[ti]) teamPlayers[ti] = [];
      teamPlayers[ti].push(...newPlayerIds);
      updateData.teamPlayers = teamPlayers;
    }

    await db.collection('matches').doc(matchId).update({
      data: updateData
    });

    return { success: true, added: toAdd };
  } catch (err) {
    console.error('addRobot error:', err);
    return { success: false, message: err.message || '添加失败' };
  }
};
