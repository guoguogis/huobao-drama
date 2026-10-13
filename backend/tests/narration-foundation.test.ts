/**
 * 口播视频基础层：Agent / Skill 注册 + 1.1 倍语速同步算法。
 *
 * 契约：
 * - narration_writer / narration_planner 进入 validAgentTypes（设置页 Prompt 页签自动列出 → 可编辑迭代）
 * - 两个 Agent 都有工具与技能映射（技能按目录前缀注册，子技能免改代码即可生效）
 * - prompt/skill 文件存在且带 frontmatter（文件是唯一事实来源，可在线编辑）
 * - 语速换算：字数 = 时长 × 4.2 × 倍率；句→镜切分遵守单镜时长上下限
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-narration-'))
process.env.SQLITE_PATH = path.join(tmpDir, 'test.sqlite3')
process.env.MYSQL_AUTO_IMPORT = 'false'

const here = path.dirname(fileURLToPath(import.meta.url))
const agentsMod = await import('../src/agents/index')
const { validAgentTypes, DEFAULT_PROMPTS, agentRegistry } = agentsMod

const narration = await import('../src/services/narration')
const workspaceDir = path.resolve(here, '../workspace')

test('两个口播 Agent 已注册且有工具与技能映射', () => {
  assert.ok(validAgentTypes.includes('narration_writer'), 'validAgentTypes 必须包含 narration_writer（设置页会自动列出）')
  assert.ok(validAgentTypes.includes('narration_planner'), 'validAgentTypes 必须包含 narration_planner')
  assert.ok(agentRegistry.narration_writer, 'registry 里要有 narration_writer 实例')
  assert.ok(agentRegistry.narration_planner, 'registry 里要有 narration_planner 实例')
  assert.equal(DEFAULT_PROMPTS.narration_writer.name, '口播稿写作')
  assert.equal(DEFAULT_PROMPTS.narration_planner.name, '口播分镜与提示词')

  // 技能映射：按前缀注册，设置页在目录下新建子技能无需改代码
  const skillsSrc = fs.readFileSync(path.resolve(here, '../src/agents/skills.ts'), 'utf8')
  assert.match(skillsSrc, /narration_writer: \['narration-writer'\]/)
  assert.match(skillsSrc, /narration_planner: \['narration-planner'\]/)

  // 工具接线
  const indexSrc = fs.readFileSync(path.resolve(here, '../src/agents/index.ts'), 'utf8')
  assert.match(indexSrc, /narrationWriterTools/)
  assert.match(indexSrc, /narrationPlannerTools/)
})

test('prompt 文件与技能文件存在且可解析（设置页可编辑的那份）', () => {
  for (const type of ['narration_writer', 'narration_planner']) {
    const file = path.join(workspaceDir, 'prompts', `${type}.md`)
    assert.ok(fs.existsSync(file), `缺少 prompts/${type}.md`)
    const raw = fs.readFileSync(file, 'utf8')
    assert.match(raw, /^---\r?\n[\s\S]*?name: [^\n]+\r?\n[\s\S]*?---/, `prompts/${type}.md 需要 frontmatter（name/model）`)
    assert.ok(raw.length > 400, `prompts/${type}.md 内容过短`)
  }
  const skillFiles = [
    'skills/narration-writer/SKILL.md',
    'skills/narration-planner/SKILL.md',
    'skills/narration-planner/keyframe-prompt/SKILL.md',
    'skills/narration-planner/audio-prompt/SKILL.md',
  ]
  for (const rel of skillFiles) {
    const file = path.join(workspaceDir, rel)
    assert.ok(fs.existsSync(file), `缺少 ${rel}`)
    const raw = fs.readFileSync(file, 'utf8')
    assert.ok(raw.length > 300, `${rel} 内容过短`)
    // Mastra 技能注册的硬要求：frontmatter name 必须等于目录名（否则该技能被静默跳过）
    const dirName = rel.split('/').slice(-2)[0]
    assert.match(raw, new RegExp(`^---\\r?\\nname: ${dirName}\\r?\\n`), `${rel} 的 frontmatter name 必须等于目录名 ${dirName}`)
    assert.match(raw, /\r?\ndescription: .+/, `${rel} 需要 description（设置页技能列表展示用）`)
  }
  // 两个子技能必须挂在 narration-planner 前缀下（否则不会被注入该 Agent）
  assert.ok(fs.existsSync(path.join(workspaceDir, 'skills/narration-planner/keyframe-prompt/SKILL.md')))
  assert.ok(fs.existsSync(path.join(workspaceDir, 'skills/narration-planner/audio-prompt/SKILL.md')))
})

test('1.1 倍语速的字数↔时长换算', () => {
  assert.equal(narration.BASE_CHARS_PER_SECOND, 4.2)
  assert.equal(narration.DEFAULT_SPEECH_RATE, 1.1)
  // 1.1 倍速 → 4.62 字/秒
  assert.equal(Math.round(narration.effectiveCharsPerSecond(1.1) * 100) / 100, 4.62)
  // 60 秒预算 ≈ 277 字
  assert.equal(narration.charBudget(60, 1.1), 277)
  // 277 字 ≈ 60 秒
  const text = '字'.repeat(277)
  assert.ok(Math.abs(narration.estimateDurationSec(text, 1.1) - 60) < 0.2, '277 字应约等于 60 秒')
  // 1.0 倍速时更长
  assert.ok(narration.estimateDurationSec(text, 1.0) > narration.estimateDurationSec(text, 1.1))
})

test('口播稿按句切分：标点/换行都成边界', () => {
  const script = '第一句。第二句！第三句？\n第四句；第五句'
  assert.deepEqual(narration.splitNarrationSentences(script), [
    '第一句。', '第二句！', '第三句？', '第四句；', '第五句',
  ])
  assert.deepEqual(narration.splitNarrationSentences(''), [])
})

test('镜头计划：一句一镜、短句合并、长句再切、时长与目标可校验', () => {
  // 目标 30 秒 → 预算约 138 字
  const script = [
    '你有没有想过一个问题。',
    '为什么同样一件事，有人三分钟讲清楚，有人讲了半小时还没讲完。',
    '答案不是口才，而是结构。',
  ].join('\n')
  const plan = narration.planShots(script, 30, 1.1)
  assert.equal(plan.targetSec, 30)
  assert.ok(plan.shots.length >= 3, `镜头数应≥3，实际 ${plan.shots.length}`)
  // 每镜时长都落在上下限内
  for (const s of plan.shots) {
    assert.ok(s.durationSec >= narration.MIN_SHOT_SEC - 0.6, `镜头 ${s.index} 过短：${s.durationSec}s`)
    assert.ok(s.durationSec <= narration.MAX_SHOT_SEC + 0.3, `镜头 ${s.index} 过长：${s.durationSec}s`)
  }
  // 时长 = 朗读时长 + 句尾停顿
  for (const s of plan.shots) {
    assert.equal(s.durationSec, Math.round((s.speechSec + narration.PAUSE_SENTENCE_SEC) * 100) / 100)
  }
  // 总时长 = Σ 镜头时长
  assert.equal(plan.totalSec, Math.round(plan.shots.reduce((n, s) => n + s.durationSec, 0) * 100) / 100)
  assert.equal(typeof plan.withinTolerance, 'boolean')
  assert.ok(Array.isArray(plan.warnings))
})

test('镜头计划：字数与目标严重不符时给出可操作告警', () => {
  const tooShort = narration.planShots('就一句话。', 120, 1.1)
  const tooLong = narration.planShots('字'.repeat(2000), 20, 1.1)
  assert.equal(tooShort.withinTolerance, false)
  assert.ok(tooShort.warnings.some(w => w.includes('计划总时长')), '应提示时长偏差')
  assert.equal(tooLong.withinTolerance, false)
})

test('导出对齐：优先用 TTS 实测时长，缺失回退估算', () => {
  const resolved = narration.resolveShotDurations([
    { index: 1, estimatedSec: 5, measuredSec: 5.8 },
    { index: 2, estimatedSec: 4, measuredSec: null },
    { index: 3, estimatedSec: 6, measuredSec: 0 },
  ])
  assert.deepEqual(resolved.map(r => r.source), ['measured', 'estimated', 'estimated'])
  assert.equal(resolved[0].durationSec, 6.05)   // 5.8 + 0.25
  assert.equal(resolved[1].durationSec, 4.25)   // 4 + 0.25
})

test('简报读写：metadata 往返、非法值回退、语速钳制', () => {
  const parsed = narration.parseNarrationBrief(JSON.stringify({
    narration: { topic: '口播主题', targetDurationSec: 90, speechRate: 1.1, aspectRatio: '9:16', voiceId: 'v1' },
  }))
  assert.equal(parsed.topic, '口播主题')
  assert.equal(parsed.targetDurationSec, 90)
  assert.equal(parsed.aspectRatio, '9:16')
  assert.equal(parsed.voiceId, 'v1')
  assert.equal(parsed.clipWithAudio, false)

  const bad = narration.parseNarrationBrief('{ not json')
  assert.equal(bad.targetDurationSec, 60)
  assert.equal(bad.speechRate, 1.1)
  const weird = narration.parseNarrationBrief(JSON.stringify({ narration: { targetDurationSec: -5, speechRate: 99, aspectRatio: '4:3' } }))
  assert.equal(weird.targetDurationSec, 60, '越界时长回退默认')
  assert.equal(weird.speechRate, 1.1, '越界语速回退默认')
  assert.equal(weird.aspectRatio, '16:9', '非法画幅回退默认')

  assert.equal(narration.clampSpeechRate(3), 2)
  assert.equal(narration.clampSpeechRate(0.1), 0.5)
  assert.equal(narration.clampSpeechRate(Number.NaN), 1.1)
})
