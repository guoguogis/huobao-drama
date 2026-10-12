/**
 * TTS 探针/试听：用项目已配置的音频服务合成一小段，落盘到指定路径。
 *
 * 用法：
 *   npx tsx scripts/tts-probe.ts --config 12 --voice 刘飞 --text "..." --out <path>
 *   npx tsx scripts/tts-probe.ts --config 12 --text "..." --out <path>   # 用配置默认音色
 *
 * 不经过 HTTP 路由，直接复用 services/adapters/tts.ts，因此不受登录态影响，
 * 且与线上走完全相同的一段代码（含错误翻译）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { getConfigById } from '../src/services/ai.js'
import { getTtsAdapter, TtsAudioUrlPending } from '../src/services/adapters/tts.js'
import { probeDurationSeconds } from '../src/utils/media-probe.js'

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf('--' + name)
  return i === -1 ? def : process.argv[i + 1]
}

const MIN_SECONDS = 2
const MAX_SECONDS = 10

async function main() {
  const configId = Number(arg('config', '12'))
  const voice = (arg('voice') || '').trim()
  const text = arg('text')
  const out = arg('out')
  const format = (arg('format', 'mp3') as 'mp3' | 'wav')
  const speed = Number(arg('speed', '1')) || 1

  if (!text) throw new Error('缺少 --text')
  if (text.length > 300) throw new Error(`文本 ${text.length} 字，超过 300 上限`)

  const config = await getConfigById(configId)
  if (!config) throw new Error(`配置 ${configId} 不存在`)
  console.log(`CONFIG=${configId} PROVIDER=${config.provider} MODEL=${config.model}`)
  console.log(`VOICE_ARG=${voice || '(用配置默认)'} TEXT_CHARS=${text.length}`)

  const adapter = getTtsAdapter(config.provider)
  let request
  try {
    request = adapter.buildSynthesizeRequest(config, { text, voiceId: voice, format, speed })
  } catch (e: any) {
    console.log('BUILD_ERROR=' + e.message)
    process.exit(2)
  }
  console.log('URL=' + request.url)

  const resp = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
    signal: AbortSignal.timeout(120_000),
  })
  const raw = await resp.text()
  console.log('HTTP=' + resp.status)
  if (!resp.ok) {
    console.log('RAW=' + raw.slice(0, 500))
    process.exit(1)
  }

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.log('NON_JSON=' + raw.slice(0, 300))
    process.exit(1)
  }

  let bytes: Buffer | null = null
  try {
    const audio = adapter.extractAudio(parsed, format)
    bytes = audio?.bytes ?? null
  } catch (e: any) {
    if (e instanceof TtsAudioUrlPending) {
      const dl = await fetch(e.audioUrl, { signal: AbortSignal.timeout(120_000) })
      bytes = Buffer.from(await dl.arrayBuffer())
    } else {
      console.log('EXTRACT_ERROR=' + e.message)
      console.log('RAW=' + JSON.stringify(parsed).slice(0, 500))
      process.exit(1)
    }
  }

  if (!bytes || !bytes.length) {
    console.log('NO_AUDIO keys=' + Object.keys(parsed).join(','))
    console.log('RAW=' + JSON.stringify(parsed).slice(0, 500))
    process.exit(1)
  }

  console.log('BYTES=' + bytes.length)
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true })
    fs.writeFileSync(out, bytes)
    console.log('SAVED_TO=' + out)
    // 本项目合成接口硬限制 2–10 秒，这里顺手报一下；试听本身不受限
    const dur = await probeDurationSeconds(out).catch(() => null)
    if (dur != null) {
      const flag = dur < MIN_SECONDS || dur > MAX_SECONDS ? '  << 超出 2–10 秒（仅影响走本项目合成接口，试听无碍）' : ''
      console.log(`DURATION=${dur.toFixed(2)}s${flag}`)
    }
  }
}

main().catch(err => {
  console.error('FATAL=' + (err?.message || String(err)))
  process.exit(1)
})
