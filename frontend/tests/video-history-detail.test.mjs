import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (path) => readFileSync(new URL(path, appRoot), 'utf8')
const episode = readApp('views/drama/episode.vue')

test('点击历史视频只做「切换选择」：大视频区域随之加载该条', () => {
  assert.match(episode, /@click="previewHistoryVideo\(h\)"/)
  assert.match(episode, /@keydown\.enter\.prevent="previewHistoryVideo\(h\)"/)
  assert.match(episode, /function previewHistoryVideo\(t\) \{/)
  assert.match(episode, /previewVideoUrl\.value = isCurrentVideo\(t\) \? '' : taskVideoPath\(t\)/)
  // 主播放器必须跟随 previewVideoUrl（点选历史视频后随之换片）
  assert.match(episode, /previewVideoUrl \|\| getVideoUrl\(selectedSb\)/)
  // 历史项不再自带 ⓘ 入口：点击＝选择，详情统一走大视频区域的按钮
  assert.doesNotMatch(episode, /class="video-history-info"/)
  assert.doesNotMatch(episode, /video-history-info/)
  // 每条记录仍可删除
  assert.match(episode, /class="video-history-del"/)
  assert.match(episode, /@click\.stop="removeHistoryVideo\(h\)"/)
})

test('大视频区域的「详情」按钮（替换原下载）打开生成信息弹框', () => {
  // 原来那个下载链接必须已经不在了
  assert.doesNotMatch(episode, /:href="'\/' \+ \(previewVideoUrl \|\| getVideoUrl\(selectedSb\)\)"[\s\S]{0,80}download/)
  // 详情按钮 + 弹框
  assert.match(episode, /@click="openVideoDetail"/)
  assert.match(episode, /function openVideoDetail\(\) \{/)
  assert.match(episode, /const videoDetailOpen = ref\(false\)/)
  assert.match(episode, /const videoDetail = ref\(null\)/)
  assert.match(episode, /v-if="videoDetailOpen" class="overlay video-detail-overlay" @click\.self="closeVideoDetail"/)
  assert.match(episode, /class="dialog video-detail-dialog" role="dialog" aria-modal="true"/)
  assert.match(episode, /function closeVideoDetail\(\) \{/)
  // Esc 也能关（挂在页面既有的全局 keydown 上）
  assert.match(episode, /else if \(videoDetailOpen\.value\) closeVideoDetail\(\)/)
  // 弹框里是该条视频的生成参数与提示词
  assert.match(episode, /videoDetail\.model \|\| '—'/)
  assert.match(episode, /videoDetail\.provider \|\| '—'/)
  assert.match(episode, /t\('episode\.vid\.detailRefs'\)/)
  assert.match(episode, /t\('episode\.vid\.detailVoiceSamples'/)
  assert.match(episode, /t\('episode\.vid\.detailUpstream'\)/)
  assert.match(episode, /t\('episode\.vid\.detailTiming'\)/)
  assert.match(episode, /t\('episode\.vid\.detailPrompt'\)/)
  assert.match(episode, /historyOutputSpec\(videoDetail\)/)
  assert.match(episode, /@click="copyHistoryPrompt\(videoDetail\)"/)
  assert.match(episode, /videoDetail\.error_msg \|\| videoDetail\.errorMsg/)
  // 找不到生成记录时给出说明而不是空白弹框
  assert.match(episode, /class="video-detail-empty">\{\{ t\('episode\.vid\.detailNoRecord'\) \}\}/)
  // 历史列表面板里不再有内嵌详情（面板只留在任务列表行内）
  assert.doesNotMatch(episode, /v-if="historyDetail" class="history-detail-panel"/)
  assert.doesNotMatch(episode, /historyDetail/)
  // 删掉正在看详情的那条记录时，弹框要关掉
  assert.match(episode, /if \(videoDetail\.value && videoDetail\.value\.id === task\.id\) closeVideoDetail\(\)/)
})

test('详情内容取自当前加载视频对应的任务行（历史列表优先，主视频可能不在其中）', () => {
  assert.match(episode, /function currentPlayerPath\(\) \{/)
  assert.match(episode, /return previewVideoUrl\.value \|\| getVideoUrl\(selectedSb\.value\) \|\| ''/)
  assert.match(episode, /function currentPlayerTask\(\) \{/)
  assert.match(episode, /sbVideoHistory\.value\.find\(t => taskVideoPath\(t\) === path\)/)
  assert.match(episode, /genTasks\.value\.find\(t => t\.type === 'video' && taskVideoPath\(t\) === path\)/)
  // 弹框副标题：所属分镜 + 生成时间
  assert.match(episode, /const videoDetailSubtitle = computed\(/)
  assert.match(episode, /t\('episode\.tasks\.sbN', \{ n: sbNumber\(sb\) \}\)/)
})

test('任务列表行内详情仍然复用同一套排版（不受弹框改造影响）', () => {
  assert.match(episode, /class="history-detail-panel gen-task-detail"/)
  assert.match(episode, /historyStatusLabel\(row\.raw\)/)
  assert.match(episode, /copyHistoryPrompt\(row\.raw\)/)
})

test('生成详情与任务行的数据都来自 /tasks 原始行，params 兼容字符串与对象', () => {
  assert.match(episode, /function historyParams\(t\) \{/)
  assert.match(episode, /if \(typeof raw === 'object'\) return raw/)
  assert.match(episode, /function historyOutputSpec\(t\) \{/)
  assert.match(episode, /function historyRefSummary\(t\) \{/)
})

test('导出窗口只显示有视频任务的镜头：每个镜头一行、行内排开它的全部视频', () => {
  assert.match(episode, /class="export-rows"/)
  // 只渲染有视频任务的镜头（不再把未生成视频的分镜也列出来）
  assert.match(episode, /const exportRows = computed\(\(\) => sbs\.value\.filter\(s => exportSbClips\(s\)\.length\)\)/)
  assert.match(episode, /v-for="sb in exportRows"/)
  assert.match(episode, /v-else class="exp2-empty export-rows-empty">\{\{ t\('episode\.export\.noShotVideos'\) \}\}/)
  // 行内横向排列该镜头的全部视频（别名不能叫 t，否则遮蔽 i18n 的 t）
  assert.match(episode, /v-for="clip in exportSbClips\(sb\)"/)
  assert.match(episode, /function exportSbClips\(sb\) \{ return exportSbTasks\.value\[sb\.id\] \|\| \[\] \}/)
  // 镜号优先用分镜自身序号
  assert.match(episode, /function sbNumber\(sb\)/)
  // 版本列表来自集级任务接口，按分镜分组、仅取已完成且有文件的
  assert.match(episode, /taskAPI\.listByEpisode\(epId\.value\)/)
  assert.match(episode, /String\(t\.type\) !== 'video' \|\| String\(t\.status\) !== 'completed'/)
  assert.match(episode, /grouped\[sbId\]\.push\(t\)/)
})

test('每一行仅允许选一条视频，默认选主视频（不在列表里则退回第一条）', () => {
  assert.match(episode, /function pickExportClip\(sb, t\) \{/)
  // 单选语义：同一个路径再点一次就删掉，否则覆盖（同一行永远只保留一个）
  assert.match(episode, /if \(next\[sb\.id\] === path\) delete next\[sb\.id\]/)
  assert.match(episode, /else next\[sb\.id\] = path/)
  assert.match(episode, /const exportPickBySb = ref\(\{\}\)/)
  assert.match(episode, /function isExportSelected\(sb\) \{ return !!exportPickBySb\.value\[sb\.id\] \}/)
  // 默认：主视频优先，主视频不在版本列表里才退回第一条
  assert.match(episode, /next\[sb\.id\] = main && paths\.includes\(main\) \? main : paths\[0\]/)
  assert.match(episode, /const main = getVideoUrl\(sb\)/)
  // 组内按时间倒序，「第一条」即最近一次生成
  assert.match(episode, /list\.sort\(\(a, b\) => String\(taskCreatedAt\(b\)\)\.localeCompare\(String\(taskCreatedAt\(a\)\)\)\)/)
})

test('拼接时把每个分镜选中的版本作为 video_overrides 下发', () => {
  assert.match(episode, /function exportOverrides\(\) \{/)
  assert.match(episode, /out\[id\] = path/)
  assert.match(episode, /await doMerge\(ids, exportOverrides\(\)\)/)
  assert.match(episode, /async function doMerge\(ids, videoOverrides\) \{/)
  assert.match(episode, /mergeAPI\.merge\(epId\.value, storyboardIds, videoOverrides\)/)
  // 进入导出面板时加载版本列表
  assert.match(episode, /watch\(panel, \(p\) => \{ if \(p === 'export'\) loadExportSbTasks\(\) \}, \{ immediate: true \}\)/)
})

test('任务列表的行可点击：展开生成详情，并可载入主播放器', () => {
  // 行补上点击/键盘响应（此前行是死的，点了没反应）
  assert.match(episode, /@click="onGenTaskRowClick\(row, \$event\)"/)
  assert.match(episode, /@keydown\.enter\.prevent="toggleGenTaskDetail\(row\)"/)
  assert.match(episode, /function onGenTaskRowClick\(row, ev\) \{/)
  // 点到播放控件/大图上不劫持，保留原生控件与看图
  assert.match(episode, /ev\?\.target\?\.closest\?\.\('video, img, button, a, input, textarea, select'\)/)
  // 行内展开同一套详情（非模态，不离开列表）
  assert.match(episode, /const genTaskDetailKey = ref\(''\)/)
  assert.match(episode, /function toggleGenTaskDetail\(row\) \{/)
  assert.match(episode, /class="history-detail-panel gen-task-detail"/)
  assert.match(episode, /historyStatusLabel\(row\.raw\)/)
  assert.match(episode, /historyOutputSpec\(row\.raw\)/)
  assert.match(episode, /copyHistoryPrompt\(row\.raw\)/)
  // 行数据保留原始任务行：otherwise params/task_id 拿不到
  assert.match(episode, /raw: t,/)
  assert.match(episode, /raw: m,/)
  // 载入主播放器：关抽屉 → 制作/视频 → 选中该分镜 → 预览该成品
  assert.match(episode, /function openGenTaskInPlayer\(row\) \{/)
  assert.match(episode, /function canOpenGenTaskInPlayer\(row\) \{/)
  assert.match(episode, /function genTaskResultPath\(row\) \{/)
  assert.match(episode, /panel\.value = 'production'/)
  assert.match(episode, /prodTab\.value = 'videos'/)
  assert.match(episode, /previewVideoUrl\.value = path/)
  // 远端成品地址不塞进主播放器（主播放器会拼成 /http://… 打不开）
  assert.match(episode, /return !!path && !\/\^https\?:\\\/\\\/\/i\.test\(path\)/)
})

test('i18n 的 t 不被任务对象参数/模板别名遮蔽（曾导致整页渲染崩溃、点击全无反应）', () => {
  // 1) 模板里不允许出现名为 t 的 v-for 别名
  assert.doesNotMatch(episode, /v-for="t in /)
  // 2) 形参名为 t 的函数体里不允许再把 t 当翻译函数调用
  const bodyOf = (src, from) => {
    const open = src.indexOf('{', from)
    let depth = 0
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}' && --depth === 0) return src.slice(open, i + 1)
    }
    return ''
  }
  const decls = [...episode.matchAll(/(?:async )?function (\w+)\(t\b/g)]
  assert.ok(decls.length > 0, '应当仍存在以 t 为形参的任务工具函数')
  for (const m of decls) {
    const body = bodyOf(episode, m.index)
    assert.doesNotMatch(body, /(^|[^\w.$])t\(/, `${m[1]}(t) 把任务对象 t 当成了翻译函数`)
  }
  // 3) 曾出错的三处必须用 task 作形参/循环变量
  assert.match(episode, /function historyStatusLabel\(task\) \{/)
  assert.match(episode, /async function removeHistoryVideo\(task\) \{/)
  assert.match(episode, /for \(const \[sbId, task\] of latestBySb\) \{/)
})

test('导出选中态落在「该段选用的那个视频」上，不是整块素材区域', () => {
  // 整块素材不再有选中高亮，也不再挂一个大勾选框
  assert.doesNotMatch(episode, /'exp2-row', \{ selected: isExportSelected\(sb\) \}/)
  assert.doesNotMatch(episode, /class="exp2-check"/)
  assert.doesNotMatch(episode, /function toggleExportPick\(sb\)/)
  assert.doesNotMatch(episode, /\.exp2-row\.selected/)
  assert.doesNotMatch(episode, /exp2-check/)
  // 未参与拼接的素材用虚线 + 标签表达
  assert.match(episode, /'exp2-row', \{ 'no-pick': !isExportSelected\(sb\) \}/)
  assert.match(episode, /class="exp2-not-picked"/)
  assert.match(episode, /\.exp2-row\.no-pick \{ border-style: dashed/)
  // 选中态在视频上：左上角勾选框打勾（hover 才出现）+ 主视频标记
  assert.match(episode, /:class="\['exp2-clip', \{ on: isClipPicked\(sb, clip\) \}\]"/)
  assert.match(episode, /function isClipPicked\(sb, clip\) \{/)
  assert.match(episode, /function isClipMain\(sb, clip\) \{/)
  assert.match(episode, /class="exp2-clip-check"/)
  assert.match(episode, /class="exp2-clip-main"/)
  assert.match(episode, /\.exp2-row \.exp2-clip:not\(\.on\) \{ opacity: 0\.62; \}/)
  // 每段默认选主视频（主视频不在版本列表里才退回第一条）
  assert.match(episode, /function ensureExportPicks\(\) \{/)
})

test('导出页片段：左上角勾选框选定，点视频弹框播放', () => {
  // 勾选框：默认隐藏，hover / 聚焦 / 已选中才出现
  assert.match(episode, /\.exp2-clip-check \{\r?\n  position: absolute;\r?\n  left: 4px;\r?\n  top: 4px;[\s\S]{0,240}display: none;/)
  assert.match(episode, /\.exp2-clip:hover \.exp2-clip-check,\r?\n\.exp2-clip:focus-within \.exp2-clip-check,\r?\n\.exp2-clip-check\.on \{ display: flex; \}/)
  // 点勾选框＝选定该版本（不冒泡到播放）
  assert.match(episode, /@click\.stop="pickExportClip\(sb, clip\)"/)
  // 点缩略图＝弹框播放
  assert.match(episode, /class="exp2-clip-media"/)
  assert.match(episode, /@click="openClipPlayer\(sb, clip\)"/)
  assert.match(episode, /function openClipPlayer\(sb, clip\) \{/)
  assert.match(episode, /const clipPlayer = ref\(null\)/)
  assert.match(episode, /function closeClipPlayer\(\) \{ clipPlayer\.value = null \}/)
  // 弹框能真的播：带 controls + autoplay 的 video
  assert.match(episode, /v-if="clipPlayer" class="overlay image-viewer-overlay" @click\.self="closeClipPlayer"/)
  assert.match(episode, /:key="clipPlayer\.path"[\s\S]{0,140}controls\r?\n\s+autoplay/)
  // Esc 也能关
  assert.match(episode, /else if \(clipPlayer\.value\) closeClipPlayer\(\)/)
  // 旧的整块点击选中 + 圆形对勾已移除
  assert.doesNotMatch(episode, /class="exp2-clip-pick"/)
  assert.doesNotMatch(episode, /\.exp2-clip-pick/)
})

test('片段播放文案四种语言都有', () => {
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const locale = JSON.parse(readApp(`locales/${lang}.json`))
    assert.equal(typeof locale.episode.export.playClip, 'string', `${lang} 缺 episode.export.playClip`)
    assert.ok(locale.episode.export.playClip.trim().length > 0)
    // 弹框标题复用既有的「镜头 #n 预览」
    assert.match(locale.episode.export.shotPreview, /\{n\}/, `${lang} 的 shotPreview 需要 {n} 占位`)
  }
})

test('成片列表支持删除（二次确认 + 调后端接口 + 立即从列表移除）', () => {
  const useApi = readApp('composables/useApi.ts')
  // 卡片上的删除按钮：不能触发卡片的播放点击
  assert.match(episode, /class="merge-card-del"/)
  assert.match(episode, /@click\.stop="askDeleteMerge\(m\)"/)
  assert.match(episode, /function askDeleteMerge\(m\) \{/)
  assert.match(episode, /async function confirmDeleteMerge\(\) \{/)
  assert.match(episode, /await mergeAPI\.remove\(item\.id\)/)
  // 删完立即移除该条并刷新；正在大预览的那条被删要顺手关掉预览
  assert.match(episode, /exportMerges\.value = exportMerges\.value\.filter\(m => m\.id !== item\.id\)/)
  assert.match(episode, /if \(activeMerge\.value && activeMerge\.value\.id === item\.id\) activeMerge\.value = null/)
  assert.match(episode, /await loadExportMerges\(\)/)
  // 复用 ConfirmDialog 二次确认
  assert.match(episode, /:open="mergeDelete\.open"/)
  assert.match(episode, /:message="t\('episode\.export\.deleteMessage', \{ name: mergeDeleteLabel \}\)"/)
  assert.match(episode, /@confirm="confirmDeleteMerge"/)
  assert.match(episode, /@cancel="mergeDelete\.open = false"/)
  // 后端路径：DELETE /merge/merges/:id
  assert.match(useApi, /remove: \(id: number\) => api\.del\(`\/merge\/merges\/\$\{id\}`\)/)
})

test('成片删除文案四种语言都有', () => {
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const locale = JSON.parse(readApp(`locales/${lang}.json`))
    for (const key of ['delMerge', 'deleteTitle', 'deleteMessage', 'deleteDone']) {
      const v = locale.episode.export[key]
      assert.equal(typeof v, 'string', `${lang} 缺 episode.export.${key}`)
      assert.ok(v.trim().length > 0, `${lang} 的 ${key} 不能为空`)
    }
    assert.match(locale.episode.export.deleteMessage, /\{name\}/, `${lang} 的 deleteMessage 需要 {name} 占位`)
  }
})

test('导出页新增文案四种语言都有', () => {
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const locale = JSON.parse(readApp(`locales/${lang}.json`))
    for (const key of ['openInPlayer', 'mainBadge', 'notIncluded', 'pickClip']) {
      const v = locale.episode.tasks[key] ?? locale.episode.export[key]
      assert.equal(typeof v, 'string', `${lang} 缺 episode.*.${key}`)
      assert.ok(v.trim().length > 0, `${lang} 的 ${key} 不能为空`)
    }
    // 去掉整块素材勾选框后，这两个键不再有引用
    assert.equal(locale.episode.export.includeShot, undefined, `${lang} 的 includeShot 已无引用`)
    assert.equal(locale.episode.export.excludeShot, undefined, `${lang} 的 excludeShot 已无引用`)
  }
})
