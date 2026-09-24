import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (path) => readFileSync(new URL(path, appRoot), 'utf8')

const layout = readApp('layouts/default.vue')
const menu = readApp('components/AccountMenu.vue')

test('顶栏语言切换器之后渲染账号头像组件', () => {
  assert.match(layout, /<AccountMenu\s*\/>/)
  // 顺序：主题 → 语言 → 账号（需求：语言切换组件之后）
  const order = ['ThemeToggle', 'LocaleSwitcher', 'AccountMenu']
    .map((token) => layout.indexOf(token))
  assert.ok(order.every((i) => i >= 0), '三个入口都要在顶栏里')
  assert.deepEqual(order, [...order].sort((a, b) => a - b), '顺序必须是 主题 → 语言 → 账号')
  // 顶栏的 GitHub 图标已按需求移除；界面上不再有任何 GitHub 入口
  assert.doesNotMatch(layout, /github-link/)
  assert.doesNotMatch(layout, /github\.com/)
  assert.doesNotMatch(layout, /Github/)
})

test('账号组件复用全站菜单原语，并把触发方式扩展为 hover', () => {
  // 面板定位/动效/Esc/外部点击关闭统一由 AppMenu(usePopover) 负责
  assert.match(menu, /<AppMenu v-model:open="open" placement="bottom-end"/)
  assert.match(menu, /<AppMenuItem/)

  // hover 与键盘聚焦都能展开
  assert.match(menu, /@mouseenter="openMenu"/)
  assert.match(menu, /@mouseleave="scheduleClose"/)
  assert.match(menu, /@focus="openMenu"/)
  assert.match(menu, /@blur="scheduleClose"/)

  // 面板 Teleport 到 body，不是触发器后代：必须延迟关闭，并在指针进入面板时撤销
  assert.match(menu, /CLOSE_DELAY_MS/)
  assert.match(menu, /closeTimer = setTimeout/)
  assert.match(menu, /@mouseenter="cancelClose" @mouseleave="scheduleClose"/)
  assert.match(menu, /function cancelClose\(\)/)

  // 可达性：按钮语义 + 展开态
  assert.match(menu, /aria-haspopup="menu"/)
  assert.match(menu, /:aria-expanded="open"/)
  assert.match(menu, /:aria-label="t\('components\.accountMenu\.label'\)"/)
})

test('菜单项包含退出登录与修改密码，退出为危险项', () => {
  assert.match(menu, /@click="openPasswordDialog"/)
  assert.match(menu, /t\('settings\.account\.changePassword'\)/)
  assert.match(menu, /<AppMenuItem danger @click="doLogout">/)
  assert.match(menu, /t\('settings\.account\.logout'\)/)
  assert.match(menu, /t\('settings\.account\.currentUser'\)/)
})

test('修改口令走真实接口，带长度下限与两次一致性校验', () => {
  assert.match(menu, /authAPI\.changePassword\(pwForm\.current, pwForm\.next\)/)
  assert.match(menu, /minPasswordLength\.value/)
  assert.match(menu, /pwForm\.next === pwForm\.confirm/)
  assert.match(menu, /t\('components\.accountMenu\.mismatch'\)/)
  // 失败提示与设置页同口径
  assert.match(menu, /toastError\(e, \{ fallback: 'settings\.account\.changeFailed' \}\)/)
  assert.match(menu, /toast\.success\(t\('settings\.account\.changeSuccess'\)\)/)
})

test('退出登录后跳登录页并替换历史记录', () => {
  assert.match(menu, /await logout\(\)/)
  assert.match(menu, /navigateTo\('\/login', \{ replace: true \}\)/)
  assert.match(menu, /const \{ username, minPasswordLength, logout \} = useAuth\(\)/)
})

test('弹窗复用全局 dialog 骨架，Esc 可关闭且保存中不可关闭', () => {
  assert.match(menu, /<div v-if="pwOpen" class="overlay" @click\.self="closePasswordDialog">/)
  assert.match(menu, /class="dialog account-pw-dialog"/)
  assert.match(menu, /role="dialog"/)
  assert.match(menu, /aria-modal="true"/)
  assert.match(menu, /e\.key === 'Escape'/)
  assert.match(menu, /if \(pwSaving\.value\) return/)
  // 打开后聚焦第一个输入框
  assert.match(menu, /nextTick\(\(\) => currentInput\.value\?\.focus\?\.\(\)\)/)
  // 关闭时移除全局监听，避免泄漏
  assert.match(menu, /removeEventListener\('keydown', onDialogKeydown\)/)
})

test('头像用账号首字母，不引入额外图片资源', () => {
  assert.match(menu, /charAt\(0\)\.toUpperCase\(\)/)
  assert.match(menu, /class="account-avatar"/)
  assert.doesNotMatch(menu, /<img/)
})
