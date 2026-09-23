/**
 * 生成素材的公网 URL 签名。
 *
 * 背景：参考视频/音频体积大，无法像图片那样内联成 dataURL，必须让上游按公网 URL 来取；
 * 而登录守卫也保护了 `/static/*`，上游（服务器身份、无 cookie）会被 401 拦住。
 * 因此这里给站内素材路径签发**带过期时间的 HMAC 签名**：
 *
 *   /static/uploads/x.mp3?e=1790174286&s=<hmac>
 *
 * 守卫校验签名与有效期后放行，素材不必对公网裸奔；浏览器侧走 cookie 会话，不需要签名。
 */
import crypto from 'crypto'
import { authSecret } from './auth.js'

export const MEDIA_SIG_EXP = 'e'
export const MEDIA_SIG_VALUE = 's'

/** 默认有效期 6 小时：视频任务可能排很久，上游也可能稍后才来拉取素材 */
const DEFAULT_TTL_SECONDS = 6 * 3600

export function mediaUrlTtlSeconds(): number {
  const hours = Number(process.env.MEDIA_URL_TTL_HOURS)
  return Number.isFinite(hours) && hours > 0 ? Math.round(hours * 3600) : DEFAULT_TTL_SECONDS
}

/**
 * 签名摘要。与会话 cookie 共用 AUTH_SECRET，但加 `media:` 前缀做域分隔，
 * 会话 token 与素材签名互不可复用。
 */
function digest(pathname: string, expiresAt: number): string {
  return crypto.createHmac('sha256', authSecret()).update(`media:${pathname}:${expiresAt}`).digest('hex')
}

/** 给站内素材路径（`/static/...`）附加 `?e=<过期秒>&s=<hmac>` */
export function signMediaPath(pathname: string, ttlSeconds = mediaUrlTtlSeconds()): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
  return `${pathname}?${MEDIA_SIG_EXP}=${expiresAt}&${MEDIA_SIG_VALUE}=${digest(pathname, expiresAt)}`
}

/** 校验素材签名：签名不符、缺参数、已过期都返回 false */
export function verifyMediaSignature(
  pathname: string,
  expiresRaw?: string | null,
  signature?: string | null,
): boolean {
  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || !signature) return false
  if (Math.floor(Date.now() / 1000) > expiresAt) return false

  const expected = digest(pathname, expiresAt)
  if (signature.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'))
}
