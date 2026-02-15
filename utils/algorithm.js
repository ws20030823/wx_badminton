// utils/algorithm.js - 组队算法工具（云函数中也有实现，此处供前端预览或本地计算）

/**
 * 单打转 - 轮转算法 (Round-Robin)
 */
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
        matches.push({ player1: p1, player2: p2 });
      }
    }
    rounds.push({ round: round + 1, matches });
    const last = playersList.pop();
    playersList.splice(1, 0, last);
  }
  return { rounds };
}

/**
 * 小队转 - 分组组内对战
 */
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
          player2: groupPlayers[k]
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

/**
 * 晋级赛 - 淘汰赛第一轮
 */
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

module.exports = {
  roundRobin,
  teamTurn,
  knockout
};
