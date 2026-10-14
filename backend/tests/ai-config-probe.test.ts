/**
 * 配置探测（「测试」按钮）的报文与文案契约。
 *
 * 背景（真实故障排查）：AILAB 网关（OpenAI 兼容、litellm）的图片端点
 * - `GET /v1/models` 返回 200（只说明鉴权没问题）
 * - 真实 POST `/v1/images/generations` 空体返回 400 "Invalid model name…"（路径与鉴权正常）
 * - 带真实报文时返回 500 `litellm.APIConnectionError … Connection error … Model Group=…`
 * 结论：图片配置本身没配错，是**网关自己的上游**不可用。由此产生两条契约：
 * 1) 图片探针必须打真实的 POST 端点，不能只探 /v1/models（否则掩盖端点本身不通）
 * 2) 5xx 必须把上游原文带出来，不能说成「请检查 Base URL」
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-probe-'))
process.env.SQLITE_PATH = path.join(tmpDir, 'test.sqlite3')
process.env.MYSQL_AUTO_IMPORT = 'false'

const here = path.dirname(fileURLToPath(import.meta.url))
const { buildProbe, summarizeUpstreamError } = await import('../src/routes/aiConfigs')
const { default: aiConfigsRoute } = await import('../src/routes/aiConfigs')

test('图片探针：OpenAI 兼容走真实 POST 端点（不是 GET /models）', () => {
  const probe = buildProbe('image', 'openai', 'https://gw.example.com/v1', 'qwen-image-2.1', 'sk-x')
  assert.equal(probe.method, 'POST')
  assert.equal(probe.url, 'https://gw.example.com/v1/images/generations')
  assert.deepEqual(probe.body, {}, '空体：不会创建计费任务，只验证路径与鉴权')

  // base_url 不带 /v1 时也拼对；带 /v1 时不重复
  assert.equal(buildProbe('image', 'openai', 'https://gw.example.com', 'm', 'k').url, 'https://gw.example.com/v1/images/generations')
  assert.equal(buildProbe('image', 'openai', 'https://gw.example.com/v1/', 'm', 'k').url, 'https://gw.example.com/v1/images/generations')

  // 文本仍走轻量 /models（不产生 token 费用）
  const textProbe = buildProbe('text', 'openai', 'https://gw.example.com', 'deepseek-v4.1-flash', 'k')
  assert.equal(textProbe.method, 'GET')
  assert.equal(textProbe.url, 'https://gw.example.com/v1/models')
})

test('summarizeUpstreamError：各网关错误字段都能摘出可读原因', () => {
  assert.equal(
    summarizeUpstreamError(JSON.stringify({ error: { message: 'litellm.APIConnectionError: Connection error.' } })),
    'litellm.APIConnectionError: Connection error.',
  )
  assert.equal(summarizeUpstreamError(JSON.stringify({ error: 'plain error string' })), 'plain error string')
  assert.equal(summarizeUpstreamError(JSON.stringify({ message: 'top-level message' })), 'top-level message')
  assert.equal(summarizeUpstreamError(JSON.stringify({ detail: 'Not Found' })), 'Not Found')
  assert.equal(summarizeUpstreamError('not json at all'), 'not json at all')
  assert.match(summarizeUpstreamError(''), /未返回错误内容/)
  const long = summarizeUpstreamError(JSON.stringify({ message: 'x'.repeat(400) }))
  assert.ok(long.length <= 221 && long.endsWith('…'), '过长要截断')
})

/** 起一个可编程打桩网关，返回指定状态与响应体 */
async function withStubGateway(status: number, bodyText: string, run: (baseUrl: string) => Promise<void>) {
  const server = http.createServer((req, res) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(bodyText)
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
  const port = (server.address() as any).port
  try {
    await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
}

const probeConfig = (baseUrl: string) => aiConfigsRoute.request('/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ service_type: 'image', provider: 'openai', base_url: baseUrl, model: 'qwen-image-2.1', api_key: 'sk-test' }),
})

test('5xx：图片空体探测带出上游原文，并说明不能据此判定配置有错', async () => {
  const upstream = JSON.stringify({
    error: { message: 'litellm.APIConnectionError: APIConnectionError: OpenAIException - Connection error.. Received Model Group=qwen-image-2.1' },
  })
  await withStubGateway(500, upstream, async (baseUrl) => {
    const res = await probeConfig(baseUrl)
    assert.equal(res.status, 200, '探测接口本身应返回 200，结论在 payload 里')
    const data = (await res.json() as any).data
    assert.equal(data.status, 500)
    assert.equal(data.ok, false)
    assert.equal(data.reachable, false)
    assert.match(data.message, /litellm\.APIConnectionError/, '必须带出上游原文')
    assert.match(data.message, /探测请求刻意不带 model/, '要说明这是空体探测的固有行为')
    assert.match(data.message, /请用一次真实生成确认/, '给出可执行的确认方式')
    assert.doesNotMatch(data.message, /请检查 Base URL 和代理前缀/)
    assert.match(data.url, /\/v1\/images\/generations$/, '探测地址就是真实生成端点')
  })
})

test('5xx：非空体探测（文本走 /v1/models）仍按网关故障措辞并提示不是 Base URL 问题', async () => {
  const upstream = JSON.stringify({ error: { message: 'upstream connection reset' } })
  await withStubGateway(502, upstream, async (baseUrl) => {
    const res = await aiConfigsRoute.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_type: 'text', provider: 'openai', base_url: baseUrl, model: 'gpt-5.6-terra', api_key: 'sk-test' }),
    })
    const data = (await res.json() as any).data
    assert.equal(data.status, 502)
    assert.match(data.message, /上游网关报错（HTTP 502）/)
    assert.match(data.message, /upstream connection reset/)
    assert.match(data.message, /不是 Base URL 配置问题/)
    assert.doesNotMatch(data.message, /探测请求刻意不带 model/, '文本探测不该套用空体探测的解释')
  })
})

test('5xx：网关把缺失 model 默认成 dall-e 时（实测 88api），文案要避免误判', async () => {
  const body = JSON.stringify({ error: { message: 'No available channel for model dall-e under group auto (distributor)' } })
  await withStubGateway(503, body, async (baseUrl) => {
    const data = (await (await probeConfig(baseUrl)).json() as any).data
    assert.equal(data.status, 503)
    assert.match(data.message, /No available channel for model dall-e/, '原文要带出来')
    assert.match(data.message, /不能判定配置有错/)
  })
})

test('400（空体参数校验）：判为可达且属预期，而不是「请检查 Base URL」', async () => {
  // 实测该网关的措辞：不含 MissingParameter 等关键字，旧判据会把结论带偏
  const body = JSON.stringify({ error: { message: "400: {'error': '/image/generations: Invalid model name passed in model=None. Call `/v1/models` to view available models for your key.'}", code: '400' } })
  await withStubGateway(400, body, async (baseUrl) => {
    const data = (await (await probeConfig(baseUrl)).json() as any).data
    assert.equal(data.reachable, true)
    assert.match(data.message, /上游按参数校验拒绝/)
    assert.match(data.message, /属预期/)
    assert.doesNotMatch(data.message, /请检查 Base URL/)
  })
})

test('422（空体参数校验）：同样判为可达，而不是「请检查 Base URL」', async () => {
  // FastAPI 系私有网关对空体缺字段回 422 而非 400（实测 ailab-image 网关回 422 "Field required"）
  const body = JSON.stringify({ detail: [{ type: 'missing', loc: ['body', 'prompt'], msg: 'Field required', input: {} }] })
  await withStubGateway(422, body, async (baseUrl) => {
    const data = (await (await probeConfig(baseUrl)).json() as any).data
    assert.equal(data.reachable, true)
    assert.match(data.message, /上游按参数校验拒绝/)
    assert.match(data.message, /属预期/)
    assert.doesNotMatch(data.message, /请检查 Base URL/)
  })
})

test('200：判为可访问', async () => {
  await withStubGateway(200, JSON.stringify({ data: [{ id: 'qwen-image-2.1' }] }), async (baseUrl) => {
    const data = (await (await probeConfig(baseUrl)).json() as any).data
    assert.equal(data.ok, true)
    assert.equal(data.reachable, true)
    assert.match(data.message, /端点可访问/)
  })
})

test('404：仍然指向配置问题（不能滥用「属预期」）', async () => {
  await withStubGateway(404, JSON.stringify({ detail: 'Not Found' }), async (baseUrl) => {
    const data = (await (await probeConfig(baseUrl)).json() as any).data
    assert.equal(data.reachable, false)
    assert.match(data.message, /请检查 Base URL/)
  })
})
