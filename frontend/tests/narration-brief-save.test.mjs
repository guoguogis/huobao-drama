/**
 * 「保存简报」的用途契约：它是全链路唯一参数来源，且必须在依赖它的服务端操作前落库。
 *
 * 为什么必须锁：
 * - 服务端算逐镜计划（扩写镜头）读的是**已落库**的倍速；表单里改了倍速但没保存时，
 *   会出现「界面显示 1.5 倍、实际按旧的 1.1 倍切镜头」的静默错位；
 * - 用户也需要知道它存到哪儿（dramas.metadata.narration），否则无从判断要不要点。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (p) => readFileSync(new URL(p, appRoot), 'utf8')
const view = readApp('views/narration/index.vue')
const service = readFileSync(new URL('../../backend/src/services/narration.ts', import.meta.url), 'utf8')
const route = readFileSync(new URL('../../backend/src/routes/narration.ts', import.meta.url), 'utf8')

test('后端：简报落在 dramas.metadata.narration，并按字段白名单写入', () => {
  assert.match(service, /export async function saveNarrationBrief\(dramaId: number, patch: Partial<NarrationBrief>\)/)
  assert.match(service, /metadata\.narration = next/)
  assert.match(service, /\.set\(\{ metadata: JSON\.stringify\(metadata\), updatedAt: new Date\(\)\.toISOString\(\) \}\)/)
  // 写入前先解析已有 metadata，保留其它键（不能把 metadata 整体覆盖掉）
  assert.match(service, /const next = \{ \.\.\.parseNarrationBrief\(drama\.metadata\), \.\.\.patch \}/)
  // 接口侧：倍速/时长/画幅等都有校验（校验函数返回原因，调用方转 400，避免静默钳制）
  assert.match(route, /app\.put\('\/:dramaId\/brief'/)
  assert.match(route, /return \{ error: `语速倍率需在 \$\{MIN_SPEECH_RATE\}~\$\{MAX_SPEECH_RATE\} 之间（当前 \$\{n\}）` \}/)
  assert.match(route, /const rate = parseSpeechRate\(body\.speech_rate \?\? body\.speechRate\)\s*\r?\n\s*if \(rate\.error\) return badRequest\(c, rate\.error\)/)
  assert.match(route, /if \(!Number\.isFinite\(n\) \|\| n < 5 \|\| n > 3600\) return badRequest\(c, '目标时长需在 5~3600 秒之间'\)/)
})

test('前端：有未保存改动时有状态提示，并说明保存到哪', () => {
  assert.match(view, /const savedBrief = ref\(null\)/)
  assert.match(view, /const briefDirty = computed\(\(\) => \{/)
  assert.match(view, /savedBrief\.value = briefSnapshot\(\)/, '加载与保存后都要刷新快照')
  assert.match(view, /v-if="briefDirty" class="ns-dirty-chip">\{\{ t\('narration\.brief\.unsaved'\) \}\}/)
  assert.match(view, /t\('narration\.brief\.storedHint'\)/)
})

test('依赖简报的服务端操作前先落库（写稿 / 扩写镜头）', () => {
  assert.match(view, /async function ensureBriefSaved\(\) \{[\s\S]{0,120}?if \(!briefDirty\.value\) return true[\s\S]{0,80}?return await saveBrief\(\{ silent: true \}\)/)
  // 写稿
  assert.match(view, /async function generateScripts\(\) \{[\s\S]{0,200}?await ensureBriefSaved\(\)/)
  // 扩写镜头（服务端按已落库倍速算计划）
  assert.match(view, /async function runShotPlanner\(\) \{[\s\S]{0,240}?await ensureBriefSaved\(\)/)
  // 静默保存不能弹「已保存」提示打扰用户
  assert.match(view, /if \(!silent\) \{\s*toast\.success\(t\('narration\.brief\.saved'/)
})

test('提示文案四种语言齐全', () => {
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const brief = JSON.parse(readApp(`locales/${lang}.json`)).narration.brief
    for (const key of ['unsaved', 'storedHint']) {
      assert.equal(typeof brief[key], 'string', `${lang} 缺 narration.brief.${key}`)
      assert.ok(brief[key].trim().length > 0)
    }
  }
})
