/**
 * 参考素材（视频/音频/文件）的「上游可访问形式」解析。
 *
 * 图片走压缩 dataURL 内联（见 generation.ts 的 normalizeVideoReferenceUrls）；
 * 视频/音频体积大，有两条路线：
 *
 * - `inline`：本地文件直接读成 `data:<mime>;base64,...`，上游不需要访问我们的服务。
 *   本地联调没有公网入口时用这条（方舟已明确支持音频/图片 Base64）。
 * - `public`：拼 `PUBLIC_BASE_URL` 并附 HMAC 签名，上游按 URL 拉取（服务器部署）。
 *
 * 模式由 `MEDIA_REF_MODE` 决定：
 * - `auto`（默认）：配了 `PUBLIC_BASE_URL` 走 public，没配走 inline
 * - `inline` / `public`：强制走对应路线
 *
 * 体积上限 `MEDIA_INLINE_MAX_MB`（默认 15，与方舟「单个参考音频 ≤15MB」对齐）：
 * 超限则退回 public；public 也不可用时抛出可操作的中文错误（落库进 error_msg 供前端展示）。
 */
import { mediaFileSize, readMediaAsDataUrl } from '../utils/storage.js'
import { signMediaPath } from './media-sign.js'
import { logTaskProgress, logTaskWarn } from '../utils/task-logger.js'

export type MediaRefKind = 'video' | 'audio' | 'file'
export type MediaRefMode = 'auto' | 'inline' | 'public'

/** 未显式配置时的内联上限（MB）：对齐方舟参考音频的单文件上限 */
const DEFAULT_INLINE_MAX_MB = 15

const KIND_LABEL: Record<MediaRefKind, string> = {
  video: '视频',
  audio: '音频',
  file: '文件',
}

export function mediaRefMode(): MediaRefMode {
  const raw = (process.env.MEDIA_REF_MODE || '').trim().toLowerCase()
  return raw === 'inline' || raw === 'public' || raw === 'auto' ? raw : 'auto'
}

export function inlineMaxBytes(): number {
  const mb = Number(process.env.MEDIA_INLINE_MAX_MB)
  const safe = Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_INLINE_MAX_MB
  return Math.round(safe * 1024 * 1024)
}

function publicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '')
}

function isLocalPath(raw: string): boolean {
  return raw.startsWith('static/') || raw.startsWith('/static/')
}

function describeBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/** public 路线不可用时的统一报错：把三个可选出路都写清楚 */
function publicUnavailableError(raw: string, kind: MediaRefKind, reason: string): Error {
  const label = KIND_LABEL[kind]
  return new Error(
    `参考${label} ${raw} ${reason}。` +
    `可选：① 本地联调把 MEDIA_REF_MODE 设为 inline（内联 Base64，上限见 MEDIA_INLINE_MAX_MB）；` +
    `② 配置 PUBLIC_BASE_URL（如 https://your-domain.com）让上游按签名 URL 拉取；` +
    `③ 直接改用公网 URL。`,
  )
}

/**
 * 解析单个参考素材为上游可用的字符串：
 * - `http(s)` / `data:` 原样直通
 * - 本地 `static/...` 按模式内联或签名为公网 URL
 * - 其他原样返回
 *
 * 无法解析时抛错（调用方决定是让整条任务失败，还是跳过该素材）。
 */
export function resolveMediaRef(
  value: string | null | undefined,
  kind: MediaRefKind,
  taskId?: number,
): string | null {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) return raw
  if (!isLocalPath(raw)) return raw

  const base = publicBaseUrl()
  const mode = mediaRefMode()
  // auto：配了公网地址就是服务器部署，走 public；没配说明是本地联调，尽量内联
  const wantInline = mode === 'inline' || (mode === 'auto' && !base)

  if (wantInline) {
    const cap = inlineMaxBytes()
    let bytes: number | null = null
    try {
      bytes = mediaFileSize(raw)
    } catch (err) {
      logTaskWarn('VideoTask', 'media-read-failed', {
        id: taskId, kind, path: raw, error: (err as Error).message,
      })
    }

    if (bytes !== null && bytes <= cap) {
      try {
        const dataUrl = readMediaAsDataUrl(raw)
        logTaskProgress('VideoTask', 'media-inlined', { id: taskId, kind, path: raw, bytes })
        return dataUrl
      } catch (err) {
        // 读得到 stat 却读不出内容（权限/被删）：还有 public 出路就走它
        logTaskWarn('VideoTask', 'media-inline-failed', {
          id: taskId, kind, path: raw, error: (err as Error).message,
        })
        if (!base) throw publicUnavailableError(raw, kind, `内联读取失败（${(err as Error).message}）且未配置 PUBLIC_BASE_URL`)
      }
    } else if (bytes !== null) {
      logTaskWarn('VideoTask', 'media-inline-over-cap', {
        id: taskId, kind, path: raw, bytes, capBytes: cap,
      })
      if (!base) {
        throw publicUnavailableError(
          raw,
          kind,
          `为 ${describeBytes(bytes)}，超过内联上限 ${describeBytes(cap)}，且未配置 PUBLIC_BASE_URL，无法生成公网地址`,
        )
      }
    } else if (!base) {
      throw publicUnavailableError(raw, kind, '本地文件读取失败，且未配置 PUBLIC_BASE_URL，无法生成公网地址')
    }
  }

  if (!base) {
    throw publicUnavailableError(raw, kind, '是本地路径，但未配置 PUBLIC_BASE_URL，上游无法访问内网地址')
  }

  const pathname = raw.startsWith('/') ? raw : `/${raw}`
  return `${base}${signMediaPath(pathname)}`
}

/** 批量解析（严格）：任一素材解析失败即抛错，用于分镜自带的参考视频/音频 */
export function resolveMediaRefs(
  refs: string[] | null | undefined,
  kind: 'video' | 'audio',
  taskId?: number,
): string[] {
  if (!Array.isArray(refs) || !refs.length) return []
  const items = Array.from(new Set(refs.map((item) => String(item || '').trim()).filter(Boolean)))
  return items.map((item) => resolveMediaRef(item, kind, taskId)).filter((item): item is string => !!item)
}

/**
 * 批量解析（宽松）：单个素材失败只跳过并告警。
 *
 * 用于**可选增强**素材（角色音色样本）：一个样本解析不出来，不该把整条视频生成判失败，
 * 而应回退成「视频模型自己配音」。
 */
export function resolveOptionalMediaRefs(
  refs: string[] | null | undefined,
  kind: MediaRefKind,
  taskId?: number,
): string[] {
  if (!Array.isArray(refs) || !refs.length) return []
  const out: string[] = []
  for (const item of new Set(refs.map((r) => String(r || '').trim()).filter(Boolean))) {
    try {
      const resolved = resolveMediaRef(item, kind, taskId)
      if (resolved) out.push(resolved)
    } catch (err: any) {
      logTaskWarn('VideoTask', 'optional-media-skipped', {
        id: taskId, kind, sample: item, error: err?.message,
      })
    }
  }
  return out
}
