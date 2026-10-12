/**
 * merge-videos.mjs — 无依赖视频拼接参考实现（Node 18+，仅用 node:child_process / node:fs / node:path）
 *
 * 与 huobao-drama 现有实现的区别：
 *   1. 逐段归一化（scale+pad+fps+setsar 视频；aresample+aformat 音频），因此混分辨率/混采样率的素材不会破损；
 *   2. 无音轨片段自动垫静音（anullsrc），避免 concat 滤镜因缺音轨而失败；
 *   3. 用 spawn 直接跑 ffmpeg，不引入 fluent-ffmpeg（移植到别的项目只需带一个 ffmpeg 二进制）。
 *
 * CLI: node merge-videos.mjs <out.mp4> <clip1> <clip2> [...]
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/** 跑一个子进程；返回 { code, stdout, stderr }（stderr 会累积，便于出错时给出真实原因） */
export function run(bin, args, { timeoutMs = 0 } = {}) {
  return new Promise((resolve) => {
    let child
    try {
      child = spawn(bin, args, { windowsHide: true })
    } catch (err) {
      // Windows 上 spawn 非 PE 文件（下载损坏的 .exe）会同步抛 EFTYPE
      resolve({ code: -1, stdout: '', stderr: `spawn failed: ${err.message}` })
      return
    }
    let stdout = ''
    let stderr = ''
    let timer = null
    if (timeoutMs > 0) timer = setTimeout(() => { try { child.kill('SIGKILL') } catch {} }, timeoutMs)
    child.stdout?.on('data', d => { stdout += d })
    child.stderr?.on('data', d => { stderr += d })
    child.on('error', err => { clearTimeout(timer); resolve({ code: -1, stdout, stderr: stderr + err.message }) })
    child.on('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr }) })
  })
}

const probed = new Map()

/** 探测二进制可用性（-version）；结果缓存，失败不缓存（修好二进制无需重启进程） */
export async function checkBinary(bin) {
  if (probed.get(bin)) return true
  if (!bin || !fs.existsSync(bin)) return false
  const r = await run(bin, ['-version'], { timeoutMs: 10_000 })
  if (r.code === 0) probed.set(bin, true)
  return r.code === 0
}

/** 探测单段媒体规格：分辨率/帧率/是否含音轨/采样率/声道/时长 */
export async function probeStreams(ffprobePath, file) {
  const r = await run(ffprobePath, [
    '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,sample_rate,channels',
    '-show_entries', 'format=duration', '-of', 'json', file,
  ])
  if (r.code !== 0) throw new Error(`ffprobe 失败：${r.stderr.trim().slice(0, 200)}`)
  const info = JSON.parse(r.stdout)
  const v = (info.streams || []).find(s => s.codec_type === 'video') || {}
  const a = (info.streams || []).find(s => s.codec_type === 'audio') || null
  const [num, den] = String(v.r_frame_rate || '0/1').split('/').map(Number)
  return {
    duration: Number(info.format?.duration) || 0,
    width: Number(v.width) || 0,
    height: Number(v.height) || 0,
    fps: den ? num / den : 0,
    hasAudio: !!a,
    sampleRate: Number(a?.sample_rate) || 0,
    channels: Number(a?.channels) || 0,
  }
}

/**
 * 拼接多段视频为一条成片（逐段归一化后 concat）。
 *
 * @param {object} o
 * @param {string[]} o.clips    输入视频绝对路径（按期望顺序）
 * @param {string}   o.output   输出 mp4 绝对路径
 * @param {string}   o.ffmpegPath
 * @param {string}   o.ffprobePath
 * @param {number}   [o.width=1280] @param {number} [o.height=720] @param {number} [o.fps=24]
 * @param {number}   [o.sampleRate=48000] @param {number} [o.crf=23] @param {string} [o.preset='medium']
 * @param {boolean}  [o.poster=false]  是否同时抽 0.5s 海报帧
 * @returns {Promise<{duration:number, poster:string|null, video:{duration:number}, audio:number}>}
 */
export async function mergeVideos({
  clips, output, ffmpegPath, ffprobePath,
  width = 1280, height = 720, fps = 24, sampleRate = 48000, crf = 23, preset = 'medium', poster = false,
}) {
  if (!clips?.length) throw new Error('没有可拼接的片段')
  for (const c of clips) if (!fs.existsSync(c)) throw new Error(`片段文件不存在：${c}`)
  if (!(await checkBinary(ffmpegPath))) throw new Error(`ffmpeg 不可用：${ffmpegPath}`)
  if (!(await checkBinary(ffprobePath))) throw new Error(`ffprobe 不可用：${ffprobePath}`)

  // 逐段探测：拿到规格 + 判断是否需要垫静音
  const metas = []
  for (const c of clips) metas.push(await probeStreams(ffprobePath, c))

  const args = ['-y']
  for (const c of clips) args.push('-i', c)
  // 无音轨片段：额外接一个 anullsrc 输入（时长对齐该段），保证 concat 的 a 轨完整
  const silentIndex = new Map()
  let extraInputs = 0
  for (let i = 0; i < clips.length; i++) {
    if (metas[i].hasAudio) continue
    const dur = Math.max(0.1, metas[i].duration)
    args.push('-f', 'lavfi', '-t', dur.toFixed(3), '-i', `anullsrc=channel_layout=stereo:sample_rate=${sampleRate}`)
    silentIndex.set(i, clips.length + extraInputs)
    extraInputs++
  }

  const chains = []
  const pairs = []
  for (let i = 0; i < clips.length; i++) {
    chains.push(
      `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps}[v${i}]`,
    )
    const aSrc = metas[i].hasAudio ? `[${i}:a]` : `[${silentIndex.get(i)}:a]`
    chains.push(`${aSrc}aresample=${sampleRate},aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`)
    pairs.push(`[v${i}][a${i}]`)
  }
  const filter = `${chains.join(';')};${pairs.join('')}concat=n=${clips.length}:v=1:a=1[v][a]`

  fs.mkdirSync(path.dirname(output), { recursive: true })
  args.push(
    '-filter_complex', filter, '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-ar', String(sampleRate), '-b:a', '192k',
    '-movflags', '+faststart', output,
  )

  const started = Date.now()
  const r = await run(ffmpegPath, args)
  if (r.code !== 0 || !fs.existsSync(output)) {
    const tail = r.stderr.split('\n').filter(Boolean).slice(-4).join(' | ')
    throw new Error(`ffmpeg 拼接失败(code=${r.code})：${tail.slice(0, 400)}`)
  }

  let posterPath = null
  if (poster) {
    posterPath = output.replace(/\.[^./]+$/, '_poster.jpg')
    const pr = await run(ffmpegPath, ['-y', '-ss', '0.5', '-i', output, '-frames:v', '1', '-vf', 'scale=640:-1', posterPath])
    if (pr.code !== 0) posterPath = null
  }

  const out = await probeStreams(ffprobePath, output)
  const audioDur = await run(ffprobePath, ['-v', 'error', '-select_streams', 'a:0',
    '-show_entries', 'stream=duration', '-of', 'default=noprint_wrappers=1:nokey=1', output])
  return {
    duration: out.duration,
    video: { duration: out.duration, width: out.width, height: out.height, fps: out.fps },
    audio: Number(String(audioDur.stdout).trim()) || 0,
    poster: posterPath,
    elapsedMs: Date.now() - started,
  }
}

// ── CLI ──────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const [out, ...clips] = process.argv.slice(2)
  const ffmpegPath = process.env.FFMPEG_BIN
    || path.join(process.cwd(), 'backend/node_modules/ffmpeg-static/ffmpeg.exe')
  const ffprobePath = process.env.FFPROBE_BIN
    || path.join(process.cwd(), 'backend/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe')
  const res = await mergeVideos({ clips, output: out, ffmpegPath, ffprobePath, poster: true })
  console.log(JSON.stringify(res, null, 1))
}
