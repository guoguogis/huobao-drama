/**
 * 复用项目已配置图片链路出图（不传业务实体 ID，因此不回写业务表）。
 *
 * 用法：
 *   npx tsx scripts/gen-image.ts --prompt-file <path> [--out <path>] [--size 1920x1080] [--config 8]
 *   npx tsx scripts/gen-image.ts --prompt "...."      [--out <path>] [--size 1920x1080] [--config 8]
 *
 * 说明：默认 config=8（控制台按量 / doubao-seedream-5-0-flash-260915）；
 * 默认 active 配置是 Agent Plan，其密钥当前 401，故显式指定，可用 --config 覆盖。
 */
import fs from 'node:fs'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db, schema } from '../src/db/index.js'
import { generateImage } from '../src/services/generation.js'
import { getAbsolutePath } from '../src/utils/storage.js'

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf('--' + name)
  return i === -1 ? def : process.argv[i + 1]
}

const TIMEOUT_MS = 5 * 60 * 1000

async function main() {
  const promptFile = arg('prompt-file')
  const prompt = (promptFile ? fs.readFileSync(promptFile, 'utf8') : arg('prompt') || '').trim()
  if (!prompt) throw new Error('缺少提示词：用 --prompt-file <path> 或 --prompt "..."')

  const size = arg('size', '1920x1080')!
  const configId = Number(arg('config', '8'))
  const out = arg('out')

  console.log('PROMPT_CHARS=' + prompt.length)
  const id = await generateImage({ prompt, size, configId })
  console.log('TASK_ID=' + id)

  const started = Date.now()
  while (Date.now() - started < TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, 3000))
    const [row] = await db.select().from(schema.sysTask).where(eq(schema.sysTask.id, id))
    if (!row) continue
    if (row.status === 'completed') {
      const abs = getAbsolutePath(row.localPath!) as string
      console.log('STATUS=completed')
      console.log('MODEL=' + row.model)
      console.log('LOCAL_PATH=' + abs)
      if (out) {
        fs.mkdirSync(path.dirname(out), { recursive: true })
        fs.copyFileSync(abs, out)
        console.log('SAVED_TO=' + out)
      }
      process.exit(0)
    }
    if (row.status === 'failed') {
      console.log('STATUS=failed')
      console.log('ERROR=' + row.errorMsg)
      process.exit(1)
    }
    console.log('POLL=' + row.status)
  }
  console.log('STATUS=timeout')
  process.exit(2)
}

main().catch(err => {
  console.error('FATAL=' + (err?.message || String(err)))
  process.exit(1)
})
