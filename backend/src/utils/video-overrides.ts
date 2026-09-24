/**
 * 导出选片覆盖表校验。
 *
 * 请求体里的 `video_overrides` 是「分镜id → 视频相对路径」，会被原样交给 ffmpeg 读取；
 * 而 ffmpeg-merge 的 toAbsPath 对绝对路径是直接采用的——如果不在这里拦住，
 * 就等于让请求方指定任意本地文件参与拼接。因此只接受站内 `static/` 相对路径。
 */
export interface VideoOverrideParseResult {
  overrides?: Record<number, string>
  error?: string
}

export function parseVideoOverrides(raw: unknown): VideoOverrideParseResult {
  if (raw === undefined || raw === null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'video_overrides 必须是对象：{ 分镜id: "static/videos/x.mp4" }' }
  }

  const overrides: Record<number, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const storyboardId = Number(key)
    const relativePath = String(value ?? '').trim()
    if (!Number.isFinite(storyboardId) || storyboardId <= 0) {
      return { error: `video_overrides 的键必须是分镜 id：${key}` }
    }
    if (!relativePath) continue
    if (!relativePath.startsWith('static/') || relativePath.includes('..')) {
      return { error: `video_overrides 只接受站内 static/ 路径：${relativePath}` }
    }
    overrides[storyboardId] = relativePath
  }

  return Object.keys(overrides).length ? { overrides } : {}
}
