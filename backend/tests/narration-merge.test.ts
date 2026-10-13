/**
 * 口播剪辑合并：重定时规则 + 路由契约。
 *
 * 音画同步的保证来自两条对称的滤镜链：
 *   视频 …[setpts 压缩 | tpad 冻结补足]→ trim=duration=target → setpts=PTS-STARTPTS
 *   音频 …aresample/aformat → apad → atrim=0:target → asetpts=PTS-STARTPTS
 * 每段都恰好 target 秒，拼接后总时长必然 = Σ target，画面与声音天然对齐。
 * 这里把规则锁死，避免以后有人「顺手」去掉末尾的 trim（那会让定帧段时长翻倍）。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-nmerge-'))
process.env.SQLITE_PATH = path.join(tmpDir, 'test.sqlite3')
process.env.MYSQL_AUTO_IMPORT = 'false'

const here = path.dirname(fileURLToPath(import.meta.url))
const {
  buildVideoChain, buildAudioChain, buildConcatGraph, resolveTargetDuration,
  DEFAULT_WIDTH, DEFAULT_HEIGHT,
} = await import('../src/services/narration-merge')
const { default: narrationRoute } = await import('../src/routes/narration')
const { db, schema, getInsertId } = await import('../src/db/index')
const { eq } = await import('drizzle-orm')

const seg = (over: Record<string, any> = {}) => ({
  index: 1, targetDuration: 4, videoPath: 'static/videos/a.mp4', ...over,
})

test('视频链：偏长的片段用 setpts 压缩，不截断动作', () => {
  const chain = buildVideoChain(seg({ sourceDuration: 14.08, targetDuration: 4.25 }))
  assert.match(chain, /^scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720/)
  assert.match(chain, /setsar=1,fps=24/)
  // 4.25 / 14.08 ≈ 0.302
  assert.match(chain, /setpts=PTS\*0\.302/)
  assert.doesNotMatch(chain, /tpad=/, '偏长的段不需要冻结补足')
  assert.match(chain, /trim=duration=4\.25,setpts=PTS-STARTPTS$/, '必须以 trim 收口')
})

test('视频链：偏短的片段冻结尾帧补足（余量放在尾帧停顿）', () => {
  const chain = buildVideoChain(seg({ sourceDuration: 10.125, targetDuration: 12.25 }))
  assert.match(chain, /tpad=stop_mode=clone:stop_duration=2\.125/)
  assert.doesNotMatch(chain, /setpts=PTS\*/)
  assert.match(chain, /trim=duration=12\.25,setpts=PTS-STARTPTS$/)
})

test('视频链：定帧图段不叠加 tpad 与输入时长（只靠末尾 trim 收口）', () => {
  const chain = buildVideoChain(seg({ videoPath: undefined, imagePath: 'static/images/a.jpg', targetDuration: 2.75 }))
  // 定帧段仍会补一段 clone（保证素材足够），但最终由 trim 收到 2.75：
  // 若去掉 trim，输入 -t 3.25 再加 2.75 的 tpad 会得到 6 秒（曾实测到过这个 bug）
  assert.match(chain, /trim=duration=2\.75,setpts=PTS-STARTPTS$/)
  const tpad = chain.match(/stop_duration=([\d.]+)/)
  assert.ok(tpad, '定帧段需要 tpad 供料')
  assert.ok(Number(tpad[1]) <= 2.75 + 0.001, 'tpad 不得超过目标时长')
})

test('视频链：时长已经吻合时不改速也不补帧，仅归一化 + trim', () => {
  const chain = buildVideoChain(seg({ sourceDuration: 4.0, targetDuration: 4.0 }))
  assert.doesNotMatch(chain, /setpts=PTS\*/)
  assert.doesNotMatch(chain, /tpad=/)
  assert.match(chain, /trim=duration=4,setpts=PTS-STARTPTS$/)
  // 分辨率可覆盖
  const custom = buildVideoChain(seg({ sourceDuration: 4, targetDuration: 4 }), { width: 1920, height: 1080, fps: 30 })
  assert.match(custom, /scale=1920:1080/)
  assert.match(custom, /fps=30/)
})

test('音频链：统一采样率/声道后 pad+trim 到恰好 target（与视频对称）', () => {
  const chain = buildAudioChain(seg({ targetDuration: 4.25 }))
  assert.equal(chain, 'aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=0:4.25,asetpts=PTS-STARTPTS')
  const mono = buildAudioChain(seg({ targetDuration: 3 }), { sampleRate: 32000 })
  assert.match(mono, /aresample=32000/)
  assert.match(mono, /atrim=0:3,/)
})

test('拼接图：每段一对 [vN][aN]，最后 concat 数量与段数一致', () => {
  const plan = [
    { seg: seg({ index: 1 }), videoInput: 0, audioInput: 1 },
    { seg: seg({ index: 2 }), videoInput: 2, audioInput: 3 },
    { seg: seg({ index: 3, videoPath: undefined, imagePath: 'static/images/b.jpg' }), videoInput: 4, audioInput: 5 },
  ]
  const graph = buildConcatGraph(plan)
  assert.match(graph, /\[0:v\]/)
  assert.match(graph, /\[1:a\]/)
  assert.match(graph, /\[4:v\]/)
  assert.match(graph, /\[5:a\]/)
  assert.match(graph, /\[v0\]\[a0\]\[v1\]\[a1\]\[v2\]\[a2\]concat=n=3:v=1:a=1\[v\]\[a\]$/)
  assert.equal((graph.match(/\[v\d\]/g) || []).length >= 3, true)
  assert.equal(DEFAULT_WIDTH, 1280)
  assert.equal(DEFAULT_HEIGHT, 720)
})

test('目标时长：优先 TTS 实测（+停顿），其次计划值，最后兜底', () => {
  assert.equal(resolveTargetDuration({ measuredSec: 4.0 }), 4.25)
  assert.equal(resolveTargetDuration({ measuredSec: 4.0, pauseSec: 0.5 }), 4.5)
  assert.equal(resolveTargetDuration({ measuredSec: null, plannedSec: 5.2 }), 5.2)
  assert.equal(resolveTargetDuration({ measuredSec: 0, plannedSec: 3 }), 3)
  assert.equal(resolveTargetDuration({}), 3)
  // 实测优先于计划
  assert.equal(resolveTargetDuration({ measuredSec: 2, plannedSec: 9 }), 2.25)
})

test('合并路由：无镜头/缺素材时给出可操作 400，不启动 ffmpeg', async () => {
  const ts = new Date().toISOString()
  const dramaId = getInsertId(db.insert(schema.dramas).values({
    title: '合并路由测试', projectType: 'narration', createdAt: ts, updatedAt: ts,
  }).run())
  const episodeId = getInsertId(db.insert(schema.episodes).values({
    dramaId, episodeNumber: 1, title: '口播', resolution: '720p', createdAt: ts, updatedAt: ts,
  }).run())

  const post = (body: any) => narrationRoute.request(`/${dramaId}/merge`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })

  // 没有任何镜头
  let res = await post({})
  assert.equal(res.status, 400)
  assert.match((await res.json() as any).message, /没有可合并的镜头/)

  // 有镜头但既无片段也无关键帧图
  getInsertId(db.insert(schema.storyboards).values({
    episodeId, storyboardNumber: 1, narrationText: '一句旁白。', createdAt: ts, updatedAt: ts,
  }).run())
  res = await post({})
  assert.equal(res.status, 400)
  assert.match((await res.json() as any).message, /还没有视频片段或关键帧图片/)

  // 项目不存在
  res = await narrationRoute.request('/99999/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  assert.equal(res.status, 404)

  // 软删的镜头不算数
  await db.update(schema.storyboards).set({ deletedAt: ts }).where(eq(schema.storyboards.episodeId, episodeId))
  res = await post({})
  assert.equal(res.status, 400)
  assert.match((await res.json() as any).message, /没有可合并的镜头/)
})

test('配音路由：无旁白文本时不调用 TTS，返回可读错误而非 500', async () => {
  const ts = new Date().toISOString()
  const dramaId = getInsertId(db.insert(schema.dramas).values({
    title: '配音路由测试', projectType: 'narration', createdAt: ts, updatedAt: ts,
  }).run())
  const episodeId = getInsertId(db.insert(schema.episodes).values({
    dramaId, episodeNumber: 1, title: '口播', createdAt: ts, updatedAt: ts,
  }).run())
  getInsertId(db.insert(schema.storyboards).values({
    episodeId, storyboardNumber: 1, imagePrompt: '画面', createdAt: ts, updatedAt: ts,
  }).run())

  const res = await narrationRoute.request(`/${dramaId}/synthesize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  })
  assert.equal(res.status, 200, '没有可配音的镜头不算错误，应返回 0 条 + 说明')
  const data = (await res.json() as any).data
  assert.equal(data.synthesized, 0)
  assert.equal(data.skipped, 1)
  assert.ok(data.errors.some((e: string) => /没有旁白文本/.test(e)))
})
