/**
 * 火山引擎方舟 API 路径前缀（唯一锚点）
 *
 * 方舟有两套计费通道，端点结构完全同构，仅前缀不同：
 * - 按量付费：/api/v3
 * - AgentPlan 订阅套餐：/api/plan/v3（消耗套餐额度；误用 /api/v3 会产生额外费用）
 *
 * 图片、视频、文本三条链路以及配置页探针都必须经此解析，避免任何一处硬编码 /api/v3。
 */

export const VOLCENGINE_API_PREFIX = '/api/v3'
export const VOLCENGINE_PLAN_API_PREFIX = '/api/plan/v3'

/** AgentPlan 套餐的 provider 标识 */
export const VOLCENGINE_PLAN_PROVIDER = 'volcengine-plan'

/** 是否为火山引擎系 provider（含 AgentPlan 套餐） */
export function isVolcengineProvider(provider?: string | null): boolean {
  const p = (provider || '').toLowerCase()
  return p === 'volcengine' || p === VOLCENGINE_PLAN_PROVIDER
}

/** provider → API 路径前缀；非火山系回退按量前缀 */
export function volcengineApiPrefix(provider?: string | null): string {
  return (provider || '').toLowerCase() === VOLCENGINE_PLAN_PROVIDER
    ? VOLCENGINE_PLAN_API_PREFIX
    : VOLCENGINE_API_PREFIX
}
