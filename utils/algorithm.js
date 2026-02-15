// utils/algorithm.js - 組隊演算法工具（雲函數中也有實作，此處供前端預覽或本地計算）

/**
 * 單打轉 - 輪轉演算法 (Round-Robin)
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
 * 小隊轉 - 分組組內對戰
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
 * 晉級賽 - 淘汰賽第一輪
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
