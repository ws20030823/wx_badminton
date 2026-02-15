// 云函数：创建比赛
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { name, type, subMode, minPlayers, maxPlayers, time, location } = event;

  if (!name || !type || !subMode) {
    return { success: false, message: '缺少必要参数' };
  }

  try {
    // 查询或创建用户
    let userRes = await db.collection('users').where({ openid }).get();
    let userId;
    if (userRes.data && userRes.data.length > 0) {
      userId = userRes.data[0]._id;
      await db.collection('users').doc(userId).update({
        data: {
          'stats.createdMatches': db.command.inc(1)
        }
      });
    } else {
      const addRes = await db.collection('users').add({
        data: {
          openid,
          nickName: '用户',
          avatarUrl: '',
          createdAt: db.serverDate(),
          stats: {
            totalMatches: 0,
            createdMatches: 1,
            wins: 0,
            losses: 0,
            winRate: 0
          }
        }
      });
      userId = addRes._id;
    }

    const matchData = {
      creatorId: userId,
      name: String(name).trim(),
      type: type || 'singles',
      subMode: subMode || 'single-turn',
      minPlayers: minPlayers || 4,
      maxPlayers: maxPlayers || 8,
      status: 'registering',
      players: [userId],
      teams: {},
      results: {},
      rankings: [],
      currentRound: 0,
      createdAt: db.serverDate(),
      startedAt: null,
      finishedAt: null
    };

    if (time) matchData.time = time;
    if (location) matchData.location = String(location).trim();

    const res = await db.collection('matches').add({ data: matchData });
    return { success: true, matchId: res._id };
  } catch (err) {
    console.error('createMatch error:', err);
    return { success: false, message: err.message || '创建失败' };
  }
};
