// 云函数：生成组队
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 单打转：目标场次 4人4-6场、6人8-10场、8人约12场，大于8人也控制在合理范围
function desiredRounds(n) {
  if (n <= 4) return 2;   // 4人 2轮 = 4场
  if (n <= 6) return 3;   // 6人 3轮 = 9场
  if (n <= 8) return 3;   // 8人 3轮 = 12场
  // 大于8人：每轮 floor(n/2) 场，取 3 轮使总场次约 12~18（10人15场、12人18场）
  return Math.min(n - 1, 3);
}

// 单打转：有限轮转（只取前 maxRounds 轮），每人出场一致、无重复对局
function roundRobinLimited(players, maxRounds) {
  const n = players.length;
  const isOdd = n % 2 === 1;
  const rounds = [];
  const playersList = isOdd ? [...players, null] : [...players];
  const totalRounds = isOdd ? n : n - 1;
  const actualRounds = Math.min(maxRounds, totalRounds);

  for (let round = 0; round < actualRounds; round++) {
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

function roundRobin(players) {
  const n = players.length;
  const isOdd = n % 2 === 1;
  const numRounds = isOdd ? n : n - 1;
  return roundRobinLimited(players, numRounds);
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

// 小队转：按预设队伍分配生成组内对局
function teamTurnFromTeams(teamPlayers) {
  const groups = [];
  for (let i = 0; i < teamPlayers.length; i++) {
    const groupPlayers = teamPlayers[i] || [];
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

// ---------- 双打 2v2 ----------
function doubles4(players) {
  const [a, b, c, d] = players;
  return {
    rounds: [
      { round: 1, matches: [{ team1: [a, b], team2: [c, d], result: null }] },
      { round: 2, matches: [{ team1: [a, c], team2: [b, d], result: null }] },
      { round: 3, matches: [{ team1: [a, d], team2: [b, c], result: null }] }
    ]
  };
}

function doubles6(players) {
  const totalMatches = 9;
  const gamesPerPlayer = 6;
  const playedCount = {};
  players.forEach(p => { playedCount[p] = 0; });
  const pairKey = (t1, t2) => {
    const s1 = [t1[0], t1[1]].sort().join(',');
    const s2 = [t2[0], t2[1]].sort().join(',');
    return [s1, s2].sort().join('|');
  };
  const usedPairs = new Set();
  const rounds = [];

  for (let r = 0; r < totalMatches; r++) {
    const byCount = [...players].sort((x, y) => playedCount[x] - playedCount[y]);
    const four = byCount.slice(0, 4);
    const [p0, p1, p2, p3] = four;
    const options = [
      { team1: [p0, p1], team2: [p2, p3] },
      { team1: [p0, p2], team2: [p1, p3] },
      { team1: [p0, p3], team2: [p1, p2] }
    ];
    let chosen = options.find(o => !usedPairs.has(pairKey(o.team1, o.team2)));
    if (!chosen) chosen = options[0];
    usedPairs.add(pairKey(chosen.team1, chosen.team2));
    chosen.team1.forEach(p => playedCount[p]++);
    chosen.team2.forEach(p => playedCount[p]++);
    rounds.push({
      round: r + 1,
      matches: [{ team1: chosen.team1, team2: chosen.team2, result: null }]
    });
  }
  return { rounds };
}

function doubles8(players) {
  const n = 8;
  const rounds = [];
  for (let r = 0; r < 6; r++) {
    const offset = r % n;
    const idx = i => players[(offset + i) % n];
    const match1 = { team1: [idx(0), idx(1)], team2: [idx(2), idx(3)], result: null };
    const match2 = { team1: [idx(4), idx(5)], team2: [idx(6), idx(7)], result: null };
    rounds.push({ round: r + 1, matches: [match1, match2] });
  }
  return { rounds };
}

// 双打通用：任意人数，每轮 1 场（4人）或 2 场（8人），贪心轮转使场次合理、尽量公平
function doublesGreedy(players) {
  const n = players.length;
  if (n < 4) return { rounds: [] };
  const matchesPerRound = n <= 7 ? 1 : 2;
  const totalSlots = matchesPerRound * 4;
  const targetMatches = n <= 5 ? 10 : n <= 7 ? 10 : n <= 10 ? 12 : Math.min(18, Math.ceil((n * 6) / 4));
  const totalRounds = Math.ceil(targetMatches / matchesPerRound);
  const playedCount = {};
  players.forEach(p => { playedCount[p] = 0; });
  const pairKey = (t1, t2) => {
    const s1 = [t1[0], t1[1]].sort().join(',');
    const s2 = [t2[0], t2[1]].sort().join(',');
    return [s1, s2].sort().join('|');
  };
  const usedPairs = new Set();
  const rounds = [];

  for (let r = 0; r < totalRounds; r++) {
    const byCount = [...players].sort((x, y) => playedCount[x] - playedCount[y]);
    const roundPlayers = byCount.slice(0, totalSlots);
    const roundMatches = [];
    for (let m = 0; m < matchesPerRound; m++) {
      const four = roundPlayers.slice(m * 4, m * 4 + 4);
      if (four.length < 4) break;
      const [p0, p1, p2, p3] = four;
      const options = [
        { team1: [p0, p1], team2: [p2, p3] },
        { team1: [p0, p2], team2: [p1, p3] },
        { team1: [p0, p3], team2: [p1, p2] }
      ];
      let chosen = options.find(o => !usedPairs.has(pairKey(o.team1, o.team2)));
      if (!chosen) chosen = options[0];
      usedPairs.add(pairKey(chosen.team1, chosen.team2));
      chosen.team1.forEach(p => playedCount[p]++);
      chosen.team2.forEach(p => playedCount[p]++);
      roundMatches.push({ team1: chosen.team1, team2: chosen.team2, result: null });
    }
    if (roundMatches.length > 0) {
      rounds.push({ round: r + 1, matches: roundMatches });
    }
  }
  return { rounds };
}

function generateDoubles(players) {
  const n = players.length;
  if (n < 4) return { rounds: [] };
  if (n === 4) return doubles4(players);
  if (n === 6) return doubles6(players);
  if (n === 8) return doubles8(players);
  // 5人、7人、9人、10人及以上：用通用贪心，全员参与、场次合理
  return doublesGreedy(players);
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
    const type = match.type || 'singles';
    const subMode = match.subMode || 'single-turn';

    if (type === 'doubles') {
      teams = generateDoubles(players);
    } else if (subMode === 'single-turn') {
      const maxRounds = desiredRounds(players.length);
      teams = roundRobinLimited(players, maxRounds);
    } else if (subMode === 'team-turn') {
      const tp = match.teamPlayers;
      const tc = match.teamCount || (tp && tp.length);
      if (tp && Array.isArray(tp) && tp.length === tc) {
        teams = teamTurnFromTeams(tp);
      } else {
        teams = teamTurn(players);
      }
    } else if (subMode === 'knockout') {
      teams = knockout(players);
    } else {
      const maxRounds = desiredRounds(players.length);
      teams = roundRobinLimited(players, maxRounds);
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
