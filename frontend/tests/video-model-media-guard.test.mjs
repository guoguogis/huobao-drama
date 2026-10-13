/**
 * 视频模型与素材模式的匹配守卫。
 *
 * 背景（真实故障）：阿里云 TokenPlan 配置的模型清单第一项是 happyhorse-1.1-t2v，
 * 工作台未显式选择模型时就会取用它；而工作台的视频生成**总会**下发分镜绑定的参考图，
 * t2v 不接受任何 media → 适配器在发请求前拒绝，任务直接 failed（无上游费用，但白等一轮）。
 *
 * 契约：
 * - 点击生成前就判断「模型族 vs 是否有参考素材」，不匹配则不发请求并给出可执行提示
 * - 提示里给出一键替换为参考生视频模型（happyhorse-*-r2v）的入口
 * - 批量生成先过滤掉不可生成的镜头，避免"提示已开始但一个都没跑"
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const episode = readFileSync(new URL('../app/views/drama/episode.vue', import.meta.url), 'utf8')
const readLocale = (lang) => JSON.parse(readFileSync(new URL(`../app/locales/${lang}.json`, import.meta.url), 'utf8'))

test('预检函数按模型族判定素材兼容性', () => {
  assert.match(episode, /function videoModelMediaIssue\(sb\)/)
  // t2v 有参考图 → 报错；i2v 工作台不支持首帧；r2v 没参考图 → 报错
  assert.match(episode, /lower\.includes\('-i2v'\)\) return t\('episode\.vid\.modelNeedsFirstFrame'/)
  assert.match(episode, /lower\.includes\('-t2v'\) && refs\) return t\('episode\.vid\.modelRejectsRefs'/)
  assert.match(episode, /lower\.includes\('-r2v'\) && !refs\) return t\('episode\.vid\.modelNeedsRefs'/)
  // 非 HappyHorse 模型不干预
  assert.match(episode, /if \(!lower\.startsWith\('happyhorse-'\)\) return ''/)
})

test('genVid 在发请求前拦下不匹配的模型', () => {
  const genVid = episode.slice(episode.indexOf('async function genVid('))
  const issueAt = genVid.indexOf('videoModelMediaIssue(sb)')
  const apiAt = genVid.indexOf('taskAPI.generate')
  assert.ok(issueAt > 0, 'genVid 必须做预检')
  assert.ok(apiAt > 0 && issueAt < apiAt, '预检必须在调用生成接口之前')
  assert.match(genVid.slice(issueAt, issueAt + 200), /toast\.error\(modelIssue\)\s*\n\s*return/)
})

test('提供一键切换到参考生视频模型', () => {
  assert.match(episode, /const referenceCapableModel = computed\(/)
  assert.match(episode, /includes\('-r2v'\)\)/)
  assert.match(episode, /function switchToReferenceCapableModel\(\)/)
  assert.match(episode, /videoModel\.value = target\.key/)
  // 检查器里的常驻提示 + 按钮
  assert.match(episode, /class="video-model-warn"/)
  assert.match(episode, /t\('episode\.vid\.switchModel', \{ model: referenceCapableModel\.model \}\)/)
})

test('批量生成会先过滤掉不可生成的镜头', () => {
  const batch = episode.slice(episode.indexOf('function confirmBatchVideos()'))
  assert.match(batch, /const targets = all\.filter\(sb => !videoModelMediaIssue\(sb\)\)/)
  assert.match(batch, /toast\.warning\(t\('episode\.vid\.batchSkipped'/)
  assert.match(batch, /if \(!targets\.length\) \{ toast\.error\(videoModelMediaIssue\(all\[0\]\)\); return \}/)
})

test('提示文案四种语言齐全且占位符正确', () => {
  const keys = ['modelRejectsRefs', 'modelNeedsRefs', 'modelNeedsFirstFrame', 'switchModel', 'modelSwitched', 'batchSkipped']
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const vid = readLocale(lang).episode.vid
    for (const k of keys) {
      assert.equal(typeof vid[k], 'string', `${lang} 缺 episode.vid.${k}`)
      assert.ok(vid[k].trim().length > 0, `${lang} 的 ${k} 不能为空`)
    }
    assert.ok(vid.modelRejectsRefs.includes('{model}') && vid.modelRejectsRefs.includes('{n}'), `${lang} modelRejectsRefs 占位符不全`)
    assert.ok(vid.switchModel.includes('{model}'), `${lang} switchModel 需要 {model}`)
    assert.ok(vid.modelSwitched.includes('{model}'), `${lang} modelSwitched 需要 {model}`)
    assert.ok(vid.batchSkipped.includes('{n}'), `${lang} batchSkipped 需要 {n}`)
  }
})
