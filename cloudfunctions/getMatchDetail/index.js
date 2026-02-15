// 云函数：获取比赛详情（含用户信息，云函数可读所有 users 避免权限限制）
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

    let userId = '';
    const userRes = await db.collection('users').where({ openid }).get();
    if (userRes.data && userRes.data.length > 0) {
      userId = userRes.data[0]._id;
    }

    const isCreator = match.creatorId === userId;
    const hasJoined = match.players && match.players.includes(userId);

    let playerList = [];
    let userMap = {};
    if (match.players && match.players.length > 0) {
      const usersRes = await db.collection('users')
        .where({ _id: db.command.in(match.players) })
        .get();
      const users = usersRes.data || [];
      users.forEach(u => { userMap[u._id] = u; });
      playerList = match.players.map(pid => {
        const u = userMap[pid];
        return u ? { _id: u._id, nickName: u.nickName || '未知', avatarUrl: u.avatarUrl || '' } : { _id: pid, nickName: '未知', avatarUrl: '' };
      });
    }

    const rankings = [];
    const matchups = [];
    const results = match.results || {};
    const wins = {};
    const losses = {};
    if (match.players && match.players.length > 0) {
      match.players.forEach(pid => { wins[pid] = 0; losses[pid] = 0; });
      Object.values(results).forEach(r => {
        if (r.winner) wins[r.winner] = (wins[r.winner] || 0) + 1;
        if (r.loser) losses[r.loser] = (losses[r.loser] || 0) + 1;
      });
      match.players.forEach(pid => {
        const u = userMap[pid] || { _id: pid, nickName: '未知', avatarUrl: '' };
        rankings.push({
          _id: pid,
          nickName: u.nickName || '未知',
          avatarUrl: u.avatarUrl || '',
          wins: wins[pid] || 0,
          losses: losses[pid] || 0,
          points: (wins[pid] || 0) * 3,
          net: (wins[pid] || 0) - (losses[pid] || 0)
        });
      });
      rankings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.net - a.net;
      });

      const teams = match.teams || {};
      let gameIndex = 0;
      if (teams.rounds && Array.isArray(teams.rounds)) {
        teams.rounds.forEach(r => {
          (r.matches || []).forEach((m, mi) => {
            gameIndex++;
            const p1 = userMap[m.player1] || { _id: m.player1, nickName: '未知', avatarUrl: '' };
            const p2 = userMap[m.player2] || { _id: m.player2, nickName: '未知', avatarUrl: '' };
            const res = m.result || results['r' + r.round + '-m' + (mi + 1)] || results[m.id];
            matchups.push({
              gameIndex,
              round: r.round,
              player1: { _id: p1._id, nickName: p1.nickName || '未知', avatarUrl: p1.avatarUrl || '' },
              player2: { _id: p2._id, nickName: p2.nickName || '未知', avatarUrl: p2.avatarUrl || '' },
              winner: res && res.winner,
              loser: res && res.loser
            });
          });
        });
      }
      if (teams.groups && Array.isArray(teams.groups)) {
        teams.groups.forEach(g => {
          (g.matches || []).forEach(m => {
            gameIndex++;
            const p1 = userMap[m.player1] || { _id: m.player1, nickName: '未知', avatarUrl: '' };
            const p2 = userMap[m.player2] || { _id: m.player2, nickName: '未知', avatarUrl: '' };
            matchups.push({
              gameIndex,
              groupId: g.groupId,
              player1: { _id: p1._id, nickName: p1.nickName || '未知', avatarUrl: p1.avatarUrl || '' },
              player2: { _id: p2._id, nickName: p2.nickName || '未知', avatarUrl: p2.avatarUrl || '' },
              winner: m.result && m.result.winner,
              loser: m.result && m.result.loser
            });
          });
        });
      }
    }

    return {
      success: true,
      match,
      isCreator,
      hasJoined,
      playerList,
      userMap,
      rankings,
      matchups
    };
  } catch (err) {
    console.error('getMatchDetail error:', err);
    return { success: false, message: err.message || '加载失败' };
  }
};
