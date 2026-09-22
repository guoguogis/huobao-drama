import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AliyunVideoAdapter } from '../src/services/adapters/aliyun-video'

const adapter = new AliyunVideoAdapter()
const config = {
  provider: 'aliyun',
  baseUrl: 'https://ws-123.cn-beijing.maas.aliyuncs.com',
  apiKey: 'sk-test',
  model: 'wan3.0-video-prime',
}

// TokenPlan 套餐通道：站点根，不带 /compatible-mode/v1
const planConfig = {
  provider: 'aliyun',
  baseUrl: 'https://token-plan.cn-beijing.maas.aliyuncs.com',
  apiKey: 'sk-sp-test',
  model: 'happyhorse-1.1-t2v',
}

test('Wan 3.0 request follows the official input/media/parameters contract', () => {
  const request = adapter.buildGenerateRequest(config, {
    id: 1,
    prompt: '@图片1女孩 走进视频1的房间',
    referenceImageUrls: JSON.stringify(['https://example.com/1.png']),
    referenceVideoUrls: JSON.stringify(['https://example.com/1.mp4']),
    referenceAudioUrls: JSON.stringify(['https://example.com/1.mp3']),
    referenceFileUrl: 'https://example.com/brief.pdf',
    duration: -1,
    aspectRatio: 'adaptive',
    resolution: '1080p',
    generateAudio: false,
    seed: 42,
    promptExtend: false,
    watermark: true,
  })

  assert.equal(request.url, 'https://ws-123.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis')
  assert.equal(request.method, 'POST')
  assert.equal(request.headers.Authorization, 'Bearer sk-test')
  assert.equal(request.headers['X-DashScope-Async'], 'enable')
  assert.deepEqual(request.body, {
    model: 'wan3.0-video-prime',
    input: {
      prompt: '图1女孩 走进视频1的房间',
      media: [
        { type: 'reference_image', url: 'https://example.com/1.png' },
        { type: 'reference_video', url: 'https://example.com/1.mp4' },
        { type: 'reference_audio', url: 'https://example.com/1.mp3' },
        { type: 'file', url: 'https://example.com/brief.pdf' },
      ],
    },
    parameters: {
      resolution: '1080P',
      ratio: 'adaptive',
      duration: -1,
      audio: false,
      prompt_extend: false,
      watermark: true,
      seed: 42,
    },
  })
})

test('Wan 3.0 supports official first/last frame mode and rejects mixed media modes', () => {
  const request = adapter.buildGenerateRequest(config, {
    id: 2,
    prompt: '从白天过渡到黑夜',
    firstFrameUrl: 'data:image/png;base64,first',
    lastFrameUrl: 'data:image/png;base64,last',
  })

  assert.deepEqual(request.body.input.media, [
    { type: 'first_frame', url: 'data:image/png;base64,first' },
    { type: 'last_frame', url: 'data:image/png;base64,last' },
  ])
  assert.throws(() => adapter.buildGenerateRequest(config, {
    id: 3,
    firstFrameUrl: 'https://example.com/first.png',
    referenceAudioUrls: JSON.stringify(['https://example.com/ref.mp3']),
  }), /first_frame\/last_frame/)
})

test('Wan 3.0 parses official async creation and polling responses', () => {
  assert.deepEqual(adapter.parseGenerateResponse({
    output: { task_status: 'PENDING', task_id: 'task-123' },
    request_id: 'request-1',
  }), { isAsync: true, taskId: 'task-123' })

  assert.deepEqual(adapter.parsePollResponse({
    output: { task_status: 'SUCCEEDED', video_url: 'https://example.com/result.mp4' },
    usage: { output_video_duration: 7.5, fps: 30, SR: 1080, ratio: '16:9' },
    request_id: 'request-2',
  }), { status: 'completed', videoUrl: 'https://example.com/result.mp4', duration: 7.5 })

  assert.deepEqual(adapter.parsePollResponse({
    output: { task_status: 'FAILED', code: 'InvalidParameter', message: 'bad media combination' },
    request_id: 'request-3',
  }), {
    status: 'failed',
    error: '[InvalidParameter] bad media combination (request_id: request-3)',
  })
})

// ===== HappyHorse（阿里云百炼 TokenPlan 默认视频模型族）=====

test('HappyHorse t2v is text-only: no media, no audio/prompt_extend, TokenPlan host passthrough', () => {
  const request = adapter.buildGenerateRequest(planConfig, {
    id: 10,
    prompt: '一座纸板城市在夜晚亮起',
    duration: 5,
    aspectRatio: '16:9',
    resolution: '720p',
  })

  assert.equal(
    request.url,
    'https://token-plan.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis',
  )
  assert.equal(request.headers['X-DashScope-Async'], 'enable')
  assert.deepEqual(request.body, {
    model: 'happyhorse-1.1-t2v',
    input: { prompt: '一座纸板城市在夜晚亮起' },
    parameters: { resolution: '720P', ratio: '16:9', duration: 5, watermark: false },
  })
})

test('HappyHorse t2v rejects any reference material', () => {
  assert.throws(() => adapter.buildGenerateRequest(planConfig, {
    id: 11,
    prompt: '走动的猫',
    firstFrameUrl: 'https://example.com/a.png',
  }), /仅接受文本提示词/)
})

test('HappyHorse ratio: adaptive falls back to the official default, unknown ratio is rejected', () => {
  const fallback = adapter.buildGenerateRequest(planConfig, {
    id: 12,
    prompt: 'x',
    aspectRatio: 'adaptive',
  })
  assert.equal((fallback.body as any).parameters.ratio, '16:9')

  // 21:9 是 HappyHorse 支持但 Wan 不支持的枚举
  const wide = adapter.buildGenerateRequest(planConfig, { id: 13, prompt: 'x', aspectRatio: '21:9' })
  assert.equal((wide.body as any).parameters.ratio, '21:9')

  assert.throws(() => adapter.buildGenerateRequest(planConfig, {
    id: 14,
    prompt: 'x',
    aspectRatio: '2.35:1',
  }), /ratio 仅支持/)
})

test('HappyHorse duration window is 3~15 and does not accept -1', () => {
  assert.equal((adapter.buildGenerateRequest(planConfig, { id: 15, prompt: 'x', duration: 15 }).body as any).parameters.duration, 15)
  assert.throws(() => adapter.buildGenerateRequest(planConfig, { id: 16, prompt: 'x', duration: -1 }), /duration 必须为 3~15/)
  assert.throws(() => adapter.buildGenerateRequest(planConfig, { id: 17, prompt: 'x', duration: 20 }), /duration 必须为 3~15/)
})

test('HappyHorse r2v requires 1~9 reference images and rewrites @图片N to [Image N]', () => {
  const request = adapter.buildGenerateRequest({ ...planConfig, model: 'happyhorse-1.1-r2v' }, {
    id: 20,
    prompt: '@图片1中穿红裙的女性展开@图片2的折扇',
    referenceImageUrls: JSON.stringify(['https://example.com/1.png', 'https://example.com/2.png']),
    duration: 5,
  })

  assert.deepEqual(request.body, {
    model: 'happyhorse-1.1-r2v',
    input: {
      prompt: '[Image 1]中穿红裙的女性展开[Image 2]的折扇',
      media: [
        { type: 'reference_image', url: 'https://example.com/1.png' },
        { type: 'reference_image', url: 'https://example.com/2.png' },
      ],
    },
    parameters: { resolution: '1080P', ratio: '16:9', duration: 5, watermark: false },
  })

  assert.throws(() => adapter.buildGenerateRequest({ ...planConfig, model: 'happyhorse-1.1-r2v' }, {
    id: 21,
    prompt: '没有参考图',
  }), /需要 1~9 项素材/)

  const tooMany = Array.from({ length: 10 }, (_, i) => `https://example.com/${i}.png`)
  assert.throws(() => adapter.buildGenerateRequest({ ...planConfig, model: 'happyhorse-1.1-r2v' }, {
    id: 22,
    prompt: 'x',
    referenceImageUrls: JSON.stringify(tooMany),
  }), /需要 1~9 项素材/)

  assert.throws(() => adapter.buildGenerateRequest({ ...planConfig, model: 'happyhorse-1.1-r2v' }, {
    id: 23,
    prompt: 'x',
    referenceVideoUrls: JSON.stringify(['https://example.com/a.mp4']),
  }), /不支持 reference_video/)
})

test('HappyHorse i2v takes exactly one first_frame and omits ratio (aspect follows the frame)', () => {
  const request = adapter.buildGenerateRequest({ ...planConfig, model: 'happyhorse-1.1-i2v' }, {
    id: 30,
    prompt: '一只猫在草地上奔跑',
    firstFrameUrl: 'https://example.com/first.png',
    duration: 5,
    aspectRatio: '9:16',
  })

  assert.deepEqual(request.body, {
    model: 'happyhorse-1.1-i2v',
    input: {
      prompt: '一只猫在草地上奔跑',
      media: [{ type: 'first_frame', url: 'https://example.com/first.png' }],
    },
    // i2v 不支持 ratio，下发会被官方拒绝
    parameters: { resolution: '1080P', duration: 5, watermark: false },
  })

  assert.throws(() => adapter.buildGenerateRequest({ ...planConfig, model: 'happyhorse-1.1-i2v' }, {
    id: 31,
    prompt: 'x',
  }), /需要 恰好 1 项素材/)

  assert.throws(() => adapter.buildGenerateRequest({ ...planConfig, model: 'happyhorse-1.1-i2v' }, {
    id: 32,
    prompt: 'x',
    firstFrameUrl: 'https://example.com/a.png',
    lastFrameUrl: 'https://example.com/b.png',
  }), /不支持 last_frame/)
})

test('unknown aliyun video model is rejected with the supported list', () => {
  assert.throws(() => adapter.buildGenerateRequest({ ...planConfig, model: 'wan2.6-t2v' }, {
    id: 40,
    prompt: 'x',
  }), /不支持的阿里云百炼视频模型：wan2\.6-t2v/)
})
