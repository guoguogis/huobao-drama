/**
 * 参考音频上传的限制校验 + 时长探测。
 *
 * 全部用**手工构造的 WAV**：时长由头部精确决定（data 字节数 / byteRate），
 * 因此不依赖 ffprobe 是否可用，结果确定。
 * 环境变量必须在 import 之前设置：STORAGE_PATH 决定文件落盘位置。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const TMP = path.join(os.tmpdir(), `huobao-audio-upload-${process.pid}-${Date.now()}`)
process.env.STORAGE_PATH = path.join(TMP, 'static')
process.env.SQLITE_PATH = path.join(TMP, 'test.sqlite3')
// 直接探测时长的用例先于任何上传执行，而上传才会顺带建目录，这里先建好
fs.mkdirSync(TMP, { recursive: true })

const { default: uploadApp } = await import('../src/routes/upload')
const { probeDurationSeconds } = await import('../src/utils/media-probe')
const limits = await import('../src/utils/audio-limits')

const UPLOADS = path.join(TMP, 'static', 'uploads')

test.after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* 句柄未释放，留在临时目录 */ }
})

/** 构造 PCM WAV；extraChunkBytes 用于在 fmt 与 data 之间插入额外块，验证分块遍历 */
function buildWav(seconds: number, sampleRate = 8000, extraChunkBytes = 0): Buffer {
  const channels = 1
  const bits = 16
  const byteRate = (sampleRate * channels * bits) / 8
  const dataSize = Math.round(byteRate * seconds)
  const extra = extraChunkBytes > 0 ? 8 + extraChunkBytes : 0

  const buf = Buffer.alloc(44 + extra + dataSize)
  buf.write('RIFF', 0, 'latin1')
  buf.writeUInt32LE(36 + extra + dataSize, 4)
  buf.write('WAVE', 8, 'latin1')
  buf.write('fmt ', 12, 'latin1')
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(channels, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(byteRate, 28)
  buf.writeUInt16LE((channels * bits) / 8, 32)
  buf.writeUInt16LE(bits, 34)

  let offset = 36
  if (extra > 0) {
    buf.write('LIST', offset, 'latin1')
    buf.writeUInt32LE(extraChunkBytes, offset + 4)
    offset += extra
  }
  buf.write('data', offset, 'latin1')
  buf.writeUInt32LE(dataSize, offset + 4)
  return buf
}

async function postAudio(buffer: Buffer, filename: string, type: string) {
  const form = new FormData()
  form.append('file', new File([buffer], filename, { type }))
  const res = await uploadApp.request('/audio', { method: 'POST', body: form })
  return { status: res.status, body: await res.json() as any }
}

// ─── 限制常量（与需求一致，防止静默漂移）─────────────────────────

test('参考音频限制常量：格式 / 体积 / 单段时长 / 段数 / 总时长 / 请求体', () => {
  assert.deepEqual([...limits.AUDIO_EXT].sort(), ['.mp3', '.wav'])
  assert.equal(limits.AUDIO_MAX_BYTES, 10 * 1024 * 1024)
  assert.equal(limits.AUDIO_MIN_SECONDS, 2)
  assert.equal(limits.AUDIO_MAX_SECONDS, 10)
  assert.equal(limits.AUDIO_TOTAL_MAX_SECONDS, 15)
  assert.equal(limits.REQUEST_BODY_MAX_BYTES, 64 * 1024 * 1024)
  // 段数上限按模型取：多个角色说话 → 多段音色
  assert.equal(limits.AUDIO_MAX_CLIPS, 3)
  assert.equal(limits.AUDIO_MAX_CLIPS_WAN, 5)
  assert.equal(limits.audioMaxClipsFor('doubao-seedance-2-0-fast-260128'), 3)
  assert.equal(limits.audioMaxClipsFor('MiniMax-H3'), 3)
  assert.equal(limits.audioMaxClipsFor('wan3.0-video'), 5)
  assert.equal(limits.audioMaxClipsFor('wan3.0-video-prime'), 5)
  assert.equal(limits.audioMaxClipsFor(null), 3)

  // 文案里要带上这些数字，前端报错才能自解释
  assert.match(limits.AUDIO_LIMITS_TEXT, /mp3 \/ wav/)
  assert.match(limits.AUDIO_LIMITS_TEXT, /2–10 秒/)
  assert.match(limits.AUDIO_LIMITS_TEXT, /总时长不超过 15 秒/)
  assert.match(limits.AUDIO_LIMITS_TEXT, /10MB/)
})

// ─── 时长探测 ────────────────────────────────────────────────────

test('WAV 时长由头部精确算出：2 / 3 / 10 秒', async () => {
  for (const seconds of [2, 3, 10]) {
    const file = path.join(TMP, `probe-${seconds}.wav`)
    fs.writeFileSync(file, buildWav(seconds))
    const probed = await probeDurationSeconds(file)
    assert.ok(probed !== null, `${seconds}s 应能探测到时长`)
    assert.ok(Math.abs(probed! - seconds) < 0.01, `${seconds}s 实际探测 ${probed}`)
  }
})

test('WAV 分块遍历：data 前夹 LIST 块也能算对（不能假定 data 紧跟 44 字节头）', async () => {
  const file = path.join(TMP, 'probe-extra-chunk.wav')
  fs.writeFileSync(file, buildWav(3, 8000, 24))
  const probed = await probeDurationSeconds(file)
  assert.ok(probed !== null && Math.abs(probed - 3) < 0.01, `实际探测 ${probed}`)
})

test('非 WAV / 不存在的文件探测返回 null（不抛错）', async () => {
  assert.equal(await probeDurationSeconds(path.join(TMP, 'nope.wav')), null)
  const junk = path.join(TMP, 'junk.wav')
  fs.writeFileSync(junk, Buffer.from('not a wav at all, padding padding padding'))
  assert.equal(await probeDurationSeconds(junk), null)
})

// ─── 上传校验 ────────────────────────────────────────────────────

test('合格音频：3 秒 WAV 接受，并回传 duration 供前端汇总', async () => {
  const { status, body } = await postAudio(buildWav(3), 'voice.wav', 'audio/wav')
  assert.equal(status, 200)
  assert.match(body.data.path, /^static\/uploads\/.+\.wav$/)
  assert.ok(Math.abs(body.data.duration - 3) < 0.01, `duration=${body.data.duration}`)
  assert.ok(fs.existsSync(path.join(TMP, body.data.path)))
})

test('时长越界：1 秒（下限外）与 11 秒（上限外）都拒绝，且不留下孤儿文件', async () => {
  const before = fs.existsSync(UPLOADS) ? fs.readdirSync(UPLOADS).length : 0

  const short = await postAudio(buildWav(1), 'short.wav', 'audio/wav')
  assert.equal(short.status, 400)
  assert.match(short.body.message, /1 秒，需在 2–10 秒之间/)

  const long = await postAudio(buildWav(11), 'long.wav', 'audio/wav')
  assert.equal(long.status, 400)
  assert.match(long.body.message, /11 秒，需在 2–10 秒之间/)

  // 被拒的文件必须删掉，否则 static/uploads 会堆永远用不上的素材
  assert.equal(fs.readdirSync(UPLOADS).length, before)
})

test('边界值：恰好 2 秒与 10 秒都接受', async () => {
  assert.equal((await postAudio(buildWav(2), 'min.wav', 'audio/wav')).status, 200)
  assert.equal((await postAudio(buildWav(10), 'max.wav', 'audio/wav')).status, 200)
})

test('格式限制：只收 mp3 / wav，m4a 与 aac 一律拒绝（上游不收）', async () => {
  for (const [name, type] of [['voice.m4a', 'audio/mp4'], ['voice.aac', 'audio/aac'], ['voice.mp4', 'video/mp4']]) {
    const { status, body } = await postAudio(Buffer.alloc(64), name, type)
    assert.equal(status, 400, `${name} 应被拒绝`)
    assert.match(body.message, /仅支持 mp3 \/ wav/)
  }
})

test('体积限制：超过 10MB 拒绝', async () => {
  // 体积校验在时长探测之前，构造一个必然超限的 WAV 即可
  const big = Buffer.concat([buildWav(1), Buffer.alloc(11 * 1024 * 1024)])
  const { status, body } = await postAudio(big, 'big.wav', 'audio/wav')
  assert.equal(status, 400)
  assert.match(body.message, /单文件不超过 10MB（当前 11\.0MB）/)
})

test('缺文件时报错', async () => {
  const res = await uploadApp.request('/audio', { method: 'POST', body: new FormData() })
  assert.equal(res.status, 400)
})

test('参考视频上传不受音频限制影响（仍收 mp4 且上限 50MB）', async () => {
  const form = new FormData()
  form.append('file', new File([Buffer.alloc(1024)], 'clip.mp4', { type: 'video/mp4' }))
  const res = await uploadApp.request('/video', { method: 'POST', body: form })
  assert.equal(res.status, 200)
})
