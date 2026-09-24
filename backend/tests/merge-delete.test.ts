/**
 * 成片（拼接记录）删除：DELETE /merge/merges/:id
 *
 * 行为契约：
 * - 软删：video_merges.deleted_at 置位，成片列表接口不再返回该条
 * - 其他成片、其他剧集的成片不受影响
 * - 磁盘上的成片文件保留（只删记录，不删文件）
 * - 非法 / 不存在 / 已删除的 id 返回 400
 *
 * 用临时 SQLite（SQLITE_PATH）+ 直接调用 Hono 子应用，不碰真实库。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { eq } from 'drizzle-orm'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-merge-del-'))
process.env.SQLITE_PATH = path.join(tmpDir, 'test.sqlite3')
process.env.MYSQL_AUTO_IMPORT = 'false'   // 临时空库绝不允许触发 MySQL 自动迁移

const { default: mergeRoute } = await import('../src/routes/merge')
const { db, schema, getInsertId } = await import('../src/db/index')

const EP = 7

function insertMerge(episodeId: number, mergedUrl: string | null) {
  return getInsertId(db.insert(schema.videoMerges).values({
    episodeId,
    dramaId: 1,
    // provider / model 在表里是 NOT NULL
    provider: 'ffmpeg',
    model: 'ffmpeg',
    status: mergedUrl ? 'completed' : 'pending',
    mergedUrl,
    duration: 12,
    createdAt: new Date().toISOString(),
  }).run())
}

function rowOf(id: number) {
  return db.select().from(schema.videoMerges).where(eq(schema.videoMerges.id, id)).all()[0]
}

async function listMerges(episodeId: number) {
  const res = await mergeRoute.request(`/episodes/${episodeId}/merges`)
  assert.equal(res.status, 200)
  return ((await res.json()) as any).data as any[]
}

async function deleteMerge(id: number | string) {
  const res = await mergeRoute.request(`/merges/${id}`, { method: 'DELETE' })
  return { status: res.status, body: (await res.json()) as any }
}

test('删除成片：列表不再返回该条，其他成片与磁盘文件都不受影响', async () => {
  const keep = insertMerge(EP, 'static/videos/keep.mp4')
  const drop = insertMerge(EP, 'static/videos/drop.mp4')
  const otherEpisode = insertMerge(EP + 1, 'static/videos/other.mp4')
  // 未完成的拼接记录同样可以删
  const pending = insertMerge(EP, null)

  const file = path.join(tmpDir, 'drop.mp4')
  fs.writeFileSync(file, 'fake-mp4')

  assert.deepEqual((await listMerges(EP)).map(m => m.id).sort(), [keep, drop, pending].sort())

  const res = await deleteMerge(drop)
  assert.equal(res.status, 200)
  assert.equal(res.body.code, 200)
  assert.equal(res.body.data.id, drop)

  const remaining = (await listMerges(EP)).map(m => m.id)
  assert.ok(!remaining.includes(drop), '被删的成片不应再出现在列表里')
  assert.ok(remaining.includes(keep), '同一集的其它成片必须保留')
  assert.ok(remaining.includes(pending), '未完成的拼接记录同样保留')

  // 软删：行还在，只是 deleted_at 有值，其它字段不动
  const row = rowOf(drop) as any
  assert.ok(row, '记录应仍留在库里（软删而非物理删除）')
  assert.ok(row.deletedAt, 'deleted_at 应被置位')
  assert.equal(row.mergedUrl, 'static/videos/drop.mp4', '删除不应改动其它字段')
  assert.equal(row.status, 'completed')

  assert.ok(fs.existsSync(file), '磁盘上的成片文件应保留（后端只删记录）')
  assert.equal((await listMerges(EP + 1)).map(m => m.id)[0], otherEpisode, '其它剧集的成片不受影响')
})

test('重复删除 / 不存在的 id / 非法 id 都返回 400 且不误删', async () => {
  const id = insertMerge(EP + 2, 'static/videos/once.mp4')

  assert.equal((await deleteMerge(id)).status, 200)
  const twice = await deleteMerge(id)
  assert.equal(twice.status, 400, '已删除的成片不能再删一次')
  assert.match(twice.body.message, /不存在|已删除/)

  const missing = await deleteMerge(999999)
  assert.equal(missing.status, 400)
  assert.match(missing.body.message, /不存在/)

  for (const bad of ['abc', '0', '-3']) {
    const r = await deleteMerge(bad)
    assert.equal(r.status, 400, `${bad} 应被拒绝`)
    assert.match(r.body.message, /ID/)
  }

  // 兜底：所有插入的行都还在（没有任何一条被物理删除）
  const all = db.select().from(schema.videoMerges).all()
  assert.equal(all.length, 5, '删除接口只能软删，不能物理删行')
})
