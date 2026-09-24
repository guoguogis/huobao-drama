/**
 * 表头「项目 / 设置」= 顶部菜单栏（Tab 风格）。
 *
 * 需求：两项分开平铺、去掉一体化胶囊轨道，选中项用底部指示条，hover 有浅背景。
 * 同时必须保留 .nav-link 类名与 href —— 项目页的引导步骤用 .nav-link[href="/settings"] 定位。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (path) => readFileSync(new URL(path, appRoot), 'utf8')
const layout = readApp('layouts/default.vue')
const indexPage = readApp('pages/index.vue')

test('顶部菜单是菜单栏（Tab）而不是一体化胶囊分段', () => {
  // 轨道不再有底色/内边距
  assert.doesNotMatch(layout, /\.header-nav \{[\s\S]{0,200}background: var\(--overlay-track\)/)
  assert.doesNotMatch(layout, /\.header-nav \{[\s\S]{0,200}padding: 3px/)
  // 菜单项撑满表头高度，选中项用底部指示条
  assert.match(layout, /\.header-nav \{[\s\S]{0,200}align-self: stretch;/)
  assert.match(layout, /\.nav-link\.active::after \{[\s\S]{0,240}bottom: 0;/)
  assert.match(layout, /\.nav-link\.active::after \{[\s\S]{0,260}background: var\(--accent-gradient\);/)
  // hover 有浅背景；旧的胶囊选中底（--seg-active-bg）已不再用于导航
  assert.match(layout, /\.nav-link:hover \{[\s\S]{0,140}background: var\(--bg-hover\);/)
  assert.doesNotMatch(layout, /\.nav-link\.active \{[\s\S]{0,120}--seg-active-bg/)
})

test('菜单项的类名与 href 保持不变（引导步骤按 href 定位）', () => {
  assert.match(layout, /<NuxtLink to="\/" class="nav-link"/)
  assert.match(layout, /<NuxtLink to="\/settings" class="nav-link"/)
  // 键盘可达性样式保留
  assert.match(layout, /\.nav-link:focus-visible \{/)
  // 项目页引导的确在找这个选择器，改名会静默让该步骤失效
  assert.match(indexPage, /\.nav-link\[href="\/settings"\]/)
})

test('菜单项只有文字，不带图标；顶栏右上角也没有 GitHub 入口', () => {
  // 菜单项内只有文案 span，没有 lucide 图标组件
  assert.match(layout, /class="nav-link"[^>]*>\s*\r?\n\s*<span>\{\{ t\('layout\.nav\.projects'\) \}\}<\/span>/)
  assert.match(layout, /class="nav-link"[^>]*>\s*\r?\n\s*<span>\{\{ t\('layout\.nav\.settings'\) \}\}<\/span>/)
  const navBlock = layout.slice(layout.indexOf('class="header-nav"'), layout.indexOf('</nav>'))
  assert.doesNotMatch(navBlock, /<svg/)
  assert.doesNotMatch(navBlock, /:size=/)
  // 顶栏右侧只剩主题 / 语言 / 账号
  assert.doesNotMatch(layout, /github-link/)
  assert.doesNotMatch(layout, /<Github/)
})
