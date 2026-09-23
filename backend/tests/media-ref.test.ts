/**
 * 参考素材的两条下行路线与守卫放行：
 * - 本地联调（无 PUBLIC_BASE_URL）：内联 Base64 dataURL
 * - 服务器部署（有 PUBLIC_BASE_URL）：签名公网 URL，且守卫校验签名后放行
 *
 * 这些环境变量必须在 import 之前设置：SQLITE_PATH 决定 db 模块初始化哪个库，
 * AUTH_SECRET 决定签名密钥（不设会走库内持久化的分支）。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const TEST_ROOT = path.join(os.tmpdir(), `huobao-media-ref-${process.pid}-${Date.now()}`)
const TEST_DB = path.join(TEST_ROOT, 'test.sqlite3')
const TEST_SECRET = 'test-secret-media-ref'

process.env.SQLITE_PATH = TEST_DB
process.env.AUTH_SECRET = TEST_SECRET
process.env.STORAGE_PATH = path.join(TEST_ROOT, 'static')
// 由每个用例自己设定，避免用例间互相污染
delete process.env.PUBLIC_BASE_URL
delete process.env.MEDIA_REF_MODE
delete process.env.MEDIA_INLINE_MAX_MB

const { mediaRefMode, inlineMaxBytes, resolveMediaRef, resolveMediaRefs, resolveOptionalMediaRefs } =
  await import('../src/services/media-ref')
const { signMediaPath, verifyMediaSignature, MEDIA_SIG_EXP, MEDIA_SIG_VALUE } = await import('../src/services/media-sign')
const { requireAuth } = await import('../src/middleware/auth')

const { Hono } = await import('hono')

// ─── 素材准备：static/uploads 下放一个假 mp3 ───────────────────────
const UPLOADS = path.join(TEST_ROOT, 'static', 'uploads')
fs.mkdirSync(UPLOADS, { recursive: true })

const SMALL_MP3 = path.join(UPLOADS, 'voice-small.mp3')
fs.writeFileSync(SMALL_MP3, Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x00]), Buffer.alloc(2048, 7)]))
const SMALL_REF = 'static/uploads/voice-small.mp3'

const BIG_MP3 = path.join(UPLOADS, 'voice-big.mp3')
fs.writeFileSync(BIG_MP3, Buffer.alloc(3 * 1024 * 1024, 3))
const BIG_REF = 'static/uploads/voice-big.mp3'

test.after(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.rmSync(`${TEST_DB}${suffix}`, { force: true }) } catch { /* 句柄未释放，留在临时目录 */ }
  }
  try { fs.rmSync(TEST_ROOT, { recursive: true, force: true }) } catch { /* 同上 */ }
})

// ─── 签名 ────────────────────────────────────────────────────────

test('签名往返一致；换路径、改签名、改过期时间都判为无效', () => {
  const signed = signMediaPath('/static/uploads/voice-small.mp3', 600)
  const url = new URL(signed, 'https://example.com')
  const exp = url.searchParams.get(MEDIA_SIG_EXP)!
  const sig = url.searchParams.get(MEDIA_SIG_VALUE)!

  assert.match(signed, /^\/static\/uploads\/voice-small\.mp3\?e=\d+&s=[0-9a-f]{64}$/)
  assert.equal(verifyMediaSignature('/static/uploads/voice-small.mp3', exp, sig), true)

  // 换一个路径复用签名 → 无效（签名绑定路径）
  assert.equal(verifyMediaSignature('/static/uploads/other.mp3', exp, sig), false)
  // 篡改签名体 → 无效（末位翻转，不能写成 replace(/.$/, '0')：末位本来就是 0 时是空操作）
  const tampered = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0')
  assert.notEqual(tampered, sig)
  assert.equal(verifyMediaSignature('/static/uploads/voice-small.mp3', exp, tampered), false)
  // 篡改过期时间 → 无效
  assert.equal(verifyMediaSignature('/static/uploads/voice-small.mp3', String(Number(exp) + 1), sig), false)
  // 缺参数 → 无效
  assert.equal(verifyMediaSignature('/static/uploads/voice-small.mp3', exp, null), false)
  assert.equal(verifyMediaSignature('/static/uploads/voice-small.mp3', undefined, sig), false)
})

test('签名过期即失效', () => {
  const signed = signMediaPath('/static/uploads/voice-small.mp3', -1)
  const url = new URL(signed, 'https://example.com')
  assert.equal(
    verifyMediaSignature('/static/uploads/voice-small.mp3', url.searchParams.get(MEDIA_SIG_EXP), url.searchParams.get(MEDIA_SIG_VALUE)),
    false,
  )
})

// ─── 解析路线 ────────────────────────────────────────────────────

test('本地联调（无 PUBLIC_BASE_URL）：auto 内联为 Base64 dataURL', () => {
  delete process.env.PUBLIC_BASE_URL
  assert.equal(mediaRefMode(), 'auto')

  const resolved = resolveMediaRef(SMALL_REF, 'audio', 1)!
  assert.match(resolved, /^data:audio\/mpeg;base64,/)
  // 内联内容必须与源文件逐字节一致（音频不做压缩转码）
  const b64 = resolved.slice('data:audio/mpeg;base64,'.length)
  assert.deepEqual(Buffer.from(b64, 'base64'), fs.readFileSync(SMALL_MP3))
})

test('音频 data URI 的格式 token 可切换为扩展名写法（上游认扩展名时用）', () => {
  delete process.env.PUBLIC_BASE_URL
  process.env.MEDIA_AUDIO_DATA_URI_FORMAT = 'extension'
  assert.match(resolveMediaRef(SMALL_REF, 'audio', 12)!, /^data:audio\/mp3;base64,/)
  delete process.env.MEDIA_AUDIO_DATA_URI_FORMAT

  // 默认仍是注册 MIME 子类型
  assert.match(resolveMediaRef(SMALL_REF, 'audio', 13)!, /^data:audio\/mpeg;base64,/)
})

test('生产（有 PUBLIC_BASE_URL）：auto 生成带签名的公网 URL', () => {
  process.env.PUBLIC_BASE_URL = 'https://drama.example.com/'
  const resolved = resolveMediaRef(SMALL_REF, 'audio', 2)!

  assert.ok(resolved.startsWith('https://drama.example.com/static/uploads/voice-small.mp3?'), resolved)
  const url = new URL(resolved)
  assert.equal(
    verifyMediaSignature('/static/uploads/voice-small.mp3', url.searchParams.get(MEDIA_SIG_EXP), url.searchParams.get(MEDIA_SIG_VALUE)),
    true,
  )
  delete process.env.PUBLIC_BASE_URL
})

test('超出内联上限：退回签名 URL；无公网地址时给出可操作的错误', () => {
  delete process.env.PUBLIC_BASE_URL
  process.env.MEDIA_INLINE_MAX_MB = '1'
  assert.equal(inlineMaxBytes(), 1024 * 1024)

  // 无 PUBLIC_BASE_URL 且超限 → 报错，且错误里要写清出路
  assert.throws(() => resolveMediaRef(BIG_REF, 'audio', 3), /超过内联上限[\s\S]*MEDIA_REF_MODE[\s\S]*PUBLIC_BASE_URL/)

  // 有 PUBLIC_BASE_URL → 自动退回公网 URL
  process.env.PUBLIC_BASE_URL = 'https://drama.example.com'
  const resolved = resolveMediaRef(BIG_REF, 'audio', 4)!
  assert.ok(resolved.startsWith('https://drama.example.com/static/uploads/voice-big.mp3?'), resolved)

  delete process.env.PUBLIC_BASE_URL
  delete process.env.MEDIA_INLINE_MAX_MB
})

test('MEDIA_REF_MODE=inline 时即使配了公网地址也内联', () => {
  process.env.PUBLIC_BASE_URL = 'https://drama.example.com'
  process.env.MEDIA_REF_MODE = 'inline'
  assert.match(resolveMediaRef(SMALL_REF, 'audio', 5)!, /^data:audio\/mpeg;base64,/)

  // public 模式则强制走 URL
  process.env.MEDIA_REF_MODE = 'public'
  assert.ok(resolveMediaRef(SMALL_REF, 'audio', 6)!.startsWith('https://drama.example.com/'))

  delete process.env.MEDIA_REF_MODE
  delete process.env.PUBLIC_BASE_URL
})

test('远程 URL 与 dataURL 直通，本地路径缺失时报错', () => {
  delete process.env.PUBLIC_BASE_URL
  assert.equal(resolveMediaRef('https://cdn.example.com/a.mp3', 'audio'), 'https://cdn.example.com/a.mp3')
  assert.equal(resolveMediaRef('data:audio/mpeg;base64,AAAA', 'audio'), 'data:audio/mpeg;base64,AAAA')
  assert.equal(resolveMediaRef('', 'audio'), null)
  assert.equal(resolveMediaRef(undefined, 'audio'), null)

  assert.throws(() => resolveMediaRef('static/uploads/missing.mp3', 'audio', 7), /读取失败|PUBLIC_BASE_URL/)
})

test('批量解析：严格版任一失败即抛错，宽松版跳过失败项', () => {
  delete process.env.PUBLIC_BASE_URL
  process.env.MEDIA_INLINE_MAX_MB = '1'

  // 严格：一条好一条超限 → 整批失败（分镜自带的参考音频就该让任务失败）
  assert.throws(() => resolveMediaRefs([SMALL_REF, BIG_REF], 'audio', 8), /超过内联上限/)

  // 宽松：跳过超限的那条，保留能用的（角色音色是可选增强）
  assert.deepEqual(resolveOptionalMediaRefs([SMALL_REF, BIG_REF], 'audio', 9), [resolveMediaRef(SMALL_REF, 'audio', 9)])

  delete process.env.MEDIA_INLINE_MAX_MB

  // 去重
  assert.equal(resolveMediaRefs([SMALL_REF, SMALL_REF], 'audio', 10).length, 1)
  assert.deepEqual(resolveMediaRefs([], 'audio', 11), [])
})

// ─── 守卫放行 ────────────────────────────────────────────────────

test('守卫：无 cookie 的未签名 /static 请求 401，带有效签名的放行', async () => {
  const app = new Hono()
  app.use('/static/*', requireAuth)
  app.use('/static/*', (c) => c.text('MP3_BYTES')) // 模拟 serveStatic

  const pathname = '/static/uploads/voice-small.mp3'

  const unsigned = await app.request(pathname)
  assert.equal(unsigned.status, 401)

  const badSig = await app.request(`${pathname}?e=99999999999&s=${'0'.repeat(64)}`)
  assert.equal(badSig.status, 401)

  const signed = await app.request(signMediaPath(pathname, 600))
  assert.equal(signed.status, 200)
  assert.equal(await signed.text(), 'MP3_BYTES')
})
