/**
 * 关键帧图片支持点击放大预览。
 *
 * 缩略图只有两百多像素宽，看不清构图层次与画面文字，而口播关键帧正是要逐镜审的东西；
 * 预览必须：点击缩略图打开、支持适应窗口/原始尺寸、能在镜头间前后翻看、Esc 关闭且不干扰输入框。
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const appRoot = new URL('../app/', import.meta.url)
const readApp = (p) => readFileSync(new URL(p, appRoot), 'utf8')
const view = readApp('views/narration/index.vue')

test('缩略图可点开预览，且有可点提示（不能只有 hover 才知道）', () => {
  // 关键帧面板
  assert.match(view, /@click="s\.keyframe_image && openImagePreview\(s\)"/)
  assert.match(view, /@keydown\.enter\.prevent="s\.keyframe_image && openImagePreview\(s\)"/)
  assert.match(view, /'is-zoomable': !!s\.keyframe_image/)
  assert.match(view, /class="ns-thumb-zoom"/, '需要放大角标')
  // 片段面板的参考帧（首帧/尾帧）也要能放大（检查器里是可点缩略图）
  assert.match(view, /v-for="ref in clipRefFrames\(selectedClipPair\)"/)
  assert.match(view, /@click="openImagePreview\(selectedClipPair\.shot, ref\.src\)"/)
})

test('预览浮层：Teleport 到 body、适应窗口/原始尺寸、前后翻看、无图不参与翻页', () => {
  assert.match(view, /<Teleport to="body">/, '浮层要挂到 body，避免被滚动容器裁剪')
  assert.match(view, /v-if="preview"/)
  assert.match(view, /class="ns-lightbox"/)
  assert.match(view, /@click\.self="closePreview"/, '点遮罩关闭')
  assert.match(view, /:class="preview\.zoom"/)
  assert.match(view, /\.ns-lightbox-body\.fit img \{[\s\S]{0,120}?object-fit: contain/)
  assert.match(view, /\.ns-lightbox-body\.actual img \{ max-width: none; max-height: none; display: block; \}/)
  assert.match(view, /function togglePreviewZoom\(\)/)
  assert.match(view, /preview\.value\.zoom === 'fit' \? 'actual' : 'fit'/)
  // 画廊只含真正有图的镜头；非关键帧（尾帧）单独放大时 total=1（不翻页）
  assert.match(view, /const gallery = shots\.value\.filter\(s => !!s\.keyframe_image\)/)
  assert.match(view, /total: idx < 0 \? 1 : gallery\.length/)
  assert.match(view, /function stepPreview\(delta\)/)
  assert.match(view, /:disabled="preview\.index <= 0"/)
  assert.match(view, /:disabled="preview\.index >= preview\.total - 1"/)
})

test('键盘交互：Esc 关闭、左右翻页，且卸载时移除监听', () => {
  assert.match(view, /function onPreviewKey\(e\) \{[\s\S]{0,200}?if \(e\.key === 'Escape'\)/)
  assert.match(view, /if \(e\.key === 'ArrowLeft'\) \{ e\.preventDefault\(\); stepPreview\(-1\); return \}/)
  assert.match(view, /if \(e\.key === 'ArrowRight'\) \{ e\.preventDefault\(\); stepPreview\(1\) \}/)
  assert.match(view, /if \(!preview\.value\) return/, '未打开预览时不得拦截键盘')
  assert.match(view, /window\.addEventListener\('keydown', onPreviewKey\)/)
  assert.match(view, /window\.removeEventListener\('keydown', onPreviewKey\)/)
})

test('预览文案四种语言齐全', () => {
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const pv = JSON.parse(readApp(`locales/${lang}.json`)).narration?.preview
    assert.ok(pv, `${lang} 缺 narration.preview`)
    for (const key of ['title', 'hint', 'fit', 'actual', 'open', 'close', 'prev', 'next']) {
      assert.equal(typeof pv[key], 'string', `${lang} 缺 narration.preview.${key}`)
      assert.ok(pv[key].trim().length > 0)
    }
  }
})
