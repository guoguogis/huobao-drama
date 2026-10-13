/**
 * 口播项目的简报：建项目时就写入默认值，之后由「保存简报」覆盖。
 *
 * 为什么：简报是口播全链路的唯一参数来源（字数预算/逐镜时长/TTS 倍速）。
 * 只在代码里给默认值、记录里为空会出现两个问题：
 * 1) 项目卡片的「目标时长」显示不出来（它读的就是 metadata.narration）；
 * 2) 外部读取（脚本/迁移/排查）看到的项目是"没有参数"的，得先去界面点一次保存。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-brief-seed-'))
process.env.SQLITE_PATH = path.join(tmpDir, 'test.sqlite3')
process.env.MYSQL_AUTO_IMPORT = 'false'

const here = path.dirname(fileURLToPath(import.meta.url))
const { default: dramasRoute } = await import('../src/routes/dramas')
const { db, schema } = await import('../src/db/index')
const { eq } = await import('drizzle-orm')
const narration = await import('../src/services/narration')

const create = (body: any) => dramasRoute.request('/', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

test('新建口播项目：metadata.narration 直接带默认简报', async () => {
  const res = await create({ title: '口播种子测试', project_type: 'narration', aspect_ratio: '9:16' })
  assert.equal(res.status, 201)
  const drama = (await res.json() as any).data
  const [row] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, drama.id))

  assert.ok(row.metadata, 'metadata 不能为空')
  const brief = JSON.parse(row.metadata!).narration
  assert.equal(brief.targetDurationSec, 60)
  assert.equal(brief.speechRate, narration.DEFAULT_SPEECH_RATE)
  assert.equal(brief.aspectRatio, '9:16', '画幅要跟随创建时选的画幅')
  assert.equal(brief.clipWithAudio, false)
  assert.equal(brief.topic, '')

  // 读取接口应当直接返回这份默认值
  const briefRes = await narration.readNarrationBrief(drama.id)
  assert.equal(briefRes.targetDurationSec, 60)
})

test('新建漫剧项目：不写口播简报；显式 metadata 优先', async () => {
  const dramaRes = await create({ title: '漫剧种子测试', project_type: 'drama' })
  const drama = (await dramaRes.json() as any).data
  const [row] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, drama.id))
  assert.equal(row.metadata, null, '漫剧项目不应被塞入口播简报')

  // 调用方显式传 metadata 时原样尊重（不覆盖）
  const explicitRes = await create({ title: '口播显式 metadata', project_type: 'narration', metadata: JSON.stringify({ custom: 1 }) })
  const explicit = (await explicitRes.json() as any).data
  const [row2] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, explicit.id))
  assert.equal(JSON.parse(row2.metadata!).custom, 1)
  assert.equal(JSON.parse(row2.metadata!).narration, undefined)
})

test('口播项目仍会自动建唯一一集（与简报种子互不影响）', async () => {
  const res = await create({ title: '口播建集测试', project_type: 'narration' })
  const drama = (await res.json() as any).data
  const eps = await db.select().from(schema.episodes).where(eq(schema.episodes.dramaId, drama.id))
  assert.equal(eps.length, 1)
})
