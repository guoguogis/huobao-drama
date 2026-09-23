/**
 * 媒体时长探测。
 *
 * WAV 直接读 RIFF 头部算出时长（精确、不依赖外部二进制、不 spawn 进程）；
 * 其余格式（mp3）交给 ffprobe。探测不到时返回 null，由调用方决定是放行还是拒绝。
 */
import fs from 'fs'
import path from 'path'
import { ffmpeg, checkFfmpegSuite } from './ffmpeg.js'

/** 媒体时长（秒）；文件不存在、格式不支持、ffprobe 不可用都返回 null */
export async function probeDurationSeconds(absPath: string): Promise<number | null> {
  if (!fs.existsSync(absPath)) return null
  const wav = readWavDuration(absPath)
  if (wav !== null) return wav
  return ffprobeDuration(absPath)
}

/**
 * 从 RIFF 分块里找 fmt/data，用 `data 字节数 / byteRate` 算时长。
 * 必须按块遍历：真实 WAV 常在 data 之前夹 LIST/fact 等块，不能假定 data 紧跟 44 字节头。
 */
function readWavDuration(absPath: string): number | null {
  if (path.extname(absPath).toLowerCase() !== '.wav') return null
  let fd: number | null = null
  try {
    fd = fs.openSync(absPath, 'r')
    const size = fs.fstatSync(fd).size
    if (size < 44) return null

    const head = Buffer.alloc(12)
    fs.readSync(fd, head, 0, 12, 0)
    if (head.toString('latin1', 0, 4) !== 'RIFF' || head.toString('latin1', 8, 12) !== 'WAVE') return null

    let offset = 12
    let byteRate = 0
    while (offset + 8 <= size) {
      const chunk = Buffer.alloc(8)
      fs.readSync(fd, chunk, 0, 8, offset)
      const id = chunk.toString('latin1', 0, 4)
      const chunkSize = chunk.readUInt32LE(4)

      if (id === 'fmt ') {
        const fmt = Buffer.alloc(Math.min(chunkSize, 16))
        fs.readSync(fd, fmt, 0, fmt.length, offset + 8)
        if (fmt.length >= 12) byteRate = fmt.readUInt32LE(8)
      }
      if (id === 'data') {
        if (!byteRate) return null
        return chunkSize / byteRate
      }
      // 块按偶数字节对齐
      offset += 8 + chunkSize + (chunkSize % 2)
    }
    return null
  } catch {
    return null
  } finally {
    if (fd !== null) { try { fs.closeSync(fd) } catch { /* 忽略关闭失败 */ } }
  }
}

async function ffprobeDuration(absPath: string): Promise<number | null> {
  const suite = await checkFfmpegSuite()
  if (!suite.ffprobe) return null

  return new Promise((resolve) => {
    try {
      ffmpeg.ffprobe(absPath, (err, metadata) => {
        if (err) { resolve(null); return }
        const duration = Number(metadata?.format?.duration)
        resolve(Number.isFinite(duration) && duration > 0 ? duration : null)
      })
    } catch {
      // Windows 上 spawn 非 PE 二进制会同步抛 EFTYPE
      resolve(null)
    }
  })
}
