import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const mergeService = readFileSync(new URL('../src/services/ffmpeg-merge.ts', import.meta.url), 'utf8')
const episodesRoute = readFileSync(new URL('../src/routes/episodes.ts', import.meta.url), 'utf8')
const backendIndex = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8')
const useApi = readFileSync(new URL('../../frontend/app/composables/useApi.ts', import.meta.url), 'utf8')
const composeRoutePath = new URL('../src/routes/compose.ts', import.meta.url)
const composeServicePath = new URL('../src/services/ffmpeg-compose.ts', import.meta.url)

test('episode merge uses generated videos directly without requiring compose output', () => {
  // 不再要求「先合成再拼接」：直接用视频生成产物，兼容历史 composedVideoUrl
  assert.doesNotMatch(mergeService, /Only composed storyboards can be merged/)
  assert.match(mergeService, /videoOverrides\?\.\[sb\.id\] \|\| sb\.videoUrl \|\| sb\.composedVideoUrl/)
  // 允许部分拼接：只拼有视频的镜头，全都没有才报错
  assert.match(mergeService, /const clips = storyboards/)
  assert.match(mergeService, /if \(clips\.length === 0\) throw new Error\('所选镜头还没有可拼接的视频'\)/)
  // 拼接前先校验文件真实存在，避免 ffmpeg 抛出晦涩的 No such file
  assert.match(mergeService, /const missing = clips\.filter\(c => !fs\.existsSync\(toAbsPath\(c\.url\)\)\)/)
  // 拼接前探测 ffmpeg 二进制（损坏时 fluent-ffmpeg 的同步 EFTYPE 会崩掉进程）
  assert.match(mergeService, /const suite = await checkFfmpegSuite\(\)/)
})

test('compose workflow is no longer exposed through API surfaces', () => {
  assert.doesNotMatch(episodesRoute, /compose_shots/)
  assert.doesNotMatch(backendIndex, /api\.route\('\/compose'/)
  assert.doesNotMatch(useApi, /export const composeAPI/)
  assert.equal(existsSync(composeRoutePath), false)
  assert.equal(existsSync(composeServicePath), false)
})

/**
 * 拼接命令与 docs/video-merge-pipeline.md 里记录的一致。
 * 目前是「concat 解复用 + 整体重编码」，**没有**逐段归一化（scale/fps/aresample）：
 * 混采样率时音频轨会被截断（实测短 7.2s），改这里前先看文档「已知限制」一节。
 */
test('merge command matches the documented recipe (no per-clip normalization yet)', () => {
  assert.match(mergeService, /\.inputOptions\(\['-f', 'concat', '-safe', '0'\]\)/)
  assert.match(mergeService, /'-c:v', 'libx264'/)
  assert.match(mergeService, /'-preset', 'medium'/)
  assert.match(mergeService, /'-crf', '23'/)
  assert.match(mergeService, /'-c:a', 'aac'/)
  assert.match(mergeService, /'-ar', '48000'/)
  assert.match(mergeService, /'-movflags', '\+faststart'/)
  assert.doesNotMatch(mergeService, /filter_complex/)
  assert.doesNotMatch(mergeService, /aresample/)
})
