import { readFileSync, existsSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const exists = (path) => existsSync(new URL(path, root))

test('backend removes the voice assignment agent and tools', () => {
  const agents = read('src/agents/index.ts')
  const skills = read('src/agents/skills.ts')

  assert.doesNotMatch(agents, /voice_assigner/)
  assert.doesNotMatch(agents, /createVoiceTools/)
  assert.doesNotMatch(skills, /voice_assigner/)
  assert.equal(exists('src/agents/tools/voice-tools.ts'), false)
  assert.equal(exists('workspace/skills/voice_assigner/SKILL.md'), false)
})

test('旧语音分配链路保持移除；音频服务(TTS)按新需求重新接入', () => {
  const index = read('src/index.ts')
  const ai = read('src/services/ai.ts')
  const registry = read('src/services/adapters/registry.ts')
  const types = read('src/services/adapters/types.ts')

  // 旧设计（ai_voices 表 + 独立音频配置读取 + 独立 TTS 生成服务）不得回归
  assert.doesNotMatch(index, /aiVoices/)
  assert.doesNotMatch(ai, /getAudioConfig/)
  assert.doesNotMatch(registry, /minimax-tts/)
  assert.doesNotMatch(types, /TTSProviderAdapter/)
  assert.equal(exists('src/routes/aiVoices.ts'), false)
  assert.equal(exists('src/services/tts-generation.ts'), false)
  assert.equal(exists('src/services/adapters/minimax-tts.ts'), false)

  // 新设计的音频服务：service_type=audio + 独立 TTS 适配器 + 合成路由，且复用现有配置读取
  assert.match(ai, /'text' \| 'image' \| 'video' \| 'audio'/)
  assert.match(registry, /getVideoAdapter/)
  assert.equal(exists('src/services/adapters/tts.ts'), true)
  assert.equal(exists('src/routes/audio.ts'), true)
  assert.match(index, /api\.route\('\/audio', audio\)/)
  assert.match(read('src/routes/audio.ts'), /getActiveConfig\(serviceType\)/)

  assert.match(read('src/services/adapters/volcengine-video.ts'), /generate_audio:\s*record\.generateAudio/)
  assert.doesNotMatch(read('src/services/adapters/volcengine-video.ts'), /generate_audio:\s*false/)
})

test('backend removes TTS endpoints and audio-specific schema fields', () => {
  const episodes = read('src/routes/episodes.ts')
  const storyboards = read('src/routes/storyboards.ts')
  const characters = read('src/routes/characters.ts')
  const schema = read('src/db/schema.ts')
  const mysqlSchema = read('src/db/mysql-schema.ts')

  assert.doesNotMatch(episodes, /audio_config_id/)
  assert.doesNotMatch(episodes, /assign_voices/)
  assert.doesNotMatch(episodes, /generate_voice_samples/)
  assert.doesNotMatch(storyboards, /generate-tts/)
  assert.doesNotMatch(storyboards, /ttsAudioUrl/)
  assert.doesNotMatch(characters, /generate-voice-sample/)
  assert.doesNotMatch(characters, /voiceStyle/)
  assert.doesNotMatch(schema, /audioConfigId/)
  assert.doesNotMatch(schema, /voiceStyle/)
  assert.doesNotMatch(schema, /voiceSampleUrl/)
  assert.doesNotMatch(schema, /voiceProvider/)
  assert.doesNotMatch(schema, /ttsAudioUrl/)
  assert.doesNotMatch(schema, /aiVoices/)
  assert.doesNotMatch(mysqlSchema, /audio_config_id/)
  assert.doesNotMatch(mysqlSchema, /voice_style/)
  assert.doesNotMatch(mysqlSchema, /voice_sample_url/)
  assert.doesNotMatch(mysqlSchema, /voice_provider/)
  assert.doesNotMatch(mysqlSchema, /tts_audio_url/)
  // 无 ai_voices 表定义；仅保留启动时的孤儿表清理 DROP
  assert.doesNotMatch(mysqlSchema, /CREATE TABLE IF NOT EXISTS ai_voices/)
  assert.match(mysqlSchema, /DROP TABLE IF EXISTS `ai_voices`/)
})
