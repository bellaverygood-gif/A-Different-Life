const { buildPrediction, regeneratePrediction, BAZI_ELEMENT_LABELS } = require("../../utils/generators");
const store = require("../../utils/store");
const guard = require("../../utils/guard");

const GENDERS = [
  { id: "female", label: "女" },
  { id: "male", label: "男" },
  { id: "other", label: "其他" }
];

function splitFacts(facts) {
  return String(facts || "")
    .split(/[；;。\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function decoratePrediction(prediction) {
  if (!prediction) return null;
  const bazi = prediction.bazi || {};
  const elementOrder = ["wood", "fire", "earth", "metal", "water"];
  const elementChips = elementOrder.map((key) => ({
    key,
    label: BAZI_ELEMENT_LABELS[key],
    count: (bazi.counts && bazi.counts[key]) || 0,
    className: [
      bazi.dominant === key ? "is-dominant" : "",
      bazi.weakest === key ? "is-weak" : ""
    ].filter(Boolean).join(" ")
  }));
  const fiveReadings = prediction.fiveReadings || [];
  const questionProvided = Boolean(prediction.questionProvided);
  const questionCheck = questionProvided
    ? (prediction.questionCheck || {
      focus: "五维",
      echo: fiveReadings.map((reading) => `${reading.title}：${reading.text}`).join(" "),
      scriptLine: prediction.baselineIntro,
      reframe: prediction.insight,
      facts: prediction.facts || ""
    })
    : null;
  const hasNode = Boolean(prediction.nodeProvided);
  const dayMasterLabel = bazi.dayMaster
    ? `${bazi.dayMasterStem} ${BAZI_ELEMENT_LABELS[bazi.dayMaster]}`
    : "未定";
  const baziMetaLine = [
    bazi.monthJie ? `月令 ${bazi.monthJie}` : "",
    bazi.hourBranchLabel || "",
    prediction.birthPlace || ""
  ].filter(Boolean).join(" · ");
  const elementLine = bazi.summary
    ? `${bazi.summary} ${bazi.elementLine || ""}${prediction.birthPlace ? ` 你出生在${prediction.birthPlace}，这份命局会以更具体的地方经验落下来。` : ""}`
    : "命盘信息不足。";
  const inviteTitle = questionProvided
    ? "如果给你一次改写的机会，你会改哪一步？"
    : "有哪里是你觉得遗憾，或者想改变的？";
  const inviteCopy = questionProvided
    ? "问题已经放回命盘里看过了。现在不急着要答案，先选一个你想改写的节点，我们来看看选择后的人生会是什么样。"
    : "看完妻财子禄寿之后，再做一个选择。我们来看看选择后的人生会是什么样。";

  return {
    ...prediction,
    questionProvided,
    hasNode,
    dayMasterLabel,
    fiveReadings,
    questionCheck,
    factChips: splitFacts(prediction.facts),
    inviteTitle,
    inviteCopy,
    bazi: {
      ...bazi,
      elementChips,
      dayMasterLabel,
      elementLine,
      metaLine: baziMetaLine
    },
    metaTitle: questionProvided ? prediction.category : "妻财子禄寿",
    metaTurn: hasNode ? `转弯点 · ${prediction.age} 岁` : "命盘已排 · 等待你的选择"
  };
}

Page({
  data: {
    view: "setup",
    loading: false,
    loadingText: "正在排出这一生的底牌",
    loadingSub: "四柱、五行与妻财子禄寿",
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    gender: "",
    question: "",
    facts: "",
    genders: GENDERS,
    pillarPlaceholders: ["年柱", "月柱", "日柱", "时柱"],
    error: "",
    prediction: null,
    isSaved: false,
    showNodeModal: false,
    nodeDraft: "",
    nodeError: ""
  },
  onLoad(options) {
    if (!guard.requireLogin()) return;
    store.markModeSeen("predict");
    const user = store.getUser();
    this.setData({
      birthDate: user.birthDate || "",
      birthTime: user.birthTime || "",
      birthPlace: user.birthPlace || "",
      gender: user.gender || ""
    });
    if (options && options.saved) {
      const item = store.findSaved(decodeURIComponent(options.saved));
      if (item && item.kind === "predict" && item.snapshot) {
        if (item.snapshot.nodeProvided == null) {
          item.snapshot.nodeProvided = Boolean(item.snapshot.rawNode);
        }
        this.setData({
          view: "result",
          prediction: decoratePrediction(item.snapshot),
          isSaved: Boolean(item.snapshot.saved),
          loading: false
        });
      }
    }
  },
  onBirthDate(event) {
    this.setData({ birthDate: event.detail.value, error: "" });
  },
  onBirthTime(event) {
    this.setData({ birthTime: event.detail.value, error: "" });
  },
  onBirthPlaceInput(event) {
    this.setData({ birthPlace: event.detail.value, error: "" });
  },
  selectGender(event) {
    this.setData({ gender: event.currentTarget.dataset.id, error: "" });
  },
  onQuestionInput(event) {
    this.setData({ question: event.detail.value });
  },
  onFactsInput(event) {
    this.setData({ facts: event.detail.value });
  },
  generatePrediction() {
    if (this.data.loading) return;
    const birthDate = String(this.data.birthDate || "").trim();
    const birthTime = String(this.data.birthTime || "").trim();
    const birthPlace = String(this.data.birthPlace || "").trim();
    const gender = this.data.gender;
    if (!birthDate || !birthTime || !birthPlace || !gender) {
      this.setData({ error: "先补上出生日期、出生时间、出生地与性别，才能排出四柱。" });
      return;
    }
    const user = store.getUser();
    store.updateUser({ birthDate, birthTime, birthPlace, gender });
    this.setData({
      loading: true,
      loadingText: "正在排出这一生的底牌",
      loadingSub: "四柱、五行与妻财子禄寿",
      error: ""
    });
    setTimeout(() => {
      const prediction = buildPrediction({
        name: user.name,
        birthDate,
        birthTime,
        birthPlace,
        gender,
        question: this.data.question,
        facts: this.data.facts
      }, user);
      this.setData({
        loading: false,
        view: "result",
        prediction: decoratePrediction(prediction),
        isSaved: false
      });
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
      wx.showToast({ title: "命盘与这一生的推演已经展开", icon: "none" });
    }, 1500);
  },
  openNodeModal() {
    const prediction = this.data.prediction;
    if (!prediction) return;
    this.setData({
      showNodeModal: true,
      nodeDraft: prediction.nodeProvided ? (prediction.rawNode || prediction.node) : "",
      nodeError: ""
    });
  },
  closeNodeModal() {
    this.setData({ showNodeModal: false, nodeError: "" });
  },
  stopBubble() {},
  onNodeInput(event) {
    this.setData({ nodeDraft: event.detail.value, nodeError: "" });
  },
  confirmNode() {
    const node = String(this.data.nodeDraft || "").trim();
    if (!node) {
      this.setData({ nodeError: "写下一个你想改写的关键节点，再继续。" });
      return;
    }
    const previous = this.data.prediction;
    if (!previous) return;
    const user = store.getUser();
    const next = decoratePrediction(regeneratePrediction(previous, node, user));
    this.setData({
      prediction: next,
      showNodeModal: false,
      nodeError: "",
      isSaved: false
    });
    setTimeout(() => {
      wx.pageScrollTo({ selector: "#compare", duration: 300 });
    }, 160);
    wx.showToast({ title: "时间线已围绕新的节点重新展开", icon: "none" });
  },
  newPrediction() {
    this.setData({
      view: "setup",
      prediction: null,
      isSaved: false,
      question: "",
      facts: "",
      error: "",
      showNodeModal: false
    });
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  goHome() {
    wx.reLaunch({ url: "/pages/home/index" });
  },
  onShareAppMessage() {
    const prediction = this.data.prediction;
    return {
      title: prediction ? `${prediction.name}的一生，妻财子禄寿会怎么回答？` : "先看清这一生的底牌",
      path: "/pages/home/index"
    };
  }
});
