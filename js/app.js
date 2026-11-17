(function () {
  "use strict";

  const LIVES = Array.isArray(window.LIVES) ? window.LIVES : [];
  const Bazi = window.BaziCore;
  const Lunar = window.Lunar;
  const FreeScript = window.FreeScript;
  const ChoicePreview = window.ChoicePreview;
  const Cities = window.Cities;

  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const BLIND_KEY = "parallel-life-web-blind";
  const SCRIPT_KEY = "parallel-life-web-script";
  const FORM_KEY = "parallel-life-web-script-form";

  const LUNAR_YEARS = Array.from({ length: 161 }, (_, i) => String(1940 + i));
  const LUNAR_MONTHS = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];
  const LUNAR_DAYS = Array.from({ length: 30 }, (_, i) => `初${["一","二","三","四","五","六","七","八","九","十"][i] || i + 1}日`);
  const CHOICE_THEMES = ["工作", "城市", "学业", "关系", "家庭", "其他"];
  const CHOICE_STAGES = ["早年", "中年", "后来"];

  let toastTimer = 0;
  let currentLife = null;
  let cardData = "";
  let scriptForm = loadForm();
  let scriptResult = null;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function icon(name, size = 18) {
    const paths = {
      spark: '<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2z"/>',
      dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="12" cy="12" r="1.2"/>',
      book: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 1 5 17.5v-13z"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H20"/>',
      shield: '<path d="M12 3l7 3v5c0 4.5-3 7.8-7 10-4-2.2-7-5.5-7-10V6l7-3z"/>',
      history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>',
      arrow: '<path d="M5 12h14"/><path d="M14 6l6 6-6 6"/>'
    };
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) { return fallback; }
  }

  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function loadForm() {
    const saved = loadJSON(FORM_KEY, {});
    return Object.assign({
      calendar: "solar",
      birthDate: "1990-05-15",
      birthTime: "12:00",
      timeUnknown: false,
      birthPlace: "",
      gender: "female",
      lunarYear: "1990",
      lunarMonth: 5,
      lunarDay: 15,
      lunarLeap: false,
      hasChoice: false,
      choiceTheme: "工作",
      choiceStage: "早年",
      choiceText: "",
      choiceGivenUp: ""
    }, saved);
  }

  function saveForm() { saveJSON(FORM_KEY, scriptForm); }

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-show"), 2200);
  }

  function pad(value) { return String(value).padStart(2, "0"); }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function historyEmotion(key) {
    return ({ lighter: "更轻松", heavier: "更沉重", neutral: "没感觉" })[key] || "未评价";
  }

  function header(active) {
    const items = [["home", "首页"], ["blind", "抽一个人生"], ["script", "看自己的剧本"], ["privacy", "说明"]];
    const overlay = active === "home" ? " nav-overlay" : " nav-paper";
    return `<header class="site-nav${overlay}">
      <a class="nav-brand" href="#/home">
        <span class="nav-seal">✦</span>
        <span class="nav-brand-text"><strong>此生之外</strong></span>
      </a>
      <nav class="nav-center" aria-label="主导航">
        ${items.map(([key, label]) => `<a href="#/${key}" class="${active === key ? "is-active" : ""}"><span>${label}</span></a>`).join("")}
      </nav>
      <div class="nav-right">
        <button type="button" class="nav-cta" data-login>登录</button>
      </div>
    </header>`;
  }

  function footer() {
    const route = (location.hash || "#/home").replace(/^#\/?/, "").split("?")[0] || "home";
    const tabs = [["home", "首页", "spark"], ["blind", "盲盒", "dice"], ["script", "剧本", "book"], ["privacy", "说明", "shield"]];
    const nav = route === "home" ? "" : `<nav class="bottom-nav" aria-label="底部导航">
      ${tabs.map(([key, label, ico]) => `<a href="#/${key}" class="${route === key ? "is-active" : ""}">${icon(ico, 18)}<span>${label}</span></a>`).join("")}
    </nav>`;
    return `${nav}<footer class="home-footer shell-wide">
      <span>此生之外 · 虚构人物故事</span>
      <span><a href="#/agreement">用户协议</a> · <a href="#/privacy">隐私说明</a></span>
    </footer>`;
  }

  function homePage() {
    document.title = "此生之外 · 旁观一段人生";
    const picks = [LIVES[0], LIVES[6], LIVES[12]].filter(Boolean);
    return `${header("home")}
      <div class="cin-page">
        <section class="cin-hero">
          <div class="cin-hero-bg"><img src="assets/story-camera.jpg" alt=""></div>
          <div class="cin-hero-shade"></div>
          <div class="cin-hero-content">
            <div class="cin-hero-copy">
              <span class="cin-kicker">此生之外 · 虚构人物故事</span>
              <h1>从出生，<br>读到后来。</h1>
              <p>抽一个盲盒，读完一个人的一生。不是预测，也不是你的另一种结局。</p>
              <div class="cin-cta">
                <a class="cin-btn cin-btn-primary" href="#/blind">抽一个人生</a>
                <a class="cin-btn cin-btn-ghost" href="#/script">看自己的剧本</a>
              </div>
            </div>
            <aside class="cin-hero-side">
              <div><strong>${LIVES.length}</strong><span>段虚构人生</span></div>
              <div><strong>约 2 分钟</strong><span>读完一段</span></div>
              <div><strong>无需登录</strong><span>先读，再决定</span></div>
            </aside>
          </div>
          <a class="cin-scroll" href="#cin-about"><span>向下探索</span><i>↓</i></a>
        </section>

        <section class="cin-about" id="cin-about">
          <span class="cin-label">01 / 核心体验</span>
          <div class="cin-about-grid">
            <h2>两条路径，<br>读完一段人生。</h2>
            <p>不是给你一个答案，而是把一段完整的人生摊开。你可以随机遇见一个人，也可以输入自己的出生信息，读一份文化叙事剧本。</p>
          </div>
        </section>

        <section class="cin-features">
          <a class="cin-feature" href="#/blind">
            <span class="cin-feature-num">01</span>
            <div><span class="cin-label">盲盒人生</span><h3>抽一个人生</h3><p>从出生读到后来。没有分支，也不需要你选择结局。</p><span class="cin-link">打开盲盒 <i>→</i></span></div>
            <span class="cin-feature-arrow" aria-hidden="true">↗</span>
          </a>
          <a class="cin-feature" href="#/script">
            <span class="cin-feature-num">02</span>
            <div><span class="cin-label">剧本人生</span><h3>看自己的剧本</h3><p>输入出生信息，读一份文化叙事剧本。不是预测。</p><span class="cin-link">进入剧本 <i>→</i></span></div>
            <span class="cin-feature-arrow" aria-hidden="true">↗</span>
          </a>
        </section>

        <section class="cin-people">
          <div class="cin-section-head"><span class="cin-label">02 / 人物卡</span><span class="cin-note">${LIVES.length} 段虚构人生</span></div>
          <div class="cin-people-grid">
            ${picks.map((life, index) => `<a class="cin-person" href="#/blind">
              <div class="cin-person-img"><img src="assets/${["life-market.jpg", "life-workshop.jpg", "life-warehouse.jpg"][index]}" alt=""></div>
              <div class="cin-person-meta"><span>${esc(life.province)}</span><span>${esc(life.gender)}</span></div>
              <h3>${esc(life.name)}</h3>
              <p>${esc(life.oneLine)}</p>
            </a>`).join("")}
          </div>
        </section>

        <div class="cin-foot-note">所有人物与故事均为虚构。不是真实统计，不是预测，也不构成医疗、投资或决策建议。</div>
      </div>
      ${footer()}`;
  }

  function blindStore() {
    return Object.assign({ history: [], lastId: "" }, loadJSON(BLIND_KEY, {}));
  }

  function blindHistoryView(store) {
    if (!store.history.length) return "";
    return `<div class="history">
      <span class="eyebrow">最近读过</span>
      <div class="history-list">
        ${store.history.map((item) => `<button class="history-row" data-history="${esc(item.id)}">
          <span class="history-main"><span class="history-name">${esc(item.name)}</span><span class="history-meta">${esc(item.province)} · ${esc(formatDate(item.date))}</span></span>
          <span class="history-emotion">${esc(historyEmotion(item.emotion))}</span>
        </button>`).join("")}
      </div>
    </div>`;
  }

  function blindPage() {
    document.title = "盲盒人生 · 此生之外";
    const store = blindStore();
    const last = LIVES.find((item) => item.id === store.lastId);
    return `${header("blind")}
      <div class="shell-wide">
        <section class="blind-setup">
          <div class="blind-mark">◉</div>
          <span class="eyebrow">盲盒人生 · 18 段虚构人生 · L0—L1</span>
          <h1 class="blind-title">抽一个人生，<span class="gold">从出生读到后来。</span></h1>
          <p class="blind-lede">不是你的另一种结局，也不是预测。只是一个陌生人的一生，恰好被你打开。</p>
          <div class="blind-actions">
            <button class="btn btn-primary" data-draw>抽取一条人生 <span>✦</span></button>
            <a class="btn btn-ghost" href="#/home">回到首页</a>
          </div>
          <p class="blind-hint">${last ? `上次读到：${esc(last.name)} · ${esc(last.province)}` : "一个盲盒里，是一条完整的人生。"}</p>
          <div class="blind-notes">
            <div class="note-row"><span class="note-k">读什么</span><span class="note-v">出生、另一半、事业、子女、财富、寿命</span></div>
            <div class="note-row"><span class="note-k">怎么读</span><span class="note-v">没有分支，不需要你选择结局</span></div>
            <div class="note-row"><span class="note-k">本机记录</span><span class="note-v">${store.history.length} / 20</span></div>
          </div>
          ${blindHistoryView(store)}
          <span class="disclaimer">所有人物与故事均为虚构。不是真实统计，不是预测，也不构成医疗、投资或决策建议。</span>
        </section>
      </div>
      ${footer()}`;
  }

  function renderBlindLife(life, emotion = "") {
    const store = blindStore();
    const prev = store.history.find((item) => item.id === life.id);
    currentLife = life;
    emotion = emotion || (prev && prev.emotion) || "";
    document.title = `${life.name}的一生 · 此生之外`;
    const paragraphs = String(life.narrative || "").split(/\n\s*\n/).filter(Boolean);
    app.innerHTML = `${header("blind")}
      <article class="shell-wide">
        <header class="life-hero">
          <div class="life-hero-art" aria-hidden="true"><img src="assets/mode-blind.jpg" alt=""></div>
          <span class="eyebrow">盲盒人生 · 已拆封</span>
          <div class="life-meta"><span>${esc(life.province)}</span><span>${esc(life.years)}</span><span>${esc(life.gender)}</span></div>
          <h1 class="life-name">${esc(life.name)}</h1>
          <p class="life-one-line">${esc(life.oneLine)}</p>
          <div class="level-line"><span class="level-pill">${esc(life.level || "L0")}</span><span>${esc(life.levelNote || "日常叙事")}</span></div>
          <div class="fact-row">
            <div><span class="fact-k">出生</span><span class="fact-v">${esc(life.birthYear)}</span></div>
            <div><span class="fact-k">寿命</span><span class="fact-v">${esc(life.deathAge)} 岁</span></div>
            <div><span class="fact-k">六维</span><span class="fact-v">完整人生</span></div>
          </div>
        </header>
        <div class="life-body">
          <section class="section">
            <span class="eyebrow">六维总览</span>
            <h2 class="section-title">这一生的六个面</h2>
            <div class="six-grid">${(life.sixDim || []).map((item) => `<div class="six-row"><span class="six-label">${esc(item.label)}</span><span class="six-value">${esc(item.value)}</span></div>`).join("")}</div>
          </section>
          <section class="section">
            <span class="eyebrow">完整叙述</span>
            <h2 class="section-title">${esc(life.name)}的一生</h2>
            <div class="prose">${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
          </section>
          <section class="section">
            <span class="eyebrow">时间轴</span>
            <h2 class="section-title">从哪一年，走到哪一年</h2>
            <div class="timeline">${(life.timeline || []).map((item) => `<div class="time-row"><div><span class="time-year">${esc(item.year)}</span><span class="time-age">${esc(item.age)} 岁</span></div><div><span class="time-event">${esc(item.event)}</span><span class="time-change">${esc(item.change)}</span></div></div>`).join("")}</div>
          </section>
          <section class="section">
            <span class="eyebrow">读完之后</span>
            <h2 class="section-title">这一生，让你更轻松还是更沉重？</h2>
            <div class="emotion-row" id="emotionRow">
              ${[["lighter","更轻松"],["heavier","更沉重"],["neutral","没感觉"]].map(([key,label]) => `<button class="emotion-btn ${emotion === key ? "is-active" : ""}" data-emotion="${key}">${label}</button>`).join("")}
            </div>
            <span class="small-note">只记在本机，用来判断内容是否让人更沉重。</span>
          </section>
          <div class="card-action" id="cardAction">
            <button class="btn btn-ghost" data-card>生成这一生的图卡</button>
            <button class="btn btn-ghost" data-share>分享这一生</button>
          </div>
          <div class="life-actions">
            <button class="btn btn-primary" data-draw-again>再抽一个</button>
            <a class="btn btn-ghost" href="#/blind">返回盲盒</a>
          </div>
          <div class="bottom-links"><a href="#/home">回到首页</a><span>·</span><a href="#/privacy">隐私说明</a></div>
          <span class="disclaimer">所有人物与故事均为虚构。不是真实统计，不是预测，也不构成医疗、投资或决策建议。</span>
        </div>
      </article>
      <canvas id="lifeCanvas" class="life-canvas" width="750" height="1000" aria-hidden="true"></canvas>
      ${footer()}`;
    document.querySelectorAll("[data-emotion]").forEach((button) => button.addEventListener("click", () => setEmotion(button.dataset.emotion)));
    const drawAgain = document.querySelector("[data-draw-again]");
    if (drawAgain) drawAgain.addEventListener("click", drawLife);
    const cardBtn = document.querySelector("[data-card]");
    if (cardBtn) cardBtn.addEventListener("click", makeCard);
    const shareBtn = document.querySelector("[data-share]");
    if (shareBtn) shareBtn.addEventListener("click", shareLife);
    window.scrollTo(0, 0);
  }

  function drawLife() {
    const store = blindStore();
    const pool = LIVES.filter((item) => item.id !== store.lastId);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || LIVES[0];
    if (!chosen) return;
    store.history = [{ id: chosen.id, name: chosen.name, province: chosen.province, date: new Date().toISOString(), emotion: "" }, ...store.history.filter((item) => item.id !== chosen.id)].slice(0, 20);
    store.lastId = chosen.id;
    saveJSON(BLIND_KEY, store);
    renderBlindLife(chosen, "");
  }

  function setEmotion(emotion) {
    if (!currentLife) return;
    const store = blindStore();
    store.history = store.history.map((item) => item.id === currentLife.id ? Object.assign({}, item, { emotion }) : item);
    saveJSON(BLIND_KEY, store);
    document.querySelectorAll("[data-emotion]").forEach((button) => button.classList.toggle("is-active", button.dataset.emotion === emotion));
    toast(`已记下：${historyEmotion(emotion)}`);
  }

  function shareLife() {
    if (!currentLife) return;
    const text = `${currentLife.name} · ${currentLife.province} · ${currentLife.years}\n${currentLife.oneLine}\n\n来自「此生之外」：虚构人物故事，不是预测。`;
    if (navigator.share) {
      navigator.share({ title: `${currentLife.name}的一生`, text }).catch(() => {});
      return;
    }
    navigator.clipboard && navigator.clipboard.writeText(text).then(() => toast("这一生的摘要已复制")).catch(() => toast("浏览器不支持复制"));
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const chars = String(text || "").split("");
    let line = "";
    let lines = 0;
    for (let i = 0; i < chars.length; i += 1) {
      const next = line + chars[i];
      const width = ctx.measureText ? ctx.measureText(next).width : next.length * 34;
      if (width > maxWidth && line) {
        ctx.fillText(line, x, y + lines * lineHeight);
        line = chars[i];
        lines += 1;
        if (lines >= maxLines) return;
      } else {
        line = next;
      }
    }
    if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
  }

  function makeCard() {
    const life = currentLife;
    if (!life) return;
    const canvas = document.getElementById("lifeCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 750;
    const H = 1000;
    ctx.fillStyle = "#080d16";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#101827";
    ctx.fillRect(42, 42, W - 84, H - 84);
    ctx.strokeStyle = "rgba(205,167,109,.45)";
    ctx.strokeRect(42, 42, W - 84, H - 84);
    ctx.fillStyle = "#cdb488";
    ctx.font = "22px serif";
    ctx.fillText("此生之外 · 虚构人物故事", 82, 110);
    ctx.fillStyle = "#f1eadf";
    ctx.font = "68px serif";
    ctx.fillText(life.name, 82, 225);
    ctx.fillStyle = "#a99d88";
    ctx.font = "24px serif";
    ctx.fillText(`${life.province} · ${life.years} · ${life.gender}`, 84, 280);
    ctx.strokeStyle = "rgba(205,167,109,.25)";
    ctx.beginPath();
    ctx.moveTo(82, 325);
    ctx.lineTo(W - 82, 325);
    ctx.stroke();
    ctx.fillStyle = "#d8d1c3";
    ctx.font = "32px serif";
    wrapCanvasText(ctx, life.oneLine, 82, 405, W - 164, 54, 4);
    ctx.fillStyle = "#8e877b";
    ctx.font = "20px serif";
    ctx.fillText("出生", 82, 690);
    ctx.fillText("寿命", 292, 690);
    ctx.fillText("读完", 502, 690);
    ctx.fillStyle = "#ece4d7";
    ctx.font = "34px serif";
    ctx.fillText(String(life.birthYear), 82, 744);
    ctx.fillText(`${life.deathAge} 岁`, 292, 744);
    ctx.fillText("一生", 502, 744);
    ctx.fillStyle = "#726c61";
    ctx.font = "18px serif";
    wrapCanvasText(ctx, "不是预测，不是真实统计，也不构成医疗、投资或决策建议。", 82, 858, W - 164, 30, 2);
    ctx.fillStyle = "#cdb488";
    ctx.font = "20px serif";
    ctx.fillText("一个盲盒，一条完整的人生。", 82, 944);
    cardData = canvas.toDataURL("image/jpeg", 0.92);
    const box = document.getElementById("cardAction");
    if (box) {
      box.innerHTML = `<button class="btn btn-ghost" data-card>重新生成图卡</button><a class="btn btn-primary" href="${cardData}" download="${esc(life.name)}-此生之外.jpg">保存图卡</a><button class="btn btn-ghost" data-share>分享这一生</button>`;
      box.querySelector("[data-card]").addEventListener("click", makeCard);
      box.querySelector("[data-share]").addEventListener("click", shareLife);
    }
    toast("图卡已生成，可以保存");
  }

  function scriptHistory() {
    return loadJSON(SCRIPT_KEY, []);
  }

  function saveScriptHistory(item) {
    const history = [item, ...scriptHistory().filter((entry) => entry.id !== item.id)].slice(0, 20);
    saveJSON(SCRIPT_KEY, history);
  }

  function scriptFormView() {
    const form = scriptForm;
    const lunarYear = String(form.lunarYear);
    const leapMonth = Lunar ? Lunar.leapMonthOf(lunarYear) : 0;
    const canLeap = leapMonth === Number(form.lunarMonth);
    const history = scriptHistory();
    return `${header("script")}
      <div class="shell-wide">
        <section class="page-head">
          <div><span class="eyebrow">剧本人生 · 文化叙事</span><h1>看一份自己的剧本</h1><p class="page-lede">输入出生信息，读一份文化叙事剧本。不是命理判断，也不是对未来的预测。</p></div>
          <a class="back-link" href="#/home">回到首页 →</a>
        </section>
        <form class="form-card" id="scriptForm">
          <div class="field">
            <div class="label-row"><span class="field-label">出生日期</span><span class="seg"><button type="button" class="${form.calendar === "solar" ? "is-active" : ""}" data-calendar="solar">公历</button><button type="button" class="${form.calendar === "lunar" ? "is-active" : ""}" data-calendar="lunar">农历</button></span></div>
            ${form.calendar === "solar"
              ? `<input type="date" name="birthDate" value="${esc(form.birthDate)}" min="1940-01-01" max="2100-12-31">`
              : `<div class="lunar-row">
                  <select name="lunarYear">${LUNAR_YEARS.map((year) => `<option value="${year}" ${year === lunarYear ? "selected" : ""}>${year} 年</option>`).join("")}</select>
                  <select name="lunarMonth">${LUNAR_MONTHS.map((month, index) => `<option value="${index + 1}" ${Number(form.lunarMonth) === index + 1 ? "selected" : ""}>${month}</option>`).join("")}</select>
                  <select name="lunarDay">${LUNAR_DAYS.map((day, index) => `<option value="${index + 1}" ${Number(form.lunarDay) === index + 1 ? "selected" : ""}>${index + 1}日</option>`).join("")}</select>
                </div>
                ${canLeap ? `<div class="leap-row"><span>闰${LUNAR_MONTHS[Number(form.lunarMonth) - 1]}</span><button type="button" class="pill-toggle ${form.lunarLeap ? "is-on" : ""}" data-leap><span class="pill-dot"></span>${form.lunarLeap ? "已选" : "不选"}</button></div>` : ""}`
            }
          </div>
          <div class="form-grid">
            <div class="field">
              <div class="label-row"><span class="field-label">出生时间</span><button type="button" class="pill-toggle ${form.timeUnknown ? "is-on" : ""}" data-time-unknown><span class="pill-dot"></span>${form.timeUnknown ? "已选不清楚" : "不清楚"}</button></div>
              ${form.timeUnknown ? `<input type="text" value="按三柱处理，不显示时柱" disabled>` : `<input type="time" name="birthTime" value="${esc(form.birthTime)}">`}
            </div>
            <div class="field"><label class="field-label" for="birthPlace">出生地 <span class="optional">选填</span></label><input id="birthPlace" name="birthPlace" value="${esc(form.birthPlace)}" placeholder="例如：湖南益阳"></div>
            <div class="field"><label class="field-label" for="gender">性别 <span class="optional">选填</span></label><select id="gender" name="gender"><option value="female" ${form.gender === "female" ? "selected" : ""}>女</option><option value="male" ${form.gender === "male" ? "selected" : ""}>男</option><option value="none" ${form.gender === "none" ? "selected" : ""}>不填</option></select></div>
          </div>
          <div class="field full">
            <div class="label-row"><span class="field-label">你有一个后悔的选择吗？ <span class="optional">选填</span></span><button type="button" class="pill-toggle ${form.hasChoice ? "is-on" : ""}" data-choice-toggle><span class="pill-dot"></span>${form.hasChoice ? "填写" : "不填"}</button></div>
            ${form.hasChoice ? `<div class="form-grid">
              <div class="field"><label class="field-label">主题</label><select name="choiceTheme">${CHOICE_THEMES.map((theme) => `<option ${form.choiceTheme === theme ? "selected" : ""}>${theme}</option>`).join("")}</select></div>
              <div class="field"><label class="field-label">阶段</label><select name="choiceStage">${CHOICE_STAGES.map((stage) => `<option ${form.choiceStage === stage ? "selected" : ""}>${stage}</option>`).join("")}</select></div>
              <div class="field full"><label class="field-label">当时你选了什么？</label><textarea name="choiceText" maxlength="120" placeholder="一句话即可">${esc(form.choiceText)}</textarea></div>
              <div class="field full"><label class="field-label">你放弃了什么？ <span class="optional">可不填</span></label><textarea name="choiceGivenUp" maxlength="120">${esc(form.choiceGivenUp)}</textarea></div>
            </div>` : ""}
          </div>
          <button class="btn btn-primary btn-block form-submit" type="submit">生成我的剧本 ✦</button>
          <span class="form-note">支持公历 / 农历、闰月；按出生地城市经度 + 均时差校正。未做流年。出生信息只保存在本机。</span>
        </form>
        ${history.length ? `<div class="history"><span class="eyebrow">最近生成</span><div class="history-list">${history.map((item) => `<button class="history-row" data-script-history="${esc(item.id)}"><span class="history-main"><span class="history-name">${esc(item.script ? item.script.title : "一份剧本")}</span><span class="history-meta">${esc(item.chart ? item.chart.dayMasterLabel : "")}日主 · ${esc(item.birthDate || "")} · ${esc(formatDate(item.date))}</span></span><span class="history-emotion">→</span></button>`).join("")}</div></div>` : ""}
        <span class="disclaimer">文化叙事视角，不是预测，不构成医疗、投资、婚恋或职业建议。</span>
      </div>
      ${footer()}`;
  }

  function readScriptForm() {
    const form = document.getElementById("scriptForm");
    if (!form) return false;
    const data = new FormData(form);
    for (const key of ["birthDate", "birthTime", "birthPlace", "gender", "lunarYear", "lunarMonth", "lunarDay", "choiceTheme", "choiceStage", "choiceText", "choiceGivenUp"]) {
      if (data.has(key)) scriptForm[key] = data.get(key);
    }
    return true;
  }

  function bindScriptForm() {
    const form = document.getElementById("scriptForm");
    if (!form) return;
    form.querySelectorAll("[data-calendar]").forEach((button) => button.addEventListener("click", () => {
      readScriptForm();
      scriptForm.calendar = button.dataset.calendar;
      saveForm();
      renderRoute();
    }));
    form.querySelectorAll("input, select, textarea").forEach((input) => input.addEventListener("change", () => { readScriptForm(); saveForm(); }));
    const unknown = form.querySelector("[data-time-unknown]");
    if (unknown) unknown.addEventListener("click", () => { readScriptForm(); scriptForm.timeUnknown = !scriptForm.timeUnknown; saveForm(); renderRoute(); });
    const leap = form.querySelector("[data-leap]");
    if (leap) leap.addEventListener("click", () => { readScriptForm(); scriptForm.lunarLeap = !scriptForm.lunarLeap; saveForm(); renderRoute(); });
    const choice = form.querySelector("[data-choice-toggle]");
    if (choice) choice.addEventListener("click", () => { readScriptForm(); scriptForm.hasChoice = !scriptForm.hasChoice; saveForm(); renderRoute(); });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      readScriptForm();
      saveForm();
      generateScript();
    });
    document.querySelectorAll("[data-script-history]").forEach((button) => button.addEventListener("click", () => {
      const item = scriptHistory().find((entry) => entry.id === button.dataset.scriptHistory);
      if (item) { scriptResult = item; renderScriptResult(); }
    }));
  }

  function generateScript() {
    const form = scriptForm;
    let birthDate = String(form.birthDate || "").trim();
    let calendarNote = "";
    if (form.calendar === "lunar") {
      const solar = Lunar.lunarToSolar(Number(form.lunarYear), Number(form.lunarMonth), Number(form.lunarDay), Boolean(form.lunarLeap));
      if (!solar) { toast("这个农历日期不存在，换一个日期再试"); return; }
      birthDate = `${solar.year}-${pad(solar.month)}-${pad(solar.day)}`;
      calendarNote = `农历 ${form.lunarYear} 年${form.lunarLeap ? "闰" : ""}${LUNAR_MONTHS[Number(form.lunarMonth) - 1]}${form.lunarDay}日 → 公历 ${birthDate}`;
    }
    if (!birthDate) { toast("先选一个出生日期"); return; }
    const longitude = Cities ? Cities.findLongitude(form.birthPlace) : null;
    const bazi = Bazi.computeBazi(birthDate, form.timeUnknown ? "12:00" : form.birthTime, { longitude, gender: form.gender });
    if (!bazi) { toast("这个日期排不出来，换一个日期再试"); return; }
    const countKeys = Object.keys(bazi.counts);
    const chart = {
      pillars: form.timeUnknown ? bazi.pillars.slice(0, 3) : bazi.pillars,
      counts: countKeys.map((key) => ({ key, label: Bazi.ELEMENT_LABELS[key] || key, value: bazi.counts[key] })),
      dayMaster: bazi.dayMaster,
      dayMasterStem: bazi.dayMasterStem,
      dayMasterLabel: Bazi.ELEMENT_LABELS[bazi.dayMaster] || "",
      dominantLabel: Bazi.ELEMENT_LABELS[bazi.dominant] || "",
      weakestLabel: Bazi.ELEMENT_LABELS[bazi.weakest] || "",
      monthJie: bazi.monthJie,
      methodLabel: bazi.methodLabel,
      trueSolarTime: bazi.trueSolarTime,
      solarCorrection: bazi.solarCorrection,
      dayun: form.timeUnknown ? null : bazi.dayun,
      timeUnknown: form.timeUnknown,
      birthSolar: birthDate,
      calendarNote
    };
    const script = FreeScript.buildFreeScript(bazi, {
      birthDate,
      birthTime: form.timeUnknown ? "" : form.birthTime,
      birthPlace: form.birthPlace,
      gender: form.gender,
      timeUnknown: form.timeUnknown
    });
    const choicePreview = form.hasChoice ? ChoicePreview.buildChoicePreview(script, form.choiceTheme, CHOICE_STAGES.indexOf(form.choiceStage)) : null;
    const item = {
      id: `script-${Date.now()}`,
      date: new Date().toISOString(),
      birthDate,
      calendar: form.calendar,
      birthTime: form.timeUnknown ? "" : form.birthTime,
      birthPlace: form.birthPlace,
      gender: form.gender,
      timeUnknown: form.timeUnknown,
      chart,
      script,
      choicePreview
    };
    scriptResult = item;
    saveScriptHistory(item);
    renderScriptResult();
  }

  function scriptResultView(item) {
    const { chart, script, choicePreview } = item;
    return `${header("script")}
      <div class="shell-wide">
        <div class="page-head"><div><span class="eyebrow">你的剧本 · 文化叙事</span><h1 class="script-headline">${esc(script.title)}</h1><p class="script-prologue">${esc(script.prologue)}</p><span class="script-chart-line">${esc(script.chartLine)}</span></div><button class="back-link" data-edit-script>重新输入 →</button></div>
        <div class="section">
          <span class="eyebrow">命盘摘要</span><h2 class="section-title">四柱与五行</h2>
          <div class="chart-grid ${chart.timeUnknown ? "is-three" : ""}">${chart.pillars.map((pillar) => `<div class="chart-pillar"><span class="chart-pillar-label">${esc(pillar.label)}</span><span class="chart-pillar-value">${esc(pillar.value)}</span></div>`).join("")}</div>
          ${chart.timeUnknown ? `<span class="small-note">出生时间不清楚，只显示三柱。</span>` : ""}
          <div class="elements">${chart.counts.map((item2) => `<span class="element-pill">${esc(item2.label)} <strong>${esc(item2.value)}</strong></span>`).join("")}</div>
          <span class="chart-meta">${esc(chart.methodLabel)} · ${esc(chart.monthJie)} · ${esc(chart.dayMasterStem)}日主</span>
          ${chart.calendarNote ? `<span class="chart-meta">${esc(chart.calendarNote)}</span>` : ""}
          <span class="chart-meta">真太阳时：${esc(chart.trueSolarTime)}。${chart.solarCorrection ? `已校正 ${esc(chart.solarCorrection.minutes)} 分钟` : "未识别出生地城市，按北京时间"}</span>
        </div>
        ${chart.dayun ? `<div class="section"><span class="eyebrow">大运 · 简化</span><h2 class="section-title">${esc(chart.dayun.direction)} · ${esc(chart.dayun.startText)}</h2><div class="chart-grid">${chart.dayun.cycles.map((cycle) => `<div class="chart-pillar"><span class="chart-pillar-label">${esc(cycle.label)}</span><span class="chart-pillar-value">${esc(cycle.ganZhi)}</span></div>`).join("")}</div><span class="small-note">按三天折一年估算起运，未做流年；只作文化叙事。</span></div>` : ""}
        <div class="section">
          <span class="eyebrow">剧本</span>
          ${script.acts.map((act) => `<div class="act"><span class="act-label">${esc(act.label)}</span><span class="act-text">${esc(act.text)}</span></div>`).join("")}
          <div class="choice-block"><span class="act-label">不由星辰决定的一幕</span><span class="act-text">${esc(script.choiceAct)}</span></div>
          <span class="script-closing">${esc(script.closing)}</span>
          <span class="disclaimer">${esc(script.disclaimer)}</span>
        </div>
        ${choicePreview ? `<div class="section"><span class="eyebrow">选择改写 · 本地预览</span><h2 class="section-title">另一条路，会不一样，但不一定更好</h2><span class="small-note">${esc(choicePreview.theme)} · ${esc(choicePreview.stage)} · 本地规则预览</span><div class="ab-block"><span class="ab-label">A · 原来这条路</span><span class="ab-text">${esc(choicePreview.original.text)}</span></div><div class="ab-block is-alt"><span class="ab-label">B · 另一条路</span><span class="ab-text">${esc(choicePreview.diff.sections[0].text)}</span></div><div class="diff-box"><span class="diff-title">得到的 / 失去的 / 没有变的</span><div class="diff-row"><span>得到</span><span>${esc(choicePreview.diff.summary.gained.join("、"))}</span></div><div class="diff-row"><span>失去</span><span>${esc(choicePreview.diff.summary.lost.join("、"))}</span></div><div class="diff-row"><span>没有变</span><span>${esc(choicePreview.diff.summary.unchanged.join("、"))}</span></div></div></div>` : ""}
        <div class="section script-ai">
          <span class="eyebrow">可选增强 · 网页端</span><h2 class="section-title">生成一份更具体的版本</h2>
          <span class="ai-copy">网页端暂未接入 DeepSeek；点击后使用本地兜底文案。不会上传出生信息。</span>
          <div class="script-actions"><button class="btn btn-primary" data-ai>生成增强版（本地）</button><button class="btn btn-ghost" data-copy-script>复制剧本</button></div>
          <div id="aiArea"></div>
        </div>
        <div class="bottom-links"><a href="#/home">回到首页</a><span>·</span><a href="#/privacy">隐私说明</a></div>
      </div>
      ${footer()}`;
  }

  function renderScriptResult() {
    if (!scriptResult) { renderRoute(); return; }
    document.title = `${scriptResult.script.title} · 此生之外`;
    app.innerHTML = scriptResultView(scriptResult);
    document.querySelector("[data-edit-script]").addEventListener("click", () => { scriptResult = null; renderRoute(); });
    document.querySelector("[data-ai]").addEventListener("click", applyLocalAI);
    document.querySelector("[data-copy-script]").addEventListener("click", () => {
      const s = scriptResult.script;
      const text = [s.title, s.prologue, ...s.acts.map((a) => `${a.label}：${a.text}`), s.choiceAct, s.closing, s.disclaimer].join("\n");
      navigator.clipboard && navigator.clipboard.writeText(text).then(() => toast("已复制")).catch(() => toast("浏览器不支持复制"));
    });
    window.scrollTo(0, 0);
  }

  function applyLocalAI() {
    if (!scriptResult) return;
    const s = scriptResult.script;
    const preview = scriptResult.choicePreview;
    const acts = preview ? preview.alternate.acts : s.acts;
    const aiScript = {
      title: `${s.title} · 本地版`,
      prologue: s.prologue,
      acts,
      choiceAct: preview ? preview.alternate.choiceAct : s.choiceAct,
      closing: preview ? preview.alternate.closing : s.closing
    };
    const area = document.getElementById("aiArea");
    if (!area) return;
    area.innerHTML = `<div class="ai-result"><span class="ai-kicker">本地增强版</span><h2 class="section-title">${esc(aiScript.title)}</h2><div class="ai-fallback">网页端没有接入 AI，先用本地兜底文案。你仍然可以继续读免费剧本。</div>${aiScript.acts.map((act) => `<div class="act"><span class="act-label">${esc(act.label)}</span><span class="act-text">${esc(act.text)}</span></div>`).join("")}<div class="choice-block"><span class="act-label">不由星辰决定的一幕</span><span class="act-text">${esc(aiScript.choiceAct)}</span></div><span class="script-closing">${esc(aiScript.closing)}</span></div>`;
    toast("已使用本地兜底文案");
  }

  function legalPage(kind) {
    const agreement = kind === "agreement";
    const sections = agreement ? [
      ["01", "服务说明", "「此生之外」提供虚构人物故事、文化叙事剧本、情绪自评和可选的本地增强。所有人物、事件、金额、命盘摘要与剧本均为虚构或文化叙事，不是对现实个人或未来的预测。"],
      ["02", "不构成专业建议", "本服务不构成医疗、心理、法律、投资、婚恋、职业或其他专业建议。不要依据本服务做出重大现实决定。如你正在经历心理危机，请优先联系身边可信任的人、当地急救或专业机构。"],
      ["03", "使用条件", "你需要年满 18 周岁，或在监护人指导下使用。你应具备独立判断能力，并自行承担使用本服务产生的选择与后果。"],
      ["04", "你填写的信息", "盲盒阅读不需要填写个人信息。剧本人生会请你填写出生日期、时间、地点和性别，用于本地排盘与剧本生成；这些信息默认只保存在浏览器本机。"],
      ["05", "本地增强", "网页端暂未接入外部 AI。点击增强版时只使用本地兜底文案，不会上传出生日期、地点或选择原句。"],
      ["06", "禁止行为", "不得利用本服务从事违法活动、骚扰他人、冒充他人、批量抓取内容、反向工程、绕过限制，或将本服务内容用于虚假宣传、医疗诊断、投资承诺等场景。"],
      ["07", "内容与知识产权", "小程序和网页内的文本、视觉、结构、人物卡与剧本内容归开发者或相应权利人所有。你可以为个人阅读和分享保存图卡，但不得批量复制、出售或用于商业培训。"],
      ["08", "免责声明", "本服务按现状提供。开发者不为内容的完整性、准确性、适用性作保证，也不对因使用本服务产生的间接损失承担责任。"],
      ["09", "变更与联系", "协议可能随功能更新而调整，更新后会在本页标注日期。继续使用即表示接受更新后的协议。"]
    ] : [
      ["01", "保存哪些信息", "盲盒记录、情绪自评、剧本出生信息（日期、时间、地点、性别）、命盘摘要和剧本正文。出生信息只在你使用剧本时保存。"],
      ["02", "保存在哪里", "以上内容只保存在当前浏览器的 localStorage 中。网页端没有账号系统，不会把这些内容上传到服务器。"],
      ["03", "为什么保存", "用于恢复最近阅读、再次打开剧本、显示本机阅读条数和判断内容体验。"],
      ["04", "保存多久、怎么删除", "保存在本机，直到你清除浏览器站点数据或手动清除本地记录。清除后无法恢复。"],
      ["05", "分享带走什么", "只有你主动点击分享或保存图卡时，才会生成包含人物姓名、生卒年、出生地、六维信息或故事的文本/图片。"],
      ["06", "未成年人", "建议 18 周岁以上使用；未满 18 周岁需在监护人指导下使用。所有人物、故事和六维信息均为虚构叙事，不是真实统计，也不是预测。"],
      ["07", "外部服务", "网页端当前没有接入 DeepSeek 或其他外部 AI；如果后续接入，会在使用前单独说明并征得同意。"],
      ["08", "联系与更新", "如果这份说明有更新，会在本页更新日期。"]
    ];
    const title = agreement ? "用户协议" : "隐私说明";
    document.title = `${title} · 此生之外`;
    return `${header("legal")}
      <div class="shell legal">
        <span class="eyebrow">${agreement ? "用户协议 · 使用前请阅读" : "隐私说明 · 本机数据"}</span>
        <h1 class="legal-title">${agreement ? "这是一份虚构叙事工具，不是预测，也不是心理治疗。" : "你读过的人生，先属于你自己。"}</h1>
        <span class="legal-updated">最后更新：2026-11-16</span>
        ${sections.map(([index, heading, text]) => `<section class="legal-section"><span class="legal-index">${index}</span><span class="legal-heading">${heading}</span><span class="legal-text">${text}</span></section>`).join("")}
        <div class="legal-foot"><a href="#/home">回到首页</a><span>·</span><a href="${agreement ? "#/privacy" : "#/agreement"}">${agreement ? "隐私说明" : "用户协议"}</a></div>
      </div>
      ${footer()}`;
  }

  function showLogin() {
    const old = document.getElementById("loginOverlay");
    if (old) old.remove();
    const overlay = document.createElement("div");
    overlay.id = "loginOverlay";
    overlay.className = "login-overlay";
    overlay.innerHTML = `<div class="login-panel" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
      <button class="login-close" type="button" aria-label="关闭">×</button>
      <span class="cin-label">登录</span>
      <h2 id="loginTitle">微信扫码登录</h2>
      <p>登录用于识别你的微信身份。当前不做云备份，阅读记录仍只保存在本机。</p>
      <div class="login-qr-placeholder"><span>微信扫码登录</span><small>小程序登录桥接入后在此显示二维码</small></div>
      <button class="btn btn-ghost login-later" type="button">先不登录，继续阅读</button>
    </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
    overlay.querySelector(".login-close").addEventListener("click", close);
    overlay.querySelector(".login-later").addEventListener("click", close);
    document.addEventListener("keydown", function onKey(event) {
      if (event.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
    });
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-login]")) showLogin();
  });

  function renderRoute() {
    const route = (location.hash || "#/home").replace(/^#\/?/, "").split("?")[0] || "home";
    if (route === "blind") {
      if (currentLife && location.hash.includes("life")) { renderBlindLife(currentLife); return; }
      app.innerHTML = blindPage();
      document.querySelectorAll("[data-draw]").forEach((button) => button.addEventListener("click", drawLife));
      document.querySelectorAll("[data-history]").forEach((button) => button.addEventListener("click", () => {
        const item = blindStore().history.find((entry) => entry.id === button.dataset.history);
        const life = LIVES.find((entry) => entry.id === button.dataset.history);
        if (life) renderBlindLife(life, item && item.emotion);
      }));
    } else if (route === "script") {
      if (scriptResult) { renderScriptResult(); return; }
      app.innerHTML = scriptFormView();
      bindScriptForm();
    } else if (route === "agreement") {
      app.innerHTML = legalPage("agreement");
    } else if (route === "privacy") {
      app.innerHTML = legalPage("privacy");
    } else {
      app.innerHTML = homePage();
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", () => { currentLife = null; scriptResult = null; renderRoute(); });
  renderRoute();
})();
