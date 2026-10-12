/**
 * AI 服务配置的导入 / 导出 UI 契约。
 *
 * 导出文件含明文密钥 → 界面上必须有醒目提示；
 * 导入必须先给「新增/更新」预览再落库，prune（删除本机多余配置）必须显式勾选。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (path) => readFileSync(new URL(path, appRoot), 'utf8')
const settings = readApp('pages/settings.vue')
const useApi = readApp('composables/useApi.ts')

test('AI 服务配置页提供导出与导入入口（含明文密钥警告）', () => {
  assert.match(settings, /settings\.ai\.ioTitle/)
  assert.match(settings, /settings\.ai\.ioWarn/)
  assert.match(settings, /@click="exportCfgs"/)
  assert.match(settings, /@click="cfgFileInput\?\.click\(\)"/)
  assert.match(settings, /ref="cfgFileInput"/)
  assert.match(settings, /accept="application\/json,\.json"/)
  assert.match(settings, /@change="onCfgFilePicked"/)
})

test('导入是「先预览再落库」：明细 + prune 显式勾选', () => {
  assert.match(settings, /v-if="cfgImport\.open"/)
  assert.match(settings, /settings\.ai\.importSummary/)
  assert.match(settings, /v-model="cfgImport\.prune"/)
  assert.match(settings, /settings\.ai\.importPruneHint/)
  assert.match(settings, /@click="confirmImportCfgs"/)
  // prune 默认关闭
  assert.match(settings, /prune: false,/)
})

test('导出走真实接口并落地为带时间戳的 JSON 文件', () => {
  assert.match(settings, /async function exportCfgs\(\)/)
  assert.match(settings, /await aiConfigAPI\.exportAll\(\)/)
  assert.match(settings, /function cfgExportFilename\(\)/)
  assert.match(settings, /juwei-ai-configs-\$\{/)
  assert.match(settings, /a\.download = cfgExportFilename\(\)/)
  assert.match(settings, /URL\.revokeObjectURL\(url\)/)
  assert.match(settings, /toast\.success\(t\('settings\.ai\.exportDone', \{ n \}\)\)/)
})

test('导入：本地预检只判断必要字段，权威校验交给服务端，成功后刷新列表', () => {
  assert.match(settings, /async function onCfgFilePicked\(event\)/)
  assert.match(settings, /function localConfigKey\(c\)/)
  assert.match(settings, /await aiConfigAPI\.importAll\(cfgImport\.payload, cfgImport\.prune\)/)
  assert.match(settings, /await loadCfgs\(\)/)
  // 结构不对的文件直接拒绝，不发请求
  assert.match(settings, /settings\.ai\.importBadFile/)
  assert.match(settings, /settings\.ai\.importBadJson/)
})

test('API 客户端端点与后端路径一致', () => {
  assert.match(useApi, /exportAll: \(\) => api\.get\('\/ai-configs\/export'\)/)
  assert.match(useApi, /importAll: \(data: any, prune = false\) => api\.post\('\/ai-configs\/import', \{ data, prune \}\)/)
})

test('导入导出文案四种语言齐全且占位符正确', () => {
  const keys = ['ioTitle', 'ioDesc', 'ioWarn', 'exportBtn', 'importBtn', 'exportDone', 'importTitle',
    'importFileName', 'importSummary', 'importPrune', 'importPruneHint', 'importConfirm', 'importDone',
    'importPruned', 'importSkipped', 'importFailed', 'importBadFile', 'importBadJson', 'exportEmpty', 'exportFailed']
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const locale = JSON.parse(readApp(`locales/${lang}.json`)).settings.ai
    for (const k of keys) {
      assert.equal(typeof locale[k], 'string', `${lang} 缺 settings.ai.${k}`)
      assert.ok(locale[k].trim().length > 0, `${lang} 的 ${k} 不能为空`)
    }
    assert.ok(locale.exportDone.includes('{n}'), `${lang} exportDone 需要 {n}`)
    assert.ok(locale.importSummary.includes('{total}') && locale.importSummary.includes('{add}') && locale.importSummary.includes('{update}'),
      `${lang} importSummary 占位符不全`)
    assert.ok(locale.importDone.includes('{added}') && locale.importDone.includes('{updated}'), `${lang} importDone 占位符不全`)
    assert.ok(locale.importFileName.includes('{name}'), `${lang} importFileName 需要 {name}`)
  }
})
