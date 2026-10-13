/**
 * 视图 SFC 必须能被 @vue/compiler-sfc 编译通过。
 *
 * 真实事故：口播工作台里写了 TS 泛型 `reactive<Record<number, string>>({})`，
 * 但该文件的 `<script setup>` 是 **JS**（没有 lang="ts"）——
 * 结果 Vite 编译失败，整个前端白屏（登录页都渲染不出来），
 * 而当时所有结构测试（只做正则匹配源码）全部通过，完全没拦住。
 *
 * 本测试直接调用编译器的 parse + compileScript + compileTemplate，
 * 语法/模板错误会立刻失败，属于"最便宜的前置防线"。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { parse, compileScript, compileTemplate } = require('vue/compiler-sfc')

const appRoot = new URL('../app/', import.meta.url)

/** 递归收集需要编译的 .vue 文件（views / pages / components） */
function collectVue(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = new URL(name, dir)
    const st = statSync(full)
    if (st.isDirectory()) collectVue(new URL(`${name}/`, dir), out)
    else if (name.endsWith('.vue')) out.push(full)
  }
  return out
}

const files = [
  ...collectVue(new URL('views/', appRoot)),
  ...collectVue(new URL('pages/', appRoot)),
  ...collectVue(new URL('components/', appRoot)),
]

test('收集到需要编译的视图文件', () => {
  assert.ok(files.length >= 12, `收集到的 .vue 文件太少（${files.length}），目录结构可能变了`)
})

test('每个 .vue 都能被 Vue 编译器编译通过（语法 + 模板）', () => {
  const failures = []
  for (const file of files) {
    const path = file.pathname.replace(/^\//, '')
    const src = readFileSync(file, 'utf8')
    const { descriptor, errors } = parse(src, { filename: path })
    if (errors.length) {
      failures.push(`${path} 解析错误：${errors.map(e => e.message).join(' | ')}`)
      continue
    }
    try {
      const script = compileScript(descriptor, { id: 'test' })
      if (descriptor.template) {
        const tpl = compileTemplate({
          source: descriptor.template.content,
          filename: path,
          id: 'test',
          compilerOptions: { bindingMetadata: script.bindings },
        })
        if (tpl.errors.length) {
          failures.push(`${path} 模板错误：${tpl.errors.map(e => e.message || e).join(' | ')}`)
        }
      }
    } catch (e) {
      failures.push(`${path} 编译抛错：${e.message}`)
    }
  }
  assert.deepEqual(failures, [], `以下文件无法编译（前端会白屏）：\n${failures.join('\n')}`)
})

test('JS 版 script setup 里不得出现 TS 语法（本次事故的直接原因）', () => {
  const offenders = []
  /** 去掉注释后再检查：否则「说明这个坑」的注释本身会被误判 */
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\/[^\n"'`]*$/gm, '')
  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    const isJs = /<script setup(?!\s+lang="ts")[^>]*>/.test(src)
    if (!isJs) continue
    const body = stripComments(src.slice(src.indexOf('<script setup')))
    const name = file.pathname.split('/app/')[1] || file.pathname
    // 常见的 TS-only 写法：泛型调用、类型注解、as 断言、interface/type
    if (/\b(reactive|ref|computed|shallowRef)<[A-Za-z]/.test(body)) offenders.push(`${name}：泛型调用`)
    if (/^const\s+\w+:\s*[A-Z]/m.test(body)) offenders.push(`${name}：类型注解`)
    if (/\bas\s+(string|number|any|Record|Array)\b/.test(body)) offenders.push(`${name}：as 断言`)
    if (/^\s*(interface|type)\s+\w+/m.test(body)) offenders.push(`${name}：类型声明`)
  }
  assert.deepEqual(offenders, [], `JS 版 script setup 里出现 TS 语法：\n${offenders.join('\n')}`)
})
