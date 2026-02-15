// utils/db.js - 資料庫操作工具

/**
 * 獲取雲端資料庫實例
 */
function getDB() {
  return wx.cloud.database();
}

/**
 * 查詢單個文件
 */
async function getDoc(collection, id) {
  const db = getDB();
  const res = await db.collection(collection).doc(id).get();
  return res.data;
}

/**
 * 查詢列表
 */
async function getList(collection, where = {}, options = {}) {
  const db = getDB();
  let query = db.collection(collection).where(where);
  if (options.orderBy) {
    query = query.orderBy(options.orderBy.field, options.orderBy.order || 'asc');
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  const res = await query.get();
  return res.data;
}

/**
 * 新增文件
 */
async function addDoc(collection, data) {
  const db = getDB();
  const res = await db.collection(collection).add({
    data: { ...data, createdAt: db.serverDate() }
  });
  return res._id;
}

/**
 * 更新文件
 */
async function updateDoc(collection, id, data) {
  const db = getDB();
  await db.collection(collection).doc(id).update({
    data: { ...data, updatedAt: db.serverDate() }
  });
}

module.exports = {
  getDB,
  getDoc,
  getList,
  addDoc,
  updateDoc
};
