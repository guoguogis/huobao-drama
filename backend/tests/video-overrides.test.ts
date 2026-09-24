/**
 * 导出选片覆盖表的校验（纯函数，不碰 DB）。
 * 重点：绝对不能接受任意本地路径——该值会直接交给 ffmpeg 读取。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseVideoOverrides } from '../src/utils/video-overrides'

test('空值一律视为「未指定」，不报错', () => {
  assert.deepEqual(parseVideoOverrides(undefined), {})
  assert.deepEqual(parseVideoOverrides(null), {})
  assert.deepEqual(parseVideoOverrides({}), {})
  // 值为空的键会被忽略（前端取消选择时可能留下空串）
  assert.deepEqual(parseVideoOverrides({ 3: '' }), {})
  assert.deepEqual(parseVideoOverrides({ 3: '   ' }), {})
})

test('接受站内 static/ 相对路径，并按分镜 id 归一化为数字键', () => {
  const parsed = parseVideoOverrides({
    '1': 'static/videos/a.mp4',
    2: 'static/uploads/b.mp4',
  })
  assert.equal(parsed.error, undefined)
  assert.deepEqual(parsed.overrides, {
    1: 'static/videos/a.mp4',
    2: 'static/uploads/b.mp4',
  })
})

test('拒绝绝对路径与越权路径（否则等于任意文件读取）', () => {
  for (const bad of [
    '/etc/passwd',
    'C:/Windows/win.ini',
    'D:\\secret.mp4',
    'static/../../etc/passwd',
    'static/videos/../../../secret.mp4',
    'file:///etc/passwd',
    'videos/a.mp4',            // 非 static 前缀
    '/static/videos/a.mp4',    // 前导斜杠会被 toAbsPath 当绝对路径
  ]) {
    const parsed = parseVideoOverrides({ 1: bad })
    assert.ok(parsed.error, `${bad} 应当被拒绝`)
    assert.equal(parsed.overrides, undefined)
    assert.match(parsed.error!, /static\//)
  }
})

test('键非法（非数字 / 非正数）时明确报错', () => {
  for (const key of ['abc', '0', '-1']) {
    const parsed = parseVideoOverrides({ [key]: 'static/videos/a.mp4' })
    assert.ok(parsed.error, `键 ${key} 应当被拒绝`)
    assert.match(parsed.error!, /分镜 id/)
  }
})

test('非对象入参（数组 / 字符串）报错而不是静默忽略', () => {
  for (const bad of [['static/videos/a.mp4'], 'static/videos/a.mp4', 42]) {
    const parsed = parseVideoOverrides(bad)
    assert.ok(parsed.error, `${JSON.stringify(bad)} 应当被拒绝`)
    assert.equal(parsed.overrides, undefined)
  }
})

test('部分键非法时整体拒绝，不产生「部分生效」的静默行为', () => {
  const parsed = parseVideoOverrides({ 1: 'static/videos/ok.mp4', 2: '/etc/passwd' })
  assert.ok(parsed.error)
  assert.equal(parsed.overrides, undefined)
})
