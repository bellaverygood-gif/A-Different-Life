const { BLIND_LIVES, BLIND_RARITY } = require("../../data/index");
const store = require("../../utils/store");
const guard = require("../../utils/guard");

function coverPath(value) {
  return `/${String(value || "").split("?")[0]}`;
}

function toneMeta(tone) {
  const value = Number(tone) || 3;
  return {
    1: { label: "很暗", className: "tone-1" },
    2: { label: "偏暗", className: "tone-2" },
    3: { label: "寻常", className: "tone-3" },
    4: { label: "有光", className: "tone-4" },
    5: { label: "最亮", className: "tone-5" }
  }[value] || { label: "寻常", className: "tone-3" };
}

function decorateLife(life) {
  if (!life) return null;
  const reflections = life.reflections || {};
  const chapters = (life.chapters || []).map((chapter, index) => {
    const rarity = BLIND_RARITY[chapter.rarity] || BLIND_RARITY.N;
    const tone = toneMeta(chapter.tone);
    return {
      ...chapter,
      indexLabel: String(index + 1).padStart(2, "0"),
      rarityLabel: rarity.label,
      rarityNote: rarity.note,
      tone: Number(chapter.tone) || 3,
      toneLabel: tone.label,
      toneClass: tone.className,
      reflection: String(reflections[index] || "")
    };
  });
  const brightest = chapters.reduce((best, chapter) => chapter.tone > best.tone ? chapter : best, chapters[0] || {});
  const hardest = chapters.reduce((worst, chapter) => chapter.tone < worst.tone ? chapter : worst, chapters[0] || {});
  return {
    ...life,
    cover: coverPath(life.cover),
    chapters,
    firstAge: chapters[0] ? chapters[0].age : "",
    lastAge: chapters[chapters.length - 1] ? chapters[chapters.length - 1].age : "",
    birthYear: String(life.years || "").split("—")[0],
    birthFamily: life.birthFamily || "普通家庭",
    ssrCount: chapters.filter((chapter) => chapter.rarity === "SSR").length,
    themes: life.themes || [],
    brightest,
    hardest,
    reflections,
    reflectionList: chapters.filter((chapter) => chapter.reflection.trim())
  };
}

Page({
  data: {
    view: "setup",
    loading: false,
    loadingText: "正在抽取一个盲盒",
    loadingSub: "里面装着一条已经写完的人生",
    lives: BLIND_LIVES.map((life) => ({
      ...life,
      cover: coverPath(life.cover),
      archiveYear: String(life.years || "").split("—")[0]
    })),
    lastLifeName: "",
    lastLifeNote: "五条时间线，五个不同年代与处境里的人。抽到谁，就完整旁观谁的一生。",
    showChooser: false,
    life: null,
    isSaved: false,
    reflectionDrafts: {}
  },
  onLoad(options) {
    if (!guard.requireLogin()) return;
    store.markModeSeen("blind");
    const state = store.getState();
    const last = BLIND_LIVES.find((life) => life.id === state.lastBlind);
    this.setData({
      lastLifeName: last ? `${last.name} · ${last.years}` : "",
      lastLifeNote: last
        ? `上一条人生：${last.name} · ${last.years}。这次会为你换一个人。`
        : "五条时间线，五个不同年代与处境里的人。抽到谁，就完整旁观谁的一生。"
    });
    if (options && options.saved) {
      const item = store.findSaved(decodeURIComponent(options.saved));
      if (item && item.kind === "blind" && item.snapshot && Array.isArray(item.snapshot.chapters)) {
        this.setData({
          view: "result",
          life: decorateLife(item.snapshot),
          isSaved: Boolean(item.snapshot.saved),
          loading: false
        });
      }
    }
  },
  drawBlind(characterId = null) {
    if (this.data.loading) return;
    let pool = BLIND_LIVES;
    if (characterId) {
      pool = BLIND_LIVES.filter((life) => life.id === characterId);
    } else {
      const state = store.getState();
      const remaining = BLIND_LIVES.filter((life) => life.id !== state.lastBlind);
      pool = remaining.length ? remaining : BLIND_LIVES;
    }
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (!chosen) return;
    this.setData({
      showChooser: false,
      loading: true,
      loadingText: "正在抽取一个盲盒",
      loadingSub: "里面装着一条已经写完的人生"
    });
    setTimeout(() => {
      const life = decorateLife(chosen);
      store.markBlindSeen(chosen);
      this.setData({
        loading: false,
        view: "result",
        life,
        isSaved: false,
        lastLifeName: `${chosen.name} · ${chosen.years}`,
        lastLifeNote: `上一条人生：${chosen.name} · ${chosen.years}。这次会为你换一个人。`
      });
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
      wx.showToast({ title: `你打开了${chosen.name}的一生`, icon: "none" });
    }, 1300);
  },
  drawRandom() {
    this.drawBlind();
  },
  openChooser() {
    this.setData({ showChooser: true });
  },
  closeChooser() {
    this.setData({ showChooser: false });
  },
  stopBubble() {},
  chooseLife(event) {
    this.drawBlind(event.currentTarget.dataset.id);
  },
  drawAgain() {
    this.drawBlind();
  },
  scrollToChapter(event) {
    const index = Number(event.currentTarget.dataset.index);
    wx.pageScrollTo({ selector: `#life-chapter-${index}`, duration: 300 });
  },
  onReflectionInput(event) {
    const index = event.currentTarget.dataset.index;
    this.setData({ [`reflectionDrafts.${index}`]: event.detail.value });
  },
  saveReflection(event) {
    const index = Number(event.currentTarget.dataset.index);
    const life = this.data.life;
    if (!life) return;
    const draft = this.data.reflectionDrafts || {};
    const existing = (life.reflections && life.reflections[index]) || (life.chapters[index] && life.chapters[index].reflection) || "";
    const value = String(draft[index] !== undefined ? draft[index] : existing).trim();
    const reflections = { ...(life.reflections || {}), [index]: value };
    const next = decorateLife({ ...life, reflections });
    this.setData({ life: next });
    wx.showToast({ title: value ? "这句话留在了这一生里" : "这句话已经清空", icon: "none" });
  },
  goHome() {
    wx.reLaunch({ url: "/pages/home/index" });
  },
  onShareAppMessage() {
    const life = this.data.life;
    return {
      title: life ? `我打开了一个盲盒，里面是${life.name}的一生` : "盲盒之下，是未知的人生碎片",
      path: "/pages/home/index"
    };
  }
});
