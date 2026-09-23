import fs from 'fs'
import { Hono } from 'hono'
import { success, badRequest } from '../utils/response.js'
import { saveUploadedFile, generateImageThumb, getAbsolutePath } from '../utils/storage.js'
import { probeDurationSeconds } from '../utils/media-probe.js'
import { logTaskWarn } from '../utils/task-logger.js'
import {
  AUDIO_EXT,
  AUDIO_MIME,
  AUDIO_MAX_BYTES,
  AUDIO_MIN_SECONDS,
  AUDIO_MAX_SECONDS,
  AUDIO_LIMITS_TEXT,
  formatSeconds,
  roundSeconds,
} from '../utils/audio-limits.js'

const app = new Hono()

// POST /upload/image
app.post('/image', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    return badRequest(c, '文件必填')
  }

  const buffer = await file.arrayBuffer()
  const path = await saveUploadedFile(buffer, 'uploads', file.name)
  // 同步生成列表页缩略图，上传图与生图走同一套展示链路（失败不影响上传结果）
  await generateImageThumb(path)
  return success(c, { url: `/${path}`, path })
})

const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm', '.m4v'])
const VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'])
const VIDEO_MAX = 50 * 1024 * 1024 // 50MB

// 音频的格式/体积/时长限制统一在 utils/audio-limits.ts（与任务创建侧共用同一组常量）

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

async function saveMediaUpload(
  c: any,
  kind: 'video' | 'audio',
  allowedExt: Set<string>,
  allowedMime: Set<string>,
  maxBytes: number,
) {
  const body = await c.req.parseBody()
  const file = body['file']
  if (!file || !(file instanceof File)) {
    return badRequest(c, '文件必填')
  }
  const label = kind === 'video' ? '视频' : '音频'
  const ext = extOf(file.name)
  // MIME 可伪造，扩展名兜底；空 / octet-stream 视为未知类型，仅按扩展名校验
  const mimeKnown = file.type && file.type !== 'application/octet-stream'
  if (!allowedExt.has(ext) || (mimeKnown && !allowedMime.has(file.type))) {
    return badRequest(c, `仅支持 ${Array.from(allowedExt).join('/')} 格式的${label}文件`)
  }
  const buffer = await file.arrayBuffer()
  if (buffer.byteLength > maxBytes) {
    return badRequest(c, `${label}文件大小不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB`)
  }
  const path = await saveUploadedFile(buffer, 'uploads', file.name)
  return success(c, { url: `/${path}`, path })
}

// POST /upload/video — 参考视频上传（Seedance 多模态参考用）
app.post('/video', async (c) => saveMediaUpload(c, 'video', VIDEO_EXT, VIDEO_MIME, VIDEO_MAX))

/**
 * POST /upload/audio — 参考音频上传（角色音色样本）
 *
 * 三重校验，且与任务创建侧共用 utils/audio-limits.ts 的同一组常量：
 * 格式（mp3/wav）→ 体积（≤10MB）→ 时长（2–10s，上游也要求单段 ≥2s）。
 * 时长不合格时删除已落盘文件，避免留下永远用不上的孤儿文件。
 */
app.post('/audio', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  if (!file || !(file instanceof File)) return badRequest(c, '文件必填')

  const ext = extOf(file.name)
  const mimeKnown = file.type && file.type !== 'application/octet-stream'
  if (!AUDIO_EXT.has(ext) || (mimeKnown && !AUDIO_MIME.has(file.type))) {
    return badRequest(c, `参考音频${AUDIO_LIMITS_TEXT}`)
  }

  const buffer = await file.arrayBuffer()
  if (buffer.byteLength > AUDIO_MAX_BYTES) {
    return badRequest(c, `参考音频${AUDIO_LIMITS_TEXT}（当前 ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB）`)
  }

  const path = await saveUploadedFile(buffer, 'uploads', file.name)
  const absPath = getAbsolutePath(path)
  const duration = await probeDurationSeconds(absPath)

  if (duration === null) {
    // 探测失败（mp3 且 ffprobe 不可用）不拦上传：上游自己会校验，这里只留痕
    logTaskWarn('Upload', 'audio-duration-unknown', { path })
    return success(c, { url: `/${path}`, path, duration: null })
  }
  if (duration < AUDIO_MIN_SECONDS || duration > AUDIO_MAX_SECONDS) {
    try { fs.unlinkSync(absPath) } catch { /* 删不掉也不影响返回 */ }
    return badRequest(
      c,
      `参考音频时长为 ${formatSeconds(duration)}，需在 ${AUDIO_MIN_SECONDS}–${AUDIO_MAX_SECONDS} 秒之间`,
    )
  }

  return success(c, { url: `/${path}`, path, duration: roundSeconds(duration) })
})

export default app
