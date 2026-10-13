/**
 * 项目类型决定入口：口播项目必须进口播工作台，漫剧项目必须进漫剧工作台。
 *
 * 真实故障：项目列表的 `getDramaPath()` 写死 `/drama/:id`，只有「创建后跳转」那条路径做了分流；
 * 于是口播项目第二次进入就变成漫剧控制台——漫剧流程里看不到任何口播数据（看起来像数据丢了），
 * 而漫剧的「分镜拆解 / AI 改写」会整批替换该集镜头，对口播项目等于毁数据。
 * 因此这里锁三层：列表分流、双向重定向守卫、后端多集取数。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(here, '../..', 'frontend/app')
const readApp = (p: string) => fs.readFileSync(path.join(appRoot, p), 'utf8')

const indexPath = readApp('pages/index.vue')
const detail = readApp('views/drama/detail.vue')
const episodeView = readApp('views/drama/episode.vue')
const narration = readApp('views/narration/index.vue')

test('项目列表按类型分流（重新进入也走对工作台）', () => {
  assert.match(indexPath, /function getDramaPath\(d\) \{[\s\S]{0,200}?d\?\.project_type === 'narration' \? `\/narration\/\$\{d\.id\}` : `\/drama\/\$\{d\.id\}`/,
    'getDramaPath 必须按 project_type 分流')
  assert.doesNotMatch(indexPath, /function getDramaPath\(d\) \{\s*return `\/drama\/\$\{d\.id\}`\s*\}/,
    '不得再写死 /drama/:id')
  // 创建后跳转仍需分流
  assert.match(indexPath, /navigateTo\(d\.project_type === 'narration' \? `\/narration\/\$\{d\.id\}` : `\/drama\/\$\{d\.id\}`\)/)
})

test('漫剧两处入口都有守卫：发现口播项目就送走（不显示漫剧流水线、不触碰数据）', () => {
  // 详情页
  assert.match(detail, /if \(d\?\.project_type === 'narration'\) \{[\s\S]{0,120}?navigateTo\(`\/narration\/\$\{dramaId\}`, \{ replace: true \}\)/,
    'detail.vue 需重定向口播项目')
  // 集工作台（真正会改数据的地方）
  assert.match(episodeView, /if \(d\?\.project_type === 'narration'\) \{[\s\S]{0,200}?navigateTo\(`\/narration\/\$\{dramaId\}`, \{ replace: true \}\)/,
    'episode.vue 需重定向口播项目（否则分镜拆解会整批替换口播镜头）')
})

test('口播工作台反向守卫：漫剧项目不得停在口播工作台', () => {
  assert.match(narration, /if \(d && d\.project_type && d\.project_type !== 'narration'\) \{[\s\S]{0,120}?navigateTo\(`\/drama\/\$\{dramaId\}`, \{ replace: true \}\)/)
})

test('口播工作台取集更稳：优先装了口播镜头的那一集', () => {
  assert.match(narration, /const withShots = listed\?\.episode_id/)
  assert.match(narration, /episodeId\.value = \(withShots && eps\.some\(e => e\.id === withShots\) \? withShots : eps\[0\]\?\.id\) \?\? null/)
})

test('后端 requireEpisode：多集时选镜头最多的那一集（而非盲取第一集）', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-ep-pick-'))
  process.env.SQLITE_PATH = path.join(tmpDir, 'test.sqlite3')
  process.env.MYSQL_AUTO_IMPORT = 'false'
  const { default: narrationRoute } = await import('../src/routes/narration')
  const { db, schema, getInsertId } = await import('../src/db/index')

  const ts = new Date().toISOString()
  const dramaId = getInsertId(db.insert(schema.dramas).values({
    title: '多集取数测试', projectType: 'narration', createdAt: ts, updatedAt: ts,
  }).run())
  // 先建一个空集（模拟从漫剧侧误建），再建一个真正装了镜头的集
  const emptyEp = getInsertId(db.insert(schema.episodes).values({
    dramaId, episodeNumber: 1, title: '空集', resolution: '720p', createdAt: ts, updatedAt: ts,
  }).run())
  const shotEp = getInsertId(db.insert(schema.episodes).values({
    dramaId, episodeNumber: 2, title: '有镜头', resolution: '720p', createdAt: ts, updatedAt: ts,
  }).run())
  for (let i = 1; i <= 3; i++) {
    getInsertId(db.insert(schema.storyboards).values({
      episodeId: shotEp, storyboardNumber: i, imagePrompt: `p${i}`,
      narrationText: `第${i}句。`, createdAt: ts, updatedAt: ts,
    }).run())
  }

  const res = await narrationRoute.request(`/${dramaId}/shots`)
  assert.equal(res.status, 200)
  const data = (await res.json() as any).data
  assert.equal(data.episode_id, shotEp, '应选中装了口播镜头的那一集，而不是第一集')
  assert.equal(data.shots.length, 3)
  assert.ok(data.episode_id !== emptyEp)
})
