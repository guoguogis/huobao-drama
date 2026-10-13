/**
 * 语音合成（TTS）核心链路 —— 抽出来供两处共用：
 * 1. 设置页「音色样本」合成（routes/audio.ts）
 * 2. 口播视频的逐句配音（routes/narration.ts）
 *
 * 只负责「把一段文本变成落盘的音频文件 + 实测时长」，不碰 HTTP 响应与业务校验；
 * 时长是口播音画对齐的依据，因此这里必须真的探测（而不是估算）。
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { getActiveConfig, getConfigById, type ServiceType } from './ai.js'
import {
  getTtsAdapter,
  TtsAudioUrlPending,
  type TtsAudio,
  type TtsFormat,
} from './adapters/tts.js'
import { saveUploadedFile, getAbsolutePath } from '../utils/storage.js'
import { probeDurationSeconds } from '../utils/media-probe.js'
import { logTaskStart, logTaskSuccess } from '../utils/task-logger.js'

/** 低于此字节数几乎一定是把 JSON 状态字段误解析成了音频 */
const MIN_AUDIO_BYTES = 1024

export interface SynthesizeSpeechOptions {
  text: string
  /** 音频服务配置 id；不传用当前启用的音频配置 */
  configId?: number | null
  /** 显式指定模型（同一音频配置里有多个 TTS 模型时用；不传则用配置的首个模型） */
  model?: string
  /** 音色编号（豆包 speaker / MiniMax voice_id）；不传用配置里的默认值 */
  voiceId?: string
  format?: TtsFormat
  /** 语速倍率：1.1 = 快 10%（口播项目按此对齐音画） */
  speed?: number
  emotion?: string
}

export interface SynthesizedSpeech {
  /** 站内相对路径，如 static/uploads/xxx.mp3 */
  path: string
  durationSec: number | null
  format: TtsFormat
  bytes: number
  provider: string
}

export class TtsConfigMissingError extends Error {}

/** 解析音频配置：显式 configId 优先，失效则回退当前启用配置 */
async function resolveAudioConfig(configId?: number | null) {
  const serviceType: ServiceType = 'audio'
  const config = configId
    ? (await getConfigById(Number(configId))) ?? await getActiveConfig(serviceType)
    : await getActiveConfig(serviceType)
  if (!config) {
    throw new TtsConfigMissingError('未配置音频服务，请先到「设置 → AI 服务」添加并启用音频服务')
  }
  return config
}

/**
 * 合成一段语音并落盘。
 * 失败会抛出带可读原因的错误（调用方决定是 400 还是标记任务失败）。
 */
export async function synthesizeSpeech(opts: SynthesizeSpeechOptions): Promise<SynthesizedSpeech> {
  const text = String(opts.text || '').trim()
  if (!text) throw new Error('请填写要合成的文本')
  const format: TtsFormat = String(opts.format || '').toLowerCase() === 'wav' ? 'wav' : 'mp3'
  const resolved = await resolveAudioConfig(opts.configId)
  // 顶栏可以指定具体模型：配置解析出来的是「首个模型」，用户选了别的就覆盖掉
  const explicitModel = String(opts.model || '').trim()
  const config = explicitModel ? { ...resolved, model: explicitModel } : resolved

  logTaskStart('AudioTTS', 'synthesize', {
    configId: opts.configId ?? null,
    provider: config.provider,
    model: config.model,
    chars: text.length,
    format,
    speed: opts.speed ?? null,
  })

  const adapter = getTtsAdapter(config.provider)
  const request = adapter.buildSynthesizeRequest(config, {
    text,
    voiceId: String(opts.voiceId || '').trim(),
    format,
    speed: Number(opts.speed) || undefined,
    emotion: String(opts.emotion || '').trim() || undefined,
  })

  const resp = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
    signal: AbortSignal.timeout(180_000),
  })
  const raw = await resp.text()
  if (!resp.ok) throw new Error(`语音服务返回 ${resp.status}：${raw.slice(0, 300)}`)

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
      const dl = await fetch(e.audioUrl, { signal: AbortSignal.timeout(180_000) })
      if (!dl.ok) throw new Error(`下载上游音频失败：HTTP ${dl.status}`)
      audio = { bytes: Buffer.from(await dl.arrayBuffer()), format: e.audioFormat }
    } else {
      throw e
    }
  }
  if (!audio || !audio.bytes.length) {
    const keys = parsed && typeof parsed === 'object' ? Object.keys(parsed).join(', ') : typeof parsed
    throw new Error(`语音服务未返回音频数据（响应顶层字段：${keys}）。若该接口是异步任务，请把响应原文发我，我补一个查询轮询`)
  }
  if (audio.bytes.length < MIN_AUDIO_BYTES) {
    throw new Error(`语音服务返回的数据只有 ${audio.bytes.length} 字节，不像音频（可能字段解析有误），请把响应原文发我`)
  }

  const buffer = audio.bytes.buffer.slice(audio.bytes.byteOffset, audio.bytes.byteOffset + audio.bytes.byteLength) as ArrayBuffer
  const relPath = await saveUploadedFile(buffer, 'uploads', `${randomUUID()}.${audio.format}`)
  const duration = await probeDurationSeconds(getAbsolutePath(relPath))

  logTaskSuccess('AudioTTS', 'synthesize', {
    provider: config.provider,
    path: relPath,
    bytes: audio.bytes.length,
    duration: duration === null ? null : Math.round(duration * 100) / 100,
  })

  return { path: relPath, durationSec: duration, format: audio.format, bytes: audio.bytes.length, provider: config.provider }
}

/** 删除已落盘的音频（校验不过时回收文件） */
export function removeSynthesizedSpeech(relPath: string): void {
  try {
    fs.unlinkSync(getAbsolutePath(relPath))
  } catch { /* 删不掉不影响主流程 */ }
}
