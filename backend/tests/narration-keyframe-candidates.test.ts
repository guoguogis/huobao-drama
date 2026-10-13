/**
 * 关键帧保留多张候选 + 片段首尾帧可从候选中选用。
 *
 * 为什么必须持久化"选用了哪两张"：
 * 关键帧会随重绘不断累积候选，用户为某一段挑的首帧/尾帧如果不落库，
 * 刷新页面就丢了，生成出来的片段和看到的画面会对不上。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-kf-multi-'))
process.env.SQLITE_PATH = path.join(tmpDir, 'test.sqlite3')
process.env.MYSQL_AUTO_IMPORT = 'false'

const { default: narrationRoute } = await import('../src/routes/narration')
const { db, schema, getInsertId } = await import('../src/db/index')
const { eq } = await import('drizzle-orm')

const ts = new Date().toISOString()
let seq = 0
const addTask = (shotId: number, dramaId: number, type: string, localPath: string | null, status = 'completed') =>
  getInsertId(db.insert(schema.sysTask).values({
    type, storyboardId: shotId, dramaId, prompt: 'p', model: type === 'image' ? 'gpt-image-2' : 'MiniMax-H3',
    provider: 'openai', params: JSON.stringify({ resolution: '1024x1024', duration: 5 }),
    status, localPath, createdAt: new Date(Date.now() + (seq++) * 1000).toISOString(), updatedAt: ts,
  }).run())

async function setup(shotCount = 2) {
  const dramaId = getInsertId(db.insert(schema.dramas).values({
    title: `多图候选 ${Math.random()}`, projectType: 'narration', createdAt: ts, updatedAt: ts,
  }).run())
  const epId = getInsertId(db.insert(schema.episodes).values({
    dramaId, episodeNumber: 1, title: 'ep', resolution: '720p', createdAt: ts, updatedAt: ts,
  }).run())
  const shots = []
  for (let i = 1; i <= shotCount; i++) {
    shots.push(getInsertId(db.insert(schema.storyboards).values({
      episodeId: epId, storyboardNumber: i, imagePrompt: `p${i}`, narrationText: `第${i}句。`,
      firstFrameImage: `static/images/current${i}.png`, duration: 4, createdAt: ts, updatedAt: ts,
    }).run()))
  }
  return { dramaId, epId, shots }
}

test('镜头接口带出多张候选关键帧（新→旧，且不只一张）', async () => {
  const { dramaId, shots } = await setup(1)
  addTask(shots[0], dramaId, 'image', 'static/images/a1.png')
  addTask(shots[0], dramaId, 'image', 'static/images/a2.png')
  addTask(shots[0], dramaId, 'image', 'static/images/a3.png')
  addTask(shots[0], dramaId, 'image', null, 'processing')   // 没成品不进候选

  const data = (await (await narrationRoute.request(`/${dramaId}/shots`)).json() as any).data
  const shot = data.shots[0]
  assert.equal(shot.keyframe_history.length, 3, '三张成品图都应保留为候选')
  assert.deepEqual(shot.keyframe_history.map((k: any) => k.path),
    ['static/images/a3.png', 'static/images/a2.png', 'static/images/a1.png'], '按时间新→旧')
  assert.equal(shot.keyframe_history[0].model, 'gpt-image-2')
  assert.equal(shot.keyframe_history[0].resolution, '1024x1024')
})

test('设为当前关键帧：写回 first_frame_image（下游片段首帧默认取它）', async () => {
  const { dramaId, shots } = await setup(1)
  addTask(shots[0], dramaId, 'image', 'static/images/b1.png')
  const t2 = addTask(shots[0], dramaId, 'image', 'static/images/b2.png')

  const res = await narrationRoute.request(`/${dramaId}/shots/${shots[0]}/keyframe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: t2 }),
  })
  assert.equal(res.status, 200)
  const [row] = await db.select().from(schema.storyboards).where(eq(schema.storyboards.id, shots[0]))
  assert.equal(row.firstFrameImage, 'static/images/b2.png')

  // 不属于该镜的图 / 没成品的图都要被拒
  const other = await setup(1)
  const foreign = addTask(other.shots[0], other.dramaId, 'image', 'static/images/x.png')
  const bad = await narrationRoute.request(`/${dramaId}/shots/${shots[0]}/keyframe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: foreign }),
  })
  assert.equal(bad.status, 400)
})

test('首尾帧选用落库，传空串恢复默认（跟随当前关键帧）', async () => {
  const { dramaId, shots } = await setup(2)
  const res = await narrationRoute.request(`/${dramaId}/shots/${shots[0]}/clip-frames`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ first_frame: 'static/images/pick-first.png', last_frame: 'static/images/pick-last.png' }),
  })
  assert.equal(res.status, 200)
  let data = (await (await narrationRoute.request(`/${dramaId}/shots`)).json() as any).data
  assert.equal(data.shots[0].clip_first_frame, 'static/images/pick-first.png')
  assert.equal(data.shots[0].clip_last_frame, 'static/images/pick-last.png')

  // 只清首帧，尾帧保留
  await narrationRoute.request(`/${dramaId}/shots/${shots[0]}/clip-frames`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ first_frame: '' }),
  })
  data = (await (await narrationRoute.request(`/${dramaId}/shots`)).json() as any).data
  assert.equal(data.shots[0].clip_first_frame, '')
  assert.equal(data.shots[0].clip_last_frame, 'static/images/pick-last.png')

  // 没有任何字段时拒绝
  const empty = await narrationRoute.request(`/${dramaId}/shots/${shots[0]}/clip-frames`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  })
  assert.equal(empty.status, 400)
})

test('删除候选图只删记录：当前关键帧指向的文件依然有效', async () => {
  const { dramaId, shots } = await setup(1)
  const keep = addTask(shots[0], dramaId, 'image', 'static/images/keep.png')
  const extra = addTask(shots[0], dramaId, 'image', 'static/images/extra.png')
  await narrationRoute.request(`/${dramaId}/shots/${shots[0]}/keyframe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: keep }),
  })
  const { default: tasksRoute } = await import('../src/routes/tasks')
  const del = await tasksRoute.request(`/${extra}`, { method: 'DELETE' })
  assert.equal(del.status, 200)
  const [row] = await db.select().from(schema.storyboards).where(eq(schema.storyboards.id, shots[0]))
  assert.equal(row.firstFrameImage, 'static/images/keep.png', '删候选不影响已选关键帧')
  const data = (await (await narrationRoute.request(`/${dramaId}/shots`)).json() as any).data
  assert.equal(data.shots[0].keyframe_history.length, 1)
})
