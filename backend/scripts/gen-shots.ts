/**
 * 批量出图：读取 build-shotlist.py 产出的 shots.json，按镜号顺序生成。
 *
 * 用法：
 *   npx tsx scripts/gen-shots.ts --shots S07,S11,S21 --outdir <dir>
 *   npx tsx scripts/gen-shots.ts --shots all --outdir <dir>
 *   npx tsx scripts/gen-shots.ts --shots S07 --dry-run          # 只打印将提交的提示词
 *
 * 说明：
 *   - 顺序执行，避免并发冲击同一条链路；
 *   - 单张失败不中断整批，最后统一汇总；
 *   - 结果写 <outdir>/manifest.json（镜号 / 任务号 / 状态 / 文件路径）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db, schema } from '../src/db/index.js'
import { generateImage } from '../src/services/generation.js'
import { getAbsolutePath } from '../src/utils/storage.js'

const DEFAULT_MANIFEST =
  'D:\\code\\GitHub\\huobao-drama\\design-as-code\\prompts\\shots\\shots.json'

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf('--' + name)
  return i === -1 ? def : process.argv[i + 1]
}
const has = (name: string) => process.argv.includes('--' + name)

const TIMEOUT_MS = 5 * 60 * 1000

async function generateOne(
  shot: string,
  prompt: string,
  size: string,
  configId: number,
): Promise<{ shot: string; taskId?: number; status: string; file?: string; error?: string }> {
  const id = await generateImage({ prompt, size, configId })
  const started = Date.now()
  while (Date.now() - started < TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, 3000))
    const [row] = await db.select().from(schema.sysTask).where(eq(schema.sysTask.id, id))
    if (!row) continue
    if (row.status === 'completed') {
      return { shot, taskId: id, status: 'completed', file: getAbsolutePath(row.localPath!) as string }
    }
    if (row.status === 'failed') {
      return { shot, taskId: id, status: 'failed', error: row.errorMsg ?? 'unknown' }
    }
  }
  return { shot, taskId: id, status: 'timeout' }
}

async function main() {
  const manifestPath = arg('manifest', DEFAULT_MANIFEST)!
  const shotsArg = arg('shots', 'all')!
  const outdir = arg('outdir', 'D:\\code\\GitHub\\huobao-drama\\design-as-code\\images\\shots')!
  const size = arg('size', '1920x1080')!
  const configId = Number(arg('config', '8'))
  const dryRun = has('dry-run')

  const all: Record<string, string> = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const shots =
    shotsArg === 'all'
      ? Object.keys(all).sort()
      : shotsArg.split(',').map(s => s.trim()).filter(Boolean)

  console.log(`BATCH shots=${shots.length} config=${configId} size=${size} dryRun=${dryRun}`)
  fs.mkdirSync(outdir, { recursive: true })

  const results: Array<Record<string, unknown>> = []
  for (const shot of shots) {
    const prompt = all[shot]
    if (!prompt) {
      console.log(`[${shot}] SKIP missing prompt`)
      results.push({ shot, status: 'missing_prompt' })
      continue
    }
    if (dryRun) {
      console.log(`[${shot}] PROMPT_CHARS=${prompt.length}`)
      console.log(prompt)
      results.push({ shot, status: 'dry_run', promptChars: prompt.length })
      continue
    }
    console.log(`[${shot}] submit ...`)
    try {
      const r = await generateOne(shot, prompt, size, configId)
      if (r.status === 'completed' && r.file) {
        const dst = path.join(outdir, `${shot}.jpeg`)
        fs.copyFileSync(r.file, dst)
        console.log(`[${shot}] OK task=${r.taskId} -> ${dst}`)
        results.push({ shot, status: 'completed', taskId: r.taskId, file: dst })
      } else {
        console.log(`[${shot}] ${r.status.toUpperCase()} task=${r.taskId} ${r.error ?? ''}`)
        results.push({ shot, status: r.status, taskId: r.taskId, error: r.error })
      }
    } catch (err: any) {
      console.log(`[${shot}] ERROR ${err?.message || err}`)
      results.push({ shot, status: 'error', error: String(err?.message || err) })
    }
  }

  if (!dryRun) {
    const mf = path.join(outdir, 'manifest.json')
    fs.writeFileSync(mf, JSON.stringify(results, null, 2), 'utf8')
    const ok = results.filter(r => r.status === 'completed').length
    console.log(`BATCH_DONE ok=${ok} total=${results.length} manifest=${mf}`)
  }
}

main().catch(err => {
  console.error('FATAL=' + (err?.message || String(err)))
  process.exit(1)
})
