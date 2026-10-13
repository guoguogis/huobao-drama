/**
 * 口播工作台布局契约：左侧树形菜单（分区 → 子项），右侧**只渲染当前节点**的面板。
 *
 * 为什么值得测：漫剧工作台用「分区 + 子项」树形导航，一屏只呈现一个环节；
 * 如果改成把所有环节纵向堆成一列（瀑布流），节点多了以后用户要滚很久才能找到当前步骤，
 * 也会让「哪一步没做完」变得不可读。这里把结构与互斥渲染锁死。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (p) => readFileSync(new URL(p, appRoot), 'utf8')
const view = readApp('views/narration/index.vue')
const api = readApp('composables/useApi.ts')

test('左侧是树形菜单：分区包含多个可点子项，并有选中/完成态', () => {
  assert.match(view, /<nav class="pipeline">/, '需要 pipeline 导航容器（与漫剧工作台同一语义）')
  assert.match(view, /class="pipe-section"/, '需要分区层级')
  assert.match(view, /class="pipe-section-label"/, '分区需要标题')
  assert.match(view, /v-for="item in sec\.items"/, '分区内需要子项列表')
  assert.match(view, /class="pipe-item"/, '子项可点击')
  assert.match(view, /:class="\{ active: activeNode === item\.key, done: nodeDone\(item\.key\) \}"/, '子项要有选中与完成态')
  assert.match(view, /@click="activeNode = item\.key"/, '点击子项切换当前节点')
})

test('三个分区覆盖创作/制作/导出，共 8 个子项', () => {
  for (const key of ['create', 'produce', 'export']) {
    assert.ok(view.includes(`label: t('narration.sections.${key}')`), `缺少分区 narration.sections.${key}`)
  }
  for (const node of ['brief', 'scripts', 'plan', 'images', 'clips', 'audio', 'export', 'merges']) {
    assert.ok(view.includes(`{ key: '${node}', label: t('narration.tree.${node}') }`), `树里缺少节点 ${node}`)
  }
  const nodes = view.match(/\{ key: '[a-z]+', label: t\('narration\.tree\./g) || []
  assert.equal(nodes.length, 8, `树节点数量应为 8，实际 ${nodes.length}`)
})

test('右侧是互斥单面板（v-if/v-else-if 链），不是把所有环节堆在一列', () => {
  const mains = view.slice(view.indexOf('<main class="ns-main">'), view.indexOf('</main>'))
  // 每个节点都有自己的 v-if / v-else-if 分支
  assert.match(mains, /<section v-if="activeNode === 'brief'"/)
  for (const node of ['scripts', 'plan', 'images', 'clips', 'audio', 'export']) {
    assert.ok(mains.includes(`<section v-else-if="activeNode === '${node}'"`), `${node} 面板应为 v-else-if 分支`)
  }
  // 最后一个面板用 v-else 兜底（成片列表），且**不允许**有无条件渲染的块（那就会变成瀑布流）
  const fallback = mains.match(/<section v-else class="card ns-card">/g) || []
  assert.equal(fallback.length, 1, `应恰好有 1 块 v-else 兜底，实际 ${fallback.length}`)
  const unconditional = mains.match(/<section class="card ns-card"/g) || []
  assert.equal(unconditional.length, 0, `不允许无条件渲染的面板块（瀑布流特征），实际 ${unconditional.length}`)
  // 面板总数 = 1(v-if) + 6(v-else-if) + 1(v-else) = 8
  const panels = mains.match(/<section (v-if|v-else-if|v-else)[ =]/g) || []
  assert.equal(panels.length, 8, `面板数应为 8，实际 ${panels.length}`)
})

test('各面板只出现一次（避免同一内容在多处重复堆叠）', () => {
  for (const marker of ['narration.brief.title', 'narration.scripts.title', 'narration.plan.title',
    'narration.images.title', 'narration.clips.title', 'narration.audio.title',
    'narration.export.title', 'narration.merges.title']) {
    const count = view.split(`t('${marker}')`).length - 1
    assert.equal(count, 1, `${marker} 应只在一个面板里出现，实际 ${count} 次`)
  }
})

test('子项徽标反映未完成量（让「哪一步没做完」一眼可见）', () => {
  assert.match(view, /function nodeBadge\(key\)/)
  // 徽标分子必须是数组长度：漏掉 .length 时数组会被插值成 "[object Object]…"（真实踩过）
  assert.match(view, /\$\{shotsWithImage\.value\.length\}\/\$\{shots\.value\.length\}/)
  assert.match(view, /\$\{shotsWithClip\.value\.length\}\/\$\{Math\.max\(0, shots\.value\.length - 1\)\}/)
  assert.match(view, /\$\{shotsWithAudio\.value\.length\}\/\$\{shots\.value\.length\}/)
  assert.doesNotMatch(view, /\$\{shotsWith(Image|Clip|Audio)\.value\}/, '徽标里不得直接插值数组')
  assert.match(view, /function sectionHasActive\(sec\)/)
  assert.match(view, /function sectionDone\(sec\)/)
})

test('生成中/失败的状态可见且可恢复（卡片进度契约）', () => {
  // 状态来自服务端任务（刷新后仍能恢复），而不是前端内存
  const route = readFileSync(new URL('../../backend/src/routes/narration.ts', import.meta.url), 'utf8')
  assert.match(route, /image_task: taskInfo\(r\.id, 'image'\)/, '镜头接口必须带出最新生图任务')
  assert.match(route, /clip_task: taskInfo\(r\.id, 'video'\)/, '镜头接口必须带出最新生视频任务')
  assert.match(route, /elapsed_sec: String\(t\.status\) === 'processing' \|\| String\(t\.status\) === 'pending' \? elapsed : null/,
    '处理中才累加已用时（任务表无百分比字段）')

  assert.match(view, /function imageState\(s\)/)
  assert.match(view, /if \(st === 'processing' \|\| st === 'pending'\) return 'generating'/)
  assert.match(view, /if \(st === 'failed' && !s\.keyframe_image\) return 'failed'/)
  // 生成中：覆盖层 + 已用时（每秒走时）+ 本卡片按钮禁用
  assert.match(view, /class="ns-thumb-progress"/)
  // 已用时长走 elapsedText（内部含「超过 2 小时视为可能中断」的封顶，避免显示成上千万秒）
  assert.match(view, /\{\{ elapsedText\(s\.image_task\) \}\}/)
  assert.match(view, /:disabled="busy\.images \|\| imageState\(s\) === 'generating'"/)
  assert.match(view, /const now = ref\(Date\.now\(\)\)/)
  assert.match(view, /setInterval\(\(\) => \{ now\.value = Date\.now\(\) \}, 1000\)/)
  // 失败：占位图位置显示错误原因 + 重试
  assert.match(view, /class="ns-thumb-error"/)
  assert.match(view, /s\.image_task\?\.error_msg \|\| t\('narration\.images\.failedUnknown'\)/)
  assert.match(view, /t\('narration\.images\.retry'\)/)
  // 轮询以「是否还有生成中」为准，全部结束后自动停止
  assert.match(view, /async function watchUntilIdle\(/)
  assert.match(view, /if \(!anyImageGenerating\.value && !anyClipGenerating\.value\) return/)
  // 片段面板同一套表达（播放区也走 elapsedText 封顶）
  assert.match(view, /\{\{ elapsedText\(activeClipView\.task\) \}\}/)
  assert.match(view, /const anyClipGenerating = computed/)
})

test('面板与后端能力对应：生图 / 首尾帧片段 / 逐句配音 / 合并导出', () => {
  // 关键帧图：写 first_frame，供后续做首帧
  assert.match(view, /frame_type: 'first_frame'/)
  // 片段：镜头 i 的关键帧 → 镜头 i+1 的关键帧（可被"选用候选图"覆盖，故走生效值）
  assert.match(view, /first_frame_url: effectiveFirstFrame\(p\)/)
  assert.match(view, /last_frame_url: effectiveLastFrame\(p\)/)
  assert.match(view, /function effectiveFirstFrame\(pair\) \{[\s\S]{0,140}?clip_first_frame \|\| pair\?\.shot\?\.keyframe_image/)
  assert.match(view, /const clipPairs = computed/)
  // 配音与合并走后端口播接口
  assert.match(api, /synthesize: \(dramaId: number, d: \{ shot_ids\?: number\[\]; speed\?: number;/)
  assert.match(api, /merge: \(dramaId: number, d: \{ shot_ids\?: number\[\]; include_audio\?: boolean;/)
  // 成片列表复用漫剧那套记录（同一张 video_merges 表）
  assert.match(view, /mergeAPI\.list\(episodeId\.value\)/)
  assert.match(view, /mergeAPI\.remove\(m\.id\)/)
})

test('树节点文案四种语言齐全', () => {
  const nodes = ['brief', 'scripts', 'plan', 'images', 'clips', 'audio', 'export', 'merges']
  const sections = ['create', 'produce', 'export']
  const states = ['pending', 'done', 'failed']
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const n = JSON.parse(readApp(`locales/${lang}.json`)).narration
    for (const key of nodes) assert.ok(n.tree?.[key], `${lang} 缺 narration.tree.${key}`)
    for (const key of sections) assert.ok(n.sections?.[key], `${lang} 缺 narration.sections.${key}`)
    for (const key of states) assert.ok(n.state?.[key], `${lang} 缺 narration.state.${key}`)
    for (const key of ['images', 'clips', 'audio', 'export', 'merges']) {
      assert.ok(n[key] && Object.keys(n[key]).length >= 5, `${lang} 的 narration.${key} 文案过少`)
    }
    assert.ok(n.plan?.needScript, `${lang} 缺 narration.plan.needScript`)
  }
})
