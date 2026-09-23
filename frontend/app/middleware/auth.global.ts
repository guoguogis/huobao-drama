/**
 * 全局登录守卫：未登录一律送到 /login。
 * 登录态存在 httpOnly cookie 里，前端只能向后端确认；useAuth 内部用 checked 缓存，
 * 同一会话内只问一次，避免每次路由跳转都打接口。
 */
import { useAuth } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  // 登录页自身放行，否则会无限重定向
  if (to.path === '/login') return

  const { authenticated, checked, refresh } = useAuth()
  if (!checked.value) await refresh()

  if (!authenticated.value) {
    return navigateTo({
      path: '/login',
      query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
    })
  }
})
