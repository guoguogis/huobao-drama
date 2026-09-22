/**
 * 阿里云百炼（DashScope）视频生成 Adapter。
 *
 * 各模型族共用同一套异步信封：
 * - 创建 POST {host}/api/v1/services/aigc/video-generation/video-synthesis
 * - 查询 GET  {host}/api/v1/tasks/{task_id}
 * - 请求 { model, input: { prompt, media? }, parameters }
 * - 响应 { output: { task_id, task_status }, request_id }
 *
 * host 由计费通道决定，填站点根即可（**不要**带 /compatible-mode/v1，
 * 那是 OpenAI 兼容的文本通道，视频走原生 /api/v1）：
 * - 按量：https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com
 * - TokenPlan 套餐：https://token-plan.{region}.maas.aliyuncs.com
 *
 * 信封相同但各族要求不同，按模型名分派：
 * | 族 | media | ratio | 备注 |
 * |---|---|---|---|
 * | wan | 首/尾帧 与 参考素材互斥；图片≤10 视频≤5 音频≤5 总≤20 | 含 adaptive | 下发 audio/prompt_extend；duration 2~30；prompt 指代用「图N」|
 * | happyhorse-t2v | 不允许任何 media | 支持（无 adaptive）| 不下发 audio/prompt_extend；duration 3~15 |
 * | happyhorse-r2v | 1~9 张 reference_image | 支持 | prompt 指代用「[Image N]」（官方规定）|
 * | happyhorse-i2v | 恰好 1 张 first_frame | **不支持**（宽高比自动跟随首帧）| |
 */
import type {
  AIConfig,
  ProviderRequest,
  VideoGenerationRecord,
  VideoGenResponse,
  VideoPollResponse,
  VideoProviderAdapter,
} from './types'
import { joinProviderUrl } from './url'

const PROMPT_MAX_CHARS = 20_000
const MAX_SEED = 2_147_483_647
const VALID_RESOLUTIONS = new Set(['480P', '720P', '1080P'])
const DEFAULT_MODEL = 'wan3.0-video'

type WanMediaType =
  | 'first_frame'
  | 'last_frame'
  | 'reference_image'
  | 'reference_video'
  | 'reference_audio'
  | 'file'
  | 'link'

interface WanMedia {
  type: WanMediaType
  url: string
}

interface FamilySpec {
  /** 错误信息中的可读名 */
  label: string
  /** 允许的 media 类型；null 表示纯文本、出现任何 media 都报错 */
  mediaTypes: WanMediaType[] | null
  minMedia: number
  maxMedia: number
  /** 是否下发 parameters.ratio（happyhorse-i2v 跟随首帧，下发会被拒） */
  sendsRatio: boolean
  ratios: Set<string>
  defaultRatio: string
  durationMin: number
  durationMax: number
  /** 是否接受 duration=-1（由模型自选） */
  allowsAutoDuration: boolean
  allowsAutoSeed: boolean
  sendsAudio: boolean
  sendsPromptExtend: boolean
  /** 必须提供 prompt */
  requiresPrompt: boolean
  /** prompt 与 media 至少其一（Wan 允许纯素材） */
  promptOrMedia: boolean
  /** prompt 中 @图片N 的改写方式 */
  referenceSyntax: 'cn' | 'imageIndex' | 'keep'
}

const WAN_RATIOS = new Set(['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16'])
/** HappyHorse 官方 ratio 集合：无 adaptive，且比 Wan 多 4:5 / 5:4 / 9:21 / 21:9 */
const HAPPYHORSE_RATIOS = new Set(['16:9', '9:16', '3:4', '4:3', '4:5', '5:4', '1:1', '9:21', '21:9'])

const WAN3_FAMILY: FamilySpec = {
  label: 'Wan 3.0',
  mediaTypes: ['first_frame', 'last_frame', 'reference_image', 'reference_video', 'reference_audio', 'file', 'link'],
  minMedia: 0,
  maxMedia: 20,
  sendsRatio: true,
  ratios: WAN_RATIOS,
  defaultRatio: 'adaptive',
  durationMin: 2,
  durationMax: 30,
  allowsAutoDuration: true,
  allowsAutoSeed: true,
  sendsAudio: true,
  sendsPromptExtend: true,
  requiresPrompt: false,
  promptOrMedia: true,
  referenceSyntax: 'cn',
}

const HAPPYHORSE_COMMON = {
  sendsRatio: true,
  ratios: HAPPYHORSE_RATIOS,
  defaultRatio: '16:9',
  durationMin: 3,
  durationMax: 15,
  allowsAutoDuration: false,
  allowsAutoSeed: false,
  sendsAudio: false,
  sendsPromptExtend: false,
} as const

const HAPPYHORSE_T2V_FAMILY: FamilySpec = {
  ...HAPPYHORSE_COMMON,
  label: 'HappyHorse 文生视频',
  mediaTypes: null,
  minMedia: 0,
  maxMedia: 0,
  requiresPrompt: true,
  promptOrMedia: false,
  referenceSyntax: 'keep',
}

const HAPPYHORSE_R2V_FAMILY: FamilySpec = {
  ...HAPPYHORSE_COMMON,
  label: 'HappyHorse 参考生视频',
  mediaTypes: ['reference_image'],
  minMedia: 1,
  maxMedia: 9,
  requiresPrompt: true,
  promptOrMedia: false,
  referenceSyntax: 'imageIndex',
}

const HAPPYHORSE_I2V_FAMILY: FamilySpec = {
  ...HAPPYHORSE_COMMON,
  label: 'HappyHorse 图生视频',
  mediaTypes: ['first_frame'],
  minMedia: 1,
  maxMedia: 1,
  sendsRatio: false,
  requiresPrompt: false,
  promptOrMedia: false,
  referenceSyntax: 'keep',
}

/** 模型名 → 族；未列出的模型一律拒绝，避免把未知报文形状发到计费接口 */
const MODEL_FAMILIES: Record<string, FamilySpec> = {
  'wan3.0-video-prime': WAN3_FAMILY,
  'wan3.0-video': WAN3_FAMILY,
  'happyhorse-1.1-t2v': HAPPYHORSE_T2V_FAMILY,
  'happyhorse-1.0-t2v': HAPPYHORSE_T2V_FAMILY,
  'happyhorse-1.1-r2v': HAPPYHORSE_R2V_FAMILY,
  'happyhorse-1.0-r2v': HAPPYHORSE_R2V_FAMILY,
  'happyhorse-1.1-i2v': HAPPYHORSE_I2V_FAMILY,
  'happyhorse-1.0-i2v': HAPPYHORSE_I2V_FAMILY,
}
const SUPPORTED_MODEL_LIST = Object.keys(MODEL_FAMILIES).join('、')

const WAN_REF_LIMITS = { images: 10, videos: 5, audios: 5, total: 20 } as const

function parseUrlArray(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const value = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value
      .filter((url): url is string => typeof url === 'string')
      .map(url => url.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function cleanUrl(value?: string | null): string {
  return String(value || '').trim()
}

function validateMediaUrl(type: WanMediaType, url: string, label: string) {
  const isWebUrl = /^https?:\/\//i.test(url)
  const isOssUrl = /^oss:\/\//i.test(url)
  const isImageData = /^data:image\/(?:jpeg|jpg|png|bmp|webp);base64,/i.test(url)
  if (type === 'first_frame' || type === 'last_frame' || type === 'reference_image') {
    if (isWebUrl || isOssUrl || isImageData) return
    throw new Error(`${label} ${type} 需要 HTTP(S)/OSS 图片 URL 或官方支持的图片 Base64`)
  }
  if (type === 'link') {
    if (isWebUrl) return
    throw new Error(`${label} link 仅支持无需登录的 HTTP(S) 公开网页`)
  }
  if (isWebUrl || isOssUrl) return
  throw new Error(`${label} ${type} 仅支持 HTTP(S) 或 OSS URL`)
}

function booleanValue(value: number | boolean | null | undefined, fallback: boolean): boolean {
  if (value === null || value === undefined) return fallback
  return value !== false && value !== 0
}

function errorMessage(result: any, fallback: string): string {
  const output = result?.output && typeof result.output === 'object' ? result.output : {}
  const code = output.code || result?.code
  const message = output.message || result?.message || fallback
  const requestId = result?.request_id
  return `${code ? `[${code}] ` : ''}${message}${requestId ? ` (request_id: ${requestId})` : ''}`
}

export class AliyunVideoAdapter implements VideoProviderAdapter {
  provider = 'aliyun'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const model = cleanUrl(record.model || config.model || DEFAULT_MODEL)
    const spec = MODEL_FAMILIES[model]
    if (!spec) {
      throw new Error(`不支持的阿里云百炼视频模型：${model}；支持 ${SUPPORTED_MODEL_LIST}`)
    }

    // 官方对超过 20000 字符的部分自动截断
    const rawPrompt = cleanUrl(record.prompt)
    const prompt = this.rewriteReferenceMarkers(rawPrompt, spec).slice(0, PROMPT_MAX_CHARS)

    const refImages = parseUrlArray(record.referenceImageUrls)
    const refVideos = parseUrlArray(record.referenceVideoUrls)
    const refAudios = parseUrlArray(record.referenceAudioUrls)
    const firstFrame = cleanUrl(record.firstFrameUrl || record.imageUrl)
    const lastFrame = cleanUrl(record.lastFrameUrl)
    const file = cleanUrl(record.referenceFileUrl)
    const link = cleanUrl(record.referenceLinkUrl)

    if (spec === WAN3_FAMILY) {
      this.validateWanMedia({ refImages, refVideos, refAudios, firstFrame, lastFrame, file, link })
    }

    const media: WanMedia[] = []
    if (firstFrame) media.push({ type: 'first_frame', url: firstFrame })
    if (lastFrame) media.push({ type: 'last_frame', url: lastFrame })
    for (const url of refImages) media.push({ type: 'reference_image', url })
    for (const url of refVideos) media.push({ type: 'reference_video', url })
    for (const url of refAudios) media.push({ type: 'reference_audio', url })
    if (file) media.push({ type: 'file', url: file })
    if (link) media.push({ type: 'link', url: link })

    if (spec !== WAN3_FAMILY) this.validateFamilyMedia(spec, media)
    for (const item of media) validateMediaUrl(item.type, item.url, spec.label)

    if (spec.promptOrMedia && !prompt && media.length === 0) {
      throw new Error(`${spec.label} 的 input.prompt 和 input.media 至少需要提供一项`)
    }
    if (spec.requiresPrompt && !prompt) {
      throw new Error(`${spec.label} 需要文本提示词 prompt`)
    }

    const input: { prompt?: string; media?: WanMedia[] } = {}
    if (prompt) input.prompt = prompt
    if (media.length) input.media = media

    const parameters = this.buildParameters(record, spec)

    return {
      url: joinProviderUrl(config.baseUrl, '/api/v1', '/services/aigc/video-generation/video-synthesis'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: { model, input, parameters },
    }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    const taskId = result?.output?.task_id
    if (taskId) return { isAsync: true, taskId: String(taskId) }
    throw new Error(errorMessage(result, '阿里云百炼响应中缺少 output.task_id'))
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/api/v1', `/tasks/${encodeURIComponent(taskId)}`),
      method: 'GET',
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
      body: undefined,
    }
  }

  parsePollResponse(result: any): VideoPollResponse {
    const output = result?.output && typeof result.output === 'object' ? result.output : {}
    switch (output.task_status) {
      case 'PENDING':
        return { status: 'pending' }
      case 'RUNNING':
        return { status: 'processing' }
      case 'SUCCEEDED':
        if (!output.video_url) {
          return { status: 'failed', error: errorMessage(result, '任务成功但响应中缺少 output.video_url') }
        }
        {
          const duration = Number(result?.usage?.output_video_duration ?? result?.usage?.duration)
          return {
            status: 'completed',
            videoUrl: output.video_url,
            ...(Number.isFinite(duration) ? { duration } : {}),
          }
        }
      case 'FAILED':
        return { status: 'failed', error: errorMessage(result, '视频生成失败') }
      case 'CANCELED':
        return { status: 'failed', error: errorMessage(result, '任务已取消') }
      case 'UNKNOWN':
        return { status: 'failed', error: errorMessage(result, '任务不存在或已超过 24 小时查询有效期') }
      default:
        if (result?.code || result?.message || output.code || output.message) {
          return { status: 'failed', error: errorMessage(result, '任务查询失败') }
        }
        return { status: 'processing' }
    }
  }

  extractVideoUrl(result: any): string | null {
    return result?.output?.video_url || null
  }

  /** @图片N 的项目内约定按族改写：Wan 用「图N」，HappyHorse 参考生视频用官方的「[Image N]」 */
  private rewriteReferenceMarkers(prompt: string, spec: FamilySpec): string {
    if (spec.referenceSyntax === 'cn') return prompt.replace(/@图片(\d+)/g, '图$1')
    if (spec.referenceSyntax === 'imageIndex') return prompt.replace(/@图片(\d+)/g, '[Image $1]')
    return prompt
  }

  private buildParameters(record: VideoGenerationRecord, spec: FamilySpec): Record<string, string | number | boolean> {
    const parameters: Record<string, string | number | boolean> = {
      resolution: this.normalizeResolution(record.resolution, spec),
    }
    if (spec.sendsRatio) parameters.ratio = this.normalizeRatio(record.aspectRatio, spec)
    parameters.duration = this.normalizeDuration(record.duration, spec)
    if (spec.sendsAudio) parameters.audio = booleanValue(record.generateAudio, true)
    if (spec.sendsPromptExtend) parameters.prompt_extend = booleanValue(record.promptExtend, true)
    parameters.watermark = booleanValue(record.watermark, false)

    if (record.seed !== null && record.seed !== undefined) {
      const seed = Number(record.seed)
      const auto = spec.allowsAutoSeed && seed === -1
      if (!Number.isInteger(seed) || (!auto && (seed < 0 || seed > MAX_SEED))) {
        throw new Error(`${spec.label} seed 必须为 ${spec.allowsAutoSeed ? '-1 或 ' : ''}0~${MAX_SEED} 的整数`)
      }
      parameters.seed = seed
    }
    return parameters
  }

  /** 非 Wan 族的素材校验：类型白名单 + 数量区间 */
  private validateFamilyMedia(spec: FamilySpec, media: WanMedia[]) {
    if (spec.mediaTypes === null) {
      if (media.length) {
        const types = [...new Set(media.map(item => item.type))].join('、')
        throw new Error(`${spec.label} 仅接受文本提示词，不支持任何素材（收到 ${types}）；需要图片输入请改用 happyhorse-*-i2v 或 -r2v`)
      }
      return
    }
    const disallowed = [...new Set(media.filter(item => !spec.mediaTypes!.includes(item.type)).map(item => item.type))]
    if (disallowed.length) {
      throw new Error(`${spec.label} 不支持 ${disallowed.join('、')}；仅支持 ${spec.mediaTypes.join('、')}`)
    }
    if (media.length < spec.minMedia || media.length > spec.maxMedia) {
      const expected = spec.minMedia === spec.maxMedia
        ? `恰好 ${spec.minMedia} 项`
        : `${spec.minMedia}~${spec.maxMedia} 项`
      throw new Error(`${spec.label} 需要 ${expected}素材，当前 ${media.length} 项`)
    }
  }

  private validateWanMedia(input: {
    refImages: string[]
    refVideos: string[]
    refAudios: string[]
    firstFrame: string
    lastFrame: string
    file: string
    link: string
  }) {
    const { refImages, refVideos, refAudios, firstFrame, lastFrame, file, link } = input
    if (refImages.length > WAN_REF_LIMITS.images || refVideos.length > WAN_REF_LIMITS.videos || refAudios.length > WAN_REF_LIMITS.audios) {
      throw new Error(`Wan 3.0 参考素材超限：图片≤${WAN_REF_LIMITS.images}、视频≤${WAN_REF_LIMITS.videos}、音频≤${WAN_REF_LIMITS.audios}`)
    }
    if (lastFrame && !firstFrame) throw new Error('Wan 3.0 尾帧必须与首帧同时传入')
    if (file && link) throw new Error('Wan 3.0 file 与 link 不能同时传入')

    const hasFrameMode = Boolean(firstFrame || lastFrame)
    const hasReferenceMode = Boolean(refImages.length || refVideos.length || refAudios.length || file || link)
    if (hasFrameMode && hasReferenceMode) {
      throw new Error('Wan 3.0 的 first_frame/last_frame 不能与 reference_image/reference_video/reference_audio/file/link 混用')
    }

    const total = refImages.length + refVideos.length + refAudios.length + (firstFrame ? 1 : 0)
      + (lastFrame ? 1 : 0) + (file ? 1 : 0) + (link ? 1 : 0)
    if (total > WAN_REF_LIMITS.total) throw new Error(`Wan 3.0 input.media 最多 ${WAN_REF_LIMITS.total} 项`)
  }

  private normalizeDuration(duration: number | null | undefined, spec: FamilySpec): number {
    if (duration === null || duration === undefined) return 5
    const value = Number(duration)
    const auto = spec.allowsAutoDuration && value === -1
    if (!Number.isInteger(value) || (!auto && (value < spec.durationMin || value > spec.durationMax))) {
      throw new Error(`${spec.label} duration 必须为 ${spec.allowsAutoDuration ? '-1 或 ' : ''}${spec.durationMin}~${spec.durationMax} 的整数`)
    }
    return value
  }

  private normalizeResolution(resolution: string | null | undefined, spec: FamilySpec): string {
    const value = cleanUrl(resolution).toUpperCase() || '1080P'
    if (!VALID_RESOLUTIONS.has(value)) {
      throw new Error(`${spec.label} resolution 仅支持 480P、720P 或 1080P`)
    }
    return value
  }

  private normalizeRatio(ratio: string | null | undefined, spec: FamilySpec): string {
    const value = cleanUrl(ratio) || spec.defaultRatio
    if (spec.ratios.has(value)) return value
    // 项目内 adaptive 语义是「交给模型自适应」，HappyHorse 无该枚举，回退到官方默认比例
    if (value === 'adaptive') return spec.defaultRatio
    throw new Error(`${spec.label} ratio 仅支持 ${[...spec.ratios].join('、')}`)
  }
}
