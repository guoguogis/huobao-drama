/**
 * 品牌资源生成脚本 —— 剧威视频创作平台 logo / 应用图标
 *
 * 标记概念：胶片即播放键。竖条是胶片、右侧是播放三角，二者不是拼接而是**同一个实心轮廓**；
 * 左侧三个齿孔是真实镂空（mask），透出底部渐变。
 *
 * 用法：cd backend && node scripts/build-brand-assets.mjs
 *
 * 产出（可重复执行，幂等覆盖）：
 * - frontend/app/assets/huobao-logo.png    512  界面侧栏（圆角瓦片）
 * - frontend/app/public/huobao-logo.png    512  公开副本
 * - frontend/app/public/icon-512.png       512  PWA / 站点图标
 * - frontend/app/public/icon-192.png       192
 * - frontend/app/public/favicon.png         32
 * - frontend/app/public/apple-touch-icon.png 180 满幅（iOS 自行加蒙版）
 * - desktop/assets/icon.ico                16/24/32/48/64/128/256（内嵌 PNG）
 * - desktop/assets/icon.icns               16/32/64/128/256/512/1024（内嵌 PNG）
 * - docs/brand/juwei-logo.svg              母版（圆角瓦片）
 * - docs/brand/juwei-mark.svg              单色标记（透明底，改 fill 即可换色）
 *
 * 依赖仅 sharp（backend 已装），ICO / ICNS 容器按规范手写，不引入额外依赖。
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')

/** 品牌橙渐变：与 studio.css 的 --accent 家族一致，略加深以提升白色标记的对比度 */
const GRADIENT = ['#ea580c', '#fbbf24']
/** 标记外轮廓：竖条 + 播放三角，单一闭合路径 */
const MARK_PATH = 'M146 128 H206 L388 256 L206 384 H146 A30 30 0 0 1 116 354 V158 A30 30 0 0 1 146 128 Z'
/** 齿孔位置（30×48，圆角 12） */
const HOLES = [{ x: 160, y: 166 }, { x: 160, y: 232 }, { x: 160, y: 298 }]
/** 瓦片圆角：116/512 ≈ 22.6%，与 iOS squircle 观感一致 */
const TILE_RADIUS = 116

const holesMarkup = HOLES.map(h => `<rect x="${h.x}" y="${h.y}" width="30" height="48" rx="12" fill="#000"/>`).join('')

const tileSvg = (radius) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="juwei-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GRADIENT[0]}"/>
      <stop offset="1" stop-color="${GRADIENT[1]}"/>
    </linearGradient>
    <mask id="juwei-holes">
      <rect width="512" height="512" fill="#fff"/>
      ${holesMarkup}
    </mask>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#juwei-g)"/>
  <path d="${MARK_PATH}" fill="#fff" mask="url(#juwei-holes)"/>
</svg>`

const markSvg = (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <mask id="juwei-holes-m">
      <rect width="512" height="512" fill="#fff"/>
      ${holesMarkup}
    </mask>
  </defs>
  <path d="${MARK_PATH}" fill="${color}" mask="url(#juwei-holes-m)"/>
</svg>`

const ROUNDED = Buffer.from(tileSvg(TILE_RADIUS))
const SQUARE = Buffer.from(tileSvg(0))
const raster = (svg, size) => sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer()

// ── 网页 / 界面资源 ───────────────────────────────────────────────
const webTargets = [
  ['frontend/app/assets/huobao-logo.png', ROUNDED, 512],
  ['frontend/app/public/huobao-logo.png', ROUNDED, 512],
  ['frontend/app/public/icon-512.png', ROUNDED, 512],
  ['frontend/app/public/icon-192.png', ROUNDED, 192],
  ['frontend/app/public/favicon.png', ROUNDED, 32],
  ['frontend/app/public/apple-touch-icon.png', SQUARE, 180],
]
for (const [rel, svg, size] of webTargets) {
  const buf = await raster(svg, size)
  writeFileSync(path.join(ROOT, rel), buf)
  console.log(`  ${rel.padEnd(44)} ${size}×${size}  ${(buf.length / 1024).toFixed(1)} KB`)
}

// ── ICO / ICNS 容器 ──────────────────────────────────────────────
const PNG_SIG = '89504e470d0a1a0a'

function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)
  let offset = 6 + entries.length * 16
  const dir = entries.map(e => {
    const b = Buffer.alloc(16)
    b.writeUInt8(e.size >= 256 ? 0 : e.size, 0)   // 0 表示 256
    b.writeUInt8(e.size >= 256 ? 0 : e.size, 1)
    b.writeUInt16LE(1, 4)                          // color planes
    b.writeUInt16LE(32, 6)                         // bits per pixel
    b.writeUInt32LE(e.data.length, 8)
    b.writeUInt32LE(offset, 12)
    offset += e.data.length
    return b
  })
  return Buffer.concat([header, ...dir, ...entries.map(e => e.data)])
}

function buildIcns(entries) {
  const body = Buffer.concat(entries.map(e => {
    const b = Buffer.alloc(8)
    b.write(e.type, 0, 4, 'ascii')
    b.writeUInt32BE(e.data.length + 8, 4)
    return Buffer.concat([b, e.data])
  }))
  const header = Buffer.alloc(8)
  header.write('icns', 0, 4, 'ascii')
  header.writeUInt32BE(body.length + 8, 4)
  return Buffer.concat([header, body])
}

const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const icoEntries = []
for (const size of icoSizes) icoEntries.push({ size, data: await raster(SQUARE, size) })
const icoBuf = buildIco(icoEntries)
writeFileSync(path.join(ROOT, 'desktop/assets/icon.ico'), icoBuf)
console.log(`  ${'desktop/assets/icon.ico'.padEnd(44)} ${icoSizes.join('/')}  ${(icoBuf.length / 1024).toFixed(1)} KB`)

// icns 的 PNG 类型编码：icp4=16 icp5=32 icp6=64 ic07=128 ic08=256 ic09=512 ic10=1024
const icnsTypes = [['icp4', 16], ['icp5', 32], ['icp6', 64], ['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024]]
const icnsEntries = []
for (const [type, size] of icnsTypes) icnsEntries.push({ type, data: await raster(SQUARE, size) })
const icnsBuf = buildIcns(icnsEntries)
writeFileSync(path.join(ROOT, 'desktop/assets/icon.icns'), icnsBuf)
console.log(`  ${'desktop/assets/icon.icns'.padEnd(44)} ${icnsTypes.map(t => t[1]).join('/')}  ${(icnsBuf.length / 1024).toFixed(1)} KB`)

// ── SVG 母版 ─────────────────────────────────────────────────────
mkdirSync(path.join(ROOT, 'docs/brand'), { recursive: true })
writeFileSync(path.join(ROOT, 'docs/brand/juwei-logo.svg'), tileSvg(TILE_RADIUS))
writeFileSync(path.join(ROOT, 'docs/brand/juwei-mark.svg'), markSvg('#ea580c'))
console.log(`  ${'docs/brand/juwei-logo.svg + juwei-mark.svg'.padEnd(44)} 母版`)

// ── 自检：容器结构 + 回读尺寸 ────────────────────────────────────
let failed = 0

const ico = readFileSync(path.join(ROOT, 'desktop/assets/icon.ico'))
let icoOk = ico.readUInt16LE(0) === 0 && ico.readUInt16LE(2) === 1
const icoCount = ico.readUInt16LE(4)
for (let i = 0; i < icoCount; i++) {
  const base = 6 + i * 16
  const len = ico.readUInt32LE(base + 8)
  const off = ico.readUInt32LE(base + 12)
  if (ico.subarray(off, off + 8).toString('hex') !== PNG_SIG) icoOk = false
  if (off + len > ico.length) icoOk = false
}
console.log(`\n  自检 ICO：${icoCount} 个尺寸全部为内嵌 PNG 且偏移合法 → ${icoOk ? '✓' : '✗'}`)
if (!icoOk) failed++

const icns = readFileSync(path.join(ROOT, 'desktop/assets/icon.icns'))
let icnsOk = icns.subarray(0, 4).toString('ascii') === 'icns' && icns.readUInt32BE(4) === icns.length
let p = 8
let icnsCount = 0
while (p < icns.length) {
  const len = icns.readUInt32BE(p + 4)
  if (len < 8 || p + len > icns.length) { icnsOk = false; break }
  if (icns.subarray(p + 8, p + 16).toString('hex') !== PNG_SIG) icnsOk = false
  icnsCount++
  p += len
}
console.log(`  自检 ICNS：${icnsCount} 个条目、总长一致且全部为内嵌 PNG → ${icnsOk ? '✓' : '✗'}`)
if (!icnsOk) failed++

for (const [rel, , size] of webTargets) {
  const meta = await sharp(path.join(ROOT, rel)).metadata()
  if (meta.width !== size || meta.height !== size) { console.log(`  ✗ ${rel} 尺寸异常`); failed++ }
}
console.log(failed === 0 ? '\n✅ 全部品牌资源已生成并自检通过' : `\n❌ ${failed} 项自检失败`)
process.exit(failed ? 1 : 0)
