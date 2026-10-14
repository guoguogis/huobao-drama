/**
 * 口播字幕：从**成片时间轴**生成 SRT，再按需要硬烧进画面或作为软字幕内挂。
 *
 * 为什么必须复用成片时间轴（video_merges.timeline）：
 * 合并时每一段都被强制到实测时长（trim/pad），字幕若自己再算一遍必然与画面对不齐。
 *
 * 字体：优先用随包内置的开源中文字体（assets/fonts，Noto Sans SC，OFL 许可），
 * 保证 macOS/Windows 表现一致；缺失时回退系统字体目录。
 */
import path from 'path'
import fs from 'fs'
import { execFile } from 'child_process'
import { fileURLToPath } from 'url'
import { STORAGE_ROOT } from '../utils/paths.js'
import { logTaskProgress, logTaskError } from '../utils/task-logger.js'
import { createRequire } from 'module'

const req = createRequire(import.meta.url)
/** ffmpeg 二进制：环境变量优先，其次内置 ffmpeg-static（与 utils/ffmpeg.ts 同一套解析） */
function ffmpegBin(): string {
  if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN
  try { return req('ffmpeg-static') as string } catch { return 'ffmpeg' }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** 内置字体目录：src/services → ../../assets/fonts（打包版可由 SUBTITLE_FONT_DIR 覆盖） */
const BUNDLED_FONT_DIR = process.env.SUBTITLE_FONT_DIR ?? path.resolve(__dirname, '../../assets/fonts')

export interface SubtitleLine {
  index: number
  shot_id?: number
  shot_number?: number
  start: number
  end: number
  text: string
}

export interface SubtitleStyle {
  /** 每行最大字数（超出按标点/字数拆分并按时长比例分配） */
  maxChars: number
  /** 整体时间偏移（秒，可为负） */
  offsetSec: number
  fontSize: number
  /** ASS 颜色（&HAABBGGRR），默认白字黑边 */
  primaryColour: string
  outlineColour: string
  outline: number
  /** 距底部边距（画面高度的 1/1000，ASS MarginV 语义；相对 288 基准） */
  marginV: number
  bold: number
  fontName: string
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  maxChars: 20,
  offsetSec: 0,
  fontSize: 20,
  primaryColour: '&H00FFFFFF',
  outlineColour: '&H00000000',
  outline: 2,
  marginV: 24,
  bold: 0,
  fontName: 'Noto Sans SC',
}

/** 把毫秒时间戳格式化成 SRT 的 `HH:MM:SS,mmm` */
export function formatSrtTime(sec: number): string {
  const total = Math.max(0, sec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  const ms = Math.round((total - Math.floor(total)) * 1000)
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${p(h)}:${p(m)}:${p(s)},${p(ms, 3)}`
}

/**
 * 一句太长就拆行：优先在标点处断，其次按字数硬切；
 * 时间按**字符数比例**分配（中文每字耗时相近，比平均分更贴近语速）。
 */
export function wrapText(text: string, maxChars: number): string[] {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const limit = Math.max(6, Math.min(60, Number(maxChars) || DEFAULT_SUBTITLE_STYLE.maxChars))
  if (clean.length <= limit) return [clean]

  const out: string[] = []
  let rest = clean
  while (rest.length > limit) {
    // 在限制范围内找最后一个标点（。！？，、；：,.!?;:）作为断点
    const window = rest.slice(0, limit + 1)
    let cut = -1
    for (let i = window.length - 1; i >= Math.floor(limit * 0.5); i--) {
      if ('。！？；，、：,.!?;:'.includes(window[i])) { cut = i + 1; break }
    }
    if (cut <= 0) cut = limit
    out.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) out.push(rest)
  return out
}

/** 时间轴 → 字幕行（按 maxChars 拆行并按字符数比例分配时间） */
export function buildLines(
  timeline: Array<{ shot_id?: number; shot_number?: number; start: number; end: number; text?: string }>,
  style: Partial<SubtitleStyle> = {},
): SubtitleLine[] {
  const maxChars = Number(style.maxChars) || DEFAULT_SUBTITLE_STYLE.maxChars
  const lines: SubtitleLine[] = []
  let seq = 0
  for (const seg of timeline || []) {
    const text = String(seg.text || '').trim()
    const start = Number(seg.start) || 0
    const end = Math.max(start + 0.2, Number(seg.end) || start + 1)
    if (!text) continue
    const parts = wrapText(text, maxChars)
    if (!parts.length) continue
    const totalChars = parts.reduce((n, p) => n + p.length, 0) || 1
    let cursor = start
    for (const part of parts) {
      const share = (part.length / totalChars) * (end - start)
      const segEnd = part === parts[parts.length - 1] ? end : cursor + share
      lines.push({
        index: ++seq,
        shot_id: seg.shot_id,
        shot_number: seg.shot_number,
        start: Math.round(cursor * 1000) / 1000,
        end: Math.round(segEnd * 1000) / 1000,
        text: part,
      })
      cursor = segEnd
    }
  }
  return lines
}

/** 字幕行 + 偏移 → SRT 文本（UTF-8，**无 BOM**：libass 对 BOM 兼容性不佳） */
export function toSrt(lines: SubtitleLine[], offsetSec = 0): string {
  const offset = Number(offsetSec) || 0
  const body = (lines || [])
    .filter(l => String(l.text || '').trim())
    .map((l, i) => {
      const start = Math.max(0, Number(l.start) + offset)
      const end = Math.max(start + 0.2, Number(l.end) + offset)
      return `${i + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${String(l.text).trim()}\n`
    })
    .join('\n')
  return body
}

/** 可用的字体目录（内置优先，其次系统；用于 libass 的 fontsdir） */
export function resolveFontsDir(): string {
  try {
    const files = fs.existsSync(BUNDLED_FONT_DIR) ? fs.readdirSync(BUNDLED_FONT_DIR) : []
    if (files.some(f => /\.(otf|ttf|ttc|otc)$/i.test(f))) return BUNDLED_FONT_DIR
  } catch { /* 忽略 */ }
  for (const dir of ['C:/Windows/Fonts', '/System/Library/Fonts', '/usr/share/fonts', '/Library/Fonts']) {
    if (fs.existsSync(dir)) return dir
  }
  return ''
}

/**
 * 滤镜图里的路径转义：反斜杠换正斜杠，冒号写成 `\:`。
 * 不转义会被当成参数分隔符，报错还是误导性的 `Unable to parse option value ... as image size`。
 */
export function escapeFilterPath(p: string): string {
  return String(p).replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
}

/** 拼 libass 的 force_style（只放我们实际控制的字段） */
export function buildForceStyle(style: SubtitleStyle): string {
  return [
    `FontName=${style.fontName || DEFAULT_SUBTITLE_STYLE.fontName}`,
    `FontSize=${style.fontSize}`,
    `PrimaryColour=${style.primaryColour}`,
    `OutlineColour=${style.outlineColour}`,
    `BorderStyle=1`,
    `Outline=${style.outline}`,
    `Shadow=0`,
    `Bold=${style.bold ? -1 : 0}`,
    `Alignment=2`,
    `MarginV=${style.marginV}`,
  ].join(',')
}

const runFfmpeg = (args: string[]) => new Promise<void>((resolve, reject) => {
  execFile(ffmpegBin(), args, { maxBuffer: 32 * 1024 * 1024 }, (err, _stdout, stderr) => {
    if (err) reject(new Error(String(stderr || err.message).split('\n').slice(-4).join(' ').slice(0, 400)))
    else resolve()
  })
})

/** 写 SRT 到 static 目录，返回相对路径 */
export function writeSrt(lines: SubtitleLine[], style: SubtitleStyle, key: string): string {
  const dir = path.join(STORAGE_ROOT, 'subtitles')
  fs.mkdirSync(dir, { recursive: true })
  const abs = path.join(dir, `${key}.srt`)
  fs.writeFileSync(abs, toSrt(lines, style.offsetSec), 'utf8')
  return `static/subtitles/${key}.srt`
}

/**
 * 硬烧字幕：对**成片文件**加一层字幕渲染。
 * 视频重编码（字幕要烧进像素），音频直接 copy，避免音质二次损失。
 */
export async function burnSubtitles(opts: {
  videoAbs: string
  srtAbs: string
  outAbs: string
  style: SubtitleStyle
}): Promise<void> {
  const fontsDir = resolveFontsDir()
  const filter = `subtitles=filename='${escapeFilterPath(opts.srtAbs)}'`
    + (fontsDir ? `:fontsdir='${escapeFilterPath(fontsDir)}'` : '')
    + `:force_style='${buildForceStyle(opts.style)}'`
  logTaskProgress('Subtitle', 'burn-start', { video: opts.videoAbs, fontsDir })
  await runFfmpeg([
    '-hide_banner', '-y',
    '-i', opts.videoAbs,
    '-vf', filter,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    '-movflags', '+faststart',
    opts.outAbs,
  ])
}

/** 软字幕：视频/音频直接 copy，只把 SRT 作为 mov_text 轨道内挂（几乎瞬时，不损画质） */
export async function muxSoftSubtitles(opts: {
  videoAbs: string
  srtAbs: string
  outAbs: string
  language?: string
}): Promise<void> {
  logTaskProgress('Subtitle', 'soft-mux-start', { video: opts.videoAbs })
  await runFfmpeg([
    '-hide_banner', '-y',
    '-i', opts.videoAbs,
    '-i', opts.srtAbs,
    '-map', '0', '-map', '1:0',
    '-c:v', 'copy', '-c:a', 'copy', '-c:s', 'mov_text',
    '-metadata:s:s:0', `language=${opts.language || 'chi'}`,
    '-movflags', '+faststart',
    opts.outAbs,
  ])
}

/** 把 static 相对路径还原成绝对路径（防止越权读取） */
export function staticRelToAbs(rel: string): string {
  const clean = String(rel || '').replace(/^\/+/, '')
  if (!clean.startsWith('static/')) throw new Error(`不是 static 下的文件：${rel}`)
  const abs = path.join(STORAGE_ROOT, clean.slice('static/'.length))
  if (!abs.startsWith(STORAGE_ROOT)) throw new Error('路径越权')
  return abs
}

export { logTaskError }
