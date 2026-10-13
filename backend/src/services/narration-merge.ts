/**
 * 口播视频剪辑合并（最后一步）。
 *
 * 与漫剧拼接（services/ffmpeg-merge.ts）的区别：
 * - 漫剧：各镜头各自带音轨，直接 concat；
 * - 口播：**画面按每句旁白的实测音频时长重定时**，音轨用口播配音，因此天然同步。
 *
 * 同步规则（参考成熟做法：优先保完整动画，余量放在尾帧停顿）：
 * - 段目标时长 target = 该句音频实测时长 + 句尾停顿
 * - 片段比 target 短 → 用 tpad 冻结尾帧补足（画面不加速、不丢内容）
 * - 片段比 target 长 → 用 setpts 轻微加速压到 target（不截断动作）
 * - 音频统一 aresample → apad/atrim 到恰好 target：逐段音画严格等长
 * - 全部段落归一化到同一分辨率/帧率/采样率后再用 concat 滤镜拼接
 * 这样即使上游 TTS 没完全遵守倍速，成片依然是对齐的。
 */
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { ffmpeg, checkFfmpegSuite } from '../utils/ffmpeg.js'
import { DATA_ROOT, STORAGE_ROOT } from '../utils/paths.js'
import { logTaskError, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'

export const DEFAULT_WIDTH = 1280
export const DEFAULT_HEIGHT = 720
export const DEFAULT_FPS = 24
export const DEFAULT_SAMPLE_RATE = 48000

export type NarrationSegmentKind = 'clip' | 'still'

export interface NarrationSegment {
  /** 1-based 序号（对应镜头号） */
  index: number
  /** 片段视频（站内相对路径）；缺省时用 image 做定帧段 */
  videoPath?: string
  /** 定帧图片（站内相对路径） */
  imagePath?: string
  /** 该句旁白音频（站内相对路径） */
  audioPath?: string
  /** 目标时长（秒）＝ 音频实测时长 + 停顿 */
  targetDuration: number
  /** 片段原始时长（探测得到；缺省按 target 处理，即不改速） */
  sourceDuration?: number
  /** 该镜旁白文本（便于审计/日志） */
  text?: string
}

/** 相对路径 → 绝对路径（与本项目其它模块同一口径） */
function toAbsPath(relativePath: string): string {
  if (path.isAbsolute(relativePath)) return relativePath
  if (relativePath.startsWith('static/')) return path.join(DATA_ROOT, relativePath)
  return path.join(STORAGE_ROOT, relativePath)
}

export interface GraphOptions {
  width?: number
  height?: number
  fps?: number
  sampleRate?: number
}

/**
 * 生成单个段落的视频滤镜链（纯函数，便于单测）。
 *
 * 顺序：归一化(scale/pad/setsar/fps) → 时长处理(setpts 压缩 或 tpad 冻结补足)
 *      → **最后统一 trim 到目标时长**（与音轨 atrim 对称，保证逐段严格等长）。
 * 末尾的 trim 是必需的：定帧段的输入本身就带 -t 时长，若再靠 tpad 补足会翻倍。
 */
export function buildVideoChain(seg: NarrationSegment, opts: GraphOptions = {}): string {
  const width = opts.width ?? DEFAULT_WIDTH
  const height = opts.height ?? DEFAULT_HEIGHT
  const fps = opts.fps ?? DEFAULT_FPS
  const target = Math.max(0.2, Number(seg.targetDuration) || 0)
  const source = Number(seg.sourceDuration)
  const parts = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    'setsar=1',
    `fps=${fps}`,
  ]
  if (Number.isFinite(source) && source > 0 && Math.abs(source - target) > 0.05) {
    if (source > target) {
      // 偏长：轻微加速压到目标（保留全部动作，不截断）
      parts.push(`setpts=PTS*${round3(Math.max(0.2, target / source))}`)
    } else {
      // 偏短：冻结尾帧补足（"余量放在尾帧停顿"）
      parts.push(`tpad=stop_mode=clone:stop_duration=${round3(target - source)}`)
    }
  } else if (!Number.isFinite(source) || source <= 0) {
    // 未探测到原始时长（定帧图）：只需保证素材足够长，由下面的 trim 收到目标时长
    parts.push(`tpad=stop_mode=clone:stop_duration=${round3(target)}`)
  }
  parts.push(`trim=duration=${round3(target)}`, 'setpts=PTS-STARTPTS')
  return parts.join(',')
}

/** 生成单个段落的音频滤镜链：统一采样率/声道后 pad+trim 到恰好 target */
export function buildAudioChain(seg: NarrationSegment, opts: GraphOptions = {}): string {
  const sampleRate = opts.sampleRate ?? DEFAULT_SAMPLE_RATE
  const target = Math.max(0.2, Number(seg.targetDuration) || 0)
  // 无音频的段落用静音源（调用方需为该段接 anullsrc 输入）
  return `aresample=${sampleRate},aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=0:${round3(target)},asetpts=PTS-STARTPTS`
}

/**
 * 组装完整 filter_complex：每段 [i:v] → [vN]，音频 [j:a] → [aN]，最后 concat。
 * `audioInputIndex` 允许音频来自另一个输入序号（无音轨段用 anullsrc 垫）。
 */
export function buildConcatGraph(
  segments: { seg: NarrationSegment; videoInput: number; audioInput: number }[],
  opts: GraphOptions = {},
): string {
  const chains: string[] = []
  const pairs: string[] = []
  for (let i = 0; i < segments.length; i++) {
    const { seg, videoInput, audioInput } = segments[i]
    chains.push(`[${videoInput}:v]${buildVideoChain(seg, opts)}[v${i}]`)
    chains.push(`[${audioInput}:a]${buildAudioChain(seg, opts)}[a${i}]`)
    pairs.push(`[v${i}][a${i}]`)
  }
  return `${chains.join(';')};${pairs.join('')}concat=n=${segments.length}:v=1:a=1[v][a]`
}

/** 目标时长：优先 TTS 实测，其次计划值 */
export function resolveTargetDuration(input: { measuredSec?: number | null; plannedSec?: number | null; pauseSec?: number }): number {
  const pause = input.pauseSec ?? 0.25
  const measured = Number(input.measuredSec)
  if (Number.isFinite(measured) && measured > 0) return round3(measured + pause)
  const planned = Number(input.plannedSec)
  if (Number.isFinite(planned) && planned > 0) return round3(planned)
  return 3
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

async function probeMediaDuration(absPath: string): Promise<number | null> {
  const suite = await checkFfmpegSuite()
  if (!suite.ffprobe) return null
  return new Promise((resolve) => {
    try {
      ffmpeg.ffprobe(absPath, (err, metadata) => {
        if (err) { resolve(null); return }
        const d = Number(metadata?.format?.duration)
        resolve(Number.isFinite(d) && d > 0 ? d : null)
      })
    } catch {
      resolve(null)
    }
  })
}

export interface MergeNarrationResult {
  mergedRelative: string
  durationSec: number
  segments: number
  elapsedMs: number
}

/**
 * 执行合并：逐段归一化 + 重定时 + concat，输出到 static/merged/<uuid>.mp4。
 * 所有段落音画等长，因此总时长 = Σ target，可直接与旁白总时长核对。
 */
export async function mergeNarrationVideo(
  segments: NarrationSegment[],
  opts: GraphOptions = {},
): Promise<MergeNarrationResult> {
  if (!segments.length) throw new Error('没有可拼接的片段')

  const suite = await checkFfmpegSuite()
  if (!suite.ffmpeg || !suite.ffprobe) {
    throw new Error('本机 ffmpeg 不可用，无法拼接视频。请删除 node_modules 后重新 npm install，或设置 FFMPEG_BIN')
  }

  // 1) 素材体检 + 补探测时长（决定 tpad / setpts）
  const prepared: NarrationSegment[] = []
  for (const seg of segments) {
    const videoAbs = seg.videoPath ? toAbsPath(seg.videoPath) : null
    const imageAbs = seg.imagePath ? toAbsPath(seg.imagePath) : null
    const audioAbs = seg.audioPath ? toAbsPath(seg.audioPath) : null
    const hasVideo = !!videoAbs && fs.existsSync(videoAbs)
    const hasImage = !!imageAbs && fs.existsSync(imageAbs)
    if (!hasVideo && !hasImage) {
      throw new Error(`镜头 ${seg.index} 既没有视频片段也没有关键帧图片，无法参与拼接`)
    }
    const sourceDuration = hasVideo
      ? (Number.isFinite(Number(seg.sourceDuration)) && Number(seg.sourceDuration) > 0
        ? Number(seg.sourceDuration)
        : (await probeMediaDuration(videoAbs!)) ?? undefined)
      : undefined
    prepared.push({
      ...seg,
      videoPath: hasVideo ? seg.videoPath : undefined,
      imagePath: hasVideo ? undefined : seg.imagePath,
      audioPath: audioAbs && fs.existsSync(audioAbs) ? seg.audioPath : undefined,
      sourceDuration,
    })
  }

  // 2) 组装输入：视频/定帧图 + 音频（缺音轨的段补 anullsrc）
  type InputSpec =
    | { kind: 'video'; path: string }
    | { kind: 'image'; path: string; seconds: number }
    | { kind: 'audio'; path: string }
    | { kind: 'silence'; seconds: number }
  const inputs: InputSpec[] = []
  const plan: { seg: NarrationSegment; videoInput: number; audioInput: number }[] = []
  for (const seg of prepared) {
    const target = Math.max(0.2, Number(seg.targetDuration) || 3)
    const videoInput = inputs.length
    if (seg.videoPath) inputs.push({ kind: 'video', path: toAbsPath(seg.videoPath) })
    else inputs.push({ kind: 'image', path: toAbsPath(seg.imagePath!), seconds: round3(target + 0.5) })

    const audioInput = inputs.length
    if (seg.audioPath) inputs.push({ kind: 'audio', path: toAbsPath(seg.audioPath) })
    else inputs.push({ kind: 'silence', seconds: round3(target) })

    plan.push({ seg, videoInput, audioInput })
  }

  const filter = buildConcatGraph(plan, opts)
  const outputDir = path.join(STORAGE_ROOT, 'merged')
  fs.mkdirSync(outputDir, { recursive: true })
  const filename = `${uuid()}.mp4`
  const outputPath = path.join(outputDir, filename)
  const started = Date.now()
  logTaskStart('NarrationMerge', 'merge', { segments: prepared.length, output: filename })

  // 3) fluent-ffmpeg 按顺序挂输入（inputOptions 作用于最近一次 input）
  const command = ffmpeg()
  for (const spec of inputs) {
    if (spec.kind === 'silence') {
      command.input(`anullsrc=channel_layout=stereo:sample_rate=${opts.sampleRate ?? DEFAULT_SAMPLE_RATE}`)
        .inputOptions(['-f', 'lavfi', '-t', String(spec.seconds)])
    } else if (spec.kind === 'image') {
      command.input(spec.path).inputOptions(['-loop', '1', '-t', String(spec.seconds)])
    } else {
      command.input(spec.path)
    }
  }

  try {
    await new Promise<void>((resolve, reject) => {
      command
        .outputOptions([
          '-filter_complex', filter,
          '-map', '[v]', '-map', '[a]',
          '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-ar', String(opts.sampleRate ?? DEFAULT_SAMPLE_RATE), '-b:a', '192k',
          '-movflags', '+faststart',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run()
    })
  } catch (err: any) {
    logTaskError('NarrationMerge', 'merge', { error: err?.message })
    throw new Error(`口播合并失败：${String(err?.message || err).slice(0, 300)}`)
  }

  const duration = (await probeMediaDuration(outputPath)) ?? 0
  logTaskSuccess('NarrationMerge', 'merge', { output: filename, duration: round3(duration), segments: prepared.length })

  return {
    mergedRelative: `static/merged/${filename}`,
    durationSec: round3(duration),
    segments: prepared.length,
    elapsedMs: Date.now() - started,
  }
}
