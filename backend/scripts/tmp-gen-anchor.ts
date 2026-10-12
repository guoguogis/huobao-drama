/**
 * 一次性脚本：为「设计即代码」视频生成 S00 风格锚点图。
 * 复用项目自身已配置的图片链路（不传任何业务实体 ID，因此不回写业务表）。
 */
import { eq } from 'drizzle-orm'
import { db, schema } from '../src/db/index.js'
import { generateImage } from '../src/services/generation.js'

const PROMPT = [
  'hand-drawn whiteboard marker sketch illustration, single-panel explainer diagram,',
  'off-white textured paper background, bold uneven black ink outlines, diagonal hatching shading,',
  'palette limited to black plus cobalt blue and warm orange accents,',
  'clean centered composition, generous negative space, 16:9, no text no letters no words no numbers;',
  'subject: a single hand holding a marker drawing a simple UI wireframe rectangle on a blank whiteboard,',
  'with a small palette of swatches and a ruler beside it',
].join(' ')

const TIMEOUT_MS = 5 * 60 * 1000

async function main() {
  // configId=8：控制台按量（volcengine / doubao-seedream-5-0-flash-260915），
  // 即 sys_task 历史成功任务所用的那条配置；默认的 active 配置是 Agent Plan，其密钥当前 401。
  const id = await generateImage({ prompt: PROMPT, size: '1920x1080', configId: 8 })
  console.log('TASK_ID=' + id)

  const started = Date.now()
  while (Date.now() - started < TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, 3000))
    const [row] = await db.select().from(schema.sysTask).where(eq(schema.sysTask.id, id))
    if (!row) continue
    if (row.status === 'completed') {
      console.log('STATUS=completed')
      console.log('MODEL=' + row.model)
      console.log('LOCAL_PATH=' + row.localPath)
      console.log('RESULT_URL=' + row.resultUrl)
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
