import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')

// 工作台是 app/views/drama/episode.vue（路由由 nuxt.config 的 pages:extend 手动注册，
// 没有 app/pages/drama/** 实体文件——此前这里指向不存在的路径，整个文件在加载时就抛错）
const page = read('app/views/drama/episode.vue')
const component = read('app/components/ModelSelect.vue')
const useAgent = read('app/composables/useAgent.ts')
const useApi = read('app/composables/useApi.ts')

test('workbench offers model selectors for rewrite, image and video generation', () => {
  // 三个选择器（自定义 ModelSelect 弹窗组件，非原生 select）
  assert.match(page, /<ModelSelect/)
  assert.match(page, /v-model="chatModel"/)
  assert.match(page, /v-model="imageModel"/)
  assert.match(page, /v-model="videoModel"/)
  assert.doesNotMatch(page, /<select v-model="chatModel"/)
  // 选项汇总该类型全部启用配置的模型，API 返回的 model 可能已是数组
  assert.match(page, /function collectModelOptions\(cfgs\)/)
  assert.match(page, /if \(Array\.isArray\(raw\)\) return raw\.filter\(Boolean\)/)
  assert.match(page, /collectModelOptions\(textConfigs\.value\)/)
  assert.match(page, /collectModelOptions\(imageConfigs\.value\)/)
  assert.match(page, /collectModelOptions\(videoConfigs\.value\)/)
  assert.match(page, /aiConfigAPI\.list\('text'\)/)
  // 选中值必须带配置 id：同名模型可能来自不同配置（官方直连 / 私有中转）
  assert.match(page, /const key = `\$\{c\.provider\}\/\$\{m\}@\$\{c\.id\}`/)
})

test('model select dropdown is a custom designed popover that shows the config name', () => {
  // 弹层由全站统一的 AppMenu 提供（Teleport + 定位 + 层级都在那里）
  assert.match(component, /<AppMenu/)
  assert.match(component, /<AppMenuItem/)
  assert.match(component, /model-select-option/)
  assert.match(component, /emit\('update:modelValue', model\)/)
  assert.match(component, /showConfig/)
  // 来源配置名要在列表项里可见（不只是 tooltip），否则无法判断同名模型来自哪份配置
  assert.match(component, /class="model-select-option-config"/)
  assert.match(component, /function configLabel\(o\) \{/)
})

test('selected models are sent with rewrite, image and video generation requests', () => {
  // 选中模型时连同其所属配置一起调用；后端只认裸模型名，故下发前统一剥掉前缀与配置后缀
  assert.match(page, /function ownerConfigId\(options, key\) \{/)
  assert.match(page, /function bareModelName\(key\) \{/)
  // 改写（Agent）透传模型与配置
  assert.match(useAgent, /model: model \|\| undefined/)
  assert.match(useAgent, /config_id: configId \|\| undefined/)
  assert.match(page, /runAgent\('script_rewriter'[\s\S]*?chatModelOverride\(\), chatConfigId\(\)\)/)
  // 图片生成透传模型与配置
  assert.match(useApi, /generateImage: \(id: number, episodeId: number, model\?: string, configId\?: number, textModel\?: string, textConfigId\?: number\)/)
  // 文本模型覆盖随生图/提取请求透传（缺提示词时后端触发提示词 Agent）
  assert.match(useApi, /text_model: textModel \|\| undefined/)
  assert.match(useApi, /text_config_id: textConfigId \|\| undefined/)
  assert.match(useApi, /config_id: configId \|\| undefined/)
  assert.match(page, /characterAPI\.generateImage\(id, epId\.value, bareModelName\(imageModel\.value\) \|\| undefined, ownerConfigId\(imageModelOptions\.value, imageModel\.value\), chatModelOverride\(\), chatConfigId\(\)\)/)
  assert.match(page, /sceneAPI\.generateImage\(id, epId\.value, bareModelName\(imageModel\.value\) \|\| undefined, ownerConfigId\(imageModelOptions\.value, imageModel\.value\), chatModelOverride\(\), chatConfigId\(\)\)/)
  assert.match(page, /characterAPI\.batchImages\(ids, epId\.value, bareModelName\(imageModel\.value\) \|\| undefined, ownerConfigId\(imageModelOptions\.value, imageModel\.value\), chatModelOverride\(\), chatConfigId\(\)\)/)
  // 视频生成透传模型与配置
  assert.match(page, /model: bareModelName\(videoModel\.value\) \|\| undefined,/)
  assert.match(page, /config_id: ownerConfigId\(videoModelOptions\.value, videoModel\.value\),/)
})
