(() => {
  "use strict";

  const STORE_KEY = "parallel-life-prototype-v1";
  const DEFAULT_PROFILE = {
    name: "",
    direction: "",
    confusion: "",
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    gender: "",
    email: "",
    signedIn: false
  };

  const BAZI_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const BAZI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const BAZI_ELEMENT_LABELS = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
  const BAZI_STEM_ELEMENTS = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
  const BAZI_BRANCH_ELEMENTS = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];


  const app = document.getElementById("app");
  const modal = document.getElementById("modal");
  const modalPanel = document.getElementById("modalPanel");
  const modalContent = document.getElementById("modalContent");
  const loader = document.getElementById("loader");
  const toastEl = document.getElementById("toast");

  let lastFocused = null;
  let toastTimer = null;
  let loaderTimer = null;
  let currentRoute = "";
  let isGenerating = false;
  let isEntering = false;
  let openingBlindBox = false;
  let pendingRoute = null;

  const state = loadState();

  init();

  function init() {
    if (!location.hash) {
      history.replaceState(null, "", "#/");
    }
    if (state.current.blind && state.current.blind.lifeFormat !== "complete-v1") {
      state.current.blind = null;
      state.saved = state.saved.filter((item) => item.kind !== "blind" || Boolean(item.snapshot && item.snapshot.lifeFormat === "complete-v1"));
      saveState();
    }
    if (state.current.script && !state.current.script.settings) {
      state.current.script = null;
      state.saved = state.saved.filter((item) => item.kind !== "script" || Boolean(item.snapshot && item.snapshot.settings));
      saveState();
    }
    if (state.current.prediction && !state.current.prediction.bazi) {
      state.current.prediction = null;
      state.saved = state.saved.filter((item) => item.kind !== "predict" || Boolean(item.snapshot && item.snapshot.bazi));
      saveState();
    }
    if (state.current.prediction && state.current.prediction.nodeProvided == null) {
      state.current.prediction.nodeProvided = Boolean(state.current.prediction.rawNode);
      saveState();
    }
    bindGlobalEvents();
    renderRoute({ scroll: true });
  }

  function defaultState() {
    return {
      user: { ...DEFAULT_PROFILE },
      current: { script: null, prediction: null, blind: null },
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
      likedStories: {},
      collectedStories: {},
      seen: {},
      blindReadLives: {},
      blindSsr: {},
      lastBlind: null,
      lastStory: null,
      visitorSetup: false,
      visits: 0
    };
  }

  function loadState() {
    const base = defaultState();
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      return {
        ...base,
        ...parsed,
        user: { ...DEFAULT_PROFILE, ...(parsed.user || {}) },
        current: { ...base.current, ...(parsed.current || {}) },
        saved: Array.isArray(parsed.saved) ? parsed.saved.slice(0, 12) : [],
        scriptDraft: { ...base.scriptDraft, ...(parsed.scriptDraft || {}) },
        likedStories: parsed.likedStories || {},
        collectedStories: parsed.collectedStories || {},
        blindReadLives: parsed.blindReadLives || {},
        blindSsr: parsed.blindSsr || {},
        seen: parsed.seen || {}
      };
    } catch (error) {
      return base;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (error) {
      // 本地存储不可用时，当前会话仍然可以继续。
    }
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function hashString(value) {
    let hash = 2166136261;
    const string = String(value || "");
    for (let index = 0; index < string.length; index += 1) {
      hash ^= string.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  function displayName() {
    return state.user.name.trim() || "访客";
  }

  function initialOf(name) {
    const value = (name || "").trim();
    return value ? value.slice(0, 1) : "✦";
  }

  function totalLikes() {
    return Object.values(state.likedStories).filter(Boolean).length;
  }

  function savedCount() {
    return state.saved.length;
  }

  function seenModeCount() {
    return Object.keys(state.seen).filter((key) => ["script", "predict", "blind"].includes(key) && state.seen[key]).length;
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2600);
  }

  function navigate(hash, options = {}) {
    if (location.hash === hash) {
      renderRoute({ scroll: options.scroll !== false });
      return;
    }
    location.hash = hash;
  }

  function parseRoute() {
    const raw = (location.hash || "#/").replace(/^#\/?/, "");
    if (!raw) return { view: "home" };
    const parts = raw.split("/").filter(Boolean);
    return { view: parts[0] || "home", id: parts[1] || "" };
  }

  function renderRoute(options = {}) {
    const route = parseRoute();
    const routeKey = `${route.view}/${route.id}`;
    const shouldScroll = options.scroll !== false || routeKey !== currentRoute;
    currentRoute = routeKey;

    closeModal({ silent: true });

    if (route.view === "home") {
      document.title = "平行人生 · 如果人生可以自己写";
      app.innerHTML = renderHome();
    } else if (route.view === "script") {
      document.title = "剧本人生 · 平行人生";
      state.seen.script = true;
      saveState();
      app.innerHTML = state.current.script ? renderScriptReport(state.current.script) : renderScriptSetup();
    } else if (route.view === "predict") {
      document.title = "推演人生 · 平行人生";
      state.seen.predict = true;
      saveState();
      app.innerHTML = state.current.prediction ? renderPredictionReport(state.current.prediction) : renderPredictSetup();
    } else if (route.view === "blind") {
      document.title = "盲盒人生 · 平行人生";
      state.seen.blind = true;
      saveState();
      app.innerHTML = state.current.blind ? renderBlindReport(state.current.blind) : renderBlindSetup();
    } else if (route.view === "privacy") {
      document.title = "隐私说明 · 平行人生";
      app.innerHTML = renderPrivacyPage();
    } else {
      history.replaceState(null, "", "#/");
      document.title = "平行人生 · 如果人生可以自己写";
      app.innerHTML = renderHome();
    }

    if (shouldScroll) {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    }
    requestAnimationFrame(updateReadingProgress);
  }

  function renderHome() {
    const directionLine = state.user.direction
      ? `你正在探索：${esc(state.user.direction)}`
      : "六个正在发生的人生转折，也许其中一个会让你想起自己";

    return `
      <div class="page page-home">
        <main class="home-main home-main-wide">
          <section class="home-stage" id="homeStage" data-active="script" aria-labelledby="hero-title">
            <img class="home-stage-image" src="assets/hero-portal.jpg?v=6" alt="一个旅人站在星门前，远处是漂浮的岛屿与旋转的星系" fetchpriority="high">
            <div class="home-stage-wash" aria-hidden="true"></div>
            <div class="home-stage-aura" aria-hidden="true"></div>
            <div class="home-stage-grain" aria-hidden="true"></div>
            <div class="home-stage-inner">
              ${renderSiteHeader()}
              <div class="stage-main">
                <div class="stage-copy">
                  <p class="hero-eyebrow"><span class="eyebrow-dash"></span>旁观者模式 · 平行人生</p>
                  <h1 id="hero-title">如果人生可以 <em>自己写</em>，<br><span class="hero-title-line">你想过怎么样的一生？</span></h1>
                  <p class="stage-lede">在无数条没有走过的路里，借一段人生，去看看另一个自己。</p>
                </div>
              </div>

              <div class="gateway-block">
                <p class="gateway-compliance">人生为随机生成的故事片段，仅供娱乐参考，不构成现实预测、医疗、投资或决策建议。</p>
                <div class="life-gates" id="lifeGates">
                  ${Object.values(MODE_META).map(renderLifeGate).join("")}
                </div>
              </div>

              <div class="stage-foot">
                <span class="stage-scroll"><i aria-hidden="true"></i> 向下，看平行人生正在发生</span>
                <span class="stage-coordinate">无尽平行人生</span>
              </div>
            </div>
          </section>

          <div class="home-lower">
            <section class="community-section" aria-labelledby="community-title">
              <div class="section-heading community-heading">
                <div>
                  <p class="eyebrow">此刻正在发生</p>
                  <h2 id="community-title">平行人生正在发生</h2>
                </div>
                <p class="section-note">${esc(directionLine)}。读一段别人的转折，也许会看见自己。</p>
              </div>
              <div class="story-grid">
                ${COMMUNITY_STORIES.map(renderStoryCard).join("")}
              </div>
            </section>

            <section class="home-closing" aria-label="平行人生">
              <span class="closing-star" aria-hidden="true">✦</span>
              <p>人生不提供标准答案，<br>只提供另一种可能。</p>
              <span class="closing-en">平行人生探索</span>
            </section>
          </div>
        </main>
        ${renderFooter()}
      </div>
    `;
  }

  function renderLifeGate(mode) {
    return `
      <a class="life-gate life-gate-${mode.id}" href="#/${mode.id}" data-gate="${mode.id}" data-hint="${esc(mode.hint)}" aria-label="进入${mode.name}">
        <img class="gate-image" src="${mode.cover}" alt="">
        <span class="gate-tint" aria-hidden="true"></span>
        <span class="gate-top">
          <span class="gate-index">${mode.index}</span>
          <span class="gate-kicker">${mode.kicker}</span>
        </span>
        <span class="gate-body">
          <strong>${mode.name}</strong>
          <small>${mode.observe}</small>
        </span>
        <span class="gate-enter"><i aria-hidden="true">↗</i> 进入这段人生</span>
        <span class="gate-beam" aria-hidden="true"></span>
      </a>
    `;
  }

  function renderSiteHeader() {
    const name = state.user.name.trim();
    return `
      <header class="site-header">
        <a class="brand" href="#/" aria-label="平行人生首页">
          <span class="brand-mark" aria-hidden="true"><i></i></span>
          <span class="brand-copy">
            <strong>平行人生</strong>
          </span>
        </a>
        <button class="profile-trigger" type="button" data-action="open-profile" aria-label="打开你的星图">
          <span class="profile-avatar">${esc(initialOf(name))}</span>
          <span class="profile-copy">
            <b>${esc(name || "访客")}</b>
            <small>${state.user.signedIn ? "已登录" : "未登录"}</small>
          </span>
        </button>
      </header>
    `;
  }

  function renderModeCard(mode) {
    return `
      <a class="mode-card mode-card-${mode.id}" href="#/${mode.id}" aria-label="进入${mode.name}">
        <div class="mode-media">
          <img src="${mode.cover}" alt="${mode.name}：${mode.tagline}">
          <span class="mode-index">${mode.index}</span>
          <span class="mode-kicker">${mode.kicker}</span>
        </div>
        <div class="mode-body">
          <div class="mode-heading">
            <div class="mode-title-wrap">
              <span class="mode-cn">${mode.name}</span>
              <span class="mode-en">${mode.en}</span>
            </div>
            <span class="mode-arrow" aria-hidden="true">↗</span>
          </div>
          <p class="mode-description">${mode.description}</p>
          <div class="mode-tags">
            ${mode.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
          <div class="mode-foot"><span>${mode.tagline}</span><span>进入</span></div>
        </div>
      </a>
    `;
  }

  function renderStoryCard(story, index) {
    const liked = Boolean(state.likedStories[story.id]);
    const likes = story.likes + (liked ? 1 : 0);
    return `
      <article class="story-card" tabindex="0" role="button" aria-label="阅读故事：${esc(story.title)}" data-story="${story.id}" style="--story-delay:${index * 55}ms">
        <div class="story-cover">
          <img src="${story.cover}" alt="${esc(story.topic)}故事配图">
          <span class="story-stage">${esc(story.stage)}</span>
          <span class="story-read">阅读全文 <i aria-hidden="true">↗</i></span>
        </div>
        <div class="story-body">
          <p class="story-topic">${esc(story.topic)} <span>·</span> 人生转折</p>
          <h3>${esc(story.title)}</h3>
          <p class="story-excerpt">${esc(story.excerpt)}</p>
          <div class="story-meta">
            <span class="story-author">${esc(story.author)} · ${esc(story.meta)}</span>
            <span class="story-stats"><span class="${liked ? "is-liked" : ""}">♡ ${likes}</span><span>${story.comments} 回应</span></span>
          </div>
        </div>
      </article>
    `;
  }

  function renderFooter() {
    return `
      <footer class="site-footer">
        <div class="footer-brand"><span aria-hidden="true">✦</span> 平行人生</div>
        <p>如果人生可以自己写，你想过怎么样的一生？</p>
        <div class="footer-links">
          <button type="button" data-action="about">关于这个实验</button>
          <span aria-hidden="true">·</span>
          <button type="button" data-action="open-profile">我的星图</button>
          <span aria-hidden="true">·</span>
          <a href="#/privacy">隐私说明</a>
        </div>
        <small>当前为产品原型。所有人生均为虚构叙事，不构成预测或建议。</small>
      </footer>
    `;
  }

  function renderPrivacyPage() {
    return `
      <div class="page page-privacy">
        <main class="flow-shell privacy-page-shell">
          ${renderSiteHeader()}
          <div class="flow-topline">
            <a class="back-link" href="#/"><span aria-hidden="true">←</span> 返回首页</a>
            <span class="flow-mode-label">隐私说明</span>
          </div>

          <article class="privacy-doc">
            <header class="privacy-doc-hero">
              <p class="eyebrow">隐私说明 · 本机数据</p>
              <h1>你的人生记录，<br><span>先属于你自己。</span></h1>
              <p>这份说明解释「平行人生」会保存什么、为什么保存、保存在哪里，以及你可以怎样删除。</p>
              <small>最后更新：2026-11-05</small>
            </header>

            <section class="privacy-doc-section">
              <span class="privacy-doc-index">01</span>
              <h2>我们会保存哪些信息</h2>
              <p>为了让你再次打开时还能看到之前的记录，网页会把以下内容保存在浏览器的本地存储中：</p>
              <div class="privacy-doc-list">
                <div><b>称呼</b><span>你在页面里填写的昵称</span></div>
                <div><b>出生信息</b><span>出生日期、出生时间、出生地、性别；仅在推演人生中使用</span></div>
                <div><b>阅读记录</b><span>你最近读过的人生、抽到人生与暂停注脚</span></div>
                <div><b>抽盒记录</b><span>抽到过哪些人生、打开过哪些 高光章</span></div>
                <div><b>暂停注脚</b><span>你在“暂停片刻”里写下的旁观者想法</span></div>
                <div><b>轻量偏好</b><span>最近抽到的人生、访问过的模式等本地状态</span></div>
              </div>
              <p>我们不会主动收集你的手机号、通讯录、精确位置或相册内容。</p>
            </section>

            <section class="privacy-doc-section">
              <span class="privacy-doc-index">02</span>
              <h2>保存在哪里</h2>
              <p>以上内容只保存在当前浏览器，保存在浏览器本地。</p>
              <p>当前网页版本没有服务器数据库，也不会主动把你的记录上传到开发者服务器或第三方服务。内容生成全部在本地完成。</p>
              <p>网站托管服务可能保留常规访问日志，适用托管平台自身的隐私规则。</p>
            </section>

            <section class="privacy-doc-section">
              <span class="privacy-doc-index">03</span>
              <h2>为什么保存</h2>
              <div class="privacy-doc-list">
                <div><b>恢复记录</b><span>让你再次打开时可以继续看到最近的阅读状态与本机统计</span></div>
                <div><b>个性化</b><span>让剧本、推演和盲盒使用你填写过的称呼与出生信息</span></div>
                <div><b>本机统计</b><span>显示抽到人生、高光章和走过路径</span></div>
              </div>
            </section>

            <section class="privacy-doc-section">
              <span class="privacy-doc-index">04</span>
              <h2>保存多久、怎么删除</h2>
              <p>这些信息会一直保存在浏览器本机，直到你主动删除，或清理浏览器站点数据、更换设备。</p>
              <p>删除方式：</p>
              <div class="privacy-doc-list">
                <div><b>页面内</b><span>「我的星图」→「数据与隐私」→「清除本机数据」</span></div>
                <div><b>浏览器内</b><span>浏览器设置 → 站点数据 / 存储 → 删除本站数据</span></div>
                <div><b>无痕模式</b><span>关闭无痕窗口后，本地记录通常会丢失</span></div>
              </div>
              <p>清除后，抽到人生、高光统计、昵称和暂停注脚都会消失，且无法恢复。</p>
              <div class="privacy-doc-callout"><b>建议</b><span>在清除前，把你真正想留下的人生记录卡截图或复制保存。</span></div>
            </section>

            <section class="privacy-doc-section">
              <span class="privacy-doc-index">05</span>
              <h2>分享会带走什么</h2>
              <p>只有在你主动点击“分享这一生”或“复制这段人生”时，页面才会生成一段人生摘要，其中可能包含人物姓名、生卒年、出生地、人生关键词和一段故事。</p>
              <p>分享由你主动发起，内容会通过浏览器或微信的分享能力发送。我们不会在后台记录你的分享对象或分享次数。</p>
            </section>

            <section class="privacy-doc-section">
              <span class="privacy-doc-index">06</span>
              <h2>关于未成年人与内容</h2>
              <p>如果你未满 18 岁，请在监护人指导下使用本产品。</p>
              <p>「平行人生」中的全部人物、故事、命盘解读和推演均为虚构叙事与文化体验，不构成现实中的命运预测、医疗建议、投资建议、婚恋建议或职业决策依据。</p>
              <p>四柱按北京时间与节气交节时刻排盘，未做真太阳时校正；盲盒人生中的 高光只表示叙事亮度，不代表人生价值或成功程度。</p>
            </section>

            <section class="privacy-doc-section">
              <span class="privacy-doc-index">07</span>
              <h2>联系与更新</h2>
              <p>如果这份说明有更新，我们会在页面内更新“最后更新”日期。当前版本不主动收集可识别你真实身份的联系方式。</p>
              <p>如对数据处理有疑问，可以通过本产品的开发者联系方式联系开发者。</p>
            </section>

            <p class="privacy-doc-foot">平行人生 · 平行人生 · 所有人生均为虚构叙事</p>
          </article>
        </main>
        ${renderFooter()}
      </div>
    `;
  }

  function renderObserverRibbon(label, text, meta = "") {
    return `
      <div class="observer-ribbon">
        <span class="observer-eye is-small" aria-hidden="true"><i></i></span>
        <span class="observer-ribbon-label">${esc(label)}</span>
        <p>${esc(text)}</p>
        ${meta ? `<span class="observer-ribbon-meta">${esc(meta)}</span>` : ""}
      </div>
    `;
  }

  function renderReadingProgress() {
    return `<div class="reading-progress" aria-hidden="true"><span></span></div>`;
  }

  function renderCrossExplore(currentMode) {
    const links = Object.values(MODE_META).filter((mode) => mode.id !== currentMode);
    return `
      <section class="cross-explore" aria-label="继续探索">
        <div class="cross-explore-head">
          <span class="observer-eye is-small" aria-hidden="true"><i></i></span>
          <p class="eyebrow">继续观看</p>
        </div>
        <h2>这个自己，还有别的可能</h2>
        <p>你刚刚看见的，只是其中一条时间线。换一种观看方式，另一个自己还在等你。</p>
        <div class="cross-explore-grid">
          ${links.map((mode) => `
            <button class="cross-mode" type="button" data-action="explore-mode" data-mode="${mode.id}">
              <span class="cross-mode-index">${mode.index}</span>
              <span class="cross-mode-copy"><b>${mode.name}</b><small>${mode.observe}</small></span>
              <span class="cross-mode-arrow" aria-hidden="true">↗</span>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }

  function setActiveGate(gate) {
    const stage = document.getElementById("homeStage");
    const hint = document.getElementById("gatewayHint");
    if (!stage || !gate) return;
    const mode = gate.dataset.gate;
    const meta = MODE_META[mode];
    if (!meta) return;
    stage.dataset.active = mode;
    if (hint) hint.textContent = meta.hint;
  }

  function playLifeTransition(href, gate) {
    if (isEntering) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate(href);
      return;
    }
    const modeId = href.replace(/^#\//, "");
    const meta = MODE_META[modeId];
    if (!meta) {
      navigate(href);
      return;
    }
    isEntering = true;
    document.body.classList.add("is-entering");
    const rect = gate ? gate.getBoundingClientRect() : null;
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height * 0.45 : window.innerHeight / 2;
    const overlay = document.createElement("div");
    overlay.className = "life-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.setProperty("--entry-x", `${x}px`);
    overlay.style.setProperty("--entry-y", `${y}px`);
    overlay.innerHTML = `
      <div class="life-transition-image" style="background-image:url('${meta.cover}')"></div>
      <div class="life-transition-wash"></div>
      <div class="life-transition-copy">
        <span class="observer-eye is-small"><i></i></span>
        <p>正在进入另一段人生</p>
        <h2>${meta.name}</h2>
        <small>${meta.hint}</small>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-active"));
    window.setTimeout(() => {
      navigate(href);
      overlay.classList.add("is-arriving");
    }, 700);
    window.setTimeout(() => {
      overlay.remove();
      document.body.classList.remove("is-entering");
      isEntering = false;
    }, 1300);
  }

  function updateReadingProgress() {
    const bar = document.querySelector(".reading-progress span");
    if (!bar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.transform = `scaleX(${progress})`;
  }

  function renderPageTop(modeName, modeIndex) {
    return `
      ${renderSiteHeader()}
      <div class="flow-topline">
        <a class="back-link" href="#/"><span aria-hidden="true">←</span> 返回首页</a>
        <span class="flow-mode-label">${modeIndex} / ${modeName}</span>
      </div>
    `;
  }

  function renderScriptChoiceGroup(field, label, note, selected, prefix) {
    const options = SCRIPT_OPTIONS[field] || [];
    return `
      <fieldset class="setting-group">
        <legend><span>${esc(label)}</span><small>${esc(note)}</small></legend>
        <div class="option-pills">
          ${options.map((option) => `
            <label class="option-pill">
              <input type="radio" name="${field}" value="${option.id}" id="${prefix}-${field}-${option.id}" ${selected === option.id ? "checked" : ""}>
              <span>${esc(option.label)}${option.note ? `<small>${esc(option.note)}</small>` : ""}</span>
            </label>
          `).join("")}
        </div>
      </fieldset>
    `;
  }

  function renderScriptSettingsFields(settings, prefix) {
    const draft = { ...state.scriptDraft, ...settings };
    const name = draft.name || state.user.name || "";
    return `
      <div class="script-builder">
        <label class="field script-name-field">
          <span class="field-label">怎么称呼你 <em>选填</em></span>
          <input class="text-input" id="${prefix}-name" name="name" type="text" maxlength="24" value="${esc(name)}" placeholder="给这个自己留一个名字">
        </label>

        <div class="script-setting-grid">
          ${renderScriptChoiceGroup("family", "出生家庭", "你从哪里开始", draft.family, prefix)}
          ${renderScriptChoiceGroup("childhood", "童年", "最早的那段时间", draft.childhood, prefix)}
        </div>

        <div class="script-setting-grid">
          ${renderScriptChoiceGroup("career", "事业", "你想靠什么立身", draft.career, prefix)}
          ${renderScriptChoiceGroup("love", "爱情", "你想怎样被爱", draft.love, prefix)}
        </div>

        <div class="script-setting-grid">
          ${renderScriptChoiceGroup("wealth", "财富", "你想怎样与钱相处", draft.wealth, prefix)}
          ${renderScriptChoiceGroup("children", "子女", "要不要成为父母", draft.children, prefix)}
        </div>

        ${renderScriptChoiceGroup("life", "一生", "你想让这一生有什么形状", draft.life, prefix)}

        <label class="field script-custom-life" data-script-custom ${draft.life === "custom" ? "" : "hidden"}>
          <span class="field-label">写下你想要的一生 <em>其他自己写</em></span>
          <textarea class="text-input textarea-input" id="${prefix}-custom-life" name="customLife" rows="3" maxlength="120" placeholder="例如：先去看世界，再回一座小城开一家只属于自己的店。">${esc(draft.customLife || "")}</textarea>
          <span class="field-error" id="${prefix}-custom-life-error" role="alert"></span>
        </label>
      </div>
    `;
  }

  function renderScriptSetup() {
    const draft = { ...state.scriptDraft, name: state.scriptDraft.name || state.user.name || "" };
    return `
      <div class="page page-flow page-script">
        <main class="flow-shell">
          ${renderPageTop("剧本人生", "01")}
          <section class="setup-hero setup-hero-script">
            <div class="setup-hero-copy">
              <p class="eyebrow">剧本人生 · 另一个你</p>
              <h1>在时间之外，<br><span>读另一个你的一生。</span></h1>
              <p class="setup-lede">不需要出生时间。你只需要写下几个初始条件：从什么样的家庭出发，拥有怎样的童年，想把事业、爱情、财富和子女过成什么样子。</p>
              <div class="setup-facts">
                <span>七个初始条件</span>
                <span>完整时间轴</span>
                <span>自由组合</span>
              </div>
            </div>
            <div class="setup-hero-art">
              <img src="assets/mode-script.jpg?v=4" alt="黄昏城市中的年轻人，望向远处的光" fetchpriority="high">
              <div class="setup-quote">“你看见的那个自己，<br>也在看着你。”</div>
            </div>
          </section>

          <section class="setup-form-section script-setup-section" aria-labelledby="script-form-title">
            <div class="form-heading">
              <p class="eyebrow">写下初始条件</p>
              <h2 id="script-form-title">先为这个自己，写下几个初始条件</h2>
              <p>不是出生时间，不是八字。你写下的每一项，都会进入这个人的家庭、性格、关系与后半生。</p>
              <p class="form-heading-note">全部都可以重新组合。选择“随机”或“随缘”时，命运会替你补上空白。</p>
            </div>

            <form class="setup-form script-form" data-form="script" novalidate>
              ${renderScriptSettingsFields(draft, "script")}
              <div class="form-actions script-form-actions">
                <button class="primary-button" type="submit">组合这一生的剧本 <span aria-hidden="true">→</span></button>
                <span class="form-note inline-note"><span aria-hidden="true">✦</span> 你写下的是初始条件，不是结局。</span>
              </div>
            </form>
          </section>
        </main>
        ${renderFooter()}
      </div>
    `;
  }

  function renderDirectionOptions(selected) {
    const options = ["还说不清", "职业与选择", "关系与爱", "城市与远方", "自我与意义", "健康与时间"];
    return options.map((option) => {
      const value = option === "还说不清" ? "" : option;
      return `<option value="${value}" ${selected === value ? "selected" : ""}>${option}</option>`;
    }).join("");
  }

  function renderPredictSetup() {
    return `
      <div class="page page-flow page-predict">
        <main class="flow-shell">
          ${renderPageTop("推演人生", "02")}
          <section class="setup-hero setup-hero-predict">
            <div class="setup-hero-copy">
              <p class="eyebrow">八字排盘 · 妻财子禄寿</p>
              <h1>先看清这一生的底牌，<br><span>再看另一个你如何走。</span></h1>
              <p class="setup-lede">输入出生日期、时间、出生地与性别。我们会排出四柱，读出妻、财、子、禄、寿五个维度，再让你改写其中一个关键节点。</p>
              <div class="bazi-preview" aria-hidden="true">
                <span><small>年柱</small><b>?</b></span>
                <span><small>月柱</small><b>?</b></span>
                <span><small>日柱</small><b>?</b></span>
                <span><small>时柱</small><b>?</b></span>
              </div>
              <div class="setup-facts">
                <span>四柱命盘</span>
                <span>妻财子禄寿</span>
                <span>可改写节点</span>
              </div>
            </div>
            <div class="setup-hero-art">
              <img src="assets/mode-predict.jpg?v=4" alt="夜晚城市中的年轻人，身后是无数亮起的窗" fetchpriority="high">
              <div class="setup-quote">“命盘写的是底牌，<br>怎么打，仍然有你。”</div>
            </div>
          </section>

          <section class="setup-form-section predict-form-section" aria-labelledby="predict-form-title">
            <div class="form-heading">
              <p class="eyebrow">你的出生信息</p>
              <h2 id="predict-form-title">先把这一生的底牌排出来</h2>
              <p>出生信息用于排出四柱。问题和来路可以选填；想改写哪一步，等看完妻财子禄寿之后再决定。</p>
            </div>
            <form class="setup-form predict-form" data-form="predict" novalidate>
              <div class="predict-birth-head">
                <span>出生信息</span>
                <small>用于排出年、月、日、时四柱</small>
              </div>
              <div class="field-grid predict-birth-grid">
                <label class="field">
                  <span class="field-label">出生日期 <em>必填</em></span>
                  <input class="text-input" id="predict-birth-date" name="birthDate" type="date" value="${esc(state.user.birthDate)}">
                </label>
                <label class="field">
                  <span class="field-label">出生时间 <em>必填</em></span>
                  <input class="text-input" id="predict-birth-time" name="birthTime" type="time" value="${esc(state.user.birthTime)}">
                </label>
                <label class="field">
                  <span class="field-label">出生地 <em>必填</em></span>
                  <input class="text-input" id="predict-birth-place" name="birthPlace" type="text" maxlength="40" value="${esc(state.user.birthPlace)}" placeholder="例如：杭州">
                </label>
                <label class="field">
                  <span class="field-label">性别 <em>必填</em></span>
                  <select class="text-input select-input" id="predict-gender" name="gender">
                    <option value="" ${!state.user.gender ? "selected" : ""}>请选择</option>
                    <option value="female" ${state.user.gender === "female" ? "selected" : ""}>女</option>
                    <option value="male" ${state.user.gender === "male" ? "selected" : ""}>男</option>
                    <option value="other" ${state.user.gender === "other" ? "selected" : ""}>其他 / 不便说明</option>
                  </select>
                </label>
                <span class="field-error field-wide" id="predict-birth-error" role="alert"></span>
              </div>

              <label class="field field-full predict-question-field">
                <span class="field-label">你想顺带推演的问题 <em>选填</em></span>
                <textarea class="text-input textarea-input" id="predict-question" name="question" rows="3" maxlength="160" placeholder="例如：这一生，应该把力气放在哪里？">${esc(state.user.confusion)}</textarea>
              </label>

              <div class="field-grid predict-optional-grid">
                <label class="field field-wide">
                  <span class="field-label">你写下的来路 <em>选填 · 用于回看问题</em></span>
                  <textarea class="text-input textarea-input" id="predict-facts" name="facts" rows="4" maxlength="260" placeholder="例如：22 岁毕业留在家乡；27 岁进入现在的行业；31 岁放弃过一次晋升机会。"></textarea>
                </label>
              </div>

              <div class="form-actions">
                <button class="primary-button" type="submit">排出命盘，先看这一生 <span aria-hidden="true">→</span></button>
                <span class="form-note inline-note"><span aria-hidden="true">✦</span> 先看命盘，再决定要不要改写。</span>
              </div>
              <p class="form-note bazi-disclaimer-note"><span aria-hidden="true">✦</span> 按北京时间与节气交节时刻排四柱，未做真太阳时校正；内容用于叙事体验，不构成命理建议。</p>
            </form>
            <aside class="predict-note">
              <span class="predict-note-index">阅读提示</span>
              <p>先读妻财子禄寿，再改一个节点。命盘不是判决书，它只说明你最容易从哪条路走进自己的命运。</p>
            </aside>
          </section>
        </main>
        ${renderFooter()}
      </div>
    `;
  }

  function renderBlindSetup() {
    const previous = state.lastBlind ? BLIND_LIVES.find((item) => item.id === state.lastBlind) : null;
    return `
      <div class="page page-flow page-blind">
        <main class="flow-shell">
          ${renderPageTop("盲盒人生", "03")}
          <section class="blind-stage" aria-labelledby="blind-title">
            <div class="blind-orb-scene" aria-hidden="true">
              <div class="orbit orbit-one"></div>
              <div class="orbit orbit-two"></div>
              <div class="orbit orbit-three"></div>
              <div class="blind-orb"><span>?</span></div>
              <i class="orb-star star-one"></i>
              <i class="orb-star star-two"></i>
              <i class="orb-star star-three"></i>
            </div>
            <div class="blind-stage-copy">
              <p class="eyebrow">盲盒人生 · 一条完整的人生</p>
              <h1 id="blind-title" class="blind-intro-title">盲盒之下，<br><span>是未知的人生碎片。</span></h1>
              <p class="setup-lede">一个盲盒里，是一个人完整的一生。打开它，你会看见这些碎片如何按时间拼成同一条命——没有分支，也没有需要你选择的结局。</p>
              <div class="blind-actions">
                <button class="primary-button" type="button" data-action="draw-blind">抽取一条人生 <span aria-hidden="true">✦</span></button>
                <button class="ghost-button" type="button" data-action="choose-blind">自己挑一条时间线 <span aria-hidden="true">↗</span></button>
              </div>
              ${previous ? `<p class="last-blind-note">上一条人生：${esc(previous.name)} · ${esc(previous.years)}。这次会为你换一个人。</p>` : `<p class="last-blind-note">五条时间线，五个不同年代与处境里的人。抽到谁，就完整旁观谁的一生。</p>`}
            </div>
          </section>
        </main>
        ${renderFooter()}
      </div>
    `;
  }

  function scriptOptionLabel(field, id) {
    const option = (SCRIPT_OPTIONS[field] || []).find((item) => item.id === id);
    return option ? option.label : id;
  }

  function buildScript(input = {}) {
    const draft = { ...state.scriptDraft, ...input };
    const variation = Number(input.variation || 0);
    const seed = hashString([
      draft.family,
      draft.childhood,
      draft.career,
      draft.love,
      draft.wealth,
      draft.children,
      draft.life,
      draft.customLife,
      variation
    ].join("|"));
    const familyChoices = ["elite", "city", "town"];
    const familyWasRandom = draft.family === "random";
    const familyId = familyWasRandom ? familyChoices[seed % familyChoices.length] : draft.family;
    const family = SCRIPT_MODULES.family[familyId] || SCRIPT_MODULES.family.city;
    const childhood = SCRIPT_MODULES.childhood[draft.childhood] || SCRIPT_MODULES.childhood.ordinary;
    const career = SCRIPT_MODULES.career[draft.career] || SCRIPT_MODULES.career.flow;
    const love = SCRIPT_MODULES.love[draft.love] || SCRIPT_MODULES.love.flow;
    const wealth = SCRIPT_MODULES.wealth[draft.wealth] || SCRIPT_MODULES.wealth.flow;
    const children = SCRIPT_MODULES.children[draft.children] || SCRIPT_MODULES.children.flow;
    const life = SCRIPT_MODULES.life[draft.life] || SCRIPT_MODULES.life.roller;
    const customLife = String(draft.customLife || "").trim();
    const name = String(draft.name || state.user.name || "").trim() || "未署名的旅人";
    const familyLabel = familyWasRandom ? `随机 → ${scriptOptionLabel("family", familyId)}` : scriptOptionLabel("family", familyId);
    const childhoodLabel = scriptOptionLabel("childhood", draft.childhood);
    const careerLabel = scriptOptionLabel("career", draft.career);
    const loveLabel = scriptOptionLabel("love", draft.love);
    const wealthLabel = scriptOptionLabel("wealth", draft.wealth);
    const childrenLabel = scriptOptionLabel("children", draft.children);
    const lifeLabel = draft.life === "custom" ? "如你所写" : scriptOptionLabel("life", draft.life);
    const lifeSubtitle = draft.life === "custom" && customLife ? "你自己写下的这一生" : lifeLabel;
    const healthLines = {
      roller: "起落会消耗你，也会让你很早就学会如何恢复。你需要注意的不是某一次生病，而是长期把自己当成不会坏的工具。",
      calm: "规律的生活是你最可靠的资产。你不太会突然透支，但也容易忽略那些需要主动处理的小问题。",
      bitterSweet: "前半程的消耗会在后半程显形。慢下来不是懒，是让身体有机会追上你。",
      sweetBitter: "一次失速会迫使你重新分配体力。你越早接受自己需要休息，后面的路越稳。",
      custom: "身体会替你记录那些没有说出口的压力。你写下的生活方式，最终也要由这副身体来承担。"
    };
    const healthKeywords = {
      roller: "在起伏里恢复",
      calm: "规律是资产",
      bitterSweet: "学会慢下来",
      sweetBitter: "重新分配体力",
      custom: "听见身体"
    };
    const lifeOverview = draft.life === "custom" && customLife
      ? `你为这一生写下的关键词是「${customLife}」。${life.overview}`
      : life.overview;
    const closing = draft.life === "custom" && customLife
      ? `你曾为这一生写下「${customLife}」。${life.closingText}`
      : life.closingText;
    const detailLines = [
      "那一年，你搬过一次家，扔掉了很多不再需要的东西。",
      "那一年，一个很久没有联系的人重新出现，又很快离开。",
      "那一年，你第一次一个人去了很远的地方，回来后很久没有说话。"
    ];
    const timeline = [
      { age: 0, stage: "出生", title: family.birthTitle, text: family.birthText },
      { age: 7, stage: "童年", title: childhood.childTitle, text: childhood.childText },
      { age: 16, stage: "少年", title: childhood.youthTitle, text: childhood.youthText },
      { age: 23, stage: "入世", title: career.firstTitle, text: career.firstText },
      { age: 30, stage: "关系与钱", title: love.firstTitle, text: `${love.firstText} ${wealth.firstText}` },
      { age: 36, stage: "转弯", title: life.turnTitle, text: `${life.turnText} ${career.turnText} ${detailLines[seed % detailLines.length]}` },
      { age: 43, stage: "重建", title: life.rebuildTitle, text: `${life.rebuildText} ${wealth.midText}` },
      { age: 56, stage: "承担", title: children.midTitle, text: `${children.midText} ${family.lateNote}` },
      { age: 68, stage: "放慢", title: wealth.lateTitle, text: `${wealth.lateText} ${childhood.laterNote}` },
      { age: 80, stage: "回望", title: life.closingTitle, text: closing }
    ];
    const settingsChips = [
      { label: "家庭", value: familyLabel },
      { label: "童年", value: childhoodLabel },
      { label: "事业", value: careerLabel },
      { label: "爱情", value: loveLabel },
      { label: "财富", value: wealthLabel },
      { label: "子女", value: childrenLabel },
      { label: "一生", value: draft.life === "custom" && customLife ? `如你所写 · ${customLife}` : lifeLabel }
    ];

    return {
      id: `script-${Date.now()}`,
      mode: "script",
      variation,
      seed,
      name,
      settings: {
        family: draft.family,
        familyResolved: familyId,
        familyWasRandom,
        childhood: draft.childhood,
        career: draft.career,
        love: draft.love,
        wealth: draft.wealth,
        children: draft.children,
        life: draft.life,
        customLife
      },
      settingsChips,
      summary: `${familyLabel} · ${childhoodLabel} · ${lifeLabel}`,
      description: `${careerLabel} · ${loveLabel} · ${wealthLabel} · ${childrenLabel}`,
      generatedAt: new Date().toISOString(),
      title: life.title,
      subtitle: `一个关于${lifeSubtitle}、${careerLabel}与${loveLabel}的人生剧本 · 为${name}展开`,
      arc: life.arc,
      overview: [
        family.overview,
        `${childhood.overview} ${lifeOverview}`
      ],
      timeline,
      dimensions: [
        { name: "事业", keyword: career.keyword, text: career.dimension },
        { name: "爱情", keyword: love.keyword, text: love.dimension },
        { name: "财富", keyword: wealth.keyword, text: `${wealth.dimension} ${family.wealthNote}` },
        { name: "健康", keyword: healthKeywords[draft.life] || healthKeywords.custom, text: `${childhood.health} ${healthLines[draft.life] || healthLines.custom}` },
        { name: "子女", keyword: children.keyword, text: children.dimension }
      ],
      strengths: [
        family.strength,
        childhood.strength,
        career.strength || life.strength
      ].filter(Boolean),
      weaknesses: [
        family.weakness,
        childhood.weakness,
        career.weakness || love.weakness
      ].filter(Boolean),
      keyNodes: [timeline[3], timeline[5], timeline[7]].map((node) => ({
        age: `${node.age}岁`,
        label: node.stage,
        text: node.text.split("。")[0] + "。"
      })),
      opportunities: [career.opportunity, love.opportunity, life.opportunity].filter(Boolean),
      challenges: [family.challenge, career.challenge, life.challenge].filter(Boolean),
      closing,
      currentAge: null,
      saved: false
    };
  }

  function detectScenario(question) {
    const q = String(question || "");
    const rules = [
      { key: "city", words: ["城市", "搬家", "搬走", "北漂", "沪漂", "离开这里", "离开现在", "回老家", "去上海", "去北京", "去深圳", "去杭州", "去成都", "换个地方", "换一座城"] },
      { key: "career", words: ["工作", "辞职", "离职", "大厂", "创业", "晋升", "职业", "转行", "老板", "上班", "offer", "项目"] },
      { key: "love", words: ["结婚", "分手", "恋爱", "感情", "关系", "相亲", "离婚", "伴侣", "喜欢", "在一起", "他", "她"] },
      { key: "family", words: ["父母", "孩子", "家庭", "生育", "养老", "家人", "妈妈", "爸爸", "照顾"] },
      { key: "study", words: ["读书", "考研", "留学", "学校", "专业", "学历", "申请", "考试", "学习"] },
      { key: "self", words: ["意义", "焦虑", "自由", "休息", "gap", "自己", "生活", "迷茫", "空"] }
    ];
    let bestKey = "general";
    let bestScore = 0;
    for (const rule of rules) {
      let score = 0;
      for (const word of rule.words) {
        if (q.toLowerCase().includes(word.toLowerCase())) score += word.length > 1 ? 2 : 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestKey = rule.key;
      }
    }
    return bestKey;
  }

  function extractAge(...values) {
    for (const value of values) {
      const match = String(value || "").match(/(\d{1,2})\s*岁/);
      if (match) {
        const age = Number(match[1]);
        if (age >= 16 && age <= 70) return age;
      }
    }
    return null;
  }

  function cleanNode(value) {
    return String(value || "").replace(/^\s*\d{1,2}\s*岁[，,、:：\s]*/, "").trim();
  }

  function computeBazi(dateValue, timeValue) {
    const core = window.BaziCore && window.BaziCore.computeBazi(dateValue, timeValue);
    if (!core) return null;
    const reading = BAZI_ELEMENT_READINGS[core.dayMaster];
    return {
      ...core,
      summary: reading.summary,
      elementLine: `命局中${BAZI_ELEMENT_LABELS[core.dominant]}气偏旺，${BAZI_ELEMENT_LABELS[core.weakest]}气偏弱。${BAZI_ELEMENT_LACK[core.weakest]}`
    };
  }

  function buildBaziReadings(bazi, birthPlace) {
    if (!bazi) return [];
    const reading = BAZI_ELEMENT_READINGS[bazi.dayMaster];
    const placeLine = birthPlace ? `你出生在${birthPlace}，这份命局会以更具体的地方经验落下来。` : "";
    return [
      { key: "spouse", mark: "妻", title: "伴侣与亲密关系", text: reading.spouse },
      { key: "wealth", mark: "财", title: "财富与资源", text: reading.wealth },
      { key: "children", mark: "子", title: "子女与晚辈", text: reading.children },
      { key: "career", mark: "禄", title: "事业与位置", text: reading.career },
      { key: "longevity", mark: "寿", title: "身体与长寿", text: reading.longevity }
    ].map((item) => ({ ...item, placeLine }));
  }

  function buildQuestionCheck({ question, key, scenario, fiveReadings, facts }) {
    const focusMap = {
      city: { label: "禄与财", keys: ["career", "wealth"] },
      career: { label: "禄与财", keys: ["career", "wealth"] },
      love: { label: "妻与子", keys: ["spouse", "children"] },
      family: { label: "子与寿", keys: ["children", "health"] },
      money: { label: "财与禄", keys: ["wealth", "career"] },
      health: { label: "寿", keys: ["health"] },
      self: { label: "五维", keys: ["spouse", "wealth", "children", "career", "health"] },
      general: { label: "五维", keys: ["spouse", "wealth", "children", "career", "health"] }
    };
    const focus = focusMap[key] || focusMap.general;
    const readings = (fiveReadings || []).filter((reading) => focus.keys.includes(reading.key));
    const echo = readings.slice(0, 2).map((reading) => `${reading.title}：${reading.text}`).join(" ");
    return {
      focus: focus.label,
      echo: echo || "这副命盘的五个侧面里，没有哪一个能单独替你回答这个问题。",
      scriptLine: scenario.baselineIntro,
      reframe: scenario.insight,
      facts: facts || ""
    };
  }

  function buildPrediction(input = {}) {
    const question = (input.question || "").trim() || "这一生，应该把力气放在哪里？";
    const key = detectScenario(question);
    const scenario = PREDICT_SCENARIOS[key] || PREDICT_SCENARIOS.general;
    const age = extractAge(input.change, input.facts) || scenario.defaultAge;
    const rawNode = (input.change || "").trim();
    const nodeProvided = Boolean(rawNode);
    const node = cleanNode(rawNode) || scenario.defaultNode;
    const name = (input.name || state.user.name || "").trim() || "你";
    const facts = (input.facts || "").trim();
    const birthDate = String(input.birthDate || "").trim();
    const birthTime = String(input.birthTime || "").trim();
    const birthPlace = String(input.birthPlace || "").trim();
    const gender = input.gender || state.user.gender || "other";
    const genderLabel = BAZI_GENDER_LABEL[gender] || BAZI_GENDER_LABEL.other;
    const bazi = computeBazi(birthDate, birthTime);
    const birthSummary = [birthPlace, birthDate.replaceAll("-", "."), birthTime, genderLabel].filter(Boolean).join(" · ");
    const fiveReadings = buildBaziReadings(bazi, birthPlace);
    const genderNote = {
      female: "坤造。传统排盘以官星论关系、以食伤论子女；这里只借它的结构看你的选择，不替你定义角色。",
      male: "乾造。传统排盘以财星论伴侣与资源；这里只借它的结构看你的选择，不替你定义角色。",
      other: "命主。性别不是这份推演的边界，五维仍从同一副命盘展开。"
    }[gender] || "命主。性别不是这份推演的边界，五维仍从同一副命盘展开。";
    const questionProvided = Boolean((input.question || "").trim());
    const questionCheck = questionProvided
      ? buildQuestionCheck({ question, key, scenario, fiveReadings, facts })
      : null;

    return {
      id: `predict-${Date.now()}`,
      mode: "predict",
      name,
      question,
      questionProvided,
      facts,
      node,
      rawNode,
      nodeProvided,
      previousNode: null,
      previousAge: null,
      age,
      category: scenario.label,
      scenarioKey: key,
      birthDate,
      birthTime,
      birthPlace,
      gender,
      genderLabel,
      birthSummary,
      bazi,
      fiveReadings,
      genderNote,
      questionCheck,
      generatedAt: new Date().toISOString(),
      baselineTitle: scenario.baselineTitle,
      turningTitle: scenario.turningTitle.replace("{age}", String(age)),
      baselineIntro: scenario.baselineIntro,
      turningIntro: scenario.turningIntro.replaceAll("{age}", String(age)),
      phases: scenario.phases,
      dimensions: scenario.dimensions,
      opportunities: scenario.opportunities,
      costs: scenario.costs,
      insight: scenario.insight,
      saved: false
    };
  }

  function regeneratePrediction(previous, newNode) {
    const next = buildPrediction({
      name: previous.name,
      question: previous.questionProvided ? previous.question : "",
      facts: previous.facts,
      change: newNode,
      birthDate: previous.birthDate,
      birthTime: previous.birthTime,
      birthPlace: previous.birthPlace,
      gender: previous.gender
    });
    next.previousNode = previous.nodeProvided ? (previous.previousNode || previous.node) : null;
    next.previousAge = previous.nodeProvided ? (previous.previousAge || previous.age) : null;
    next.saved = false;
    return next;
  }

  function renderScriptReport(script) {
    const isSaved = Boolean(script.saved || state.saved.some((item) => item.id === script.id));

    return `
      <div class="page page-report page-script-report">
        ${renderReadingProgress()}
        <main class="report-shell">
          ${renderPageTop("剧本人生", "01")}
          ${renderObserverRibbon("旁观中 · 剧本人生", "你正在时间之外，看另一个自己从 0 岁走到 80 岁。", "实时时间线")}
          <header class="report-hero script-report-hero">
            <div class="report-hero-main">
              <p class="eyebrow">另一个你 · 剧本人生 · 0—80</p>
              <h1>${esc(script.title)}</h1>
              <p class="report-subtitle">${esc(script.subtitle)}</p>
              <div class="report-meta">
                <span>0—80 岁 · 另一个你</span>
                <span>${esc(script.arc)}</span>
              </div>
              <div class="script-settings-chips">
                ${script.settingsChips.map((item) => `<span><b>${esc(item.label)}</b>${esc(item.value)}</span>`).join("")}
              </div>
            </div>
            <div class="report-actions">
              <button class="ghost-button" type="button" data-action="edit-settings">修改人生设定</button>
            </div>
          </header>

          <div class="report-layout">
            <aside class="report-toc" aria-label="剧本目录">
              <span class="toc-label">目录</span>
              <button type="button" data-scroll="overview">01 人生总览</button>
              <button type="button" data-scroll="timeline">02 人生时间轴</button>
              <button type="button" data-scroll="dimensions">03 五个维度</button>
              <button type="button" data-scroll="strengths">04 优势与劣势</button>
              <button type="button" data-scroll="key-nodes">05 关键节点</button>
              <button type="button" data-scroll="chances">06 机会与挑战</button>
              <div class="toc-foot">
                <span>${esc(script.name)}</span>
                <small>0—80 岁 · 另一个你</small>
              </div>
            </aside>

            <article class="report-content">
              <section class="report-section" id="overview">
                ${renderSectionHead("01", "人生总览", "人生总览")}
                <div class="overview-prose">
                  ${script.overview.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
                </div>
                <div class="overview-strips">
                  <span><i>${esc(script.arc.split(" · ")[0] || "远行")}</i> 青年</span>
                  <span><i>${esc(script.arc.split(" · ")[1] || "转折")}</i> 中年</span>
                  <span><i>${esc(script.arc.split(" · ")[2] || "安顿")}</i> 晚年</span>
                </div>
              </section>

              <section class="report-section" id="timeline">
                ${renderSectionHead("02", "0—80 岁人生时间轴", "人生章节")}
                <p class="section-intro">从出生到晚年，每一段都不是结论，只是那个年纪真实会发生的事。</p>
                <div class="life-timeline">
                  ${script.timeline.map((node) => {
                    return `
                      <article class="timeline-node">
                        <div class="timeline-age"><span>${String(node.age).padStart(2, "0")}</span><small>岁</small></div>
                        <div class="timeline-dot" aria-hidden="true"></div>
                        <div class="timeline-body">
                          <div class="timeline-label"><span>${esc(node.stage)}</span></div>
                          <h3>${esc(node.title)}</h3>
                          <p>${esc(node.text)}</p>
                        </div>
                      </article>
                    `;
                  }).join("")}
                </div>
              </section>

              <section class="report-section" id="dimensions">
                ${renderSectionHead("03", "五个生活维度", "人生纹理")}
                <p class="section-intro">不是分数，是这一生在不同侧面留下的质地。</p>
                <div class="dimension-grid">
                  ${script.dimensions.map((dimension, index) => `
                    <article class="dimension-card">
                      <div class="dimension-top"><span>0${index + 1}</span><b>${esc(dimension.name)}</b></div>
                      <em>${esc(dimension.keyword)}</em>
                      <p>${esc(dimension.text)}</p>
                    </article>
                  `).join("")}
                </div>
              </section>

              <section class="report-section" id="strengths">
                ${renderSectionHead("04", "优势与劣势", "托住你的，拖慢你的")}
                <div class="two-column-lists">
                  <div class="list-panel">
                    <h3>你身上的光</h3>
                    ${script.strengths.map((item) => `<div class="list-item"><b>${esc(item.title)}</b><p>${esc(item.text)}</p></div>`).join("")}
                  </div>
                  <div class="list-panel is-muted">
                    <h3>需要留意的阴影</h3>
                    ${script.weaknesses.map((item) => `<div class="list-item"><b>${esc(item.title)}</b><p>${esc(item.text)}</p></div>`).join("")}
                  </div>
                </div>
              </section>

              <section class="report-section" id="key-nodes">
                ${renderSectionHead("05", "关键人生节点", "重要转折")}
                <div class="key-node-grid">
                  ${script.keyNodes.map((node, index) => `
                    <article class="key-node-card">
                      <span class="key-node-number">0${index + 1}</span>
                      <div class="key-node-age">${esc(node.age)} · ${esc(node.label)}</div>
                      <p>${esc(node.text)}</p>
                    </article>
                  `).join("")}
                </div>
              </section>

              <section class="report-section" id="chances">
                ${renderSectionHead("06", "机会与挑战", "这条路会问你什么")}
                <div class="two-column-lists">
                  <div class="list-panel">
                    <h3>可以靠近的机会</h3>
                    ${script.opportunities.map((text, index) => `<div class="list-item numbered"><b>${String(index + 1).padStart(2, "0")}</b><p>${esc(text)}</p></div>`).join("")}
                  </div>
                  <div class="list-panel is-muted">
                    <h3>需要认真对待的挑战</h3>
                    ${script.challenges.map((text, index) => `<div class="list-item numbered"><b>${String(index + 1).padStart(2, "0")}</b><p>${esc(text)}</p></div>`).join("")}
                  </div>
                </div>
              </section>

              <section class="report-closing">
                <span aria-hidden="true">✦</span>
                <p>${esc(script.closing)}</p>
                <small>这只是其中一种可能。你仍然可以在下一个节点，重新选择。</small>
              </section>

              <div class="report-end-actions">
                <button class="ghost-button" type="button" data-action="regenerate-script">重新组合一版</button>
                <button class="primary-button small" type="button" data-action="reset-script">重新填写人生设定</button>
              </div>

              ${renderCrossExplore("script")}

              <p class="disclaimer">这是一份虚构的人生剧本，不是命理判断、医疗建议或对未来的预测。</p>
            </article>
          </div>
        </main>
        ${renderFooter()}
      </div>
    `;
  }

  function renderSectionHead(index, title, english) {
    return `
      <div class="section-head">
        <span class="section-number">${index}</span>
        <div><p>${english}</p><h2>${esc(title)}</h2></div>
      </div>
    `;
  }

  function renderPredictionReport(prediction) {
    const isSaved = Boolean(prediction.saved || state.saved.some((item) => item.id === prediction.id));
    const hasNode = Boolean(prediction.nodeProvided);
    const changed = hasNode && prediction.previousNode && prediction.previousNode !== prediction.node;
    const bazi = prediction.bazi || computeBazi(prediction.birthDate, prediction.birthTime);
    const fiveReadings = prediction.fiveReadings && prediction.fiveReadings.length ? prediction.fiveReadings : buildBaziReadings(bazi, prediction.birthPlace);
    const questionCheck = prediction.questionCheck || {
      focus: "五维",
      echo: fiveReadings.map((reading) => `${reading.title}：${reading.text}`).join(" "),
      scriptLine: prediction.baselineIntro,
      reframe: prediction.insight,
      facts: prediction.facts || ""
    };
    return `
      <div class="page page-report page-predict-report">
        ${renderReadingProgress()}
        <main class="report-shell">
          ${renderPageTop("推演人生", "02")}
          ${renderObserverRibbon("旁观中 · 命盘与选择", "你站在命盘与选择之间：先看这一生的底牌，再看另一个自己如何走。", "五个维度")}
          <header class="report-hero predict-report-hero">
            <div class="report-hero-main">
              <p class="eyebrow">八字排盘 · 妻财子禄寿</p>
              <h1 class="bazi-title">${esc(prediction.name)}的命盘</h1>
              <p class="bazi-birth-line">${esc(prediction.birthSummary || "出生信息未署名")} · 日主 ${esc(bazi ? bazi.dayMasterStem + BAZI_ELEMENT_LABELS[bazi.dayMaster] : "未定")}</p>
              <div class="bazi-pillars" aria-label="四柱">
                ${(bazi ? bazi.pillars : []).map((pillar) => `<div><span>${esc(pillar.label)}</span><b>${esc(pillar.value)}</b></div>`).join("")}
              </div>
              <div class="report-meta">
                <span>${esc(prediction.questionProvided ? prediction.category : "妻财子禄寿")}</span>
                <span>${hasNode ? `转弯点 · ${prediction.age} 岁` : "命盘已排 · 等待你的选择"}</span>
                <span>${prediction.genderLabel || "命主"}</span>
              </div>
            </div>
            ${hasNode ? `
            <div class="report-actions">
              <button class="ghost-button" type="button" data-action="edit-node">修改关键节点</button>
            </div>` : ""}
          </header>

          <article class="predict-content">
            <section class="bazi-reading">
              <div class="bazi-reading-head">
                <div>
                  <p class="eyebrow">你出生时带来的底牌</p>
                  <h2>这一生的底牌</h2>
                </div>
                <div class="bazi-element-chips">
                  ${bazi ? Object.entries(BAZI_ELEMENT_LABELS).map(([key, label]) => `<span class="${bazi.dominant === key ? "is-dominant" : ""} ${bazi.weakest === key ? "is-weak" : ""}"><b>${label}</b>${bazi.counts[key]}</span>`).join("") : ""}
                </div>
              </div>
              <p class="bazi-summary">${esc(bazi ? `${bazi.summary} ${bazi.elementLine}${prediction.birthPlace ? ` 你出生在${prediction.birthPlace}，这份命局会以更具体的地方经验落下来。` : ""}` : "命盘信息不足，以下内容仅根据你写下的问题展开。")}</p>
              <p class="bazi-gender-note">${esc(prediction.genderNote || "")}</p>
              <div class="bazi-daymaster">
                <span>日主</span>
                <b>${esc(bazi ? bazi.dayMasterStem + " " + BAZI_ELEMENT_LABELS[bazi.dayMaster] : "未定")}</b>
                <small>${esc(bazi ? `${bazi.monthJie ? `月令 ${bazi.monthJie} · ` : ""}${bazi.hourBranchLabel} · ${prediction.birthPlace || ""}` : "")}</small>
              </div>
            </section>

            <section class="five-readings" aria-labelledby="five-readings-title">
              <div class="five-readings-head">
                <div>
                  <p class="eyebrow">五个维度</p>
                  <h2 id="five-readings-title">妻 · 财 · 子 · 禄 · 寿</h2>
                </div>
                <p>不是五项打分，是同一副命盘在五个人生侧面上的回声。</p>
              </div>
              <div class="five-readings-grid">
                ${(fiveReadings || []).map((reading, index) => `
                  <article class="five-reading-card">
                    <div class="five-reading-mark">${esc(reading.mark)}</div>
                    <div class="five-reading-copy">
                      <span>0${index + 1} / ${esc(reading.title)}</span>
                      <p>${esc(reading.text)}</p>
                    </div>
                  </article>
                `).join("")}
              </div>
            </section>

            ${prediction.questionProvided ? `
              <section class="predict-question-check" id="question-check">
                <div class="check-head">
                  <div>
                    <p class="eyebrow">再看一遍</p>
                    <h2>把这个问题放回命盘里看</h2>
                  </div>
                  <span>你带来的问题</span>
                </div>
                <blockquote class="check-question">“${esc(prediction.question)}”</blockquote>
                <div class="check-grid">
                  <div class="check-panel">
                    <span>命盘里与它最相关 · ${esc(questionCheck.focus)}</span>
                    <p>${esc(questionCheck.echo)}</p>
                  </div>
                  <div class="check-panel is-script">
                    <span>放回这条时间线看</span>
                    <p>${esc(questionCheck.scriptLine)}</p>
                    <b>${esc(questionCheck.reframe)}</b>
                  </div>
                </div>
                ${questionCheck.facts ? `<div class="check-facts"><span>你写下的来路</span>${renderFactChips(questionCheck.facts)}</div>` : ""}
                <p class="check-note">这不是替你做决定的答案，只是一次把问题、命盘与来路放在一起的核对。</p>
              </section>
            ` : ""}

            ${!hasNode ? `
              <section class="predict-invite" id="choose-node">
                <p class="eyebrow">轮到你了</p>
                <h2>${prediction.questionProvided ? "如果给你一次改写的机会，你会改哪一步？" : "有哪里是你觉得遗憾，或者想改变的？"}</h2>
                <p>${prediction.questionProvided
                  ? "问题已经放回命盘里看过了。现在不急着要答案，先选一个你想改写的节点，我们来看看选择后的人生会是什么样。"
                  : "看完妻财子禄寿之后，再做一个选择。我们来看看选择后的人生会是什么样。"}</p>
                <button class="primary-button" type="button" data-action="edit-node">写下想改变的地方 <span aria-hidden="true">→</span></button>
                <small>不是撤回，也不是重来，只是看看另一条时间线。</small>
              </section>
            ` : ""}

            ${changed ? `
              <div class="change-banner" role="status">
                <span class="change-banner-mark" aria-hidden="true">↗</span>
                <div>
                  <strong>转弯点已改写</strong>
                  <p>从「${esc(prediction.previousNode)}」到「${esc(prediction.node)}」。下面的两条时间线已经同步更新。</p>
                </div>
              </div>
            ` : ""}

            ${hasNode ? `
              <section class="predict-node">
                <div>
                  <p class="eyebrow">你选择的节点</p>
                  <h2>你决定改写的地方</h2>
                  <p class="node-value">${prediction.previousNode && prediction.previousNode !== prediction.node ? `<s>${esc(prediction.previousNode)}</s><span>→</span>` : ""}${esc(prediction.node)}</p>
                  <p class="node-meta">在 ${prediction.age} 岁，这个动作把两条时间线分开。</p>
                </div>
                <button class="quiet-button" type="button" data-action="edit-node">换一个节点 <span aria-hidden="true">↗</span></button>
              </section>

              <section class="predict-compare" id="two-paths">
                <div class="compare-intro">
                  <p class="eyebrow">两条时间线</p>
                  <h2>同一个你，两条时间线</h2>
                  <p>不是「好结果」与「坏结果」的对照，而是两种代价不同的生活。</p>
                </div>
                <div class="compare-head">
                  <div class="compare-side stay">
                    <span class="compare-side-label">沿着现在</span>
                    <h3>${esc(prediction.baselineTitle)}</h3>
                    <p>${esc(prediction.baselineIntro)}</p>
                  </div>
                  <div class="compare-side change">
                    <span class="compare-side-label">改写节点</span>
                    <h3>${esc(prediction.turningTitle)}</h3>
                    <p>${esc(prediction.turningIntro)}</p>
                  </div>
                </div>
                <div class="compare-phases">
                  ${prediction.phases.map((phase) => `
                    <div class="compare-row">
                      <div class="phase-label">${esc(phase.span)}</div>
                      <div class="phase-cell stay"><span>原</span><p>${esc(phase.stay)}</p></div>
                      <div class="phase-cell change"><span>改</span><p>${esc(phase.change)}</p></div>
                    </div>
                  `).join("")}
                </div>
              </section>

              <section class="predict-shifts" id="differences">
                <div class="section-heading compact">
                  <div>
                    <p class="eyebrow">改变了什么</p>
                    <h2>会改变的地方</h2>
                  </div>
                  <p class="section-note">只看与这次选择真正相关的四个侧面。</p>
                </div>
                <div class="shift-grid">
                  ${prediction.dimensions.map((dimension, index) => `
                    <article class="shift-card">
                      <div class="shift-head"><span>0${index + 1}</span><h3>${esc(dimension.name)}</h3></div>
                      <div class="shift-pair">
                        <div><b>原</b><p>${esc(dimension.stay)}</p></div>
                        <div><b>改</b><p>${esc(dimension.change)}</p></div>
                      </div>
                    </article>
                  `).join("")}
                </div>
              </section>

              <section class="predict-odds" id="odds">
                <div class="odds-column">
                  <p class="eyebrow">机会</p>
                  <h2>可能打开的门</h2>
                  ${prediction.opportunities.map((item, index) => `<div class="odds-item"><span>${String(index + 1).padStart(2, "0")}</span><p>${esc(item)}</p></div>`).join("")}
                </div>
                <div class="odds-column is-cost">
                  <p class="eyebrow">代价</p>
                  <h2>需要付的代价</h2>
                  ${prediction.costs.map((item, index) => `<div class="odds-item"><span>${String(index + 1).padStart(2, "0")}</span><p>${esc(item)}</p></div>`).join("")}
                </div>
              </section>

              <section class="predict-insight">
                <span class="insight-mark" aria-hidden="true">✦</span>
                <p class="eyebrow">最后一件事</p>
                <h2>推演到这里，真正要问的是</h2>
                <p class="insight-copy">${esc(prediction.insight)}</p>
              </section>
            ` : ""}

            <div class="report-end-actions">
              <button class="ghost-button" type="button" data-action="new-prediction">换一个问题推演</button>
              ${hasNode ? `<button class="primary-button small" type="button" data-action="edit-node">再改一次节点</button>` : ""}
            </div>

            ${renderCrossExplore("predict")}

            <p class="disclaimer">四柱按北京时间与节气交节时刻排盘，未做真太阳时校正；内容为虚构叙事，不构成命理、职业、财务、医疗或关系建议。</p>
          </article>
        </main>
        ${renderFooter()}
      </div>
    `;
  }

  function renderFactChips(facts) {
    const chips = String(facts).split(/[；;。\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 4);
    if (!chips.length) return "";
    return `<div class="fact-chips">${chips.map((chip) => `<span>${esc(chip)}</span>`).join("")}</div>`;
  }

  function blindRarityMeta(rarity) {
    return BLIND_RARITY[rarity] || BLIND_RARITY.N;
  }

  function renderRarityBadge(rarity, extraClass = "") {
    const meta = blindRarityMeta(rarity);
    return `<span class="rarity-badge rarity-${esc(rarity)} ${extraClass}">${esc(meta.label)}</span>`;
  }

  function blindToneMeta(tone) {
    const value = Number(tone) || 3;
    const map = {
      1: { label: "很暗", className: "tone-1" },
      2: { label: "偏暗", className: "tone-2" },
      3: { label: "寻常", className: "tone-3" },
      4: { label: "有光", className: "tone-4" },
      5: { label: "最亮", className: "tone-5" }
    };
    return map[value] || map[3];
  }

  function buildBlindShareText(blind, brightest, hardest) {
    return [
      `我在「平行人生」打开了一条人生：${blind.name} · ${blind.years}`,
      `${blind.birthplace} · ${blind.identity}`,
      blind.oneLine,
      `最亮的一段：${brightest ? `${brightest.age} · ${brightest.title}` : "—"}`,
      `最难的一段：${hardest ? `${hardest.age} · ${hardest.title}` : "—"}`,
      `这一生留下的问题：${blind.question}`,
      "所有人物与故事均为虚构。"
    ].join("\n");
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      // 使用兜底复制。
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(area);
      return copied;
    } catch (error) {
      return false;
    }
  }

  function openBlindShareModal(text) {
    const content = `
      <div class="blind-share-modal">
        <p class="eyebrow">分享这一生</p>
        <h2 id="blind-share-title">把这一生带走</h2>
        <p class="auth-copy">当前浏览器没有自动复制成功。选中下面的文字，手动复制这一段人生。</p>
        <textarea class="text-input textarea-input" id="blind-share-text" rows="12" readonly>${esc(text)}</textarea>
        <div class="form-actions">
          <button class="primary-button small" type="button" data-action="close-modal">合上这一生</button>
        </div>
      </div>
    `;
    openModal(content, { labelledBy: "blind-share-title" });
    requestAnimationFrame(() => {
      const field = document.getElementById("blind-share-text");
      if (field) {
        field.focus();
        field.select();
      }
    });
  }

  function renderBlindPause(blind, chapter, index) {
    const value = (blind.reflections && blind.reflections[index]) || "";
    return `
      <div class="blind-pause" data-pause-index="${index}">
        <span class="blind-pause-kicker">暂停片刻 · ${esc(chapter.age)}</span>
        <p class="blind-pause-question">${esc(chapter.pauseQuestion)}</p>
        <label class="blind-pause-field">
          <span>如果是你，会怎么选？ <em>不会改变他/她的人生</em></span>
          <textarea class="text-input textarea-input" id="blind-reflection-${index}" maxlength="200" placeholder="写下一句你此刻的想法">${esc(value)}</textarea>
        </label>
        <button class="quiet-button" type="button" data-action="save-blind-reflection" data-index="${index}">留下这句话 <span aria-hidden="true">✦</span></button>
      </div>
    `;
  }

  function renderBlindReport(blind) {
    return renderBlindLife(blind);
  }

  function renderBlindLife(blind) {
    const isSaved = Boolean(blind.saved || state.saved.some((item) => item.id === blind.sessionId));
    const reflections = blind.reflections || {};
    const chapters = (blind.chapters || []).map((chapter, index) => {
      const tone = Number(chapter.tone) || 3;
      const toneMeta = blindToneMeta(tone);
      return {
        ...chapter,
        tone,
        toneLabel: toneMeta.label,
        toneClass: toneMeta.className,
        reflection: String(reflections[index] || "")
      };
    });
    const first = chapters[0];
    const last = chapters[chapters.length - 1];
    const birthYear = String(blind.years || "").split("—")[0];
    const brightest = chapters.reduce((best, chapter) => chapter.tone > best.tone ? chapter : best, chapters[0] || {});
    const hardest = chapters.reduce((worst, chapter) => chapter.tone < worst.tone ? chapter : worst, chapters[0] || {});
    const reflectionList = chapters.filter((chapter) => chapter.reflection.trim());
    return `
      <div class="page page-report page-blind-life">
        ${renderReadingProgress()}
        <main class="report-shell">
          ${renderPageTop("盲盒人生", "03")}
          ${renderObserverRibbon(
            "旁观中 · 一条完整的人生",
            "盲盒已经打开。你看见的不是一条等待选择的路，而是一个人已经活完的一生。",
            `${blind.name} · ${blind.years}`
          )}

          <header class="blind-game-header blind-accent-${esc(blind.accent)}">
            <img class="blind-game-thumb" src="${blind.cover}" alt="">
            <div class="blind-game-head-copy">
              <p class="eyebrow">盲盒人生 · 你打开的这一生</p>
              <p class="blind-birth-line"><span>出生档案 · 已拆封</span> · ${esc(blind.birthFamily || "普通家庭")} · ${esc(birthYear)} · ${esc(blind.birthplace)}</p>
              <h1>${esc(blind.name)}</h1>
              <p class="blind-game-alias">在另一条时间线里，这是你的名字。</p>
              <p class="blind-game-years">
                <span>${esc(blind.years)}</span>
                <span>${esc(blind.birthplace)}</span>
                <span class="blind-game-identity">${esc(blind.identity)}</span>
              </p>
              <p class="blind-game-one-line">${esc(blind.oneLine)}</p>
              <p class="blind-game-question">这一生留下的问题 · ${esc(blind.question)}</p>
              <div class="blind-life-tags">
                ${(blind.themes || []).map((theme) => `<span>${esc(theme)}</span>`).join("")}
                <span>${esc(blind.era)}</span>
              </div>
            </div>
            <div class="blind-game-meter blind-life-meter">
              <span class="meter-kicker">一条完整的人生</span>
              <b>完整一生</b>
              <small>${esc(first ? first.age : "")} → ${esc(last ? last.age : "")}</small>
            </div>
          </header>

          <div class="blind-rule-line blind-life-note">
            <span>这是完整的一生</span>
            <p>下面从出生写到晚年。没有选项、分支或第二个结局；高光只标出这一生里叙事光最亮的一段，不是成功评分。</p>
          </div>

          <section class="blind-life-story" aria-labelledby="blind-life-title">
            <div class="blind-story-head">
              <p class="eyebrow">完整的一生</p>
              <h2 id="blind-life-title">${esc(blind.name)}的一生</h2>
              <p>${esc(blind.observerIntro)}</p>
            </div>
            <div class="life-chapters">
              ${chapters.map((chapter, index) => `
                <article class="life-chapter ${chapter.rarity === "SSR" ? "is-ssr" : ""}" id="life-chapter-${index}">
                  <div class="life-chapter-head">
                    <span class="life-chapter-index">${String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <p class="life-chapter-age">${esc(chapter.age)} <span class="life-chapter-tone ${chapter.toneClass}">${chapter.toneLabel}</span></p>
                      <p class="life-chapter-era"><span>时代注脚</span>${esc(chapter.context)}</p>
                      <h3>${esc(chapter.title)}</h3>
                    </div>
                    ${renderRarityBadge(chapter.rarity)}
                  </div>
                  <p class="life-chapter-text">${esc(chapter.text)}</p>
                  <div class="life-chapter-facts">
                    <div><span>地点</span><b>${esc(chapter.place)}</b></div>
                    <div><span>身边的人</span><b>${esc(chapter.people)}</b></div>
                    <div><span>留下的东西</span><b>${esc(chapter.artifact)}</b></div>
                  </div>
                  <p class="life-chapter-summary">${esc(chapter.summary)}</p>
                </article>
                ${chapter.pauseQuestion ? renderBlindPause(blind, chapter, index) : ""}
              `).join("")}
            </div>
          </section>

          <section class="blind-temperature">
            <div class="blind-temperature-head">
              <div>
                <p class="eyebrow">人生温度</p>
                <h2>这一生的温度</h2>
              </div>
              <p>不是成功评分，是这一段记忆在人生里留下的温度。</p>
            </div>
            <div class="temperature-map">
              ${chapters.map((chapter, index) => `
                <button class="temperature-cell ${chapter.toneClass}" type="button" data-scroll="life-chapter-${index}">
                  <span>${esc(chapter.age)}</span>
                  <b>${esc(chapter.title)}</b>
                  <small>${esc(chapter.toneLabel)}</small>
                </button>
              `).join("")}
            </div>
          </section>

          <section class="blind-record" id="life-record">
            <div class="blind-record-head">
              <p class="eyebrow">人生记录卡</p>
              <h2>这一生，读完了。</h2>
              <p>${esc(blind.oneLine)}</p>
            </div>
            <div class="record-facts">
              <div><span>姓名</span><b>${esc(blind.name)}</b></div>
              <div><span>生卒</span><b>${esc(blind.years)}</b></div>
              <div><span>出生</span><b>${esc(blind.birthplace)}</b></div>
              <div><span>身份</span><b>${esc(blind.identity)}</b></div>
            </div>
            <div class="record-keywords">
              ${(blind.themes || []).map((theme) => `<span>${esc(theme)}</span>`).join("")}
            </div>
            <div class="record-highlights">
              <article class="record-highlight">
                <span>这一生最亮</span>
                <b>${esc(brightest.age || "")} · ${esc(brightest.title || "")}</b>
                <p>${esc(brightest.summary || "")}</p>
              </article>
              <article class="record-highlight is-hard">
                <span>这一生最难</span>
                <b>${esc(hardest.age || "")} · ${esc(hardest.title || "")}</b>
                <p>${esc(hardest.summary || "")}</p>
              </article>
              <article class="record-highlight">
                <span>留下的东西</span>
                <b>${esc(brightest.artifact || "")}</b>
                <p>${esc(brightest.place || "")} · ${esc(brightest.people || "")}</p>
              </article>
            </div>
            <blockquote class="record-cover-line">“${esc(blind.oneLine)}”</blockquote>
            <div class="record-question">
              <span>这一生留下的问题</span>
              <p>${esc(blind.question)}</p>
            </div>
            ${reflectionList.length ? `
              <div class="record-reflections">
                <span>你留下的注脚</span>
                ${reflectionList.map((chapter) => `<p><b>${esc(chapter.age)}</b>${esc(chapter.reflection)}</p>`).join("")}
              </div>
            ` : ""}
            <div class="record-actions">
              <button class="ghost-button" type="button" data-action="copy-blind-card">复制这段人生</button>
              <button class="quiet-button" type="button" data-action="draw-blind">再抽一个盲盒</button>
            </div>
          </section>

          ${renderCrossExplore("blind")}

          <p class="disclaimer">所有人物与故事均为虚构。一个盲盒里是一条完整的人生，高光只表示这一段记忆的叙事亮度。</p>
        </main>
        ${renderFooter()}
      </div>
    `;
  }

  function countReadLives() {
    return Object.keys(state.blindReadLives || {}).length;
  }

  function countSsrMoments() {
    return Object.keys(state.blindSsr || {}).length;
  }

  function openStoryModal(storyId) {
    const story = COMMUNITY_STORIES.find((item) => item.id === storyId);
    if (!story) return;
    state.lastStory = storyId;
    saveState();
    const liked = Boolean(state.likedStories[story.id]);
    const likes = story.likes + (liked ? 1 : 0);
    const content = `
      <article class="story-modal">
        <div class="story-modal-cover">
          <img src="${story.cover}" alt="${esc(story.topic)}故事配图">
          <div class="story-modal-cover-shade"></div>
          <div class="story-modal-cover-copy">
            <p class="eyebrow">${esc(story.topic)} · 人生转折</p>
            <h2 id="story-modal-title">${esc(story.title)}</h2>
            <p>${esc(story.author)} · ${esc(story.meta)}</p>
          </div>
          <span class="story-modal-stage">${esc(story.stage)}</span>
        </div>
        <div class="story-modal-body">
          <div class="story-lede">${esc(story.excerpt)}</div>
          <div class="story-paragraphs">
            ${(story.body[0] === story.excerpt ? story.body.slice(1) : story.body).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
          </div>
          <div class="story-modal-actions">
            <button class="story-action ${liked ? "is-active" : ""}" type="button" data-action="toggle-like" data-story-id="${story.id}" aria-pressed="${liked}">
              <span aria-hidden="true">♡</span> <span data-like-count>${likes}</span> 人共鸣
            </button>
            <span class="story-time">${esc(story.time)}</span>
          </div>
          <div class="story-replies-head">
            <div>
              <p class="eyebrow">RESPONSES</p>
              <h3>来自其他人的回应</h3>
            </div>
            <span>${story.comments} 条回应</span>
          </div>
          <div class="story-replies">
            ${story.replies.map((reply) => `<div class="story-reply"><b>${esc(reply.name)}</b><p>${esc(reply.text)}</p></div>`).join("")}
          </div>
          <p class="story-modal-note">人物与情节均为虚构，用于产品体验展示。互动数据为模拟内容。</p>
        </div>
      </article>
    `;
    openModal(content, { wide: true, labelledBy: "story-modal-title" });
  }

  function openOnboarding(target) {
    pendingRoute = target || "#/";
    const targetMode = pendingRoute.replace(/^#\//, "").replace(/\/.*$/, "");
    const targetName = MODE_META[targetMode]?.name || "这段人生";
    const content = `
      <div class="onboarding-modal">
        <div class="onboarding-mark" aria-hidden="true"><span></span><i></i></div>
        <p class="eyebrow">BEFORE YOU ENTER · 第一次见面</p>
        <h2 id="onboarding-title">先留下一枚宇宙坐标</h2>
        <p class="auth-copy">不需要登录。只是想在你进入「${targetName}」之前，知道该怎么称呼你，以及你此刻正在想什么。</p>
        <form data-form="onboarding" class="onboarding-form">
          <div class="field-grid">
            <label class="field">
              <span class="field-label">怎么称呼你</span>
              <input class="text-input" id="onboarding-name" name="name" maxlength="24" value="${esc(state.user.name)}" placeholder="一个昵称就好" autocomplete="nickname">
            </label>
            <label class="field">
              <span class="field-label">希望探索的人生方向</span>
              <select class="text-input select-input" id="onboarding-direction" name="direction">
                ${renderDirectionOptions(state.user.direction)}
              </select>
            </label>
            <label class="field field-wide">
              <span class="field-label">此刻的困惑 <em>一句话就好</em></span>
              <textarea class="text-input textarea-input" id="onboarding-confusion" name="confusion" rows="3" maxlength="160" placeholder="例如：要不要离开现在的城市？">${esc(state.user.confusion)}</textarea>
            </label>
          </div>
          <div class="form-actions">
            <button class="primary-button" type="submit">进入${targetName} <span aria-hidden="true">→</span></button>
            <button class="quiet-button" type="button" data-action="skip-onboarding">先以访客身份进入</button>
          </div>
          <p class="form-note"><span aria-hidden="true">✦</span> 出生信息不用现在填写；只有推演人生会用到生辰。</p>
        </form>
      </div>
    `;
    openModal(content, { labelledBy: "onboarding-title" });
  }

  function clearLocalData() {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch (error) {
      // 当前内存状态仍然会重置。
    }
    Object.keys(state).forEach((key) => {
      delete state[key];
    });
    Object.assign(state, defaultState());
    closeModal({ silent: true });
    navigate("#/");
    showToast("本机数据已清除");
  }

  function openClearDataModal() {
    const content = `
      <div class="clear-data-modal">
        <p class="eyebrow">清除本机数据</p>
        <h2 id="clear-data-title">清除本机数据？</h2>
        <p class="auth-copy">将删除昵称、出生信息、抽到人生、高光统计和所有暂停注脚。此操作不可恢复。</p>
        <div class="clear-data-list">
          <span>会被删除</span>
          <p>本机昵称与出生信息 · 抽到人生与 高光统计 · 剧本草稿 · 暂停注脚</p>
        </div>
        <div class="form-actions">
          <button class="quiet-button" type="button" data-action="close-modal">取消</button>
          <button class="danger-button" type="button" data-action="confirm-clear-data">确认清除</button>
        </div>
      </div>
    `;
    openModal(content, { labelledBy: "clear-data-title" });
  }

  function openProfileModal() {
    const signedIn = state.user.signedIn;
    const name = state.user.name.trim();
    const content = `
      <div class="profile-modal">
        <div class="profile-modal-head">
          <div class="profile-big-avatar">${esc(initialOf(name))}</div>
          <div class="profile-modal-title">
            <p class="eyebrow">${signedIn ? "我的星图" : "访客"}</p>
            <h2 id="profile-modal-title">${esc(name || "一位未署名的旅人")}</h2>
            <p>${signedIn ? esc(state.user.email) : "你正在以访客身份探索。记录会保存在这台设备上。"}</p>
          </div>
        </div>

        <div class="profile-stats">
          <div><b>${totalLikes()}</b><span>故事共鸣</span></div>
          <div><b>${countReadLives()}</b><span>抽到人生</span></div>
          <div><b>${countSsrMoments()}</b><span>高光时刻</span></div>
        </div>

        <div class="profile-identity">
          <div class="profile-section-head">
            <h3>你的宇宙坐标</h3>
            <span>${signedIn ? "已登录" : "本机访客"}</span>
          </div>
          <form data-form="profile" class="profile-form">
            <div class="field-grid">
              <label class="field">
                <span class="field-label">昵称</span>
                <input class="text-input" id="profile-name" name="name" maxlength="24" value="${esc(state.user.name)}" placeholder="留下一个昵称">
              </label>
              <label class="field">
                <span class="field-label">想探索的人生方向</span>
                <select class="text-input select-input" id="profile-direction" name="direction">
                  ${renderDirectionOptions(state.user.direction)}
                </select>
              </label>
              <label class="field field-wide">
                <span class="field-label">此刻的困惑</span>
                <textarea class="text-input textarea-input" id="profile-confusion" name="confusion" rows="3" maxlength="160" placeholder="没有也没关系。">${esc(state.user.confusion)}</textarea>
              </label>
            </div>
            <div class="profile-form-actions">
              <button class="primary-button small" type="submit">保存坐标</button>
              ${signedIn
                ? `<button class="quiet-button" type="button" data-action="logout">退出登录</button>`
                : `<button class="quiet-button" type="button" data-action="open-auth">登录 / 创建身份 <span aria-hidden="true">↗</span></button>`}
            </div>
          </form>
        </div>

        <div class="profile-privacy">
          <div class="profile-section-head">
            <h3>数据与隐私</h3>
            <span>本机存储</span>
          </div>
          <div class="profile-privacy-actions">
            <button class="ghost-button small" type="button" data-action="open-privacy">隐私说明 <span aria-hidden="true">↗</span></button>
            <button class="danger-button small" type="button" data-action="clear-data">清除本机数据</button>
          </div>
          <p>昵称、出生信息、抽到人生、高光统计和暂停注脚只保存在浏览器本机。清除后不可恢复。</p>
        </div>

        <p class="profile-disclaimer">${signedIn ? "这是保存在本机的演示身份，尚未连接真实账号系统。" : "登录后，本机记录会归入同一身份。正式版将支持跨设备保存。"}</p>
      </div>
    `;
    openModal(content, { labelledBy: "profile-modal-title" });
  }

  function openAuthModal() {
    const content = `
      <div class="auth-modal">
        <p class="eyebrow">创建你的身份</p>
        <h2>登录，标记你的星图</h2>
        <p class="auth-copy">正式版将支持跨设备同步。当前原型会把身份保存在本浏览器，用来验证登录后的记录归属。</p>
        <form data-form="auth" class="auth-form">
          <label class="field">
            <span class="field-label">昵称</span>
            <input class="text-input" id="auth-name" name="name" maxlength="24" value="${esc(state.user.name)}" placeholder="例如：晚风">
          </label>
          <label class="field">
            <span class="field-label">邮箱</span>
            <input class="text-input" id="auth-email" name="email" type="email" maxlength="80" value="${esc(state.user.email)}" placeholder="you@example.com">
            <span class="field-error" id="auth-email-error" role="alert"></span>
          </label>
          <div class="form-actions">
            <button class="primary-button" type="submit">创建并登录 <span aria-hidden="true">→</span></button>
            <button class="quiet-button" type="button" data-action="open-profile">返回访客状态</button>
          </div>
        </form>
        <p class="auth-note">演示版不发送验证邮件，也不会向任何服务器上传信息。</p>
      </div>
    `;
    openModal(content);
  }

  function openAboutModal() {
    const content = `
      <div class="about-modal">
        <p class="eyebrow">ABOUT THIS EXPERIMENT</p>
        <h2>关于这个实验</h2>
        <p>我们想做的不是命运预测，也不是又一个「替你做决定」的工具。</p>
        <p>平行人生用完整的虚构故事，让你暂时离开自己的轨道：读一份从 0 岁到 80 岁的剧本，把一次选择推演成两条时间线，或者抽一个盲盒，读一条完整的人生。</p>
        <div class="about-principles">
          <div><span>01</span><b>故事优先</b><p>用具体的人、处境和变化，而不是标签和分数。</p></div>
          <div><span>02</span><b>不替你决定</b><p>推演只摊开代价与可能，不给出标准答案。</p></div>
          <div><span>03</span><b>允许不知道</b><p>你可以先体验，再决定要不要留下身份和记录。</p></div>
        </div>
        <p class="about-small">当前为 V1 原型。出生信息、故事内容与互动数据均用于验证体验，不构成命理、医疗、财务或关系建议。</p>
        <button class="primary-button" type="button" data-action="close-modal">继续探索 <span aria-hidden="true">→</span></button>
      </div>
    `;
    openModal(content);
  }

  function openScriptSettingsModal() {
    const script = state.current.script;
    if (!script) return;
    const settings = {
      ...script.settings,
      name: script.name === "未署名的旅人" ? "" : script.name
    };
    const content = `
      <div class="edit-modal script-edit-modal">
        <p class="eyebrow">重新选择这一生</p>
        <h2 id="script-edit-title">修改人生设定</h2>
        <p class="auth-copy">重新选择这个人的家庭、童年与人生方向。保存后会组合成一版新的剧本。</p>
        <form data-form="edit-settings" class="edit-form">
          ${renderScriptSettingsFields(settings, "edit-script")}
          <div class="form-actions">
            <button class="primary-button" type="submit">重新组合这一生 <span aria-hidden="true">→</span></button>
            <button class="quiet-button" type="button" data-action="close-modal">取消</button>
          </div>
        </form>
      </div>
    `;
    openModal(content, { labelledBy: "script-edit-title" });
  }

  function openNodeModal() {
    const prediction = state.current.prediction;
    if (!prediction) return;
    const content = `
      <div class="edit-modal">
        <p class="eyebrow">移动转折点</p>
        <h2>${prediction.nodeProvided ? "如果改在另一个节点" : "如果给你一次改写的机会"}</h2>
        <p class="auth-copy">写下一个你想改写的关键节点，最好与当前问题在同一方向。可以带上年龄，例如「31 岁，接受外地晋升」。保存后，两条时间线会重新展开。</p>
        <form data-form="edit-node" class="edit-form">
          <label class="field">
            <span class="field-label">新的关键节点</span>
            <textarea class="text-input textarea-input" id="edit-node-input" name="node" rows="3" maxlength="120" placeholder="例如：31 岁，接受外地晋升">${esc(prediction.nodeProvided ? prediction.rawNode || prediction.node : "")}</textarea>
            <span class="field-error" id="edit-node-error" role="alert"></span>
          </label>
          <div class="form-actions">
            <button class="primary-button" type="submit">重新推演 <span aria-hidden="true">→</span></button>
            <button class="quiet-button" type="button" data-action="close-modal">取消</button>
          </div>
        </form>
      </div>
    `;
    openModal(content);
  }

  function openBlindChooser() {
    const content = `
      <div class="chooser-modal">
        <p class="eyebrow">再选一个人生</p>
        <h2>自己挑一条时间线</h2>
        <p class="auth-copy">每张卡片只留下一个来自另一条时间线的线索。选中之后，你才会看见这个人的名字，以及他/她完整的一生。</p>
        <div class="blind-choice-grid">
          ${BLIND_LIVES.map((character) => `
            <button class="blind-choice-card blind-accent-${esc(character.accent)}" type="button" data-action="choose-character" data-character-id="${character.id}">
              <span class="blind-choice-number">档案 · ${esc(character.years.split("—")[0])}</span>
              <span class="blind-choice-clue">${esc(character.clue)}</span>
              <span class="blind-choice-meta">${esc(character.clueMeta)}</span>
              <span class="blind-choice-arrow" aria-hidden="true">↗</span>
            </button>
          `).join("")}
        </div>
        <p class="chooser-note">五条时间线来自不同年代、地方与处境。选中哪一条，就完整读完哪一生。</p>
      </div>
    `;
    openModal(content, { wide: true });
  }

  function openModal(content, options = {}) {
    if (!modal || !modalPanel || !modalContent) return;
    lastFocused = document.activeElement;
    modalContent.innerHTML = content;
    modalPanel.className = `modal-panel ${options.wide ? "is-wide" : ""}`;
    if (options.labelledBy) {
      modalPanel.setAttribute("aria-labelledby", options.labelledBy);
      modalPanel.removeAttribute("aria-label");
    } else {
      modalPanel.removeAttribute("aria-labelledby");
      modalPanel.setAttribute("aria-label", options.label || "平行人生对话框");
    }
    modalPanel.scrollTop = 0;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    app.setAttribute("inert", "");
    requestAnimationFrame(() => {
      const focusTarget = modalPanel.querySelector("input:not([type='hidden']), textarea, select") || modalPanel.querySelector("button, a[href]");
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    });
  }

  function closeModal(options = {}) {
    if (!modal || !modalPanel) return;
    if (!modal.classList.contains("is-open") && !options.silent) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    app.removeAttribute("inert");
    if (options.silent) return;
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
    lastFocused = null;
  }

  function trapFocus(event) {
    if (!modal.classList.contains("is-open") || event.key !== "Tab") return;
    const focusables = Array.from(modalPanel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => element.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function showLoader(steps, done, options = {}) {
    if (isGenerating) return;
    isGenerating = true;
    const duration = options.duration || 1900;
    const stepDuration = Math.floor(duration / steps.length);
    loader.innerHTML = `
      <div class="loader-orbit" aria-hidden="true">
        <span class="loader-ring ring-1"></span>
        <span class="loader-ring ring-2"></span>
        <span class="loader-ring ring-3"></span>
        <span class="loader-core"></span>
        <i class="loader-star ls-1"></i>
        <i class="loader-star ls-2"></i>
      </div>
      <p class="loader-kicker">正在穿过星门</p>
      <h2 class="loader-title">${esc(steps[0])}</h2>
      <div class="loader-progress"><span></span></div>
      <p class="loader-sub">正在为你整理这条时间线。请稍等片刻。</p>
    `;
    loader.classList.add("is-visible");
    loader.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-loading");
    let index = 0;
    const title = loader.querySelector(".loader-title");
    const progress = loader.querySelector(".loader-progress span");
    progress.style.animation = `loaderFill ${duration}ms linear forwards`;
    const interval = setInterval(() => {
      index = Math.min(index + 1, steps.length - 1);
      if (title) {
        title.style.opacity = "0";
        setTimeout(() => {
          title.textContent = steps[index];
          title.style.opacity = "1";
        }, 160);
      }
    }, stepDuration);
    clearTimeout(loaderTimer);
    loaderTimer = setTimeout(() => {
      clearInterval(interval);
      loader.classList.remove("is-visible");
      loader.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-loading");
      isGenerating = false;
      done();
    }, duration);
  }

  function readForm(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function handleNewScript(input = {}) {
    const draft = { ...state.scriptDraft, ...input };
    const script = buildScript(draft);
    showLoader(
      ["正在组合出生的家庭", "正在把童年与选择写进时间轴", "正在让另一个自己醒来"],
      () => {
        state.current.script = script;
        state.scriptDraft = {
          name: draft.name || "",
          family: draft.family || "city",
          childhood: draft.childhood || "ordinary",
          career: draft.career || "climb",
          love: draft.love || "steady",
          wealth: draft.wealth || "slow",
          children: draft.children || "flow",
          life: draft.life || "roller",
          customLife: draft.customLife || ""
        };
        if (draft.name) state.user.name = draft.name;
        saveState();
        if (location.hash !== "#/script") {
          navigate("#/script");
        } else {
          renderRoute({ scroll: true });
        }
        showToast("另一个你的人生剧本已经展开");
      }
    );
  }

  function handleNewPrediction(input) {
    const prediction = buildPrediction(input);
    showLoader(
      ["正在排出年、月、日、时四柱", "正在校准妻财子禄寿", "正在推演这一生的分岔"],
      () => {
        state.current.prediction = prediction;
        if (input.name) state.user.name = input.name;
        saveState();
        if (location.hash !== "#/predict") {
          navigate("#/predict");
        } else {
          renderRoute({ scroll: true });
        }
        showToast("命盘与这一生的推演已经展开");
      }
    );
  }

  function createBlindSession(character) {
    return {
      ...character,
      lifeFormat: "complete-v1",
      sessionId: `blind-${Date.now()}`,
      saved: false
    };
  }

  function drawBlind(characterId = null) {
    if (isGenerating || isEntering) return;
    let pool = BLIND_LIVES;
    if (characterId) {
      pool = BLIND_LIVES.filter((item) => item.id === characterId);
    } else {
      pool = BLIND_LIVES.filter((item) => item.id !== state.lastBlind);
      if (!pool.length) pool = BLIND_LIVES;
    }
    const character = pool[Math.floor(Math.random() * pool.length)];
    if (!character) return;
    closeModal({ silent: true });
    showLoader(
      ["正在抽取一个盲盒", "正在打开一条完整的人生", "正在把你带到时间之外"],
      () => {
        state.lastBlind = character.id;
        state.current.blind = createBlindSession(character);
        state.blindReadLives[character.id] = true;
        character.chapters.forEach((chapter, index) => {
          if (chapter.rarity === "SSR") {
            state.blindSsr[`${character.id}-${index}`] = true;
          }
        });
        saveState();
        if (location.hash !== "#/blind") {
          navigate("#/blind");
        } else {
          renderRoute({ scroll: true });
        }
        showToast(`你打开了${character.name}的一生`);
      }
    );
  }

  function saveCurrent(kind) {
    let snapshot;
    let title;
    let subtitle;
    if (kind === "script" && state.current.script) {
      snapshot = state.current.script;
      title = snapshot.title;
      subtitle = `${snapshot.name} · 0—80 岁人生剧本`;
      snapshot.saved = true;
    } else if (kind === "predict" && state.current.prediction) {
      snapshot = state.current.prediction;
      title = snapshot.questionProvided ? `${snapshot.name}的命盘 · ${snapshot.question}` : `${snapshot.name}的命盘`;
      subtitle = `${snapshot.category} · 日主${snapshot.bazi ? snapshot.bazi.dayMasterStem + BAZI_ELEMENT_LABELS[snapshot.bazi.dayMaster] : "未定"}${snapshot.nodeProvided ? ` · 转弯点 ${snapshot.age} 岁` : " · 等待选择改写节点"}`;
      snapshot.saved = true;
    } else if (kind === "blind" && state.current.blind) {
      snapshot = state.current.blind;
      title = `${snapshot.name} · ${snapshot.years}`;
      subtitle = `${snapshot.birthplace} · 一条完整的人生`;
      snapshot.saved = true;
    } else {
      return;
    }
    const id = kind === "blind" ? snapshot.sessionId : snapshot.id;
    const exists = state.saved.find((item) => item.id === id);
    if (!exists) {
      state.saved.unshift({
        id,
        kind,
        title,
        subtitle,
        date: new Date().toISOString(),
        snapshot: JSON.parse(JSON.stringify(snapshot))
      });
      state.saved = state.saved.slice(0, 12);
    }
    saveState();
    renderRoute({ scroll: false });
    showToast("已收入你的星图，可在右上角找到");
  }

  function loadSaved(index) {
    const item = state.saved[Number(index)];
    if (!item) return;
    closeModal();
    if (item.kind === "script") {
      state.current.script = item.snapshot;
      saveState();
      navigate("#/script");
    } else if (item.kind === "predict") {
      if (!item.snapshot.bazi) {
        showToast("这份旧推演需要重新排一次命盘");
        return;
      }
      if (item.snapshot.nodeProvided == null) {
        item.snapshot.nodeProvided = Boolean(item.snapshot.rawNode);
      }
      state.current.prediction = item.snapshot;
      saveState();
      navigate("#/predict");
    } else if (item.kind === "blind") {
      if (item.snapshot.lifeFormat !== "complete-v1" || !Array.isArray(item.snapshot.chapters)) {
        showToast("这份旧记录需要重新抽取一次");
        return;
      }
      state.current.blind = item.snapshot;
      saveState();
      navigate("#/blind");
    }
  }

  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 36;
    window.scrollTo({ top, behavior: "smooth" });
  }

  function bindGlobalEvents() {
    window.addEventListener("hashchange", () => renderRoute({ scroll: true }));
    window.addEventListener("scroll", updateReadingProgress, { passive: true });
    document.addEventListener("pointerover", (event) => {
      const gate = event.target.closest(".life-gate");
      if (gate) setActiveGate(gate);
    });
    document.addEventListener("focusin", (event) => {
      const gate = event.target.closest(".life-gate");
      if (gate) setActiveGate(gate);
    });
    document.addEventListener("change", (event) => {
      const lifeInput = event.target.closest('input[name="life"]');
      if (!lifeInput) return;
      const form = lifeInput.closest("form");
      const custom = form ? form.querySelector("[data-script-custom]") : null;
      if (!custom) return;
      custom.hidden = lifeInput.value !== "custom";
      if (!custom.hidden) {
        const textarea = custom.querySelector("textarea");
        if (textarea) textarea.focus({ preventScroll: true });
      }
    });

    document.addEventListener("click", (event) => {
      const lifeGate = event.target.closest(".life-gate");
      if (lifeGate) {
        event.preventDefault();
        setActiveGate(lifeGate);
        const href = lifeGate.getAttribute("href");
        if (!state.user.name.trim() && !state.visitorSetup) {
          openOnboarding(href);
        } else {
          playLifeTransition(href, lifeGate);
        }
        return;
      }

      const storyCard = event.target.closest("[data-story]");
      if (storyCard) {
        event.preventDefault();
        openStoryModal(storyCard.dataset.story);
        return;
      }

      const scrollButton = event.target.closest("[data-scroll]");
      if (scrollButton) {
        event.preventDefault();
        scrollToSection(scrollButton.dataset.scroll);
        return;
      }

      const closeTrigger = event.target.closest("[data-close]");
      if (closeTrigger) {
        event.preventDefault();
        closeModal();
        return;
      }

      const actionEl = event.target.closest("[data-action]");
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      if (!action) return;

      const run = () => handleAction(action, actionEl, event);
      run();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (modal.classList.contains("is-open")) closeModal();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        const storyCard = event.target.closest("[data-story]");
        if (storyCard && event.target === storyCard) {
          event.preventDefault();
          openStoryModal(storyCard.dataset.story);
        }
      }
      trapFocus(event);
    });

    document.addEventListener("submit", (event) => {
      const form = event.target.closest("form[data-form]");
      if (!form) return;
      event.preventDefault();
      handleFormSubmit(form);
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
  }

  function handleAction(action, element, event) {
    switch (action) {
      case "open-profile":
        openProfileModal();
        break;
      case "open-privacy":
        closeModal({ silent: true });
        navigate("#/privacy");
        break;
      case "clear-data":
        openClearDataModal();
        break;
      case "confirm-clear-data":
        clearLocalData();
        break;
      case "skip-onboarding":
        state.visitorSetup = true;
        saveState();
        closeModal();
        if (pendingRoute) {
          navigate(pendingRoute);
          pendingRoute = null;
        }
        break;
      case "about":
        openAboutModal();
        break;
      case "open-auth":
        openAuthModal();
        break;
      case "logout":
        state.user.signedIn = false;
        saveState();
        renderRoute({ scroll: false });
        openProfileModal();
        showToast("已退出登录，记录仍保存在本机");
        break;
      case "close-modal":
        closeModal();
        break;
      case "close-and-home":
        closeModal();
        navigate("#/");
        break;
      case "save-blind-reflection": {
        const blind = state.current.blind;
        const index = Number(element.dataset.index);
        const field = document.getElementById(`blind-reflection-${index}`);
        if (!blind || !field) break;
        const value = field.value.trim();
        blind.reflections = { ...(blind.reflections || {}), [index]: value };
        const savedItem = state.saved.find((item) => item.id === blind.sessionId);
        if (savedItem) {
          savedItem.snapshot = JSON.parse(JSON.stringify(blind));
        }
        saveState();
        const scrollY = window.scrollY;
        renderRoute({ scroll: false });
        requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "auto" }));
        showToast(value ? "这句话留在了这一生里" : "这句话已经清空");
        break;
      }
      case "copy-blind-card": {
        const blind = state.current.blind;
        if (!blind) break;
        const reflections = blind.reflections || {};
        const chapters = (blind.chapters || []).map((chapter, index) => ({
          ...chapter,
          tone: Number(chapter.tone) || 3,
          reflection: String(reflections[index] || "")
        }));
        const brightest = chapters.reduce((best, chapter) => chapter.tone > best.tone ? chapter : best, chapters[0] || {});
        const hardest = chapters.reduce((worst, chapter) => chapter.tone < worst.tone ? chapter : worst, chapters[0] || {});
        const text = buildBlindShareText(blind, brightest, hardest);
        copyToClipboard(text).then((ok) => {
          if (ok) {
            showToast("人生卡文案已复制");
          } else {
            openBlindShareModal(text);
          }
        });
        break;
      }
      case "regenerate-script": {
        const old = state.current.script;
        if (!old) break;
        handleNewScript({
          ...old.settings,
          name: old.name === "未署名的旅人" ? "" : old.name,
          variation: (old.variation || 0) + 1
        });
        break;
      }
      case "reset-script":
        state.current.script = null;
        saveState();
        renderRoute({ scroll: true });
        break;
      case "edit-settings":
        openScriptSettingsModal();
        break;
      case "edit-node":
        openNodeModal();
        break;
      case "new-prediction":
        state.current.prediction = null;
        saveState();
        renderRoute({ scroll: true });
        break;
      case "draw-blind":
        drawBlind();
        break;
      case "choose-blind":
        openBlindChooser();
        break;
      case "choose-character":
        drawBlind(element.dataset.characterId);
        break;
      case "explore-mode": {
        const targetMode = element.dataset.mode;
        if (!MODE_META[targetMode]) break;
        state.current[targetMode] = null;
        saveState();
        navigate(`#/${targetMode}`);
        break;
      }
      case "toggle-like": {
        const storyId = element.dataset.storyId;
        const story = COMMUNITY_STORIES.find((item) => item.id === storyId);
        if (!story) break;
        state.likedStories[storyId] = !state.likedStories[storyId];
        saveState();
        const liked = Boolean(state.likedStories[storyId]);
        element.classList.toggle("is-active", liked);
        element.setAttribute("aria-pressed", String(liked));
        const count = story.likes + (liked ? 1 : 0);
        const countEl = element.querySelector("[data-like-count]");
        if (countEl) countEl.textContent = count;
        const cardStat = document.querySelector(`.story-card[data-story="${storyId}"] .story-stats > span:first-child`);
        if (cardStat) {
          cardStat.textContent = `♡ ${count}`;
          cardStat.classList.toggle("is-liked", liked);
        }
        showToast(liked ? "已留下你的共鸣" : "已取消共鸣");
        break;
      }
      case "load-saved":
        loadSaved(element.dataset.savedIndex);
        break;
      default:
        break;
    }
  }

  function handleFormSubmit(form, options = {}) {
    const formType = form.dataset.form;
    if (formType === "script") {
      const data = readForm(form);
      const name = (data.name || "").trim();
      const life = data.life || "roller";
      const customLife = (data.customLife || "").trim();
      if (life === "custom" && !customLife) {
        const error = document.getElementById("script-custom-life-error");
        const input = document.getElementById("script-custom-life");
        if (error) error.textContent = "写一句你想要的这一生，哪怕只有几个词。";
        if (input) {
          input.classList.add("is-invalid");
          input.focus();
        }
        return;
      }
      if (name) state.user.name = name;
      const draft = {
        name,
        family: data.family || "city",
        childhood: data.childhood || "ordinary",
        career: data.career || "climb",
        love: data.love || "steady",
        wealth: data.wealth || "slow",
        children: data.children || "flow",
        life,
        customLife
      };
      state.scriptDraft = draft;
      saveState();
      handleNewScript(draft);
      return;
    }

    if (formType === "predict") {
      const data = readForm(form);
      const birthDate = (data.birthDate || "").trim();
      const birthTime = (data.birthTime || "").trim();
      const birthPlace = (data.birthPlace || "").trim();
      const gender = (data.gender || "").trim();
      const question = (data.question || "").trim();
      const error = document.getElementById("predict-birth-error");
      const missing = [];
      if (!birthDate) missing.push("出生日期");
      if (!birthTime) missing.push("出生时间");
      if (!birthPlace) missing.push("出生地");
      if (!gender) missing.push("性别");
      if (missing.length) {
        if (error) error.textContent = `先补上${missing.join("、")}，才能排出四柱。`;
        const inputs = ["predict-birth-date", "predict-birth-time", "predict-birth-place", "predict-gender"];
        inputs.forEach((id) => document.getElementById(id)?.classList.add("is-invalid"));
        const firstId = !birthDate ? "predict-birth-date" : !birthTime ? "predict-birth-time" : !birthPlace ? "predict-birth-place" : "predict-gender";
        document.getElementById(firstId)?.focus();
        return;
      }
      if (error) error.textContent = "";
      ["predict-birth-date", "predict-birth-time", "predict-birth-place", "predict-gender"].forEach((id) => document.getElementById(id)?.classList.remove("is-invalid"));
      state.user.birthDate = birthDate;
      state.user.birthTime = birthTime;
      state.user.birthPlace = birthPlace;
      state.user.gender = gender;
      if (question) state.user.confusion = question;
      saveState();
      handleNewPrediction({
        name: state.user.name,
        question,
        facts: data.facts,
        change: data.change,
        birthDate,
        birthTime,
        birthPlace,
        gender
      });
      return;
    }

    if (formType === "onboarding") {
      const data = readForm(form);
      const name = (data.name || "").trim();
      if (!name) {
        const input = document.getElementById("onboarding-name");
        if (input) input.focus();
        showToast("先留下一个昵称，方便故事称呼你");
        return;
      }
      state.user.name = name;
      state.user.direction = (data.direction || "").trim();
      state.user.confusion = (data.confusion || "").trim();
      state.visitorSetup = true;
      saveState();
      closeModal();
      const target = pendingRoute || "#/";
      pendingRoute = null;
      navigate(target);
      showToast("坐标已记下，故事开始了");
      return;
    }

    if (formType === "profile") {
      const data = readForm(form);
      state.user.name = (data.name || "").trim();
      state.user.direction = (data.direction || "").trim();
      state.user.confusion = (data.confusion || "").trim();
      saveState();
      renderRoute({ scroll: false });
      openProfileModal();
      showToast("宇宙坐标已保存");
      return;
    }

    if (formType === "auth") {
      const data = readForm(form);
      const name = (data.name || "").trim();
      const email = (data.email || "").trim();
      const emailError = document.getElementById("auth-email-error");
      if (!name) {
        const nameInput = document.getElementById("auth-name");
        if (nameInput) nameInput.focus();
        showToast("先留下一个昵称");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (emailError) emailError.textContent = "请填写一个有效的邮箱地址。";
        const emailInput = document.getElementById("auth-email");
        if (emailInput) {
          emailInput.classList.add("is-invalid");
          emailInput.focus();
        }
        return;
      }
      state.user.name = name;
      state.user.email = email;
      state.user.signedIn = true;
      saveState();
      renderRoute({ scroll: false });
      openProfileModal();
      showToast("已登录，记录会归入这个身份");
      return;
    }

    if (formType === "edit-settings") {
      const data = readForm(form);
      const old = state.current.script;
      if (!old) return;
      const life = data.life || "roller";
      const customLife = (data.customLife || "").trim();
      if (life === "custom" && !customLife) {
        const error = document.getElementById("edit-script-custom-life-error");
        const input = document.getElementById("edit-script-custom-life");
        if (error) error.textContent = "写一句你想要的这一生，哪怕只有几个词。";
        if (input) {
          input.classList.add("is-invalid");
          input.focus();
        }
        return;
      }
      const draft = {
        name: (data.name || "").trim(),
        family: data.family || "city",
        childhood: data.childhood || "ordinary",
        career: data.career || "climb",
        love: data.love || "steady",
        wealth: data.wealth || "slow",
        children: data.children || "flow",
        life,
        customLife,
        variation: (old.variation || 0) + 1
      };
      const next = buildScript(draft);
      next.saved = false;
      state.current.script = next;
      state.scriptDraft = draft;
      if (draft.name) state.user.name = draft.name;
      saveState();
      closeModal();
      renderRoute({ scroll: false });
      showToast("已经按新的设定重新组合了一版");
      return;
    }

    if (formType === "edit-node") {
      const data = readForm(form);
      const node = (data.node || "").trim();
      const error = document.getElementById("edit-node-error");
      if (node.length < 2) {
        if (error) error.textContent = "写下一个具体的节点，哪怕只有几个字。";
        const input = document.getElementById("edit-node-input");
        if (input) input.focus();
        return;
      }
      const old = state.current.prediction;
      if (!old) return;
      state.current.prediction = regeneratePrediction(old, node);
      saveState();
      closeModal();
      renderRoute({ scroll: false });
      requestAnimationFrame(() => {
        const target = document.getElementById("two-paths");
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      showToast("时间线已围绕新的节点重新展开");
      return;
    }

  }
})();
