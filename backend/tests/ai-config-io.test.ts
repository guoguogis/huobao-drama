/**
 * AI 服务配置的导入 / 导出。
 *
 * 契约：
 * - 导出是「含明文 api_key 的完整快照」，字段与创建接口同口径（service_type/provider/name/base_url/api_key/model/priority/is_active/settings）
 * - 导入按「service_type + provider + name」upsert：命中则更新，否则新增；同一文件内重复键不会插出两行
 * - prune=true 时删除「文件里没有」的现有配置
 * - 非法条目跳过并回报（不因一条坏数据整体失败）；format / version / configs 结构错误直接 400
 *
 * 用临时 SQLite（SQLITE_PATH）+ 直接调用 Hono 子应用，不碰真实库。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-cfg-io-'))
process.env.SQLITE_PATH = path.join(tmpDir, 'test.sqlite3')
process.env.MYSQL_AUTO_IMPORT = 'false'

const { default: aiConfigsRoute } = await import('../src/routes/aiConfigs')
const { db, schema, getInsertId } = await import('../src/db/index')
const { eq } = await import('drizzle-orm')

const TS = '2026-01-01T00:00:00.000Z'

function insertCfg(over: Record<string, any> = {}) {
  return getInsertId(db.insert(schema.aiServiceConfigs).values({
    serviceType: 'text',
    provider: 'volcengine',
    name: 'cfg-a',
    baseUrl: 'https://ark.example.com',
    apiKey: 'sk-aaa',
    model: JSON.stringify(['doubao-a']),
    priority: 1,
    isActive: true,
    settings: JSON.stringify({ temperature: 0.7 }),
    createdAt: TS,
    updatedAt: TS,
    ...over,
  }).run())
}

const rows = () => db.select().from(schema.aiServiceConfigs).all()
const rowOf = (name: string) => rows().find(r => r.name === name)

async function exportAll() {
  const res = await aiConfigsRoute.request('/export')
  assert.equal(res.status, 200)
  return (await res.json() as any).data
}

async function importAll(body: any) {
  const res = await aiConfigsRoute.request('/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: (await res.json()) as any }
}

test('导出：含明文密钥的完整快照，字段与创建接口同口径', async () => {
  insertCfg({ name: 'cfg-a', apiKey: 'sk-aaa' })
  insertCfg({
    name: 'cfg-img', serviceType: 'image', provider: 'gemini',
    baseUrl: 'https://gemini.example.com', apiKey: 'sk-img',
    model: JSON.stringify(['gemini-3-pro-image']), priority: 5,
    settings: JSON.stringify({ temperature: 1.2 }), isActive: false,
  })

  const snap = await exportAll()
  assert.equal(snap.format, 'juwei-ai-configs')
  assert.equal(snap.version, 1)
  assert.equal(snap.count, 2)
  assert.equal(snap.configs.length, 2)
  assert.ok(snap.exported_at)

  const a = snap.configs.find((c: any) => c.name === 'cfg-a')
  assert.equal(a.api_key, 'sk-aaa', '导出必须带出明文密钥，否则换设备后无法复用')
  assert.equal(a.service_type, 'text')
  assert.equal(a.provider, 'volcengine')
  assert.equal(a.base_url, 'https://ark.example.com')
  assert.deepEqual(a.model, ['doubao-a'], 'model 必须是数组，而不是 JSON 字符串')
  assert.equal(a.is_active, true)
  assert.equal(a.settings.temperature, 0.7)

  const img = snap.configs.find((c: any) => c.name === 'cfg-img')
  assert.equal(img.is_active, false, '停用状态要一并带出')

  // 排序：按 service_type 归组（image 在 text 前）
  assert.deepEqual(snap.configs.map((c: any) => c.service_type), ['image', 'text'])
})

test('导入：同键更新、新键新增，不产生重复行', async () => {
  const before = rows().length

  // 1) 原样回灌：全部命中 → 全是更新
  const same = await importAll({ data: await exportAll() })
  assert.equal(same.status, 200)
  assert.equal(same.body.data.added, 0)
  assert.equal(same.body.data.updated, 2)
  assert.equal(rows().length, before, '回灌同键不应新增行')

  // 2) 改密钥 + 新增一条
  const res = await importAll({
    data: {
      format: 'juwei-ai-configs',
      version: 1,
      configs: [
        { service_type: 'text', provider: 'volcengine', name: 'cfg-a', base_url: 'https://ark.example.com', api_key: 'sk-NEW', model: ['doubao-a', 'doubao-b'], priority: 3, is_active: true, settings: { temperature: 0.2 } },
        { service_type: 'video', provider: 'minimax', name: 'cfg-video', base_url: 'https://api.minimaxi.com', api_key: 'sk-video', model: ['MiniMax-H3'] },
      ],
    },
  })
  assert.equal(res.body.data.added, 1)
  assert.equal(res.body.data.updated, 1)

  const a = rowOf('cfg-a')!
  assert.equal(a.apiKey, 'sk-NEW')
  assert.deepEqual(JSON.parse(a.model!), ['doubao-a', 'doubao-b'])
  assert.equal(a.priority, 3)
  assert.equal(JSON.parse(a.settings!).temperature, 0.2)
  assert.equal(rowOf('cfg-video')!.apiKey, 'sk-video')
})

test('导入：同一文件内重复键只留一行（后者更新前者）', async () => {
  const res = await importAll({
    data: {
      configs: [
        { service_type: 'audio', provider: 'minimax', name: 'dup', api_key: 'first', base_url: 'https://a' },
        { service_type: 'audio', provider: 'minimax', name: 'dup', api_key: 'second', base_url: 'https://b' },
      ],
    },
  })
  assert.equal(res.body.data.added, 1)
  assert.equal(res.body.data.updated, 1)
  const dup = rows().filter(r => r.name === 'dup')
  assert.equal(dup.length, 1)
  assert.equal(dup[0].apiKey, 'second')
  assert.equal(dup[0].baseUrl, 'https://b')
})

test('导入：非法条目跳过并回报，合法条目照常生效', async () => {
  const res = await importAll({
    data: {
      configs: [
        { provider: 'volcengine', name: 'no-type' },                                   // 缺 service_type
        { service_type: 'text', name: 'no-provider' },                                 // 缺 provider
        { service_type: 'text', provider: 'not-a-provider', name: 'bad-provider' },    // 非官方 provider
        { service_type: 'text', provider: 'volcengine', name: 'bad-temp', settings: { temperature: 9 } }, // 温度越界
        { service_type: 'text', provider: 'openai', name: 'ok', api_key: 'sk-ok' },    // 合法
      ],
    },
  })
  const d = res.body.data
  assert.equal(d.total, 5)
  assert.equal(d.skipped, 4)
  assert.equal(d.added, 1)
  assert.ok(d.errors.length >= 4, '应回报跳过的原因')
  assert.ok(rowOf('ok'))
  assert.equal(rowOf('bad-temp'), undefined)
  assert.equal(rowOf('bad-provider'), undefined)
})

test('导入：结构/格式/版本错误直接 400', async () => {
  const noConfigs = await importAll({ data: { format: 'juwei-ai-configs', version: 1 } })
  assert.equal(noConfigs.status, 400)
  assert.match(noConfigs.body.message, /configs/)

  const wrongFormat = await importAll({ data: { format: 'someone-else', configs: [] } })
  assert.equal(wrongFormat.status, 400)
  assert.match(wrongFormat.body.message, /format/)

  const tooNew = await importAll({ data: { format: 'juwei-ai-configs', version: 99, configs: [] } })
  assert.equal(tooNew.status, 400)
  assert.match(tooNew.body.message, /v99|升级/)

  // 也接受「直接传导出结构本身」（不带 data 包装）
  const bare = await importAll({ configs: [{ service_type: 'text', provider: 'openai', name: 'bare', api_key: 'sk-bare' }] })
  assert.equal(bare.status, 200)
  assert.equal(rowOf('bare')!.apiKey, 'sk-bare')
})

test('prune=true 删除文件里没有的配置；prune=false 时不动', async () => {
  const keep = 'cfg-a'
  const drop = 'cfg-video'
  assert.ok(rowOf(drop), '前置条件：drop 存在')

  // 不勾选 prune：只更新命中的那条，其余原样保留
  const beforeNoPrune = rows().length
  const noPrune = await importAll({
    data: { configs: [{ service_type: 'text', provider: 'volcengine', name: keep, api_key: 'sk-k' }] },
  })
  assert.equal(noPrune.body.data.pruned, 0)
  assert.equal(rows().length, beforeNoPrune, 'prune=false 不应删除任何配置')
  assert.ok(rowOf(drop))

  // 勾选 prune：只留文件里有的，其余全部删除
  const beforePrune = rows().length
  const withPrune = await importAll({
    data: { configs: [{ service_type: 'text', provider: 'volcengine', name: keep, api_key: 'sk-k' }] },
    prune: true,
  })
  assert.equal(withPrune.body.data.pruned, beforePrune - 1)
  assert.equal(rows().length, 1, 'prune 后只应剩下文件里的那一条')
  assert.ok(rowOf(keep), '文件里的配置必须保留')
  assert.equal(rowOf(drop), undefined, '文件里没有的配置应被删除')
})

test('往返：清库后用导出的快照可完整还原（含密钥与设置）', async () => {
  const snap = await exportAll()
  const snapshotRows = snapshot()

  function snapshot() {
    return rows().map(r => ({ name: r.name, serviceType: r.serviceType, provider: r.provider, apiKey: r.apiKey, baseUrl: r.baseUrl, model: r.model, settings: r.settings, isActive: r.isActive, priority: r.priority }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
  }

  // 清空后回灌
  await db.delete(schema.aiServiceConfigs)
  assert.equal(rows().length, 0)
  const res = await importAll({ data: snap })
  assert.equal(res.body.data.added, snap.configs.length)

  assert.deepEqual(snapshot(), snapshotRows, '还原后所有字段（含 api_key/settings）应与导出前一致')
})
