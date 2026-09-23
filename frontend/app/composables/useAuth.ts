/**
 * 登录态 — 模块级单例（与 useTheme 的做法一致，跨组件共享同一份状态）。
 *
 * 会话是 httpOnly cookie，前端读不到也不该读到；登录态只能向后端 /auth/session 询问。
 * 因此这里维护一个 checked 标志：全局路由守卫只在首次进入时问一次，避免每次跳转都打接口。
 */
import { readonly, ref } from 'vue'

const AUTH_BASE = '/api/v1/auth'

const username = ref('')
const authenticated = ref(false)
/** 是否已向后端确认过登录态 */
const checked = ref(false)
/** 口令长度下限，由后端下发，避免前端硬编码漂移 */
const minPasswordLength = ref(8)
/** 防止并发 401 触发多次跳转 */
let redirecting = false

async function post<T = any>(path: string, body?: any): Promise<T> {
  const resp = await fetch(`${AUTH_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || (json.code && json.code >= 400)) {
    throw new Error(json.message || `${resp.status}`)
  }
  return (json.data ?? json) as T
}

/** 询问后端当前登录态；网络异常按未登录处理（登录页会给出提示） */
async function refresh(): Promise<boolean> {
  try {
    const resp = await fetch(`${AUTH_BASE}/session`)
    const json = await resp.json()
    const data = json?.data ?? json
    authenticated.value = !!data?.authenticated
    username.value = data?.username || ''
    if (Number.isFinite(data?.min_password_length)) minPasswordLength.value = data.min_password_length
  } catch {
    authenticated.value = false
    username.value = ''
  } finally {
    checked.value = true
  }
  return authenticated.value
}

async function login(user: string, password: string): Promise<void> {
  const data = await post<{ username: string }>('/login', { username: user, password })
  authenticated.value = true
  checked.value = true
  username.value = data?.username || user
}

async function logout(): Promise<void> {
  try {
    await post('/logout')
  } finally {
    authenticated.value = false
    username.value = ''
    checked.value = true
  }
}

/**
 * 会话失效（接口返回 401）时统一收口：清状态并整页跳登录页。
 * 用整页跳转而非路由跳转，是为了把内存里的业务状态一并丢掉，避免残留。
 */
function handleSessionExpired() {
  authenticated.value = false
  username.value = ''
  checked.value = true
  if (redirecting || typeof window === 'undefined') return
  if (window.location.pathname === '/login') return
  redirecting = true
  window.location.replace('/login')
}

export function useAuth() {
  return {
    username: readonly(username),
    authenticated: readonly(authenticated),
    checked: readonly(checked),
    minPasswordLength: readonly(minPasswordLength),
    refresh,
    login,
    logout,
    handleSessionExpired,
  }
}
