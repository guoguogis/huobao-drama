/**
 * Provider Adapter 注册表
 * 根据 provider 名称返回对应的 Adapter 实例
 */
import { OpenAIImageAdapter } from './openai-image'
import { GeminiImageAdapter } from './gemini-image'
import { VolcEngineImageAdapter } from './volcengine-image'
import { VolcEngineVideoAdapter } from './volcengine-video'
import { MiniMaxVideoAdapter } from './minimax-video'
import { AliyunVideoAdapter } from './aliyun-video'
import { VOLCENGINE_PLAN_API_PREFIX, VOLCENGINE_PLAN_PROVIDER } from './volcengine-endpoints'
import type { ImageProviderAdapter, VideoProviderAdapter } from './types'

// 图片 Adapter 注册表
export const imageAdapters: Record<string, ImageProviderAdapter> = {
  openai: new OpenAIImageAdapter(),
  gemini: new GeminiImageAdapter(),
  volcengine: new VolcEngineImageAdapter(),
  // AgentPlan 套餐通道：同报文，前缀换成 /api/plan/v3，避免误走按量计费
  [VOLCENGINE_PLAN_PROVIDER]: new VolcEngineImageAdapter(VOLCENGINE_PLAN_PROVIDER, VOLCENGINE_PLAN_API_PREFIX),
}

// 视频 Adapter 注册表
export const videoAdapters: Record<string, VideoProviderAdapter> = {
  volcengine: new VolcEngineVideoAdapter(),
  [VOLCENGINE_PLAN_PROVIDER]: new VolcEngineVideoAdapter(VOLCENGINE_PLAN_PROVIDER, VOLCENGINE_PLAN_API_PREFIX),
  minimax: new MiniMaxVideoAdapter(),
  aliyun: new AliyunVideoAdapter(),
}

/**
 * 获取图片 Adapter
 * @param provider 厂商名称
 * @returns 对应的 Adapter
 */
export function getImageAdapter(provider: string): ImageProviderAdapter {
  const adapter = imageAdapters[provider.toLowerCase()]
  if (!adapter) throw new Error(`Unsupported image provider: ${provider}`)
  return adapter
}

/**
 * 获取视频 Adapter
 * @param provider 厂商名称
 * @returns 对应的 Adapter
 */
export function getVideoAdapter(provider: string): VideoProviderAdapter {
  const adapter = videoAdapters[provider.toLowerCase()]
  if (!adapter) throw new Error(`Unsupported video provider: ${provider}`)
  return adapter
}
