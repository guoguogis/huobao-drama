/**
 * TTS 适配器：请求报文与音频解码。
 * 只构造请求、不发网络调用——与既有 adapter 测试同一套路子。
 *
 * 豆包语音契约以用户提供的 curl 为准（/api/v3/tts/create + X-Api-Key + references[].speaker）。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTtsAdapter, listTtsProviders } from '../src/services/adapters/tts'

const volc = (over: Record<string, any> = {}) => ({
  provider: 'volcengine',
  baseUrl: 'https://openspeech.bytedance.com',
  apiKey: 'ARK_API_KEY_123',
  model: 'seed-audio-1.0',
  settings: JSON.stringify({ speaker: 'S_default_speaker' }),
  ...over,
})

const mini = (over: Record<string, any> = {}) => ({
  provider: 'minimax',
  baseUrl: 'https://api.minimaxi.com',
  apiKey: 'sk-api-key',
  model: 'speech-2.8-hd',
  settings: JSON.stringify({ voice_id: 'male-qn-qingse' }),
  ...over,
})

test('服务商注册表：支持豆包与 MiniMax，未知服务商报错', () => {
  assert.deepEqual(listTtsProviders().sort(), ['minimax', 'volcengine'])
  assert.equal(getTtsAdapter('volcengine').provider, 'volcengine')
  assert.equal(getTtsAdapter('MiniMax').provider, 'minimax')
  assert.throws(() => getTtsAdapter('openai'), /不支持的音频服务商/)
})

test('豆包语音：/api/v3/tts/create + X-Api-Key + references[].speaker + audio_config', () => {
  const req = getTtsAdapter('volcengine').buildSynthesizeRequest(volc() as any, {
    text: '你好，我是沈砚。',
    voiceId: '',
    format: 'mp3',
  })

  assert.equal(req.method, 'POST')
  assert.equal(req.url, 'https://openspeech.bytedance.com/api/v3/tts/create')
  // 鉴权是 X-Api-Key（不是 Authorization: Bearer;）
  assert.equal((req.headers as any)['X-Api-Key'], 'ARK_API_KEY_123')
  assert.equal((req.headers as any).Authorization, undefined)

  const body = req.body as any
  assert.equal(body.model, 'seed-audio-1.0')
  assert.equal(body.text_prompt, '你好，我是沈砚。')
  // 音色编号 → references[0].speaker；未显式传入时回落配置默认值
  assert.deepEqual(body.references, [{ speaker: 'S_default_speaker' }])
  assert.deepEqual(body.audio_config, {
    format: 'mp3', sample_rate: 48000, pitch_rate: 0, speech_rate: 0, loudness_rate: 0,
  })
  assert.deepEqual(body.watermark, {})
  // 新契约不需要 appid/cluster/reqid
  assert.equal(body.app, undefined)
  assert.equal(body.request, undefined)
})

test('豆包语音：界面传入的音色编号覆盖默认值；两者都空则不传 references', () => {
  const withVoice = getTtsAdapter('volcengine').buildSynthesizeRequest(volc() as any, {
    text: 'hi', voiceId: 'S_override', format: 'wav',
  })
  assert.deepEqual((withVoice.body as any).references, [{ speaker: 'S_override' }])
  assert.equal((withVoice.body as any).audio_config.format, 'wav')

  const noVoice = getTtsAdapter('volcengine').buildSynthesizeRequest(
    volc({ settings: null }) as any,
    { text: 'hi', voiceId: '' },
  )
  assert.equal((noVoice.body as any).references, undefined, '音色编号留空时应交给上游用默认音色')
})

test('豆包语音：兼容旧字段名 voice_type 作为默认音色编号', () => {
  const req = getTtsAdapter('volcengine').buildSynthesizeRequest(
    volc({ settings: JSON.stringify({ voice_type: 'S_legacy' }) }) as any,
    { text: 'hi', voiceId: '' },
  )
  assert.deepEqual((req.body as any).references, [{ speaker: 'S_legacy' }])
})

test('豆包语音：data 走 base64，data URL 也接受；短状态字段不会被误判；错误字段可读', () => {
  const adapter = getTtsAdapter('volcengine')
  const small = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x01, 0x02, 0x03])
  // 非 audio 命名的键（data/content/...）要求载荷足够长才认作音频，这里给一段真实量级的载荷
  const big = Buffer.alloc(600, 0x41)
  small.copy(big, 0)

  const plain = adapter.extractAudio({ data: big.toString('base64') }, 'mp3')
  assert.ok(plain)
  assert.deepEqual(plain!.bytes, big, 'base64 解码必须逐字节还原')

  // audio 命名的键可信，短载荷也接受；data URL 形式同样接受
  const dataUrl = adapter.extractAudio({ audio: `data:audio/mpeg;base64,${small.toString('base64')}` }, 'mp3')
  assert.ok(dataUrl)
  assert.deepEqual(dataUrl!.bytes, small)

  // 嵌套在任意层级、字段名带 audio 也能扫到
  const nested = adapter.extractAudio({ result: { audio_base64: small.toString('base64') } }, 'mp3')
  assert.ok(nested, '字段名不在首选列表里也应能扫到')
  assert.deepEqual(nested!.bytes, small)

  assert.throws(() => adapter.extractAudio({ code: 1001, message: 'invalid api key' }, 'mp3'), /1001.*invalid api key/)
  assert.equal(adapter.extractAudio({ code: 0, message: 'success' }, 'mp3'), null, '成功但无音频时返回 null')
  // 短字符串（状态 / task id）不能被误当成音频
  assert.equal(adapter.extractAudio({ data: 'abc123' }, 'mp3'), null)
  assert.equal(adapter.extractAudio({ status: 'ok', id: 'task_123' }, 'mp3'), null)
})

test('豆包语音：返回音频 URL 时抛出可识别信号，由路由下载', async () => {
  const adapter = getTtsAdapter('volcengine')
  const { TtsAudioUrlPending } = await import('../src/services/adapters/tts')
  let caught: any = null
  try {
    adapter.extractAudio({ data: { audio_url: 'https://example.com/a.mp3' } }, 'mp3')
  } catch (e) {
    caught = e
  }
  assert.ok(caught instanceof TtsAudioUrlPending, '应当是 TtsAudioUrlPending')
  assert.equal(caught.audioUrl, 'https://example.com/a.mp3')
})

test('豆包语音：真实响应形态 { audio(base64), duration, url } 能正确取到音频', () => {
  const adapter = getTtsAdapter('volcengine')
  // 取自实测响应：顶层就是 audio（base64 mp3，以 ID3 开头）+ duration + url
  const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(1200, 0x11)])
  const result = {
    audio: mp3.toString('base64'),
    duration: 3.08,
    original_duration: 3.08,
    url: 'https://lf11-speech-sign.bytednsdoc.com/volcengine-speech/cdn/x?x-expires=1',
  }
  const audio = adapter.extractAudio(result, 'mp3')
  assert.ok(audio)
  assert.deepEqual(audio!.bytes, mp3, '顶层 audio 按 base64 解码应逐字节还原')
  assert.equal(audio!.bytes.subarray(0, 3).toString('latin1'), 'ID3', '解出来必须是 mp3')
})

test('豆包语音：speaker 不存在 / key 无效时给出可操作的下一步提示', () => {
  const adapter = getTtsAdapter('volcengine')

  // 实测错误：填了别家的音色编号（如 MiniMax 的 voice_id）
  let msg = ''
  try {
    adapter.extractAudio({ code: 45001115, message: 'speaker male-qn-qingse not found in speaker_map, speaker_audio, or mega_info' }, 'mp3')
  } catch (e: any) { msg = e.message }
  assert.match(msg, /45001115/)
  assert.match(msg, /不属于豆包语音/)
  assert.match(msg, /留空/)

  // 实测错误：key 用错服务商
  let keyMsg = ''
  try {
    adapter.extractAudio({ code: 45000010, message: 'Invalid X-Api-Key' }, 'mp3')
  } catch (e: any) { keyMsg = e.message }
  assert.match(keyMsg, /API Key 无效/)
  assert.match(keyMsg, /不通用/)
})

test('MiniMax 语音：/v1/t2a_v2 + Bearer + voice_setting.voice_id', () => {
  const req = getTtsAdapter('minimax').buildSynthesizeRequest(mini() as any, {
    text: '你好，我是沈禾。', voiceId: 'female-shaonv', format: 'mp3',
  })

  assert.equal(req.url, 'https://api.minimaxi.com/v1/t2a_v2')
  assert.equal((req.headers as any).Authorization, 'Bearer sk-api-key')
  const body = req.body as any
  assert.equal(body.model, 'speech-2.8-hd')
  assert.equal(body.text, '你好，我是沈禾。')
  assert.equal(body.stream, false)
  assert.equal(body.voice_setting.voice_id, 'female-shaonv')
  assert.equal(body.audio_setting.format, 'mp3')
  // 只取音频，不要字幕
  assert.equal(body.subtitle_enable, false)
  // 未配置情绪/多音字时不下发这两个字段
  assert.equal(body.voice_setting.emotion, undefined)
  assert.equal(body.pronunciation_dict, undefined)
})

test('MiniMax 语音：情绪与多音字按配置下发，界面可覆盖情绪', () => {
  const configured = mini({
    settings: JSON.stringify({
      voice_id: 'male-qn-qingse',
      emotion: 'sad',
      pronunciation_tone: ['处理/(chu3)(li3)', '危险/dangerous'],
    }),
  }) as any

  const fromConfig = getTtsAdapter('minimax').buildSynthesizeRequest(configured, { text: 'hi', voiceId: '' })
  const bodyA = fromConfig.body as any
  assert.equal(bodyA.voice_setting.emotion, 'sad')
  assert.deepEqual(bodyA.pronunciation_dict.tone, ['处理/(chu3)(li3)', '危险/dangerous'])

  // 界面传入的情绪优先于配置
  const overridden = getTtsAdapter('minimax').buildSynthesizeRequest(configured, {
    text: 'hi', voiceId: '', emotion: 'happy',
  })
  assert.equal((overridden.body as any).voice_setting.emotion, 'happy')

  // 多音字也接受换行/逗号分隔的字符串写法
  const asText = mini({ settings: JSON.stringify({ voice_id: 'v1', pronunciation_tone: '处理/(chu3)(li3)\n危险/dangerous' }) }) as any
  const fromText = getTtsAdapter('minimax').buildSynthesizeRequest(asText, { text: 'hi', voiceId: '' })
  assert.deepEqual((fromText.body as any).pronunciation_dict.tone, ['处理/(chu3)(li3)', '危险/dangerous'])

  // 空数组 / 空字符串都不下发该字段
  const empty = mini({ settings: JSON.stringify({ voice_id: 'v1', pronunciation_tone: [] }) }) as any
  assert.equal((getTtsAdapter('minimax').buildSynthesizeRequest(empty, { text: 'hi', voiceId: '' }).body as any).pronunciation_dict, undefined)
})

test('MiniMax 语音：空音色编号回落配置值；两者都空则报错；data.audio 是 hex', () => {
  const adapter = getTtsAdapter('minimax')
  const fallback = adapter.buildSynthesizeRequest(mini() as any, { text: 'hi', voiceId: '' })
  assert.equal((fallback.body as any).voice_setting.voice_id, 'male-qn-qingse')

  assert.throws(
    () => adapter.buildSynthesizeRequest(mini({ settings: null }) as any, { text: 'hi', voiceId: '' }),
    /voice_id/,
  )

  // MiniMax 返回 hex 而不是 base64：用一段「按 base64 解会完全不同」的数据验证
  const original = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0x11])
  const audio = adapter.extractAudio({ data: { audio: original.toString('hex') } }, 'mp3')
  assert.ok(audio)
  assert.deepEqual(audio!.bytes, original, 'hex 解码必须逐字节还原')

  assert.equal(adapter.extractAudio({ data: { audio: 'not-hex!!' } }, 'mp3'), null)
  assert.throws(
    () => adapter.extractAudio({ base_resp: { status_code: 1004, status_msg: 'invalid api key' } }, 'mp3'),
    /1004.*invalid api key/,
  )
})

test('格式归一化：大写与非法值都收敛到 mp3 默认', () => {
  const req = getTtsAdapter('volcengine').buildSynthesizeRequest(volc() as any, {
    text: 'hi', voiceId: 'S1', format: 'MP3' as any,
  })
  assert.equal((req.body as any).audio_config.format, 'mp3')
  const req2 = getTtsAdapter('volcengine').buildSynthesizeRequest(volc() as any, {
    text: 'hi', voiceId: 'S1', format: 'unknown' as any,
  })
  assert.equal((req2.body as any).audio_config.format, 'mp3')
})
