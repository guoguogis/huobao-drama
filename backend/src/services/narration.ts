/**
 * 口播视频（narration）确定性内核。
 *
 * 这里只放**可计算的规则**，不调用任何模型：
 * - 口播稿简报（主题/时长/语速/音色…）的读写：落在 dramas.metadata.narration
 * - 1.1 倍语速下的字数 ↔ 时长换算
 * - 口播稿 → 逐句切分 → 镜头时长分配（画面与音轨同步的依据）
 *
 * 分工：Agent（narration_writer / narration_planner）负责**创作**文字，
 * 本模块负责**算数与校验**；导出时再用 TTS 实测时长做最终对齐
 * （估算用于「生成前就能看到每镜多长」，实测用于「导出时精确对齐」）。
 */
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'

/** 中文口播基准语速：约 4.2 字/秒（1.0 倍速，含自然停顿的经验值） */
export const BASE_CHARS_PER_SECOND = 4.2
/** 默认语速倍率：需求指定 1.1 倍（画面按此对齐音轨） */
export const DEFAULT_SPEECH_RATE = 1.1
/** 语速倍率合法区间：界面滑块范围、后端校验、TTS 下发共用同一对常量 */
export const MIN_SPEECH_RATE = 0.5
export const MAX_SPEECH_RATE = 2
/** 句间停顿（秒）：TTS 逐句合成后再拼接时插入的静音 */
export const PAUSE_SENTENCE_SEC = 0.25
/** 段间停顿（秒） */
export const PAUSE_PARAGRAPH_SEC = 0.6
/** 单镜时长约束：太短则画面来不及展开，太长则观众走神 */
export const MIN_SHOT_SEC = 2.5
export const MAX_SHOT_SEC = 12
/** 时长偏差容差：超出提示用户增删镜头或微调语速 */
export const DURATION_TOLERANCE = 0.12

export type NarrationAspect = '16:9' | '9:16' | '1:1'

export interface NarrationBrief {
  /** 主题（用户输入，口播稿创作的唯一依据） */
  topic: string
  /** 目标成片时长（秒） */
  targetDurationSec: number
  /** 画幅：口播视频常横屏发布，默认 16:9 */
  aspectRatio: NarrationAspect
  /** 视觉风格预设 value（沿用项目风格预设，保证与漫剧同一套出图口径） */
  style: string
  /** 语速倍率：1.1 表示把 TTS 语速设为 1.1 倍 */
  speechRate: number
  /** 音频服务配置 id（不填用当前启用的音频配置） */
  audioConfigId: number | null
  /** 音色编号（豆包 speaker / MiniMax voice_id） */
  voiceId: string
  /** 生成的视频片段是否要求带音频（首尾帧视频通常关掉，避免与口播音轨打架） */
  clipWithAudio: boolean
  /** 期望镜头数（0 = 由时长自动推算） */
  shotCount: number
}

export function defaultNarrationBrief(): NarrationBrief {
  return {
    topic: '',
    targetDurationSec: 60,
    aspectRatio: '16:9',
    style: '',
    speechRate: DEFAULT_SPEECH_RATE,
    audioConfigId: null,
    voiceId: '',
    clipWithAudio: false,
    shotCount: 0,
  }
}

/** 从 dramas.metadata 解析简报（缺字段用默认值补全，非法值回退默认） */
export function parseNarrationBrief(metadata: string | null | undefined): NarrationBrief {
  const base = defaultNarrationBrief()
  if (!metadata) return base
  let parsed: any
  try {
    parsed = JSON.parse(metadata)
  } catch {
    return base
  }
  const n = parsed?.narration
  if (!n || typeof n !== 'object') return base
  const num = (v: any, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const x = Number(v)
    return Number.isFinite(x) && x >= min && x <= max ? x : fallback
  }
  return {
    topic: typeof n.topic === 'string' ? n.topic : base.topic,
    targetDurationSec: num(n.targetDurationSec ?? n.target_duration_sec, base.targetDurationSec, 5, 3600),
    aspectRatio: (['16:9', '9:16', '1:1'] as const).includes(n.aspectRatio) ? n.aspectRatio : base.aspectRatio,
    style: typeof n.style === 'string' ? n.style : base.style,
    speechRate: num(n.speechRate ?? n.speech_rate, base.speechRate, 0.5, 2),
    audioConfigId: Number.isFinite(Number(n.audioConfigId)) && Number(n.audioConfigId) > 0 ? Number(n.audioConfigId) : null,
    voiceId: typeof n.voiceId === 'string' ? n.voiceId : base.voiceId,
    clipWithAudio: n.clipWithAudio === true || n.clip_with_audio === true,
    shotCount: num(n.shotCount ?? n.shot_count, base.shotCount, 0, 200),
  }
}

/** 把简报写回 dramas.metadata（保留 metadata 中的其它键） */
export async function saveNarrationBrief(dramaId: number, patch: Partial<NarrationBrief>): Promise<NarrationBrief> {
  const [drama] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId))
  if (!drama) throw new Error(`项目不存在（id=${dramaId}）`)
  let metadata: any = {}
  if (drama.metadata) {
    try {
      const parsed = JSON.parse(drama.metadata)
      if (parsed && typeof parsed === 'object') metadata = parsed
    } catch { /* 坏 JSON 直接重建，不阻断保存 */ }
  }
  const next = { ...parseNarrationBrief(drama.metadata), ...patch }
  metadata.narration = next
  await db.update(schema.dramas)
    .set({ metadata: JSON.stringify(metadata), updatedAt: new Date().toISOString() })
    .where(eq(schema.dramas.id, dramaId))
  return next
}

export async function readNarrationBrief(dramaId: number): Promise<NarrationBrief> {
  const [drama] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId))
  return parseNarrationBrief(drama?.metadata ?? null)
}

/** 有效语速（字/秒）：基准 × 倍率 */
export function effectiveCharsPerSecond(rate: number = DEFAULT_SPEECH_RATE): number {
  const r = Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_SPEECH_RATE
  return BASE_CHARS_PER_SECOND * r
}

/** 目标时长 → 口播稿字数预算（1.1 倍速下 60 秒 ≈ 277 字） */
export function charBudget(targetDurationSec: number, rate: number = DEFAULT_SPEECH_RATE): number {
  const seconds = Number.isFinite(targetDurationSec) && targetDurationSec > 0 ? targetDurationSec : 60
  return Math.max(1, Math.round(seconds * effectiveCharsPerSecond(rate)))
}

/** 去空白后的字数（中文按字符、英文按单词近似：连续 ASCII 词算 1） */
export function countSpokenChars(text: string): number {
  const stripped = String(text || '').replace(/\s+/g, '')
  if (!stripped) return 0
  // 英文单词按 1 字计（口语里一个单词约等于一个汉字时长量级）
  const asciiWords = stripped.match(/[A-Za-z0-9]+/g)?.length || 0
  const cjk = (stripped.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length
  const other = stripped.length - asciiWords * 0 - cjk
  // 标点计入停顿余量的一半
  return Math.max(0, cjk + asciiWords + Math.round(Math.max(0, other - asciiWords) * 0.5))
}

/** 文本 → 预计朗读时长（秒）。rate 为语速倍率 */
export function estimateDurationSec(text: string, rate: number = DEFAULT_SPEECH_RATE): number {
  return countSpokenChars(text) / effectiveCharsPerSecond(rate)
}

/**
 * 口播稿 → 句子数组。
 * 逐句合成是「画面与音轨同步」的前提：句子边界即镜头边界，句长决定镜头时长。
 */
export function splitNarrationSentences(text: string): string[] {
  const raw = String(text || '').replace(/\r\n?/g, '\n').trim()
  if (!raw) return []
  // 先按换行分段（空行视为段间停顿），再按中英文句末标点切句；标点跟随前句保留
  const out: string[] = []
  for (const paragraph of raw.split(/\n+/)) {
    const line = paragraph.trim()
    if (!line) continue
    const parts = line.match(/[^。！？!?；;…]+[。！？!?；;…]*/g) || [line]
    for (const part of parts) {
      const s = part.trim()
      if (s) out.push(s)
    }
  }
  return out
}

export interface NarrationShotPlan {
  /** 镜头序号，从 1 开始 */
  index: number
  /** 该镜头的口播文本（TTS 输入） */
  text: string
  /** 字数（去空白） */
  charCount: number
  /** 画面时长（秒）= 朗读时长 + 该句尾停顿 */
  durationSec: number
  /** 该句朗读时长（不含停顿），导出时用于校验 */
  speechSec: number
}

export interface ShotPlanResult {
  shots: NarrationShotPlan[]
  /** 计划总时长（Σ 镜头时长） */
  totalSec: number
  targetSec: number
  /** 相对目标的偏差比例（0.1 = 10%） */
  drift: number
  /** 在容差内 */
  withinTolerance: boolean
  /** 建议镜头数（按目标时长 / 平均句长） */
  suggestedShotCount: number
  warnings: string[]
}

/**
 * 把口播稿切成镜头计划：一句一镜；过短的相邻句合并，过长的句子按标点再切。
 * 时长按 1.1 倍语速换算，句尾插入停顿——这就是「画面跟着音轨」的依据。
 */
export function planShots(script: string, targetDurationSec: number, rate: number = DEFAULT_SPEECH_RATE): ShotPlanResult {
  const perSecond = effectiveCharsPerSecond(rate)
  const sentences = splitNarrationSentences(script)
  const warnings: string[] = []
  // 判定基准统一用「镜头时长」= 朗读时长 + 句尾停顿（拍板的是镜头长度，不是纯朗读长度）
  const shotSec = (text: string) => estimateDurationSec(text, rate) + PAUSE_SENTENCE_SEC

  // 1) 过长的句子按逗号再切（避免单镜超 12 秒无可视变化）
  const expanded: string[] = []
  for (const s of sentences) {
    if (shotSec(s) <= MAX_SHOT_SEC) { expanded.push(s); continue }
    const clauses = s.split(/(?<=[，,、])/).map(x => x.trim()).filter(Boolean)
    let buf = ''
    for (const c of clauses) {
      const candidate = buf + c
      if (buf && shotSec(candidate) > MAX_SHOT_SEC) { expanded.push(buf); buf = c }
      else buf = candidate
    }
    if (buf) expanded.push(buf)
  }

  // 2) 过短的相邻句合并（低于 MIN_SHOT_SEC 的画面会显得仓促）
  const merged: string[] = []
  for (const s of expanded) {
    const prev = merged[merged.length - 1]
    if (prev && shotSec(prev) < MIN_SHOT_SEC) merged[merged.length - 1] = prev + s
    else merged.push(s)
  }

  const shots: NarrationShotPlan[] = merged.map((text, i) => {
    const speechSec = estimateDurationSec(text, rate)
    return {
      index: i + 1,
      text,
      charCount: countSpokenChars(text),
      speechSec: round2(speechSec),
      durationSec: round2(speechSec + PAUSE_SENTENCE_SEC),
    }
  })

  const totalSec = round2(shots.reduce((sum, s) => sum + s.durationSec, 0))
  const target = Number.isFinite(targetDurationSec) && targetDurationSec > 0 ? targetDurationSec : 60
  const drift = target > 0 ? round2(Math.abs(totalSec - target) / target) : 0
  const suggestedShotCount = Math.max(1, Math.round(target / (perSecond * 0.9 + PAUSE_SENTENCE_SEC)))

  if (!shots.length) warnings.push('口播稿为空：请先生成或选择一版口播稿')
  if (shots.length && drift > DURATION_TOLERANCE) {
    warnings.push(
      `计划总时长 ${totalSec}s 与目标 ${target}s 相差 ${Math.round(drift * 100)}%（容差 ${Math.round(DURATION_TOLERANCE * 100)}%）：` +
      `可让 AI 调整稿子字数，或把语速从 ${rate} 微调（建议 ${suggestRateFor(shots.length, perSecond, target)} 左右）`,
    )
  }

  return { shots, totalSec, targetSec: target, drift, withinTolerance: drift <= DURATION_TOLERANCE, suggestedShotCount, warnings }
}

/** 反推：给定镜头数与目标时长，语速应设为多少 */
export function suggestRateFor(_shotCount: number, perSecond: number, targetSec: number): number {
  const base = BASE_CHARS_PER_SECOND
  const implied = perSecond * (targetSec > 0 ? 1 : 1)
  const rate = Number.isFinite(implied) && base > 0 ? implied / base : DEFAULT_SPEECH_RATE
  return Math.round(Math.min(2, Math.max(0.5, rate)) * 100) / 100
}

/** 语速倍率的合法区间（与 MIN/MAX_SPEECH_RATE 一致） */
export function clampSpeechRate(rate: number): number {
  const r = Number(rate)
  if (!Number.isFinite(r)) return DEFAULT_SPEECH_RATE
  return Math.round(Math.min(MAX_SPEECH_RATE, Math.max(MIN_SPEECH_RATE, r)) * 100) / 100
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * 导出时的对齐基准：把「估算时长」与「TTS 实测时长」合并成每镜的最终时长。
 * 规则（参考成熟做法：优先保完整动画，把余量放在尾帧停顿）：
 * - 有实测时长 → 以实测为准（+ 句尾停顿）
 * - 无实测 → 退回估算
 */
export function resolveShotDurations(
  shots: { index: number; estimatedSec: number; measuredSec?: number | null }[],
  pauseSec: number = PAUSE_SENTENCE_SEC,
): { index: number; durationSec: number; source: 'measured' | 'estimated' }[] {
  return shots.map(s => {
    const measured = Number(s.measuredSec)
    const useMeasured = Number.isFinite(measured) && measured > 0
    const base = useMeasured ? measured : s.estimatedSec
    return {
      index: s.index,
      durationSec: round2(Math.max(0.5, base + pauseSec)),
      source: useMeasured ? 'measured' as const : 'estimated' as const,
    }
  })
}
