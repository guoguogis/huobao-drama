/**
 * 统一生成任务服务 — 图片/视频生成共用 sys_task 表与同一条生命周期：
 * 创建(processing) → 适配器构建请求 → 同步完成或异步轮询 → 下载落盘 → 回写业务表
 */
import { db, getInsertId, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { getActiveConfig, getConfigById } from './ai.js'
import { now } from '../utils/response.js'
import { downloadFile, fetchImageAsCompressedDataUrl, generateImageThumb, getAbsolutePath, readImageAsCompressedDataUrl, saveBase64Image } from '../utils/storage.js'
import { probeDurationSeconds } from '../utils/media-probe.js'
import {
  AUDIO_TOTAL_MAX_SECONDS,
  REQUEST_BODY_MAX_BYTES,
  audioMaxClipsFor,
  formatSeconds,
} from '../utils/audio-limits.js'
import { extractVideoPoster } from '../utils/video-poster.js'
import { getImageAdapter, getVideoAdapter } from './adapters/registry'
import { buildDownloadCandidates, downloadAuthHeaders } from './adapters/url'
import { resolveMediaRef, resolveMediaRefs, resolveOptionalMediaRefs } from './media-ref.js'
import type { AIConfig } from './adapters/types'
import { logTaskError, logTaskPayload, logTaskProgress, logTaskStart, logTaskSuccess, logTaskWarn, redactUrl } from '../utils/task-logger.js'

type TaskType = 'image' | 'video'

const taskLabel = (type: TaskType) => (type === 'image' ? 'ImageTask' : 'VideoTask')

// 轮询节奏：图片 5s×120（上限 10 分钟）；视频 10s×300
const POLL_PROFILES: Record<TaskType, { attempts: number; intervalMs: number; maxDurationMs: number | null }> = {
  image: { attempts: 120, intervalMs: 5000, maxDurationMs: 600_000 },
  video: { attempts: 300, intervalMs: 10_000, maxDurationMs: null },
}

interface GenerateImageParams {
  storyboardId?: number
  dramaId?: number
  sceneId?: number
  characterId?: number
  propId?: number
  prompt: string
  model?: string
  size?: string
  referenceImages?: string[]
  frameType?: string
  configId?: number
}

interface GenerateVideoParams {
  storyboardId?: number
  dramaId?: number
  prompt: string
  model?: string
  referenceMode?: string
  imageUrl?: string
  firstFrameUrl?: string
  lastFrameUrl?: string
  referenceImageUrls?: string[]
  referenceVideoUrls?: string[]
  referenceAudioUrls?: string[]
  /** 角色音色样本（按分镜绑定角色收集）。可选增强：解析不出公网 URL 时跳过并告警，不让整个任务失败 */
  characterVoiceUrls?: string[]
  referenceFileUrl?: string
  referenceLinkUrl?: string
  generateAudio?: boolean
  duration?: number
  aspectRatio?: string
  resolution?: string
  seed?: number
  promptExtend?: boolean
  watermark?: boolean
  configId?: number
}

export async function generateImage(params: GenerateImageParams): Promise<number> {
  // 指定配置（集锁定）可能已停用/删除/厂商收敛，失效时回退到当前启用配置，避免生成被旧引用卡死
  const config = params.configId
    ? (await getConfigById(params.configId)) ?? await getActiveConfig('image')
    : await getActiveConfig('image')
  if (!config) throw new Error('未配置图片模型，请先到「设置」页添加并启用 AI 服务')

  const id = await createTask('image', config, {
    storyboardId: params.storyboardId,
    dramaId: params.dramaId,
    sceneId: params.sceneId,
    characterId: params.characterId,
    propId: params.propId,
    prompt: params.prompt,
    model: params.model || config.model,
  }, {
    size: params.size || '1920x1080',
    frameType: params.frameType,
    referenceImages: params.referenceImages,
  })

  logTaskStart('ImageTask', 'enqueue', {
    id,
    provider: config.provider,
    storyboardId: params.storyboardId,
    sceneId: params.sceneId,
    characterId: params.characterId,
    frameType: params.frameType,
    model: params.model || config.model,
  })
  logTaskPayload('ImageTask', 'enqueue params', {
    id,
    config: { provider: config.provider, model: config.model, baseUrl: config.baseUrl },
    params,
  })
  return id
}

export async function generateVideo(params: GenerateVideoParams): Promise<number> {
  // 指定配置（集锁定）可能已停用/删除/厂商收敛，失效时回退到当前启用配置
  const config = params.configId
    ? (await getConfigById(params.configId)) ?? await getActiveConfig('video')
    : await getActiveConfig('video')
  if (!config) throw new Error('未配置视频模型，请先到「设置」页添加并启用 AI 服务')

  const id = await createTask('video', config, {
    storyboardId: params.storyboardId,
    dramaId: params.dramaId,
    prompt: params.prompt,
    model: params.model || config.model,
  }, {
    referenceMode: params.referenceMode || 'reference',
    imageUrl: params.imageUrl,
    firstFrameUrl: params.firstFrameUrl,
    lastFrameUrl: params.lastFrameUrl,
    referenceImageUrls: params.referenceImageUrls,
    referenceVideoUrls: params.referenceVideoUrls,
    referenceAudioUrls: params.referenceAudioUrls,
    characterVoiceUrls: params.characterVoiceUrls,
    referenceFileUrl: params.referenceFileUrl,
    referenceLinkUrl: params.referenceLinkUrl,
    generateAudio: params.generateAudio === false ? 0 : 1,
    duration: params.duration,
    aspectRatio: params.aspectRatio,
    // 统一存为项目内部格式，各适配器再转换为官方大小写与枚举。
    resolution: normalizeStoredVideoResolution(params.resolution),
    seed: params.seed,
    promptExtend: params.promptExtend,
    watermark: params.watermark,
  })

  logTaskStart('VideoTask', 'enqueue', {
    id,
    provider: config.provider,
    storyboardId: params.storyboardId,
    dramaId: params.dramaId,
    referenceMode: params.referenceMode || 'reference',
    duration: params.duration || 5,
  })
  logTaskPayload('VideoTask', 'enqueue params', {
    id,
    config: { provider: config.provider, model: config.model, baseUrl: config.baseUrl },
    params,
  })
  return id
}

async function createTask(
  type: TaskType,
  config: AIConfig,
  fields: {
    storyboardId?: number
    dramaId?: number
    sceneId?: number
    characterId?: number
    propId?: number
    prompt: string
    model?: string | null
  },
  params: Record<string, unknown>,
): Promise<number> {
  const ts = now()
  const res = await db.insert(schema.sysTask).values({
    type,
    ...fields,
    provider: config.provider,
    params: JSON.stringify(params),
    status: 'processing',
    createdAt: ts,
    updatedAt: ts,
  })

  const id = getInsertId(res)
  processTask(id, config).catch(err => {
    logTaskError(taskLabel(type), 'process', { id, error: err.message })
    console.error(`${taskLabel(type)} ${id} failed:`, err)
  })
  return id
}

function parseTaskParams(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {}
  try {
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

async function processTask(id: number, config: AIConfig) {
  try {
    const [record] = await db.select().from(schema.sysTask).where(eq(schema.sysTask.id, id))
    if (!record) return
    const type = record.type as TaskType
    const label = taskLabel(type)
    const params = parseTaskParams(record.params)
    logTaskProgress(label, 'build-request', {
      id,
      provider: config.provider,
      storyboardId: record.storyboardId,
      sceneId: record.sceneId,
      characterId: record.characterId,
    })

    let url: string, method: string, headers: Record<string, string>, body: unknown

    if (type === 'image') {
      const adapter = getImageAdapter(config.provider)
      const resolvedReferenceImages = await normalizeReferenceImages(params.referenceImages)
      ;({ url, method, headers, body } = adapter.buildGenerateRequest(config, {
        id: record.id,
        model: record.model,
        prompt: record.prompt,
        size: params.size,
        frameType: params.frameType,
        referenceImages: resolvedReferenceImages.length ? JSON.stringify(resolvedReferenceImages) : null,
      }))
    } else {
      const adapter = getVideoAdapter(config.provider)
      const resolvedImageUrl = await normalizeVideoReferenceUrl(params.imageUrl)
      const resolvedFirstFrameUrl = await normalizeVideoReferenceUrl(params.firstFrameUrl)
      const resolvedLastFrameUrl = await normalizeVideoReferenceUrl(params.lastFrameUrl)
      const resolvedReferenceImageUrls = await normalizeVideoReferenceUrls(params.referenceImageUrls)
      // 参考视频/音频体积大，不适合 dataURL 内联：本地联调内联、服务器部署签名为公网 URL
      const resolvedReferenceVideoUrls = resolveMediaRefs(params.referenceVideoUrls, 'video', record.id)
      const resolvedReferenceAudioUrls = resolveMediaRefs(params.referenceAudioUrls, 'audio', record.id)
      // 角色音色是可选增强：解析不出来的样本跳过，回退「模型自己配音」，不拖垮整个任务
      const resolvedVoiceUrls = resolveOptionalMediaRefs(params.characterVoiceUrls, 'audio', record.id)
      const mergedAudioUrls = Array.from(new Set([...resolvedReferenceAudioUrls, ...resolvedVoiceUrls]))
      await assertAudioRefsWithinLimits(params, mergedAudioUrls, record.id, record.model)
      const resolvedReferenceFileUrl = resolveMediaRef(params.referenceFileUrl, 'file', record.id)
      ;({ url, method, headers, body } = adapter.buildGenerateRequest(config, {
        id: record.id,
        model: record.model,
        prompt: record.prompt,
        referenceMode: params.referenceMode,
        imageUrl: resolvedImageUrl,
        firstFrameUrl: resolvedFirstFrameUrl,
        lastFrameUrl: resolvedLastFrameUrl,
        referenceImageUrls: resolvedReferenceImageUrls.length ? JSON.stringify(resolvedReferenceImageUrls) : null,
        referenceVideoUrls: resolvedReferenceVideoUrls.length ? JSON.stringify(resolvedReferenceVideoUrls) : null,
        referenceAudioUrls: mergedAudioUrls.length ? JSON.stringify(mergedAudioUrls) : null,
        referenceFileUrl: resolvedReferenceFileUrl,
        referenceLinkUrl: params.referenceLinkUrl,
        generateAudio: params.generateAudio,
        duration: params.duration,
        aspectRatio: params.aspectRatio,
        resolution: params.resolution,
        seed: params.seed,
        promptExtend: params.promptExtend,
        watermark: params.watermark,
      }))
    }

    logTaskProgress(label, 'request', {
      id,
      provider: config.provider,
      method,
      url: redactUrl(url),
      model: record.model,
    })

    const isMultipart = body instanceof FormData
    // 内联 Base64 极易把请求体撑大（膨胀约 1.33 倍）：自己先拦，别让上游回一个难懂的 413
    const serializedBody = isMultipart ? null : JSON.stringify(body)
    if (serializedBody) {
      const bytes = Buffer.byteLength(serializedBody)
      if (bytes > REQUEST_BODY_MAX_BYTES) {
        throw new Error(
          `请求体 ${(bytes / 1024 / 1024).toFixed(1)}MB 超过上游上限 ${Math.round(REQUEST_BODY_MAX_BYTES / 1024 / 1024)}MB；` +
          `请减少参考素材，或配置 PUBLIC_BASE_URL 让本地素材改用公网 URL（不再内联）`,
        )
      }
    }

    logTaskPayload(label, 'request payload', {
      id, method, url, headers,
      // multipart 表单（如 OpenAI /v1/images/edits）无法 JSON 化，记录字段摘要
      body: isMultipart ? `[multipart/form-data: ${[...(body as FormData).keys()].join(', ')}]` : body,
    })

    const resp = await fetch(url, {
      method,
      headers,
      body: isMultipart ? (body as FormData) : serializedBody!,
      signal: AbortSignal.timeout(600_000),
    })

    if (!resp.ok) throw new Error(`API error ${resp.status}: ${await resp.text()}`)
    const result = await resp.json() as any
    logTaskPayload(label, 'response payload', { id, provider: config.provider, result })

    if (type === 'image') {
      const adapter = getImageAdapter(config.provider)
      const { isAsync, taskId, imageUrl } = adapter.parseGenerateResponse(result)

      if (!isAsync && imageUrl) {
        logTaskProgress(label, 'sync-complete', { id, imageUrl })
        await completeWithRetry(label, id, '下载图片', buildDownloadCandidates(imageUrl, config.baseUrl), (url) => handleImageComplete(record, url, downloadAuthHeaders(url, config.baseUrl, config.apiKey)))
        return
      }

      if (!isAsync && !imageUrl) {
        // 同步模式但无 URL（Gemini 等返回 base64）
        const b64 = adapter.extractImageBase64(result)
        if (b64) {
          logTaskProgress(label, 'sync-base64-complete', { id, mimeType: b64.mimeType })
          await completeWithRetry(label, id, '保存图片', [''], () => handleImageCompleteBase64(record, b64.data, b64.mimeType))
          return
        }
        throw new Error('No image URL or base64 data in response')
      }

      await markPolling(id, taskId)
      pollTask(record, config, taskId!)
      return
    }

    const adapter = getVideoAdapter(config.provider)
    const { isAsync, taskId, videoUrl } = adapter.parseGenerateResponse(result)

    if (!isAsync && videoUrl) {
      logTaskProgress(label, 'sync-complete', { id, videoUrl })
      await completeWithRetry(label, id, '下载视频', buildDownloadCandidates(videoUrl, config.baseUrl), (url) => handleVideoComplete(record, url, params.duration, downloadAuthHeaders(url, config.baseUrl, config.apiKey)))
      return
    }

    await markPolling(id, taskId)
    pollTask(record, config, taskId!)
  } catch (err: any) {
    await failTask(id, err.message)
  }
}

async function markPolling(id: number, taskId: string | undefined) {
  await db.update(schema.sysTask)
    .set({ taskId, status: 'processing', updatedAt: now() })
    .where(eq(schema.sysTask.id, id))
  logTaskProgress('SysTask', 'poll-start', { id, taskId })
}

async function failTask(id: number, message: string) {
  logTaskError('SysTask', 'failed', { id, error: message })
  await db.update(schema.sysTask)
    .set({ status: 'failed', errorMsg: message, updatedAt: now() })
    .where(eq(schema.sysTask.id, id))
}

/**
 * 上游宣告「已完成」之后的下载/落盘阶段：按候选地址轮次重试，并在原地终结。
 *
 * 两个要点：
 * 1. 必须与轮询循环隔离——这一段的失败（典型情形是对方返回了本机不可达的下载地址）
 *    若抛回 pollTask 的 catch，会被误当成「轮询失败」而继续轮询，拿同一个 URL 反复失败
 *    到 attempts 耗尽（视频档位 300 次 × 10s ≈ 50 分钟），日志里也只剩一句无上下文的
 *    fetch failed，看不出失败发生在下载而非轮询。
 * 2. 候选地址含「换成生成任务 base_url origin」的回退项（见 buildDownloadCandidates）。
 *    轮次在外层、候选在内层：原始地址一失败就立刻试回退地址，不必等它重试满 3 次。
 */
const COMPLETE_ATTEMPTS = 3

async function completeWithRetry(
  label: string,
  taskId: number,
  what: string,
  candidates: string[],
  work: (url: string) => Promise<void>,
) {
  const tried = new Set<string>()
  let lastDetail = ''

  for (let attempt = 1; attempt <= COMPLETE_ATTEMPTS; attempt++) {
    for (let c = 0; c < candidates.length; c++) {
      const url = candidates[c]
      tried.add(url)
      try {
        await work(url)
        return
      } catch (err: any) {
        lastDetail = describeFetchError(err)
        const next = candidates[c + 1]
        if (next) {
          logTaskWarn(label, 'complete-fallback', { id: taskId, what, failed: url, error: lastDetail, next })
        } else if (attempt < COMPLETE_ATTEMPTS) {
          logTaskWarn(label, 'complete-retry', { id: taskId, what, attempt, url, error: lastDetail })
        }
      }
    }
    if (attempt < COMPLETE_ATTEMPTS) await new Promise(r => setTimeout(r, 2000 * attempt))
  }

  const where = [...tried].filter(Boolean)
  await failTask(
    taskId,
    `上游已生成完成，但${what}失败（${COMPLETE_ATTEMPTS} 轮重试后放弃）：${lastDetail}`
    + `${where.length ? `；已尝试：${where.join(' , ')}` : ''}`,
  )
}

/** Node fetch 的网络错误正文只有一句 "fetch failed"，必须把底层 cause 带出来才可排查 */
function describeFetchError(err: any): string {
  const cause = err?.cause
  const code = cause?.code || err?.code
  const detail = cause?.message || err?.message || String(err)
  return code ? `${detail} (${code})` : detail
}

/**
 * 把上游响应形状附进失败原因。
 * 任务日志只写 stdout，用户看不到；写进 error_msg 才能在界面上直接看到「到底返回了什么」，
 * 免除「轮询到超时却不知道发生了什么」的排查成本。base64 之类的大字段由截断兜住。
 */
function describeResponseShape(result: unknown) {
  try {
    const json = JSON.stringify(result) ?? String(result)
    const keys = result && typeof result === 'object' ? Object.keys(result).join(', ') : ''
    const body = json.length > 300 ? `${json.slice(0, 300)}…` : json
    return `（响应字段: ${keys || '无'}；原文: ${body}）`
  } catch {
    return ''
  }
}

type SysTaskRecord = typeof schema.sysTask.$inferSelect

async function pollTask(record: SysTaskRecord, config: AIConfig, taskId: string) {
  const type = record.type as TaskType
  const label = taskLabel(type)
  const profile = POLL_PROFILES[type]
  const adapter = type === 'image' ? getImageAdapter(config.provider) : getVideoAdapter(config.provider)
  const startedAt = Date.now()

  for (let i = 0; i < profile.attempts; i++) {
    if (profile.maxDurationMs && Date.now() - startedAt >= profile.maxDurationMs) {
      await failTask(record.id, 'Timeout: Polling exceeded 10 minutes')
      return
    }
    await new Promise(r => setTimeout(r, profile.intervalMs))
    try {
      const { url, method, headers } = adapter.buildPollRequest(config, taskId)
      logTaskProgress(label, 'poll-request', {
        id: record.id,
        taskId,
        provider: config.provider,
        method,
        url: redactUrl(url),
        attempt: i + 1,
      })
      const remainingMs = profile.maxDurationMs
        ? Math.max(1_000, profile.maxDurationMs - (Date.now() - startedAt))
        : 600_000
      const resp = await fetch(url, {
        method,
        headers,
        signal: AbortSignal.timeout(remainingMs),
      })
      if (!resp.ok) continue
      const result = await resp.json() as any

      // 图片/视频 PollResponse 结构不同，这里统一按 any 取值后按 type 分支
      const pollResp: any = adapter.parsePollResponse(result)

      if (pollResp.status === 'completed') {
        if (type === 'image') {
          if (pollResp.imageUrl) {
            logTaskProgress(label, 'poll-reported-complete', { id: record.id, taskId, imageUrl: pollResp.imageUrl })
            await completeWithRetry(label, record.id, '下载图片', buildDownloadCandidates(pollResp.imageUrl, config.baseUrl), (url) => handleImageComplete(record, url, downloadAuthHeaders(url, config.baseUrl, config.apiKey)))
            return
          }
          // 有的厂商只回 base64（Gemini）；extractImageBase64 对其他适配器返回 null
          const b64 = (adapter as ReturnType<typeof getImageAdapter>).extractImageBase64(result)
          if (b64) {
            logTaskProgress(label, 'poll-reported-complete', { id: record.id, taskId, mimeType: b64.mimeType })
            await completeWithRetry(label, record.id, '保存图片', [''], () => handleImageCompleteBase64(record, b64.data, b64.mimeType))
            return
          }
          // 上游已宣告完成却给不出图片：继续轮询只会白等到超时，且最终错误指向「超时」而非真因
          await failTask(record.id, `上游返回已完成但未提供图片地址${describeResponseShape(result)}`)
          return
        }
        if (pollResp.videoUrl) {
          logTaskProgress(label, 'poll-reported-complete', { id: record.id, taskId, videoUrl: pollResp.videoUrl })
          await completeWithRetry(label, record.id, '下载视频', buildDownloadCandidates(pollResp.videoUrl, config.baseUrl), (url) => handleVideoComplete(record, url, pollResp.duration, downloadAuthHeaders(url, config.baseUrl, config.apiKey)))
          return
        }
        await failTask(record.id, `上游返回已完成但未提供视频地址${describeResponseShape(result)}`)
        return
      }
      if (pollResp.status === 'failed') {
        // 上游明确失败（如内容审核拦截）属终态：立即落库，不重试不等待超时
        await failTask(record.id, pollResp.error || 'Generation failed')
        return
      }
    } catch (err: any) {
      const exhausted = i === profile.attempts - 1
        || (profile.maxDurationMs != null && Date.now() - startedAt >= profile.maxDurationMs)
      if (exhausted) {
        await failTask(record.id, `Timeout: ${err.message}`)
        return
      }
      logTaskWarn(label, 'poll-retry', { id: record.id, taskId, attempt: i + 1, error: err.message })
    }
  }
  await failTask(record.id, 'Timeout: polling attempts exhausted')
}

async function handleImageComplete(record: SysTaskRecord, imageUrl: string, headers: Record<string, string> = {}) {
  const localPath = await downloadFile(imageUrl, 'images', headers)
  // 列表页缩略图（前端按命名约定推导地址，失败不影响主流程）
  await generateImageThumb(localPath)

  await db.update(schema.sysTask)
    .set({ resultUrl: imageUrl, localPath, status: 'completed', completedAt: now(), updatedAt: now() })
    .where(eq(schema.sysTask.id, record.id))

  logTaskSuccess('ImageTask', 'downloaded', { id: record.id, provider: record.provider, localPath })

  await writeBackImageAssets(record, localPath)
}

async function handleImageCompleteBase64(record: SysTaskRecord, base64Data: string, mimeType: string) {
  const localPath = await saveBase64Image(base64Data, mimeType, 'images')
  await generateImageThumb(localPath)

  await db.update(schema.sysTask)
    .set({ localPath, status: 'completed', completedAt: now(), updatedAt: now() })
    .where(eq(schema.sysTask.id, record.id))

  logTaskSuccess('ImageTask', 'saved-base64', { id: record.id, provider: record.provider, mimeType, localPath })

  await writeBackImageAssets(record, localPath)
}

// 图片完成后回写业务表：分镜(按 frameType)、角色、场景、道具
async function writeBackImageAssets(record: SysTaskRecord, localPath: string) {
  const params = parseTaskParams(record.params)
  if (record.storyboardId) {
    const sbUpdate: Record<string, any> = { updatedAt: now() }
    if (params.frameType === 'first_frame') sbUpdate.firstFrameImage = localPath
    else if (params.frameType === 'last_frame') sbUpdate.lastFrameImage = localPath
    else sbUpdate.composedImage = localPath
    await db.update(schema.storyboards).set(sbUpdate).where(eq(schema.storyboards.id, record.storyboardId))
  }
  if (record.characterId) {
    await db.update(schema.characters).set({ imageUrl: localPath, updatedAt: now() }).where(eq(schema.characters.id, record.characterId))
  }
  if (record.sceneId) {
    await db.update(schema.scenes).set({ imageUrl: localPath, status: 'completed', updatedAt: now() }).where(eq(schema.scenes.id, record.sceneId))
  }
  if (record.propId) {
    await db.update(schema.props).set({ imageUrl: localPath, updatedAt: now() }).where(eq(schema.props.id, record.propId))
  }
}

async function handleVideoComplete(record: SysTaskRecord, videoUrl: string, duration: number | null | undefined, headers: Record<string, string> = {}) {
  const localPath = await downloadFile(videoUrl, 'videos', headers)
  // 海报帧供列表/封面展示，避免前端为显示首帧缓冲整个视频
  await extractVideoPoster(localPath)
  await db.update(schema.sysTask)
    .set({ resultUrl: videoUrl, localPath, status: 'completed', completedAt: now(), updatedAt: now() })
    .where(eq(schema.sysTask.id, record.id))

  logTaskSuccess('VideoTask', 'downloaded', { id: record.id, localPath, storyboardId: record.storyboardId, duration })

  if (record.storyboardId) {
    await db.update(schema.storyboards)
      .set({ videoUrl: localPath, duration: duration || undefined, updatedAt: now() })
      .where(eq(schema.storyboards.id, record.storyboardId))
  }
}

// ─── 参考素材归一化 ───────────────────────────────────────────────

async function normalizeReferenceImages(refs: string[] | null | undefined): Promise<string[]> {
  if (!Array.isArray(refs) || !refs.length) return []

  const deduped = Array.from(
    new Set(
      refs
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  )

  const normalized = await Promise.all(deduped.map(async (value) => {
    if (value.startsWith('data:image/')) return value
    if (value.startsWith('static/') || value.startsWith('/static/')) {
      const localPath = value.startsWith('/static/') ? value.slice(1) : value
      try {
        return await readImageAsCompressedDataUrl(localPath, {
          maxWidth: 768,
          maxHeight: 768,
          quality: 68,
        })
      } catch (err) {
        logTaskWarn('ImageTask', 'reference-read-failed', { path: localPath, error: (err as Error).message })
        return null
      }
    }
    // 远程 URL：下载压缩为 data URL，保证 multipart 上传（OpenAI edits）/ inline_data（Gemini）都可用
    if (/^https?:\/\//.test(value)) {
      try {
        return await fetchImageAsCompressedDataUrl(value, {
          maxWidth: 768,
          maxHeight: 768,
          quality: 68,
        })
      } catch (err) {
        logTaskWarn('ImageTask', 'reference-fetch-failed', { url: value, error: (err as Error).message })
        return null
      }
    }
    return value
  }))

  return normalized.filter((item): item is string => !!item).slice(0, 6)
}

async function normalizeVideoReferenceUrl(value: string | null | undefined): Promise<string | null> {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (raw.startsWith('data:image/')) return raw
  if (raw.startsWith('static/') || raw.startsWith('/static/')) {
    const localPath = raw.startsWith('/static/') ? raw.slice(1) : raw
    try {
      return await readImageAsCompressedDataUrl(localPath, {
        maxWidth: 768,
        maxHeight: 768,
        quality: 68,
      })
    } catch (err) {
      logTaskWarn('VideoTask', 'reference-read-failed', { path: localPath, error: (err as Error).message })
      return null
    }
  }
  return raw
}

async function normalizeVideoReferenceUrls(refs: string[] | null | undefined): Promise<string[]> {
  if (!Array.isArray(refs) || !refs.length) return []
  const normalized = await Promise.all(
    Array.from(new Set(refs.map((item) => String(item || '').trim()).filter(Boolean))).map((item) => normalizeVideoReferenceUrl(item)),
  )
  return normalized.filter((item): item is string => !!item)
}

/**
 * 参考音频限制校验：段数 + 总时长。
 *
 * 段数按**已解析**的列表判定（解析阶段可能已丢弃解析不出的音色样本），上限按模型取
 * （Seedance 3 / Wan 5）。
 * 总时长只对本地 static 样本探测（远端 URL 探不到）；测不出时长的样本告警但不阻断——
 * 上游自己会校验，不该把一个可选素材变成硬失败；但只要**已知部分**已超额就直接失败。
 */
async function assertAudioRefsWithinLimits(
  params: Record<string, any>,
  resolvedAudioUrls: string[],
  taskId: number,
  model: string | null | undefined,
): Promise<void> {
  const maxClips = audioMaxClipsFor(model)
  if (resolvedAudioUrls.length > maxClips) {
    const own = (params.referenceAudioUrls ?? []).length
    const voice = (params.characterVoiceUrls ?? []).length
    throw new Error(
      `${model || '当前模型'} 一次最多带 ${maxClips} 段参考音频，当前 ${resolvedAudioUrls.length} 段` +
      `（分镜自带 ${own} 段 + 角色音色样本 ${voice} 段）。` +
      `请减少分镜里说话的角色数量，或取消其中几个角色的音色样本`,
    )
  }
  if (!resolvedAudioUrls.length) return

  const localPaths = Array.from(new Set(
    [...(params.referenceAudioUrls ?? []), ...(params.characterVoiceUrls ?? [])]
      .map((value: unknown) => String(value ?? '').trim())
      .filter((value) => value.startsWith('static/') || value.startsWith('/static/')),
  ))

  let total = 0
  let unverified = 0
  for (const relative of localPaths) {
    const absPath = getAbsolutePath(relative.startsWith('/') ? relative.slice(1) : relative)
    const duration = await probeDurationSeconds(absPath)
    if (duration === null) {
      unverified++
      logTaskWarn('VideoTask', 'audio-duration-unknown', { id: taskId, path: relative })
      continue
    }
    total += duration
  }

  if (total > AUDIO_TOTAL_MAX_SECONDS) {
    throw new Error(
      `参考音频总时长 ${formatSeconds(total)} 超过 ${AUDIO_TOTAL_MAX_SECONDS} 秒上限` +
      (unverified ? `（另有 ${unverified} 段未能探测时长）` : ''),
    )
  }
  if (unverified) {
    logTaskWarn('VideoTask', 'audio-total-unverified', { id: taskId, unverified, knownSeconds: total })
  }
}

function normalizeStoredVideoResolution(resolution: string | null | undefined): string | undefined {
  const value = String(resolution || '').trim().toLowerCase()
  if (value === '480p' || value === '720p' || value === '1080p') return value
  if (value === '2k') return '2K'
  return undefined
}
