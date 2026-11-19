(function () {
const TRAITS = {
  wood: {
    title: "向光而生的木",
    early: "你小时候不太会抢，但会记住别人没有说出口的话。你常常先观察，再决定要不要伸手。",
    middle: "你做事像长树，先扎根，再慢慢往上。别人看见的是你走得慢，你自己知道，你是在找能站住的地方。",
    later: "后来你会明白，向上不等于离开原地。有些枝叶留在旧土里，也是一种长法。"
  },
  fire: {
    title: "先亮起来的人",
    early: "你小时候容易被看见，也容易被误会。你反应快，情绪来得快，退得也快。",
    middle: "你做事需要一点热度。没有兴趣的事，你能做完，但很难做久。你真正擅长的，是在短时间里把一件事点亮。",
    later: "后来你会学会控制火候。不是每一次都要烧得很旺，有些事需要小火慢炖。"
  },
  earth: {
    title: "把日子垫稳的人",
    early: "你小时候比同龄人更早懂事。家里的气氛、钱的松紧、谁在为难，你都看在眼里。",
    middle: "你做事靠得住，别人愿意把麻烦交给你。但你也容易把别人的重量接到自己身上，久了会忘记自己也有边界。",
    later: "后来你会明白，稳不是把所有事都扛住。有些土需要留给自己，才能长出新的东西。"
  },
  metal: {
    title: "把边界画清的人",
    early: "你小时候对“公平”很敏感。你不一定说出来，但心里有一把尺。",
    middle: "你做事讲规则，讲清楚，讲效率。你不太喜欢含糊，也不太擅长在灰色地带里周旋。",
    later: "后来你会学会把尺子放软一点。边界仍然要有，但不是每一次都要用刀锋画出来。"
  },
  water: {
    title: "沿着低处走的人",
    early: "你小时候对环境很敏感。谁高兴、谁生气、家里今天能不能提要求，你不用问就知道。",
    middle: "你做事擅长绕路，也擅长等。你不一定要站在最前面，但你常常知道水往哪里流。",
    later: "后来你会明白，流动不是没有方向。你需要一条自己的河道，而不是一直顺着别人。"
  }
};

const ELEMENT_LABELS = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };

function buildFreeScript(bazi, input = {}) {
  const trait = TRAITS[bazi.dayMaster] || TRAITS.earth;
  const dominant = ELEMENT_LABELS[bazi.dominant] || "土";
  const weakest = ELEMENT_LABELS[bazi.weakest] || "水";
  const place = String(input.birthPlace || "").trim() || "一个没有写进地图的小地方";
  const timeNote = input.timeUnknown
    ? "时间没有写下来，这段故事就按早年、中年、后来三段展开。"
    : `你从${input.birthDate || ""} ${input.birthTime || ""}、${place}出发。`;
  const prologue = `${timeNote} 这不是结论，只是借用你熟悉的时间与地方，写一段与你有关的叙述。`;
  const acts = [
    {
      label: "早年",
      text: `${trait.early} 你从${place}出发，家里的条件、父母的脾气、你排在兄弟姐妹里的位置，都会在你身上留下一些很早的习惯。`
    },
    {
      label: "中年",
      text: `${trait.middle} 你会在一些具体的选择里反复确认自己：去哪里、做什么、和谁一起生活。你身上更明显的那个特点，容易让你走某一条路，但路不是只有一条。`
    },
    {
      label: "后来",
      text: `${trait.later} 你会慢慢发现，那些你一直不太敢碰的地方，不是你的缺陷，而是你需要主动去补的那一块。`
    }
  ];
  const choiceAct = "不由这些线索决定的一幕：一段叙述只能写出你容易怎么反应，写不出你最后怎么选。真正改变后面的，往往是你在某个普通下午做的一个小决定：打一个电话、拒绝一次、搬一次家、把一件事做完。";
  const closing = "这段故事不是预测。它只是把一些熟悉的细节写成叙述，让你多一个角度看见自己。";
  return {
    title: `《${trait.title}》`,
    prologue,
    acts,
    choiceAct,
    closing,
    disclaimer: "虚构叙事视角，不是预测，不构成医疗、投资、婚恋或职业建议。",
    chartLine: `${bazi.dayMasterStem}日主 · ${dominant}气偏旺 · ${weakest}气偏弱 · ${bazi.monthJie || ""}`
  };
}

window.FreeScript = { buildFreeScript };

})();
