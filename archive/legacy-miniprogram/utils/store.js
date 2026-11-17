const STORAGE_KEY = "parallel-life-miniprogram-v1";

const DEFAULT_STATE = {
  user: {
    name: "",
    gender: "",
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    loggedIn: false,
    openid: "",
    loginAt: 0
  },
  scriptDraft: {
    name: "",
    family: "city",
    childhood: "ordinary",
    career: "climb",
    love: "steady",
    wealth: "slow",
    children: "flow",
    life: "roller",
    customLife: ""
  },
  saved: [],
  blindReadLives: {},
  blindSsr: {},
  seen: {},
  lastBlind: null,
  visits: 0
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (!raw || typeof raw !== "object") return clone(DEFAULT_STATE);
    return {
      ...clone(DEFAULT_STATE),
      ...raw,
      user: { ...DEFAULT_STATE.user, ...(raw.user || {}) },
      scriptDraft: { ...DEFAULT_STATE.scriptDraft, ...(raw.scriptDraft || {}) },
      saved: Array.isArray(raw.saved) ? raw.saved.slice(0, 20) : [],
      blindReadLives: raw.blindReadLives || {},
      blindSsr: raw.blindSsr || {},
      seen: raw.seen || {}
    };
  } catch (error) {
    return clone(DEFAULT_STATE);
  }
}

const state = loadState();

function persist() {
  try {
    wx.setStorageSync(STORAGE_KEY, state);
  } catch (error) {
    // 本地存储不可用时，页面仍然可以继续使用。
  }
}

function resetState() {
  const fresh = clone(DEFAULT_STATE);
  Object.keys(state).forEach((key) => {
    delete state[key];
  });
  Object.assign(state, fresh);
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (error) {
    // 即使存储删除失败，当前内存状态也已经重置。
  }
}

function getState() {
  return state;
}

function bumpVisit() {
  state.visits += 1;
  persist();
}

function getUser() {
  return state.user;
}

function updateUser(patch) {
  state.user = { ...state.user, ...patch };
  persist();
  return state.user;
}

function setScriptDraft(draft) {
  state.scriptDraft = { ...state.scriptDraft, ...draft };
  persist();
}

function getScriptDraft() {
  return state.scriptDraft;
}

function markModeSeen(mode) {
  state.seen[mode] = true;
  persist();
}

function markBlindSeen(life) {
  state.blindReadLives[life.id] = true;
  (life.chapters || []).forEach((chapter, index) => {
    if (chapter.rarity === "SSR") {
      state.blindSsr[`${life.id}-${index}`] = true;
    }
  });
  state.lastBlind = life.id;
  state.seen.blind = true;
  persist();
}

function countSaved() {
  return state.saved.length;
}

function countReadLives() {
  return Object.keys(state.blindReadLives || {}).length;
}

function countSsrMoments() {
  return Object.keys(state.blindSsr || {}).length;
}

function countSeenModes() {
  return Object.keys(state.seen || {}).filter((key) => ["script", "predict", "blind"].includes(key)).length;
}

function addSaved(kind, snapshot, title, subtitle) {
  snapshot.saved = true;
  const id = kind === "blind" ? snapshot.sessionId : snapshot.id;
  const item = {
    id,
    kind,
    title,
    subtitle,
    date: new Date().toISOString(),
    snapshot: clone(snapshot)
  };
  const index = state.saved.findIndex((saved) => saved.id === id);
  if (index >= 0) {
    state.saved.splice(index, 1);
  }
  state.saved.unshift(item);
  state.saved = state.saved.slice(0, 20);
  persist();
  return item;
}

function findSaved(id) {
  return state.saved.find((item) => String(item.id) === String(id)) || null;
}

function getAllSaved() {
  return state.saved;
}

module.exports = {
  resetState,
  getState,
  persist,
  bumpVisit,
  getUser,
  updateUser,
  setScriptDraft,
  getScriptDraft,
  markModeSeen,
  markBlindSeen,
  countSaved,
  countReadLives,
  countSsrMoments,
  countSeenModes,
  addSaved,
  findSaved,
  getAllSaved
};
