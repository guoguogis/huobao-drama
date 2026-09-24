/**
 * 分镜列表标题不能直接用 description。
 *
 * 拆解出来的分镜描述以「【镜头1】…【镜头2】…」的**子镜头标记**开头，每个分镜都从
 * 「【镜头1】」起头 —— 直接把 description 当标题，列表里就会每条都看起来叫「镜头1」。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (path) => readFileSync(new URL(path, appRoot), 'utf8')
const episode = readApp('views/drama/episode.vue')

test('列表标题优先分镜自身 title，退回描述时剥掉子镜头标记', () => {
  assert.match(episode, /function sbName\(sb\) \{/)
  assert.match(episode, /const title = String\(sb\?\.title \|\| ''\)\.trim\(\)/)
  assert.match(episode, /if \(title\) return title/)
  // 退回 description 时剥掉开头的「【…】」标记
  assert.match(episode, /sb\?\.description \|\| ''\)\.trim\(\)\.replace\(/)
  assert.match(episode, /【\[\^】\]\{1,10\}】/)
})

test('标签带镜号：分镜1：xxx（没有名字时退回分镜 #1）', () => {
  assert.match(episode, /function sbLabel\(sb, n = 0\) \{/)
  assert.match(episode, /const num = n \|\| sbNumber\(sb\) \|\| 1/)
  assert.match(episode, /return name \? t\('episode\.sb\.shotLabel', \{ n: num, name \}\) : t\('episode\.sb\.shotN', \{ n: num \}\)/)
  // 四语言都要有带编号的标签文案
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const locale = JSON.parse(readApp(`locales/${lang}.json`))
    const label = locale.episode.sb.shotLabel
    assert.equal(typeof label, 'string', `${lang} 缺 episode.sb.shotLabel`)
    assert.ok(label.includes('{n}') && label.includes('{name}'), `${lang} 的 shotLabel 需要 {n} 与 {name}`)
  }
})

test('视频列表用带编号标签；导出列表行首已有 #NN 编号块，标题只用名称', () => {
  // 视频制作列表
  assert.match(episode, /title: sbLabel\(sb, index \+ 1\),/)
  assert.doesNotMatch(episode, /title: sb\.description \|\|/)
  // 拼接导出列表（行首 .exp2-index 已经是 #NN）
  assert.match(episode, /class="exp2-title truncate" :title="sb\.description \|\| ''">\{\{ sbName\(sb\) \|\| t\('episode\.sb\.shotN', \{ n: sbNumber\(sb\) \}\) \}\}/)
  // 旧写法（描述优先且未剥标记）已移除
  assert.doesNotMatch(episode, /sb\.description \|\| sb\.title \|\| '—'/)
})
