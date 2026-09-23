export function joinProviderUrl(baseUrl: string, requiredPrefix: string, path: string) {
  const normalizedBase = (baseUrl || '').replace(/\/+$/, '')
  const normalizedPrefix = normalizeSegment(requiredPrefix)
  const normalizedPath = normalizeSegment(path)

  if (!normalizedBase) {
    return `${normalizedPrefix}${normalizedPath}`
  }

  try {
    const url = new URL(normalizedBase)
    const currentPath = url.pathname.replace(/\/+$/, '')
    const mergedPrefix = currentPath.endsWith(normalizedPrefix)
      ? currentPath
      : `${currentPath}${normalizedPrefix}`

    url.pathname = `${mergedPrefix}${normalizedPath}`.replace(/\/{2,}/g, '/')
    return url.toString()
  } catch {
    const basePath = normalizedBase.endsWith(normalizedPrefix)
      ? normalizedBase
      : `${normalizedBase}${normalizedPrefix}`
    return `${basePath}${normalizedPath}`
  }
}

function normalizeSegment(segment: string) {
  if (!segment) return ''
  return segment.startsWith('/') ? segment : `/${segment}`
}

/**
 * 下载地址候选列表（按优先级）：
 * 1. 上游返回的原始地址
 * 2. 回退：把 origin 换成「生成任务所用 base_url」的 origin
 *
 * 背景：私有网关常把上游的下载地址原样透出（指向其内网或另一台机器），后端连不上；
 * 而该网关自身的 host 上同样代理了这个下载路径。回退只替换协议+主机+端口，
 * 路径与查询串（含签名参数）原样保留，避免破坏签名。
 */
export function buildDownloadCandidates(url: string, baseUrl: string): string[] {
  const candidates = [url]
  try {
    const target = new URL(url)
    const base = new URL(baseUrl)
    if (!base.host || base.host === target.host) return candidates

    const fallback = new URL(target.toString())
    fallback.protocol = base.protocol
    fallback.host = base.host
    const replaced = fallback.toString()
    if (replaced !== target.toString()) candidates.push(replaced)
  } catch {
    // 任一侧不是合法绝对地址时不做回退
  }
  return candidates
}

/**
 * 下载时要携带的鉴权头。
 *
 * 只对「与用户自己配置的 base_url 同 host」的地址附带凭证：
 * - 私有网关常要求下载接口也鉴权（同 host，带上才是对的）
 * - 上游返回的第三方地址（签名 CDN、OSS 预签名链接）本身自带授权，
 *   且把 API Key 发给网关指定的任意主机等于凭证外泄，一律不带。
 */
export function downloadAuthHeaders(
  url: string,
  baseUrl: string,
  apiKey?: string | null,
): Record<string, string> {
  if (!apiKey) return {}
  try {
    const target = new URL(url)
    const base = new URL(baseUrl)
    if (base.host && target.host === base.host) {
      return { Authorization: `Bearer ${apiKey}` }
    }
  } catch {
    // 地址不合法则不附带凭证
  }
  return {}
}
