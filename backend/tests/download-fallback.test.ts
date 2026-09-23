import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { rmSync } from 'node:fs'
import path from 'node:path'

// storage.ts 在模块加载时读取 STORAGE_PATH，必须在 import 之前设置
const TEST_STORAGE = path.resolve('.tmp-download-test')
process.env.STORAGE_PATH = TEST_STORAGE

const { buildDownloadCandidates, downloadAuthHeaders } = await import('../src/services/adapters/url')
const { downloadFile } = await import('../src/utils/storage')

// ===== 回退候选 =====

test('回退到生成任务 base_url 的 origin，路径与查询串（含签名）原样保留', () => {
  const got = buildDownloadCandidates(
    'http://7.6.59.90:18091/v2/video_generation/abc/download?sign=x%2Fy&t=1',
    'http://218.28.9.108:50330',
  )
  assert.deepEqual(got, [
    'http://7.6.59.90:18091/v2/video_generation/abc/download?sign=x%2Fy&t=1',
    'http://218.28.9.108:50330/v2/video_generation/abc/download?sign=x%2Fy&t=1',
  ])
})

test('host 相同则不产生重复候选', () => {
  assert.deepEqual(
    buildDownloadCandidates('https://gw.example.com/a/b.mp4', 'https://gw.example.com'),
    ['https://gw.example.com/a/b.mp4'],
  )
})

test('base_url 带路径前缀时只替换 origin，不吞掉路径也不重复前缀', () => {
  const got = buildDownloadCandidates('http://10.0.0.1/x.mp4', 'https://api.example.com/volcengine')
  assert.equal(got[1], 'https://api.example.com/x.mp4')
})

test('协议不同（http→https）也会替换', () => {
  const got = buildDownloadCandidates('http://10.0.0.1/x.mp4', 'https://gw.example.com')
  assert.equal(got[1], 'https://gw.example.com/x.mp4')
})

test('地址不合法或 base_url 为空时不做回退', () => {
  assert.deepEqual(buildDownloadCandidates('/relative/path', 'https://a.com'), ['/relative/path'])
  assert.deepEqual(buildDownloadCandidates('https://a.com/x', ''), ['https://a.com/x'])
  assert.deepEqual(buildDownloadCandidates('not a url', 'also not a url'), ['not a url'])
})

// ===== 下载扩展名 =====

const MP4 = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x20]), Buffer.from('ftypisom', 'latin1'), Buffer.alloc(16)])
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)])

// ===== 下载鉴权头 =====

test('仅对与 base_url 同 host 的地址附带 Bearer 凭证，第三方地址一律不带', () => {
  const base = 'http://218.28.9.108:50330'
  // 网关自身（私有网关的下载接口常要求鉴权）
  assert.deepEqual(
    downloadAuthHeaders('http://218.28.9.108:50330/v2/video_generation/x/download', base, 'sk-abc'),
    { Authorization: 'Bearer sk-abc' },
  )
  // 网关透出的内网/第三方地址 → 不带，避免凭证外泄
  assert.deepEqual(
    downloadAuthHeaders('http://7.6.59.90:18091/v2/video_generation/x/download', base, 'sk-abc'),
    {},
  )
  // 签名 CDN / OSS 预签名链接自带授权
  assert.deepEqual(
    downloadAuthHeaders('https://oss.example.com/a.mp4?sign=x', 'https://gw.example.com', 'sk-abc'),
    {},
  )
  // 端口不同视为不同 host
  assert.deepEqual(
    downloadAuthHeaders('http://gw.example.com:8080/a', 'http://gw.example.com', 'sk-abc'),
    {},
  )
  // 无 key 或地址不合法
  assert.deepEqual(downloadAuthHeaders('https://gw.example.com/a', 'https://gw.example.com', ''), {})
  assert.deepEqual(downloadAuthHeaders('nope', 'https://gw.example.com', 'sk'), {})
})

test('downloadFile 能带鉴权头访问「要求鉴权」的网关下载地址', async () => {
  const server = createServer((req, res) => {
    if (req.headers.authorization !== 'Bearer sk-test') {
      res.statusCode = 401
      res.end('unauthorized')
      return
    }
    res.setHeader('content-type', 'video/mp4')
    res.end(MP4)
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const port = (server.address() as any).port
  const base = `http://127.0.0.1:${port}`

  try {
    const url = `${base}/v2/video_generation/abc/download`
    // 同 host → 自动带上凭证 → 下载成功（且扩展名由 Content-Type 判定）
    const saved = await downloadFile(url, 'videos', downloadAuthHeaders(url, base, 'sk-test'))
    assert.match(saved, /\.mp4$/)

    // 不带凭证则复现用户网关的 401
    await assert.rejects(() => downloadFile(url, 'videos', {}), /Download failed: 401/)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    rmSync(TEST_STORAGE, { recursive: true, force: true })
  }
})

test('downloadFile 依次用 URL 后缀 → Content-Type → 魔数 决定扩展名', async () => {
  const server = createServer((req, res) => {
    const url = req.url || ''
    if (url === '/download') {
      // 典型私有网关：路径无后缀，且统一报 octet-stream
      res.setHeader('content-type', 'application/octet-stream')
      res.end(MP4)
    } else if (url === '/pic') {
      res.setHeader('content-type', 'image/png')
      res.end(PNG)
    } else if (url === '/video.mp4') {
      res.end(MP4)
    } else {
      res.setHeader('content-type', 'application/octet-stream')
      res.end(Buffer.from('not media at all'))
    }
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const port = (server.address() as any).port
  const base = `http://127.0.0.1:${port}`

  try {
    // 无后缀 + octet-stream → 靠魔数嗅探出 mp4
    assert.match(await downloadFile(`${base}/download`, 'videos'), /\.mp4$/)
    // Content-Type 可用时直接采信
    assert.match(await downloadFile(`${base}/pic`, 'images'), /\.png$/)
    // URL 后缀优先
    const byUrl = await downloadFile(`${base}/video.mp4`, 'videos')
    assert.match(byUrl, /\.mp4$/)
    // 完全无法判断 → .bin
    assert.match(await downloadFile(`${base}/mystery`, 'videos'), /\.bin$/)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    rmSync(TEST_STORAGE, { recursive: true, force: true })
  }
})
