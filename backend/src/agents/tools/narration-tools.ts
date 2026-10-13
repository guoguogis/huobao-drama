/**
 * 口播视频 Agent 工具
 *
 * 两个 Agent 共用：
 * - narration_writer（口播稿写作）：read_narration_brief → save_narration_scripts
 * - narration_planner（分镜与提示词）：read_selected_narration → save_narration_shots
 *
 * 设计原则：**文字由模型创作，算数交给代码**。
 * 工具的返回值里带上代码算好的字数/时长/语速预算，模型据此写作，避免「模型自己估时长」不准。
 */
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'
import { now } from '../../utils/response.js'
import { getDramaId, getEpisodeId } from '../context.js'
import {
  charBudget,
  countSpokenChars,
  estimateDurationSec,
  planShots,
  readNarrationBrief,
} from '../../services/narration.js'

function requireDramaId(context: any): number | null {
  return getDramaId(context?.requestContext)
}

const readNarrationBriefTool = createTool({
  id: 'read_narration_brief',
  description: 'Read the narration brief of the current project: topic, target duration, speech rate, style, and any scripts already generated.',
  inputSchema: z.object({}),
  execute: async (_input, context) => {
    const dramaId = requireDramaId(context)
    if (!dramaId) return { error: 'Missing dramaId in request context' }
    const [drama] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId))
    if (!drama) return { error: `Project not found (id=${dramaId})` }
    const brief = await readNarrationBrief(dramaId)
    const existing = await db.select().from(schema.narrationScripts).where(eq(schema.narrationScripts.dramaId, dramaId))

    return {
      drama_id: dramaId,
      title: drama.title,
      topic: brief.topic || drama.description || '',
      target_duration_sec: brief.targetDurationSec,
      speech_rate: brief.speechRate,
      aspect_ratio: brief.aspectRatio,
      style: brief.style || drama.style || '',
      // 1.1 倍语速下的字数预算：模型必须按这个量级写，画面才排得下
      char_budget: charBudget(brief.targetDurationSec, brief.speechRate),
      per_shot_target_sec: 5,
      existing_scripts: existing.map(s => ({
        version_index: s.versionIndex,
        angle: s.angle,
        title: s.title,
        char_count: s.charCount,
        is_selected: !!s.isSelected,
      })),
      note: '字数预算按「基准 4.2 字/秒 × 语速倍率」计算；请让每个版本都落在预算的 ±8% 内。',
    }
  },
})

const saveNarrationScripts = createTool({
  id: 'save_narration_scripts',
  description: 'Save the generated narration script versions (usually 3 different angles) for the current project. Replaces previous unselected versions.',
  inputSchema: z.object({
    scripts: z.array(z.object({
      angle: z.string().describe('This version\'s angle, e.g. 悬念式 / 数据式 / 故事式'),
      title: z.string().describe('Short title of this version'),
      content: z.string().describe('Full narration text, one sentence per line is preferred'),
    })).min(1).describe('Script versions to save'),
    replace_unselected: z.boolean().optional().describe('Delete previous unselected versions first (default true)'),
  }),
  execute: async ({ scripts, replace_unselected }, context) => {
    const dramaId = requireDramaId(context)
    if (!dramaId) return { error: 'Missing dramaId in request context' }
    const brief = await readNarrationBrief(dramaId)
    const ts = now()

    const clearOld = replace_unselected !== false
    if (clearOld) {
      // 只清理「未选中」的旧版本：已选定的那一版不能被一次重生成抹掉
      await db.delete(schema.narrationScripts)
        .where(and(eq(schema.narrationScripts.dramaId, dramaId), eq(schema.narrationScripts.isSelected, false)))
    }

    const saved: any[] = []
    for (let i = 0; i < scripts.length; i++) {
      const s = scripts[i]
      const content = String(s.content || '').trim()
      if (!content) continue
      const charCount = countSpokenChars(content)
      const est = estimateDurationSec(content, brief.speechRate)
      const res = await db.insert(schema.narrationScripts).values({
        dramaId,
        versionIndex: i + 1,
        angle: String(s.angle || '').trim() || `版本${i + 1}`,
        title: String(s.title || '').trim() || `版本${i + 1}`,
        content,
        charCount,
        estDurationSec: Math.round(est * 100) / 100,
        isSelected: false,
        createdAt: ts,
        updatedAt: ts,
      })
      saved.push({
        version_index: i + 1,
        angle: s.angle,
        char_count: charCount,
        est_duration_sec: Math.round(est * 100) / 100,
        id: (res as any)?.lastInsertRowid ?? null,
      })
    }

    const budget = charBudget(brief.targetDurationSec, brief.speechRate)
    return {
      message: `已保存 ${saved.length} 个版本`,
      target_duration_sec: brief.targetDurationSec,
      char_budget: budget,
      saved,
      hint: '等待用户选择一版后再扩写关键帧与音频提示词。',
    }
  },
})

const readSelectedNarration = createTool({
  id: 'read_selected_narration',
  description: 'Read the narration script selected by the user, plus the sync parameters (speech rate, target duration, shot budget).',
  inputSchema: z.object({}),
  execute: async (_input, context) => {
    const dramaId = requireDramaId(context)
    if (!dramaId) return { error: 'Missing dramaId in request context' }
    const rows = await db.select().from(schema.narrationScripts).where(eq(schema.narrationScripts.dramaId, dramaId))
    const selected = rows.find(r => !!r.isSelected)
    if (!selected) return { error: '还没有选定口播稿版本：请先在界面上选择一版' }

    const [drama] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId))
    const brief = await readNarrationBrief(dramaId)
    const plan = planShots(selected.content, brief.targetDurationSec, brief.speechRate)

    return {
      drama_id: dramaId,
      drama_title: drama?.title || '',
      topic: brief.topic,
      style: brief.style || drama?.style || '',
      aspect_ratio: brief.aspectRatio,
      speech_rate: brief.speechRate,
      target_duration_sec: brief.targetDurationSec,
      script: {
        version_index: selected.versionIndex,
        angle: selected.angle,
        title: selected.title,
        content: selected.content,
        char_count: selected.charCount,
      },
      // 代码算好的同步方案：一句一镜，含每镜预计时长（画面必须按这个时长做）
      shot_plan: plan.shots.map(s => ({ index: s.index, text: s.text, char_count: s.charCount, duration_sec: s.durationSec })),
      plan_total_sec: plan.totalSec,
      plan_drift: plan.drift,
      plan_warnings: plan.warnings,
      note: '口播文本按句拆成了镜头；请为每个镜头写关键帧图像提示词，并把画面时长控制在 duration_sec。',
    }
  },
})

const saveNarrationShots = createTool({
  id: 'save_narration_shots',
  description: 'Save per-shot keyframe image prompts and narration text for the current narration episode. Replaces existing shots.',
  inputSchema: z.object({
    shots: z.array(z.object({
      shot_number: z.number().describe('1-based shot number, must be continuous'),
      keyframe_prompt: z.string().describe('Image prompt for this shot\'s keyframe (start frame)'),
      narration_text: z.string().describe('Narration sentence for this shot (TTS input)'),
      video_prompt: z.string().optional().describe('Optional motion prompt for the clip between this keyframe and the next'),
      atmosphere: z.string().optional(),
      duration_sec: z.number().optional().describe('Planned duration in seconds; keep close to the computed plan'),
    })).min(1),
    replace_existing: z.boolean().optional().describe('Clear existing shots first (default true)'),
  }),
  execute: async ({ shots, replace_existing }, context) => {
    const episodeId = getEpisodeId(context?.requestContext)
    const dramaId = requireDramaId(context)
    if (!episodeId) return { error: 'Missing episodeId in request context' }
    if (!dramaId) return { error: 'Missing dramaId in request context' }
    const brief = await readNarrationBrief(dramaId)
    const ts = now()

    if (replace_existing !== false) {
      // 口播分镜整批重写：软删旧行，避免与漫剧链路共用的查询把旧镜头带出来
      await db.update(schema.storyboards)
        .set({ deletedAt: ts, updatedAt: ts })
        .where(eq(schema.storyboards.episodeId, episodeId))
    }

    let saved = 0
    for (const shot of shots) {
      const narration = String(shot.narration_text || '').trim()
      const speech = estimateDurationSec(narration, brief.speechRate)
      const duration = Number.isFinite(Number(shot.duration_sec)) && Number(shot.duration_sec) > 0
        ? Number(shot.duration_sec)
        : Math.round((speech + 0.25) * 100) / 100
      await db.insert(schema.storyboards).values({
        episodeId,
        storyboardNumber: Number(shot.shot_number),
        title: `镜头${shot.shot_number}`,
        imagePrompt: String(shot.keyframe_prompt || '').trim(),
        videoPrompt: String(shot.video_prompt || '').trim() || null,
        atmosphere: String(shot.atmosphere || '').trim() || null,
        description: narration,
        narrationText: narration,
        narrationTargetDuration: duration,
        duration: Math.max(1, Math.round(duration)),
        status: 'pending',
        createdAt: ts,
        updatedAt: ts,
      })
      saved++
    }

    return {
      message: `已保存 ${saved} 个镜头（含关键帧提示词与旁白文本）`,
      saved,
      speech_rate: brief.speechRate,
      hint: '接下来可以按关键帧提示词生成图片，再把相邻两帧作为首尾帧生成视频片段。',
    }
  },
})

const updateNarrationShot = createTool({
  id: 'update_narration_shot',
  description: 'Update one narration shot (keyframe prompt / narration text / planned duration).',
  inputSchema: z.object({
    shot_number: z.number(),
    keyframe_prompt: z.string().optional(),
    narration_text: z.string().optional(),
    video_prompt: z.string().optional(),
    duration_sec: z.number().optional(),
  }),
  execute: async ({ shot_number, keyframe_prompt, narration_text, video_prompt, duration_sec }, context) => {
    const episodeId = getEpisodeId(context?.requestContext)
    const dramaId = requireDramaId(context)
    if (!episodeId || !dramaId) return { error: 'Missing episode/drama in request context' }
    const brief = await readNarrationBrief(dramaId)
    const rows = await db.select().from(schema.storyboards).where(eq(schema.storyboards.episodeId, episodeId))
    const shot = rows.find(r => r.storyboardNumber === Number(shot_number) && !r.deletedAt)
    if (!shot) return { error: `Shot not found (number=${shot_number})` }

    const patch: Record<string, any> = { updatedAt: now() }
    if (keyframe_prompt !== undefined) patch.imagePrompt = String(keyframe_prompt).trim()
    if (video_prompt !== undefined) patch.videoPrompt = String(video_prompt).trim() || null
    if (narration_text !== undefined) {
      const text = String(narration_text).trim()
      patch.narrationText = text
      patch.description = text
      if (duration_sec === undefined) {
        patch.narrationTargetDuration = Math.round((estimateDurationSec(text, brief.speechRate) + 0.25) * 100) / 100
      }
    }
    if (duration_sec !== undefined) {
      patch.narrationTargetDuration = Number(duration_sec)
      patch.duration = Math.max(1, Math.round(Number(duration_sec)))
    }
    await db.update(schema.storyboards).set(patch).where(eq(schema.storyboards.id, shot.id))
    return { message: `镜头 ${shot_number} 已更新`, shot_number }
  },
})

export const narrationWriterTools = { readNarrationBrief: readNarrationBriefTool, saveNarrationScripts }
export const narrationPlannerTools = {
  readSelectedNarration,
  saveNarrationShots,
  updateNarrationShot,
}
