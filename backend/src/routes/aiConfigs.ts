import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, getInsertId, schema } from '../db/index.js'
import { success, notFound, created, badRequest, now } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'
import { joinProviderUrl } from '../services/adapters/url.js'
import { isVolcengineProvider, volcengineApiPrefix } from '../services/adapters/volcengine-endpoints.js'
import { isOfficialProvider, parseConfigSettings, parseConfigTemperature } from '../services/ai.js'
import { redactUrl, logTaskError, logTaskProgress, logTaskSuccess } from '../utils/task-logger.js'

const app = new Hono()

/** 归一化 temperature 入参：null=未设置；合法值 0~2；非法抛错 */
function normalizeTemperature(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0 || n > 2) throw new Error('invalid temperature')
  return n
}

/** 把 settings JSON 中的字段透出：temperature 提到顶层，其余（音频的 appid/cluster/音色编号）原样给 settings */
function withParsedFields(r: any) {
  return {
    ...toSnakeCase(r),
    model: r.model ? JSON.parse(r.model) : [],
    temperature: parseConfigTemperature(r.settings),
    settings: parseConfigSettings(r.settings),
  }
}

/** 合并入参 settings 对象与 temperature，返回待写入的 JSON 字符串（空对象则 null） */
function mergeSettings(incoming: any, temperature: number | null | undefined): string | null {
  const merged: Record<string, any> = {}
  if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
    for (const [k, v] of Object.entries(incoming)) {
      if (k === 'temperature') continue
      if (v === undefined || v === null || v === '') continue
      merged[k] = v
    }
  }
  if (temperature !== null && temperature !== undefined) merged.temperature = temperature
  return Object.keys(merged).length ? JSON.stringify(merged) : null
}

function bearerHeaders(apiKey?: string, withJson = false) {
  const headers: Record<string, string> = {}
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  if (withJson) headers['Content-Type'] = 'application/json'
  return headers
}

function geminiHeaders(apiKey?: string, withJson = false) {
  const headers: Record<string, string> = {}
  if (apiKey) {
    headers['x-goog-api-key'] = apiKey
  }
  if (withJson) headers['Content-Type'] = 'application/json'
  return headers
}

/** 从上游错误响应里摘出可读原因（各网关字段不一：error.message / message / detail / error 字符串） */
export function summarizeUpstreamError(text: string, maxLen = 220): string {
  const raw = String(text || '').trim()
  if (!raw) return '（上游未返回错误内容）'
  let msg = ''
  try {
    const parsed = JSON.parse(raw)
    const e = parsed?.error
    msg = (typeof e === 'string' ? e : e?.message) || parsed?.message || parsed?.detail || ''
  } catch {
    msg = raw
  }
  const oneLine = String(msg || raw).replace(/\s+/g, ' ').trim()
  return oneLine.length > maxLen ? `${oneLine.slice(0, maxLen)}…` : oneLine
}

export function buildProbe(
  serviceType: string,
  provider: string,
  baseUrl: string,
  model?: string,
  apiKey?: string,
  settingsRaw?: string | null,
) {
  const p = provider.toLowerCase()
  const m = model || ''
  const settings = parseConfigSettings(settingsRaw)

  // 音频（TTS）：只有真合成一小段才能同时验证鉴权与音色编号是否正确，
  // 空体或占位文本只会得到含糊的参数错误。代价是「你好」两个字的合成量（可忽略）。
  if (serviceType === 'audio') {
    if (p === 'volcengine') {
      const speaker = String(settings.speaker || settings.voice_type || '').trim()
      return {
        method: 'POST',
        url: joinProviderUrl(baseUrl, '/api/v3', '/tts/create'),
        // 豆包语音 / Seed Speech：X-Api-Key 就是配置里的 api_key（不需要 appid/cluster）
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey || '' },
        body: {
          model: m || 'seed-audio-1.0',
          text_prompt: '你好',
          ...(speaker ? { references: [{ speaker }] } : {}),
          audio_config: { format: 'mp3', sample_rate: 48000, pitch_rate: 0, speech_rate: 0, loudness_rate: 0 },
          watermark: {},
        },
      }
    }
    if (p === 'minimax') {
      const voiceId = String(settings.voice_id || '').trim()
      if (!voiceId) throw new Error('MiniMax 语音需要填写默认音色编号（voice_id）后才能测试')
      const emotion = String(settings.emotion || '').trim()
      const tone = Array.isArray(settings.pronunciation_tone)
        ? settings.pronunciation_tone
        : String(settings.pronunciation_tone || '').split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean)
      return {
        method: 'POST',
        url: joinProviderUrl(baseUrl, '/v1', '/t2a_v2'),
        headers: bearerHeaders(apiKey, true),
        body: {
          model: m || 'speech-2.8-hd',
          text: '你好',
          stream: false,
          voice_setting: {
            voice_id: voiceId, speed: 1, vol: 1, pitch: 0,
            ...(emotion ? { emotion } : {}),
          },
          audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
          ...(tone.length ? { pronunciation_dict: { tone } } : {}),
          subtitle_enable: false,
        },
      }
    }
  }

  if (p === 'gemini') {
    // 探针统一走 generateContent:文本运行时(AI SDK)走的就是它,官方与中转站都支持;
    // interactions 端点很多中转站未配置,探它会误报 500。
    // 用最小合法请求体而非空体——空体在部分中转站会触发上游认证失败的误报
    const modelName = m || 'gemini-3.1-pro-preview'
    const url = new URL(joinProviderUrl(baseUrl, '/v1beta', `/models/${modelName}:generateContent`))
    if (apiKey) url.searchParams.set('key', apiKey)
    return {
      method: 'POST',
      url: url.toString(),
      headers: geminiHeaders(apiKey, true),
      body: { contents: [{ parts: [{ text: 'hi' }] }] },
    }
  }

  if (p === 'openai') {
    // 图片：探**真实的 POST 生成端点**（`/v1/images/generations`），空体探测。
    // 空体在网关侧一定是参数校验失败（不会创建计费任务），但足以证明「POST 路径 + 鉴权」正常；
    // 只探 `GET /v1/models` 会让「图片端点本身是否通」这件事看起来没问题（实测某网关 /models 200，
    // 而 images/generations 实际 500，反而掩盖了真问题）。
    if (serviceType === 'image') {
      return {
        method: 'POST',
        url: joinProviderUrl(baseUrl, '/v1', '/images/generations'),
        headers: bearerHeaders(apiKey, true),
        body: {},
      }
    }
    // 文本/视频：OpenAI 兼容网关普遍支持 /v1/models，用它做轻量鉴权探测（不产生费用）
    return {
      method: 'GET',
      url: joinProviderUrl(baseUrl, '/v1', '/models'),
      headers: bearerHeaders(apiKey),
      body: undefined,
    }
  }

  // 火山引擎系：按量走 /api/v3，AgentPlan 套餐走 /api/plan/v3，报文与路径同构
  if (isVolcengineProvider(p)) {
    // 文本：/chat/completions 不接受空体，上游会以 MissingParameter(model) 拒绝，
    // 把「鉴权与路径是否正常」这个真正的结论掩盖成含糊的 400。
    // 与 gemini 分支同理，改发最小合法请求体，换一个确定的 200。
    if (serviceType === 'text') {
      if (!m) throw new Error('该文本配置未填写模型，无法测试连通性；请先添加至少一个模型')
      return {
        method: 'POST',
        url: joinProviderUrl(baseUrl, volcengineApiPrefix(p), '/chat/completions'),
        headers: bearerHeaders(apiKey, true),
        body: { model: m, messages: [{ role: 'user', content: 'hi' }] },
      }
    }
    // 图片/视频：维持空体探测——真实请求会创建计费任务
    const path = serviceType === 'video' ? '/contents/generations/tasks' : '/images/generations'
    return {
      method: 'POST',
      url: joinProviderUrl(baseUrl, volcengineApiPrefix(p), path),
      headers: bearerHeaders(apiKey, true),
      body: {},
    }
  }

  if (p === 'minimax') {
    // MiniMax 仅提供视频服务，空请求体探测鉴权/端点连通性
    return {
      method: 'POST',
      url: joinProviderUrl(baseUrl, '/v2', '/video_generation'),
      headers: bearerHeaders(apiKey, true),
      body: {},
    }
  }

  if (p === 'aliyun') {
    // Wan 3.0 仅支持异步提交；空请求体不会创建计费任务，仅用于验证地域端点与鉴权是否可达。
    return {
      method: 'POST',
      url: joinProviderUrl(baseUrl, '/api/v1', '/services/aigc/video-generation/video-synthesis'),
      headers: {
        ...bearerHeaders(apiKey, true),
        'X-DashScope-Async': 'enable',
      },
      body: {},
    }
  }

  return {
    method: 'GET',
    url: joinProviderUrl(baseUrl, '', m ? `/${m}` : '/'),
    headers: bearerHeaders(apiKey),
    body: undefined,
  }
}

// GET /ai-configs?service_type=text
app.get('/', async (c) => {
  const serviceType = c.req.query('service_type')
  let rows = await db.select().from(schema.aiServiceConfigs)
  if (serviceType) rows = rows.filter(r => r.serviceType === serviceType)

  const parsed = rows.map(withParsedFields)
  return success(c, parsed)
})

// POST /ai-configs
app.post('/', async (c) => {
  const body = await c.req.json()
  const ts = now()

  // 验证必填字段
  if (!body.service_type || !body.provider) {
    return badRequest(c, '需要 service_type 与 provider')
  }
  if (!isOfficialProvider(body.service_type, body.provider)) {
    return badRequest(c, '不支持的 service_type/provider')
  }

  let temperature: number | null = null
  if ('temperature' in body) {
    try {
      temperature = normalizeTemperature(body.temperature)
    } catch {
      return badRequest(c, 'temperature 须为 0 到 2 之间的数字')
    }
  }

  const res = await db.insert(schema.aiServiceConfigs).values({
    serviceType: body.service_type,
    provider: body.provider,
    name: body.name || `${body.provider}-${body.service_type}`,
    baseUrl: body.base_url || '',
    apiKey: body.api_key || '',
    model: JSON.stringify(body.model || []),
    priority: body.priority || 0,
    isActive: true,
    settings: mergeSettings(body.settings, 'temperature' in body ? temperature : undefined),
    createdAt: ts,
    updatedAt: ts,
  })

  const [row] = await db.select().from(schema.aiServiceConfigs)
    .where(eq(schema.aiServiceConfigs.id, getInsertId(res)))

  return created(c, withParsedFields(row))
})

/**
 * 配置导入 / 导出。
 *
 * 导出文件是**含明文 API Key 的完整快照**，用途只有一个：在受信任的设备之间复用配置。
 * 匹配键为「service_type + provider + name」——导出不含 id（设备间无意义），
 * 因此导入是 upsert：命中同键则更新，否则新增。
 */
const CONFIG_EXPORT_FORMAT = 'juwei-ai-configs'
const CONFIG_EXPORT_VERSION = 1

/** 单条配置归一化（导出与导入共用同一口径，避免两处字段漂移） */
function normalizeConfigEntry(raw: any): { entry?: Record<string, any>; error?: string } {
  const serviceType = String(raw?.service_type ?? raw?.serviceType ?? '').trim()
  const provider = String(raw?.provider ?? '').trim()
  if (!serviceType || !provider) return { error: '缺少 service_type 或 provider' }
  if (!isOfficialProvider(serviceType, provider)) {
    return { error: `不支持的 service_type/provider：${serviceType}/${provider}` }
  }

  const rawSettings = raw?.settings
  const settingsObj = rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings) ? rawSettings : {}
  let temperature: number | null | undefined
  if ('temperature' in settingsObj) {
    try {
      temperature = normalizeTemperature(settingsObj.temperature)
    } catch {
      return { error: 'temperature 须为 0 到 2 之间的数字' }
    }
  }

  const models = Array.isArray(raw?.model)
    ? raw.model.map((m: any) => String(m)).filter(Boolean)
    : (raw?.model ? [String(raw.model)] : [])

  const fallbackName = `${provider}-${serviceType}`
  return {
    entry: {
      serviceType,
      provider,
      name: String(raw?.name ?? '').trim() || fallbackName,
      baseUrl: String(raw?.base_url ?? raw?.baseUrl ?? '').trim(),
      apiKey: String(raw?.api_key ?? raw?.apiKey ?? ''),
      model: models,
      priority: Number.isFinite(Number(raw?.priority)) ? Number(raw.priority) : 0,
      isActive: !(raw?.is_active === false || raw?.isActive === false),
      settings: mergeSettings(settingsObj, temperature),
    },
  }
}

const configKey = (serviceType: string, provider: string, name: string) =>
  `${serviceType}\u0000${provider}\u0000${name}`

// GET /ai-configs/export — 导出全部配置（含密钥）
// 必须注册在 GET /:id 之前，否则会被 :id 路由吞掉
app.get('/export', async (c) => {
  const rows = await db.select().from(schema.aiServiceConfigs)
  const configs = rows
    .slice()
    .sort((a, b) => String(a.serviceType).localeCompare(String(b.serviceType))
      || (b.priority || 0) - (a.priority || 0)
      || Number(a.id) - Number(b.id))
    .map(r => ({
      service_type: r.serviceType,
      provider: r.provider || '',
      name: r.name,
      base_url: r.baseUrl || '',
      api_key: r.apiKey || '',
      model: (() => { try { return r.model ? JSON.parse(r.model) : [] } catch { return [] } })(),
      priority: r.priority || 0,
      is_active: !!r.isActive,
      settings: parseConfigSettings(r.settings),
    }))

  logTaskSuccess('AIConfig', 'export', { count: configs.length })
  // 响应含明文密钥：禁止浏览器与任何中间层缓存
  c.header('Cache-Control', 'no-store')
  return success(c, {
    format: CONFIG_EXPORT_FORMAT,
    version: CONFIG_EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    count: configs.length,
    configs,
  })
})

// POST /ai-configs/import — 导入导出的快照
// body: { data?: <导出结构>, prune?: boolean }（也接受直接传导出结构本身）
app.post('/import', async (c) => {
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return badRequest(c, '请求体不是合法 JSON')
  }

  const payload = body?.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : body
  if (!payload || !Array.isArray(payload.configs)) {
    return badRequest(c, '配置文件缺少 configs 数组')
  }
  if (payload.format && payload.format !== CONFIG_EXPORT_FORMAT) {
    return badRequest(c, `不是本应用导出的配置文件（format=${payload.format}）`)
  }
  const version = Number(payload.version ?? 0)
  if (Number.isFinite(version) && version > CONFIG_EXPORT_VERSION) {
    return badRequest(c, `配置文件版本（v${version}）高于当前应用支持的 v${CONFIG_EXPORT_VERSION}，请先升级应用`)
  }

  const prune = body?.prune === true
  const ts = now()
  const existing = await db.select().from(schema.aiServiceConfigs)
  const byKey = new Map(existing.map(r => [configKey(r.serviceType, r.provider || '', r.name), r]))

  const result = { total: payload.configs.length, added: 0, updated: 0, pruned: 0, skipped: 0, errors: [] as string[] }
  const seen = new Set<string>()

  for (let i = 0; i < payload.configs.length; i++) {
    const parsed = normalizeConfigEntry(payload.configs[i])
    if (!parsed.entry) {
      result.skipped++
      // 只回报前若干条，避免把整个文件回显进响应
      if (result.errors.length < 8) result.errors.push(`第 ${i + 1} 条：${parsed.error}`)
      continue
    }
    const e = parsed.entry
    const key = configKey(e.serviceType, e.provider, e.name)
    seen.add(key)

    const hit = byKey.get(key)
    if (hit) {
      await db.update(schema.aiServiceConfigs).set({
        baseUrl: e.baseUrl,
        apiKey: e.apiKey,
        model: JSON.stringify(e.model),
        priority: e.priority,
        isActive: e.isActive,
        settings: e.settings,
        updatedAt: ts,
      }).where(eq(schema.aiServiceConfigs.id, hit.id))
      result.updated++
    } else {
      const res = await db.insert(schema.aiServiceConfigs).values({
        serviceType: e.serviceType,
        provider: e.provider,
        name: e.name,
        baseUrl: e.baseUrl,
        apiKey: e.apiKey,
        model: JSON.stringify(e.model),
        priority: e.priority,
        isActive: e.isActive,
        settings: e.settings,
        createdAt: ts,
        updatedAt: ts,
      })
      // 同一份文件里出现同键条目时，后一条应当更新前一条，而不是再插一行
      byKey.set(key, { ...e, id: getInsertId(res) } as any)
      result.added++
    }
  }

  if (prune) {
    for (const [key, row] of byKey) {
      if (seen.has(key)) continue
      await db.delete(schema.aiServiceConfigs).where(eq(schema.aiServiceConfigs.id, row.id))
      result.pruned++
    }
  }

  logTaskSuccess('AIConfig', 'import', {
    total: result.total, added: result.added, updated: result.updated,
    pruned: result.pruned, skipped: result.skipped,
  })
  return success(c, result)
})

// POST /ai-configs/test
app.post('/test', async (c) => {
  const body = await c.req.json()
  if (!body.service_type || !body.provider || !body.base_url) {
    return badRequest(c, '需要 service_type、provider 与 base_url')
  }
  if (!isOfficialProvider(body.service_type, body.provider)) {
    return badRequest(c, '不支持的 service_type/provider')
  }

  const model = Array.isArray(body.model) ? body.model[0] : body.model
  // 构建期即可判定的问题（如文本探针缺少模型、音频缺音色编号）不当作 HTTP 错误返回，
  // 而是作为一次「不可达」的探测结果回给界面——设置页的测试面板才会显示真实原因，
  // 否则前端统一映射成「操作失败，请重试」，把可操作的提示吞掉。
  let probe: ReturnType<typeof buildProbe>
  try {
    probe = buildProbe(body.service_type, body.provider, body.base_url, model, body.api_key, body.settings ? JSON.stringify(body.settings) : null)
  } catch (e: any) {
    logTaskError('AIConfig', 'probe-build-failed', { provider: body.provider, error: e?.message })
    return success(c, {
      ok: false,
      reachable: false,
      status: 'CONFIG',
      method: 'POST',
      url: body.base_url || '',
      message: e?.message || '探测请求构建失败',
      response_preview: '',
    })
  }
  const probeUrl = redactUrl(probe.url)

  logTaskProgress('AIConfig', 'probe-start', {
    serviceType: body.service_type,
    provider: body.provider,
    method: probe.method,
    url: probeUrl,
  })

  try {
    const resp = await fetch(probe.url, {
      method: probe.method,
      headers: probe.headers,
      body: probe.body ? JSON.stringify(probe.body) : undefined,
    })
    const text = await resp.text()
    const reachable = [200, 204, 400, 401, 403].includes(resp.status)
    // 图片/视频探针刻意不带 model（真实请求会创建计费任务），被上游按参数校验拒绝属预期结果。
    // 判据是「空体探测 + 400」：空体必然过不了参数校验，与 Base URL/鉴权无关；
    // 不能再只认 MissingParameter 这几个词——不同网关措辞各异
    // （实测某网关回 "Invalid model name passed in model=None"，于是被误报成「请检查 Base URL」）。
    const probeBodyEmpty = !probe.body || Object.keys(probe.body).length === 0
    // 图片/视频的空体 POST 探测：这类探测**刻意不带 model**，与用户配置无关，
    // 上游对它的 400/5xx 都不能当作「配置有错」的证据
    // （实测 88api 网关回 503 "No available channel for model dall-e"，正是缺 model 被当成 dall-e 所致，
    //   而该配置真实生成完全正常）。
    const billedRiskProbe = probe.method === 'POST' && probeBodyEmpty
      && (body.service_type === 'image' || body.service_type === 'video')
    const missingParam = !resp.ok && resp.status === 400
      && (billedRiskProbe || /MissingParameter|RequiredParameter|InvalidParameter/i.test(text))
    // 5xx 是网关自身或其上游的故障：把上游原文带出来，别让用户去怀疑自己的 Base URL
    const upstreamBroken = resp.status >= 500
    // 音频（TTS）探针必须看**响应体**：MiniMax 鉴权失败时依旧返回 HTTP 200，
    // 错误藏在 base_resp.status_code 里；只看状态码会把坏 key 报成「可达」。
    let providerError: string | null = null
    let audioHint = ''
    if (body.service_type === 'audio') {
      try {
        const parsed = JSON.parse(text)
        const base = parsed?.base_resp ?? parsed?.baseResp
        if (base && Number(base.status_code) !== 0) {
          providerError = `[${base.status_code}] ${base.status_msg || ''}`.trim()
        } else {
          const code = parsed?.code
          if (code !== undefined && code !== null && code !== 0 && code !== 3000) {
            providerError = `[${code}] ${parsed?.message || parsed?.msg || ''}`.trim()
          }
        }
        if (!providerError) {
          // 判定「确实拿到了音频」：必须是足够长的字符串（base64/hex）或一个音频 URL，
          // 不能只看 data 字段是否存在——异步实现返回的 task id 会让判断失真。
          const candidate = parsed?.data?.audio ?? parsed?.audio ?? parsed?.data
          const isAudioUrl = typeof candidate === 'string' && /^https?:\/\//i.test(candidate)
          const hasAudio = (typeof candidate === 'string' && candidate.length > 512) || isAudioUrl
          audioHint = hasAudio
            ? '，并已返回音频数据'
            : '，但响应里没有音频数据（若该接口是异步任务则属正常，否则请核对模型与音色编号）'
        }
      } catch {
        providerError = `响应不是 JSON：${text.slice(0, 120)}`
      }
    }

    const payload = {
      ok: resp.ok && !providerError,
      reachable: reachable && !providerError,
      status: resp.status,
      status_text: resp.statusText,
      method: probe.method,
      url: probeUrl,
      message: providerError
        ? `上游拒绝了本次探测：${providerError}`
        : upstreamBroken
          ? billedRiskProbe
            ? `探测请求刻意不带 model（避免创建计费任务），上游回了 HTTP ${resp.status}：${summarizeUpstreamError(text)}。` +
              `空体探测在部分网关会被当作「缺失 model」的请求（例如默认成 dall-e 再报无可用通道），` +
              `因此这个 5xx 不能判定配置有错——请用一次真实生成确认`
            : `上游网关报错（HTTP ${resp.status}）：${summarizeUpstreamError(text)}。` +
              `这类 5xx 来自网关自身或其上游服务，通常不是 Base URL 配置问题——把这段原文发给网关提供方排查`
          : reachable
            ? (resp.ok
              ? `端点可访问，认证与路径基本正常${audioHint}`
              : missingParam
                ? '端点可达（非 404/401）；上游按参数校验拒绝了未携带 model 的探测请求，图片/视频配置出现该结果属预期'
                : '端点已响应，请根据状态码判断认证或路径是否正确')
            : '端点未按预期响应，请检查 Base URL 和代理前缀',
      response_preview: text.slice(0, 400),
    }
    if (payload.reachable) {
      logTaskSuccess('AIConfig', 'probe-done', {
        provider: body.provider,
        status: resp.status,
        url: probeUrl,
      })
    } else {
      logTaskError('AIConfig', 'probe-unexpected', {
        provider: body.provider,
        status: resp.status,
        url: probeUrl,
      })
    }
    return success(c, payload)
  } catch (error: any) {
    logTaskError('AIConfig', 'probe-failed', {
      provider: body.provider,
      url: probeUrl,
      error: error.message,
    })
    return success(c, {
      ok: false,
      reachable: false,
      method: probe.method,
      url: probeUrl,
      message: error.message || '请求失败',
      response_preview: '',
    })
  }
})

// GET /ai-configs/:id
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [row] = await db.select().from(schema.aiServiceConfigs).where(eq(schema.aiServiceConfigs.id, id))
  if (!row) return notFound(c)
  return success(c, withParsedFields(row))
})

// PUT /ai-configs/:id
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const [existing] = await db.select().from(schema.aiServiceConfigs).where(eq(schema.aiServiceConfigs.id, id))
  if (!existing) return notFound(c)

  const serviceType = 'service_type' in body ? body.service_type : existing.serviceType
  const provider = 'provider' in body ? body.provider : existing.provider
  if (!isOfficialProvider(serviceType, provider)) {
    return badRequest(c, '不支持的 service_type/provider')
  }

  const updates: Record<string, any> = { updatedAt: now() }

  if ('service_type' in body) updates.serviceType = body.service_type
  if ('provider' in body) updates.provider = body.provider
  if ('name' in body) updates.name = body.name
  if ('base_url' in body) updates.baseUrl = body.base_url
  if ('api_key' in body) updates.apiKey = body.api_key
  if ('model' in body) updates.model = JSON.stringify(body.model)
  if ('priority' in body) updates.priority = body.priority
  if ('is_active' in body) updates.isActive = body.is_active
  if ('temperature' in body || 'settings' in body) {
    let temperature: number | null | undefined
    if ('temperature' in body) {
      try {
        temperature = normalizeTemperature(body.temperature)
      } catch {
        return badRequest(c, 'temperature 须为 0 到 2 之间的数字')
      }
    }
    // 与已有 settings 合并：temperature 与音频配置字段（appid/cluster/音色编号）共存于同一 JSON
    let current: Record<string, any> = {}
    try { current = existing.settings ? JSON.parse(existing.settings) : {} } catch { current = {} }

    const merged: Record<string, any> = { ...current }
    if (temperature !== undefined) {
      if (temperature === null) delete merged.temperature
      else merged.temperature = temperature
    }
    if ('settings' in body && body.settings && typeof body.settings === 'object') {
      for (const [k, v] of Object.entries(body.settings)) {
        if (k === 'temperature') continue
        if (v === undefined || v === null || v === '') delete merged[k]
        else merged[k] = v
      }
    }
    updates.settings = Object.keys(merged).length ? JSON.stringify(merged) : null
  }

  await db.update(schema.aiServiceConfigs).set(updates).where(eq(schema.aiServiceConfigs.id, id))
  return success(c)
})

// DELETE /ai-configs/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(schema.aiServiceConfigs).where(eq(schema.aiServiceConfigs.id, id))
  return success(c)
})

// GET /ai-providers
export const aiProviders = new Hono()
aiProviders.get('/', async (c) => {
  const rows = await db.select().from(schema.aiServiceProviders)
  const parsed = rows.map(r => ({
    ...toSnakeCase(r),
    preset_models: r.presetModels ? JSON.parse(r.presetModels) : [],
  }))
  return success(c, parsed)
})

export default app
