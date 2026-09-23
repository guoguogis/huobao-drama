/**
 * 参考音频（角色音色样本）的统一限制。
 *
 * 产品模型：**每个角色固定一个音色样本**（characters.voice_audio_url 单值），
 * 一个分镜里有多少个角色说话，就往请求里带多少段音频——所以段数上限取决于上游，
 * 而不是固定 1 段。
 *
 * 数值比上游文档更严的部分是本项目的产品约束：
 *   上游：单段 2–15s、总 ≤15s、单文件 ≤15MB（段数 Seedance/MiniMax 3、Wan 5）
 *   本项目：单段 2–10s、总 ≤15s（= 上游上限）、单文件 ≤10MB
 *
 * 上传（routes/upload.ts）与任务创建（services/generation.ts）两处都从这里取值，
 * 避免两边漂移成「上传放行、生成必失败」。
 */

/** 上游只接受 mp3 / wav 两种参考音频格式 */
export const AUDIO_EXT = new Set(['.mp3', '.wav'])
export const AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'])

export const AUDIO_MAX_BYTES = 10 * 1024 * 1024
export const AUDIO_MIN_SECONDS = 2
export const AUDIO_MAX_SECONDS = 10
/** 默认段数上限（Seedance 2.0 / MiniMax H3） */
export const AUDIO_MAX_CLIPS = 3
/** Wan 3.0 的多模态上限更宽 */
export const AUDIO_MAX_CLIPS_WAN = 5
/** 上游硬上限：所有参考音频总时长 ≤15 秒（多个角色各 5 秒刚好 3 段装得下） */
export const AUDIO_TOTAL_MAX_SECONDS = 15

/** 上游对请求体的硬上限（base64 内联后体积会膨胀约 1.33 倍） */
export const REQUEST_BODY_MAX_BYTES = 64 * 1024 * 1024

/** 按视频模型给出音频段数上限 */
export function audioMaxClipsFor(model: string | null | undefined): number {
  return /^wan3\.0-video/i.test(String(model || '').trim()) ? AUDIO_MAX_CLIPS_WAN : AUDIO_MAX_CLIPS
}

export const AUDIO_FORMATS_TEXT = Array.from(AUDIO_EXT).map((e) => e.slice(1)).join(' / ')

export const AUDIO_LIMITS_TEXT =
  `仅支持 ${AUDIO_FORMATS_TEXT}，单段 ${AUDIO_MIN_SECONDS}–${AUDIO_MAX_SECONDS} 秒，` +
  `总时长不超过 ${AUDIO_TOTAL_MAX_SECONDS} 秒（最多 ${AUDIO_MAX_CLIPS} 段，Wan 3.0 为 ${AUDIO_MAX_CLIPS_WAN} 段），` +
  `单文件不超过 ${Math.round(AUDIO_MAX_BYTES / 1024 / 1024)}MB`

/** 秒数保留两位小数（落库/返回前端前统一口径） */
export function roundSeconds(seconds: number): number {
  return Math.round(seconds * 100) / 100
}

export function formatSeconds(seconds: number): string {
  return `${roundSeconds(seconds)} 秒`
}
