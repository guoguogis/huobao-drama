/**
 * 音频（TTS）路由
 *
 * 单独一个入口：拿「已配置的音频服务 + 音色编号」合成一段音色样本，
 * 落盘后返回可写入 characters.voice_audio_url 的相对路径。
 * 产物与手工上传走**同一套限制**（utils/audio-limits.ts），保证不会出现
 * 「能生成但上传校验会拒」的不一致。
 */
import { Hono } from 'hono'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { success, badRequest, now } from '../utils/response.js'
import { getActiveConfig, getConfigById, type ServiceType } from '../services/ai.js'
import { getTtsAdapter, listTtsProviders, TTS_TEXT_MAX_CHARS, TtsAudioUrlPending, type TtsAudio, type TtsFormat } from '../services/adapters/tts.js'
import { saveUploadedFile, getAbsolutePath } from '../utils/storage.js'
import { probeDurationSeconds } from '../utils/media-probe.js'
import {
  AUDIO_MAX_BYTES,
  AUDIO_MIN_SECONDS,
  AUDIO_MAX_SECONDS,
  AUDIO_LIMITS_TEXT,
  TTS_ONLY_FORMATS,
  formatSeconds,
  roundSeconds,
} from '../utils/audio-limits.js'
import { logTaskStart, logTaskSuccess, logTaskError, logTaskWarn } from '../utils/task-logger.js'

const app = new Hono()

/** 音频体积下限：低于此值几乎一定是把 JSON 状态字段误解析成了音频 */
const MIN_AUDIO_BYTES = 1024

// GET /audio/providers — 支持的服务商与所需配置字段（前端据此渲染表单提示）
app.get('/providers', (c) => {
  return success(c, {
    providers: listTtsProviders(),
    // settings 里各服务商需要的额外字段；voice_type / voice_id 都是「音色编号」
    fields: {
      volcengine: [
        { key: 'appid', label: 'App ID', required: true },
        { key: 'cluster', label: 'Cluster', required: false, placeholder: 'volcano_tts' },
        { key: 'voice_type', label: '默认音色编号', required: false, placeholder: 'BV700_streaming' },
      ],
      minimax: [
        { key: 'voice_id', label: '默认音色编号', required: false, placeholder: 'male-qn-qingse' },
      ],
    },
    text_max_chars: TTS_TEXT_MAX_CHARS,
    limits: AUDIO_LIMITS_TEXT,
    formats: TTS_ONLY_FORMATS,
  })
})

// POST /audio/synthesize — { config_id?, voice_id, text, format?, speed? }
app.post('/synthesize', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const text = String(body.text || '').trim()
  if (!text) return badRequest(c, '请填写要合成的文本')
  if (text.length > TTS_TEXT_MAX_CHARS) {
    return badRequest(c, `文本过长（${text.length} 字），请控制在 ${TTS_TEXT_MAX_CHARS} 字以内`)
  }

  const format: TtsFormat = String(body.format || '').toLowerCase() === 'wav' ? 'wav' : 'mp3'

  // 配置解析：指定 config_id 优先，失效则回退到当前启用的音频配置
  const serviceType: ServiceType = 'audio'
  const config = body.config_id
    ? (await getConfigById(Number(body.config_id))) ?? await getActiveConfig(serviceType)
    : await getActiveConfig(serviceType)
  if (!config) {
    return badRequest(c, '未配置音频服务，请先到「设置 → AI 服务」添加并启用音频服务')
  }

  logTaskStart('AudioTTS', 'synthesize', {
    configId: body.config_id ?? null,
    provider: config.provider,
    model: config.model,
    chars: text.length,
    format,
  })

  try {
    const adapter = getTtsAdapter(config.provider)
    const request = adapter.buildSynthesizeRequest(config, {
      text,
      voiceId: String(body.voice_id || '').trim(),
      format,
      speed: Number(body.speed) || undefined,
      emotion: String(body.emotion || '').trim() || undefined,
    })

    const resp = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(120_000),
    })
    const raw = await resp.text()
    if (!resp.ok) {
      throw new Error(`语音服务返回 ${resp.status}：${raw.slice(0, 300)}`)
    }
    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error(`语音服务返回的不是 JSON：${raw.slice(0, 200)}`)
    }

    // 取音频：可能是内联 base64/hex，也可能是音频 URL（下载后再落盘）
    let audio: TtsAudio | null = null
    try {
      audio = adapter.extractAudio(parsed, format)
    } catch (e) {
      if (e instanceof TtsAudioUrlPending) {
        const dl = await fetch(e.audioUrl, { signal: AbortSignal.timeout(120_000) })
        if (!dl.ok) throw new Error(`下载上游音频失败：HTTP ${dl.status}`)
        audio = { bytes: Buffer.from(await dl.arrayBuffer()), format: e.audioFormat }
      } else {
        throw e
      }
    }
    if (!audio || !audio.bytes.length) {
      // 把响应形状带出来：若上游其实是异步任务（只返回 task id），据此就能补上轮询
      const keys = parsed && typeof parsed === 'object' ? Object.keys(parsed).join(', ') : typeof parsed
      throw new Error(
        `语音服务未返回音频数据（响应顶层字段：${keys}）。` +
        `若该接口是异步任务，请把响应原文发我，我补一个查询轮询`,
      )
    }
    // 兜底：远小于 1KB 的「音频」几乎一定是把 JSON 字段误当成了音频
    if (audio.bytes.length < MIN_AUDIO_BYTES) {
      throw new Error(`语音服务返回的数据只有 ${audio.bytes.length} 字节，不像音频（可能字段解析有误），请把响应原文发我`)
    }
    if (audio.bytes.length > AUDIO_MAX_BYTES) {
      throw new Error(`生成的音频 ${(audio.bytes.length / 1024 / 1024).toFixed(1)}MB 超过 ${Math.round(AUDIO_MAX_BYTES / 1024 / 1024)}MB 上限`)
    }

    // 落盘：文件名用 uuid（与上传链路一致，原名不参与）
    const buffer = audio.bytes.buffer.slice(audio.bytes.byteOffset, audio.bytes.byteOffset + audio.bytes.byteLength) as ArrayBuffer
    const path = await saveUploadedFile(buffer, 'uploads', `${randomUUID()}.${audio.format}`)
    const duration = await probeDurationSeconds(getAbsolutePath(path))

    // 与上传侧同一套时长限制：超限则删文件并给出可操作的提示（文本长短决定时长）
    if (duration !== null && (duration < AUDIO_MIN_SECONDS || duration > AUDIO_MAX_SECONDS)) {
      try { fs.unlinkSync(getAbsolutePath(path)) } catch { /* 删不掉不影响返回 */ }
      return badRequest(
        c,
        `生成的音频为 ${formatSeconds(duration)}，需在 ${AUDIO_MIN_SECONDS}–${AUDIO_MAX_SECONDS} 秒之间，请调整文本长度后重试`,
      )
    }
    if (duration === null) {
      logTaskWarn('AudioTTS', 'duration-unknown', { path })
    }

    logTaskSuccess('AudioTTS', 'synthesize', {
      provider: config.provider,
      path,
      bytes: audio.bytes.length,
      duration: duration === null ? null : roundSeconds(duration),
    })

    return success(c, {
      path,
      url: `/${path}`,
      duration: duration === null ? null : roundSeconds(duration),
      format: audio.format,
      bytes: audio.bytes.length,
      provider: config.provider,
      created_at: now(),
    })
  } catch (e: any) {
    logTaskError('AudioTTS', 'synthesize', { error: e?.message })
    return badRequest(c, e?.message || '语音合成失败')
  }
})

export default app
