import assert from 'node:assert/strict'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import { initSqliteSchema } from '../src/db/sqlite-schema'

const columnNames = (db: Database.Database, table: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name)

test('已有数据的旧表：initSqliteSchema 补上新列且不丢数据', () => {
  const db = new Database(':memory:')
  // 模拟「老库」：characters 表建立时还没有 voice_audio_url 这一列
  db.exec(`CREATE TABLE characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drama_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`)
  db.prepare('INSERT INTO characters (drama_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(1, '老角色', 't0', 't0')

  initSqliteSchema(db)

  assert.ok(columnNames(db, 'characters').includes('voice_audio_url'),
    'CREATE TABLE IF NOT EXISTS 不会补列，必须由 ensureColumns 补上')
  assert.ok(columnNames(db, 'characters').includes('voice_audio_duration'),
    '音色样本时长列同样要能补到老库上')
  const row = db.prepare('SELECT name, voice_audio_url, voice_audio_duration FROM characters WHERE id = 1').get() as any
  assert.equal(row.name, '老角色', '补列不能影响既有数据')
  assert.equal(row.voice_audio_url, null, '新列在旧行上应为 NULL（= 未设置音色）')
  assert.equal(row.voice_audio_duration, null, '时长列在旧行上也应为 NULL')

  db.close()
})

test('插值幂等：重复执行 initSqliteSchema 不报错、不重复补列', () => {
  const db = new Database(':memory:')
  initSqliteSchema(db)
  const before = columnNames(db, 'characters')
  initSqliteSchema(db) // 第二次
  assert.deepEqual(columnNames(db, 'characters'), before)
  db.close()
})

test('全新库：建表即含 voice_audio_url / voice_audio_duration，可读写', () => {
  const db = new Database(':memory:')
  initSqliteSchema(db)
  assert.ok(columnNames(db, 'characters').includes('voice_audio_url'))
  assert.ok(columnNames(db, 'characters').includes('voice_audio_duration'))

  db.prepare('INSERT INTO characters (drama_id, name, voice_audio_url, voice_audio_duration, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(1, '新角色', 'static/uploads/voice.mp3', 3.25, 't', 't')
  const row = db.prepare('SELECT voice_audio_url, voice_audio_duration FROM characters WHERE name = ?').get('新角色') as any
  assert.equal(row.voice_audio_url, 'static/uploads/voice.mp3')
  assert.equal(row.voice_audio_duration, 3.25)

  // 清空音色（回退到模型自己配音）
  db.prepare('UPDATE characters SET voice_audio_url = NULL, voice_audio_duration = NULL WHERE name = ?').run('新角色')
  const cleared = db.prepare('SELECT voice_audio_url, voice_audio_duration FROM characters WHERE name = ?').get('新角色') as any
  assert.equal(cleared.voice_audio_url, null)
  assert.equal(cleared.voice_audio_duration, null)
  db.close()
})
