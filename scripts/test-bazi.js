const fs = require("fs");
const path = require("path");
const BaziCore = require("../miniprogram/utils/bazi");

const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, "bazi-fixtures.json"), "utf8"));
let failed = 0;
for (const item of fixtures) {
  const bazi = BaziCore.computeBazi(item.date, item.time);
  const got = bazi ? bazi.pillars.map((pillar) => pillar.value) : [];
  if (got.join(" ") !== item.expected.join(" ")) {
    failed += 1;
    console.log("DIFF", item.date, item.time, "got", got.join(" "), "expected", item.expected.join(" "));
  }
}
console.log(`Bazi fixtures: ${fixtures.length - failed}/${fixtures.length} passed`);
process.exit(failed ? 1 : 0);
