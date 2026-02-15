// 云函数：生成组队
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function roundRobin(players) {
  const n = players.length;
  const isOdd = n % 2 === 1;
  const numRounds = isOdd ? n : n - 1;
  const rounds = [];
  const playersList = isOdd ? [...players, null] : [...players];

  for (let round = 0; round < numRounds; round++) {
    const matches = [];
    for (let i = 0; i < playersList.length / 2; i++) {
      const p1 = playersList[i];
      const p2 = playersList[playersList.length - 1 - i];
      if (p1 && p2) {
        matches.push({ player1: p1, player2: p2, result: null });
      }
    }
    rounds.push({ round: round + 1, matches });
    const last = playersList.pop();
    playersList.splice(1, 0, last);
  }
  return { rounds };
}

function teamTurn(players, groupSize = 3) {
  const groups = [];
  const numGroups = Math.ceil(players.length / groupSize);
  for (let i = 0; i < numGroups; i++) {
    const start = i * groupSize;
    const end = Math.min(start + groupSize, players.length);
    const groupPlayers = players.slice(start, end);
    const matches = [];
    for (let j = 0; j < groupPlayers.length; j++) {
      for (let k = j + 1; k < groupPlayers.length; k++) {
        matches.push({
          player1: groupPlayers[j],
          player2: groupPlayers[k],
          result: null
        });
      }
    }
    groups.push({
      groupId: String.fromCharCode(65 + i),
      players: groupPlayers,
      matches
    });
  }
  return { groups };
}

function knockout(players) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const round1Matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    round1Matches.push({
      id: `r1-m${i / 2 + 1}`,
      player1: shuffled[i],
      player2: shuffled[i + 1],
      winner: null,
      loser: null
    });
  }
  return {
    rounds: [{ round: 1, name: '8進4', matches: round1Matches }],
    winnerBracket: [],
    loserBracket: []
  };
}

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

    if (!match) return { success: false, message: '比赛不存在' };
    if (match.status !== 'registering') return { success: false, message: '比赛状态不允许组队' };

    const userRes = await db.collection('users').where({ openid }).get();
    const userId = userRes.data && userRes.data[0] ? userRes.data[0]._id : null;
    if (match.creatorId !== userId) {
      return { success: false, message: '仅创建者可开始组队' };
    }

    const players = match.players || [];
    if (players.length < match.minPlayers) {
      return { success: false, message: `至少需要 ${match.minPlayers} 人` };
    }

    let teams = {};
    const subMode = match.subMode || 'single-turn';

    if (subMode === 'single-turn') {
      teams = roundRobin(players);
    } else if (subMode === 'team-turn') {
      teams = teamTurn(players);
    } else if (subMode === 'knockout') {
      teams = knockout(players);
    } else {
      teams = roundRobin(players);
    }

    await db.collection('matches').doc(matchId).update({
      data: {
        teams,
        status: 'teaming',
        startedAt: db.serverDate()
      }
    });

    return { success: true, teams };
  } catch (err) {
    console.error('generateTeams error:', err);
    return { success: false, message: err.message || '组队失败' };
  }
};
