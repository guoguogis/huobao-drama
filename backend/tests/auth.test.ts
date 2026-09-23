import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// 这些环境变量必须在 import auth 之前设置：会话有效期与签名密钥都在模块加载时读取
// 测试库放系统临时目录：better-sqlite3 会一直持有句柄，Windows 下删不掉，
// 放仓库里会留下残留文件
const TEST_DB = path.join(os.tmpdir(), `huobao-auth-test-${process.pid}-${Date.now()}.sqlite3`)
const TEST_USER = 'test-user'
const TEST_PASSWORD = 'test-password-1234'
const TEST_SECRET = 'test-secret-for-unit-test'
const TEST_TTL_MS = 120

process.env.SQLITE_PATH = TEST_DB
process.env.AUTH_USERNAME = TEST_USER
process.env.AUTH_PASSWORD = TEST_PASSWORD
process.env.AUTH_SECRET = TEST_SECRET
process.env.AUTH_SESSION_TTL_MS = String(TEST_TTL_MS)

const auth = await import('../src/services/auth')

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// 尽力清理：连接未关闭时删除可能失败，不能因此把测试判为失败
test.after(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try { rmSync(`${TEST_DB}${suffix}`, { force: true }) } catch { /* 句柄未释放，留在系统临时目录即可 */ }
  }
})

test('口令哈希：往返一致，错误口令与非法格式一律不通过', () => {
  const stored = auth.hashPassword('correct horse battery staple')
  assert.match(stored, /^scrypt\$16384\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
  assert.equal(auth.verifyPassword('correct horse battery staple', stored), true)
  assert.equal(auth.verifyPassword('wrong', stored), false)
  assert.equal(auth.verifyPassword('x', ''), false)
  assert.equal(auth.verifyPassword('x', 'md5$deadbeef'), false)
  assert.equal(auth.verifyPassword('x', 'scrypt$16384$8$1$zz$zz'), false)
  // 同一口令两次哈希必须使用不同随机盐
  assert.notEqual(auth.hashPassword('same'), auth.hashPassword('same'))
})

test('播种：按环境变量写入账号，authenticate 同时校验用户名与口令', () => {
  auth.seedAuthAccount()
  assert.equal(auth.getAuthUsername(), TEST_USER)

  assert.equal(auth.authenticate(TEST_USER, TEST_PASSWORD), true)
  assert.equal(auth.authenticate(TEST_USER, 'wrong-password'), false)
  assert.equal(auth.authenticate('someone-else', TEST_PASSWORD), false)
  assert.equal(auth.authenticate(undefined, TEST_PASSWORD), false)
  assert.equal(auth.authenticate(TEST_USER, undefined), false)
  assert.equal(auth.authenticate('', ''), false)
})

test('会话：签发/验证往返；篡改签名、篡改用户名、改变世代均失效', () => {
  const { token, expiresAt } = auth.issueSession(TEST_USER)
  assert.ok(expiresAt > Date.now())
  assert.deepEqual(auth.verifySession(token), { username: TEST_USER, expiresAt })

  assert.equal(auth.verifySession(undefined), null)
  assert.equal(auth.verifySession(''), null)
  assert.equal(auth.verifySession('garbage'), null)
  assert.equal(auth.verifySession('a.b.c'), null)

  // 篡改签名
  const last = token.slice(-1)
  assert.equal(auth.verifySession(token.slice(0, -1) + (last === 'a' ? 'b' : 'a')), null)

  // 把用户名换成别人（载荷变了，签名对不上）
  const [, exp, epoch, sig] = token.split('.')
  const forgedUser = Buffer.from('someone-else', 'utf8').toString('base64url')
  assert.equal(auth.verifySession(`${forgedUser}.${exp}.${epoch}.${sig}`), null)

  // 把过期时间往后改（同样是篡改载荷）
  assert.equal(auth.verifySession(`${token.split('.')[0]}.${Date.now() + 60_000}.${epoch}.${sig}`), null)
})

test('会话过期后失效', async () => {
  const { token } = auth.issueSession(TEST_USER)
  assert.ok(auth.verifySession(token))
  await sleep(TEST_TTL_MS + 80)
  assert.equal(auth.verifySession(token), null)
})

test('改口令：校验当前口令与长度下限，成功后旧会话立即失效', () => {
  const NEW_PASSWORD = 'new-password-5678'
  const { token: oldToken } = auth.issueSession(TEST_USER)
  assert.ok(auth.verifySession(oldToken))

  assert.throws(() => auth.changePassword('wrong-current', NEW_PASSWORD), /当前口令不正确/)
  assert.throws(() => auth.changePassword(TEST_PASSWORD, 'short'), /至少 8 位/)
  assert.throws(() => auth.changePassword(TEST_PASSWORD, TEST_PASSWORD), /不能与当前口令相同/)

  auth.changePassword(TEST_PASSWORD, NEW_PASSWORD)

  assert.equal(auth.authenticate(TEST_USER, NEW_PASSWORD), true)
  assert.equal(auth.authenticate(TEST_USER, TEST_PASSWORD), false)
  // 会话世代递增 → 旧 token 立即失效，新签发的仍然有效
  assert.equal(auth.verifySession(oldToken), null)
  assert.ok(auth.verifySession(auth.issueSession(TEST_USER).token))
})

test('登录失败限流：达到阈值后进入封禁，成功登录清除计数', () => {
  const key = 'test-ip'
  assert.equal(auth.loginBlockRemainingMs(key), 0)

  for (let i = 0; i < auth.LOGIN_MAX_FAILS; i++) {
    assert.equal(auth.loginBlockRemainingMs(key), 0)
    auth.registerLoginFailure(key)
  }
  assert.ok(auth.loginBlockRemainingMs(key) > 0)

  auth.clearLoginFailures(key)
  assert.equal(auth.loginBlockRemainingMs(key), 0)
})
