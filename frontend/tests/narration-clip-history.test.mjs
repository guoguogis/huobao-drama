/**
 * 首尾帧片段：同一段可多次生成，并能查看/选用/删除历史版本。
 *
 * 契约要点：
 * - 历史随镜头列表一次返回（clip_history，新→旧）：多次生成会累积成多个版本，不额外请求；
 * - 生成中的记录也要出现在历史里（刚点重绘就能看到一条「生成中」）；
 * - 失败记录同样保留，带原因，便于判断为什么没出片；
 * - 历史点选只影响播放，**不自动改写主视频**；要「设为成片片段」才写回 storyboard.video_url
 *   （与漫剧工作台一致：导出依据是主视频，历史只是候选）；
 * - 删除记录不删磁盘文件。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (p) => readFileSync(new URL(p, appRoot), 'utf8')
const view = readApp('views/narration/index.vue')
const api = readApp('composables/useApi.ts')
const route = readFileSync(new URL('../../backend/src/routes/narration.ts', import.meta.url), 'utf8')

test('后端：镜头列表带出该段的生成历史（新→旧、含生成中与失败）', () => {
  assert.match(route, /const clipHistory = \(shotId: number\) => \(history\[`\$\{shotId\}`\] \|\| \[\]\)/)
  assert.match(route, /t\.type === 'video' && \(t\.localPath \|\| st === 'processing' \|\| st === 'pending' \|\| st === 'failed'\)/,
    '有成品或未结束/失败的视频任务都要进历史')
  assert.match(route, /\.sort\(\(a, b\) => String\(b\.createdAt\)\.localeCompare\(String\(a\.createdAt\)\)\)/)
  assert.match(route, /\.slice\(0, 20\)/, '历史条数要有上限，避免一屏上千条')
  assert.match(route, /clip_history: clipHistory\(r\.id\)/)
  assert.match(route, /error_msg: t\.errorMsg \|\| ''/, '失败记录要带原因')
})

test('后端：选用历史版本写回主视频，且有严格归属与可用性校验', () => {
  assert.match(route, /app\.post\('\/:dramaId\/shots\/:shotId\/clip'/)
  assert.match(route, /if \(!task \|\| task\.type !== 'video' \|\| task\.storyboardId !== shotId\) return badRequest\(c, '该记录不属于这个镜头'\)/)
  assert.match(route, /if \(!task\.localPath\) return badRequest\(c, '这条记录还没有生成好的视频文件，无法选为成片片段'\)/)
  assert.match(route, /\.set\(\{ videoUrl: task\.localPath, duration: duration \|\| shot\.duration, updatedAt: now\(\) \}\)/)
  assert.match(api, /setShotClip: \(dramaId: number, shotId: number, taskId: number\) =>\s*\r?\n\s*api\.post\(`\/narration\/\$\{dramaId\}\/shots\/\$\{shotId\}\/clip`, \{ task_id: taskId \}\)/)
})

test('前端：两列布局（片段列表 + 详情），左列显示版本数', () => {
  assert.match(view, /class="ns-clip-layout"/)
  assert.match(view, /class="ns-clip-list-col"/)
  assert.match(view, /v-for="pair in clipPairs"[\s\S]{0,400}?@click="selectedClipShotId = pair\.shot\.id"/)
  assert.match(view, /t\('narration\.clips\.versionCount', \{ n: clipHistoryOf\(pair\.shot\)\.length \}\)/)
  assert.match(view, /const selectedClipPair = computed/)
  assert.match(view, /function clipHistoryOf\(shot\) \{ return shot\?\.clip_history \|\| \[\] \}/)
})

test('前端：历史条可查看/选用/删除，且点选不自动改主视频', () => {
  // 主播放器来源：历史点选优先，其次主视频
  assert.match(view, /function activeClipPath\(pair\) \{[\s\S]{0,220}?if \(h\) return h\.path[\s\S]{0,120}?return pair\?\.shot\?\.video_url \|\| ''/)
  assert.match(view, /function previewClipHistory\(h\) \{[\s\S]{0,160}?previewClipTaskId\.value = previewClipTaskId\.value === h\.id \? 0 : h\.id/,
    '点历史只切换查看，不改主视频')
  // 显式「设为成片片段」才写回
  assert.match(view, /async function useHistoryAsClip\(pair\) \{[\s\S]{0,220}?narrationAPI\.setShotClip\(dramaId, pair\.shot\.id, h\.id\)/)
  assert.match(view, /await loadShots\(\)/)
  // 删除记录（不删文件）并复位选中
  assert.match(view, /async function removeClipHistory\(h\) \{[\s\S]{0,220}?taskAPI\.del\(h\.id\)/)
  assert.match(view, /if \(previewClipTaskId\.value === h\.id\) previewClipTaskId\.value = 0/)
  // 当前主视频要有「当前」标记，生成中/失败要有徽标
  assert.match(view, /function isHistoryCurrent\(shot, h\) \{ return !!h\?\.path && h\.path === shot\?\.video_url \}/)
  assert.match(view, /t\('narration\.clips\.currentBadge'\)/)
  assert.match(view, /ns-clip-history-badge is-failed/)
  assert.match(view, /ns-clip-history-badge is-pending/)
})

test('前端：查看「还没成品」的历史记录时，主播放器表达该记录而不是旧主视频', () => {
  // 历史记录可以是任意状态（生成中/失败也要能点开看状态）
  assert.match(view, /function activeHistoryRecord\(pair\) \{[\s\S]{0,160}?clipHistoryOf\(pair\.shot\)\.find\(h => h\.id === id\) \|\| null/,
    '不能要求历史记录必须有 path 才能选中')
  assert.match(view, /if \(activeHistoryRecord\(pair\)\) return ''/,
    '查看无成品记录时不得回退到主视频（否则会把旧片当新结果）')
  // 用 computed 收口播放器状态：video / generating / failed / empty
  assert.match(view, /const activeClipView = computed\(\(\) => \{[\s\S]{0,600}?if \(rec\.path\) return \{ kind: 'video', path: rec\.path \}/)
  assert.match(view, /if \(rec\.status === 'failed'\) return \{ kind: 'failed', error: rec\.error_msg \}/)
  assert.match(view, /return \{ kind: 'generating', task: rec \}/)
  // 播放舞台按状态分支：生成中 / 失败 / 有片可播 / 空态（空态内直接给生成入口）
  assert.match(view, /v-if="activeClipView\.kind === 'generating'"/)
  assert.match(view, /v-else-if="activeClipView\.kind === 'failed'"/)
  assert.match(view, /v-else-if="activeClipView\.kind === 'video'"/)
  assert.match(view, /:key="activeClipView\.path"/)
  // 高亮态比较必须用记录 id（相对路径与 /static 前缀不一致，比字符串会失效）
  assert.match(view, /function isHistoryViewing\(pair, h\) \{[\s\S]{0,140}?return !!rec && rec\.id === h\.id/)
  assert.match(view, /viewing: isHistoryViewing\(selectedClipPair, h\)/)
})

test('前端：进面板即选中第一段（左列必须有高亮，避免"看似没选中"）', () => {
  assert.match(view, /if \(!clipPairs\.value\.some\(p => p\.shot\.id === selectedClipShotId\.value\)\) \{\s*selectedClipShotId\.value = clipPairs\.value\[0\]\?\.shot\.id \|\| 0\s*\}/)
})

test('生成中的用时不能无限增长（残留任务不能显示成正常进度）', () => {
  // 任务若因中断残留在 processing，秒数会膨胀到上千万，必须切换成「可能已中断」的提示
  assert.match(view, /const STALLED_TASK_SEC = 7200/)
  assert.match(view, /function elapsedText\(task\) \{[\s\S]{0,220}?t\('narration\.clips\.generatingStalled'\)[\s\S]{0,120}?t\('narration\.clips\.generatingFor', \{ sec \}\)/)
  assert.match(view, /\{\{ elapsedText\(s\.image_task\) \}\}/, '关键帧卡片也用同一口径')
  assert.match(view, /\{\{ elapsedText\(activeClipView\.task\) \}\}/, '片段播放区也用同一口径')
})

test('删除历史记录必须二次确认（不可撤销 + 小 × 易误点）', () => {
  // × 只打开确认框，不直接删
  assert.match(view, /@click\.stop="askRemoveClipHistory\(h\)"/)
  assert.doesNotMatch(view, /@click\.stop="removeClipHistory\(h\)"/, '不得直接删除')
  assert.match(view, /function askRemoveClipHistory\(h\) \{[\s\S]{0,120}?clipHistoryToDelete\.value = h/)
  // 确认框复用共用组件，并带上这条记录的时间与模型，避免删错版本
  assert.match(view, /import ConfirmDialog from '~\/components\/ConfirmDialog\.vue'/)
  assert.match(view, /<ConfirmDialog\s*\r?\n\s*:open="!!clipHistoryToDelete"/)
  assert.match(view, /:title="t\('narration\.clips\.deleteConfirmTitle'\)"/)
  assert.match(view, /:message="clipHistoryDeleteMessage\(\)"/)
  assert.match(view, /@cancel="clipHistoryToDelete = null"/)
  assert.match(view, /@confirm="confirmRemoveClipHistory"/)
  assert.match(view, /function clipHistoryDeleteMessage\(\) \{[\s\S]{0,400}?time: formatHistoryTime\(h\.created_at\) \|\| '—'[\s\S]{0,120}?model: h\.model \|\| '—'/)
  // 确认时才真正调用删除，并在完成后关闭弹框
  assert.match(view, /async function confirmRemoveClipHistory\(\) \{[\s\S]{0,260}?await removeClipHistory\(h\)[\s\S]{0,80}?clipHistoryToDelete\.value = null/)
  // 删除中禁用按钮，避免连点
  assert.match(view, /:loading="clipHistoryDeleting"/)
  assert.match(view, /const clipHistoryDeleting = ref\(false\)/)
})

test('删除入口：成品与失败记录都可删，只有「生成中」不给删', () => {
  // 真实反馈：失败记录没文件、原来也点不到删除，用户只能看着一堆失败记录（项目 19 第 1 镜就有 3 条）
  assert.match(view, /v-if="h\.path \|\| h\.status === 'failed'"/,
    '失败记录也要能删；只有生成中不显示删除入口（删在跑的任务会让轮询失联）')
  // 失败记录没有文件：确认文案不能照搬「磁盘文件仍保留」
  assert.match(view, /if \(!h\.path\) \{[\s\S]{0,220}?t\('narration\.clips\.deleteConfirmMessageFailed'/)
  assert.match(view, /t\('narration\.clips\.deleteConfirmMessageFailed', \{[\s\S]{0,200}?error: \(h\.error_msg \|\| ''\)\.slice\(0, 120\) \|\| t\('narration\.clips\.failedUnknown'\)/)
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const clips = JSON.parse(readApp(`locales/${lang}.json`)).narration.clips
    for (const key of ['deleteConfirmMessageFailed']) {
      assert.equal(typeof clips[key], 'string', `${lang} 缺 narration.clips.${key}`)
      assert.ok(clips[key].includes('{time}') && clips[key].includes('{model}') && clips[key].includes('{error}'),
        `${lang} 的失败记录确认文案要带时间/模型/原因`)
    }
  }
})

test('删除只清记录、不删磁盘文件（提示文案要说明这一点）', () => {
  assert.match(view, /await taskAPI\.del\(h\.id\)/)
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const clips = JSON.parse(readApp(`locales/${lang}.json`)).narration.clips
    for (const key of ['deleteConfirmTitle', 'deleteConfirmMessage', 'deleteConfirmOk']) {
      assert.equal(typeof clips[key], 'string', `${lang} 缺 narration.clips.${key}`)
    }
    assert.ok(clips.deleteConfirmMessage.includes('{time}') && clips.deleteConfirmMessage.includes('{model}'),
      `${lang} 的确认文案要带时间和模型`)
  }
})

test('片段面板对齐漫剧「分镜视频」：播放器头部 + 参数 + 参考帧 + 详情', () => {
  // 头部：段号标题 / 状态胶囊 / 片段时长 / 设为成片 / 详情
  assert.match(view, /t\('narration\.clips\.playerTitle', \{ n: String\(selectedClipPair\.shot\.shot_number\)\.padStart\(2, '0'\) \}\)/)
  assert.match(view, /class="ns-vid-status" :class="'is-' \+ activeClipView\.kind"/)
  assert.match(view, /const activeClipStateLabel = computed/)
  assert.match(view, /\{\{ t\('narration\.clips\.useAsClip'\) \}\}/)
  assert.match(view, /@click="openClipDetail\(selectedClipPair\)"/)
  // 检查器：参考帧（可点放大）、提示词（可复制）、生成参数、生效参数
  assert.match(view, /function clipRefFrames\(pair\)/
  )
  assert.match(view, /function clipPromptOf\(pair\)/)
  assert.match(view, /@click="copyClipPrompt\(selectedClipPair\)"/)
  assert.match(view, /t\('narration\.clips\.paramAlign'\)[\s\S]{0,400}?t\('narration\.clips\.paramClipDur'\)[\s\S]{0,400}?t\('narration\.clips\.paramResolution'\)[\s\S]{0,400}?t\('narration\.clips\.paramAudio'\)/)
  // 模板里 computed 会自动解包，所以是 videoPick.model（不是 .value）
  assert.match(view, /t\('narration\.clips\.effective', \{[\s\S]{0,400}?model: videoPick\.model[\s\S]{0,400}?dur: selectedClipPair\.targetDuration/)
  // 主操作按钮常驻，文案随状态切换
  assert.match(view, /class="btn btn-primary ns-vid-action"/)
  assert.match(view, /\{\{ clipActionLabel\(selectedClipPair\.shot\) \}\}/)
  assert.match(view, /function clipActionLabel\(shot\) \{\s*\r?\n\s*return shot\?\.video_url \? t\('narration\.clips\.regenerate'\) : t\('narration\.clips\.generate'\)/)
})

test('详情弹框展示生成参数与辅助信息（对齐漫剧详情）', () => {
  for (const key of ['detailModel', 'detailOutput', 'detailRefs', 'detailStatus', 'detailElapsed',
    'detailUpstream', 'detailTiming', 'detailFile', 'detailError', 'detailPrompt']) {
    assert.match(view, new RegExp(`t\\('narration\\.clips\\.${key}'`), `详情缺少 ${key}`)
  }
  assert.match(view, /const clipDetail = ref\(null\)/)
  assert.match(view, /function openClipDetail\(pair\) \{[\s\S]{0,200}?clipDetail\.value = \{ \.\.\.task, shot_number: pair\.shot\.shot_number \}/)
  assert.match(view, /v-if="clipDetail\.error_msg" class="ns-detail-error"/)
  assert.match(view, /:disabled="!clipDetail\.prompt" @click="copyText\(clipDetail\.prompt\)"/)
  assert.match(view, /@click\.self="clipDetail = null"/)
  // 后端要提供这些字段，否则详情只能是空壳
  for (const field of ['prompt: t.prompt', 'task_id: t.taskId', 'resolution: params.resolution',
    'generate_audio: !!params.generateAudio', 'elapsed_sec: elapsed', 'completed_at: t.completedAt']) {
    assert.ok(route.includes(field), `clip_history 缺少字段 ${field}`)
  }
})

test('模型与「首尾帧」素材不匹配时，生成前就提示并给一键切换', () => {
  // 真实失败：happyhorse 的 t2v/r2v/i2v 都不吃 first_frame/last_frame，白烧一次生成
  assert.match(view, /const FRAME_INCAPABLE = \['happyhorse-1\.1-t2v', 'happyhorse-1\.1-r2v', 'happyhorse-1\.1-i2v'\]/)
  assert.match(view, /function clipModelIssue\(pair\) \{[\s\S]{0,240}?return t\('narration\.clips\.modelIssue', \{ model \}\)/)
  assert.match(view, /v-if="clipModelIssue\(selectedClipPair\)" class="ns-vid-warn"/)
  assert.match(view, /v-if="frameCapableModel" type="button" class="btn btn-sm" @click="videoModel = frameCapableModel\.key"/)
  assert.match(view, /const frameCapableModel = computed\(\(\) =>\s*\r?\n\s*videoModelOptions\.value\.find\(o => !FRAME_INCAPABLE\.includes\(o\.model\)\) \|\| null\)/)
})

test('片段提示词可编辑：失焦/Ctrl+Enter 提交，写回该镜头的 video_prompt', () => {
  // 可编辑输入框（替代原来的只读展示）
  assert.match(view, /<textarea\s*\r?\n\s*v-model="promptDraft"/)
  assert.match(view, /@blur="commitPrompt"/)
  assert.match(view, /@keydown\.ctrl\.enter\.prevent="commitPrompt"/)
  assert.match(view, /@keydown\.meta\.enter\.prevent="commitPrompt"/)
  // 只写 video_prompt 一个字段，复用已有的 storyboard 局部更新接口（无后端改动）
  assert.match(view, /await storyboardAPI\.update\(pair\.shot\.id, \{ video_prompt: next \}\)/)
  assert.match(view, /import \{ aiConfigAPI, dramaAPI, mergeAPI, narrationAPI, storyboardAPI, taskAPI \} from '~\/composables\/useApi'/)
  // 保存后就地更新本地镜头，不整表刷新（否则正在编辑的输入框会跳）
  assert.match(view, /pair\.shot\.video_prompt = next/)
})

test('提示词编辑的状态反馈与安全网', () => {
  // 脏态 / 保存中 / 已保存 三种反馈
  assert.match(view, /const promptDirty = computed\(\(\) => promptDraft\.value\.trim\(\) !== promptSaved\.value\.trim\(\)\)/)
  assert.match(view, /v-if="promptSaving" class="ns-vid-save-state"/)
  assert.match(view, /v-else-if="promptSavedFlash" class="ns-vid-save-state is-ok"/)
  assert.match(view, /v-else-if="promptDirty" class="ns-vid-save-state is-dirty"/)
  // 切换片段要换草稿：否则上一段的未保存文字会跟到这一段并可能被误存
  assert.match(view, /watch\(selectedClipPair, \(pair\) => \{\s*\r?\n\s*promptDraft\.value = String\(pair\?\.shot\?\.video_prompt \|\| ''\)/)
  // 保存失败回滚成服务端的值，避免界面与库不一致
  assert.match(view, /catch \(e\) \{[\s\S]{0,200}?promptDraft\.value = String\(pair\.shot\.video_prompt \|\| ''\)[\s\S]{0,120}?toastError\(e, \{ fallback: 'narration\.clips\.promptSaveFailed' \}\)/)
  // 放弃改动 + 定时器清理
  assert.match(view, /function resetPromptDraft\(\)/)
  assert.match(view, /if \(promptFlashTimer\) clearTimeout\(promptFlashTimer\)/)
  // 真实踩过：点「放弃改动」会先让文本框失焦 → blur 提交把想丢弃的内容存进库，
  // 所以既要 mousedown.prevent 阻止失焦，也要把基线写回去做兜底撤销
  assert.match(view, /@mousedown\.prevent\s*\r?\n\s*@click="resetPromptDraft"/)
  assert.match(view, /const promptBaseline = ref\(''\)/)
  assert.match(view, /if \(String\(pair\.shot\.video_prompt \|\| ''\) === target\) return[\s\S]{0,300}?await storyboardAPI\.update\(pair\.shot\.id, \{ video_prompt: target \}\)/)
})

test('关键帧提示词可编辑，改完重新生成即用新提示词', () => {
  // 关键帧卡片里的提示词从只读 <p> 换成可编辑 textarea
  assert.match(view, /class="textarea ns-prompt-input"/)
  assert.match(view, /:value="imgPromptDraft\(s\)"/)
  assert.match(view, /@input="setImgPromptDraft\(s, \$event\.target\.value\)"/)
  assert.match(view, /@blur="commitImgPrompt\(s\)"/)
  assert.match(view, /@keydown\.ctrl\.enter\.prevent="commitImgPrompt\(s\)"/)
  assert.doesNotMatch(view, /<p class="ns-prompt">\{\{ s\.keyframe_prompt \}\}<\/p>/, '不应再是只读展示')
  // 只写 image_prompt 一个字段
  assert.match(view, /await storyboardAPI\.update\(shot\.id, \{ image_prompt: draft \}\)/)
  assert.match(view, /await storyboardAPI\.update\(shot\.id, \{ image_prompt: target \}\)/)
  // 关键：生成图片下发的就是 keyframe_prompt，所以编辑后重新生成会带上新提示词
  assert.match(view, /prompt: s\.keyframe_prompt,/)
  assert.match(view, /shot\.keyframe_prompt = draft/, '保存成功后要就地更新，供后续生成使用')
})

test('关键帧提示词：每镜独立草稿 + 状态反馈 + 放弃改动真撤销', () => {
  // 每镜一份草稿与基线（否则多个卡片会串稿）
  // 注意：本文件是 JS 版 script setup，不能写 TS 泛型（views-compile 测试会拦）
  assert.match(view, /const imgPromptDrafts = reactive\(\{\}\)/)
  assert.match(view, /const imgPromptBaselines = reactive\(\{\}\)/)
  assert.match(view, /if \(imgPromptDrafts\[shot\.id\] === undefined\) \{[\s\S]{0,200}?imgPromptBaselines\[shot\.id\] = imgPromptDrafts\[shot\.id\]/)
  assert.match(view, /function imgPromptDirty\(shot\) \{[\s\S]{0,160}?String\(shot\.keyframe_prompt \|\| ''\)\.trim\(\)/)
  // 状态反馈
  assert.match(view, /v-if="imgPromptSavingId === s\.id" class="ns-vid-save-state"/)
  assert.match(view, /v-else-if="imgPromptSavedId === s\.id" class="ns-vid-save-state is-ok"/)
  assert.match(view, /v-else-if="imgPromptDirty\(s\)" class="ns-vid-save-state is-dirty"/)
  // 放弃改动：mousedown.prevent 防失焦提交 + 基线回写兜底（与片段提示词同样的坑）
  assert.match(view, /@mousedown\.prevent\s*\r?\n\s*@click="resetImgPrompt\(s\)"/)
  assert.match(view, /async function resetImgPrompt\(shot\) \{[\s\S]{0,520}?await storyboardAPI\.update\(shot\.id, \{ image_prompt: target \}\)/)
  // 保存失败回滚
  assert.match(view, /imgPromptDrafts\[shot\.id\] = String\(shot\.keyframe_prompt \|\| ''\)[\s\S]{0,120}?toastError\(e, \{ fallback: 'narration\.images\.promptSaveFailed' \}\)/)
  assert.match(view, /if \(imgPromptFlashTimer\) clearTimeout\(imgPromptFlashTimer\)/)
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const imgs = JSON.parse(readApp(`locales/${lang}.json`)).narration.images
    for (const key of ['promptPlaceholder', 'promptHint', 'promptSaving', 'promptSaved', 'promptDirty', 'promptReset', 'promptSaveFailed']) {
      assert.equal(typeof imgs[key], 'string', `${lang} 缺 narration.images.${key}`)
    }
  }
})

test('关键帧保留多张候选图，可设为当前 / 可删（当前那张不给删除入口）', () => {
  assert.match(view, /function keyframeHistoryOf\(shot\) \{ return shot\?\.keyframe_history \|\| \[\] \}/)
  assert.match(view, /v-for="k in keyframeHistoryOf\(s\)"/)
  assert.match(view, /class="ns-kf-item"/)
  assert.match(view, /function isCurrentKeyframe\(shot, k\) \{ return !!k\?\.path && k\.path === shot\?\.keyframe_image \}/)
  // 设为当前关键帧 → 写回 first_frame_image（下游片段首帧默认取它）
  assert.match(view, /await narrationAPI\.setShotKeyframe\(dramaId, shot\.id, k\.id\)/)
  assert.match(view, /v-if="!isCurrentKeyframe\(s, k\)"[\s\S]{0,220}?t\('narration\.images\.useShort'\)/)
  // 删除走二次确认，且当前那张不显示删除按钮
  assert.match(view, /@click\.stop="askRemoveKeyframe\(s, k\)"/)
  assert.match(view, /const keyframeToDelete = ref\(null\)/)
  assert.match(view, /:message="keyframeDeleteMessage\(\)"[\s\S]{0,200}?@confirm="confirmRemoveKeyframe"/)
  assert.match(view, /v-if="!isCurrentKeyframe\(s, k\)"[\s\S]{0,600}?askRemoveKeyframe\(s, k\)/)
})

test('片段首尾帧可从多张候选里选用，并落库', () => {
  // 生效值：显式选用优先，否则回落到当前关键帧
  assert.match(view, /function effectiveFirstFrame\(pair\) \{\s*\r?\n\s*return pair\?\.shot\?\.clip_first_frame \|\| pair\?\.shot\?\.keyframe_image \|\| ''/)
  assert.match(view, /function effectiveLastFrame\(pair\) \{\s*\r?\n\s*return pair\?\.shot\?\.clip_last_frame \|\| pair\?\.next \|\| ''/)
  // 生成时用的是生效值（否则选了也白选）
  assert.match(view, /first_frame_url: effectiveFirstFrame\(p\),\s*\r?\n\s*last_frame_url: effectiveLastFrame\(p\),/)
  // 候选条：本镜候选给首帧、下一镜候选给尾帧
  assert.match(view, /const nextShot = shots\.value\[i \+ 1\] \|\| null/)
  assert.match(view, /const shot = side === 'first' \? pair\.shot : pair\.nextShot/)
  assert.match(view, /function keyframeCandidates\(shot\) \{[\s\S]{0,320}?push\(shot\?\.keyframe_image, t\('narration\.images\.useShort'\)\)[\s\S]{0,160}?for \(const k of \(shot\?\.keyframe_history \|\| \[\]\)\) push\(k\.path, ''\)/)
  // 选用与恢复默认都走接口
  assert.match(view, /await narrationAPI\.setShotClipFrames\(dramaId, pair\.shot\.id, patch\)/)
  assert.match(view, /pair\.shot\.clip_first_frame = cand\.path/)
  assert.match(view, /async function resetClipFrames\(pair\) \{[\s\S]{0,220}?narrationAPI\.setShotClipFrames\(dramaId, pair\.shot\.id, \{ first_frame: '', last_frame: '' \}\)/)
  assert.match(view, /v-if="framesOverridden\(selectedClipPair\)"[\s\S]{0,320}?t\('narration\.clips\.resetFrames'\)/)
  // 参考帧上标出"已改选"
  assert.match(view, /overridden: !!pair\.shot\.clip_first_frame/)
})

test('文案四种语言齐全（含多处生成与选用说明）', () => {
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const clips = JSON.parse(readApp(`locales/${lang}.json`)).narration.clips
    for (const key of ['history', 'versionCount', 'currentBadge', 'useAsClip', 'useAsClipHint', 'useAsClipDone',
      'recordDeleted', 'deleteRecord', 'noClip', 'multiHint', 'pickHint', 'generatingStalled']) {
      assert.equal(typeof clips[key], 'string', `${lang} 缺 narration.clips.${key}`)
      assert.ok(clips[key].trim().length > 0)
    }
    assert.ok(clips.versionCount.includes('{n}'), `${lang} versionCount 需要 {n}`)
    assert.ok(clips.useAsClipDone.includes('{n}'), `${lang} useAsClipDone 需要 {n}`)
  }
})
