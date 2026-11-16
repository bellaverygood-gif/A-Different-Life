const THEMES = {
  工作: {
    early: "如果你更早把力气放在工作上，你可能会更早得到一个明确的职业身份，也会更早遇见工作里的消耗。",
    middle: "如果你把更多时间给了工作，你可能会得到更清楚的职位和收入，也会失去一部分可以自由安排的生活。",
    later: "如果工作一直放在前面，你后来也许会有一个更稳的位置，但有些关系可能没有来得及长成。",
    gained: ["更早的职业身份", "更清楚的收入路径"],
    lost: ["一部分自由时间", "一些没有走深的关系"],
    unchanged: ["你处理压力的方式", "你对稳定的需要"]
  },
  城市: {
    early: "如果你去了另一个城市，你可能会更早离开熟悉的关系网，也会更早学会一个人处理事情。",
    middle: "如果你换了城市，你可能会得到更大的流动空间，也会失去一些随叫随到的熟人。",
    later: "如果那座城市留住了你，你后来也许会有一个不同的生活半径，但“家”这件事仍然要重新学。",
    gained: ["更大的流动空间", "新的关系网"],
    lost: ["熟悉的日常", "离家人更近的便利"],
    unchanged: ["你对归属的需要", "你面对陌生环境时的谨慎"]
  },
  学业: {
    early: "如果你当时继续读书，你可能会更晚进入社会，也会多一张可以打开某些门的证书。",
    middle: "如果你把时间投进学业，你可能会得到更宽的选择，也会错过几年可以挣钱的窗口。",
    later: "如果那张文凭拿到了，你后来也许会走一条更慢但更稳的路，也可能仍然要重新找方向。",
    gained: ["更宽的选择", "一张证书"],
    lost: ["几年收入", "提前进入社会的经验"],
    unchanged: ["你学习的方式", "你对被评价的敏感"]
  },
  关系: {
    early: "如果你当时更靠近那段关系，你可能会更早学会依赖，也会更早面对失望。",
    middle: "如果你把更多时间给了一个人，你可能会得到更深的陪伴，也会失去一部分独处和自由。",
    later: "如果那段关系留了下来，你后来也许会有一个更稳定的日常，也可能有另一种需要处理的疲惫。",
    gained: ["更深的陪伴", "更早的承诺"],
    lost: ["一部分独处", "其他关系的空间"],
    unchanged: ["你对亲密的需要", "你保护自己的方式"]
  },
  家庭: {
    early: "如果你更早把家庭放在前面，你可能会更早承担照顾，也会更早失去一些只属于自己的时间。",
    middle: "如果你把更多精力给了家人，你可能会得到更近的关系，也会失去一部分职业上的可能。",
    later: "如果家庭一直是中心，你后来也许会有一个更热闹的晚年，也可能有一些没有说出口的遗憾。",
    gained: ["更近的家庭关系", "被需要的位置"],
    lost: ["个人时间", "一部分职业机会"],
    unchanged: ["你对家人的在意", "你承担压力的方式"]
  },
  其他: {
    early: "如果你当时选了另一条路，你可能会更早遇见一种新的生活，也会更早失去原来的安全感。",
    middle: "如果那个选择被坚持下去，你可能会得到一种新的经验，也会失去一些原本顺手的东西。",
    later: "如果那条路一直走下去，你后来也许会有一个不同的自己，但有些旧问题不会自动消失。",
    gained: ["一种新的经验", "一次主动的改变"],
    lost: ["原来的安全感", "一些熟悉的关系"],
    unchanged: ["你面对不确定的方式", "你真正在意的东西"]
  }
};

function buildChoicePreview(script, theme, stageIndex) {
  const item = THEMES[theme] || THEMES["其他"];
  const index = Math.max(0, Math.min(2, Number(stageIndex) || 0));
  const original = script.acts[index];
  const text = item[["early", "middle", "later"][index]];
  const alternateActs = script.acts.map((act, i) => i === index ? { ...act, text } : act);
  const alternate = {
    ...script,
    title: `${script.title} · 另一条路`,
    acts: alternateActs,
    choiceAct: "这只是另一条路的叙事预览，不是预测。你没有走过的路，不会因为被写出来就变得更好或更差。",
    closing: "另一条路也有它的得到和失去。"
  };
  return {
    theme,
    stage: script.acts[index].label,
    original,
    alternate,
    diff: {
      summary: {
        gained: item.gained,
        lost: item.lost,
        unchanged: item.unchanged
      },
      sections: [{
        stage: script.acts[index].label,
        status: "changed",
        text,
        original: original.text
      }]
    }
  };
}

module.exports = { buildChoicePreview };
