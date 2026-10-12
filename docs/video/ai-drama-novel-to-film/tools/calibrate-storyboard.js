// 校准 storyboard.json：按 4.6 字/秒 + 每处标点 0.5s 停顿，逐镜向上取整，
// 回填各镜 duration_hint 与 production_notes 的合计值。
// 用法: node calibrate-storyboard.js <storyboard.json>
const fs = require('fs');

const file = process.argv[2];
if (!file) { console.error('usage: node calibrate-storyboard.js <storyboard.json>'); process.exit(2); }

const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const CPS = 4.6;          // 字/秒
const PAUSE = 0.5;        // 每处标点停顿
const PUNCT = /[，。！？；：、,.!?;:…—「」（）()《》""'']/g;

let rawTotal = 0, roundedTotal = 0, chars = 0;
const rows = [];

for (const s of j.scenes) {
  const text = s.narration || '';
  const n = text.length;
  const p = (text.match(PUNCT) || []).length;
  const raw = n / CPS + p * PAUSE;
  const rounded = Math.max(1, Math.round(raw));   // 至少 1 秒
  chars += n;
  rawTotal += raw;
  roundedTotal += rounded;
  rows.push({ id: s.id, chars: n, punct: p, raw, was: s.duration_hint, now: rounded });
  s.duration_hint = rounded;
}

console.log('id        字数 标点   raw     原值  校准');
for (const r of rows) {
  const flag = r.was !== r.now ? '  <-- changed' : '';
  console.log(
    `${r.id.padEnd(10)}${String(r.chars).padStart(4)}${String(r.punct).padStart(5)}` +
    `${r.raw.toFixed(2).padStart(8)}${String(r.was).padStart(6)}${String(r.now).padStart(6)}${flag}`
  );
}
console.log('-'.repeat(48));
console.log(`chars=${chars}  rawTotal=${rawTotal.toFixed(2)}s  roundedTotal=${roundedTotal}s`);

// 回填 notes，保持字段顺序稳定
const n = j.production_notes;
n.total_narration_chars = chars;
n.sum_duration_hint_seconds = roundedTotal;
n.estimated_duration_seconds = roundedTotal;
n.duration_formula =
  `逐镜预估 = 旁白字数 ÷ ${CPS} 字/秒 + 标点数 × ${PAUSE}s 停顿，再取整到整秒；` +
  `${rows.length} 镜合计 ${roundedTotal}s（未取整的纯朗读时长约 ${rawTotal.toFixed(1)}s，差额是逐镜预留的呼吸留白）`;

fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n', 'utf8');
console.log(`written: ${file}`);
