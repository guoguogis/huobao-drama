import { Hono } from 'hono'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, badRequest } from '../utils/response.js'
import { mergeEpisodeVideos } from '../services/ffmpeg-merge.js'
import { parseVideoOverrides } from '../utils/video-overrides.js'
import { toSnakeCase } from '../utils/transform.js'
import { logTaskError, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'

const app = new Hono()

// POST /episodes/:id/merge — 拼接镜头视频(body.storyboard_ids 可选,只拼所选)
app.post('/episodes/:id/merge', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId))
  if (!ep) return badRequest(c, '剧集不存在')

  let storyboardIds: number[] | undefined
  let videoOverrides: Record<number, string> | undefined
  try {
    const body = await c.req.json()
    if (Array.isArray(body?.storyboard_ids)) {
      storyboardIds = body.storyboard_ids.map(Number).filter(Boolean)
    }
    // 每个分镜指定用哪个历史版本导出：{ 分镜id: "static/videos/x.mp4" }
    // 校验逻辑见 utils/video-overrides（只接受站内 static 路径，防任意文件读取）
    const parsedOverrides = parseVideoOverrides(body?.video_overrides)
    if (parsedOverrides.error) return badRequest(c, parsedOverrides.error)
    videoOverrides = parsedOverrides.overrides
  } catch { /* 无 body 时拼接全部 */ }

  try {
    logTaskStart('MergeAPI', 'episode-merge', {
      episodeId,
      dramaId: ep.dramaId,
      storyboardIds,
      overrides: videoOverrides ? Object.keys(videoOverrides).length : 0,
    })
    const mergeId = await mergeEpisodeVideos(episodeId, ep.dramaId, storyboardIds, videoOverrides)
    logTaskSuccess('MergeAPI', 'episode-merge', { episodeId, mergeId })
    return success(c, { merge_id: mergeId, status: 'processing' })
  } catch (err: any) {
    logTaskError('MergeAPI', 'episode-merge', { episodeId, error: err.message })
    return badRequest(c, err.message)
  }
})

// GET /episodes/:id/merge — 查询最新拼接状态
app.get('/episodes/:id/merge', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const merges = await db.select().from(schema.videoMerges)
    .where(eq(schema.videoMerges.episodeId, episodeId))


  const latest = merges[merges.length - 1]
  if (!latest) return success(c, null)

  return success(c, toSnakeCase(latest))
})

// GET /episodes/:id/merges — 成片列表(全部拼接记录,新的在前)
app.get('/episodes/:id/merges', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const merges = await db.select().from(schema.videoMerges)
    .where(and(eq(schema.videoMerges.episodeId, episodeId), isNull(schema.videoMerges.deletedAt)))
  merges.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  return success(c, merges.slice(0, 30).map(toSnakeCase))
})

// DELETE /merges/:id — 删除一条成片记录
// 软删(deleted_at)：列表查询已过滤该列；磁盘上的成片文件保留，不删文件
app.delete('/merges/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return badRequest(c, '无效的成片 ID')

  const [merge] = await db.select().from(schema.videoMerges)
    .where(eq(schema.videoMerges.id, id))
  if (!merge || merge.deletedAt) return badRequest(c, '成片不存在或已删除')

  await db.update(schema.videoMerges)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(schema.videoMerges.id, id))

  logTaskSuccess('MergeAPI', 'merge-delete', { id, episodeId: merge.episodeId })
  return success(c, { id })
})

export default app
