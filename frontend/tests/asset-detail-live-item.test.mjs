/**
 * 资产详情弹窗必须读「当前列表行」，而不是打开时的快照。
 *
 * 背景：refresh() 每次都用新数组 + 新对象整体替换 chars/scenes/props，
 * 而弹窗打开时抓的是当时的行对象。生成完成只写进刷新后的新行，于是弹窗
 * 一直显示旧快照 —— 表现为「只有生成状态、不见图片」。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const episode = readFileSync(new URL('views/drama/episode.vue', appRoot), 'utf8')

test('列表刷新后把弹窗项重新指向同一 id 的当前行', () => {
  assert.match(episode, /function assetListOf\(type\) \{/)
  assert.match(episode, /watch\(\[chars, scenes, propItems\], \(\) => \{/)
  assert.match(episode, /const live = assetListOf\(detail\.type\)\.find\(x => x\.id === detail\.item\.id\)/)
  assert.match(episode, /if \(live && live !== detail\.item\) assetDetail\.value = \{ \.\.\.detail, item: live \}/)
})

test('列表刷新确实会换成新行对象（弹窗快照才会过期——这是该修复存在的前提）', () => {
  // refresh() 里是整体赋值，不是就地改字段
  assert.match(episode, /chars\.value = await episodeAPI\.characters\(ep\.id\)/)
  assert.match(episode, /scenes\.value = await episodeAPI\.scenes\(ep\.id\)/)
  assert.match(episode, /propItems\.value = await episodeAPI\.props\(ep\.id\)/)
})

test('本地补丁统一写「当前行」，不再只打给弹窗快照', () => {
  assert.match(episode, /function patchAssetRow\(type, id, patch\) \{/)
  // 最终提示词同步走当前行
  assert.match(episode, /function applyFinalPrompt\(type, id, fp\) \{\r?\n\s*patchAssetRow\(type, id, \{ final_prompt: fp, finalPrompt: fp \}\)/)
  // 保存资产信息同样走当前行
  assert.match(episode, /patchAssetRow\(detail\.type, item\.id, \{ \.\.\.infoPatch, final_prompt: promptValue, finalPrompt: promptValue \}\)/)
  // 旧的「再单独给弹窗项打一遍」写法已移除
  assert.doesNotMatch(episode, /Object\.assign\(assetDetail\.value\.item, patch\)/)
})
