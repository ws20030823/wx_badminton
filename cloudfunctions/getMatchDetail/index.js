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

    let teamList = [];
    let myTeamIndex = -1;
    let m = match;
    if (match.subMode === 'team-turn') {
      let teamPlayers = match.teamPlayers;
      const tc = match.teamCount || 2;
      const playersFlat = (teamPlayers || []).flat();
      const playersArr = match.players || [];
      const needMigrate = !teamPlayers || !Array.isArray(teamPlayers) ||
        teamPlayers.length < tc ||
        (playersArr.length > 0 && playersFlat.length === 0);
      if (needMigrate) {
        teamPlayers = Array(tc).fill(null).map((_, i) => (i === 0 ? [...playersArr] : []));
        await db.collection('matches').doc(matchId).update({
          data: {
            teamCount: tc,
            teamNames: ['队伍A', '队伍B', '队伍C', '队伍D'].slice(0, tc),
            teamPlayers
          }
        });
        m = { ...match, teamPlayers, teamCount: tc };
      }
      if (m.teamPlayers && Array.isArray(m.teamPlayers)) {
        const teamNames = m.teamNames || [];
        teamList = m.teamPlayers.map((ids, i) => {
          const label = (teamNames[i] && String(teamNames[i]).trim()) ? String(teamNames[i]).trim() : ('队伍' + 'ABCD'[i]);
          const players = (ids || []).map(pid => userMap[pid] || { _id: pid, nickName: '未知', avatarUrl: '' });
          if (userId && (ids || []).includes(userId)) myTeamIndex = i;
          return { teamIndex: i, teamLabel: label, players, playerIds: ids || [] };
        });
      }
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
        const winnerIds = Array.isArray(r.winner) ? r.winner : (r.winner ? [r.winner] : []);
        const loserIds = Array.isArray(r.loser) ? r.loser : (r.loser ? [r.loser] : []);
        winnerIds.forEach(id => { wins[id] = (wins[id] || 0) + 1; });
        loserIds.forEach(id => { losses[id] = (losses[id] || 0) + 1; });
        if (winnerIds.length && loserIds.length) {
          const s1 = typeof r.score1 === 'number' ? r.score1 : 0;
          const s2 = typeof r.score2 === 'number' ? r.score2 : 0;
          const winnerScore = Math.max(s1, s2);
          const loserScore = Math.min(s1, s2);
          const pointDiff = winnerScore - loserScore;
          winnerIds.forEach(id => { netPoints[id] = (netPoints[id] || 0) + pointDiff; });
          loserIds.forEach(id => { netPoints[id] = (netPoints[id] || 0) - pointDiff; });
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
      const isDoublesMatch = match.type === 'doubles';
      let gameIndex = 0;
      if (teams.rounds && Array.isArray(teams.rounds)) {
        teams.rounds.forEach(r => {
          (r.matches || []).forEach((m, mi) => {
            gameIndex++;
            const resultKey = 'r' + r.round + '-m' + (mi + 1);
            const res = m.result || results[resultKey] || results[m.id];
            if (isDoublesMatch && m.team1 && m.team2) {
              const team1 = (m.team1 || []).map(pid => userMap[pid] || { _id: pid, nickName: '未知', avatarUrl: '' });
              const team2 = (m.team2 || []).map(pid => userMap[pid] || { _id: pid, nickName: '未知', avatarUrl: '' });
              const winnerIds = res && res.winner ? (Array.isArray(res.winner) ? res.winner : [res.winner]) : [];
              const team1Names = team1.map(p => p.nickName || '未知').join(' & ');
              const team2Names = team2.map(p => p.nickName || '未知').join(' & ');
              const winnerTeamText = winnerIds.length
                ? (winnerIds[0] === (team1[0] && team1[0]._id) || winnerIds[0] === (team1[1] && team1[1]._id)
                  ? team1Names
                  : team2Names)
                : '';
              matchups.push({
                gameIndex,
                round: r.round,
                matchIndexInRound: mi + 1,
                resultKey,
                isDoubles: true,
                team1,
                team2,
                team1Names,
                team2Names,
                player1: null,
                player2: null,
                winner: res && res.winner,
                loser: res && res.loser,
                winnerTeamText,
                score1: res && typeof res.score1 === 'number' ? res.score1 : null,
                score2: res && typeof res.score2 === 'number' ? res.score2 : null
              });
            } else {
              const p1 = userMap[m.player1] || { _id: m.player1, nickName: '未知', avatarUrl: '' };
              const p2 = userMap[m.player2] || { _id: m.player2, nickName: '未知', avatarUrl: '' };
              matchups.push({
                gameIndex,
                round: r.round,
                matchIndexInRound: mi + 1,
                resultKey,
                isDoubles: false,
                player1: { _id: p1._id, nickName: p1.nickName || '未知', avatarUrl: p1.avatarUrl || '' },
                player2: { _id: p2._id, nickName: p2.nickName || '未知', avatarUrl: p2.avatarUrl || '' },
                team1: null,
                team2: null,
                winner: res && res.winner,
                loser: res && res.loser,
                score1: res && typeof res.score1 === 'number' ? res.score1 : null,
                score2: res && typeof res.score2 === 'number' ? res.score2 : null
              });
            }
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
      teamList,
      myTeamIndex,
      rankings,
      matchups
    };
  } catch (err) {
    console.error('getMatchDetail error:', err);
    return { success: false, message: err.message || '加载失败' };
  }
};
