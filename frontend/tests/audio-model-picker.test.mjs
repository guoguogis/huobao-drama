/**
 * 顶栏模型快速选择器必须支持「音频」模型（原本只有文本/图片/视频/分辨率）。
 *
 * 为什么需要：口播的逐句配音与漫剧的音色样本都由**音频服务**驱动，
 * 而音频配置里可能有多个 TTS 模型（speech-2.8-hd / seed-audio-1.0 …）。
 * 只按配置解析会固定用配置里的首个模型，用户无法快速切换；
 * 所以：选择值按既有 `provider/model@配置id` 语义存 `huobao:model:audio`，
 * 且**模型与配置 id 必须成对下发**（否则会出现「顶栏选了 A 配置的模型、后端仍在用 B 配置」）。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (p) => readFileSync(new URL(p, appRoot), 'utf8')
const picks = readApp('utils/model-picks.ts')
const narration = readApp('views/narration/index.vue')
const drama = readApp('views/drama/episode.vue')
const api = readApp('composables/useApi.ts')

test('共用模块：音频也有独立的持久化键（两工作台选择互通）', () => {
  assert.match(picks, /audio: 'huobao:model:audio'/)
  assert.match(picks, /export const MODEL_STORE_KEYS = \{[\s\S]{0,200}?audio:/)
})

test('口播工作台：顶栏有音频选择器，且选项来自音频服务配置', () => {
  assert.match(narration, /const audioConfigs = ref\(\[\]\)/)
  assert.match(narration, /aiConfigAPI\.list\('text'\), aiConfigAPI\.list\('image'\), aiConfigAPI\.list\('video'\), aiConfigAPI\.list\('audio'\)/)
  assert.match(narration, /const audioModel = ref\(readStoredModel\(MODEL_STORE_KEYS\.audio\)\)/)
  assert.match(narration, /v-model="audioModel"[\s\S]{0,220}?:label="t\('common\.serviceType\.audio'\)"/)
  assert.match(narration, /\[audioModel, MODEL_STORE_KEYS\.audio\]/, '选择要持久化')
  assert.match(narration, /const audioPick = computed\(\(\) => resolveEffectiveModel\(audioModel\.value, audioModelOptions\.value\)\)/)
})

test('口播工作台：配音时成对下发所选音频模型与配置', () => {
  assert.match(narration, /\/\/[^\n]*音频模型[^\n]*\r?\n\s*config_id: audioPick\.value\.configId,\s*\r?\n\s*model: audioPick\.value\.model \|\| undefined/)
  assert.match(api, /synthesize: \(dramaId: number, d: \{ shot_ids\?: number\[\]; speed\?: number; voice_id\?: string; config_id\?: number; model\?: string; format\?: 'mp3' \| 'wav' \}\)/)
})

test('漫剧工作台：顶栏也有音频选择器，并与 TTS 面板的服务下拉双向同步', () => {
  assert.match(drama, /const audioModel = ref\(readStoredModel\(MODEL_STORE_KEYS\.audio\)\)/)
  assert.match(drama, /v-model="audioModel"[\s\S]{0,220}?:label="t\('common\.serviceType\.audio'\)"/)
  assert.match(drama, /persistModel\(audioModel, MODEL_STORE_KEYS\.audio\)/)
  assert.match(drama, /const audioModelOptions = computed\(\(\) => collectModelOptions\(audioConfigs\.value\)\)/)
  // 两个入口互相同步：顶栏 → 面板
  assert.match(drama, /watch\(audioPickConfigId, \(id\) => \{\s*\r?\n\s*if \(id && id !== ttsConfigId\.value\) ttsConfigId\.value = id/)
  // 面板 → 顶栏
  assert.match(drama, /watch\(ttsConfigId, \(id\) => \{[\s\S]{0,260}?audioModel\.value = first\.key/)
  // 音色样本合成时带上所选模型
  assert.match(drama, /model: bareModelName\(audioModel\.value\) \|\| undefined/)
  assert.match(api, /synthesize: \(d: \{ text: string; voice_id\?: string; emotion\?: string; config_id\?: number; model\?: string;/)
})

test('后端：音频模型可用显式参数覆盖（不传则沿用配置首个模型）', () => {
  const synth = readFileSync(new URL('../../backend/src/services/tts-synth.ts', import.meta.url), 'utf8')
  const audioRoute = readFileSync(new URL('../../backend/src/routes/audio.ts', import.meta.url), 'utf8')
  const narrationRoute = readFileSync(new URL('../../backend/src/routes/narration.ts', import.meta.url), 'utf8')
  assert.match(synth, /\/\*\* 显式指定模型（同一音频配置里有多个 TTS 模型时用；不传则用配置的首个模型） \*\/\s*\r?\n\s*model\?: string/)
  assert.match(synth, /const explicitModel = String\(opts\.model \|\| ''\)\.trim\(\)/)
  assert.match(synth, /const config = explicitModel \? \{ \.\.\.resolved, model: explicitModel \} : resolved/)
  // 两条 TTS 入口都要支持：漫剧音色样本（/audio/synthesize）与口播逐句配音（/narration/:id/synthesize）
  assert.match(audioRoute, /const explicitModel = String\(body\.model \|\| ''\)\.trim\(\)/)
  assert.match(narrationRoute, /model: body\.model !== undefined \? String\(body\.model\) : undefined/)
})
