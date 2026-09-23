import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')

test('volcengine video adapter only supports Seedance 2.0 models and reference mode only', () => {
  const adapter = read('src/services/adapters/volcengine-video.ts')

  // 模型白名单：仅 doubao-seedance-2-0-* 前缀
  assert.match(adapter, /SEEDANCE2_MODEL_PREFIX = 'doubao-seedance-2-0'/)
  assert.match(adapter, /startsWith\(SEEDANCE2_MODEL_PREFIX\)/)

  // 只保留多模态参考：其他模式分支与历史映射已清理
  assert.doesNotMatch(adapter, /mode === 'text'/)
  assert.doesNotMatch(adapter, /mode === 'first_frame'/)
  assert.doesNotMatch(adapter, /mode === 'first_last'/)
  assert.doesNotMatch(adapter, /LEGACY_MODE_MAP/)
  assert.doesNotMatch(adapter, /first_frame/)
  assert.doesNotMatch(adapter, /last_frame/)

  // 多模态 content 项角色
  assert.match(adapter, /role: 'reference_image'/)
  assert.match(adapter, /role: 'reference_video'/)
  assert.match(adapter, /role: 'reference_audio'/)

  // 素材上限 9/3/3、音频需视觉素材约束、至少一个素材或 prompt
  assert.match(adapter, /REF_LIMITS = \{ images: 9, videos: 3, audios: 3 \}/)
  assert.match(adapter, /参考音频需要至少 1 个参考图片或视频/)
  assert.match(adapter, /多模态参考模式需要至少一个参考素材或 prompt/)

  // generate_audio 可配置（默认开），时长支持 4-15 秒；分辨率随集固定（480p/720p，默认 720p）
  assert.match(adapter, /generate_audio:\s*record\.generateAudio/)
  assert.match(adapter, /Math\.min\(15, Math\.max\(4, parsed\)\)/)
  assert.match(adapter, /resolution: record\.resolution === '480p' \? '480p' : '720p'/)
})

test('video generation service resolves reference media and persists new fields', () => {
  const service = read('src/services/generation.ts')
  // 参考视频/音频的「上游可访问形式」已抽到 media-ref.ts：
  // 本地联调内联 Base64，服务器部署拼 PUBLIC_BASE_URL + 签名
  const mediaRef = read('src/services/media-ref.ts')

  assert.match(service, /from '\.\/media-ref\.js'/)
  assert.match(service, /resolveMediaRefs\(params\.referenceVideoUrls, 'video', record\.id\)/)
  assert.match(service, /resolveMediaRefs\(params\.referenceAudioUrls, 'audio', record\.id\)/)
  // 角色音色是可选增强：解析失败只跳过，不判整条任务失败
  assert.match(service, /resolveOptionalMediaRefs\(params\.characterVoiceUrls, 'audio', record\.id\)/)

  assert.match(mediaRef, /PUBLIC_BASE_URL/)
  assert.match(mediaRef, /MEDIA_REF_MODE/)
  assert.match(mediaRef, /MEDIA_INLINE_MAX_MB/)
  assert.match(mediaRef, /signMediaPath/)

  assert.match(service, /referenceVideoUrls: params\.referenceVideoUrls/)
  assert.match(service, /referenceAudioUrls: params\.referenceAudioUrls/)
  assert.match(service, /generateAudio: params\.generateAudio === false \? 0 : 1/)
  // 默认多模态参考模式
  assert.match(service, /referenceMode: params\.referenceMode \|\| 'reference'/)
  assert.doesNotMatch(service, /referenceMode: params\.referenceMode \|\| 'text'/)
  assert.doesNotMatch(service, /referenceMode: params\.referenceMode \|\| 'none'/)
})

test('video resolution is fixed per episode, editable, and locked into video tasks', () => {
  const episodes = read('src/routes/episodes.ts')
  const tasks = read('src/routes/tasks.ts')
  const service = read('src/services/generation.ts')

  // 创建集时固定（默认 720p，仅接受 480p/720p）
  assert.match(episodes, /\['480p', '720p', '1080p'\]\.includes\(body\.resolution\)/)
  // PUT 可修改，白名单校验
  assert.match(episodes, /'status', 'resolution'\]/)
  assert.match(episodes, /resolution 只支持 480p \/ 720p/)
  // 视频任务锁定集的分辨率（优先于请求体）
  assert.match(tasks, /episodeResolution = ep\.resolution/)
  assert.match(tasks, /resolution: episodeResolution \|\| videoBody!\.resolution/)
  // 服务落入 params 并传给适配器
  assert.match(service, /resolution: normalizeStoredVideoResolution\(params\.resolution\)/)
  assert.match(service, /resolution: params\.resolution,/)
})

test('upload route exposes validated video and audio endpoints', () => {
  const route = read('src/routes/upload.ts')
  // 音频的格式/体积/时长限制是上传侧与生成侧共用的唯一来源
  const audioLimits = read('src/utils/audio-limits.ts')

  assert.match(route, /app\.post\('\/video'/)
  assert.match(route, /app\.post\('\/audio'/)
  assert.match(route, /VIDEO_EXT = new Set\(\['\.mp4', '\.mov', '\.webm', '\.m4v'\]\)/)
  assert.match(route, /50 \* 1024 \* 1024/)

  // 参考音频仅 mp3 / wav，单文件 ≤10MB，单段 2–10 秒；多个角色说话 → 多段音色（上限按模型）
  assert.match(audioLimits, /AUDIO_EXT = new Set\(\['\.mp3', '\.wav'\]\)/)
  assert.match(audioLimits, /AUDIO_MAX_BYTES = 10 \* 1024 \* 1024/)
  assert.match(audioLimits, /AUDIO_MIN_SECONDS = 2/)
  assert.match(audioLimits, /AUDIO_MAX_SECONDS = 10/)
  assert.match(audioLimits, /AUDIO_MAX_CLIPS = 3/)
  assert.match(audioLimits, /AUDIO_MAX_CLIPS_WAN = 5/)
  assert.match(audioLimits, /export function audioMaxClipsFor/)
  assert.match(audioLimits, /REQUEST_BODY_MAX_BYTES = 64 \* 1024 \* 1024/)
  // 上传侧接上了格式/体积/时长校验，生成侧接上了段数/总量/请求体校验
  assert.match(route, /probeDurationSeconds\(absPath\)/)
  assert.match(route, /AUDIO_LIMITS_TEXT/)
  const service = read('src/services/generation.ts')
  assert.match(service, /assertAudioRefsWithinLimits/)
  assert.match(service, /audioMaxClipsFor\(model\)/)
  assert.match(service, /REQUEST_BODY_MAX_BYTES/)
})

test('tasks route validates reference-mode requirements for video tasks', () => {
  const route = read('src/routes/tasks.ts')

  // 统一任务入口：type 分派 image/video
  assert.match(route, /type 必须为 image 或 video/)
  assert.match(route, /generateImage\(\{/)
  assert.match(route, /generateVideo\(\{/)

  // 其他模式的校验已清理
  assert.doesNotMatch(route, /文生视频模式必须提供 prompt/)
  assert.doesNotMatch(route, /首帧模式必须提供 first_frame_url/)
  assert.doesNotMatch(route, /首尾帧模式必须同时提供/)
  // Wan 3.0 官方入参兼容层会把 input.media 归一到 first_frame_url/last_frame_url 等扁平字段

  // 多模态参考校验并固定 reference 模式
  assert.match(route, /参考素材超限：图片≤9、视频≤3、音频≤3/)
  assert.match(route, /参考音频需要至少 1 个参考图片或视频/)
  assert.match(route, /视频生成需要至少一个参考素材或 prompt/)
  assert.match(route, /referenceMode: 'reference'/)
  assert.match(route, /referenceVideoUrls: videoBody!\.reference_video_urls/)
  assert.match(route, /referenceAudioUrls: videoBody!\.reference_audio_urls/)
  assert.match(route, /generateAudio: videoBody!\.generate_audio/)
})

test('image/video generation tasks are unified into a single sys_task table', () => {
  const schema = read('src/db/schema.ts')
  const mysqlSchema = read('src/db/mysql-schema.ts')
  const envExample = read('.env.example')

  // sys_task：type 区分 image/video，生成参数收进 params(JSON)
  assert.match(schema, /export const sysTask = mysqlTable\('sys_task'/)
  assert.match(schema, /type: varchar\('type', \{ length: 16 \}\)\.notNull\(\)/)
  assert.match(schema, /params: text\('params'\)/)
  assert.match(schema, /resultUrl: text\('result_url'\)/)
  assert.match(schema, /localPath: text\('local_path'\)/)

  // 旧的 image_generations / video_generations 表定义与回填已移除
  assert.doesNotMatch(schema, /imageGenerations/)
  assert.doesNotMatch(schema, /videoGenerations/)
  assert.doesNotMatch(mysqlSchema, /CREATE TABLE IF NOT EXISTS image_generations/)
  assert.doesNotMatch(mysqlSchema, /CREATE TABLE IF NOT EXISTS video_generations/)
  assert.doesNotMatch(mysqlSchema, /column: 'reference_video_urls'/)

  // DDL 与旧表清理（不迁移历史）
  assert.match(mysqlSchema, /CREATE TABLE IF NOT EXISTS sys_task \(/)
  assert.match(mysqlSchema, /type VARCHAR\(16\) NOT NULL/)
  assert.match(mysqlSchema, /params TEXT/)
  assert.match(mysqlSchema, /result_url TEXT/)
  assert.match(mysqlSchema, /DROP TABLE IF EXISTS `image_generations`/)
  assert.match(mysqlSchema, /DROP TABLE IF EXISTS `video_generations`/)

  // 路由与服务只操作 sys_task（统一 /tasks 入口，type 过滤）
  const tasksRoute = read('src/routes/tasks.ts')
  const service = read('src/services/generation.ts')
  assert.match(tasksRoute, /schema\.sysTask/)
  assert.match(tasksRoute, /r\.type === type/)
  assert.match(service, /db\.insert\(schema\.sysTask\)/)

  assert.match(envExample, /PUBLIC_BASE_URL/)
})
