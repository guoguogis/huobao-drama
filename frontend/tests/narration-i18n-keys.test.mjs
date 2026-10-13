/**
 * 口播工作台的 i18n 键完整性。
 *
 * 真实事故：片段面板新增「重新生成全部」按钮时用了 `narration.clips.regenerateAll`，
 * 但该键并不存在——vue-i18n 不报错，界面直接显示成原始键名
 * （按钮上写着 `narration.clips.regenerateAll`），只能靠人眼看出来。
 * 这类漏键必须由测试兜住：扫描视图里所有 t('...') 键，逐个校验四语言都有、且占位符一致。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (p) => readFileSync(new URL(p, appRoot), 'utf8')
const view = readApp('views/narration/index.vue')
const LANGS = ['zh', 'en', 'ja', 'ko']
const locales = Object.fromEntries(LANGS.map(l => [l, JSON.parse(readApp(`locales/${l}.json`))]))

/** 视图里出现的静态键（`t('a.b')`）；动态拼接的（模板字符串）跳过 */
function collectKeys(src) {
  const keys = new Set()
  for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) keys.add(m[1])
  return [...keys].sort()
}

const pick = (obj, path) => path.split('.').reduce((acc, seg) => (acc == null ? acc : acc[seg]), obj)
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',')

test('口播工作台视图里的每个 t() 键都必须存在于四种语言', () => {
  const keys = collectKeys(view)
  assert.ok(keys.length > 40, `扫描到的键太少（${keys.length}），正则可能失配`)
  const missing = []
  for (const key of keys) {
    for (const lang of LANGS) {
      if (typeof pick(locales[lang], key) !== 'string') missing.push(`${lang}:${key}`)
    }
  }
  assert.deepEqual(missing, [], `缺失的文案键（界面会直接显示原始键名）：\n${missing.join('\n')}`)
})

test('同一键在四种语言里的占位符必须一致（否则插值丢失或显示成 {x}）', () => {
  const bad = []
  for (const key of collectKeys(view)) {
    const zh = pick(locales.zh, key)
    if (typeof zh !== 'string') continue
    const want = placeholders(zh)
    for (const lang of LANGS) {
      const val = pick(locales[lang], key)
      if (typeof val === 'string' && placeholders(val) !== want) {
        bad.push(`${key} → zh{${want}} vs ${lang}{${placeholders(val)}}`)
      }
    }
  }
  assert.deepEqual(bad, [], `占位符不一致：\n${bad.join('\n')}`)
})

test('状态类文案（narration.state.*）四种语言齐全', () => {
  for (const lang of LANGS) {
    const st = locales[lang].narration?.state
    assert.ok(st, `${lang} 缺 narration.state`)
    for (const key of ['pending', 'generating', 'done', 'failed']) {
      assert.equal(typeof st[key], 'string', `${lang} 缺 narration.state.${key}`)
    }
  }
})
