/**
 * AI 服务抽象层 — 从数据库配置中获取 provider 和 API key
 */
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { logTaskProgress, logTaskWarn } from '../utils/task-logger.js'
import { joinProviderUrl } from './adapters/url.js'
import {
  VOLCENGINE_PLAN_PROVIDER,
  isVolcengineProvider,
  volcengineApiPrefix,
} from './adapters/volcengine-endpoints.js'

export type ServiceType = 'text' | 'image' | 'video' | 'audio'

export interface AIConfig {
  provider: string
  baseUrl: string
  apiKey: string
  model: string
  /** 采样温度，null 表示不设置（跟随服务商默认）。存于 ai_service_configs.settings JSON */
  temperature?: number | null
  /** settings JSON 原文：音频服务用它的 appid / cluster / 默认音色编号等 */
  settings?: string | null
}

/**
 * 从 settings JSON 读取任意字段（音频服务的 appid / cluster / 默认音色编号等都在这里）。
 * 非法 JSON 一律视为空对象。
 */
export function parseConfigSettings(settingsRaw: string | null | undefined): Record<string, any> {
  if (!settingsRaw) return {}
  try {
    const parsed = JSON.parse(settingsRaw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** 从 settings JSON 解析 temperature；非法值一律视为未设置 */
export function parseConfigTemperature(settingsRaw: string | null | undefined): number | null {
  const t = parseConfigSettings(settingsRaw).temperature
  return typeof t === 'number' && Number.isFinite(t) ? t : null
}

export const officialProviders: Record<ServiceType, readonly string[]> = {
  text: ['openai', 'gemini', 'volcengine', VOLCENGINE_PLAN_PROVIDER],
  image: ['openai', 'gemini', 'volcengine', VOLCENGINE_PLAN_PROVIDER],
  video: ['volcengine', VOLCENGINE_PLAN_PROVIDER, 'minimax', 'aliyun'],
  // 音频（TTS）：豆包语音走 openspeech 经典 HTTP；MiniMax 走 t2a_v2
  audio: ['volcengine', 'minimax'],
}

export function isOfficialProvider(serviceType?: string | null, provider?: string | null): boolean {
  const providers = officialProviders[serviceType as ServiceType]
  return !!providers && providers.includes((provider || '').toLowerCase())
}

export function getTextProviderBaseUrl(config: AIConfig) {
  const provider = config.provider.toLowerCase()

  if (provider === 'openai') {
    return joinProviderUrl(config.baseUrl, '/v1', '')
  }

  if (provider === 'gemini') {
    return joinProviderUrl(config.baseUrl, '/v1beta', '')
  }

  // 按量 /api/v3 与 AgentPlan 套餐 /api/plan/v3 共用同一套 OpenAI 兼容协议
  if (isVolcengineProvider(provider)) {
    return joinProviderUrl(config.baseUrl, volcengineApiPrefix(provider), '')
  }

  return config.baseUrl
}

// Agent 多步循环会逐步重复解析同一配置，相同配置只打一次日志避免刷屏
const lastLoggedActiveConfigKey = new Map<string, string>()
const lastLoggedConfigByIdKey = new Map<number, string>()

export async function getActiveConfig(serviceType: ServiceType): Promise<AIConfig | null> {
  const rows = (await db.select().from(schema.aiServiceConfigs)
    .where(eq(schema.aiServiceConfigs.serviceType, serviceType))
  )
    .filter(r => r.isActive && isOfficialProvider(serviceType, r.provider))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0)) // 高优先级优先

  const active = rows[0]
  if (!active) {
    logTaskWarn('AIConfig', 'active-config-missing', { serviceType })
    return null
  }

  const models = active.model ? JSON.parse(active.model) : []
  const logKey = `${active.id}:${models[0] || ''}`
  if (lastLoggedActiveConfigKey.get(serviceType) !== logKey) {
    lastLoggedActiveConfigKey.set(serviceType, logKey)
    logTaskProgress('AIConfig', 'active-config-selected', {
      serviceType,
      configId: active.id,
      provider: active.provider,
      model: models[0] || '',
      priority: active.priority,
    })
  }
  return {
    provider: active.provider || '',
    baseUrl: active.baseUrl,
    apiKey: active.apiKey,
    model: models[0] || '',
    temperature: parseConfigTemperature(active.settings),
    settings: active.settings,
  }
}

export async function getTextConfig(): Promise<AIConfig> {
  const config = await getActiveConfig('text')
  if (!config) throw new Error('未配置文本模型，请先到「设置」页添加并启用 AI 服务')
  return config
}

/**
 * 取某服务类型当前启用且优先级最高的官方配置 ID（创建集时自动锁定用）
 */
export async function getActiveConfigId(serviceType: ServiceType): Promise<number | null> {
  const rows = (await db.select().from(schema.aiServiceConfigs)
    .where(eq(schema.aiServiceConfigs.serviceType, serviceType))
  )
    .filter(r => r.isActive && isOfficialProvider(serviceType, r.provider))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
  return rows[0]?.id ?? null
}

export async function getConfigById(id: number): Promise<AIConfig | null> {
  const [row] = await db.select().from(schema.aiServiceConfigs)
    .where(eq(schema.aiServiceConfigs.id, id))
  if (!row || !row.isActive) {
    logTaskWarn('AIConfig', 'config-by-id-missing', { configId: id })
    return null
  }
  if (!isOfficialProvider(row.serviceType as ServiceType, row.provider)) {
    logTaskWarn('AIConfig', 'config-by-id-unsupported-provider', {
      configId: id,
      serviceType: row.serviceType,
      provider: row.provider,
    })
    return null
  }
  const models = row.model ? JSON.parse(row.model) : []
  const logKey = `${row.provider}:${models[0] || ''}:${row.serviceType}`
  if (lastLoggedConfigByIdKey.get(id) !== logKey) {
    lastLoggedConfigByIdKey.set(id, logKey)
    logTaskProgress('AIConfig', 'config-by-id-selected', {
      configId: id,
      provider: row.provider,
      model: models[0] || '',
      serviceType: row.serviceType,
    })
  }
  return {
    provider: row.provider || '',
    baseUrl: row.baseUrl,
    apiKey: row.apiKey,
    model: models[0] || '',
    temperature: parseConfigTemperature(row.settings),
    settings: row.settings,
  }
}
