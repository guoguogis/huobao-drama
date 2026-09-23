/**
 * 登录守卫中间件。
 *
 * 挂载点（index.ts）：`/api/v1/*` 与 `/static/*` —— 只保护接口与用户生成的媒体，
 * **不保护前端页面资源**，否则登录页自身都加载不出来。
 * 放行：登录相关接口（登录/会话探测）与 /api/v1/health（桌面版主进程靠它探活）。
 *
 * 会话走 httpOnly cookie，同源请求自动携带，因此 <img>/<video> 读 /static 不受影响。
 * 上游厂商（服务器身份、无 cookie）则由后端签发带过期 HMAC 的素材 URL 放行，
 * 见 services/media-sign.ts —— 参考视频/音频必须让上游按公网 URL 拉取。
 * 必须注册在 cors 之后、且在被保护的路由之前：预检 OPTIONS 由 cors 直接短路返回，
 * 而 Hono 的处理器链按注册顺序执行，守卫排在路由之后就不会生效。
 */
import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { SESSION_COOKIE, verifySession } from '../services/auth.js'
import { MEDIA_SIG_EXP, MEDIA_SIG_VALUE, verifyMediaSignature } from '../services/media-sign.js'

/** 免登录路径（精确匹配） */
const PUBLIC_PATHS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/session',
  '/api/v1/health',
])

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const path = c.req.path
  if (PUBLIC_PATHS.has(path)) return next()

  if (verifySession(getCookie(c, SESSION_COOKIE))) return next()

  // 静态资源：浏览器带 cookie；上游厂商是服务器身份（无 cookie），
  // 只能靠后端签发的带过期签名 URL 放行（见 services/media-sign.ts）
  if (path.startsWith('/static/')) {
    if (verifyMediaSignature(path, c.req.query(MEDIA_SIG_EXP), c.req.query(MEDIA_SIG_VALUE))) return next()
    return c.text('Unauthorized', 401)
  }

  return c.json({ code: 401, message: '未登录或登录已过期，请重新登录' }, 401)
}
