// 由 audio/durations.json 生成帧阶段时间轴：每镜实测旁白时长 + 呼吸留白，
// 输出 timeline.json（供 index.html 的 data-start/data-duration 使用）。
// 用法: node build-timeline.js <durations.json> <timeline.json> [targetTotalSeconds]
const fs = require('fs');

const [durationsPath, outPath, targetArg] = process.argv.slice(2);
if (!durationsPath || !outPath) {
  console.error('usage: node build-timeline.js <durations.json> <timeline.json> [targetSeconds]');
  process.exit(2);
}

const d = JSON.parse(fs.readFileSync(durationsPath, 'utf8'));
const TARGET = Number(targetArg || 120);
const NARRATED = d.scenes.filter((s) => s.duration !== null);
const narrationTotal = NARRATED.reduce((a, s) => a + s.duration, 0);

// 留白预算：总目标 - 旁白总长，均分到所有有旁白的镜；首镜与末镜各多留一点，
// 让开场有落定、收尾有停顿。
const headroom = Math.max(0, TARGET - narrationTotal);
const base = headroom / NARRATED.length;

const FIRST_EXTRA = 0.6;
const LAST_EXTRA = 0.8;

const scenes = [];
let t = 0;
for (const s of d.scenes) {
  if (s.duration === null) {
    scenes.push({ ...s, start: t, slot: 0 });
    continue;
  }
  const isFirst = s.id === NARRATED[0].id;
  const isLast = s.id === NARRATED[NARRATED.length - 1].id;
  let slot = base;
  if (isFirst) slot += FIRST_EXTRA;
  if (isLast) slot += LAST_EXTRA;
  slot = Math.round(slot * 1000) / 1000;

  const start = Math.round(t * 1000) / 1000;
  t = Math.round((t + s.duration + slot) * 1000) / 1000;
  scenes.push({ ...s, start, slot });
}

const total = Math.round(t * 1000) / 1000;
const payload = {
  source: durationsPath,
  target: TARGET,
  narrationTotal: Math.round(narrationTotal * 1000) / 1000,
  headroom: Math.round(headroom * 1000) / 1000,
  total,
  scenes,
};
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

console.log(`narration total : ${narrationTotal.toFixed(3)}s`);
console.log(`headroom        : ${headroom.toFixed(3)}s  (${(headroom / NARRATED.length).toFixed(3)}s per narrated scene)`);
console.log(`timeline total  : ${total.toFixed(3)}s  (target ${TARGET})`);
console.log('-'.repeat(72));
console.log('id         voStart   voDur   slot   clipStart  clipEnd');
for (const s of scenes) {
  const clipEnd = s.duration === null ? s.start : s.start + s.duration + s.slot;
  console.log(
    `${s.id.padEnd(10)}${String(s.start).padStart(8)}${String(s.duration ?? '-').padStart(8)}` +
    `${String(s.slot).padStart(7)}${String(s.start).padStart(11)}${clipEnd.toFixed(3).padStart(9)}`
  );
}
console.log(`\nwritten: ${outPath}`);
