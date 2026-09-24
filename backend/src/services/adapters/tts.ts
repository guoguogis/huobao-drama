/**
 * TTS（语音合成）适配器
 *
 * 用途：在角色资产里用「已配置的音频服务 + 音色编号」直接生成音色样本，
 * 免去手工准备 mp3/wav。产物与手工上传走同一条校验与存储链路。
 *
 * 已支持（两家协议差异很大，各自成段）：
 *
 * - `volcengine` 豆包语音 / Seed Speech（Audio 1.0）：
 *   `POST {base}/api/v3/tts/create`，鉴权 `X-Api-Key: <api_key>`（就是配置里的 api_key，
 *   不需要 appid/cluster）。音色编号 = `references[0].speaker`（speaker_id，来自声音复刻）。
 *   请求体形如：
 *     { model, text_prompt, references: [{ speaker }],
 *       audio_config: { format, sample_rate, pitch_rate, speech_rate, loudness_rate }, watermark: {} }
 *
 * - `minimax`：`POST {base}/v1/t2a_v2`，Bearer key；音色编号 = `voice_id`。
 *   注意其返回是 **hex** 编码（不是 base64），见 extractAudio。
 *
 * 说明：两家文档对「音色编号」的叫法不同（speaker / voice_id），
 * 本项目统一由用户在界面上贴入，适配器只负责透传到正确字段。
 */
import type { AIConfig, ProviderRequest } from './types'
import { joinProviderUrl } from './url'
import { parseConfigSettings } from '../ai.js'

export type TtsFormat = 'mp3' | 'wav'

export interface TtsParams {
  text: string
  /** 音色编号（用户贴入）：豆包为 speaker_id，MiniMax 为 voice_id */
  voiceId: string
  format?: TtsFormat
  /** 语速倍率，1.0 为原速 */
  speed?: number
  /** 情绪（MiniMax 支持，如 happy/sad/angry/fearful/disgusted/surprised/neutral）；留空则不下发 */
  emotion?: string
}

export interface TtsAudio {
  bytes: Buffer
  format: TtsFormat
}

export interface TtsProviderAdapter {
  provider: string
  buildSynthesizeRequest(config: AIConfig, params: TtsParams): ProviderRequest
  /** 从响应里取出音频；取不到返回 null（由调用方报错） */
  extractAudio(result: any, format: TtsFormat): TtsAudio | null
}

/** 文本长度上限：超长请分段（本项目音色样本只需几秒） */
export const TTS_TEXT_MAX_CHARS = 300

/** 多音字覆盖列表：既接受字符串数组，也接受换行/逗号分隔的单个字符串 */
function normalizeToneList(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : String(value ?? '').split(/[\n,]/)
  return raw
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 100)
}

function normalizeFormat(format?: string | null): TtsFormat {
  return String(format || '').toLowerCase() === 'wav' ? 'wav' : 'mp3'
}

/**
 * 解码音频载荷。
 *
 * 不做「是 hex 还是 base64」的猜测：两家协议各自确定（豆包 base64、MiniMax hex），
 * 猜测会在纯 hex 字符集的 base64 上误判。因此由各适配器显式指定编码。
 */
function decodeAudio(value: unknown, encoding: 'base64' | 'hex'): Buffer | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const raw = value.trim()
  // data URL 形式（data:audio/mpeg;base64,...）也接受
  const dataUrl = raw.match(/^data:audio\/[^;]+;base64,(.+)$/i)
  const payload = dataUrl ? dataUrl[1] : raw
  try {
    if (encoding === 'hex') {
      if (payload.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(payload)) return null
      return Buffer.from(payload, 'hex')
    }
    return Buffer.from(payload, 'base64')
  } catch {
    return null
  }
}

/**
 * 从响应里找出音频载荷。
 *
 * 字段名各家不一，所以既看「语义明确的键」也做兜底扫描；但两者标准不同：
 * - 键名里带 audio 的（audio / audio_base64 / audio_url ...）→ **可信**，长度不限；
 * - 其它键（data / content / result 等）→ 必须足够长（≥512 字符）才当作音频，
 *   否则 `{"data":"abc123"}`、`{"status":"ok"}` 这类短状态字段会被误判成音频。
 */
const AUDIO_KEY_RE = /audio/i

function findAudioPayload(node: any, depth = 0, trusted = false): { base64?: string; url?: string } {
  if (node == null || depth > 4) return {}
  if (typeof node === 'string') {
    if (/^https?:\/\//i.test(node)) return { url: node }
    if (/^data:audio\//i.test(node)) return { base64: node }
    if ((trusted || node.length >= 512) && /^[A-Za-z0-9+/=]+$/.test(node)) return { base64: node }
    return {}
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findAudioPayload(item, depth + 1, trusted)
      if (hit.base64 || hit.url) return hit
    }
    return {}
  }
  if (typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (value == null) continue
      const hit = findAudioPayload(value, depth + 1, AUDIO_KEY_RE.test(key))
      if (hit.base64 || hit.url) return hit
    }
  }
  return {}
}

/** 上游报错时的可读描述（各家错误字段不统一，尽量都覆盖） */
export function describeTtsError(result: any): string | null {
  const code = result?.code ?? result?.status_code ?? result?.base_resp?.status_code
  const msg = result?.message ?? result?.msg ?? result?.Message
    ?? result?.base_resp?.status_msg ?? result?.error?.message ?? result?.error
  // code 为空或 0/3000 视为成功
  const codeOk = code === undefined || code === null || code === 0 || code === 3000 || code === '0'
  if (codeOk && !msg) return null
  if (codeOk && msg && /success|ok/i.test(String(msg))) return null
  if (!codeOk) return `${code ? `[${code}] ` : ''}${msg || JSON.stringify(result).slice(0, 300)}`
  return null
}

/**
 * 把常见上游错误翻译成可操作的下一步。
 * 典型：豆包报 `speaker xxx not found in speaker_map`——用户多半是填了别家的音色编号
 * （如 MiniMax 的 voice_id）。豆包留空音色编号即可用默认音色（实测可正常出音）。
 */
export function actionableTtsHint(message: string): string {
  if (/not found in speaker_map|45001115/i.test(message)) {
    return '：该音色编号不属于豆包语音。豆包需要「声音复刻」生成的 speaker_id；' +
      '若想使用默认音色，把音色编号留空即可（留空时不传 references）。'
  }
  if (/Invalid X-Api-Key|45000010/i.test(message)) {
    return '：API Key 无效。请确认用的是该服务商的 Key（豆包/方舟与 MiniMax 的 Key 不通用）。'
  }
  return ''
}

class VolcengineTtsAdapter implements TtsProviderAdapter {
  provider = 'volcengine'

  buildSynthesizeRequest(config: AIConfig, params: TtsParams): ProviderRequest {
    const settings = parseConfigSettings((config as any).settings)
    // 音色编号：界面传入优先，其次配置默认值（speaker 为新契约，voice_type 兼容旧写法）
    const speaker = String(params.voiceId || settings.speaker || settings.voice_type || '').trim()
    const format = normalizeFormat(params.format)
    const model = config.model || 'seed-audio-1.0'

    const body: Record<string, any> = {
      model,
      text_prompt: params.text,
      audio_config: {
        format,
        sample_rate: Number(settings.sample_rate) || 48000,
        pitch_rate: 0,
        speech_rate: 0,
        loudness_rate: 0,
      },
      watermark: {},
    }
    // speaker 可留空：留空时不传 references，交给上游用默认音色
    if (speaker) body.references = [{ speaker }]

    return {
      url: joinProviderUrl(config.baseUrl, '/api/v3', '/tts/create'),
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': config.apiKey },
      body,
    }
  }

  extractAudio(result: any, format: TtsFormat): TtsAudio | null {
    const error = describeTtsError(result)
    if (error) throw new Error(`豆包语音返回错误 ${error}${actionableTtsHint(error)}`)

    const hit = findAudioPayload(result)
    if (hit.base64) {
      const bytes = decodeAudio(hit.base64, 'base64')
      if (bytes) return { bytes, format }
    }
    if (hit.url) {
      // 有的实现返回音频 URL：交给调用方下载（用特殊字段标记，避免在这里发网络请求）
      throw new TtsAudioUrlPending(hit.url, format)
    }
    return null
  }
}

/** 上游返回的是音频 URL 而非内联数据：由调用方下载 */
export class TtsAudioUrlPending extends Error {
  constructor(public audioUrl: string, public audioFormat: TtsFormat) {
    super(`上游返回音频 URL：${audioUrl}`)
  }
}

class MinimaxTtsAdapter implements TtsProviderAdapter {
  provider = 'minimax'

  buildSynthesizeRequest(config: AIConfig, params: TtsParams): ProviderRequest {
    const settings = parseConfigSettings((config as any).settings)
    const voiceId = String(params.voiceId || settings.voice_id || '').trim()
    if (!voiceId) {
      throw new Error('请填写音色编号（MiniMax 的 voice_id）')
    }
    const model = config.model || 'speech-2.8-hd'
    const format = normalizeFormat(params.format)

    // emotion：界面传入优先，其次配置默认；都没有就不下发（并非所有音色/模型都支持）
    const emotion = String(params.emotion || settings.emotion || '').trim()

    const body: Record<string, any> = {
      model,
      text: params.text,
      stream: false,
      voice_setting: {
        voice_id: voiceId,
        speed: Number.isFinite(params.speed) ? params.speed : 1.0,
        vol: 1.0,
        pitch: 0,
        ...(emotion ? { emotion } : {}),
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format,
        channel: 1,
      },
      // 多音字/特殊读法覆盖，形如 ["处理/(chu3)(li3)"]；为空则不下发该字段
      ...(normalizeToneList(settings.pronunciation_tone).length
        ? { pronunciation_dict: { tone: normalizeToneList(settings.pronunciation_tone) } }
        : {}),
      // 本项目只取音频，不需要字幕
      subtitle_enable: false,
    }

    return {
      url: joinProviderUrl(config.baseUrl, '/v1', '/t2a_v2'),
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body,
    }
  }

  extractAudio(result: any, format: TtsFormat): TtsAudio | null {
    const error = describeTtsError(result)
    if (error) throw new Error(`MiniMax 语音返回错误 ${error}${actionableTtsHint(error)}`)
    // t2a_v2 把音频放在 data.audio，且是 hex 编码
    const bytes = decodeAudio(result?.data?.audio, 'hex')
    return bytes ? { bytes, format } : null
  }
}

const adapters: Record<string, TtsProviderAdapter> = {
  volcengine: new VolcengineTtsAdapter(),
  minimax: new MinimaxTtsAdapter(),
}

export function getTtsAdapter(provider?: string | null): TtsProviderAdapter {
  const key = String(provider || '').toLowerCase()
  const adapter = adapters[key]
  if (!adapter) {
    throw new Error(`不支持的音频服务商：${provider || '(空)'}；已支持 ${Object.keys(adapters).join(' / ')}`)
  }
  return adapter
}

export function listTtsProviders(): string[] {
  return Object.keys(adapters)
}

