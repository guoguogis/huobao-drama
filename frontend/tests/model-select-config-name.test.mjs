/**
 * 顶部模型选择器：弹框里必须显示「配置名称」，用于区分不同来源的同名模型。
 *
 * 背景：同一模型可能来自不同配置（官方直连 / 私有中转 / 不同套餐），
 * 模型名完全一样；只显示模型名时无法判断当前用的是哪一份配置。
 * 另外选项原本按 provider+model 去重，导致同厂商的第二份配置的同一模型根本选不到。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (path) => readFileSync(new URL(path, appRoot), 'utf8')
const modelSelect = readApp('components/ModelSelect.vue')
const episode = readApp('views/drama/episode.vue')

test('模型选择弹框在列表项里可见地展示配置名称（不只是 tooltip）', () => {
  // 列表项内联渲染配置名
  assert.match(modelSelect, /class="model-select-option-config"/)
  assert.match(modelSelect, /<span v-if="configLabel\(o\)" class="model-select-option-config">\{\{ configLabel\(o\) \}\}<\/span>/)
  // 默认项也标出来源配置（默认 = 首个选项）
  assert.match(modelSelect, /v-if="defaultConfigLabel" class="model-select-option-config"/)
  assert.match(modelSelect, /const defaultConfigLabel = computed\(\(\) => configLabel\(props\.options\[0\]\)\)/)
  // 触发按钮上补 tooltip，选中态也能看出配置
  assert.match(modelSelect, /function optionTitle\(o\) \{/)
  assert.match(modelSelect, /:title="optionTitle\(o\)"/)
  assert.match(modelSelect, /const triggerTitle = computed\(/)
  // 样式：与模型名并排、超长省略
  assert.match(modelSelect, /\.model-select-option-config \{[\s\S]{0,260}text-overflow: ellipsis;/)
})

test('配置名取值：有名字显示名字；未命名时仅在多配置场景退回厂商名', () => {
  assert.match(modelSelect, /function configLabel\(o\) \{/)
  assert.match(modelSelect, /return o\.configName \|\| \(props\.showConfig \? o\.provider : ''\) \|\| ''/)
})

test('同一模型来自不同配置时不再被去重吞掉（否则第二份配置选不到）', () => {
  // 选项键带上配置 id
  assert.match(episode, /const key = `\$\{c\.provider\}\/\$\{m\}@\$\{c\.id\}`/)
  // 旧键（provider/model）已不作为选项键
  assert.doesNotMatch(episode, /const key = `\$\{c\.provider\}\/\$\{m\}`/)
  // 配置名带上（空名字保留空串，由 ModelSelect 决定是否退回厂商名）
  assert.match(episode, /configName: c\.name \|\| ''/)
})

test('复合键解析：裸模型名去掉 @配置id，配置 id 兼容旧存储值', () => {
  // 后端只认裸模型名，前缀与后缀都要剥掉
  assert.match(episode, /const at = key\.indexOf\('@'\)/)
  assert.match(episode, /const bare = at >= 0 \? key\.slice\(0, at\) : key/)
  assert.match(episode, /const i = bare\.indexOf\('\/'\)/)
  // 旧值 'provider/model' 仍能解析出配置 id
  assert.match(episode, /const legacy = options\.find\(o => `\$\{o\.provider\}\/\$\{o\.model\}` === key\)/)
  assert.match(episode, /return legacy\?\.configId \|\| undefined/)
  // 持久化的旧值在配置加载后升级为带配置 id 的键，而不是被判失效
  assert.match(episode, /const legacy = opts\.find\(o => o\.model === modelRef\.value\)\r?\n\s+\|\| opts\.find\(o => `\$\{o\.provider\}\/\$\{o\.model\}` === modelRef\.value\)/)
  assert.match(episode, /modelRef\.value = legacy \? legacy\.key : ''/)
})
