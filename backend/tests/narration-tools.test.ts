/**
 * 口播 Agent 的**工具层**行为测试（不经过 LLM）。
 *
 * 为什么要单独测工具：Agent 的一次真实调用依赖文本模型的账号/额度，
 * 而「工具是否把数据正确写进库、算数是否正确」是代码自身的契约，
 * 必须能在没有模型的情况下验证（也便于回归：写稿/分镜的口径不会被提示词改动带偏）。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huobao-ntools-'))
process.env.SQLITE_PATH = path.join(tmpDir, 'test.sqlite3')
process.env.MYSQL_AUTO_IMPORT = 'false'

const { narrationWriterTools, narrationPlannerTools } = await import('../src/agents/tools/narration-tools')
const { db, schema, getInsertId } = await import('../src/db/index')
const { eq } = await import('drizzle-orm')
const { saveNarrationBrief, planShots, DEFAULT_SPEECH_RATE } = await import('../src/services/narration')

/** 伪造 Mastra 的 RequestContext（工具只用到 .get） */
function ctx(values: Record<string, any>) {
  return { requestContext: { get: (k: string) => values[k] } } as any
}

const NOW = new Date().toISOString()

function makeProject(title = '口播工具测试', rate = DEFAULT_SPEECH_RATE) {
  const dramaId = getInsertId(db.insert(schema.dramas).values({
    title, projectType: 'narration', style: 'vox', createdAt: NOW, updatedAt: NOW,
  }).run())
  const episodeId = getInsertId(db.insert(schema.episodes).values({
    dramaId, episodeNumber: 1, title, status: 'draft', resolution: '720p', createdAt: NOW, updatedAt: NOW,
  }).run())
  return { dramaId, episodeId, rate }
}

const scriptsOf = (dramaId: number) => db.select().from(schema.narrationScripts).where(eq(schema.narrationScripts.dramaId, dramaId)).all()
const shotsOf = (episodeId: number) => db.select().from(schema.storyboards).where(eq(schema.storyboards.episodeId, episodeId)).all()

test('read_narration_brief：给出字数预算（1.1 倍）与已有版本', async () => {
  const { dramaId } = makeProject('简报测试')
  await saveNarrationBrief(dramaId, { topic: '为什么有人三分钟能讲清一件事', targetDurationSec: 60, speechRate: 1.1 })

  const out: any = await narrationWriterTools.readNarrationBrief.execute!({}, ctx({ dramaId }) as any)
  assert.equal(out.target_duration_sec, 60)
  assert.equal(out.speech_rate, 1.1)
  assert.equal(out.char_budget, 277, '60 秒 × 4.62 字/秒 ≈ 277 字')
  assert.deepEqual(out.existing_scripts, [])
  assert.ok(String(out.note).includes('4.2'), '应说明算数口径')

  // 缺 dramaId 时给出可读错误而不是抛异常
  const err: any = await narrationWriterTools.readNarrationBrief.execute!({}, ctx({}) as any)
  assert.match(String(err.error), /dramaId/)
})

test('save_narration_scripts：算出字数与时长、重跑只清未选定版本', async () => {
  const { dramaId } = makeProject('写稿测试')
  await saveNarrationBrief(dramaId, { topic: '主题', targetDurationSec: 60, speechRate: 1.1 })

  const versions = [
    { angle: '悬念式', title: '你以为的表达力', content: '你有没有发现，同样一件事，有人三分钟讲完。'.repeat(2) },
    { angle: '数据式', title: '三成的人卡在这里', content: '一项调查显示，三成的人讲不到重点。'.repeat(2) },
    { angle: '故事式', title: '那年他在电梯里', content: '电梯里只有三十秒，他先把结论说了出来。'.repeat(2) },
  ]
  const out: any = await narrationWriterTools.saveNarrationScripts.execute!({ scripts: versions }, ctx({ dramaId }) as any)
  assert.equal(out.saved.length, 3)
  assert.equal(out.char_budget, 277)

  let rows = scriptsOf(dramaId)
  assert.equal(rows.length, 3)
  for (const r of rows) {
    assert.ok(r.charCount! > 0, '字数必须由代码算出')
    assert.ok(Math.abs(r.estDurationSec! - r.charCount! / 4.62) < 0.05, '预计时长 = 字数 ÷ 4.62')
    assert.equal(r.isSelected, false)
  }
  assert.deepEqual([...rows.map(r => r.angle)].sort(), [...versions.map(v => v.angle)].sort())

  // 先选定一版：重跑写稿不得把它抹掉
  await db.update(schema.narrationScripts).set({ isSelected: true }).where(eq(schema.narrationScripts.id, rows[0].id))
  await narrationWriterTools.saveNarrationScripts.execute!({ scripts: versions.slice(0, 2) }, ctx({ dramaId }) as any)
  rows = scriptsOf(dramaId)
  assert.ok(rows.some(r => r.isSelected), '选定版本必须保留')
  assert.equal(rows.filter(r => !r.isSelected).length, 2, '未选定版本被替换为本次生成的 2 条')

  // replace_unselected = false 时追加
  await narrationWriterTools.saveNarrationScripts.execute!({ scripts: versions, replace_unselected: false }, ctx({ dramaId }) as any)
  assert.equal(scriptsOf(dramaId).length, rows.length + 3)
})

test('read_selected_narration：返回逐镜计划（时长=朗读+停顿）', async () => {
  const { dramaId } = makeProject('选定测试')
  await saveNarrationBrief(dramaId, { topic: '主题', targetDurationSec: 30, speechRate: 1.1 })
  const content = '第一句话大概十几个字。第二句话也是十几个字。第三句话同样十几个字。'
  getInsertId(db.insert(schema.narrationScripts).values({
    dramaId, versionIndex: 1, angle: '悬念式', title: 'T', content, charCount: content.length,
    estDurationSec: 0, isSelected: true, createdAt: NOW, updatedAt: NOW,
  }).run())

  const out: any = await narrationPlannerTools.readSelectedNarration.execute!({}, ctx({ dramaId }) as any)
  assert.equal(out.script.angle, '悬念式')
  assert.equal(out.speech_rate, 1.1)
  assert.ok(out.shot_plan.length >= 3, `至少 3 镜，实际 ${out.shot_plan?.length}`)
  for (const s of out.shot_plan) {
    assert.equal(typeof s.text, 'string')
    assert.ok(s.char_count > 0)
    assert.ok(s.duration_sec > 0)
  }
  // 与内核算出的计划一致（同一套口径）
  const expected = planShots(content, 30, 1.1)
  assert.equal(out.plan_total_sec, expected.totalSec)

  // 没选定时明确报错
  await db.update(schema.narrationScripts).set({ isSelected: false })
  const none: any = await narrationPlannerTools.readSelectedNarration.execute!({}, ctx({ dramaId }) as any)
  assert.match(String(none.error), /选定/)
})

test('save_narration_shots：写入关键帧提示词与旁白列，重跑整批替换', async () => {
  const { dramaId, episodeId } = makeProject('分镜测试')
  await saveNarrationBrief(dramaId, { topic: '主题', targetDurationSec: 30, speechRate: 1.1 })

  const shots = [
    { shot_number: 1, keyframe_prompt: '纸片拼贴风格，一个人站在白板前，中景，暖光', narration_text: '你有没有发现一件事。', video_prompt: '镜头缓慢推进', atmosphere: '清晨暖光' },
    { shot_number: 2, keyframe_prompt: '同一空间，白板上出现三个方框，近景', narration_text: '同样一件事，有人三分钟讲完。', duration_sec: 4.2 },
    { shot_number: 3, keyframe_prompt: '拉远，人物与白板同框，冷调', narration_text: '有人讲了半小时还在铺垫。' },
  ]
  const out: any = await narrationPlannerTools.saveNarrationShots.execute!({ shots }, ctx({ dramaId, episodeId }) as any)
  assert.equal(out.saved, 3)

  let rows = shotsOf(episodeId).filter(r => !r.deletedAt)
  assert.equal(rows.length, 3)
  rows.sort((a, b) => a.storyboardNumber - b.storyboardNumber)
  assert.equal(rows[0].imagePrompt, shots[0].keyframe_prompt)
  assert.equal(rows[0].narrationText, shots[0].narration_text)
  assert.equal(rows[0].videoPrompt, '镜头缓慢推进')
  // 未给 duration 的镜头由代码按 1.1 倍速算
  assert.ok(Math.abs(rows[0].narrationTargetDuration! - (rows[0].narrationText!.length / 4.62 + 0.25)) < 0.05)
  // 显式给了 duration 的镜头用给的值
  assert.equal(rows[1].narrationTargetDuration, 4.2)
  assert.equal(rows[1].duration, 4)

  // 整批重跑：旧行被软删，不留双份
  await narrationPlannerTools.saveNarrationShots.execute!({ shots: shots.slice(0, 1) }, ctx({ dramaId, episodeId }) as any)
  const alive = shotsOf(episodeId).filter(r => !r.deletedAt)
  assert.equal(alive.length, 1, '重跑后只保留本批镜头')
  assert.equal(shotsOf(episodeId).length, 4, '旧镜头是软删（保留行，便于追溯）')
})

test('update_narration_shot：改文本会同步重算时长', async () => {
  const { dramaId, episodeId } = makeProject('更新测试')
  await saveNarrationBrief(dramaId, { topic: '主题', targetDurationSec: 30, speechRate: 1.1 })
  await narrationPlannerTools.saveNarrationShots.execute!({
    shots: [{ shot_number: 1, keyframe_prompt: 'p', narration_text: '短句。' }],
  }, ctx({ dramaId, episodeId }) as any)

  const before = shotsOf(episodeId)[0]
  const upd: any = await narrationPlannerTools.updateNarrationShot.execute!({
    shot_number: 1, narration_text: '换成一句明显更长一些的旁白文本内容用于校验时长重算。',
  }, ctx({ dramaId, episodeId }) as any)
  assert.equal(upd.shot_number, 1)

  const after = shotsOf(episodeId)[0]
  assert.ok(after.narrationText!.length > before.narrationText!.length)
  assert.ok(after.narrationTargetDuration! > before.narrationTargetDuration!, '更长文本 → 更长目标时长')
  assert.ok(Math.abs(after.narrationTargetDuration! - (after.narrationText!.length / 4.62 + 0.25)) < 0.05)

  // 不存在的镜头号给出可读错误
  const miss: any = await narrationPlannerTools.updateNarrationShot.execute!({ shot_number: 99, narration_text: 'x' }, ctx({ dramaId, episodeId }) as any)
  assert.match(String(miss.error), /not found/i)
})
