// 云函数：添加用户意见反馈
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { content, contact } = event;

  if (!openid) {
    return { success: false, message: '未获取到 openid' };
  }

  const text = (content || '').trim();
  if (!text) {
    return { success: false, message: '请输入反馈内容' };
  }
  if (text.length > 500) {
    return { success: false, message: '反馈内容请控制在 500 字以内' };
  }

  try {
    const userRes = await db.collection('users').where({ openid }).get();
    const userId = userRes.data && userRes.data[0] ? userRes.data[0]._id : null;

    await db.collection('feedback').add({
      data: {
        openid,
        userId,
        content: text,
        contact: (contact && String(contact).trim()) || '',
        createdAt: db.serverDate()
      }
    });

    return { success: true };
  } catch (err) {
    console.error('addFeedback error:', err);
    return { success: false, message: err.message || '提交失败' };
  }
};

