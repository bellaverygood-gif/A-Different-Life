const BaziCore = require("../../utils/bazi");
const { buildFreeScript } = require("../../utils/freeScript");
const { findLongitude } = require("../../utils/cities");
const { lunarToSolar, leapMonthOf } = require("../../utils/lunar");
const { buildChoicePreview } = require("../../utils/choicePreview");

const STORAGE_KEY = "parallel-life-script-m1";
const LUNAR_YEARS = Array.from({ length: 161 }, (_, index) => String(1940 + index));
const LUNAR_MONTHS = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];
const LUNAR_DAYS = Array.from({ length: 30 }, (_, index) => `${index + 1}日`);
const CHOICE_THEMES = ["工作", "城市", "学业", "关系", "家庭", "其他"];
const CHOICE_STAGES = ["早年", "中年", "后来"];
const ELEMENT_LABELS = BaziCore.ELEMENT_LABELS || { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function readLocal() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(raw) ? raw.slice(0, 20) : [];
  } catch (error) {
    return [];
  }
}

function writeLocal(history) {
  try {
    wx.setStorageSync(STORAGE_KEY, history.slice(0, 20));
  } catch (error) {
    // 本地存储不可用时仍可继续阅读。
  }
}

function dateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function decorateHistory(history) {
  return (Array.isArray(history) ? history : []).map((item) => ({
    ...item,
    dateLabel: dateLabel(item.date),
    title: item.script && item.script.title ? item.script.title : "一段故事",
    meta: item.chart ? `${item.chart.birthSolar || ""}` : ""
  }));
}

Page({
  data: {
    view: "setup",
    today: today(),
    calendar: "solar",
    birthDate: "1990-05-15",
    birthTime: "12:00",
    timeUnknown: false,
    birthPlace: "",
    gender: "female",
    lunarYears: LUNAR_YEARS,
    lunarMonths: LUNAR_MONTHS,
    lunarDays: LUNAR_DAYS,
    lunarYearIndex: 50,
    lunarMonthIndex: 4,
    lunarDayIndex: 14,
    lunarLeap: false,
    leapMonth: 5,
    canLeap: true,
    choiceThemes: CHOICE_THEMES,
    choiceStages: CHOICE_STAGES,
    hasChoice: true,
    choiceThemeIndex: 0,
    choiceStageIndex: 0,
    choiceText: "",
    choiceGivenUp: "",
    choicePreview: null,
    history: [],
    localCount: 0,
    chart: null,
    script: null,
    error: ""
  },
  onLoad() {
    const history = readLocal();
    this.setData({ localCount: history.length, history: decorateHistory(history) });
    this.syncLunarMeta();
  },
  syncLunarMeta(yearIndex, monthIndex) {
    const yIndex = Number.isFinite(yearIndex) ? yearIndex : this.data.lunarYearIndex;
    const mIndex = Number.isFinite(monthIndex) ? monthIndex : this.data.lunarMonthIndex;
    const year = Number(this.data.lunarYears[yIndex]);
    const month = mIndex + 1;
    const leapMonth = leapMonthOf(year);
    this.setData({
      leapMonth,
      canLeap: leapMonth === month,
      lunarLeap: leapMonth === month ? this.data.lunarLeap : false
    });
  },
  onCalendarChange(event) {
    this.setData({ calendar: event.currentTarget.dataset.calendar, error: "" });
  },
  onLunarYearChange(event) {
    const index = Number(event.detail.value);
    this.setData({ lunarYearIndex: index, error: "" });
    this.syncLunarMeta(index, this.data.lunarMonthIndex);
  },
  onLunarMonthChange(event) {
    const index = Number(event.detail.value);
    this.setData({ lunarMonthIndex: index, error: "" });
    this.syncLunarMeta(this.data.lunarYearIndex, index);
  },
  onLunarDayChange(event) {
    this.setData({ lunarDayIndex: Number(event.detail.value), error: "" });
  },
  onLunarLeapChange(event) {
    this.setData({ lunarLeap: Boolean(event.detail.value), error: "" });
  },
  onDateChange(event) {
    this.setData({ birthDate: event.detail.value, error: "" });
  },
  onTimeChange(event) {
    this.setData({ birthTime: event.detail.value, error: "" });
  },
  onTimeUnknownChange(event) {
    this.setData({ timeUnknown: Boolean(event.detail.value), error: "" });
  },
  toggleTimeUnknown() {
    this.setData({ timeUnknown: !this.data.timeUnknown, error: "" });
  },
  onPlaceInput(event) {
    this.setData({ birthPlace: event.detail.value });
  },
  onGenderChange(event) {
    this.setData({ gender: event.detail.value });
  },
  onGenderTap(event) {
    this.setData({ gender: String(event.currentTarget.dataset.gender || "female") });
  },
  onChoiceToggle(event) {
    this.setData({ hasChoice: Boolean(event.detail.value) });
  },
  toggleChoice() {
    this.setData({ hasChoice: !this.data.hasChoice });
  },
  onChoiceThemeChange(event) {
    this.setData({ choiceThemeIndex: Number(event.detail.value) });
  },
  onChoiceStageChange(event) {
    this.setData({ choiceStageIndex: Number(event.detail.value) });
  },
  onChoiceTextInput(event) {
    this.setData({ choiceText: event.detail.value });
  },
  onChoiceGivenUpInput(event) {
    this.setData({ choiceGivenUp: event.detail.value });
  },
  generate() {
    let birthDate = String(this.data.birthDate || "").trim();
    let calendarNote = "";
    if (this.data.calendar === "lunar") {
      const lunarYear = Number(this.data.lunarYears[this.data.lunarYearIndex]);
      const lunarMonth = this.data.lunarMonthIndex + 1;
      const lunarDay = this.data.lunarDayIndex + 1;
      const isLeap = Boolean(this.data.lunarLeap && this.data.canLeap);
      const solar = lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap);
      if (!solar) {
        this.setData({ error: "这个农历日期不存在，换一个日期再试。" });
        return;
      }
      birthDate = `${solar.year}-${String(solar.month).padStart(2, "0")}-${String(solar.day).padStart(2, "0")}`;
      calendarNote = `农历 ${lunarYear} 年${isLeap ? "闰" : ""}${LUNAR_MONTHS[lunarMonth - 1]}${LUNAR_DAYS[lunarDay - 1]} → 公历 ${birthDate}`;
    }
    if (!birthDate) {
      this.setData({ error: "先选一个日期。" });
      return;
    }
    const timeValue = this.data.timeUnknown ? "12:00" : this.data.birthTime;
    const longitude = findLongitude(this.data.birthPlace);
    const bazi = BaziCore.computeBazi(birthDate, timeValue, {
      longitude: longitude,
      gender: this.data.gender
    });
    if (!bazi) {
      this.setData({ error: "这个日期排不出来，换一个日期再试。" });
      return;
    }
    const pillars = this.data.timeUnknown ? bazi.pillars.slice(0, 3) : bazi.pillars;
    const counts = Object.keys(bazi.counts).map((key) => ({
      key,
      label: ELEMENT_LABELS[key] || key,
      value: bazi.counts[key]
    }));
    const chart = {
      pillars,
      counts,
      dayMaster: bazi.dayMaster,
      dayMasterStem: bazi.dayMasterStem,
      dayMasterLabel: ELEMENT_LABELS[bazi.dayMaster] || "",
      dominantLabel: ELEMENT_LABELS[bazi.dominant] || "",
      weakestLabel: ELEMENT_LABELS[bazi.weakest] || "",
      monthJie: bazi.monthJie,
      methodLabel: bazi.methodLabel,
      birthSolar: birthDate,
      calendarNote,
      trueSolarTime: bazi.trueSolarTime,
      solarCorrection: bazi.solarCorrection,
      dayun: this.data.timeUnknown ? null : bazi.dayun,
      timeUnknown: this.data.timeUnknown
    };
    const script = buildFreeScript(bazi, {
      birthDate,
      birthTime: this.data.timeUnknown ? "" : this.data.birthTime,
      birthPlace: this.data.birthPlace,
      gender: this.data.gender,
      timeUnknown: this.data.timeUnknown
    });
    const choicePreview = this.data.hasChoice
      ? buildChoicePreview(script, CHOICE_THEMES[this.data.choiceThemeIndex], this.data.choiceStageIndex)
      : null;
    const history = readLocal();
    history.unshift({
      id: `script-${Date.now()}`,
      date: new Date().toISOString(),
      birthDate,
      calendar: this.data.calendar,
      birthTime: this.data.timeUnknown ? "" : this.data.birthTime,
      birthPlace: this.data.birthPlace,
      gender: this.data.gender,
      timeUnknown: this.data.timeUnknown,
      chart,
      script
    });
    writeLocal(history);
    this.setData({
      view: "result",
      chart,
      script,
      choicePreview,
      history: decorateHistory(history),
      localCount: Math.min(history.length, 20),
      error: ""
    });
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  openHistory(event) {
    const id = String(event.currentTarget.dataset.id || "");
    const history = readLocal();
    const item = history.find((entry) => entry.id === id);
    if (!item) return;
    this.setData({
      view: "result",
      chart: item.chart,
      script: item.script,
              choicePreview: null
    });
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  editAgain() {
    this.setData({ view: "setup", chart: null, script: null, choicePreview: null, error: "" });
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  copyScript() {
    if (!this.data.script) return;
    const script = this.data.script;
    const lines = [
      script.title,
      script.prologue,
      "",
      ...script.acts.map((act) => `${act.label}：${act.text}`),
      "",
      script.choiceAct,
      "",
      script.closing,
      script.disclaimer
    ];
    wx.setClipboardData({
      data: lines.join("\n"),
      success: () => wx.showToast({ title: "已复制", icon: "none" })
    });
  },
  goHome() {
    wx.reLaunch({ url: "/pages/home/index" });
  },
  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
  },
  onShareAppMessage() {
    return {
      title: this.data.script ? this.data.script.title : "写一段自己的故事",
      path: "/pages/home/index"
    };
  }
});
