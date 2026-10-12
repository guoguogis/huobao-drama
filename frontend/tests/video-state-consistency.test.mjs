/**
 * 视频制作页：左侧任务列表与右侧面板的状态必须同一口径，且生成完成后列表要及时刷新。
 *
 * 曾经的矛盾：给已有成品的分镜点重绘，右侧面板/历史条显示「生成中」，
 * 左侧列表却因为「分镜有视频 → 已完成」而一直显示「已完成」。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const episode = readFileSync(new URL('views/drama/episode.vue', appRoot), 'utf8')

test('分镜状态以「正在生成」优先，不被已有成品覆盖', () => {
  assert.match(episode, /function videoTaskState\(sb\) \{\r?\n  if \(isPendingVideo\(sb\?\.id\)\) return 'pending'\r?\n  if \(hasVid\(sb\)\) return 'done'/)
  // 失败态仍在 hasVid 之后：已有成品的分镜，失败的只是新一轮尝试
  assert.match(episode, /if \(videoFailMessage\(sb\?\.id\)\) return 'failed'/)
})

test('左侧列表与右侧头部/检查器共用同一状态来源，只有播放画面跟随历史条选中', () => {
  // 右侧状态 = 分镜自身状态（不再按历史条选中的旧版本走，否则会与左侧矛盾）
  assert.match(episode, /const selectedVideoState = computed\(\(\) => videoTaskState\(selectedSb\.value\)\)/)
  // 左侧行状态
  assert.match(episode, /videoTaskState\(task\.storyboard\)/)
  // 右侧头部与检查器按钮
  assert.match(episode, /:class="\['video-task-status', 'is-' \+ selectedVideoState\]"/)
  assert.match(episode, /videoStatusLabel\(selectedVideoState\)/)
  assert.match(episode, /videoActionLabel\(selectedVideoState\)/)
  // 播放画面（stage）才跟随选中的那条记录
  assert.match(episode, /<div v-if="selectedHistoryGenerating" class="video-player-empty">/)
})

test('刷新页面后仍能恢复「正在生成」：已有成品的分镜也要恢复', () => {
  assert.match(episode, /if \(task\.status === 'processing'\) \{\r?\n\s*if \(sb\) pending\.add\(sbId\)\r?\n\s*continue\r?\n\s*\}/)
  // 历史失败仍不覆盖可用成品
  assert.match(episode, /if \(hasVid\(sb\)\) continue\r?\n\s*if \(task\.status === 'failed'\)/)
})

test('生成完成后补刷分镜视频，避免任务列表停在「待生成」', () => {
  // 后端先置任务 completed、再回写分镜 video_url，轮询那次 refresh 可能读不到新视频
  assert.match(episode, /async function refreshUntilStoryboardVideo\(storyboardId, attempts = 5, delay = 600\) \{/)
  assert.match(episode, /if \(hasVid\(sbs\.value\.find\(s => s\.id === storyboardId\)\)\) return true/)
  assert.match(episode, /await refreshUntilStoryboardVideo\(storyboardId\)/)
  // 完成时同步刷新历史条（那条生成中记录要变成成品）
  assert.match(episode, /if \(storyboardId === selectedSb\.value\?\.id\) await loadSbVideoHistory\(\)/)
})
