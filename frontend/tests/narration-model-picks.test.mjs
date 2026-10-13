/**
 * 顶栏模型选择器：漫剧工作台与口播工作台共用同一套语义。
 *
 * 为什么值得测：
 * - 选择值会被直接送进后端适配器与 Agent 请求，key 格式一旦两边不一致，
 *   就会出现「顶栏换了模型但生成还是旧模型」这类难查问题；
 * - 存储键共用意味着"换过模型后到哪都是这个选择"，属于用户可感知的约定；
 * - 选中的模型与配置 id 必须**成对下发**（只给模型名会让后端用错配置）。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (p) => readFileSync(new URL(p, appRoot), 'utf8')
const util = readApp('utils/model-picks.ts')
const narration = readApp('views/narration/index.vue')
const drama = readApp('views/drama/episode.vue')
const api = readApp('composables/useApi.ts')

test('共用模块定义了 key 语义与存储键（唯一定义处）', () => {
  assert.match(util, /key = `\$\{c\.provider\}\/\$\{m\}@\$\{c\.id\}`/, 'key = provider/model@配置id')
  assert.match(util, /export const MODEL_STORE_KEYS = \{[\s\S]*?chat: 'huobao:model:chat'[\s\S]*?image: 'huobao:model:image'[\s\S]*?video: 'huobao:model:video'[\s\S]*?audio: 'huobao:model:audio'/)
  assert.match(util, /export function bareModelName/)
  assert.match(util, /export function ownerConfigId/)
  assert.match(util, /export function resolveEffectiveModel/)
  // 未选择时跟随优先级最高配置的首个模型（模型名与配置 id 一起给）
  assert.match(util, /const first = options\[0\][\s\S]*?return \{ model: first\.model, configId: first\.configId, key: first\.key \}/)
})

test('两个工作台都从共用模块取逻辑，不再各写一份', () => {
  for (const [name, src] of [['漫剧', drama], ['口播', narration]]) {
    assert.match(src, /from '~\/utils\/model-picks'/, `${name}工作台需引用共用模块`)
    assert.doesNotMatch(src, /^function bareModelName/m, `${name}工作台不得再本地定义 bareModelName`)
  }
  // 本地重复定义会让两边漂移：这里确保关键函数只出现在共用模块里
  assert.doesNotMatch(drama, /function collectModelOptions/)
  assert.doesNotMatch(narration, /function collectModelOptions/)
  assert.doesNotMatch(drama, /function ownerConfigId/)
  assert.doesNotMatch(narration, /function ownerConfigId/)
})

test('口播工作台顶栏有文本/图片/视频/音频 + 分辨率选择器', () => {
  const topbar = narration.slice(narration.indexOf('<header class="ns-topbar">'), narration.indexOf('</header>'))
  const selects = topbar.match(/<ModelSelect/g) || []
  assert.equal(selects.length, 5, `顶栏应有 5 个模型选择器（文本/图片/视频/音频/分辨率），实际 ${selects.length}`)
  for (const key of ['text', 'image', 'video', 'audio']) {
    assert.ok(topbar.includes(`t('common.serviceType.${key}')`), `缺少 ${key} 选择器标签`)
  }
  assert.ok(topbar.includes(`t('episode.topbar.resolution')`), '缺少分辨率选择器')
  assert.match(narration, /import ModelSelect from '~\/components\/ModelSelect\.vue'/)
  // 与漫剧工作台同一套 props（含配置名提示，避免同名模型混淆）
  assert.match(topbar, /:show-config="textModelMultiCfg"/)
  assert.match(topbar, /:show-config="imageModelMultiCfg"/)
  assert.match(topbar, /:show-config="videoModelMultiCfg"/)
  assert.match(topbar, /:show-config="audioModelMultiCfg"/)
})

test('选择会持久化且与漫剧互通（同一 localStorage 键）', () => {
  assert.match(narration, /readStoredModel\(MODEL_STORE_KEYS\.chat, 'huobao:model:rewrite'\)/)
  assert.match(narration, /readStoredModel\(MODEL_STORE_KEYS\.image\)/)
  assert.match(narration, /readStoredModel\(MODEL_STORE_KEYS\.video\)/)
  assert.match(narration, /readStoredModel\(MODEL_STORE_KEYS\.audio\)/)
  assert.match(narration, /watch\(modelRef, v => storeModel\(key, v\)\)/)
  // 漫剧侧同样走共用读写
  assert.match(drama, /readStoredModel\(MODEL_STORE_KEYS\.chat, 'huobao:model:rewrite'\)/)
  assert.match(drama, /watch\(modelRef, v => storeModel\(key, v\)\)/)
})

test('选中的模型真正作用到生成与 Agent 调用（模型+配置成对）', () => {
  // 文本模型 → 两个 Agent（只给模型名不够，必须带 config_id）
  assert.match(narration, /narrationAPI\.writeScripts\(dramaId, episodeId\.value,[\s\S]{0,200}?\{ model: textPick\.value\.model, configId: textPick\.value\.configId \}/)
  assert.match(narration, /narrationAPI\.planShots\(dramaId, episodeId\.value,[\s\S]{0,220}?\{ model: textPick\.value\.model, configId: textPick\.value\.configId \}/)
  // 图片/视频模型 → 生成任务
  assert.match(narration, /model: imagePick\.value\.model \|\| undefined,[\s\S]{0,60}?config_id: imagePick\.value\.configId/)
  assert.match(narration, /model: videoPick\.value\.model \|\| undefined,[\s\S]{0,60}?config_id: videoPick\.value\.configId/)
  // 分辨率 → 片段生成与合并导出共用同一个值
  assert.match(narration, /resolution: exportResolution\.value,/)
  assert.match(narration, /resolution: exportResolution\.value,\n\s*\}\)/)
  // Agent 客户端把 model/config_id 透传（可选，未选则回退默认）
  assert.match(api, /\.\.\.\(pick\?\.model \? \{ model: pick\.model \} : \{\}\),/)
  assert.match(api, /\.\.\.\(pick\?\.configId \? \{ config_id: pick\.configId \} : \{\}\),/)
})
