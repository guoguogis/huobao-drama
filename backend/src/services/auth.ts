/**
 * 登录鉴权 — 账号口令与会话
 *
 * 设计要点：
 * - 口令只以 scrypt 加盐哈希存在（app_settings.auth_password_hash），**源码与数据库里都没有明文**。
 *   内置默认账号在首次启动时播种；AUTH_USERNAME + AUTH_PASSWORD 环境变量同时设置时改为每次启动
 *   重新播种（部署侧以环境变量为准），可用它轮换口令而无需改代码。
 * - 会话用 HMAC 签名的 token 放 httpOnly cookie，服务端无状态：dev 下 tsx watch 频繁重启
 *   不会把用户踢下线，也无需新增会话表。
 * - 登录失败按来源限流，避免这个口令成为可暴力破解的入口。
 *
 * 威胁模型说明：内置口令写在源码里，任何拿到源码的人都知道它。它能挡住的是
 * 「拿到服务地址就能读配置密钥」这类访问，不能替代强口令 + 环境变量覆盖。
 */
import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { now } from '../utils/response.js'

const USERNAME_KEY = 'auth_username'
const PASSWORD_HASH_KEY = 'auth_password_hash'
const SECRET_KEY = 'auth_session_secret'
/** 会话世代：改口令时递增，使所有已签发会话立即失效（与签名密钥来源无关） */
const EPOCH_KEY = 'auth_session_epoch'

/** 内置默认账号（此处只有 scrypt 哈希，没有明文） */
const DEFAULT_USERNAME = 'guoguogis'
const DEFAULT_PASSWORD_HASH = 'scrypt$16384$8$1$68756f62616f2d64656661756c742d617574682d73616c742d7631$d7ba4905c76dd3ca1c9f540bdddeecb4263f64ff44a0efa3c3d2a6d9384cdc5028a711ceb1ba9e1250781192680dfbc28d79acdab175fd337807b4bc0bacb016'

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64

/** 会话有效期，默认 30 天；AUTH_SESSION_TTL_MS 可覆盖（部署可据此缩短） */
const SESSION_TTL_MS = (() => {
  const raw = Number(process.env.AUTH_SESSION_TTL_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : 30 * 24 * 60 * 60 * 1000
})()

export const SESSION_COOKIE = 'huobao_session'
export const MIN_PASSWORD_LENGTH = 8

// ─── app_settings 读写（better-sqlite3 同步 API）────────────────

function readSetting(key: string): string | null {
  const row = db.select().from(schema.appSettings)
    .where(eq(schema.appSettings.key, key))
    .get()
  return row?.value ?? null
}

function writeSetting(key: string, value: string) {
  db.insert(schema.appSettings)
    .values({ key, value, updatedAt: now() })
    .onConflictDoUpdate({
      target: schema.appSettings.key,
      set: { value, updatedAt: now() },
    })
    .run()
}

// ─── 口令哈希 ────────────────────────────────────────────────────

function serializeHash(password: string, salt: Buffer): string {
  const hash = crypto.scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`
}

/** 生成 `scrypt$N$r$p$salt$hash` 形式的口令哈希（每次调用都用新随机盐） */
export function hashPassword(password: string): string {
  return serializeHash(password, crypto.randomBytes(16))
}

/** 校验口令；格式非法或算法参数异常一律视为不匹配 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltHex, hashHex] = parts
  try {
    const expected = Buffer.from(hashHex, 'hex')
    if (!expected.length) return false
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })
    return crypto.timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

// ─── 账号播种与读取 ──────────────────────────────────────────────

/**
 * 启动时播种账号。幂等：
 * - AUTH_USERNAME + AUTH_PASSWORD 都设置 → 每次启动都以环境变量为准（部署侧可轮换口令）
 * - 否则仅在缺失时写入内置默认账号，之后以库里（用户改过的）为准
 */
export function seedAuthAccount() {
  const envUser = process.env.AUTH_USERNAME?.trim()
  const envPass = process.env.AUTH_PASSWORD

  if (envUser && envPass) {
    writeSetting(USERNAME_KEY, envUser)
    writeSetting(PASSWORD_HASH_KEY, hashPassword(envPass))
    console.log(`🔐 已按环境变量播种登录账号：${envUser}`)
    return
  }

  const missing: string[] = []
  if (!readSetting(USERNAME_KEY)) {
    writeSetting(USERNAME_KEY, DEFAULT_USERNAME)
    missing.push('用户名')
  }
  if (!readSetting(PASSWORD_HASH_KEY)) {
    writeSetting(PASSWORD_HASH_KEY, DEFAULT_PASSWORD_HASH)
    missing.push('口令')
  }
  if (missing.length) {
    console.log(`🔐 已初始化内置登录账号（${missing.join('、')}）；请尽快在「设置 → 账号安全」修改口令`)
  }
}

export function getAuthUsername(): string {
  return readSetting(USERNAME_KEY) || DEFAULT_USERNAME
}

/** 校验账号口令；账号名不匹配或口令错误均返回 false */
export function authenticate(username?: string | null, password?: string | null): boolean {
  const expectedUser = getAuthUsername()
  if (!username || !password) return false
  const stored = readSetting(PASSWORD_HASH_KEY) || DEFAULT_PASSWORD_HASH

  // 用户名与口令都走定长比较，避免按响应时间枚举用户名
  const userOk = safeEqualStr(username, expectedUser)
  const passOk = verifyPassword(password, stored)
  return userOk && passOk
}

function safeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  // 长度不同时 timingSafeEqual 会抛错，这里先各自哈希再比，长度恒等
  const ha = crypto.createHash('sha256').update(bufA).digest()
  const hb = crypto.createHash('sha256').update(bufB).digest()
  return crypto.timingSafeEqual(ha, hb)
}

/** 改口令：需验证当前口令；成功后递增会话世代，所有旧会话立即失效 */
export function changePassword(currentPassword: string, nextPassword: string): void {
  if (!authenticate(getAuthUsername(), currentPassword)) {
    throw new Error('当前口令不正确')
  }
  if (typeof nextPassword !== 'string' || nextPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`新口令至少 ${MIN_PASSWORD_LENGTH} 位`)
  }
  if (nextPassword === currentPassword) {
    throw new Error('新口令不能与当前口令相同')
  }
  writeSetting(PASSWORD_HASH_KEY, hashPassword(nextPassword))
  // 递增会话世代 → 其他设备/标签页上的旧会话立即失效（无论签名密钥来自环境变量还是库）
  writeSetting(EPOCH_KEY, String(currentEpoch() + 1))
}

// ─── 会话（HMAC 签名 token，无服务端状态）────────────────────────

/** 签名密钥：环境变量优先，其次库内持久化，最后随机生成并落库（重启后旧签名仍有效） */
export function authSecret(): string {
  const fromEnv = process.env.AUTH_SECRET?.trim()
  if (fromEnv) return fromEnv
  const existing = readSetting(SECRET_KEY)
  if (existing) return existing
  const generated = crypto.randomBytes(32).toString('hex')
  writeSetting(SECRET_KEY, generated)
  return generated
}

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', authSecret()).update(payload).digest('hex')
}

function currentEpoch(): number {
  const raw = Number(readSetting(EPOCH_KEY))
  return Number.isFinite(raw) && raw >= 0 ? raw : 0
}

/** 签发会话 token：`<base64url(用户名)>.<过期时间戳>.<会话世代>.<hmac>` */
export function issueSession(username: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const payload = `${Buffer.from(username, 'utf8').toString('base64url')}.${expiresAt}.${currentEpoch()}`
  return { token: `${payload}.${signPayload(payload)}`, expiresAt }
}

/** 校验会话 token：签名、有效期、会话世代、以及用户名是否仍是当前账号 */
export function verifySession(token?: string | null): { username: string; expiresAt: number } | null {
  if (!token) return null
  const idx = token.lastIndexOf('.')
  if (idx <= 0) return null

  const payload = token.slice(0, idx)
  const signature = token.slice(idx + 1)
  const expected = signPayload(payload)
  if (signature.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'))) return null

  const [usernameB64, expiresRaw, epochRaw] = payload.split('.')
  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null
  // 改过口令后旧 token 的世代会落后，直接判为失效
  if (Number(epochRaw) !== currentEpoch()) return null

  const username = Buffer.from(usernameB64 || '', 'base64url').toString('utf8')
  if (!username || username !== getAuthUsername()) return null
  return { username, expiresAt }
}

export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000)

// ─── 登录失败限流（进程内存，够用且不引入额外表）─────────────────

const MAX_FAILS = 5
const FAIL_WINDOW_MS = 5 * 60 * 1000
const BLOCK_MS = 5 * 60 * 1000
const loginAttempts = new Map<string, { fails: number; firstAt: number; blockedUntil: number }>()

/** 返回剩余封禁毫秒数；0 表示未封禁 */
export function loginBlockRemainingMs(key: string): number {
  const record = loginAttempts.get(key)
  if (!record) return 0
  const remaining = record.blockedUntil - Date.now()
  if (remaining <= 0) return 0
  return remaining
}

export function registerLoginFailure(key: string) {
  const nowMs = Date.now()
  const record = loginAttempts.get(key)
  if (!record || nowMs - record.firstAt > FAIL_WINDOW_MS) {
    loginAttempts.set(key, { fails: 1, firstAt: nowMs, blockedUntil: 0 })
    return
  }
  record.fails += 1
  if (record.fails >= MAX_FAILS) {
    record.blockedUntil = nowMs + BLOCK_MS
    record.fails = 0
    record.firstAt = nowMs
  }
}

export function clearLoginFailures(key: string) {
  loginAttempts.delete(key)
}

export const LOGIN_MAX_FAILS = MAX_FAILS
