// pages/matches/matches.js - 我的对战
const app = getApp();

const STATUS_OPTS = [
  { value: 'registering', label: '报名中' },
  { value: 'teaming', label: '组队中' },
  { value: 'playing', label: '进行中' },
  { value: 'finished', label: '已结束' }
];
const TYPE_OPTS = [
  { value: 'singles', label: '单打' },
  { value: 'doubles', label: '双打' }
];
const SUBMODE_OPTS = [
  { value: 'single-turn', label: '单打转' },
  { value: 'team-turn', label: '小队转' },
  { value: 'knockout', label: '晋级赛' }
];

const SWIPE_DELETE_WIDTH = 120; // rpx

Page({
  data: {
    activeTab: 0,
    joinedList: [],
    createdList: [],
    displayJoinedList: [],
    displayCreatedList: [],
    searchKeyword: '',
    filterStatus: [],
    filterType: [],
    filterSubMode: [],
    filterPopupVisible: false,
    filterCount: 0,
    swipeOffsetMap: {},
    statusOpts: STATUS_OPTS.map(o => ({ ...o, selected: false })),
    typeOpts: TYPE_OPTS.map(o => ({ ...o, selected: false })),
    subModeOpts: SUBMODE_OPTS.map(o => ({ ...o, selected: false }))
  },

  onLoad() {},

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadMatches();
  },

  onTabChange(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({ activeTab: index });
  },

  async loadMatches() {
    const userId = app.globalData.userId;
    if (!userId) {
      this.setData({ joinedList: [], createdList: [], displayJoinedList: [], displayCreatedList: [] });
      return Promise.resolve();
    }

    wx.showLoading({ title: '加载中...' });

    try {
      const db = wx.cloud.database();

      const [joinedRes, createdRes] = await Promise.all([
        db.collection('matches').where({ players: userId }).limit(50).get(),
        db.collection('matches').where({ creatorId: userId }).limit(50).get()
      ]);

      const joined = (joinedRes.data || []).sort((a, b) => {
        const ta = (a.createdAt && a.createdAt.seconds) || 0;
        const tb = (b.createdAt && b.createdAt.seconds) || 0;
        return tb - ta;
      });
      const created = (createdRes.data || []).sort((a, b) => {
        const ta = (a.createdAt && a.createdAt.seconds) || 0;
        const tb = (b.createdAt && b.createdAt.seconds) || 0;
        return tb - ta;
      });

      const joinedList = joined.map(m => this.formatMatch(m));
      const createdList = created.map(m => this.formatMatch(m));
      this.setData({ joinedList, createdList }, () => {
        this.applyFilters();
      });
    } catch (err) {
      console.error('loadMatches error:', err);
      this.setData({ joinedList: [], createdList: [], displayJoinedList: [], displayCreatedList: [] });
      const msg = (err.errMsg || err.message || '').includes('INVALID_ENV')
        ? '请先在 app.js 中配置云开发环境 ID'
        : '加载失败';
      wx.showToast({ title: msg, icon: 'none', duration: 3000 });
    } finally {
      wx.hideLoading();
    }
    return Promise.resolve();
  },

  onPullDownRefresh() {
    this.loadMatches().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onMatchTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/match-detail/match-detail?id=${id}`
    });
  },

  onSwipeStart(e) {
    const id = e.currentTarget.dataset.id;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    this._swipeStartX = touch.clientX;
    this._swipeId = id;
  },

  onSwipeMove(e) {
    if (this._swipeId === undefined) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const sys = wx.getSystemInfoSync();
    const pxToRpx = 750 / (sys.windowWidth || 375);
    const deltaPx = touch.clientX - this._swipeStartX;
    const deltaRpx = Math.round(deltaPx * pxToRpx);
    this._swipeStartX = touch.clientX;
    const current = this.data.swipeOffsetMap[this._swipeId] || 0;
    let next = current + deltaRpx;
    if (next > 0) next = 0;
    if (next < -SWIPE_DELETE_WIDTH) next = -SWIPE_DELETE_WIDTH;
    const map = { ...this.data.swipeOffsetMap, [this._swipeId]: next };
    this.setData({ swipeOffsetMap: map });
  },

  onSwipeEnd(e) {
    if (this._swipeId === undefined) return;
    const id = this._swipeId;
    this._swipeId = undefined;
    const current = this.data.swipeOffsetMap[id] || 0;
    const open = current < -SWIPE_DELETE_WIDTH / 2 ? -SWIPE_DELETE_WIDTH : 0;
    const map = { ...this.data.swipeOffsetMap, [id]: open };
    this.setData({ swipeOffsetMap: map });
  },

  onSwipeCellTap(e) {
    const id = e.currentTarget.dataset.id;
    const offset = this.data.swipeOffsetMap[id] || 0;
    if (offset < 0) {
      this.setData({ swipeOffsetMap: { ...this.data.swipeOffsetMap, [id]: 0 } });
    } else {
      this.onMatchTap(e);
    }
  },

  onDeleteMatch(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '确认删除',
      content: '确定删除该比赛？删除后不可恢复。',
      confirmText: '删除',
      confirmColor: '#e53935',
      success: (res) => {
        if (res.confirm) this.doDeleteMatch(id);
      }
    });
  },

  async doDeleteMatch(matchId) {
    wx.showLoading({ title: '删除中...' });
    try {
      const res = await wx.cloud.callFunction({ name: 'deleteMatch', data: { matchId } });
      const result = res.result || {};
      if (!result.success) {
        wx.showToast({ title: result.message || '删除失败', icon: 'none' });
        return;
      }
      const createdList = (this.data.createdList || []).filter((m) => m._id !== matchId);
      this.setData({
        createdList,
        swipeOffsetMap: (() => {
          const m = { ...this.data.swipeOffsetMap };
          delete m[matchId];
          return m;
        })()
      });
      this.applyFilters();
      wx.showToast({ title: '已删除', icon: 'success' });
    } catch (err) {
      console.error('doDeleteMatch error:', err);
      wx.showToast({ title: err.errMsg || '删除失败', icon: 'none' });
    }
  },

  onSearchInput(e) {
    const searchKeyword = e.detail.value || '';
    this.setData({ searchKeyword });
    this.applyFilters();
  },

  onFilterTap() {
    this.setData({ filterPopupVisible: true });
  },

  onFilterClose() {
    this.setData({ filterPopupVisible: false });
  },

  onFilterToggle(e) {
    const { category, value } = e.currentTarget.dataset;
    const key = category === 'status' ? 'filterStatus' : category === 'type' ? 'filterType' : 'filterSubMode';
    let arr = [...this.data[key]];
    const idx = arr.indexOf(value);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(value);
    const filterStatus = category === 'status' ? arr : this.data.filterStatus;
    const filterType = category === 'type' ? arr : this.data.filterType;
    const filterSubMode = category === 'subMode' ? arr : this.data.filterSubMode;
    this.setData({
      filterStatus,
      filterType,
      filterSubMode,
      statusOpts: STATUS_OPTS.map(o => ({ ...o, selected: filterStatus.includes(o.value) })),
      typeOpts: TYPE_OPTS.map(o => ({ ...o, selected: filterType.includes(o.value) })),
      subModeOpts: SUBMODE_OPTS.map(o => ({ ...o, selected: filterSubMode.includes(o.value) }))
    });
    this.applyFilters();
  },

  onFilterReset() {
    this.setData({
      filterStatus: [],
      filterType: [],
      filterSubMode: [],
      statusOpts: STATUS_OPTS.map(o => ({ ...o, selected: false })),
      typeOpts: TYPE_OPTS.map(o => ({ ...o, selected: false })),
      subModeOpts: SUBMODE_OPTS.map(o => ({ ...o, selected: false }))
    });
    this.applyFilters();
  },

  onFilterConfirm() {
    this.setData({ filterPopupVisible: false });
  },

  applyFilters() {
    const { joinedList, createdList, searchKeyword, filterStatus, filterType, filterSubMode } = this.data;
    const kw = (searchKeyword || '').trim().toLowerCase();
    const filterOne = (list) => {
      return (list || []).filter((m) => {
        if (kw) {
          const name = (m.name || '').toLowerCase();
          const loc = (m.locationText || m.location || '').toLowerCase();
          const court = (m.courtNumber || '').toLowerCase();
          if (!name.includes(kw) && !loc.includes(kw) && !court.includes(kw)) {
            return false;
          }
        }
        if (filterStatus.length && !filterStatus.includes(m.status)) return false;
        if (filterType.length && !filterType.includes(m.type)) return false;
        if (filterSubMode.length && !filterSubMode.includes(m.subMode)) return false;
        return true;
      });
    };
    const filterCount = filterStatus.length + filterType.length + filterSubMode.length;
    this.setData({
      displayJoinedList: filterOne(joinedList),
      displayCreatedList: filterOne(createdList),
      filterCount
    });
  },

  getStatusText(status) {
    const map = { registering: '报名中', teaming: '组队中', playing: '进行中', finished: '已结束' };
    return map[status] || status;
  },

  formatMatch(m) {
    const statusMap = { registering: '报名中', teaming: '组队中', playing: '进行中', finished: '已结束' };
    const typeMap = { singles: '单打', doubles: '双打' };
    const subMap = { 'single-turn': '单打转', 'team-turn': '小队转', knockout: '晋级赛' };
    let dateMonth = 'JAN', dateDay = '1';
    if (m.createdAt && m.createdAt.seconds) {
      const d = new Date(m.createdAt.seconds * 1000);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      dateMonth = months[d.getMonth()];
      dateDay = String(d.getDate());
    }
    return {
      ...m,
      statusText: statusMap[m.status] || m.status,
      typeText: typeMap[m.type] || m.type,
      subModeText: subMap[m.subMode] || m.subMode,
      dateMonth,
      dateDay,
      timeText: (m.startTime && m.endTime) ? `${m.startTime} - ${m.endTime}` : (m.startTime || m.time || '时间待定'),
      locationText: m.location ? (m.courtNumber ? `${m.location} (${m.courtNumber})` : m.location) : '地点待定'
    };
  }
});
