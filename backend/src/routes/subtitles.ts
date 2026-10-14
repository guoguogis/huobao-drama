/**
 * 口播字幕接口。
 *
 * 设计要点（与需求一致）：
 * - 独立阶段：字幕挂在**已成片**的记录上，改字幕/重烧不影响成片本身；
 * - 复用时间轴：字幕行初次由 `video_merges.timeline` 生成（合并时落库的逐段实测起止），
 *   之后**独立编辑**，因此改字幕不会连带改动配音与画面；
 * - 两种产物：硬烧成片（兼容性最好）与软字幕成片（内挂可开关），可并存对比。
 */
import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, badRequest, notFound, created, now } from '../utils/response.js'
import {
  buildLines, writeSrt, burnSubtitles, muxSoftSubtitles, staticRelToAbs,
  DEFAULT_SUBTITLE_STYLE, type SubtitleLine, type SubtitleStyle,
} from '../services/subtitles.js'
import { logTaskSuccess, logTaskError } from '../utils/task-logger.js'

const app = new Hono()

function parseJson<T>(raw: unknown, fallback: T): T {
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw
    return (v ?? fallback) as T
  } catch {
    return fallback
  }
}

/** 归一化样式：白名单字段 + 数值夹取，避免前端塞进奇怪的值 */
export function normalizeStyle(input: any): SubtitleStyle {
  const s = { ...DEFAULT_SUBTITLE_STYLE, ...(input || {}) }
  const clamp = (v: any, min: number, max: number, dflt: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt
  }
  return {
    maxChars: clamp(s.maxChars, 6, 60, DEFAULT_SUBTITLE_STYLE.maxChars),
    offsetSec: clamp(s.offsetSec, -30, 30, 0),
    fontSize: clamp(s.fontSize, 8, 72, DEFAULT_SUBTITLE_STYLE.fontSize),
    primaryColour: String(s.primaryColour || DEFAULT_SUBTITLE_STYLE.primaryColour).slice(0, 16),
    outlineColour: String(s.outlineColour || DEFAULT_SUBTITLE_STYLE.outlineColour).slice(0, 16),
    outline: clamp(s.outline, 0, 6, DEFAULT_SUBTITLE_STYLE.outline),
    marginV: clamp(s.marginV, 0, 200, DEFAULT_SUBTITLE_STYLE.marginV),
    bold: s.bold ? 1 : 0,
    fontName: String(s.fontName || DEFAULT_SUBTITLE_STYLE.fontName).slice(0, 60),
  }
}

/** 取成片记录（必须属于该项目且已完成） */
async function requireMerge(dramaId: number, mergeId: number) {
  const [row] = await db.select().from(schema.videoMerges).where(eq(schema.videoMerges.id, mergeId))
  if (!row || row.dramaId !== dramaId || row.deletedAt) return null
  return row
}

/** 找或建该成片的字幕记录；首次建立时用成片时间轴生成字幕行（此后不再覆盖） */
async function ensureSubtitleRow(dramaId: number, mergeId: number) {
  const merge = await requireMerge(dramaId, mergeId)
  if (!merge) return { error: 'notFound' as const }
  if (!merge.mergedUrl) return { error: 'notReady' as const }
  const [existing] = await db.select().from(schema.narrationSubtitles).where(eq(schema.narrationSubtitles.mergeId, mergeId))
  if (existing) return { row: existing, merge }

  const timeline = parseJson<any[]>(merge.timeline, [])
  const style = normalizeStyle({})
  const lines = buildLines(timeline, style)
  const ts = now()
  const res = await db.insert(schema.narrationSubtitles).values({
    mergeId, dramaId,
    lines: JSON.stringify(lines),
    style: JSON.stringify(style),
    status: 'draft',
    createdAt: ts, updatedAt: ts,
  })
  const [row] = await db.select().from(schema.narrationSubtitles).where(eq(schema.narrationSubtitles.id, Number(res.lastInsertRowid)))
  logTaskSuccess('Subtitle', 'row-created', { mergeId, lines: lines.length })
  return { row, merge }
}

const shape = (row: any, merge: any) => ({
  id: row.id,
  merge_id: row.mergeId,
  drama_id: row.dramaId,
  status: row.status || 'draft',
  error_msg: row.errorMsg || '',
  lines: parseJson<SubtitleLine[]>(row.lines, []),
  style: normalizeStyle(parseJson(row.style, {})),
  srt_url: row.srtPath || '',
  burned_url: row.burnedPath || '',
  soft_url: row.softPath || '',
  merge: merge ? {
    id: merge.id,
    title: merge.title,
    merged_url: merge.mergedUrl,
    duration: merge.duration,
    completed_at: merge.completedAt,
    timeline: parseJson<any[]>(merge.timeline, []),
  } : null,
})

// GET /narration/:dramaId/subtitles?merge_id=N
app.get('/:dramaId/subtitles', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const mergeId = Number(c.req.query('merge_id'))
  if (!Number.isFinite(mergeId) || mergeId <= 0) return badRequest(c, '缺少 merge_id')
  const out = await ensureSubtitleRow(dramaId, mergeId)
  if ('error' in out) {
    return out.error === 'notFound' ? notFound(c, '成片不存在') : badRequest(c, '该成片还没有完成合并，无法添加字幕')
  }
  return success(c, shape(out.row, out.merge))
})

// PUT /narration/:dramaId/subtitles — 保存字幕行与样式 -- body: { merge_id, lines?, style? }
app.put('/:dramaId/subtitles', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const body = await c.req.json().catch(() => ({}))
  const mergeId = Number(body.merge_id)
  if (!Number.isFinite(mergeId) || mergeId <= 0) return badRequest(c, '缺少 merge_id')
  const out = await ensureSubtitleRow(dramaId, mergeId)
  if ('error' in out) {
    return out.error === 'notFound' ? notFound(c, '成片不存在') : badRequest(c, '该成片还没有完成合并，无法添加字幕')
  }

  const patch: Record<string, any> = { updatedAt: now() }
  if (Array.isArray(body.lines)) {
    const lines: SubtitleLine[] = body.lines.map((l: any, i: number) => ({
      index: i + 1,
      shot_id: Number(l.shot_id) || undefined,
      shot_number: Number(l.shot_number) || undefined,
      start: Math.max(0, Number(l.start) || 0),
      end: Math.max((Number(l.start) || 0) + 0.2, Number(l.end) || 0),
      text: String(l.text ?? '').slice(0, 500),
    }))
    patch.lines = JSON.stringify(lines)
  }
  if (body.style) patch.style = JSON.stringify(normalizeStyle(body.style))
  await db.update(schema.narrationSubtitles).set(patch).where(eq(schema.narrationSubtitles.id, out.row.id))
  const [row] = await db.select().from(schema.narrationSubtitles).where(eq(schema.narrationSubtitles.id, out.row.id))
  return success(c, shape(row, out.merge))
})

/**
 * POST /narration/:dramaId/subtitles/render — 生成 SRT 并按需硬烧/软字幕
 * body: { merge_id, srt?: boolean, burn?: boolean, soft?: boolean }
 */
app.post('/:dramaId/subtitles/render', async (c) => {
  const dramaId = Number(c.req.param('dramaId'))
  const body = await c.req.json().catch(() => ({}))
  const mergeId = Number(body.merge_id)
  if (!Number.isFinite(mergeId) || mergeId <= 0) return badRequest(c, '缺少 merge_id')
  const wantBurn = body.burn !== false
  const wantSoft = body.soft !== false

  const out = await ensureSubtitleRow(dramaId, mergeId)
  if ('error' in out) {
    return out.error === 'notFound' ? notFound(c, '成片不存在') : badRequest(c, '该成片还没有完成合并，无法添加字幕')
  }
  const { row, merge } = out
  const lines = parseJson<SubtitleLine[]>(row.lines, [])
  const style = normalizeStyle(parseJson(row.style, {}))
  if (!lines.length) return badRequest(c, '还没有字幕内容：请先确认成片时间轴或补写字幕文本')

  const key = `narration-${mergeId}`
  const srtRel = writeSrt(lines, style, key)
  const srtAbs = staticRelToAbs(srtRel)
  const videoAbs = staticRelToAbs(String(merge.mergedUrl))
  const stamp = Date.now()
  const burnedRel = `static/videos/${key}-burned-${stamp}.mp4`
  const softRel = `static/videos/${key}-soft-${stamp}.mp4`

  await db.update(schema.narrationSubtitles)
    .set({ srtPath: srtRel, status: 'rendering', errorMsg: null, updatedAt: now() })
    .where(eq(schema.narrationSubtitles.id, row.id))
  const base = { srt_path: srtRel, srt_url: `/${srtRel}` }

  // 软字幕很快（只封装），硬烧要重编码：这里同步等软、异步跑硬烧？——都异步，前端轮询即可
  void (async () => {
    try {
      if (wantSoft) {
        await muxSoftSubtitles({ videoAbs, srtAbs, outAbs: staticRelToAbs(softRel) })
        await db.update(schema.narrationSubtitles).set({ softPath: softRel, updatedAt: now() })
          .where(eq(schema.narrationSubtitles.id, row.id))
        logTaskSuccess('Subtitle', 'soft-done', { mergeId, softRel })
      }
      if (wantBurn) {
        await burnSubtitles({ videoAbs, srtAbs, outAbs: staticRelToAbs(burnedRel), style })
        await db.update(schema.narrationSubtitles).set({ burnedPath: burnedRel, updatedAt: now() })
          .where(eq(schema.narrationSubtitles.id, row.id))
        logTaskSuccess('Subtitle', 'burn-done', { mergeId, burnedRel })
      }
      await db.update(schema.narrationSubtitles).set({ status: 'ready', updatedAt: now() })
        .where(eq(schema.narrationSubtitles.id, row.id))
    } catch (err: any) {
      await db.update(schema.narrationSubtitles)
        .set({ status: 'failed', errorMsg: String(err?.message || err).slice(0, 500), updatedAt: now() })
        .where(eq(schema.narrationSubtitles.id, row.id))
      logTaskError('Subtitle', 'render-failed', { mergeId, error: String(err?.message || err) })
    }
  })()

  return created(c, {
    ...base,
    subtitle_id: row.id,
    status: 'rendering',
    burn: wantBurn,
    soft: wantSoft,
    lines: lines.length,
    burn_url: wantBurn ? `/${burnedRel}` : '',
    soft_url: wantSoft ? `/${softRel}` : '',
  })
})

export default app
