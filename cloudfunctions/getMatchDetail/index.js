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
    const netPoints = {};
    if (match.players && match.players.length > 0) {
      match.players.forEach(pid => { wins[pid] = 0; losses[pid] = 0; netPoints[pid] = 0; });
      Object.values(results).forEach(r => {
        if (r.winner) wins[r.winner] = (wins[r.winner] || 0) + 1;
        if (r.loser) losses[r.loser] = (losses[r.loser] || 0) + 1;
        if (r.winner && r.loser && r.winner !== r.loser) {
          const s1 = typeof r.score1 === 'number' ? r.score1 : 0;
          const s2 = typeof r.score2 === 'number' ? r.score2 : 0;
          const winnerScore = Math.max(s1, s2);
          const loserScore = Math.min(s1, s2);
          const pointDiff = winnerScore - loserScore;
          netPoints[r.winner] = (netPoints[r.winner] || 0) + pointDiff;
          netPoints[r.loser] = (netPoints[r.loser] || 0) - pointDiff;
        }
      });
      match.players.forEach(pid => {
        const u = userMap[pid] || { _id: pid, nickName: '未知', avatarUrl: '' };
        const w = wins[pid] || 0;
        const l = losses[pid] || 0;
        rankings.push({
          _id: pid,
          nickName: u.nickName || '未知',
          avatarUrl: u.avatarUrl || '',
          wins: w,
          losses: l,
          points: w * 2 + l * 1,
          net: netPoints[pid] || 0
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
            const resultKey = 'r' + r.round + '-m' + (mi + 1);
            const res = m.result || results[resultKey] || results[m.id];
            matchups.push({
              gameIndex,
              round: r.round,
              matchIndexInRound: mi + 1,
              resultKey,
              player1: { _id: p1._id, nickName: p1.nickName || '未知', avatarUrl: p1.avatarUrl || '' },
              player2: { _id: p2._id, nickName: p2.nickName || '未知', avatarUrl: p2.avatarUrl || '' },
              winner: res && res.winner,
              loser: res && res.loser,
              score1: res && typeof res.score1 === 'number' ? res.score1 : null,
              score2: res && typeof res.score2 === 'number' ? res.score2 : null
            });
          });
        });
      }
      if (teams.groups && Array.isArray(teams.groups)) {
        teams.groups.forEach(g => {
          (g.matches || []).forEach((m, mi) => {
            gameIndex++;
            const p1 = userMap[m.player1] || { _id: m.player1, nickName: '未知', avatarUrl: '' };
            const p2 = userMap[m.player2] || { _id: m.player2, nickName: '未知', avatarUrl: '' };
            const resultKey = 'g' + g.groupId + '-m' + (mi + 1);
            const res = m.result || results[resultKey];
            matchups.push({
              gameIndex,
              groupId: g.groupId,
              matchIndexInGroup: mi + 1,
              resultKey,
              player1: { _id: p1._id, nickName: p1.nickName || '未知', avatarUrl: p1.avatarUrl || '' },
              player2: { _id: p2._id, nickName: p2.nickName || '未知', avatarUrl: p2.avatarUrl || '' },
              winner: res && res.winner,
              loser: res && res.loser,
              score1: res && typeof res.score1 === 'number' ? res.score1 : null,
              score2: res && typeof res.score2 === 'number' ? res.score2 : null
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
