/**
 * 火山引擎 veImageX 图片生成 Adapter
 * 端点: {prefix}/images/generations
 * 响应格式: { data: [{ url: "..." }] }
 *
 * prefix 由 provider 决定：按量 /api/v3、AgentPlan 套餐 /api/plan/v3
 * （两者报文结构一致，仅计费通道不同）
 */
import type {
  ImageProviderAdapter,
  ProviderRequest,
  AIConfig,
  ImageGenerationRecord,
  ImageGenResponse,
  ImagePollResponse,
} from './types'
import { joinProviderUrl } from './url'
import { VOLCENGINE_API_PREFIX } from './volcengine-endpoints'

export class VolcEngineImageAdapter implements ImageProviderAdapter {
  provider: string

  /** API 路径前缀，见 volcengine-endpoints.ts */
  private apiPrefix: string

  constructor(provider = 'volcengine', apiPrefix = VOLCENGINE_API_PREFIX) {
    this.provider = provider
    this.apiPrefix = apiPrefix
  }

  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord): ProviderRequest {
    // 火山引擎使用 seedream 模型
    const model = record.model || config.model || 'doubao-seedream-5-0-260128'

    const body: any = {
      model,
      prompt: record.prompt,
    }

    // 尺寸参数
    if (record.size) {
      const [w, h] = record.size.split('x')
      if (w && h) {
        body.width = parseInt(w)
        body.height = parseInt(h)
      }
    }

    return {
      url: joinProviderUrl(config.baseUrl, this.apiPrefix, '/images/generations'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    // 先取图片本体：方舟 /images/generations 是同步接口，响应里若同时带 id 之类的请求标识，
    // 先判 task_id 会把它误当成异步任务，进而去轮询一个并不存在的查询端点，
    // 表现为「一直轮询，最后超时且始终拿不到图」。
    const imageUrl = result.data?.[0]?.url || result.url
    if (imageUrl) {
      return { isAsync: false, imageUrl }
    }
    // 没有图片本体时才认为需要轮询（兼容部分网关的异步图片接口）
    if (result.task_id || result.id) {
      return { isAsync: true, taskId: result.task_id || result.id }
    }
    throw new Error('No image URL in response')
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, this.apiPrefix, `/images/generations/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): ImagePollResponse {
    const status = result.status
    if (status === 'succeeded') {
      return {
        status: 'completed',
        imageUrl: result.data?.[0]?.url || result.image_url,
      }
    }
    if (status === 'failed') {
      // 上游 error 可能是对象 { code, message }，规范成字符串
      const err = result.error
      const msg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err) || 'Generation failed')
      const code = err && typeof err === 'object' && err.code ? `[${err.code}] ` : ''
      return { status: 'failed', error: `${code}${msg}` }
    }
    return { status: status || 'processing' }
  }

  extractImageUrl(result: any): string | null {
    return result.data?.[0]?.url || result.image_url || null
  }

  extractImageBase64(result: any): { data: string; mimeType: string } | null {
    return null
  }
}
