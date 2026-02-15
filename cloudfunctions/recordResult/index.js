// 云函数：记录比赛结果
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { matchId, matchInfo } = event;

  if (!matchId || !matchInfo) {
    return { success: false, message: '缺少参数' };
  }

  const { winner, loser, score1, score2 } = matchInfo;
  const winnerIds = Array.isArray(winner) ? winner : (winner ? [winner] : []);
  const loserIds = Array.isArray(loser) ? loser : (loser ? [loser] : []);

  try {
    const matchRes = await db.collection('matches').doc(matchId).get();
    const match = matchRes.data;

    if (!match) return { success: false, message: '比赛不存在' };

    const userRes = await db.collection('users').where({ openid }).get();
    const userId = userRes.data && userRes.data[0] ? userRes.data[0]._id : null;
    const isCreator = match.creatorId === userId;
    const isParticipant = match.players && match.players.includes(userId);
    if (!isCreator && !isParticipant) {
      return { success: false, message: '无权限记录' };
    }

    // 更新用户统计（单打 1 人，双打 2 人）
    for (const id of winnerIds) {
      if (id) {
        await db.collection('users').doc(id).update({
          data: { 'stats.wins': db.command.inc(1) }
        });
      }
    }
    for (const id of loserIds) {
      if (id) {
        await db.collection('users').doc(id).update({
          data: { 'stats.losses': db.command.inc(1) }
        });
      }
    }

    // 更新比赛结果（含 score1, score2）；双打存数组
    const results = match.results || {};
    let key;
    if (matchInfo.groupId != null && matchInfo.matchIndex != null) {
      key = `g${matchInfo.groupId}-m${matchInfo.matchIndex}`;
    } else if (matchInfo.round != null && matchInfo.matchIndex != null) {
      key = `r${matchInfo.round}-m${matchInfo.matchIndex}`;
    } else {
      key = matchInfo.resultKey || matchInfo.matchId || 'm1';
    }
    const resultEntry = { winner: winnerIds.length ? winnerIds : winner, loser: loserIds.length ? loserIds : loser };
    if (typeof score1 === 'number') resultEntry.score1 = score1;
    if (typeof score2 === 'number') resultEntry.score2 = score2;
    results[key] = resultEntry;

    let totalMatchups = 0;
    const teams = match.teams || {};
    if (teams.rounds && Array.isArray(teams.rounds)) {
      teams.rounds.forEach(r => {
        totalMatchups += (r.matches || []).length;
      });
    }
    if (teams.groups && Array.isArray(teams.groups)) {
      teams.groups.forEach(g => {
        totalMatchups += (g.matches || []).length;
      });
    }

    let isAllDone = totalMatchups > 0 && Object.keys(results).length >= totalMatchups;
    if (isAllDone) {
      const expectedKeys = [];
      if (teams.rounds && Array.isArray(teams.rounds)) {
        teams.rounds.forEach(r => {
          (r.matches || []).forEach((m, mi) => {
            expectedKeys.push('r' + r.round + '-m' + (mi + 1));
          });
        });
      }
      if (teams.groups && Array.isArray(teams.groups)) {
        teams.groups.forEach(g => {
          (g.matches || []).forEach((m, mi) => {
            expectedKeys.push('g' + g.groupId + '-m' + (mi + 1));
          });
        });
      }
      isAllDone = expectedKeys.length > 0 && expectedKeys.every(k => {
        const w = results[k] && results[k].winner;
        return w && (Array.isArray(w) ? w.length > 0 : true);
      });
    }

    const updateData = { results };
    if (isAllDone) {
      updateData.status = 'finished';
      updateData.finishedAt = db.serverDate();
    } else {
      updateData.status = 'playing';
    }

    await db.collection('matches').doc(matchId).update({
      data: updateData
    });

    return { success: true, message: isAllDone ? '比赛已结束' : '结果已保存' };
  } catch (err) {
    console.error('recordResult error:', err);
    return { success: false, message: err.message || '记录失败' };
  }
};
