const LIVES = require("../../data/lives");

const STORAGE_KEY = "parallel-life-m1";
const EMOTIONS = [
  { key: "lighter", label: "更轻松" },
  { key: "heavier", label: "更沉重" },
  { key: "neutral", label: "没感觉" }
];
const DAILY_KEY = "parallel-life-m1-daily";
const DAILY_LIMIT = 3;
const NEGATIVE = /去世|死亡|死了|死|病|癌|丧|亡|伤|残|债|穷|灾|苦|瘫|中风|高血压|糖尿病|手术|住院|吃药|失明|自杀|自残/i;

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function dailyState() {
  try {
    const raw = wx.getStorageSync(DAILY_KEY);
    if (raw && raw.date === todayKey()) return raw;
  } catch (error) {}
  return { date: todayKey(), count: 0 };
}

function dailyLimitReached() {
  return dailyState().count >= DAILY_LIMIT;
}

function bumpDaily() {
  const state = dailyState();
  state.count += 1;
  try { wx.setStorageSync(DAILY_KEY, state); } catch (error) {}
}

function readLocal() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (!raw || typeof raw !== "object") return { history: [], lastId: "" };
    return {
      history: Array.isArray(raw.history) ? raw.history.slice(0, 20) : [],
      lastId: raw.lastId || ""
    };
  } catch (error) {
    return { history: [], lastId: "" };
  }
}

function writeLocal(state) {
  try {
    wx.setStorageSync(STORAGE_KEY, state);
  } catch (error) {
    // 本地存储不可用时仍可继续阅读。
  }
}

function emotionLabel(key) {
  return (EMOTIONS.find((item) => item.key === key) || {}).label || "未评价";
}

function dateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function decorateHistory(history) {
  return (history || []).map((item) => ({
    ...item,
    emotionLabel: emotionLabel(item.emotion),
    dateLabel: dateLabel(item.date)
  }));
}

function decorateLife(life) {
  const paragraphs = String(life.narrative || "").split(/\n\s*\n/).filter(Boolean);
  const safe = paragraphs.filter((p) => !NEGATIVE.test(p));
  const chosen = (safe.length ? safe : paragraphs).slice(0, 7);
  const fragments = chosen.map((text, index) => ({
    key: `fragment-${index}`,
    stage: index < 2 ? "早年" : index < 4 ? "中年" : "后来",
    text
  }));
  const dim = (label) => {
    const item = (life.sixDim || []).find((entry) => entry.label === label);
    return item ? item.value : "";
  };
  const birth = dim("出生").split("；")[0] || life.province;
  const job = dim("事业").split("；")[0] || "普通工作";
  const wealth = dim("财富") || "";
  const wealthMatch = wealth.match(/贫困|温饱|小康|中等|偏下|偏上|普通/);
  const cleanLine = NEGATIVE.test(life.oneLine || "")
    ? "后来，日子还在继续。"
    : life.oneLine;
  return {
    ...life,
    oneLine: cleanLine,
    fragments,
    skeleton: [
      { label: "来自", value: life.province },
      { label: "性别", value: life.gender },
      { label: "家庭经济", value: wealthMatch ? wealthMatch[0] : "普通家庭" },
      { label: "营生类型", value: job }
    ],
    landing: cleanLine,
    birthNote: birth
  };
}
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const chars = String(text || "").split("");
  let line = "";
  let lines = 0;
  for (let i = 0; i < chars.length; i += 1) {
    const next = line + chars[i];
    const width = ctx.measureText ? ctx.measureText(next).width : next.length * 34;
    if (width > maxWidth) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = chars[i];
      lines += 1;
      if (lines >= maxLines) return;
    } else {
      line = next;
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y + lines * lineHeight);
  }
}

Page({
  data: {
    view: "setup",
    loading: false,
    livesCount: LIVES.length,
    historyCount: 0,
    history: [],
    lastLifeName: "",
    life: null,
    emotion: "",
    emotions: EMOTIONS,
    cardPath: "",
    cardBusy: false
  },
  onLoad(options) {
    this.syncLocal();
    if (options && String(options.draw) === "1") {
      this.drawLife();
    }
  },
  syncLocal() {
    const local = readLocal();
    const last = LIVES.find((item) => item.id === local.lastId);
    this.setData({
      historyCount: local.history.length,
      history: decorateHistory(local.history),
      lastLifeName: last ? `${last.name} · ${last.province}` : ""
    });
  },
  drawLife() {
    if (this.data.loading) return;
    if (dailyLimitReached()) {
      wx.showModal({
        title: "今天先读到这里",
        content: "每人每天可以打开 3 段人生。明天再来，或者先写一段自己的故事。",
        showCancel: false,
        confirmText: "知道了"
      });
      return;
    }
    const local = readLocal();
    const pool = LIVES.filter((item) => item.id !== local.lastId);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || LIVES[0];
    this.setData({ loading: true, cardPath: "" });
    setTimeout(() => {
      const next = {
        history: [
          {
            id: chosen.id,
            name: chosen.name,
            province: chosen.province,
            date: new Date().toISOString(),
            emotion: ""
          },
          ...local.history.filter((item) => item.id !== chosen.id)
        ].slice(0, 20),
        lastId: chosen.id
      };
      writeLocal(next);
      bumpDaily();
      this.setData({
        loading: false,
        view: "result",
        life: decorateLife(chosen),
        emotion: "",
        historyCount: next.history.length,
        history: decorateHistory(next.history),
        lastLifeName: `${chosen.name} · ${chosen.province}`,
        cardPath: ""
      });
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    }, 800);
  },
  openHistory(event) {
    const id = String(event.currentTarget.dataset.id || "");
    const local = readLocal();
    const chosen = LIVES.find((item) => item.id === id);
    const item = local.history.find((entry) => entry.id === id);
    if (!chosen) return;
    local.lastId = id;
    writeLocal(local);
    this.setData({
      view: "result",
      life: decorateLife(chosen),
      emotion: (item && item.emotion) || "",
      historyCount: local.history.length,
      history: decorateHistory(local.history),
      lastLifeName: `${chosen.name} · ${chosen.province}`,
      cardPath: ""
    });
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  setEmotion(event) {
    const emotion = String(event.currentTarget.dataset.emotion || "");
    const life = this.data.life;
    if (!life) return;
    const local = readLocal();
    local.history = local.history.map((item) => {
      if (item.id !== life.id) return item;
      return { ...item, emotion };
    });
    writeLocal(local);
    this.setData({ emotion, history: decorateHistory(local.history) });
    const label = emotionLabel(emotion);
    wx.showToast({ title: `已记下：${label}`, icon: "none" });
  },
  makeCard() {
    const life = this.data.life;
    if (!life || this.data.cardBusy) return;
    this.setData({ cardBusy: true });
    wx.showLoading({ title: "正在生成图卡", mask: true });

    setTimeout(() => {
      const ctx = wx.createCanvasContext("lifeCard", this);
      const W = 750;
      const H = 1000;
      ctx.setFillStyle("#080d16");
      ctx.fillRect(0, 0, W, H);

      ctx.setFillStyle("#101827");
      ctx.fillRect(42, 42, W - 84, H - 84);
      ctx.setStrokeStyle("rgba(205, 167, 109, 0.45)");
      ctx.setLineWidth(1);
      ctx.strokeRect(42, 42, W - 84, H - 84);

      ctx.setFillStyle("#cdb488");
      ctx.setFontSize(24);
      ctx.fillText("此生之外 · 虚构人物故事", 82, 112);

      ctx.setFillStyle("#f1eadf");
      ctx.setFontSize(72);
      ctx.fillText(life.name, 82, 230);

      ctx.setFillStyle("#a99d88");
      ctx.setFontSize(26);
      ctx.fillText(`${life.province} · ${life.years} · ${life.gender}`, 84, 286);

      ctx.setStrokeStyle("rgba(205, 167, 109, 0.25)");
      ctx.beginPath();
      ctx.moveTo(82, 330);
      ctx.lineTo(W - 82, 330);
      ctx.stroke();

      ctx.setFillStyle("#d8d1c3");
      ctx.setFontSize(34);
      wrapText(ctx, life.oneLine, 82, 410, W - 164, 58, 4);

      ctx.setFillStyle("#8e877b");
      ctx.setFontSize(24);
      ctx.fillText("出生", 82, 700);
      ctx.fillText("阶段", 292, 700);
      ctx.fillText("读完", 502, 700);

      ctx.setFillStyle("#ece4d7");
      ctx.setFontSize(34);
      ctx.fillText(String(life.birthYear), 82, 754);
      ctx.fillText("早年 → 后来", 292, 754);
      ctx.fillText("一段人生", 502, 754);

      ctx.setFillStyle("#726c61");
      ctx.setFontSize(22);
      wrapText(ctx, "不是预测，不是真实统计，也不构成医疗、投资或决策建议。", 82, 874, W - 164, 34, 2);

      ctx.setFillStyle("#cdb488");
      ctx.setFontSize(22);
      ctx.fillText("抽一个人生，读完一个人的一生。", 82, 944);
      ctx.setFillStyle("#726c61");
      ctx.setFontSize(18);
      ctx.fillText(`内容分级 ${life.level} · ${life.levelNote}`, 82, 976);

      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: "lifeCard",
          x: 0,
          y: 0,
          width: W,
          height: H,
          destWidth: W,
          destHeight: H,
          success: (res) => {
            wx.hideLoading();
            this.setData({ cardBusy: false, cardPath: res.tempFilePath });
            wx.previewImage({ urls: [res.tempFilePath] });
          },
          fail: () => {
            wx.hideLoading();
            this.setData({ cardBusy: false });
            wx.showToast({ title: "图卡生成失败，请重试", icon: "none" });
          }
        }, this);
      });
    }, 120);
  },
  onCardAction() {
    if (this.data.cardPath) {
      this.saveCard();
      return;
    }
    this.makeCard();
  },
  saveCard() {
    const filePath = this.data.cardPath;
    if (!filePath) {
      this.makeCard();
      return;
    }
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => {
        wx.showToast({ title: "图卡已保存", icon: "none" });
      },
      fail: () => {
        wx.showModal({
          title: "没有保存成功",
          content: "请在微信设置里允许保存图片到相册，再试一次。",
          showCancel: false,
          confirmText: "知道了"
        });
      }
    });
  },
  drawAgain() {
    this.drawLife();
  },
  goHome() {
    wx.reLaunch({ url: "/pages/home/index" });
  },
  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
  },
  onShareAppMessage() {
    const life = this.data.life;
    const payload = {
      title: life ? `我读完了${life.name}的一生` : "抽一个人生，读完一个人的一生",
      path: "/pages/home/index"
    };
    if (this.data.cardPath) payload.imageUrl = this.data.cardPath;
    return payload;
  }
});
