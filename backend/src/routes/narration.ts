/**
 * 口播视频路由（/api/v1/narration）
 *
 * 与漫剧链路并列、互不影响：只读写「口播项目简报 + 口播稿版本 + 逐镜计划」。
 * 简报存在 dramas.metadata.narration（见 services/narration.ts），
 * 其中 speechRate 是**全链路唯一的语速来源**：写稿字数预算、镜头时长估算、TTS 下发倍速都用它。
 */
import { Hono } from 'hono'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db, getInsertId, schema } from '../db/index.js'
import { success, badRequest, notFound, created, now } from '../utils/response.js'
import {
  clampSpeechRate,
  PAUSE_SENTENCE_SEC,
  charBudget,
  effectiveCharsPerSecond,
  estimateDurationSec,
  parseNarrationBrief,
  planShots,
  readNarrationBrief,
  saveNarrationBrief,
  DEFAULT_SPEECH_RATE,
  MIN_SPEECH_RATE,
  MAX_SPEECH_RATE,
} from '../services/narration.js'
import { toSnakeCase } from '../utils/transform.js'
import { synthesizeSpeech } from '../services/tts-synth.js'
import {
  DEFAULT_FPS,
  DEFAULT_SAMPLE_RATE,
  mergeNarrationVideo,
  resolveTargetDuration,
  type NarrationSegment,
} from '../services/narration-merge.js'
import { extractVideoPoster } from '../utils/video-poster.js'
import { logTaskWarn } from '../utils/task-logger.js'

const app = new Hono()

/**
 * 口播项目唯一的一集（创建项目时自动建立）。
 * 不简单取「第一集」：若该项目下意外多出集（例如从漫剧工作台误建），
 * 优先返回**真正装了口播镜头**的那一集，避免工作台显示空、看起来像数据丢了。
 */
async function requireEpisode(dramaId: number) {
  const eps = (await db.select().from(schema.episodes).where(eq(schema.episodes.dramaId, dramaId)))
    .filter(e => !e.deletedAt)
  if (eps.length <= 1) return eps[0] || null
  const shotCounts = new Map<number, number>()
  for (const e of eps) {
    const rows = await db.select().from(schema.storyboards).where(eq(schema.storyboards.episodeId, e.id))
    shotCounts.set(e.id, rows.filter(r => !r.deletedAt).length)
  }
  return [...eps].sort((a, b) => (shotCounts.get(b.id) || 0) - (shotCounts.get(a.id) || 0)
    || a.episodeNumber - b.episodeNumber)[0]
}

/**
 * 口播镜头列表（统一 snake_case，供工作台与合并共用）。
 * 顺带带出**每个镜头最新一条生图/生视频任务**的状态：
 * 卡片要能显示「生成中 / 已用时 / 失败原因」，刷新页面后也要能恢复这个状态，
 * 所以状态的唯一来源是服务端任务表，而不是前端内存。
 */
async function listNarrationShots(episodeId: number, dramaId?: number) {
  const rows = await db.select().from(schema.storyboards)
    .where(eq(schema.storyboards.episodeId, episodeId))
  const alive = rows.filter(r => !r.deletedAt).sort((a, b) => a.storyboardNumber - b.storyboardNumber)
  const ids = alive.map(r => r.id)

  // 一次查全量任务再按 (镜头, 类型) 取最新，避免每个镜头一条 SQL
  const tasks = ids.length
    ? await db.select().from(schema.sysTask).where(inArray(schema.sysTask.storyboardId, ids))
    : []
  const latest: Record<string, any> = {}
  const history: Record<string, any[]> = {}
  const imageHistory: Record<string, any[]> = {}
  for (const t of tasks) {
    const key = `${t.storyboardId}:${t.type}`
    const prev = latest[key]
    if (!prev || String(t.createdAt) > String(prev.createdAt) || (t.createdAt === prev.createdAt && t.id > prev.id)) {
      latest[key] = t
    }
    // 视频历史：有成品路径的、或还没结束/失败的都留（多次生成会累积成多个版本）
    const st = String(t.status || '')
    if (t.type === 'video' && (t.localPath || st === 'processing' || st === 'pending' || st === 'failed')) {
      if (!history[`${t.storyboardId}`]) history[`${t.storyboardId}`] = []
      history[`${t.storyboardId}`].push(t)
    }
    // 关键帧图片同样保留多张候选（用户可挑一张设为当前关键帧，或作为片段首/尾帧）
    if (t.type === 'image' && t.localPath) {
      if (!imageHistory[`${t.storyboardId}`]) imageHistory[`${t.storyboardId}`] = []
      imageHistory[`${t.storyboardId}`].push(t)
    }
  }
  const taskInfo = (shotId: number, type: string) => {
    const t = latest[`${shotId}:${type}`]
    if (!t) return null
    const elapsed = Math.max(0, Math.round((Date.now() - new Date(String(t.createdAt)).getTime()) / 1000))
    return {
      id: t.id,
      status: String(t.status || ''),
      error_msg: t.errorMsg || '',
      created_at: t.createdAt,
      updated_at: t.updatedAt,
      completed_at: t.completedAt || null,
      // 无百分比字段：前端用「已用时」表达进度（处理中才累加）
      elapsed_sec: String(t.status) === 'processing' || String(t.status) === 'pending' ? elapsed : null,
    }
  }
  /** 该镜头的关键帧候选图（新→旧，最多 20 张）：保留多张，可选用/删除 */
  const keyframeHistory = (shotId: number) => (imageHistory[`${shotId}`] || [])
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 20)
    .map(t => {
      let params: any = {}
      try { params = JSON.parse(String(t.params || '{}')) || {} } catch { /* 忽略坏 JSON */ }
      return {
        id: t.id,
        status: String(t.status || ''),
        path: t.localPath || '',
        error_msg: t.errorMsg || '',
        model: t.model || '',
        provider: t.provider || '',
        task_id: t.taskId || '',
        resolution: params.resolution || '',
        created_at: t.createdAt,
      }
    })

  /** 该镜头的视频生成历史（新→旧，最多 20 条）：支持「同一段多次生成、逐个查看/选用」 */
  const clipHistory = (shotId: number) => (history[`${shotId}`] || [])
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 20)
    .map(t => {
      let params: any = {}
      try { params = JSON.parse(String(t.params || '{}')) || {} } catch { /* 忽略坏 JSON */ }
      // 已用时：优先 completed-created，未结束的按现在还差多久（前端每秒重算，这里给基准值）
      const started = new Date(String(t.createdAt)).getTime()
      const ended = t.completedAt ? new Date(String(t.completedAt)).getTime() : Date.now()
      const elapsed = Number.isFinite(started) && Number.isFinite(ended) ? Math.max(0, Math.round((ended - started) / 1000)) : null
      return {
        id: t.id,
        status: String(t.status || ''),
        path: t.localPath || '',
        error_msg: t.errorMsg || '',
        model: t.model || '',
        provider: t.provider || '',
        // 「详情」要展示的辅助信息：提示词、输出规格、上游任务号、参数与耗时
        prompt: t.prompt || '',
        task_id: t.taskId || '',
        result_url: t.resultUrl || '',
        resolution: params.resolution || '',
        generate_audio: !!params.generateAudio,
        requested_duration: params.duration ?? null,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        completed_at: t.completedAt || null,
        elapsed_sec: elapsed,
        duration: params.duration ?? null,
      }
    })

  const shots = alive.map(r => ({
    id: r.id,
    shot_number: r.storyboardNumber,
    keyframe_prompt: r.imagePrompt || '',
    narration_text: r.narrationText || r.description || '',
    video_prompt: r.videoPrompt || '',
    atmosphere: r.atmosphere || '',
    duration_sec: r.narrationTargetDuration ?? r.duration ?? 0,
    keyframe_image: r.firstFrameImage || r.composedImage || '',
    last_frame_image: r.lastFrameImage || '',
    video_url: r.videoUrl || '',
    narration_audio_url: r.narrationAudioUrl || '',
    narration_audio_duration: r.narrationAudioDuration ?? null,
    status: r.status || 'pending',
    image_task: taskInfo(r.id, 'image'),
    clip_task: taskInfo(r.id, 'video'),
    // 关键帧候选图（保留多张）+ 该段的多次生成记录
    keyframe_history: keyframeHistory(r.id),
    clip_history: clipHistory(r.id),
    // 片段首尾帧的显式选用（空 = 跟随当前关键帧）
    clip_first_frame: r.clipFirstFrame || '',
    clip_last_frame: r.clipLastFrame || '',
  }))

  const counts = {
    image: { generating: shots.filter(s => s.image_task && (s.image_task.status === 'processing' || s.image_task.status === 'pending')).length },
    clip: { generating: shots.filter(s => s.clip_task && (s.clip_task.status === 'processing' || s.clip_task.status === 'pending')).length },
  }
  return { shots, counts, drama_id: dramaId ?? null }
}

/** 倍速取值：0.5~2.0，两位小数；越界直接 400（不静默钳制，避免用户以为设置生效了） */
function parseSpeechRate(raw: unknown): { rate?: number; error?: string } {
  if (raw === undefined || raw === null || raw === '') return {}
  const n = Number(raw)
  if (!Number.isFinite(n)) return { error: '语速倍率必须是数字' }
  if (n < MIN_SPEECH_RATE || n > MAX_SPEECH_RATE) {
    return { error: `语速倍率需在 ${MIN_SPEECH_RATE}~${MAX_SPEECH_RATE} 之间（当前 ${n}）` }
  }
  return { rate: clampSpeechRate(n) }
}

/** 简报 + 派生值：前端不用自己算字数预算与预计时长，避免两处口径漂移 */
function withDerived(brief: ReturnType<typeof parseNarrationBrief>) {
  return {
    ...brief,
    speech_rate: brief.speechRate,
    target_duration_sec: brief.targetDurationSec,
    aspect_ratio: brief.aspectRatio,
    clip_with_audio: brief.clipWithAudio,
    audio_config_id: brief.audioConfigId,
    voice_id: brief.voiceId,
    shot_count: brief.shotCount,
    default_speech_rate: DEFAULT_SPEECH_RATE,
    speech_rate_range: { min: MIN_SPEECH_RATE, max: MAX_SPEECH_RATE },
    // 派生：当前倍速下每秒读多少字、目标时长对应多少字
    chars_per_second: Math.round(effectiveCharsPerSecond(brief.speechRate) * 100) / 100,
    char_budget: charBudget(brief.targetDurationSec, brief.speechRate),
  }
}

async function requireDrama(dramaId: number) {
  const [drama] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId))
  return drama || null
}

// GET /narration/:dramaId/brief — 简报 + 派生值
app.get('/:dramaId/brief', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const drama = await requireDrama(dramaId)
  if (!drama) return notFound(c, '项目不存在')
  const brief = await readNarrationBrief(dramaId)
  return success(c, {
    drama_id: dramaId,
    project_type: drama.projectType || 'drama',
    title: drama.title,
    brief: withDerived(brief),
  })
})

// PUT /narration/:dramaId/brief — 更新简报（主题/时长/画幅/风格/语速/音色/片段是否带音频）
app.put('/:dramaId/brief', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const drama = await requireDrama(dramaId)
  if (!drama) return notFound(c, '项目不存在')

  const body = await c.req.json().catch(() => ({}))
  const patch: Record<string, any> = {}

  if (body.topic !== undefined) patch.topic = String(body.topic).slice(0, 2000)
  if (body.style !== undefined) patch.style = String(body.style).slice(0, 120)
  if (body.voice_id !== undefined) patch.voiceId = String(body.voice_id).slice(0, 200)
  if (body.aspect_ratio !== undefined) {
    const ar = String(body.aspect_ratio)
    if (!['16:9', '9:16', '1:1'].includes(ar)) return badRequest(c, '画幅只支持 16:9 / 9:16 / 1:1')
    patch.aspectRatio = ar
  }
  if (body.clip_with_audio !== undefined) patch.clipWithAudio = body.clip_with_audio === true
  if (body.audio_config_id !== undefined) {
    const id = Number(body.audio_config_id)
    patch.audioConfigId = Number.isFinite(id) && id > 0 ? id : null
  }
  if (body.shot_count !== undefined) {
    const n = Number(body.shot_count)
    if (!Number.isFinite(n) || n < 0 || n > 200) return badRequest(c, '镜头数需在 0~200 之间')
    patch.shotCount = Math.round(n)
  }
  if (body.target_duration_sec !== undefined) {
    const n = Number(body.target_duration_sec)
    if (!Number.isFinite(n) || n < 5 || n > 3600) return badRequest(c, '目标时长需在 5~3600 秒之间')
    patch.targetDurationSec = Math.round(n)
  }
  const rate = parseSpeechRate(body.speech_rate ?? body.speechRate)
  if (rate.error) return badRequest(c, rate.error)
  if (rate.rate !== undefined) patch.speechRate = rate.rate

  const next = await saveNarrationBrief(dramaId, patch)
  return success(c, withDerived(next))
})

// GET /narration/:dramaId/scripts — 口播稿的多个版本（含是否选定）
app.get('/:dramaId/scripts', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const drama = await requireDrama(dramaId)
  if (!drama) return notFound(c, '项目不存在')
  const brief = await readNarrationBrief(dramaId)
  const rows = await db.select().from(schema.narrationScripts)
    .where(eq(schema.narrationScripts.dramaId, dramaId))
  const scripts = rows
    .sort((a, b) => a.versionIndex - b.versionIndex)
    .map(r => ({
      ...toSnakeCase(r),
      // 用当前倍速复算时长：用户改倍速后，同一份稿子的预计时长应当随之变化
      est_duration_sec: Math.round(estimateDurationSec(r.content, brief.speechRate) * 100) / 100,
    }))
  return success(c, { brief: withDerived(brief), scripts })
})

// POST /narration/:dramaId/scripts/:id/select — 人工选定一版（同项目内互斥）
// 选定是后续所有步骤的闸门：没选定就不该扩写分镜、生图、配音
app.post('/:dramaId/scripts/:id/select', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const scriptId = Number(c.req.param('id'))
  const drama = await requireDrama(dramaId)
  if (!drama) return notFound(c, '项目不存在')
  const rows = await db.select().from(schema.narrationScripts)
    .where(eq(schema.narrationScripts.dramaId, dramaId))
  const target = rows.find(r => r.id === scriptId)
  if (!target) return badRequest(c, '口播稿版本不存在')

  const ts = now()
  for (const r of rows) {
    const shouldSelect = r.id === scriptId
    if (!!r.isSelected === shouldSelect) continue
    await db.update(schema.narrationScripts)
      .set({ isSelected: shouldSelect, updatedAt: ts })
      .where(eq(schema.narrationScripts.id, r.id))
  }
  return success(c, { selected_id: scriptId, version_index: target.versionIndex })
})

// GET /narration/:dramaId/plan — 按当前选定稿 + 倍速算出的逐镜计划（生成前预览）
app.get('/:dramaId/plan', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const drama = await requireDrama(dramaId)
  if (!drama) return notFound(c, '项目不存在')
  const brief = await readNarrationBrief(dramaId)
  const rows = await db.select().from(schema.narrationScripts)
    .where(and(eq(schema.narrationScripts.dramaId, dramaId), eq(schema.narrationScripts.isSelected, true)))
  const selected = rows[0]
  if (!selected) return success(c, { selected: null, plan: null, brief: withDerived(brief) })
  const plan = planShots(selected.content, brief.targetDurationSec, brief.speechRate)
  return success(c, {
    selected: toSnakeCase(selected),
    // 统一 HTTP 侧命名（本项目响应一律 snake_case），避免前端一处 camel 一处 snake
    plan: {
      shots: plan.shots.map(s => ({
        index: s.index,
        text: s.text,
        char_count: s.charCount,
        duration_sec: s.durationSec,
        speech_sec: s.speechSec,
      })),
      total_sec: plan.totalSec,
      target_sec: plan.targetSec,
      drift: plan.drift,
      within_tolerance: plan.withinTolerance,
      suggested_shot_count: plan.suggestedShotCount,
      warnings: plan.warnings,
    },
    brief: withDerived(brief),
  })
})

/**
 * POST /narration/:dramaId/shots/:shotId/clip — 选用某个历史版本作为该段成片片段
 * body: { task_id }
 *
 * 一段可以多次生成（每次生成都会新增一条历史记录），这里把选中的那一条写回
 * storyboards.video_url —— 与漫剧工作台一致：历史记录只是候选，主视频才是导出的依据。
 */
app.post('/:dramaId/shots/:shotId/clip', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const shotId = Number(c.req.param('shotId'))
  const drama = await requireDrama(dramaId)
  if (!drama) return notFound(c, '项目不存在')
  const body = await c.req.json().catch(() => ({}))
  const taskId = Number(body.task_id)
  if (!Number.isFinite(taskId) || taskId <= 0) return badRequest(c, '缺少有效的 task_id')

  const [shot] = await db.select().from(schema.storyboards).where(eq(schema.storyboards.id, shotId))
  if (!shot || shot.deletedAt) return notFound(c, '镜头不存在')
  const [task] = await db.select().from(schema.sysTask).where(eq(schema.sysTask.id, taskId))
  if (!task || task.type !== 'video' || task.storyboardId !== shotId) return badRequest(c, '该记录不属于这个镜头')
  if (!task.localPath) return badRequest(c, '这条记录还没有生成好的视频文件，无法选为成片片段')

  let duration = 0
  try { duration = Number(JSON.parse(String(task.params || '{}')).duration) || 0 } catch { /* 忽略 */ }
  await db.update(schema.storyboards)
    .set({ videoUrl: task.localPath, duration: duration || shot.duration, updatedAt: now() })
    .where(eq(schema.storyboards.id, shotId))

  return success(c, { shot_id: shotId, task_id: taskId, video_url: task.localPath })
})

/**
 * POST /narration/:dramaId/shots/:shotId/keyframe — 把某张候选图设为该镜的当前关键帧
 * body: { task_id }
 *
 * 关键帧会保留多张候选（每次重绘都留一条），当前关键帧是**下游默认取值**：
 * 片段的首帧默认就是它，所以换一张即等于换片段首帧。
 */
app.post('/:dramaId/shots/:shotId/keyframe', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const shotId = Number(c.req.param('shotId'))
  const drama = await requireDrama(dramaId)
  if (!drama) return notFound(c, '项目不存在')
  const body = await c.req.json().catch(() => ({}))
  const taskId = Number(body.task_id)
  if (!Number.isFinite(taskId) || taskId <= 0) return badRequest(c, '缺少有效的 task_id')

  const [shot] = await db.select().from(schema.storyboards).where(eq(schema.storyboards.id, shotId))
  if (!shot || shot.deletedAt) return notFound(c, '镜头不存在')
  const [task] = await db.select().from(schema.sysTask).where(eq(schema.sysTask.id, taskId))
  if (!task || task.type !== 'image' || task.storyboardId !== shotId) return badRequest(c, '该图片不属于这个镜头')
  if (!task.localPath) return badRequest(c, '这张候选图还没有生成好的文件，无法设为当前关键帧')

  await db.update(schema.storyboards)
    .set({ firstFrameImage: task.localPath, updatedAt: now() })
    .where(eq(schema.storyboards.id, shotId))
  return success(c, { shot_id: shotId, task_id: taskId, keyframe_image: task.localPath })
})

/**
 * POST /narration/:dramaId/shots/:shotId/clip-frames — 选用该段片段的首帧/尾帧
 * body: { first_frame?: string, last_frame?: string }（传空串 = 恢复默认：跟随当前关键帧）
 *
 * 首帧与尾帧都可以从**多个关键帧候选**里挑：首帧通常取本镜的候选，
 * 尾帧取下一镜的候选（也可以传任意已落库的图片路径）。
 */
app.post('/:dramaId/shots/:shotId/clip-frames', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const shotId = Number(c.req.param('shotId'))
  const drama = await requireDrama(dramaId)
  if (!drama) return notFound(c, '项目不存在')
  const body = await c.req.json().catch(() => ({}))
  const [shot] = await db.select().from(schema.storyboards).where(eq(schema.storyboards.id, shotId))
  if (!shot || shot.deletedAt) return notFound(c, '镜头不存在')

  const patch: Record<string, any> = { updatedAt: now() }
  if ('first_frame' in body) patch.clipFirstFrame = String(body.first_frame || '').trim() || null
  if ('last_frame' in body) patch.clipLastFrame = String(body.last_frame || '').trim() || null
  if (Object.keys(patch).length === 1) return badRequest(c, '没有需要更新的字段')
  await db.update(schema.storyboards).set(patch).where(eq(schema.storyboards.id, shotId))
  return success(c, {
    shot_id: shotId,
    clip_first_frame: patch.clipFirstFrame ?? shot.clipFirstFrame ?? '',
    clip_last_frame: patch.clipLastFrame ?? shot.clipLastFrame ?? '',
  })
})

// GET /narration/:dramaId/shots — 已落库的口播镜头（关键帧提示词 + 旁白文本）
app.get('/:dramaId/shots', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const drama = await requireDrama(dramaId)
  if (!drama) return notFound(c, '项目不存在')
  const episode = await requireEpisode(dramaId)
  if (!episode) return success(c, { episode_id: null, shots: [], counts: { image: { generating: 0 }, clip: { generating: 0 } } })
  const listed = await listNarrationShots(episode.id, dramaId)
  return success(c, { episode_id: episode.id, ...listed })
})

/**
 * POST /narration/:dramaId/synthesize — 逐句配音（口播音轨）
 *
 * 逐句而不是整段，是音画对齐的前提：每句的**实测时长**决定该镜头画面多长。
 * 语速倍率取项目简报（默认 1.1），逐句下发给 TTS；否则画面对不上声音。
 * body: { shot_ids?: number[], config_id?, voice_id?, speed? }
 */
app.post('/:dramaId/synthesize', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const drama = await requireDrama(dramaId)
  if (!drama) return notFound(c, '项目不存在')
  const episode = await requireEpisode(dramaId)
  if (!episode) return badRequest(c, '口播项目缺少集，无法配音')

  const brief = await readNarrationBrief(dramaId)
  const body = await c.req.json().catch(() => ({}))
  const onlyIds: number[] | null = Array.isArray(body.shot_ids) && body.shot_ids.length ? body.shot_ids.map(Number) : null
  const speed = clampSpeechRate(body.speed ?? brief.speechRate)
  const configId = body.config_id !== undefined ? Number(body.config_id) || null : brief.audioConfigId
  const voiceId = body.voice_id !== undefined ? String(body.voice_id) : brief.voiceId

  const rows = await db.select().from(schema.storyboards).where(eq(schema.storyboards.episodeId, episode.id))
  const targets = rows
    .filter(r => !r.deletedAt && (onlyIds ? onlyIds.includes(r.id) : true))
    .sort((a, b) => a.storyboardNumber - b.storyboardNumber)

  const results: any[] = []
  const errors: string[] = []
  let spokenSec = 0
  for (const shot of targets) {
    const text = String(shot.narrationText || shot.description || '').trim()
    if (!text) { errors.push(`镜头 ${shot.storyboardNumber}：没有旁白文本，已跳过`); continue }
    try {
      const speech = await synthesizeSpeech({
        text,
        configId,
        // 顶栏选定的音频模型（同一配置内多模型时生效；不传则用配置首个模型）
        model: body.model !== undefined ? String(body.model) : undefined,
        voiceId,
        speed,
        format: String(body.format || '').toLowerCase() === 'wav' ? 'wav' : 'mp3',
      })
      const measured = speech.durationSec
      const target = resolveTargetDuration({ measuredSec: measured, plannedSec: shot.narrationTargetDuration })
      await db.update(schema.storyboards)
        .set({
          narrationAudioUrl: speech.path,
          narrationAudioDuration: measured === null ? null : Math.round(measured * 100) / 100,
          narrationTargetDuration: target,
          duration: Math.max(1, Math.round(target)),
          updatedAt: now(),
        })
        .where(eq(schema.storyboards.id, shot.id))
      if (measured) spokenSec += measured
      results.push({
        shot_id: shot.id,
        shot_number: shot.storyboardNumber,
        path: speech.path,
        audio_duration_sec: measured === null ? null : Math.round(measured * 100) / 100,
        target_duration_sec: target,
      })
    } catch (e: any) {
      errors.push(`镜头 ${shot.storyboardNumber}：${String(e?.message || e).slice(0, 160)}`)
    }
  }

  // 顺带校正简报里的总时长预期：Σ实测朗读时长（不含停顿）
  const totalSec = Math.round((spokenSec + results.length * PAUSE_SENTENCE_SEC) * 100) / 100
  return success(c, {
    synthesized: results.length,
    skipped: targets.length - results.length,
    speed,
    voice_id: voiceId || null,
    config_id: configId ?? null,
    spoken_sec: Math.round(spokenSec * 100) / 100,
    total_with_pauses_sec: totalSec,
    results,
    errors,
  })
})

/**
 * POST /narration/:dramaId/merge — 剪辑合并导出
 * body: { shot_ids?: number[], resolution?: '720p'|'1080p', include_audio?: boolean }
 * 每段画面按「该句实测音频时长 + 停顿」重定时，音轨用逐句配音，逐段音画等长。
 */
app.post('/:dramaId/merge', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const drama = await requireDrama(dramaId)
  if (!drama) return notFound(c, '项目不存在')
  const episode = await requireEpisode(dramaId)
  if (!episode) return badRequest(c, '口播项目缺少集，无法合并')

  const body = await c.req.json().catch(() => ({}))
  const brief = await readNarrationBrief(dramaId)
  const onlyIds: number[] | null = Array.isArray(body.shot_ids) && body.shot_ids.length ? body.shot_ids.map(Number) : null
  const includeAudio = body.include_audio !== false

  const { shots } = await listNarrationShots(episode.id, dramaId)
  const selected = shots.filter(s => (onlyIds ? onlyIds.includes(s.id) : true))
  if (!selected.length) return badRequest(c, '没有可合并的镜头')

  const segments = selected.map(s => ({
    index: s.shot_number,
    videoPath: s.video_url || undefined,
    imagePath: s.keyframe_image || undefined,
    audioPath: includeAudio ? (s.narration_audio_url || undefined) : undefined,
    targetDuration: resolveTargetDuration({ measuredSec: s.narration_audio_duration, plannedSec: s.duration_sec }),
    text: s.narration_text,
  }))
  const missing = segments.filter(s => !s.videoPath && !s.imagePath).map(s => s.index)
  if (missing.length) {
    return badRequest(c, `镜头 ${missing.join('、')} 还没有视频片段或关键帧图片，无法参与合并`)
  }
  if (includeAudio && segments.some(s => !s.audioPath)) {
    // 缺配音的镜头仍然可以合并（画面保留、该段静音），但要让用户知道
    logTaskWarn('NarrationMerge', 'missing-audio', { shots: segments.filter(s => !s.audioPath).map(s => s.index) })
  }

  const resolution = String(body.resolution || episode.resolution || '720p').toLowerCase()
  const [width, height] = resolution.startsWith('1080') ? [1920, 1080] : resolution.startsWith('480') ? [854, 480] : [1280, 720]

  // 建记录后异步执行（与漫剧拼接同一张表，成片列表/删除逻辑可复用）
  const ts = now()
  const res = await db.insert(schema.videoMerges).values({
    episodeId: episode.id,
    dramaId,
    title: `${drama.title || '口播'} · 口播成片`,
    provider: 'ffmpeg',
    model: 'ffmpeg-narration-retimed',
    status: 'processing',
    scenes: JSON.stringify(segments.map(s => s.videoPath || s.imagePath)),
    createdAt: ts,
  })
  const mergeId = getInsertId(res)

  mergeNarrationVideo(segments, { width, height, fps: DEFAULT_FPS, sampleRate: DEFAULT_SAMPLE_RATE })
    .then(async (out) => {
      await db.update(schema.videoMerges)
        .set({
          status: 'completed',
          mergedUrl: out.mergedRelative,
          duration: Math.round(out.durationSec),
          completedAt: now(),
        })
        .where(eq(schema.videoMerges.id, mergeId))
      await db.update(schema.episodes)
        .set({ videoUrl: out.mergedRelative, updatedAt: now() })
        .where(eq(schema.episodes.id, episode.id))
      await extractVideoPoster(out.mergedRelative)
    })
    .catch(async (err: Error) => {
      await db.update(schema.videoMerges)
        .set({ status: 'failed', errorMsg: err.message })
        .where(eq(schema.videoMerges.id, mergeId))
    })

  return created(c, {
    merge_id: mergeId,
    status: 'processing',
    segments: segments.length,
    planned_total_sec: Math.round(segments.reduce((n, s) => n + s.targetDuration, 0) * 100) / 100,
    resolution: `${width}x${height}`,
    include_audio: includeAudio,
    speech_rate: brief.speechRate,
  })
})

export default app

