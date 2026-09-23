/**
 * 登录鉴权路由 — 登录 / 登出 / 会话探测 / 修改口令
 */
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Context } from 'hono'
import { success, badRequest } from '../utils/response.js'
import { logTaskProgress, logTaskWarn } from '../utils/task-logger.js'
import {
  MIN_PASSWORD_LENGTH,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  authenticate,
  changePassword,
  clearLoginFailures,
  getAuthUsername,
  issueSession,
  loginBlockRemainingMs,
  registerLoginFailure,
  verifySession,
} from '../services/auth.js'

const app = new Hono()

/** 限流键：优先取反向代理透出的真实来源地址 */
function clientKey(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return c.req.header('x-real-ip') || 'local'
}

function blockedResponse(c: Context, remainingMs: number) {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000))
  return c.json({ code: 429, message: `登录失败次数过多，请 ${minutes} 分钟后再试` }, 429)
}

/**
 * 会话 cookie：httpOnly + SameSite=Lax。
 * 不加 Secure —— 本项目默认以 http 在本机/内网运行，加了会导致 cookie 根本不被保存。
 */
function cookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax' as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}

// POST /auth/login
app.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({} as any))
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  const key = clientKey(c)
  const remaining = loginBlockRemainingMs(key)
  if (remaining > 0) return blockedResponse(c, remaining)

  if (!authenticate(username, password)) {
    registerLoginFailure(key)
    logTaskWarn('Auth', 'login-failed', { username, ip: key })
    return c.json({ code: 401, message: '用户名或口令不正确' }, 401)
  }

  clearLoginFailures(key)
  const { token, expiresAt } = issueSession(username)
  setCookie(c, SESSION_COOKIE, token, cookieOptions())
  logTaskProgress('Auth', 'login-ok', { username, expiresAt })
  return success(c, { username, expires_at: new Date(expiresAt).toISOString() })
})

// POST /auth/logout
app.post('/logout', (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
  return success(c, { ok: true })
})

// GET /auth/session — 前端启动时判断登录态（免登录可访问）
app.get('/session', (c) => {
  const session = verifySession(getCookie(c, SESSION_COOKIE))
  // 口令长度要求随会话返回，避免前端硬编码与后端漂移
  if (!session) return success(c, { authenticated: false, min_password_length: MIN_PASSWORD_LENGTH })
  return success(c, {
    authenticated: true,
    username: session.username,
    expires_at: new Date(session.expiresAt).toISOString(),
    min_password_length: MIN_PASSWORD_LENGTH,
  })
})

// PUT /auth/password — 需已登录，且必须验证当前口令
app.put('/password', async (c) => {
  const body = await c.req.json().catch(() => ({} as any))
  const current = typeof body?.current_password === 'string' ? body.current_password : ''
  const next = typeof body?.new_password === 'string' ? body.new_password : ''

  const key = clientKey(c)
  const remaining = loginBlockRemainingMs(key)
  if (remaining > 0) return blockedResponse(c, remaining)

  try {
    changePassword(current, next)
  } catch (err: any) {
    registerLoginFailure(key)
    logTaskWarn('Auth', 'password-change-failed', { ip: key, error: err?.message })
    return badRequest(c, err?.message || `修改口令失败（新口令至少 ${MIN_PASSWORD_LENGTH} 位）`)
  }

  clearLoginFailures(key)
  // 改密会轮换会话签名密钥，旧 cookie 随即失效 → 用当前账号重新签发一张
  const username = getAuthUsername()
  const { token } = issueSession(username)
  setCookie(c, SESSION_COOKIE, token, cookieOptions())
  logTaskProgress('Auth', 'password-changed', { username })
  return success(c, { ok: true, username })
})

export default app
