/**
 * 音频倍速可设置 —— 端到端契约测试。
 *
 * 为什么值得单独锁：
 * - 倍速是「画面跟着音轨走」的唯一速度源：写稿字数预算、镜头时长、TTS 下发都用它；
 * - 两家 TTS 的字段语义**不同**：MiniMax `voice_setting.speed` 是倍率，
 *   豆包/Seed Speech `audio_config.speech_rate` 是整数百分比增量（0=原速）——
 *   曾经硬编码 0，导致界面设了倍速但豆包链路完全不变。这里锁住换算。
 * - 倍速越界必须 400（不能静默钳制，否则用户以为设置生效了）。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-rate-'))
process.env.SQLITE_PATH = path.join(tmpDir, 'test.sqlite3')
process.env.MYSQL_AUTO_IMPORT = 'false'

const here = path.dirname(fileURLToPath(import.meta.url))
const { speechRateDelta, getTtsAdapter } = await import('../src/services/adapters/tts')
const narration = await import('../src/services/narration')
const { default: narrationRoute } = await import('../src/routes/narration')
const { db, schema, getInsertId } = await import('../src/db/index')
const { eq } = await import('drizzle-orm')

test('豆包 speech_rate 是百分比增量，MiniMax 是倍率', () => {
  // 1.1 倍 → +10%
  assert.equal(speechRateDelta(1.1), 10)
  assert.equal(speechRateDelta(1.0), 0)
  assert.equal(speechRateDelta(1.5), 50)
  assert.equal(speechRateDelta(0.8), -20)
  // 未传/非法 → 原速
  assert.equal(speechRateDelta(undefined), 0)
  assert.equal(speechRateDelta(Number.NaN), 0)
  assert.equal(speechRateDelta(0), 0)
  // 上游允许区间钳制：-50~100
  assert.equal(speechRateDelta(3), 100)
  assert.equal(speechRateDelta(0.1), -50)

  const cfg = { provider: 'volcengine', apiKey: 'k', baseUrl: 'https://openspeech.bytedance.com', model: 'seed-audio-1.0', settings: JSON.stringify({ speaker: 'BV700' }) } as any
  const req = getTtsAdapter('volcengine').buildSynthesizeRequest(cfg, { text: '你好', format: 'mp3', speed: 1.1, voiceId: '' })
  assert.equal(req.body.audio_config.speech_rate, 10, '倍速必须换算成百分比增量下发')

  const mini = { provider: 'minimax', apiKey: 'k', baseUrl: 'https://api.minimaxi.com', model: 'speech-2.8-hd', settings: JSON.stringify({ voice_id: 'male-qn-qingse' }) } as any
  const mreq = getTtsAdapter('minimax').buildSynthesizeRequest(mini, { text: '你好', format: 'mp3', speed: 1.1, voiceId: '' })
  assert.equal(mreq.body.voice_setting.speed, 1.1, 'MiniMax 直接下发倍率')

  // 不传倍速时两家都是原速
  const noSpeed = getTtsAdapter('volcengine').buildSynthesizeRequest(cfg, { text: '你好', format: 'mp3', voiceId: '' })
  assert.equal(noSpeed.body.audio_config.speech_rate, 0)
  const mNoSpeed = getTtsAdapter('minimax').buildSynthesizeRequest(mini, { text: '你好', format: 'mp3', voiceId: '' })
  assert.equal(mNoSpeed.body.voice_setting.speed, 1.0)
})

test('倍速区间常量与换算口径一致', () => {
  assert.equal(narration.MIN_SPEECH_RATE, 0.5)
  assert.equal(narration.MAX_SPEECH_RATE, 2)
  assert.equal(narration.DEFAULT_SPEECH_RATE, 1.1)
  // 1.1 倍 → 4.62 字/秒；1.5 倍 → 6.3 字/秒
  assert.equal(Math.round(narration.effectiveCharsPerSecond(1.1) * 100) / 100, 4.62)
  assert.equal(Math.round(narration.effectiveCharsPerSecond(1.5) * 100) / 100, 6.3)
  // 同一份稿子在不同倍速下的预计时长不同
  const text = '字'.repeat(277)
  assert.ok(narration.estimateDurationSec(text, 1.5) < narration.estimateDurationSec(text, 1.1))
})

async function createNarrationProject(title = '倍速测试项目') {
  const id = getInsertId(db.insert(schema.dramas).values({
    title, projectType: 'narration', style: 'vox', aspectRatio: '16:9',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }).run())
  return id
}

test('简报接口：倍速可读写、越界 400、派生值随倍速变化', async () => {
  const dramaId = await createNarrationProject()

  const put = (body: any) => narrationRoute.request(`/${dramaId}/brief`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })

  // 默认 1.1 倍
  let res = await narrationRoute.request(`/${dramaId}/brief`)
  let data = (await res.json() as any).data
  assert.equal(data.brief.speech_rate, 1.1)
  assert.equal(data.brief.default_speech_rate, 1.1)
  assert.deepEqual(data.brief.speech_rate_range, { min: 0.5, max: 2 })
  assert.equal(data.brief.char_budget, 277)          // 60s × 4.62
  assert.equal(data.brief.chars_per_second, 4.62)

  // 改成 1.5 倍 → 字数预算变大（同样时长能说更多字）
  res = await put({ speech_rate: 1.5, target_duration_sec: 60 })
  assert.equal(res.status, 200)
  data = (await res.json() as any).data
  assert.equal(data.speech_rate, 1.5)
  assert.equal(data.chars_per_second, 6.3)
  assert.equal(data.char_budget, 378)                // 60s × 6.3

  // 持久化
  res = await narrationRoute.request(`/${dramaId}/brief`)
  data = (await res.json() as any).data
  assert.equal(data.brief.speech_rate, 1.5)
  assert.equal(data.brief.target_duration_sec, 60)

  // 越界与非法 → 400（不静默钳制）
  for (const bad of [2.5, 0.2, -1, 'abc']) {
    const r = await put({ speech_rate: bad })
    assert.equal(r.status, 400, `倍速 ${bad} 应被拒绝`)
  }
  // 中间值四舍五入到两位
  const r2 = await put({ speech_rate: 1.234 })
  assert.equal(r2.status, 200)
  assert.equal(((await r2.json() as any).data).speech_rate, 1.23)

  // 其它字段的边界
  assert.equal((await put({ target_duration_sec: 1 })).status, 400)
  assert.equal((await put({ aspect_ratio: '4:3' })).status, 400)
  assert.equal((await put({ shot_count: 999 })).status, 400)
})

test('改倍速后：口播稿预计时长与逐镜计划同步变化', async () => {
  const dramaId = await createNarrationProject('倍速影响时长')
  const content = '第一句大概十来个字。第二句也是十来个字。第三句同样十来个字。'
  const ts = new Date().toISOString()
  getInsertId(db.insert(schema.narrationScripts).values({
    dramaId, versionIndex: 1, angle: '测试', title: '测试版本', content,
    charCount: content.length, estDurationSec: 0, isSelected: true, createdAt: ts, updatedAt: ts,
  }).run())

  const put = (body: any) => narrationRoute.request(`/${dramaId}/brief`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const plan = async () => {
    const r = await narrationRoute.request(`/${dramaId}/plan`)
    return (await r.json() as any).data
  }
  const scripts = async () => {
    const r = await narrationRoute.request(`/${dramaId}/scripts`)
    return (await r.json() as any).data
  }

  await put({ speech_rate: 1.0, target_duration_sec: 60 })
  const slow = await plan()
  const slowScript = (await scripts()).scripts[0]

  await put({ speech_rate: 1.5, target_duration_sec: 60 })
  const fast = await plan()
  const fastScript = (await scripts()).scripts[0]

  assert.ok(slow.plan.shots.length >= 1)
  assert.ok(fast.plan.total_sec < slow.plan.total_sec, `提速后总时长应变短：${fast.plan.total_sec} < ${slow.plan.total_sec}`)
  assert.ok(fastScript.est_duration_sec < slowScript.est_duration_sec, '预计朗读时长应随倍速变短')
  // 每镜时长 = 朗读时长 + 句尾停顿，且倍速越快越短
  for (const s of fast.plan.shots) {
    assert.equal(s.duration_sec, Math.round((s.speech_sec + 0.25) * 100) / 100)
  }
})

test('前端口播工作台有倍速控件，并与后端区间一致', () => {
  const view = fs.readFileSync(path.resolve(here, '../..', 'frontend/app/views/narration/index.vue'), 'utf8')
  assert.match(view, /const rateRange = \{ min: 0\.5, max: 2 \}/, '倍速区间需与后端一致')
  assert.match(view, /v-model\.number="form\.speech_rate"/)
  assert.match(view, /type="range"/, '需要滑块')
  assert.match(view, /ratePresets = \[1\.0, 1\.1, 1\.2, 1\.5\]/, '需要常用倍速快捷项')
  // 保存入参统一由 briefPayload() 组装，其中倍速必须转成数字下发
  assert.match(view, /function briefPayload\(\)/)
  assert.match(view, /speech_rate: Number\(form\.speech_rate\)/)
  assert.match(view, /narrationAPI\.saveBrief\(dramaId, briefPayload\(\)\)/)
  assert.match(view, /BASE_CHARS_PER_SECOND = 4\.2/, '派生字数要与后端同一套算式')
  // 逐句配音必须带上项目倍速（否则成片音画对不上）
  assert.match(view, /narrationAPI\.synthesize\(dramaId, \{[\s\S]*?speed: Number\(form\.speech_rate\)/)
  // API 客户端侧：配音与合并端点确实存在
  const useApi = fs.readFileSync(path.resolve(here, '../..', 'frontend/app/composables/useApi.ts'), 'utf8')
  assert.match(useApi, /synthesize: \(dramaId: number, d: \{ shot_ids\?: number\[\]; speed\?: number;/)
  assert.match(useApi, /merge: \(dramaId: number, d: \{ shot_ids\?: number\[\]; include_audio\?: boolean;/)
})

test('项目类型：创建弹框可选，口播项目自动建集、漫剧不预建', () => {
  const indexVue = fs.readFileSync(path.resolve(here, '../..', 'frontend/app/pages/index.vue'), 'utf8')
  assert.match(indexVue, /project_type: 'drama'/, '表单默认漫剧')
  assert.match(indexVue, /value: 'narration'/, '需要口播视频选项')
  assert.match(indexVue, /d\.project_type === 'narration' \? `\/narration\/\$\{d\.id\}` : `\/drama\/\$\{d\.id\}`/,
    '按类型分流到不同工作台')
  const dramas = fs.readFileSync(path.resolve(here, '../src/routes/dramas.ts'), 'utf8')
  assert.match(dramas, /projectType: projectType \? String\(projectType\) : 'drama'/)
  assert.match(dramas, /if \(\(result\?\.projectType \|\| 'drama'\) === 'narration'\)/, '口播项目要自动建唯一一集')
  // 漫剧分支不得预建集，保持原有行为
  assert.match(dramas, /不再预建集 — 用户通过「添加集」流程创建/)
})

test('路由注册：/narration/:id 指向口播工作台，后端挂载 /api/v1/narration', () => {
  const nuxt = fs.readFileSync(path.resolve(here, '../..', 'frontend/nuxt.config.ts'), 'utf8')
  assert.match(nuxt, /path: '\/narration\/:id'/)
  assert.match(nuxt, /app\/views\/narration\/index\.vue/)
  const index = fs.readFileSync(path.resolve(here, '../src/index.ts'), 'utf8')
  assert.match(index, /import narration from '\.\/routes\/narration\.js'/)
  assert.match(index, /api\.route\('\/narration', narration\)/)
})
