/**
 * 风格预设种子：逐条校验内容契约。
 *
 * 背景：预设 prompt 会作为**前缀**拼进角色/场景/道具的出图提示词（见 services/style-preset.ts），
 * 所以种子里写错一句话会污染所有生成图，必须在这里拦住。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { stylePresetSeeds } from '../src/db/sqlite-schema'

const byValue = (v: string) => stylePresetSeeds.find(s => s.value === v)

test('每条种子字段完整、value 合法、prompt 单行', () => {
  assert.ok(stylePresetSeeds.length > 0)
  for (const s of stylePresetSeeds) {
    assert.ok(s.name.trim().length > 0, `${s.value} 缺 name`)
    assert.ok(s.description.trim().length > 0, `${s.value} 缺 description`)
    assert.ok(s.prompt.trim().length > 0, `${s.value} 缺 prompt`)
    // 与 routes/stylePresets.ts 的 VALUE_PATTERN 同口径
    assert.match(s.value, /^[a-z0-9][a-z0-9-]*$/, `${s.value} 不是合法的风格 key`)
    // prompt 是被拼接的前缀，混入换行会破坏提示词结构
    assert.doesNotMatch(s.prompt, /\n/, `${s.value} 的 prompt 必须是单行`)
    // 与其它预设一致：必须以 avoid 收尾，约束画风跑偏
    assert.match(s.prompt, /avoid /, `${s.value} 的 prompt 缺少 avoid 约束`)
  }
})

test('排序号不重复（撞号会让预设顺序随机）', () => {
  const orders = stylePresetSeeds.map(s => s.sortOrder)
  assert.equal(new Set(orders).size, orders.length, `sortOrder 撞号：${orders.join(',')}`)
})

test('VOX 纸片拼贴预设保留了拼贴语言的关键要素', () => {
  const vox = byValue('vox')
  assert.ok(vox, '缺少 vox 预设')
  const p = vox!.prompt

  // 媒介与造型
  assert.match(p, /paper-collage/i)
  assert.match(p, /torn edges/i)
  // 分层与纸片投影
  assert.match(p, /foreground \/ subject \/ background depth/i)
  assert.match(p, /drop shadow/i)
  // 一主体 + 一辅助动作 + 一环境细节
  assert.match(p, /one focal subject with one supporting action and one environmental detail/i)
  // 信息图语汇
  assert.match(p, /process chains/i)
  assert.match(p, /cross-sections/i)
  assert.match(p, /counters/i)
  // 色板锚点（与 VOX 模板内置色一致）
  for (const hex of ['#071826', '#E8D6B8', '#A6723F', '#A33A2B', '#7EA7B8', '#F7F2E8', '#171512']) {
    assert.ok(p.includes(hex), `缺少色板锚点 ${hex}`)
  }
  // 文字不烧进素材（字幕/标签由后期渲染）
  assert.match(p, /no text rendered in the image/i)
  // 画质与禁忌
  assert.match(p, /crisp edges/i)
  assert.match(p, /watermark/i)
})

test('VOX 预设不得混入绿幕抠图规则（那是拼贴工程做遮罩用的，不是出图背景）', () => {
  const vox = byValue('vox')!
  assert.doesNotMatch(vox.prompt, /#00ff00/i)
  assert.doesNotMatch(vox.prompt, /green ?screen/i)
  // 同理不能要求纯平背景/无地面这类抠图约束
  assert.doesNotMatch(vox.prompt, /flat solid/i)
  // 其它预设也不应带绿幕规则
  for (const s of stylePresetSeeds) {
    assert.doesNotMatch(s.prompt, /#00ff00/i, `${s.value} 混入了绿幕抠图规则`)
  }
})
