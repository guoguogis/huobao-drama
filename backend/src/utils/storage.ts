/**
 * 文件存储工具 — 下载远程文件到本地
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { v4 as uuid } from 'uuid'
import { STORAGE_ROOT } from './paths.js'

/** 单次远程下载的总超时：不设超时时若连接挂起，任务会永远停在 processing */
const DOWNLOAD_TIMEOUT_MS = 300_000

/**
 * 下载远程文件到本地存储
 *
 * 扩展名不能只看 URL：部分网关返回的下载地址没有后缀（如 /v2/video_generation/<id>/download），
 * 落成 .bin 后静态服务会按 application/octet-stream 下发，浏览器直接拒绝播放。
 * 依次尝试 URL 后缀 → 响应 Content-Type → 魔数嗅探。
 */
export async function downloadFile(
  url: string,
  subDir: string,
  headers: Record<string, string> = {},
): Promise<string> {
  const dir = path.join(STORAGE_ROOT, subDir)
  fs.mkdirSync(dir, { recursive: true })

  const resp = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  })
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`)

  const buffer = Buffer.from(await resp.arrayBuffer())
  const filename = `${uuid()}${resolveDownloadExt(url, resp.headers.get('content-type'), buffer)}`
  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, buffer)

  // 返回相对路径（供 API 返回给前端）
  return `static/${subDir}/${filename}`
}

/** 下载响应的 Content-Type → 扩展名（覆盖生成产物会用到的媒体类型） */
const DOWNLOAD_MIME_EXT: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

function resolveDownloadExt(url: string, contentType: string | null, buffer: Buffer): string {
  const fromUrl = getExtFromUrl(url)
  if (fromUrl) return fromUrl

  const mime = (contentType || '').split(';')[0].trim().toLowerCase()
  if (DOWNLOAD_MIME_EXT[mime]) return DOWNLOAD_MIME_EXT[mime]

  return sniffExt(buffer) || '.bin'
}

/** 魔数嗅探：Content-Type 缺失或被网关统一写成 octet-stream 时兜底 */
function sniffExt(buffer: Buffer): string | null {
  const head = buffer.subarray(0, 16)
  if (head.length >= 12 && head.subarray(4, 8).toString('latin1') === 'ftyp') return '.mp4'
  if (head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return '.webm'
  if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png'
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return '.jpg'
  if (head.length >= 12 && head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') return '.webp'
  if (head.length >= 6 && head.subarray(0, 6).toString('latin1').startsWith('GIF8')) return '.gif'
  return null
}

/**
 * 保存上传的文件
 */
export async function saveUploadedFile(data: ArrayBuffer, subDir: string, originalName: string): Promise<string> {
  const dir = path.join(STORAGE_ROOT, subDir)
  fs.mkdirSync(dir, { recursive: true })

  const ext = path.extname(originalName) || '.bin'
  const filename = `${uuid()}${ext}`
  const filePath = path.join(dir, filename)

  fs.writeFileSync(filePath, Buffer.from(data))
  return `static/${subDir}/${filename}`
}

/** URL 路径里的扩展名；取不到时返回空串，交由 resolveDownloadExt 继续判断 */
function getExtFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const ext = path.extname(pathname)
    if (ext && ext.length <= 5) return ext
  } catch {}
  return ''
}

/**
 * 获取本地文件的绝对路径
 */
export function getAbsolutePath(relativePath: string): string {
  if (relativePath.startsWith('static/')) {
    return path.join(STORAGE_ROOT, '..', relativePath)
  }
  return path.join(STORAGE_ROOT, relativePath)
}

/**
 * 保存 Base64 编码的图片数据到本地存储
 * 用于 Gemini 等只返回 base64 数据的厂商
 */
export async function saveBase64Image(base64Data: string, mimeType: string, subDir: string): Promise<string> {
  const dir = path.join(STORAGE_ROOT, subDir)
  fs.mkdirSync(dir, { recursive: true })

  // 从 mimeType 推断文件扩展名
  const ext = mimeTypeToExt(mimeType)
  const filename = `${uuid()}${ext}`
  const filePath = path.join(dir, filename)

  const buffer = Buffer.from(base64Data, 'base64')
  fs.writeFileSync(filePath, buffer)

  return `static/${subDir}/${filename}`
}

/** 由图片相对路径推导缩略图路径：static/images/x.png → static/images/x_thumb.webp */
export function thumbPathFor(relativePath: string): string {
  return relativePath.replace(/\.[^./]+$/, '_thumb.webp')
}

/**
 * 为已落盘图片生成列表页缩略图（宽 400 WebP，与原图同目录）。
 * 失败（文件损坏/格式异常等）返回 null，不阻断主流程。
 */
export async function generateImageThumb(relativePath: string): Promise<string | null> {
  try {
    const thumbRel = thumbPathFor(relativePath)
    await sharp(getAbsolutePath(relativePath))
      .rotate()
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(getAbsolutePath(thumbRel))
    return thumbRel
  } catch (err) {
    console.warn(`[storage] 缩略图生成失败 ${relativePath}:`, (err as Error).message)
    return null
  }
}

export function readImageAsDataUrl(relativePath: string): string {
  const filePath = getAbsolutePath(relativePath)
  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mimeType = extToMimeType(ext)
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

export async function readImageAsCompressedDataUrl(
  relativePath: string,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
  } = {},
): Promise<string> {
  return compressImageAsDataUrl(getAbsolutePath(relativePath), options)
}

/**
 * 参考素材（音频/视频）的 MIME。
 * 上游对 dataURL 的格式 token 要求小写（方舟：`data:audio/<格式>;base64,`），
 * 这里用标准 MIME，不做转码——音频重编码会损失音色参考价值。
 */
const MEDIA_EXT_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
}

export function mediaMimeType(relativePath: string): string {
  return MEDIA_EXT_MIME[path.extname(relativePath).toLowerCase()] || 'application/octet-stream'
}

/** 本地素材字节数；文件不存在时抛错（由调用方决定是回退还是报错） */
export function mediaFileSize(relativePath: string): number {
  return fs.statSync(getAbsolutePath(relativePath)).size
}

/**
 * data URI 的 media type。
 *
 * mp3 的格式 token 存在两种写法，两家上游文档都只写作「`data:audio/<格式>`（小写）」，未给出 mp3 的例子：
 * - `audio/mpeg`：注册 MIME 子类型，符合 RFC 2397，且与图片链路一致
 *   （本地图一律内联成 `data:image/jpeg`，与源文件扩展名无关，已被方舟接受）
 * - `audio/mp3`：按扩展名写，贴合「<格式> 小写」的字面表述
 *
 * 默认 MIME；若上游对音频回 400 抱怨格式，设 `MEDIA_AUDIO_DATA_URI_FORMAT=extension` 切换，
 * 无需改代码。
 */
function mediaDataUriMediaType(relativePath: string, mime: string): string {
  if ((process.env.MEDIA_AUDIO_DATA_URI_FORMAT || '').trim().toLowerCase() !== 'extension') return mime
  const ext = path.extname(relativePath).toLowerCase().replace(/^\./, '')
  return `${mime.split('/')[0]}/${ext}`
}

/** 读本地素材并内联为 dataURL。体积上限由调用方（media-ref）把关 */
export function readMediaAsDataUrl(relativePath: string): string {
  const buffer = fs.readFileSync(getAbsolutePath(relativePath))
  const mediaType = mediaDataUriMediaType(relativePath, mediaMimeType(relativePath))
  return `data:${mediaType};base64,${buffer.toString('base64')}`
}

/**
 * 下载远程图片并压缩为 data URL（远程参考图归一化，供 multipart/base64 上传类厂商使用）
 */
export async function fetchImageAsCompressedDataUrl(
  url: string,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
  } = {},
): Promise<string> {
  const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!resp.ok) throw new Error(`下载参考图失败: HTTP ${resp.status}`)
  return compressImageAsDataUrl(Buffer.from(await resp.arrayBuffer()), options)
}

/** sharp 输入 → 压缩 JPEG data URL（本地路径与远程下载共享同一压缩管线） */
async function compressImageAsDataUrl(
  input: string | Buffer,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
  } = {},
): Promise<string> {
  const maxWidth = options.maxWidth ?? 768
  const maxHeight = options.maxHeight ?? 768
  const quality = options.quality ?? 68

  const resized = sharp(input).rotate().resize({
    width: maxWidth,
    height: maxHeight,
    fit: 'inside',
    withoutEnlargement: true,
  })
  const metadata = await resized.metadata()
  const output = metadata.hasAlpha
    ? await resized.flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true }).toBuffer()
    : await resized.jpeg({ quality, mozjpeg: true }).toBuffer()
  const mimeType = 'image/jpeg'
  return `data:${mimeType};base64,${output.toString('base64')}`
}

export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return {
    mimeType: match[1],
    data: match[2],
  }
}

function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  return map[mimeType] || '.png'
}

function extToMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  }
  return map[ext] || 'image/png'
}
