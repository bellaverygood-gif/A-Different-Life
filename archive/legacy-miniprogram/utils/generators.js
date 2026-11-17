const {
  SCRIPT_OPTIONS,
  SCRIPT_MODULES,
  PREDICT_SCENARIOS,
  BAZI_ELEMENT_READINGS,
  BAZI_ELEMENT_LACK,
  BAZI_GENDER_LABEL
} = require("../data/index");
const BaziCore = require("./bazi");

const BAZI_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BAZI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const BAZI_ELEMENT_LABELS = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const BAZI_STEM_ELEMENTS = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const BAZI_BRANCH_ELEMENTS = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];

function hashString(value) {
  let hash = 2166136261;
  const string = String(value || "");
  for (let index = 0; index < string.length; index += 1) {
    hash ^= string.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function modulo(value, base) {
  return ((value % base) + base) % base;
}

function scriptOptionLabel(field, id) {
  const option = (SCRIPT_OPTIONS[field] || []).find((item) => item.id === id);
  return option ? option.label : id;
}

function buildScript(input = {}, defaultName = "") {
  const draft = {
    name: "",
    family: "city",
    childhood: "ordinary",
    career: "climb",
    love: "steady",
    wealth: "slow",
    children: "flow",
    life: "roller",
    customLife: "",
    ...input
  };
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
  const name = String(draft.name || defaultName || "").trim() || "未署名的旅人";
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
      name,
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
    overview: [family.overview, `${childhood.overview} ${lifeOverview}`],
    timeline,
    dimensions: [
      { name: "事业", keyword: career.keyword, text: career.dimension },
      { name: "爱情", keyword: love.keyword, text: love.dimension },
      { name: "财富", keyword: wealth.keyword, text: `${wealth.dimension} ${family.wealthNote}` },
      { name: "健康", keyword: healthKeywords[draft.life] || healthKeywords.custom, text: `${childhood.health} ${healthLines[draft.life] || healthLines.custom}` },
      { name: "子女", keyword: children.keyword, text: children.dimension }
    ],
    strengths: [family.strength, childhood.strength, career.strength || life.strength].filter(Boolean),
    weaknesses: [family.weakness, childhood.weakness, career.weakness || love.weakness].filter(Boolean),
    keyNodes: [timeline[3], timeline[5], timeline[7]].map((node) => ({
      age: `${node.age}岁`,
      label: node.stage,
      text: node.text.split("。")[0] + "。"
    })),
    opportunities: [career.opportunity, love.opportunity, life.opportunity].filter(Boolean),
    challenges: [family.challenge, career.challenge, life.challenge].filter(Boolean),
    closing,
    saved: false
  };
}

function computeBazi(dateValue, timeValue) {
  const core = BaziCore.computeBazi(dateValue, timeValue);
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
  rules.forEach((rule) => {
    let score = 0;
    rule.words.forEach((word) => {
      if (q.toLowerCase().includes(word.toLowerCase())) score += word.length > 1 ? 2 : 1;
    });
    if (score > bestScore) {
      bestScore = score;
      bestKey = rule.key;
    }
  });
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

function buildQuestionCheck({ question, key, scenario, fiveReadings, facts }) {
  const focusMap = {
    city: { label: "禄与财", keys: ["career", "wealth"] },
    career: { label: "禄与财", keys: ["career", "wealth"] },
    love: { label: "妻与子", keys: ["spouse", "children"] },
    family: { label: "子与寿", keys: ["children", "longevity"] },
    study: { label: "禄与寿", keys: ["career", "longevity"] },
    self: { label: "五维", keys: ["spouse", "wealth", "children", "career", "longevity"] },
    general: { label: "五维", keys: ["spouse", "wealth", "children", "career", "longevity"] }
  };
  const focus = focusMap[key] || focusMap.general;
  const readings = (fiveReadings || []).filter((reading) => focus.keys.includes(reading.key));
  const echo = readings.slice(0, 2).map((reading) => `${reading.title}：${reading.text}`).join(" ");
  return {
    question,
    focus: focus.label,
    echo: echo || "这副命盘的五个侧面里，没有哪一个能单独替你回答这个问题。",
    scriptLine: scenario.baselineIntro,
    reframe: scenario.insight,
    facts: facts || ""
  };
}

function buildPrediction(input = {}, user = {}) {
  const question = (input.question || "").trim() || "这一生，应该把力气放在哪里？";
  const key = detectScenario(question);
  const scenario = PREDICT_SCENARIOS[key] || PREDICT_SCENARIOS.general;
  const rawNode = (input.change || "").trim();
  const nodeProvided = Boolean(rawNode);
  const age = extractAge(input.change, input.facts) || scenario.defaultAge;
  const node = cleanNode(rawNode) || scenario.defaultNode;
  const name = (input.name || user.name || "").trim() || "你";
  const facts = (input.facts || "").trim();
  const birthDate = String(input.birthDate || "").trim();
  const birthTime = String(input.birthTime || "").trim();
  const birthPlace = String(input.birthPlace || "").trim();
  const gender = input.gender || user.gender || "other";
  const genderLabel = BAZI_GENDER_LABEL[gender] || BAZI_GENDER_LABEL.other;
  const bazi = computeBazi(birthDate, birthTime);
  const birthSummary = [birthPlace, birthDate.replace(/-/g, "."), birthTime, genderLabel].filter(Boolean).join(" · ");
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
    turningTitle: scenario.turningTitle.replace(/\{age\}/g, String(age)),
    baselineIntro: scenario.baselineIntro,
    turningIntro: scenario.turningIntro.replace(/\{age\}/g, String(age)),
    phases: scenario.phases,
    dimensions: scenario.dimensions,
    opportunities: scenario.opportunities,
    costs: scenario.costs,
    insight: scenario.insight,
    saved: false
  };
}

function regeneratePrediction(previous, newNode, user) {
  const next = buildPrediction({
    name: previous.name,
    question: previous.questionProvided ? previous.question : "",
    facts: previous.facts,
    change: newNode,
    birthDate: previous.birthDate,
    birthTime: previous.birthTime,
    birthPlace: previous.birthPlace,
    gender: previous.gender
  }, user);
  next.previousNode = previous.nodeProvided ? (previous.previousNode || previous.node) : null;
  next.previousAge = previous.nodeProvided ? (previous.previousAge || previous.age) : null;
  next.saved = false;
  return next;
}

module.exports = {
  buildScript,
  buildPrediction,
  regeneratePrediction,
  computeBazi,
  buildBaziReadings,
  buildQuestionCheck,
  detectScenario,
  scriptOptionLabel,
  hashString,
  BAZI_GAN,
  BAZI_ZHI,
  BAZI_ELEMENT_LABELS
};
