/**
 * 口播字幕：时间轴复用 + 独立编辑 + 硬烧 / 软字幕两条产物。
 *
 * 关键契约：
 * 1) 字幕行**必须**从成片时间轴（video_merges.timeline）生成——合并时每段被强制到实测时长，
 *    字幕自己再算一遍就会和画面漂移；
 * 2) 生成后字幕**独立编辑**，改字幕不改配音与画面；
 * 3) 硬烧 = 视频重编码（字幕进像素）+ 音频 copy；软字幕 = 视频/音频 copy + mov_text 轨；
 * 4) 长句按标点/字数拆行，时间按字符数比例分配（中文语速近似均匀）。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-subtitle-'))
process.env.SQLITE_PATH = path.join(tmpDir, 'test.sqlite3')
process.env.STORAGE_PATH = path.join(tmpDir, 'static')
process.env.MYSQL_AUTO_IMPORT = 'false'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const ffmpeg = require('ffmpeg-static') as string

// 纯函数（SRT/拆行/时间）都在 service 里；路由只导出 normalizeStyle 与 app
const { formatSrtTime, wrapText, buildLines, toSrt } = await import('../src/services/subtitles')
const { normalizeStyle } = await import('../src/routes/subtitles')
const subtitlesRoute = (await import('../src/routes/subtitles')).default
const { db, schema, getInsertId } = await import('../src/db/index')
const { eq } = await import('drizzle-orm')

/** 造一个 2 秒的极小成片，供真实烧字幕用 */
function makeTinyVideo(absPath: string) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true })
  execFileSync(ffmpeg, ['-hide_banner', '-y', '-f', 'lavfi', '-i', 'color=c=0x223344:s=320x180:d=2:r=12',
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', absPath], { stdio: 'ignore' })
}

async function setup(withVideo = true) {
  const ts = new Date().toISOString()
  const dramaId = getInsertId(db.insert(schema.dramas).values({
    title: `字幕项目 ${Math.random()}`, projectType: 'narration', createdAt: ts, updatedAt: ts,
  }).run())
  const epId = getInsertId(db.insert(schema.episodes).values({
    dramaId, episodeNumber: 1, title: 'ep', resolution: '720p', createdAt: ts, updatedAt: ts,
  }).run())
  const rel = 'static/videos/tiny.mp4'
  if (withVideo) makeTinyVideo(path.join(process.env.STORAGE_PATH!, 'videos', 'tiny.mp4'))
  const timeline = [
    { shot_id: 101, shot_number: 1, start: 0, end: 2.5, duration: 2.5, text: '第一句旁白' },
    { shot_id: 102, shot_number: 2, start: 2.5, end: 6, duration: 3.5, text: '第二句：这是一句比较长的旁白，需要在标点处拆成多行显示，避免一屏塞满文字看不清。' },
  ]
  const mergeId = getInsertId(db.insert(schema.videoMerges).values({
    episodeId: epId, dramaId, title: '口播成片', provider: 'ffmpeg', model: 'ffmpeg-narration-retimed',
    status: 'completed', mergedUrl: rel, duration: 6, timeline: JSON.stringify(timeline),
    completedAt: ts, createdAt: ts,
  }).run())
  return { dramaId, epId, mergeId, timeline }
}

test('时长与 SRT 格式化', () => {
  assert.equal(formatSrtTime(0), '00:00:00,000')
  assert.equal(formatSrtTime(3661.5), '01:01:01,500')
  assert.equal(formatSrtTime(-5), '00:00:00,000')
})

test('长句拆行：优先在标点处断，时间按字符数比例分配', () => {
  assert.deepEqual(wrapText('短句', 20), ['短句'])
  const parts = wrapText('这是第一小句，这是第二小句，这是第三小句，这是第四小句。', 10)
  assert.ok(parts.length >= 3, `应拆成多行，实际 ${JSON.stringify(parts)}`)
  for (const p of parts) assert.ok(p.length <= 11, `每行不应超过上限：${p}`)
  assert.ok(parts.every(p => p.length > 0))

  const lines = buildLines([{ start: 0, end: 9, text: '啊啊啊啊啊啊啊啊啊啊，啊啊啊啊啊啊啊啊啊啊。' }], { maxChars: 10 })
  assert.equal(lines.length, 2)
  // 两行字符数相同 → 时间应大致对半
  assert.ok(Math.abs((lines[0].end - lines[0].start) - 4.5) < 1.2, `首行时长 ${lines[0].end - lines[0].start}`)
  assert.equal(lines[lines.length - 1].end, 9, '最后一行要落在整句结束时间')
  // 换行时间不重叠
  assert.ok(lines[0].end <= lines[1].start + 0.001)
})

test('样式白名单与夹取（前端塞脏值也不会打穿）', () => {
  const s = normalizeStyle({ maxChars: 999, fontSize: -5, outline: 99, offsetSec: 100, marginV: -3, foo: 'bar' })
  assert.equal(s.maxChars, 60)
  assert.equal(s.fontSize, 8)
  assert.equal(s.outline, 6)
  assert.equal(s.offsetSec, 30)
  assert.equal(s.marginV, 0)
  assert.equal((s as any).foo, undefined)
})

test('字幕行由成片时间轴生成（复用同一份，不自己算）', async () => {
  const { dramaId, mergeId, timeline } = await setup()
  const res = await subtitlesRoute.request(`/${dramaId}/subtitles?merge_id=${mergeId}`)
  assert.equal(res.status, 200)
  const data = (await res.json() as any).data
  assert.equal(data.merge.timeline.length, 2)
  // 第一句 6 字 → 1 行；第二句 44 字（maxChars 20）→ 3 行，共 4 行
  assert.equal(data.lines.length, 4, '按每行 20 字拆行，行数应为 4')
  assert.equal(data.lines[0].start, 0)
  assert.equal(data.lines[0].end, 2.5, '第一行正好是第一句的时长')
  assert.equal(data.lines[1].start, 2.5, '第二句从 2.5s 开始（与时间轴一致）')
  assert.equal(data.lines[data.lines.length - 1].end, 6)
  assert.ok(data.lines.every((l: any) => l.shot_id))
  assert.equal(data.status, 'draft')
})

test('字幕独立编辑：改了字幕，旁白与时间轴不受影响', async () => {
  const { dramaId, mergeId, timeline } = await setup()
  const first = (await (await subtitlesRoute.request(`/${dramaId}/subtitles?merge_id=${mergeId}`)).json() as any).data
  const edited = first.lines.map((l: any, i: number) => ({ ...l, text: i === 0 ? '改过的第一句' : l.text }))
  const put = await subtitlesRoute.request(`/${dramaId}/subtitles`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merge_id: mergeId, lines: edited, style: { ...first.style, fontSize: 26, offsetSec: 0.4 } }),
  })
  assert.equal(put.status, 200)
  const after = (await put.json() as any).data
  assert.equal(after.lines[0].text, '改过的第一句')
  assert.equal(after.style.fontSize, 26)
  assert.equal(after.style.offsetSec, 0.4)

  // 成片时间轴（进而旁白与画面）没有被字幕编辑改动
  const [merge] = await db.select().from(schema.videoMerges).where(eq(schema.videoMerges.id, mergeId))
  assert.deepEqual(JSON.parse(merge.timeline!), timeline)

  // 偏移只体现在 SRT 上，不改动存的字幕行时间
  const srt = toSrt(after.lines, after.style.offsetSec)
  assert.match(srt, /00:00:00,400 --> 00:00:02,900/, '偏移 0.4s 生效')
  assert.equal(after.lines[0].start, 0, '存的仍是原始时间')
})

test('真实渲染：硬烧字幕 + 软字幕都产出可播放文件', async () => {
  const { dramaId, mergeId } = await setup()
  await subtitlesRoute.request(`/${dramaId}/subtitles?merge_id=${mergeId}`)
  const res = await subtitlesRoute.request(`/${dramaId}/subtitles/render`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merge_id: mergeId, burn: true, soft: true }),
  })
  assert.equal(res.status, 201)
  const start = (await res.json() as any).data
  assert.ok(start.srt_url.endsWith('.srt'))
  assert.match(start.srt_url, /^\/static\/subtitles\//)

  // SRT 落盘且是 UTF-8 无 BOM
  const srtAbs = path.join(process.env.STORAGE_PATH!, start.srt_url.replace('/static/', ''))
  assert.ok(fs.existsSync(srtAbs), 'SRT 应落盘')
  const buf = fs.readFileSync(srtAbs)
  assert.notEqual(buf[0], 0xef, 'SRT 不应带 BOM（libass 兼容性）')
  const srtText = buf.toString('utf8')
  assert.match(srtText, /1\n00:00:00,000 --> 00:00:02,500\n第一句旁白/)

  // 等异步渲染结束（极小视频，几秒内）
  let row: any = null
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500))
    const [r2] = await db.select().from(schema.narrationSubtitles).where(eq(schema.narrationSubtitles.mergeId, mergeId))
    row = r2
    if (row && (row.status === 'ready' || row.status === 'failed')) break
  }
  assert.equal(row.status, 'ready', `渲染应成功，实际 ${row.status}：${row.errorMsg || ''}`)
  assert.ok(row.burnedPath && row.softPath, '两个产物路径都要写入')
  const burned = path.join(process.env.STORAGE_PATH!, row.burnedPath.replace('static/', ''))
  const soft = path.join(process.env.STORAGE_PATH!, row.softPath.replace('static/', ''))
  assert.ok(fs.statSync(burned).size > 1000, '硬烧成片应有内容')
  assert.ok(fs.statSync(soft).size > 1000, '软字幕成片应有内容')

  // 软字幕版里应存在字幕轨（mov_text），硬烧版视频被重编码但音频保留
  const probe = (file: string) => execFileSync(require('ffprobe-static').path,
    ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-of', 'csv=p=0', file]).toString()
  // ffprobe 的 csv 输出顺序是 codec_name,codec_type（别写反）
  const softStreams = probe(soft)
  assert.match(softStreams, /mov_text,subtitle/, `软字幕版应有 mov_text 字幕轨，实际：${softStreams}`)
  const burnedStreams = probe(burned)
  assert.match(burnedStreams, /h264,video/)
  assert.match(burnedStreams, /aac,audio/)
  assert.doesNotMatch(burnedStreams, /subtitle/, '硬烧版不应残留字幕轨（已烧进画面）')
})

test('未完成的成片不能加字幕；不存在的成片返回 404', async () => {
  const { dramaId, mergeId } = await setup()
  const ts = new Date().toISOString()
  await db.update(schema.videoMerges).set({ status: 'processing', mergedUrl: null }).where(eq(schema.videoMerges.id, mergeId))
  const bad = await subtitlesRoute.request(`/${dramaId}/subtitles?merge_id=${mergeId}`)
  assert.equal(bad.status, 400)
  assert.match((await bad.json() as any).message, /还没有完成合并/)

  await db.update(schema.videoMerges).set({ status: 'completed', mergedUrl: 'static/videos/tiny.mp4', completedAt: ts }).where(eq(schema.videoMerges.id, mergeId))
  const missing = await subtitlesRoute.request(`/${dramaId}/subtitles?merge_id=999999`)
  assert.equal(missing.status, 404)
})
