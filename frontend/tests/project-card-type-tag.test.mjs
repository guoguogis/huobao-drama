/**
 * 项目卡片必须显示「项目类型」标签。
 *
 * 背景：项目类型决定进入哪个工作台（漫剧 / 口播视频），此前卡片上完全没有类型信息，
 * 用户看到两张卡片无法区分，也从列表里看不出「点进去会到哪儿」。
 * 另外口播项目没有角色/场景概念，沿用漫剧口径会显示成「0 角色 · 0 场景」，是噪音。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (p) => readFileSync(new URL(p, appRoot), 'utf8')
const index = readApp('pages/index.vue')

test('卡片 meta 行有类型标签，按 project_type 区分文案与配色', () => {
  assert.match(index, /class="tag type-tag"/, '需要类型标签样式挂点')
  assert.match(index, /:class="d\.project_type === 'narration' \? 'tag-accent' : 'tag-info'"/, '两种类型用不同配色区分')
  assert.match(index, /\{\{ typeLabel\(d\) \}\}/, '文案走 typeLabel')
  assert.match(index, /function typeLabel\(d\) \{[\s\S]{0,160}?t\('index\.createDialog\.typeNarration'\)[\s\S]{0,80}?t\('index\.createDialog\.typeDrama'\)/,
    '复用创建弹框里的同一组类型文案，避免两处措辞漂移')
  // tooltip 说明该类型会进哪个工作台
  assert.match(index, /:title="d\.project_type === 'narration' \? t\('index\.createDialog\.typeNarrationDesc'\) : t\('index\.createDialog\.typeDramaDesc'\)"/)
})

test('口播项目不再显示「0 角色 · 0 场景」，改显示目标时长', () => {
  assert.match(index, /\{\{ metaLabel\(d\) \}\}/, '元信息走 metaLabel')
  assert.match(index, /function metaLabel\(d\) \{[\s\S]{0,220}?if \(d\?\.project_type === 'narration'\)/)
  assert.match(index, /t\('index\.narrationMeta', \{ sec, eps: d\.episodes\?\.length \|\| 0 \}\)/)
  assert.match(index, /t\('index\.narrationMetaNoDuration', \{ eps: d\.episodes\?\.length \|\| 0 \}\)/)
  assert.match(index, /function narrationTargetSec\(d\)/)
  // 坏 JSON 不能让项目列表崩
  assert.match(index, /catch \{\s*return null\s*\}/)
  assert.match(index, /return t\('index\.projectMeta', \{ chars: d\.characters\?\.length \|\| 0, scenes: d\.scenes\?\.length \|\| 0, eps: d\.episodes\?\.length \|\| 0 \}\)/)
})

test('类型标签有独立的紧凑样式，且不抢风格标签的强调色', () => {
  assert.match(index, /\.type-tag \{ padding: 2px 8px; font-size: 10\.5px; font-weight: 600;/)
  assert.match(index, /\.tag-plain \{ background: var\(--bg-hover\); color: var\(--text-2\); \}/)
  // 风格标签改用中性配色（强调色留给类型标签）
  assert.match(index, /<span v-if="d\.style" class="tag tag-plain">\{\{ styleLabel\(d\.style\) \}\}<\/span>/)
})

test('类型与元信息文案四种语言齐全（类型文案复用创建弹框键）', () => {
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const idx = JSON.parse(readApp(`locales/${lang}.json`)).index
    for (const key of ['narrationMeta', 'narrationMetaNoDuration', 'projectMeta']) {
      assert.equal(typeof idx[key], 'string', `${lang} 缺 index.${key}`)
      assert.ok(idx[key].trim().length > 0, `${lang} 的 ${key} 不能为空`)
    }
    assert.ok(idx.narrationMeta.includes('{sec}') && idx.narrationMeta.includes('{eps}'), `${lang} narrationMeta 占位符不全`)
    assert.ok(idx.narrationMetaNoDuration.includes('{eps}'), `${lang} narrationMetaNoDuration 需要 {eps}`)
    for (const key of ['typeDrama', 'typeNarration', 'typeDramaDesc', 'typeNarrationDesc']) {
      assert.ok(idx.createDialog?.[key], `${lang} 缺 index.createDialog.${key}（类型标签文案）`)
    }
  }
})
