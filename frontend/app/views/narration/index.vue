<template>
  <div class="narration-studio">
    <!-- 顶栏 -->
    <header class="ns-topbar">
      <button class="back-btn topbar-back" @click="goBack">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        {{ t('narration.back') }}
      </button>
      <div class="ns-title-wrap">
        <span class="ns-type-tag">{{ t('narration.typeTag') }}</span>
        <span class="ns-title">{{ drama?.title || '—' }}</span>
      </div>
      <div class="ns-topbar-meta">
        <span class="ns-meta-chip">{{ t('narration.meta.rate', { rate: Number(form.speech_rate).toFixed(2) }) }}</span>
        <span class="ns-meta-chip">{{ t('narration.meta.budget', { budget: derivedCharBudget }) }}</span>
        <span class="ns-meta-chip">{{ t('narration.meta.shots', { n: shots.length }) }}</span>
      </div>
      <!-- 模型选择器：与漫剧工作台同一套（key = provider/model@配置id），选择持久化并两边互通 -->
      <div class="ns-model-picks">
        <ModelSelect
          v-if="textModelOptions.length"
          v-model="chatModel"
          :label="t('common.serviceType.text')"
          :options="textModelOptions"
          :default-label="t('episode.model.defaultWith', { model: textModelOptions[0].model })"
          :show-config="textModelMultiCfg"
        />
        <ModelSelect
          v-if="imageModelOptions.length"
          v-model="imageModel"
          :label="t('common.serviceType.image')"
          :options="imageModelOptions"
          :default-label="t('episode.model.defaultWith', { model: imageModelOptions[0].model })"
          :show-config="imageModelMultiCfg"
        />
        <ModelSelect
          v-if="videoModelOptions.length"
          v-model="videoModel"
          :label="t('common.serviceType.video')"
          :options="videoModelOptions"
          :default-label="t('episode.model.defaultWith', { model: videoModelOptions[0].model })"
          :show-config="videoModelMultiCfg"
        />
        <ModelSelect
          v-if="audioModelOptions.length"
          v-model="audioModel"
          :label="t('common.serviceType.audio')"
          :options="audioModelOptions"
          :default-label="t('episode.model.defaultWith', { model: audioModelOptions[0].model })"
          :show-config="audioModelMultiCfg"
        />
        <ModelSelect
          v-model="exportResolution"
          :label="t('episode.topbar.resolution')"
          :options="resolutionOptions"
          hide-default
        />
      </div>
      <div class="ns-topbar-right">
        <button class="btn btn-sm" :disabled="loading" @click="reloadAll">
          <Loader2 v-if="loading" :size="12" class="animate-spin" />
          {{ t('narration.refresh') }}
        </button>
      </div>
    </header>

    <div class="ns-body">
      <!-- 左侧：树形菜单（分区 → 子项） -->
      <aside class="ns-sidebar">
        <nav class="pipeline">
          <div
            v-for="sec in tree"
            :key="sec.key"
            class="pipe-section"
            :class="{ 'is-active': sectionHasActive(sec), 'is-done': sectionDone(sec) }"
          >
            <div class="pipe-section-label">{{ sec.label }}</div>
            <button
              v-for="item in sec.items"
              :key="item.key"
              type="button"
              class="pipe-item"
              :class="{ active: activeNode === item.key, done: nodeDone(item.key) }"
              @click="activeNode = item.key"
            >
              <span class="pipe-item-dot"></span>
              <span class="pipe-label">{{ item.label }}</span>
              <span v-if="nodeBadge(item.key)" class="pipe-badge">{{ nodeBadge(item.key) }}</span>
            </button>
          </div>
        </nav>
      </aside>

      <!-- 右侧：只渲染当前节点对应的面板 -->
      <main class="ns-main">
        <!-- ① 创作简报 -->
        <section v-if="activeNode === 'brief'" class="card ns-card">
          <div class="ns-card-head">
            <h2 class="ns-card-title">{{ t('narration.brief.title') }}</h2>
            <p class="ns-card-desc">{{ t('narration.brief.desc') }}</p>
          </div>
          <div class="ns-grid">
            <label class="field ns-span2">
              <span class="field-label">{{ t('narration.brief.topic') }} <span class="required">*</span></span>
              <textarea v-model="form.topic" class="input ns-topic" rows="3" :placeholder="t('narration.brief.topicPlaceholder')"></textarea>
            </label>
            <label class="field">
              <span class="field-label">{{ t('narration.brief.duration') }}</span>
              <BaseSelect v-model="form.target_duration_sec" :options="durationOptions" />
            </label>
            <label class="field">
              <span class="field-label">{{ t('narration.brief.aspect') }}</span>
              <BaseSelect v-model="form.aspect_ratio" :options="aspectOptions" />
            </label>
            <div class="field ns-span2 ns-rate-field">
              <span class="field-label">{{ t('narration.brief.rate') }}</span>
              <div class="ns-rate-row">
                <input v-model.number="form.speech_rate" class="ns-range" type="range" :min="rateRange.min" :max="rateRange.max" step="0.05" />
                <input v-model.number="form.speech_rate" class="input ns-rate-input" type="number" :min="rateRange.min" :max="rateRange.max" step="0.05" />
                <span class="ns-rate-unit">×</span>
                <div class="ns-rate-presets">
                  <button v-for="p in ratePresets" :key="p" type="button" class="ns-chip" :class="{ on: Math.abs(Number(form.speech_rate) - p) < 0.001 }" @click="form.speech_rate = p">{{ p.toFixed(2) }}</button>
                </div>
              </div>
              <span class="field-hint">{{ t('narration.brief.rateHint', { min: rateRange.min, max: rateRange.max, cps: derivedCharsPerSecond }) }}</span>
            </div>
            <label class="field">
              <span class="field-label">{{ t('narration.brief.voice') }}</span>
              <input v-model="form.voice_id" class="input" :placeholder="t('narration.brief.voicePlaceholder')" />
            </label>
            <label class="field ns-check-field">
              <input v-model="form.clip_with_audio" type="checkbox" />
              <span class="field-label">{{ t('narration.brief.clipAudio') }}</span>
              <span class="field-hint">{{ t('narration.brief.clipAudioHint') }}</span>
            </label>
          </div>
          <div class="ns-derived">
            <div class="ns-derived-item"><span class="ns-derived-label">{{ t('narration.brief.charsPerSecond') }}</span><span class="ns-derived-value mono">{{ derivedCharsPerSecond }}</span></div>
            <div class="ns-derived-item"><span class="ns-derived-label">{{ t('narration.brief.charBudget') }}</span><span class="ns-derived-value mono">{{ derivedCharBudget }}</span></div>
            <div class="ns-derived-item"><span class="ns-derived-label">{{ t('narration.brief.estShots') }}</span><span class="ns-derived-value mono">{{ derivedShotEstimate }}</span></div>
            <div class="ns-derived-hint">{{ t('narration.brief.derivedHint', { rate: Number(form.speech_rate).toFixed(2) }) }}</div>
          </div>
          <div class="ns-actions">
            <button class="btn btn-primary" :disabled="briefSaving || !form.topic.trim()" @click="saveBrief()">
              <Loader2 v-if="briefSaving" :size="12" class="animate-spin" />
              {{ t('narration.brief.save') }}
            </button>
            <span v-if="briefDirty" class="ns-dirty-chip">{{ t('narration.brief.unsaved') }}</span>
            <span v-else class="field-hint">{{ t('narration.brief.storedHint') }}</span>
            <button class="btn" :disabled="writing || !canWrite" @click="generateScripts">
              <Loader2 v-if="writing" :size="12" class="animate-spin" />
              <Sparkles v-else :size="13" />
              {{ scripts.length ? t('narration.brief.rewrite') : t('narration.brief.write') }}
            </button>
            <span v-if="!canWrite" class="field-hint">{{ t('narration.brief.needTopic') }}</span>
          </div>
        </section>

        <!-- ② 口播稿版本 -->
        <section v-else-if="activeNode === 'scripts'" class="card ns-card">
          <div class="ns-card-head">
            <h2 class="ns-card-title">{{ t('narration.scripts.title') }}</h2>
            <p class="ns-card-desc">{{ t('narration.scripts.desc', { budget: derivedCharBudget }) }}</p>
          </div>
          <p v-if="!scripts.length" class="ns-empty">{{ t('narration.scripts.empty') }}</p>
          <div v-else class="ns-scripts">
            <article v-for="s in scripts" :key="s.id" class="ns-script" :class="{ selected: s.is_selected }">
              <header class="ns-script-head">
                <span class="tag tag-accent">{{ s.angle || `#${s.version_index}` }}</span>
                <span class="ns-script-title">{{ s.title }}</span>
                <span class="ns-script-meta mono">{{ t('narration.scripts.meta', { chars: s.char_count, sec: s.est_duration_sec }) }}</span>
                <button class="btn btn-sm ml-auto" :class="{ 'btn-primary': !s.is_selected }" :disabled="selecting === s.id || s.is_selected" @click="selectScript(s)">
                  <Loader2 v-if="selecting === s.id" :size="12" class="animate-spin" />
                  {{ s.is_selected ? t('narration.scripts.selected') : t('narration.scripts.select') }}
                </button>
              </header>
              <pre class="ns-script-body">{{ s.content }}</pre>
            </article>
          </div>
        </section>

        <!-- ③ 逐镜计划 -->
        <section v-else-if="activeNode === 'plan'" class="card ns-card">
          <div class="ns-card-head">
            <h2 class="ns-card-title">{{ t('narration.plan.title') }}</h2>
            <p class="ns-card-desc">{{ t('narration.plan.desc', { rate: Number(form.speech_rate).toFixed(2) }) }}</p>
          </div>
          <p v-if="!selectedScript" class="ns-empty">{{ t('narration.plan.needScript') }}</p>
          <template v-else>
            <div class="ns-plan-summary">
              <span class="ns-derived-item"><span class="ns-derived-label">{{ t('narration.plan.shots') }}</span><span class="ns-derived-value mono">{{ plan?.shots?.length || 0 }}</span></span>
              <span class="ns-derived-item"><span class="ns-derived-label">{{ t('narration.plan.total') }}</span><span class="ns-derived-value mono">{{ plan?.total_sec ?? '—' }}s</span></span>
              <span class="ns-derived-item"><span class="ns-derived-label">{{ t('narration.plan.target') }}</span><span class="ns-derived-value mono">{{ plan?.target_sec ?? '—' }}s</span></span>
              <span class="ns-derived-item"><span class="ns-derived-label">{{ t('narration.plan.drift') }}</span><span class="ns-derived-value mono" :class="{ warn: plan && !plan.within_tolerance }">{{ plan ? Math.round((plan.drift || 0) * 100) + '%' : '—' }}</span></span>
            </div>
            <p v-for="(w, i) in (plan?.warnings || [])" :key="i" class="ns-warn">{{ w }}</p>
            <div class="ns-table">
              <div class="ns-tr ns-th"><span>#</span><span>{{ t('narration.plan.colText') }}</span><span>{{ t('narration.plan.colChars') }}</span><span>{{ t('narration.plan.colDuration') }}</span></div>
              <div v-for="s in (plan?.shots || [])" :key="s.index" class="ns-tr">
                <span class="mono">{{ s.index }}</span>
                <span class="ns-td-text">{{ s.text }}</span>
                <span class="mono">{{ s.char_count }}</span>
                <span class="mono">{{ s.duration_sec }}s</span>
              </div>
            </div>
            <div class="ns-actions">
              <button class="btn btn-primary" :disabled="planning" @click="runShotPlanner">
                <Loader2 v-if="planning" :size="12" class="animate-spin" />
                <Wand2 v-else :size="13" />
                {{ shots.length ? t('narration.plan.replan') : t('narration.plan.expand') }}
              </button>
              <span class="field-hint">{{ t('narration.plan.expandHint') }}</span>
            </div>
            <p v-if="shots.length" class="ns-ok-hint">{{ t('narration.plan.shotsSaved', { n: shots.length }) }}</p>
          </template>
        </section>

        <!-- ④ 关键帧图片 -->
        <section v-else-if="activeNode === 'images'" class="card ns-card">
          <div class="ns-card-head">
            <h2 class="ns-card-title">{{ t('narration.images.title') }}</h2>
            <p class="ns-card-desc">{{ t('narration.images.desc') }}</p>
          </div>
          <p v-if="!shots.length" class="ns-empty">{{ t('narration.images.needPlan') }}</p>
          <template v-else>
            <div class="ns-actions ns-actions-top">
              <button class="btn btn-primary" :disabled="busy.images || anyImageGenerating || !shotsMissingImage.length" @click="generateImages(shotsMissingImage)">
                <Loader2 v-if="busy.images || anyImageGenerating" :size="12" class="animate-spin" />
                <ImagePlus v-else :size="13" />
                {{ anyImageGenerating
                  ? t('narration.images.generatingCount', { n: shotsGeneratingImage.length })
                  : t('narration.images.generateMissing', { n: shotsMissingImage.length }) }}
              </button>
              <button class="btn" :disabled="busy.images || anyImageGenerating" @click="generateImages(shots.filter(s => imageState(s) === 'done'))">
                <RefreshCw :size="13" /> {{ t('narration.images.regenerateAll') }}
              </button>
              <span class="field-hint">{{ t('narration.images.countHint', { done: shotsWithImage.length, total: shots.length }) }}</span>
            </div>
            <div class="ns-shot-grid">
              <article v-for="s in shots" :key="s.id" class="ns-shot-card" :class="{ 'is-busy': imageState(s) === 'generating' }">
                <header class="ns-shot-head">
                  <span class="ns-shot-no mono">#{{ s.shot_number }}</span>
                  <span class="ns-shot-badge" :class="imageState(s)">
                    <Loader2 v-if="imageState(s) === 'generating'" :size="10" class="animate-spin" />
                    {{ t(`narration.state.${imageState(s)}`) }}
                  </span>
                  <button
                    class="btn btn-ghost btn-sm ml-auto"
                    :disabled="busy.images || imageState(s) === 'generating'"
                    @click="generateImages([s])"
                  >
                    {{ imageState(s) === 'generating' ? t('narration.images.generating') : (s.keyframe_image ? t('narration.images.redraw') : t('narration.images.generate')) }}
                  </button>
                </header>
                <div
                  class="ns-thumb"
                  :class="{ 'is-busy': imageState(s) === 'generating', 'is-zoomable': !!s.keyframe_image }"
                  :role="s.keyframe_image ? 'button' : undefined"
                  :tabindex="s.keyframe_image ? 0 : undefined"
                  :title="s.keyframe_image ? t('narration.preview.hint') : undefined"
                  @click="s.keyframe_image && openImagePreview(s)"
                  @keydown.enter.prevent="s.keyframe_image && openImagePreview(s)"
                  @keydown.space.prevent="s.keyframe_image && openImagePreview(s)"
                >
                  <img v-if="s.keyframe_image" :src="assetUrl(s.keyframe_image)" alt="" loading="lazy" />
                  <span v-if="s.keyframe_image" class="ns-thumb-zoom"><Maximize2 :size="12" /></span>
                  <!-- 生成中：进度覆盖层（无百分比字段，用已用时表达） -->
                  <div v-else-if="imageState(s) === 'generating'" class="ns-thumb-progress">
                    <Loader2 :size="18" class="animate-spin" />
                    <span>{{ elapsedText(s.image_task) }}</span>
                    <span class="ns-thumb-hint">{{ t('narration.images.generatingHint') }}</span>
                  </div>
                  <!-- 失败：占位图位置直接显示原因 -->
                  <div v-else-if="imageState(s) === 'failed'" class="ns-thumb-error">
                    <span class="ns-thumb-error-title">{{ t('narration.images.failedTitle') }}</span>
                    <span class="ns-thumb-error-msg">{{ s.image_task?.error_msg || t('narration.images.failedUnknown') }}</span>
                  </div>
                  <span v-else class="ns-thumb-empty">{{ t('narration.images.noImage') }}</span>
                </div>
                <p v-if="imageState(s) === 'failed'" class="ns-warn ns-warn-tight">
                  {{ t('narration.images.failedHint') }}
                  <button class="btn btn-sm" :disabled="busy.images" @click="generateImages([s])">{{ t('narration.images.retry') }}</button>
                </p>
                <!-- 关键帧提示词可编辑：改完直接用它重新生成（生成时下发的就是这个字段） -->
                <div class="ns-img-prompt">
                  <textarea
                    class="textarea ns-prompt-input"
                    rows="3"
                    :value="imgPromptDraft(s)"
                    :placeholder="t('narration.images.promptPlaceholder')"
                    @input="setImgPromptDraft(s, $event.target.value)"
                    @blur="commitImgPrompt(s)"
                    @keydown.ctrl.enter.prevent="commitImgPrompt(s)"
                    @keydown.meta.enter.prevent="commitImgPrompt(s)"
                  ></textarea>
                  <div class="ns-prompt-foot">
                    <span v-if="imgPromptSavingId === s.id" class="ns-vid-save-state">
                      <Loader2 :size="11" class="animate-spin" /> {{ t('narration.images.promptSaving') }}
                    </span>
                    <span v-else-if="imgPromptSavedId === s.id" class="ns-vid-save-state is-ok">
                      <Check :size="11" /> {{ t('narration.images.promptSaved') }}
                    </span>
                    <span v-else-if="imgPromptDirty(s)" class="ns-vid-save-state is-dirty">{{ t('narration.images.promptDirty') }}</span>
                    <button
                      v-if="imgPromptDirty(s)"
                      type="button" class="btn btn-ghost btn-sm"
                      @mousedown.prevent
                      @click="resetImgPrompt(s)"
                    >{{ t('narration.images.promptReset') }}</button>
                    <span class="field-hint">{{ t('narration.images.promptHint') }}</span>
                  </div>
                </div>
                <div class="ns-narration">{{ s.narration_text }}</div>
                <!-- 候选关键帧：同一镜可以保留多张（重绘不覆盖），当前那张供下游当片段首帧 -->
                <div v-if="keyframeHistoryOf(s).length" class="ns-kf-history">
                  <div class="ns-kf-history-head">
                    <span>{{ t('narration.images.candidates') }}</span>
                    <span class="ns-clip-history-count">{{ keyframeHistoryOf(s).length }}</span>
                  </div>
                  <div class="ns-kf-history-list">
                    <div
                      v-for="k in keyframeHistoryOf(s)"
                      :key="k.id"
                      class="ns-kf-item"
                      :class="{ current: isCurrentKeyframe(s, k) }"
                      role="button"
                      tabindex="0"
                      :title="t('narration.images.candidateHint')"
                      @click="openImagePreview(s, k.path)"
                      @keydown.enter.prevent="openImagePreview(s, k.path)"
                    >
                      <img :src="assetUrl(k.path)" alt="" loading="lazy" />
                      <span class="ns-clip-history-time mono">{{ formatHistoryTime(k.created_at) }}</span>
                      <span v-if="isCurrentKeyframe(s, k)" class="ns-clip-history-badge">{{ t('narration.clips.currentBadge') }}</span>
                      <button
                        v-if="!isCurrentKeyframe(s, k)"
                        type="button" class="ns-kf-use"
                        :title="t('narration.images.useAsCurrent')"
                        @click.stop="useKeyframeAsCurrent(s, k)"
                      >{{ t('narration.images.useShort') }}</button>
                      <button
                        v-if="!isCurrentKeyframe(s, k)"
                        type="button" class="ns-clip-history-del"
                        :title="t('narration.images.deleteCandidate')"
                        @click.stop="askRemoveKeyframe(s, k)"
                      >×</button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </template>
        </section>

        <!-- ⑤ 首尾帧片段：左列片段列表 + 右侧详情（主播放器 + 多次生成的历史） -->
        <section v-else-if="activeNode === 'clips'" class="card ns-card ns-card-fill">
          <div class="ns-card-head">
            <h2 class="ns-card-title">{{ t('narration.clips.title') }}</h2>
            <p class="ns-card-desc">{{ t('narration.clips.desc') }}</p>
          </div>
          <p v-if="!shotsWithImage.length" class="ns-empty">{{ t('narration.clips.needImages') }}</p>
          <template v-else>
            <div class="ns-actions ns-actions-top">
              <button class="btn btn-primary" :disabled="busy.clips || anyClipGenerating || !clipCandidates.length" @click="generateClips(clipCandidates)">
                <Loader2 v-if="busy.clips || anyClipGenerating" :size="12" class="animate-spin" />
                <Clapperboard v-else :size="13" />
                {{ anyClipGenerating
                  ? t('narration.clips.generatingCount', { n: shotsGeneratingClip.length })
                  : t('narration.clips.generateMissing', { n: clipCandidates.length }) }}
              </button>
              <button class="btn" :disabled="busy.clips || anyClipGenerating" @click="generateClips(clipPairs.filter(p => effectiveFirstFrame(p)))">
                <RefreshCw :size="13" /> {{ t('narration.clips.regenerateAll') }}
              </button>
              <label class="ns-inline-check">
                <input v-model="form.clip_with_audio" type="checkbox" />
                <span>{{ t('narration.clips.withAudio') }}</span>
              </label>
              <button class="btn btn-sm" :disabled="briefSaving" @click="saveBrief()">{{ t('narration.brief.save') }}</button>
            </div>

            <div class="ns-clip-layout">
              <!-- 左：片段列表（每段一行，显示状态与已生成版本数） -->
              <aside class="ns-clip-list-col">
                <button
                  v-for="pair in clipPairs"
                  :key="pair.shot.id"
                  type="button"
                  class="ns-clip-item"
                  :class="{ active: selectedClipShotId === pair.shot.id, done: clipState(pair.shot) === 'done' }"
                  @click="selectedClipShotId = pair.shot.id"
                >
                  <span class="ns-shot-no mono">#{{ pair.shot.shot_number }}</span>
                  <span class="ns-clip-item-body">
                    <span class="ns-clip-item-title">{{ pair.shot.narration_text || '—' }}</span>
                    <span class="ns-clip-item-meta mono">
                      {{ t('narration.clips.targetDur', { sec: pair.targetDuration }) }}
                      <template v-if="clipHistoryOf(pair.shot).length"> · {{ t('narration.clips.versionCount', { n: clipHistoryOf(pair.shot).length }) }}</template>
                    </span>
                  </span>
                  <span class="ns-shot-badge" :class="clipState(pair.shot)">
                    <Loader2 v-if="clipState(pair.shot) === 'generating'" :size="10" class="animate-spin" />
                    {{ t(`narration.state.${clipState(pair.shot)}`) }}
                  </span>
                </button>
                <p class="field-hint ns-clip-list-hint">{{ t('narration.clips.lastHint') }}</p>
              </aside>

              <!-- 右：选中片段的详情（结构对齐漫剧「分镜视频」：播放器头部 + 舞台 + 历史 + 检查器） -->
              <div v-if="selectedClipPair" class="ns-clip-detail">
                <!-- 播放器头部：标题 / 状态 / 片段时长 / 设为成片 / 详情 -->
                <div class="ns-vid-head">
                  <div class="ns-vid-head-info">
                    <span class="ns-vid-title">{{ t('narration.clips.playerTitle', { n: String(selectedClipPair.shot.shot_number).padStart(2, '0') }) }}</span>
                    <span class="ns-vid-status" :class="'is-' + activeClipView.kind">
                      <span class="ns-vid-dot"></span>
                      {{ activeClipStateLabel }}
                    </span>
                    <span v-if="clipDurationOf(selectedClipPair)" class="ns-vid-sub mono">{{ clipDurationOf(selectedClipPair) }}s</span>
                    <span v-if="activeClipView.kind === 'generating'" class="ns-vid-sub">{{ elapsedText(activeClipView.task) }}</span>
                  </div>
                  <div class="ns-vid-head-actions">
                    <!-- 已经是当前成片片段：用状态标签替代"禁用的按钮"，避免"有时有按钮有时没有"的错觉 -->
                    <span
                      v-if="clipHeadState(selectedClipPair) === 'current'"
                      class="tag tag-success ns-vid-current-tag"
                    >
                      <Check :size="11" /> {{ t('narration.clips.isCurrentClip') }}
                    </span>
                    <button
                      v-else
                      class="btn btn-sm"
                      :disabled="clipHeadState(selectedClipPair) === 'none'"
                      :title="clipHeadState(selectedClipPair) === 'none'
                        ? t('narration.clips.useAsClipDisabledHint')
                        : t('narration.clips.useAsClipHint')"
                      @click="useHistoryAsClip(selectedClipPair)"
                    >
                      <Check :size="12" /> {{ t('narration.clips.useAsClip') }}
                    </button>
                    <!-- 详情常驻：没有生成记录时置灰并说明原因（原来直接消失，用户以为按钮时有时无） -->
                    <button
                      class="btn btn-sm"
                      :disabled="!detailTask(selectedClipPair)"
                      :title="detailTask(selectedClipPair)
                        ? t('narration.clips.detailTitle')
                        : t('narration.clips.detailDisabledHint')"
                      @click="openClipDetail(selectedClipPair)"
                    >
                      <Info :size="12" /> {{ t('narration.clips.detailTitle') }}
                    </button>
                  </div>
                </div>

                <!-- 播放舞台：生成中 / 有片可播 / 空态（空态内直接给生成入口，与漫剧一致） -->
                <div class="ns-vid-stage">
                  <div v-if="activeClipView.kind === 'generating'" class="ns-vid-empty">
                    <Loader2 :size="22" class="animate-spin" />
                    <div class="ns-vid-empty-copy">
                      <div class="ns-vid-empty-title">{{ t('narration.clips.emptyGenerating') }}</div>
                      <div class="ns-vid-empty-desc">{{ t('narration.clips.emptyGeneratingDesc') }}</div>
                    </div>
                  </div>
                  <div v-else-if="activeClipView.kind === 'failed'" class="ns-vid-empty is-error">
                    <div class="ns-vid-empty-copy">
                      <div class="ns-vid-empty-title">{{ t('narration.clips.failedTitle') }}</div>
                      <div class="ns-vid-empty-desc">{{ activeClipView.error || t('narration.clips.failedUnknown') }}</div>
                    </div>
                  </div>
                  <video
                    v-else-if="activeClipView.kind === 'video'"
                    :key="activeClipView.path"
                    :src="assetUrl(activeClipView.path)"
                    :poster="activeClipPoster(selectedClipPair) || undefined"
                    controls preload="metadata" playsinline
                    class="ns-vid-video"
                  ></video>
                  <div v-else class="ns-vid-empty">
                    <Clapperboard :size="22" />
                    <div class="ns-vid-empty-copy">
                      <div class="ns-vid-empty-title">{{ t('narration.clips.emptyNoClip') }}</div>
                      <div class="ns-vid-empty-desc">{{ t('narration.clips.emptyNoClipDesc') }}</div>
                    </div>
                    <button
                      class="btn btn-primary btn-sm"
                      :disabled="busy.clips || !effectiveFirstFrame(selectedClipPair) || clipState(selectedClipPair.shot) === 'generating'"
                      @click="generateClips([selectedClipPair])"
                    >{{ t('narration.clips.generate') }}</button>
                  </div>
                </div>

                <!-- 历史生成（同一段可多次生成，逐条查看/选用/删除） -->
                <div v-if="clipHistoryOf(selectedClipPair.shot).length" class="ns-clip-history">
                  <div class="ns-clip-history-head">
                    <span>{{ t('narration.clips.history') }}</span>
                    <span class="ns-clip-history-count">{{ clipHistoryOf(selectedClipPair.shot).length }}</span>
                  </div>
                  <div class="ns-clip-history-list">
                    <div
                      v-for="h in clipHistoryOf(selectedClipPair.shot)"
                      :key="h.id"
                      class="ns-clip-history-item"
                      :class="{ current: isHistoryCurrent(selectedClipPair.shot, h), viewing: isHistoryViewing(selectedClipPair, h), generating: !h.path && (h.status === 'processing' || h.status === 'pending'), failed: h.status === 'failed' && !h.path }"
                      role="button"
                      tabindex="0"
                      :title="h.error_msg || `${h.model || ''} · ${h.resolution || ''}`"
                      @click="previewClipHistory(h)"
                      @keydown.enter.prevent="previewClipHistory(h)"
                    >
                      <video v-if="h.path" :src="assetUrl(h.path)" preload="none" muted playsinline tabindex="-1"></video>
                      <div v-else-if="h.status === 'failed'" class="ns-clip-history-failed">!</div>
                      <div v-else class="ns-clip-history-loading"><Loader2 :size="14" class="animate-spin" /></div>
                      <span class="ns-clip-history-time mono">{{ formatHistoryTime(h.created_at) }}</span>
                      <span v-if="h.status === 'failed' && !h.path" class="ns-clip-history-badge is-failed">{{ t('narration.state.failed') }}</span>
                      <span v-else-if="!h.path" class="ns-clip-history-badge is-pending">{{ t('narration.state.generating') }}</span>
                      <span v-else-if="isHistoryCurrent(selectedClipPair.shot, h)" class="ns-clip-history-badge">{{ t('narration.clips.currentBadge') }}</span>
                      <!-- 可删：有成品文件的记录，以及**已失败**的记录（失败的没文件但一样是历史垃圾）。
                           只有「生成中」不给删除入口：删掉在跑的任务会让轮询失联 -->
                      <button
                        v-if="h.path || h.status === 'failed'"
                        type="button"
                        class="ns-clip-history-del"
                        :title="t('narration.clips.deleteRecord')"
                        @click.stop="askRemoveClipHistory(h)"
                      >×</button>
                    </div>
                  </div>
                </div>

                <!-- 检查器：参考帧 / 提示词 / 参数 / 生效参数 / 风险提示 / 主操作 -->
                <div class="ns-vid-inspector">
                  <section class="ns-vid-section">
                    <div class="ns-vid-section-head">
                      <span class="ns-vid-label">{{ t('narration.clips.refFrames') }}</span>
                      <span class="tag mono">{{ clipRefFrames(selectedClipPair).length }}</span>
                      <button
                        v-if="framesOverridden(selectedClipPair)"
                        type="button" class="btn btn-ghost btn-sm"
                        :title="t('narration.clips.resetFramesHint')"
                        @click="resetClipFrames(selectedClipPair)"
                      >{{ t('narration.clips.resetFrames') }}</button>
                    </div>
                    <div v-if="clipRefFrames(selectedClipPair).length" class="ns-vid-refs">
                      <button
                        v-for="ref in clipRefFrames(selectedClipPair)"
                        :key="ref.key"
                        type="button"
                        class="ns-vid-ref"
                        :class="{ overridden: ref.overridden }"
                        :title="ref.label"
                        @click="openImagePreview(selectedClipPair.shot, ref.src)"
                      >
                        <img :src="assetUrl(ref.src)" :alt="ref.label" loading="lazy" />
                        <small>{{ ref.label }}</small>
                      </button>
                      <!-- 首尾帧都可以从「多张关键帧候选」里换一张：点开候选条即选 -->
                      <div class="ns-frame-pickers">
                        <button type="button" class="btn btn-sm" @click="toggleFramePicker('first')">
                          {{ t('narration.clips.changeFirst') }}
                        </button>
                        <button
                          v-if="selectedClipPair.nextShot"
                          type="button" class="btn btn-sm"
                          @click="toggleFramePicker('last')"
                        >{{ t('narration.clips.changeLast') }}</button>
                      </div>
                    </div>
                    <div v-else class="ns-vid-refs-empty">{{ t('narration.clips.noRefFrames') }}</div>

                    <!-- 最后一镜只有首帧：说清楚"仍可生成"，避免以为不能出片 -->
                    <p v-if="selectedClipPair && !effectiveLastFrame(selectedClipPair)" class="field-hint">
                      {{ t('narration.clips.singleFrameHint') }}
                    </p>

                    <!-- 候选条：本镜候选给首帧，下一镜候选给尾帧（都含"跟随当前关键帧"） -->
                    <div v-if="framePicker" class="ns-frame-candidates">
                      <div class="ns-frame-candidates-head">
                        <span>{{ framePicker === 'first' ? t('narration.clips.pickFirst') : t('narration.clips.pickLast') }}</span>
                        <button type="button" class="btn btn-ghost btn-sm" @click="framePicker = ''">{{ t('narration.clips.pickClose') }}</button>
                      </div>
                      <div class="ns-frame-candidates-list">
                        <button
                          v-for="cand in framePickerCandidates(selectedClipPair)"
                          :key="cand.path"
                          type="button"
                          class="ns-kf-item ns-frame-cand"
                          :class="{ current: cand.active }"
                          :title="cand.label"
                          @click="chooseClipFrame(selectedClipPair, cand)"
                        >
                          <img :src="assetUrl(cand.path)" alt="" loading="lazy" />
                          <span v-if="cand.tag" class="ns-clip-history-badge">{{ cand.tag }}</span>
                        </button>
                        <div v-if="!framePickerCandidates(selectedClipPair).length" class="ns-vid-refs-empty">
                          {{ t('narration.clips.noCandidates') }}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section class="ns-vid-section">
                    <div class="ns-vid-section-head">
                      <span class="ns-vid-label">{{ t('narration.clips.clipPrompt') }}</span>
                      <span v-if="promptSaving" class="ns-vid-save-state">
                        <Loader2 :size="11" class="animate-spin" /> {{ t('narration.clips.promptSaving') }}
                      </span>
                      <span v-else-if="promptSavedFlash" class="ns-vid-save-state is-ok">
                        <Check :size="11" /> {{ t('narration.clips.promptSaved') }}
                      </span>
                      <span v-else-if="promptDirty" class="ns-vid-save-state is-dirty">{{ t('narration.clips.promptDirty') }}</span>
                      <!-- mousedown.prevent：点「放弃改动」时不让文本框失焦，避免 blur 先把改动提交上去 -->
                      <button
                        v-if="promptDirty"
                        type="button" class="btn btn-ghost btn-sm"
                        @mousedown.prevent
                        @click="resetPromptDraft"
                      >{{ t('narration.clips.promptReset') }}</button>
                      <button
                        type="button" class="btn btn-ghost btn-sm"
                        :disabled="!clipPromptOf(selectedClipPair)"
                        @click="copyClipPrompt(selectedClipPair)"
                      >{{ t('narration.clips.copyPrompt') }}</button>
                    </div>
                    <textarea
                      v-model="promptDraft"
                      class="textarea ns-vid-prompt-input"
                      rows="5"
                      :placeholder="t('narration.clips.promptPlaceholder')"
                      @blur="commitPrompt"
                      @keydown.ctrl.enter.prevent="commitPrompt"
                      @keydown.meta.enter.prevent="commitPrompt"
                    ></textarea>
                    <span class="field-hint">{{ t('narration.clips.promptHint') }}</span>
                  </section>

                  <section class="ns-vid-section">
                    <div class="ns-vid-section-head"><span class="ns-vid-label">{{ t('narration.clips.params') }}</span></div>
                    <div class="ns-vid-params">
                      <div class="ns-vid-param"><span>{{ t('narration.clips.paramAlign') }}</span><b class="mono">{{ selectedClipPair.targetDuration }}s</b></div>
                      <div class="ns-vid-param"><span>{{ t('narration.clips.paramClipDur') }}</span><b class="mono">{{ clipDurationOf(selectedClipPair) || '—' }}{{ clipDurationOf(selectedClipPair) ? 's' : '' }}</b></div>
                      <div class="ns-vid-param"><span>{{ t('narration.clips.paramResolution') }}</span><b class="mono">{{ exportResolution === 'default' ? t('narration.clips.resolutionDefault') : exportResolution }}</b></div>
                      <div class="ns-vid-param"><span>{{ t('narration.clips.paramAudio') }}</span><b>{{ form.clip_with_audio ? t('narration.clips.audioOn') : t('narration.clips.audioOff') }}</b></div>
                    </div>
                    <div class="ns-vid-effective">
                      {{ t('narration.clips.effective', {
                        model: videoPick.model || t('narration.clips.modelDefault'),
                        res: exportResolution === 'default' ? t('narration.clips.resolutionDefault') : exportResolution,
                        dur: selectedClipPair.targetDuration,
                      }) }}
                    </div>
                  </section>

                  <!-- 模型族与「首尾帧」素材模式不匹配：生成前就说明原因并给替代模型（漫剧同款护栏） -->
                  <div v-if="clipModelIssue(selectedClipPair)" class="ns-vid-warn">
                    <span>{{ clipModelIssue(selectedClipPair) }}</span>
                    <button v-if="frameCapableModel" type="button" class="btn btn-sm" @click="videoModel = frameCapableModel.key">
                      {{ t('narration.clips.switchModel', { model: frameCapableModel.model }) }}
                    </button>
                  </div>

                  <button
                    class="btn btn-primary ns-vid-action"
                    :disabled="busy.clips || !effectiveFirstFrame(selectedClipPair) || clipState(selectedClipPair.shot) === 'generating'"
                    @click="generateClips([selectedClipPair])"
                  >
                    <Loader2 v-if="clipState(selectedClipPair.shot) === 'generating'" :size="12" class="animate-spin" />
                    {{ clipActionLabel(selectedClipPair.shot) }}
                  </button>
                  <p class="field-hint">{{ t('narration.clips.multiHint') }}</p>
                </div>
              </div>

              <div v-else class="ns-clip-detail ns-empty">{{ t('narration.clips.pickHint') }}</div>
            </div>
          </template>
        </section>

        <!-- ⑥ 逐句配音 -->
        <section v-else-if="activeNode === 'audio'" class="card ns-card">
          <div class="ns-card-head">
            <h2 class="ns-card-title">{{ t('narration.audio.title') }}</h2>
            <p class="ns-card-desc">{{ t('narration.audio.desc', { rate: Number(form.speech_rate).toFixed(2) }) }}</p>
          </div>
          <p v-if="!shots.length" class="ns-empty">{{ t('narration.audio.needPlan') }}</p>
          <template v-else>
            <div class="ns-actions ns-actions-top">
              <button class="btn btn-primary" :disabled="busy.audio" @click="synthesizeShots(shotsMissingAudio)">
                <Loader2 v-if="busy.audio" :size="12" class="animate-spin" />
                <Mic v-else :size="13" />
                {{ t('narration.audio.synthMissing', { n: shotsMissingAudio.length }) }}
              </button>
              <button class="btn" :disabled="busy.audio" @click="synthesizeShots(shots)">
                <RefreshCw :size="13" /> {{ t('narration.audio.synthAll') }}
              </button>
              <span class="field-hint">{{ t('narration.audio.summary', { done: shotsWithAudio.length, total: shots.length, sec: totalAudioSec }) }}</span>
            </div>
            <div class="ns-audio-list">
              <article v-for="s in shots" :key="s.id" class="ns-audio-row">
                <span class="ns-shot-no mono">#{{ s.shot_number }}</span>
                <span class="ns-shot-badge" :class="audioState(s)">{{ t(`narration.state.${audioState(s)}`) }}</span>
                <span class="ns-audio-text">{{ s.narration_text }}</span>
                <span class="ns-clip-dur mono">{{ s.narration_audio_duration ? `${s.narration_audio_duration}s` : '—' }}</span>
                <audio v-if="s.narration_audio_url" :src="assetUrl(s.narration_audio_url)" controls preload="none"></audio>
                <button class="btn btn-sm" :disabled="busy.audio" @click="synthesizeShots([s])">{{ s.narration_audio_url ? t('narration.audio.redo') : t('narration.audio.synth') }}</button>
              </article>
            </div>
          </template>
        </section>

        <!-- ⑦ 拼接导出 -->
        <!-- ⑧ 字幕：成片之后的独立阶段（复用成片时间轴，独立编辑，硬烧/软字幕两条产物） -->
        <section v-else-if="activeNode === 'subtitles'" class="card ns-card">
          <div class="ns-card-head">
            <h2 class="ns-card-title">{{ t('narration.subs.title') }}</h2>
            <p class="ns-card-desc">{{ t('narration.subs.desc') }}</p>
          </div>

          <p v-if="!completedMerges.length" class="ns-empty">{{ t('narration.subs.needMerge') }}</p>
          <template v-else>
            <div class="ns-actions ns-actions-top">
              <label class="ns-inline-check">
                <span>{{ t('narration.subs.pickMerge') }}</span>
                <BaseSelect v-model="subtitleMergeId" :options="mergeOptions" />
              </label>
              <button class="btn btn-sm" :disabled="subLoading || !subtitleMergeId" @click="loadSubtitle()">
                <Loader2 v-if="subLoading" :size="12" class="animate-spin" /><RefreshCw v-else :size="13" />
                {{ t('narration.subs.reload') }}
              </button>
              <button class="btn btn-sm" :disabled="subSaving || !subLines.length" @click="saveSubtitle()">
                <Loader2 v-if="subSaving" :size="12" class="animate-spin" />
                {{ t('narration.subs.save') }}
              </button>
              <span v-if="subDirty" class="ns-dirty-chip">{{ t('narration.brief.unsaved') }}</span>
            </div>

            <p v-if="!subLines.length" class="ns-empty">{{ t('narration.subs.noLines') }}</p>
            <div v-else class="ns-sub-layout">
              <!-- 左：逐条字幕（时间只读，文本可编辑） -->
              <div class="ns-sub-lines">
                <div v-for="(line, i) in subLines" :key="line.index" class="ns-sub-line">
                  <span class="ns-sub-no mono">{{ i + 1 }}</span>
                  <span class="ns-sub-time mono">{{ formatSubTime(line.start) }} → {{ formatSubTime(line.end) }}</span>
                  <textarea
                    v-model="line.text"
                    class="textarea ns-sub-text"
                    rows="2"
                    @input="subDirty = true"
                  ></textarea>
                </div>
              </div>

              <!-- 右：样式与产物 -->
              <aside class="ns-sub-side">
                <div class="ns-vid-section">
                  <div class="ns-vid-section-head"><span class="ns-vid-label">{{ t('narration.subs.style') }}</span></div>
                  <div class="ns-sub-params">
                    <label class="ns-sub-param"><span>{{ t('narration.subs.maxChars') }}</span>
                      <input v-model.number="subStyle.maxChars" class="input" type="number" min="6" max="60" @input="subDirty = true" /></label>
                    <label class="ns-sub-param"><span>{{ t('narration.subs.fontSize') }}</span>
                      <input v-model.number="subStyle.fontSize" class="input" type="number" min="8" max="72" @input="subDirty = true" /></label>
                    <label class="ns-sub-param"><span>{{ t('narration.subs.offset') }}</span>
                      <input v-model.number="subStyle.offsetSec" class="input" type="number" step="0.1" min="-30" max="30" @input="subDirty = true" /></label>
                    <label class="ns-sub-param"><span>{{ t('narration.subs.outline') }}</span>
                      <input v-model.number="subStyle.outline" class="input" type="number" min="0" max="6" @input="subDirty = true" /></label>
                    <label class="ns-sub-param"><span>{{ t('narration.subs.marginV') }}</span>
                      <input v-model.number="subStyle.marginV" class="input" type="number" min="0" max="200" @input="subDirty = true" /></label>
                    <label class="ns-sub-param"><span>{{ t('narration.subs.color') }}</span>
                      <input v-model="subColorHex" class="input ns-sub-color" type="color" @input="onSubColorInput" /></label>
                  </div>
                  <span class="field-hint">{{ t('narration.subs.styleHint') }}</span>
                </div>

                <div class="ns-vid-section">
                  <div class="ns-vid-section-head"><span class="ns-vid-label">{{ t('narration.subs.render') }}</span></div>
                  <div class="ns-actions">
                    <button class="btn btn-primary btn-sm" :disabled="subRendering || !subtitleMergeId" @click="renderSubtitle(true, true)">
                      <Loader2 v-if="subRendering" :size="12" class="animate-spin" /><Film v-else :size="13" />
                      {{ t('narration.subs.renderBoth') }}
                    </button>
                    <button class="btn btn-sm" :disabled="subRendering || !subtitleMergeId" @click="renderSubtitle(true, false)">
                      {{ t('narration.subs.renderBurn') }}
                    </button>
                    <button class="btn btn-sm" :disabled="subRendering || !subtitleMergeId" @click="renderSubtitle(false, true)">
                      {{ t('narration.subs.renderSoft') }}
                    </button>
                  </div>
                  <span class="field-hint">{{ t('narration.subs.renderHint') }}</span>
                  <p v-if="subStatus === 'rendering'" class="field-hint">
                    <Loader2 :size="11" class="animate-spin" /> {{ t('narration.subs.rendering') }}
                  </p>
                  <p v-else-if="subStatus === 'failed'" class="ns-warn">{{ t('narration.subs.failed') }}：{{ subError }}</p>
                </div>

                <div v-if="subOutputs.length" class="ns-vid-section">
                  <div class="ns-vid-section-head"><span class="ns-vid-label">{{ t('narration.subs.outputs') }}</span></div>
                  <div class="ns-sub-outputs">
                    <a v-for="o in subOutputs" :key="o.url" class="ns-sub-output" :href="o.url" target="_blank" rel="noopener">
                      <span class="tag" :class="o.tagClass">{{ o.tag }}</span>
                      <span class="mono truncate">{{ o.url }}</span>
                    </a>
                  </div>
                </div>
              </aside>
            </div>
          </template>
        </section>

        <section v-else-if="activeNode === 'export'" class="card ns-card">
          <div class="ns-card-head">
            <h2 class="ns-card-title">{{ t('narration.export.title') }}</h2>
            <p class="ns-card-desc">{{ t('narration.export.desc') }}</p>
          </div>
          <p v-if="!shots.length" class="ns-empty">{{ t('narration.export.needShots') }}</p>
          <template v-else>
            <div class="ns-actions ns-actions-top">
              <label class="ns-inline-check"><input type="checkbox" :checked="allSelected" @change="toggleAllExport" /><span>{{ t('narration.export.selectAll') }}</span></label>
              <label class="ns-inline-check"><input v-model="exportIncludeAudio" type="checkbox" /><span>{{ t('narration.export.includeAudio') }}</span></label>
              <label class="ns-inline-check">
                <BaseSelect v-model="exportResolution" :options="resolutionOptions" />
              </label>
              <button class="btn btn-primary ml-auto" :disabled="merging || !exportSelectedIds.length" @click="startMerge">
                <Loader2 v-if="merging" :size="12" class="animate-spin" />
                <Film v-else :size="13" />
                {{ t('narration.export.start', { n: exportSelectedIds.length }) }}
              </button>
            </div>
            <div class="ns-plan-summary">
              <span class="ns-derived-item"><span class="ns-derived-label">{{ t('narration.export.plannedTotal') }}</span><span class="ns-derived-value mono">{{ exportPlannedSec }}s</span></span>
              <span class="ns-derived-item"><span class="ns-derived-label">{{ t('narration.export.segments') }}</span><span class="ns-derived-value mono">{{ exportSelectedIds.length }}</span></span>
            </div>
            <div class="ns-export-list">
              <label v-for="s in shots" :key="s.id" class="ns-export-row" :class="{ off: !exportSelectedIds.includes(s.id) }">
                <input type="checkbox" :checked="exportSelectedIds.includes(s.id)" @change="toggleExport(s.id)" />
                <div
                  class="ns-thumb ns-thumb-sm"
                  :class="{ 'is-zoomable': !!s.keyframe_image }"
                  @click.prevent="s.keyframe_image && openImagePreview(s)"
                >
                  <img v-if="s.keyframe_image" :src="assetUrl(s.keyframe_image)" alt="" loading="lazy" />
                  <span v-else class="ns-thumb-empty">—</span>
                </div>
                <div class="ns-export-mid">
                  <span class="ns-shot-no mono">#{{ s.shot_number }}</span>
                  <span class="ns-audio-text">{{ s.narration_text }}</span>
                </div>
                <span class="ns-shot-badge" :class="clipState(s)">{{ t(`narration.state.${clipState(s)}`) }}</span>
                <span class="ns-clip-dur mono">{{ s.duration_sec }}s</span>
              </label>
            </div>
            <p v-if="mergeStatusText" class="ns-ok-hint">{{ mergeStatusText }}</p>
          </template>
        </section>

        <!-- ⑧ 成片列表 -->
        <section v-else class="card ns-card">
          <div class="ns-card-head">
            <h2 class="ns-card-title">{{ t('narration.merges.title') }}</h2>
            <p class="ns-card-desc">{{ t('narration.merges.desc') }}</p>
          </div>
          <p v-if="!merges.length" class="ns-empty">{{ t('narration.merges.empty') }}</p>
          <div v-else class="ns-merge-list">
            <article v-for="m in merges" :key="m.id" class="ns-merge-row">
              <div class="ns-merge-main">
                <span class="ns-shot-badge" :class="m.status === 'completed' ? 'done' : (m.status === 'failed' ? 'failed' : 'pending')">
                  {{ t(`narration.state.${m.status === 'completed' ? 'done' : (m.status === 'failed' ? 'failed' : 'pending')}`) }}
                </span>
                <span class="ns-merge-title">{{ m.title || t('narration.merges.untitled') }}</span>
                <span class="ns-clip-dur mono">{{ m.duration ? m.duration + 's' : '—' }}</span>
                <span class="ns-merge-time mono">{{ String(m.created_at || '').slice(0, 16).replace('T', ' ') }}</span>
              </div>
              <p v-if="m.error_msg" class="ns-warn">{{ m.error_msg }}</p>
              <div v-if="m.merged_url" class="ns-merge-body">
                <video class="ns-merge-video" :src="assetUrl(m.merged_url)" controls preload="metadata"></video>
                <div class="ns-merge-actions">
                  <a class="btn btn-sm" :href="assetUrl(m.merged_url)" :download="`narration-${m.id}.mp4`">{{ t('narration.merges.download') }}</a>
                  <button class="btn btn-danger btn-sm" @click="removeMerge(m)">{{ t('narration.merges.delete') }}</button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>

    <!-- 生成详情：与漫剧「视频详情」同构，展示这一条记录的生成参数与提示词 -->
    <div v-if="clipDetail" class="overlay" @click.self="clipDetail = null">
      <div class="dialog ns-detail-dialog" role="dialog" aria-modal="true" :aria-label="t('narration.clips.detailTitle')">
        <div class="ns-detail-head">
          <div class="ns-detail-title">{{ t('narration.clips.detailTitle') }}</div>
          <span class="dim ns-detail-sub">{{ clipDetailSubtitle }}</span>
          <button class="btn btn-ghost btn-icon ml-auto" :aria-label="t('narration.preview.close')" @click="clipDetail = null">
            <X :size="14" />
          </button>
        </div>
        <div class="ns-detail-body">
          <dl class="ns-detail-grid">
            <dt>{{ t('narration.clips.detailModel') }}</dt>
            <dd><span class="mono">{{ clipDetail.model || '—' }}</span><span class="dim"> · {{ clipDetail.provider || '—' }}</span></dd>

            <dt>{{ t('narration.clips.detailOutput') }}</dt>
            <dd class="mono">
              {{ [clipDetail.resolution || t('narration.clips.resolutionDefault'),
                  clipDetail.duration ? clipDetail.duration + 's' : ''].filter(Boolean).join(' · ') || '—' }}
            </dd>

            <dt>{{ t('narration.clips.detailRefs') }}</dt>
            <dd>
              <span class="mono">{{ t('narration.clips.detailRefFrames', { n: clipDetailRefCount }) }}</span>
              <span v-if="clipDetail.generate_audio" class="tag tag-success">{{ t('narration.clips.detailAudioOn') }}</span>
            </dd>

            <dt>{{ t('narration.clips.detailStatus') }}</dt>
            <dd>
              <span class="tag" :class="clipDetail.status === 'completed' ? 'tag-success' : 'tag-error'">{{ historyStatusLabel(clipDetail.status) }}</span>
              <span class="dim mono">{{ clipDetail.status }}</span>
              <span v-if="clipDetail.elapsed_sec" class="tag">{{ t('narration.clips.detailElapsed', { dur: formatDuration(clipDetail.elapsed_sec) }) }}</span>
            </dd>

            <dt>{{ t('narration.clips.detailUpstream') }}</dt>
            <dd class="mono">{{ clipDetail.task_id || '—' }}</dd>

            <dt>{{ t('narration.clips.detailTiming') }}</dt>
            <dd class="mono">{{ formatFullTime(clipDetail.created_at) || '—' }}</dd>

            <dt>{{ t('narration.clips.detailFile') }}</dt>
            <dd class="mono ns-detail-path">{{ clipDetail.path || t('narration.clips.detailNoFile') }}</dd>
          </dl>

          <div v-if="clipDetail.error_msg" class="ns-detail-error">
            <span class="ns-detail-error-label">{{ t('narration.clips.detailError') }}</span>
            <span class="mono">{{ clipDetail.error_msg }}</span>
          </div>

          <div class="ns-detail-prompt-head">
            <span class="ns-vid-label">{{ t('narration.clips.detailPrompt') }}</span>
            <button type="button" class="btn btn-ghost btn-sm" :disabled="!clipDetail.prompt" @click="copyText(clipDetail.prompt)">
              {{ t('narration.clips.copyPrompt') }}
            </button>
          </div>
          <pre v-if="clipDetail.prompt" class="ns-detail-prompt">{{ clipDetail.prompt }}</pre>
          <p v-else class="ns-detail-prompt dim">{{ t('narration.clips.noPrompt') }}</p>
        </div>
      </div>
    </div>

    <!-- 删除候选关键帧：同样不可撤销，二次确认 -->
    <ConfirmDialog
      :open="!!keyframeToDelete"
      :title="t('narration.images.deleteCandidateTitle')"
      :message="keyframeDeleteMessage()"
      :confirm-text="t('narration.clips.deleteConfirmOk')"
      :loading="keyframeDeleting"
      @cancel="keyframeToDelete = null"
      @confirm="confirmRemoveKeyframe"
    />

    <!-- 删除生成历史：不可撤销，必须二次确认（缩略图角上的小 × 很容易误点） -->
    <ConfirmDialog
      :open="!!clipHistoryToDelete"
      :title="t('narration.clips.deleteConfirmTitle')"
      :message="clipHistoryDeleteMessage()"
      :confirm-text="t('narration.clips.deleteConfirmOk')"
      :loading="clipHistoryDeleting"
      @cancel="clipHistoryToDelete = null"
      @confirm="confirmRemoveClipHistory"
    />

    <!-- 关键帧放大预览：缩略图太小看不清构图与文字，需要能放大逐镜审图 -->
    <Teleport to="body">
      <div
        v-if="preview"
        class="ns-lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="t('narration.preview.title')"
        @click.self="closePreview"
      >
        <div class="ns-lightbox-panel">
          <header class="ns-lightbox-head">
            <span class="ns-shot-no mono">#{{ preview.shotNumber }}</span>
            <span class="ns-lightbox-title truncate">{{ preview.title }}</span>
            <span v-if="preview.total > 1" class="ns-lightbox-count mono">{{ preview.index + 1 }} / {{ preview.total }}</span>
            <div class="ns-lightbox-actions">
              <button type="button" class="btn btn-sm" @click="togglePreviewZoom">
                {{ preview.zoom === 'fit' ? t('narration.preview.actual') : t('narration.preview.fit') }}
              </button>
              <a class="btn btn-sm" :href="preview.src" target="_blank" rel="noopener">{{ t('narration.preview.open') }}</a>
              <button type="button" class="btn btn-icon btn-sm" :title="t('narration.preview.close')" @click="closePreview">
                <X :size="14" />
              </button>
            </div>
          </header>
          <div class="ns-lightbox-body" :class="preview.zoom">
            <img :src="preview.src" :alt="preview.title" />
          </div>
          <footer class="ns-lightbox-foot">
            <p v-if="preview.narration" class="ns-lightbox-narration">{{ preview.narration }}</p>
            <p v-if="preview.prompt" class="ns-lightbox-prompt">{{ preview.prompt }}</p>
            <div class="ns-lightbox-nav">
              <button type="button" class="btn btn-sm" :disabled="preview.index <= 0" @click="stepPreview(-1)">
                ← {{ t('narration.preview.prev') }}
              </button>
              <button type="button" class="btn btn-sm" :disabled="preview.index >= preview.total - 1" @click="stepPreview(1)">
                {{ t('narration.preview.next') }} →
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { Loader2, Sparkles, Wand2, ImagePlus, RefreshCw, Clapperboard, Mic, Film, Maximize2, X, Check, Info } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import BaseSelect from '~/components/BaseSelect.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import ModelSelect from '~/components/ModelSelect.vue'
import { aiConfigAPI, dramaAPI, mergeAPI, narrationAPI, storyboardAPI, taskAPI } from '~/composables/useApi'
import { toastError } from '~/composables/useToast'
// 顶栏模型选择：与漫剧工作台共用同一套 key 语义与存储键（见 app/utils/model-picks.ts）
import {
  MODEL_STORE_KEYS, collectModelOptions, hasMultiConfigs, readStoredModel, storeModel,
  resolveEffectiveModel,
} from '~/utils/model-picks'

definePageMeta({ layout: 'studio' })

const { t } = useI18n()
const route = useRoute()
const dramaId = Number(route.params.id)

// 与后端 MIN/MAX_SPEECH_RATE 保持一致
const rateRange = { min: 0.5, max: 2 }
const ratePresets = [1.0, 1.1, 1.2, 1.5]

const loading = ref(false)
const briefSaving = ref(false)
const writing = ref(false)
const planning = ref(false)
const selecting = ref(null)
const merging = ref(false)
const busy = reactive({ images: false, clips: false, audio: false })

const drama = ref(null)
const episodeId = ref(null)
const scripts = ref([])
const plan = ref(null)
const shots = ref([])
const merges = ref([])
const generatingCounts = ref(null)
const activeNode = ref('brief')

const exportSelectedIds = ref([])
const exportIncludeAudio = ref(true)
const exportResolution = ref('720p')
const mergeStatusText = ref('')

// ===== 顶栏模型选择（文本/图片/视频/音频/分辨率）=====
// 与漫剧工作台共用 localStorage 键：换过模型后两个工作台都是同一个选择
const textConfigs = ref([])
const imageConfigs = ref([])
const videoConfigs = ref([])
const audioConfigs = ref([])
const chatModel = ref(readStoredModel(MODEL_STORE_KEYS.chat, 'huobao:model:rewrite'))
const imageModel = ref(readStoredModel(MODEL_STORE_KEYS.image))
const videoModel = ref(readStoredModel(MODEL_STORE_KEYS.video))
const audioModel = ref(readStoredModel(MODEL_STORE_KEYS.audio))
const textModelOptions = computed(() => collectModelOptions(textConfigs.value))
const imageModelOptions = computed(() => collectModelOptions(imageConfigs.value))
const videoModelOptions = computed(() => collectModelOptions(videoConfigs.value))
const audioModelOptions = computed(() => collectModelOptions(audioConfigs.value))
const textModelMultiCfg = computed(() => hasMultiConfigs(textModelOptions.value))
const imageModelMultiCfg = computed(() => hasMultiConfigs(imageModelOptions.value))
const videoModelMultiCfg = computed(() => hasMultiConfigs(videoModelOptions.value))
const audioModelMultiCfg = computed(() => hasMultiConfigs(audioModelOptions.value))
for (const [modelRef, key] of [
  [chatModel, MODEL_STORE_KEYS.chat], [imageModel, MODEL_STORE_KEYS.image],
  [videoModel, MODEL_STORE_KEYS.video], [audioModel, MODEL_STORE_KEYS.audio],
]) {
  watch(modelRef, v => storeModel(key, v))
}
/** Agent 调用参数：模型与配置 id 必须成对下发 */
const textPick = computed(() => resolveEffectiveModel(chatModel.value, textModelOptions.value))
const imagePick = computed(() => resolveEffectiveModel(imageModel.value, imageModelOptions.value))
const videoPick = computed(() => resolveEffectiveModel(videoModel.value, videoModelOptions.value))
/** 配音参数：音频配置 + 该配置下的具体模型（逐句配音用） */
const audioPick = computed(() => resolveEffectiveModel(audioModel.value, audioModelOptions.value))
// 每秒走时：让卡片上的「已用时」真的在动（任务表没有百分比字段）
const now = ref(Date.now())
let tickTimer = null

const form = reactive({
  topic: '', target_duration_sec: 60, aspect_ratio: '16:9',
  speech_rate: 1.1, voice_id: '', clip_with_audio: false,
})

/** 树形菜单：分区 → 子项（与漫剧工作台同一层级语义，右侧只渲染当前子项） */
const tree = computed(() => ([
  {
    key: 'create',
    label: t('narration.sections.create'),
    items: [
      { key: 'brief', label: t('narration.tree.brief') },
      { key: 'scripts', label: t('narration.tree.scripts') },
    ],
  },
  {
    key: 'produce',
    label: t('narration.sections.produce'),
    items: [
      { key: 'plan', label: t('narration.tree.plan') },
      { key: 'images', label: t('narration.tree.images') },
      { key: 'clips', label: t('narration.tree.clips') },
      { key: 'audio', label: t('narration.tree.audio') },
    ],
  },
  {
    key: 'export',
    label: t('narration.sections.export'),
    items: [
      { key: 'export', label: t('narration.tree.export') },
      // 字幕独立成阶段：它消费「已成片」的记录，产出带字幕的新成片
      { key: 'subtitles', label: t('narration.tree.subtitles') },
      { key: 'merges', label: t('narration.tree.merges') },
    ],
  },
]))

const durationOptions = computed(() => [
  { label: t('narration.duration.sec30'), value: 30 },
  { label: t('narration.duration.sec60'), value: 60 },
  { label: t('narration.duration.sec90'), value: 90 },
  { label: t('narration.duration.sec120'), value: 120 },
  { label: t('narration.duration.sec180'), value: 180 },
  { label: t('narration.duration.sec300'), value: 300 },
])
const aspectOptions = computed(() => [
  { label: '16:9', value: '16:9' }, { label: '9:16', value: '9:16' }, { label: '1:1', value: '1:1' },
])
const resolutionOptions = computed(() => [
  { label: t('narration.export.res720'), value: '720p' },
  { label: t('narration.export.res1080'), value: '1080p' },
])

// ===== 派生值（与后端同一套算式：4.2 字/秒 × 倍速）=====
const BASE_CHARS_PER_SECOND = 4.2
const derivedCharsPerSecond = computed(() => Math.round(BASE_CHARS_PER_SECOND * (Number(form.speech_rate) || 1.1) * 100) / 100)
const derivedCharBudget = computed(() => Math.round((Number(form.target_duration_sec) || 60) * derivedCharsPerSecond.value))
const derivedShotEstimate = computed(() => Math.max(1, Math.round((Number(form.target_duration_sec) || 60) / 4.5)))

const canWrite = computed(() => form.topic.trim().length > 0 && !!episodeId.value)
const selectedScript = computed(() => scripts.value.find(s => s.is_selected) || null)

const shotsWithImage = computed(() => shots.value.filter(s => !!s.keyframe_image))
const shotsMissingImage = computed(() => shots.value.filter(s => !s.keyframe_image))
const shotsGeneratingImage = computed(() => shots.value.filter(s => imageState(s) === 'generating'))
const shotsWithAudio = computed(() => shots.value.filter(s => !!s.narration_audio_url))
const shotsMissingAudio = computed(() => shots.value.filter(s => !s.narration_audio_url))
const totalAudioSec = computed(() => Math.round(shotsWithAudio.value.reduce((n, s) => n + (s.narration_audio_duration || 0), 0) * 100) / 100)
const shotsWithClip = computed(() => shots.value.filter(s => !!s.video_url))
const shotsGeneratingClip = computed(() => shots.value.filter(s => clipState(s) === 'generating'))

/** 首尾帧配对：镜头 i 的片段用「i 的关键帧 → i+1 的关键帧」 */
const clipPairs = computed(() => shots.value.map((s, i) => {
  const nextShot = shots.value[i + 1] || null
  const next = nextShot?.keyframe_image || ''
  return { shot: s, next, nextShot, targetDuration: Math.round((s.duration_sec || 0) * 100) / 100 }
}))
const clipCandidates = computed(() => clipPairs.value.filter(p => !p.shot.video_url && effectiveFirstFrame(p)))
const lastShotHint = computed(() => (shots.value.length ? t('narration.clips.lastHint') : ''))

const allSelected = computed(() => shots.value.length > 0 && exportSelectedIds.value.length === shots.value.length)
const exportPlannedSec = computed(() => Math.round(shots.value
  .filter(s => exportSelectedIds.value.includes(s.id))
  .reduce((n, s) => n + (s.duration_sec || 0), 0) * 100) / 100)

function sectionHasActive(sec) { return sec.items.some(i => i.key === activeNode.value) }
function sectionDone(sec) { return sec.items.every(i => nodeDone(i.key)) }
function nodeDone(key) {
  if (key === 'brief') return !!form.topic.trim()
  if (key === 'scripts') return !!selectedScript.value
  if (key === 'plan') return shots.value.length > 0
  if (key === 'images') return shots.value.length > 0 && shotsMissingImage.value.length === 0
  if (key === 'clips') return shots.value.length > 0 && clipCandidates.value.length === 0
  if (key === 'audio') return shots.value.length > 0 && shotsMissingAudio.value.length === 0
  if (key === 'export') return merges.value.some(m => m.status === 'completed')
  return false
}
/** 子项右侧的计数徽标（未完成时提示还差多少） */
function nodeBadge(key) {
  if (key === 'scripts') return scripts.value.length ? String(scripts.value.length) : ''
  if (key === 'plan') return shots.value.length ? String(shots.value.length) : ''
  if (key === 'images') return shotsMissingImage.value.length ? `${shotsWithImage.value.length}/${shots.value.length}` : ''
  if (key === 'clips') return clipCandidates.value.length ? `${shotsWithClip.value.length}/${shots.value.length}` : ''
  if (key === 'audio') return shotsMissingAudio.value.length ? `${shotsWithAudio.value.length}/${shots.value.length}` : ''
  if (key === 'merges') return merges.value.length ? String(merges.value.length) : ''
  return ''
}

function assetUrl(p) {
  if (!p) return ''
  return p.startsWith('http') || p.startsWith('data:') ? p : `/${p}`
}
function imageState(s) {
  const st = String(s.image_task?.status || '')
  if (st === 'processing' || st === 'pending') return 'generating'
  // 失败且当前没有可用图片 → 展示失败；已有图片则视为已完成（重绘失败不该抹掉旧图）
  if (st === 'failed' && !s.keyframe_image) return 'failed'
  return s.keyframe_image ? 'done' : 'pending'
}
function audioState(s) { return s.narration_audio_url ? 'done' : 'pending' }
function clipState(s) {
  const st = String(s.clip_task?.status || '')
  if (st === 'processing' || st === 'pending') return 'generating'
  if (st === 'failed' && !s.video_url) return 'failed'
  return s.video_url ? 'done' : 'pending'
}
/** 生成中的已用时（秒）：任务创建至今，前端每秒重算一次，让卡片上的进度真的在动 */
function taskElapsed(task) {
  if (!task?.created_at) return 0
  const started = new Date(String(task.created_at)).getTime()
  if (!Number.isFinite(started)) return task.elapsed_sec ?? 0
  return Math.max(0, Math.round((now.value - started) / 1000))
}

// ===== 首尾帧片段：片段选择 + 历史版本（与漫剧视频页同一套交互）=====
/** 超过这个秒数就不再用秒数表达进度：卡住的任务会显示成上千万秒，反而看不出问题 */
const STALLED_TASK_SEC = 7200
/**
 * 生成中任务的用时文案。
 * 为什么要封顶：任务若因中断残留在 processing（例如上次生成时关掉了应用），
 * 秒数会无限增长，出现「已用时 24669372 秒」这种把异常显示成正常进度的读数。
 */
function elapsedText(task) {
  const sec = taskElapsed(task)
  return sec > STALLED_TASK_SEC
    ? t('narration.clips.generatingStalled')
    : t('narration.clips.generatingFor', { sec })
}

/** 当前选中的片段（左列点选） */
const selectedClipShotId = ref(0)
/** 历史条里正在查看的那条记录（空 = 看该段主视频） */
const previewClipTaskId = ref(0)
const selectedClipPair = computed(() =>
  clipPairs.value.find(p => p.shot.id === selectedClipShotId.value) || clipPairs.value[0] || null)

/** 该段的视频生成历史（新→旧），由后端随镜头列表一并返回 */
function clipHistoryOf(shot) { return shot?.clip_history || [] }

/** 正在查看的历史记录（**任意状态**：还没成品的生成中/失败记录也要能表达） */
function activeHistoryRecord(pair) {
  const id = previewClipTaskId.value
  if (!id || !pair) return null
  return clipHistoryOf(pair.shot).find(h => h.id === id) || null
}
/** 正在查看的、且已有成品文件的历史记录 */
function activeHistoryTask(pair) {
  const h = activeHistoryRecord(pair)
  return h && h.path ? h : null
}
/**
 * 主播放器当前应播放的地址：优先历史点选，其次该段主视频。
 * 正在查看一条**还没成品**的记录（生成中/失败）时返回空串——否则会把旧的主视频当成它的结果展示。
 */
function activeClipPath(pair) {
  const h = activeHistoryTask(pair)
  if (h) return h.path
  if (activeHistoryRecord(pair)) return ''
  return pair?.shot?.video_url || ''
}
/** 该历史条是否正在被查看（统一转成 `/xxx` 再比，避免相对路径与站点路径前缀不一致） */
function isHistoryViewing(pair, h) {
  const rec = activeHistoryRecord(pair)
  return !!rec && rec.id === h.id
}

/**
 * 主播放器要表达的状态：历史点选 > 该段生成状态 > 主视频。
 * 用一个 computed 收口，模板里不再堆条件分支。
 */
const activeClipView = computed(() => {
  const pair = selectedClipPair.value
  if (!pair) return { kind: 'empty' }
  const shot = pair.shot
  const rec = activeHistoryRecord(pair)
  if (rec) {
    if (rec.path) return { kind: 'video', path: rec.path }
    if (rec.status === 'failed') return { kind: 'failed', error: rec.error_msg }
    return { kind: 'generating', task: rec }
  }
  const state = clipState(shot)
  if (state === 'generating') return { kind: 'generating', task: shot.clip_task }
  if (state === 'failed') return { kind: 'failed', error: shot.clip_task?.error_msg }
  return shot.video_url ? { kind: 'video', path: shot.video_url } : { kind: 'empty' }
})
/** 历史点选（只影响播放/选用，不改主视频，避免误改导出结果） */
function previewClipHistory(h) {
  if (!h) return
  previewClipTaskId.value = previewClipTaskId.value === h.id ? 0 : h.id
}
/** 该条历史是否就是当前主视频（等于 storyboard.video_url） */
function isHistoryCurrent(shot, h) { return !!h?.path && h.path === shot?.video_url }
/** 当前查看的这条历史是否已被选为成片片段 */
function isActiveClipSelected(pair) {
  const h = activeHistoryTask(pair)
  return !!h && isHistoryCurrent(pair.shot, h)
}

/**
 * 头部「设为成片片段」这一格该显示什么：'current'（已是当前，显示状态标签）
 * / 'use'（可选用）/ 'none'（还没有可用的成品版本）。
 *
 * 为什么不能只看"有没有显式点过历史"：没点过时播放区放的就是当前成片片段，
 * 此时再显示一个禁用的「设为成片片段」，用户根本看不出它已经是当前版本。
 */
function clipHeadState(pair) {
  if (!pair) return 'none'
  const h = activeHistoryTask(pair)
  if (h) return isHistoryCurrent(pair.shot, h) ? 'current' : 'use'
  return pair.shot.video_url ? 'current' : 'none'
}

/** 把查看中的历史版本写回该段主视频（导出的依据） */
async function useHistoryAsClip(pair) {
  const h = activeHistoryTask(pair)
  if (!h || !pair) return
  try {
    await narrationAPI.setShotClip(dramaId, pair.shot.id, h.id)
    await loadShots()
    toast.success(t('narration.clips.useAsClipDone', { n: pair.shot.shot_number }))
  } catch (e) {
    toastError(e, { fallback: 'narration.clips.useAsClipFailed' })
  }
}

/** 删除一条历史记录（只删 sys_task 记录，不删磁盘文件：主视频仍可播） */
async function removeClipHistory(h) {
  if (!h?.id) return
  try {
    await taskAPI.del(h.id)
    if (previewClipTaskId.value === h.id) previewClipTaskId.value = 0
    await loadShots()
    toast.success(t('narration.clips.recordDeleted'))
  } catch (e) {
    toastError(e, { fallback: 'narration.clips.deleteFailed' })
  }
}

/**
 * 删除历史记录要二次确认：这是**不可撤销**的操作，
 * 而且是缩略图角上的小 × ——误点一次就少一个生成版本（真金白银生成的）。
 */
const clipHistoryToDelete = ref(null)
const clipHistoryDeleting = ref(false)
function askRemoveClipHistory(h) {
  if (!h?.id) return
  clipHistoryToDelete.value = h
}
function clipHistoryDeleteMessage() {
  const h = clipHistoryToDelete.value
  if (!h) return ''
  // 失败记录没有成品文件：不能照搬「磁盘文件仍保留」那句（会让人以为还能找回视频）
  if (!h.path) {
    return t('narration.clips.deleteConfirmMessageFailed', {
      time: formatHistoryTime(h.created_at) || '—',
      model: h.model || '—',
      error: (h.error_msg || '').slice(0, 120) || t('narration.clips.failedUnknown'),
    })
  }
  return t('narration.clips.deleteConfirmMessage', {
    time: formatHistoryTime(h.created_at) || '—',
    model: h.model || '—',
  })
}
async function confirmRemoveClipHistory() {
  const h = clipHistoryToDelete.value
  if (!h) return
  clipHistoryDeleting.value = true
  try {
    await removeClipHistory(h)
    clipHistoryToDelete.value = null
  } finally {
    clipHistoryDeleting.value = false
  }
}

/** 历史时间戳：只显示到分钟，列表里不必看秒 */
function formatHistoryTime(ts) {
  const d = new Date(String(ts || ''))
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 完整时间（详情弹框用）：到秒 */
function formatFullTime(ts) {
  const d = new Date(String(ts || ''))
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 秒 → 可读耗时 */
function formatDuration(sec) {
  const s = Math.max(0, Number(sec) || 0)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m${String(Math.round(s % 60)).padStart(2, '0')}s`
}

// ===== 片段检查器（结构对齐漫剧「分镜视频」面板）=====
/** 状态标签：把播放器状态映射成与漫剧同口径的文案 */
const activeClipStateLabel = computed(() => {
  const pair = selectedClipPair.value
  if (!pair) return ''
  const kind = activeClipView.value.kind
  if (kind === 'generating') return t('narration.state.generating')
  if (kind === 'failed') return t('narration.state.failed')
  // 正在看某条历史版本时按该记录的归属表达（当前成片 / 历史版本）
  if (kind === 'video') {
    const h = activeHistoryRecord(pair)
    if (h) return isHistoryCurrent(pair.shot, h) ? t('narration.clips.currentBadge') : t('narration.clips.historyBadge')
  }
  return kind === 'video' ? t('narration.state.done') : t('narration.state.pending')
})

/** 主按钮文案：生成 / 重新生成 */
function clipActionLabel(shot) {
  return shot?.video_url ? t('narration.clips.regenerate') : t('narration.clips.generate')
}

/** 片段时长：优先实测配音时长（画面按它定长），否则用计划时长 */
function clipDurationOf(pair) {
  const shot = pair?.shot
  if (!shot) return 0
  const measured = Number(shot.narration_audio_duration) || 0
  const planned = Number(shot.duration_sec) || 0
  const target = Number(pair?.targetDuration) || 0
  return Number((measured || planned || target || 0).toFixed(2))
}

/** 该段的参考帧（首帧 = 本镜选用的图，尾帧 = 下一镜选用的图；未选用则跟随当前关键帧） */
function clipRefFrames(pair) {
  if (!pair) return []
  const out = []
  const first = effectiveFirstFrame(pair)
  const last = effectiveLastFrame(pair)
  if (first) out.push({ key: `f${pair.shot.id}`, src: first, label: t('narration.clips.firstFrame'), overridden: !!pair.shot.clip_first_frame })
  if (last) out.push({ key: `l${pair.shot.id}`, src: last, label: t('narration.clips.lastFrame'), overridden: !!pair.shot.clip_last_frame })
  return out
}

// ===== 片段首尾帧：可从「多张关键帧候选」里挑 =====
/** 生效的首帧：显式选用优先，否则本镜当前关键帧 */
function effectiveFirstFrame(pair) {
  return pair?.shot?.clip_first_frame || pair?.shot?.keyframe_image || ''
}
/** 生效的尾帧：显式选用优先，否则下一镜当前关键帧 */
function effectiveLastFrame(pair) {
  return pair?.shot?.clip_last_frame || pair?.next || ''
}
function framesOverridden(pair) {
  return !!(pair?.shot?.clip_first_frame || pair?.shot?.clip_last_frame)
}

/** 候选列表：该镜（首帧）或下一镜（尾帧）保留的所有关键帧图片，另附「跟随当前关键帧」项 */
const framePicker = ref('')
function toggleFramePicker(kind) {
  framePicker.value = framePicker.value === kind ? '' : kind
}
function keyframeCandidates(shot) {
  const list = []
  const push = (path, tag) => {
    if (!path || list.some(x => x.path === path)) return
    list.push({ path, tag })
  }
  push(shot?.keyframe_image, t('narration.images.useShort'))
  for (const k of (shot?.keyframe_history || [])) push(k.path, '')
  return list
}
function framePickerCandidates(pair) {
  if (!pair) return []
  const side = framePicker.value
  const shot = side === 'first' ? pair.shot : pair.nextShot
  if (!shot) return []
  const active = side === 'first' ? effectiveFirstFrame(pair) : effectiveLastFrame(pair)
  return keyframeCandidates(shot).map(c => ({
    ...c,
    active: c.path === active,
    tag: c.path === active ? t('narration.clips.currentBadge') : c.tag,
    side,
  }))
}

/** 选用某张候选作为该段首帧/尾帧（写回 clip_first_frame / clip_last_frame） */
async function chooseClipFrame(pair, cand) {
  if (!pair || !cand?.path) return
  const patch = cand.side === 'first' ? { first_frame: cand.path } : { last_frame: cand.path }
  try {
    await narrationAPI.setShotClipFrames(dramaId, pair.shot.id, patch)
    if (cand.side === 'first') pair.shot.clip_first_frame = cand.path
    else pair.shot.clip_last_frame = cand.path
    framePicker.value = ''
    toast.success(t('narration.clips.frameChosen', { label: cand.side === 'first' ? t('narration.clips.firstFrame') : t('narration.clips.lastFrame') }))
  } catch (e) {
    toastError(e, { fallback: 'narration.clips.frameChooseFailed' })
  }
}

/** 恢复默认：清掉显式选用，回到「本镜 → 下一镜当前关键帧」 */
async function resetClipFrames(pair) {
  if (!pair) return
  try {
    await narrationAPI.setShotClipFrames(dramaId, pair.shot.id, { first_frame: '', last_frame: '' })
    pair.shot.clip_first_frame = ''
    pair.shot.clip_last_frame = ''
    framePicker.value = ''
    toast.success(t('narration.clips.framesReset'))
  } catch (e) {
    toastError(e, { fallback: 'narration.clips.frameChooseFailed' })
  }
}

// ===== 关键帧候选图（一个镜头保留多张）=====
function keyframeHistoryOf(shot) { return shot?.keyframe_history || [] }
function isCurrentKeyframe(shot, k) { return !!k?.path && k.path === shot?.keyframe_image }

/** 把某张候选设为该镜当前关键帧：下游（片段首帧）默认就取它 */
async function useKeyframeAsCurrent(shot, k) {
  if (!shot || !k?.id) return
  try {
    await narrationAPI.setShotKeyframe(dramaId, shot.id, k.id)
    await loadShots()
    toast.success(t('narration.images.useAsCurrentDone', { n: shot.shot_number }))
  } catch (e) {
    toastError(e, { fallback: 'narration.images.useAsCurrentFailed' })
  }
}

/** 删除候选图同样需要二次确认（不可撤销；当前关键帧不提供删除入口，避免把选中的那张从候选里抹掉） */
const keyframeToDelete = ref(null)
const keyframeDeleting = ref(false)
function askRemoveKeyframe(shot, k) {
  if (!shot || !k?.id) return
  keyframeToDelete.value = { shot, candidate: k }
}
function keyframeDeleteMessage() {
  const item = keyframeToDelete.value
  if (!item) return ''
  return t('narration.images.deleteCandidateMessage', {
    time: formatHistoryTime(item.candidate.created_at) || '—',
    model: item.candidate.model || '—',
  })
}
async function confirmRemoveKeyframe() {
  const item = keyframeToDelete.value
  if (!item) return
  keyframeDeleting.value = true
  try {
    await taskAPI.del(item.candidate.id)
    await loadShots()
    keyframeToDelete.value = null
    toast.success(t('narration.images.candidateDeleted'))
  } catch (e) {
    toastError(e, { fallback: 'narration.images.deleteFailed' })
  } finally {
    keyframeDeleting.value = false
  }
}

/** 片段提示词：优先模型实际收到的 video_prompt，回退关键帧提示词 */
function clipPromptOf(pair) {
  const shot = pair?.shot
  return String(shot?.video_prompt || shot?.keyframe_prompt || shot?.narration_text || '').trim()
}

// ===== 片段提示词可编辑（与漫剧「视频提示词」一致：失焦或 Ctrl+Enter 提交）=====
const promptDraft = ref('')
const promptSaving = ref(false)
const promptSavedFlash = ref(false)
let promptFlashTimer = null
/** 已落库的提示词（用于判断是否有未保存改动 / 重置） */
const promptSaved = computed(() => clipPromptOf(selectedClipPair.value))
const promptDirty = computed(() => promptDraft.value.trim() !== promptSaved.value.trim())
/**
 * 进入编辑前那一刻的服务端值。
 * 「放弃改动」要真正撤销：点按钮本身会让文本框失焦并触发 blur 提交，
 * 光把草稿改回去是不够的（库里已经被存成改后的值了），得拿这个基线写回去。
 */
const promptBaseline = ref('')

/** 切换片段时把草稿换成该段的已存提示词（未保存的改动由 dirty 态提示，不静默保留到别的段） */
watch(selectedClipPair, (pair) => {
  promptDraft.value = String(pair?.shot?.video_prompt || '')
  promptBaseline.value = promptDraft.value
  promptSavedFlash.value = false
}, { immediate: true })

/** 提交提示词：只写 video_prompt 一个字段（后端为局部更新） */
async function commitPrompt() {
  const pair = selectedClipPair.value
  if (!pair || promptSaving.value) return
  const next = promptDraft.value.trim()
  if (next === promptSaved.value.trim()) return
  promptSaving.value = true
  try {
    await storyboardAPI.update(pair.shot.id, { video_prompt: next })
    // 就地更新本地镜头，避免整表刷新打断正在编辑的状态
    pair.shot.video_prompt = next
    promptSavedFlash.value = true
    if (promptFlashTimer) clearTimeout(promptFlashTimer)
    promptFlashTimer = setTimeout(() => { promptSavedFlash.value = false }, 2000)
  } catch (e) {
    // 保存失败要把草稿回滚成服务端的值，否则界面显示的和库里不一致
    promptDraft.value = String(pair.shot.video_prompt || '')
    toastError(e, { fallback: 'narration.clips.promptSaveFailed' })
  } finally {
    promptSaving.value = false
  }
}

/** 放弃改动：把草稿与**库里的值**都还原到编辑前的基线 */
async function resetPromptDraft() {
  const pair = selectedClipPair.value
  if (!pair) return
  const target = promptBaseline.value
  promptDraft.value = target
  if (String(pair.shot.video_prompt || '') === target) return
  // blur 已经把改动存下去了（点按钮会先触发失焦）：写回基线才算真的放弃
  promptSaving.value = true
  try {
    await storyboardAPI.update(pair.shot.id, { video_prompt: target })
    pair.shot.video_prompt = target
  } catch (e) {
    promptDraft.value = String(pair.shot.video_prompt || '')
    toastError(e, { fallback: 'narration.clips.promptSaveFailed' })
  } finally {
    promptSaving.value = false
  }
}

/** 海报帧：取首帧图，列表里不加载视频也有画面 */
function activeClipPoster(pair) {
  const shot = pair?.shot
  return shot?.keyframe_image ? assetUrl(shot.keyframe_image) : ''
}

/** 选中要展示详情的那条记录（历史点选 > 该段主视频对应的最新记录） */
function detailTask(pair) {
  if (!pair) return null
  const h = activeHistoryRecord(pair)
  if (h) return h
  const list = clipHistoryOf(pair.shot)
  return list.find(x => x.path && x.path === pair.shot.video_url) || list.find(x => !!x.path) || list[0] || null
}
function openClipDetail(pair) {
  const task = detailTask(pair)
  if (!task) return
  clipDetail.value = { ...task, shot_number: pair.shot.shot_number }
}
const clipDetail = ref(null)
/** 详情里的参考帧数（首/尾帧） */
const clipDetailRefCount = computed(() => {
  const shot = shots.value.find(s => s.shot_number === clipDetail.value?.shot_number)
  if (!shot) return 0
  const idx = shots.value.findIndex(s => s.id === shot.id)
  return (shot.keyframe_image ? 1 : 0) + (shots.value[idx + 1]?.keyframe_image ? 1 : 0)
})
const clipDetailSubtitle = computed(() => {
  const d = clipDetail.value
  if (!d) return ''
  return t('narration.clips.detailSubtitle', { n: String(d.shot_number ?? '').padStart(2, '0'), time: formatHistoryTime(d.created_at) })
})

/** 复制文本（提示词等），剪贴板不可用时降级 */
async function copyText(text) {
  const value = String(text || '')
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    toast.success(t('narration.clips.copied'))
  } catch {
    toastError(new Error(t('narration.clips.copyFailed')), { fallback: 'narration.clips.copyFailed' })
  }
}
function copyClipPrompt(pair) { void copyText(clipPromptOf(pair)) }

/** 历史状态 → 文案（详情弹框） */
function historyStatusLabel(status) {
  const s = String(status || '')
  if (s === 'completed') return t('narration.state.done')
  if (s === 'failed') return t('narration.state.failed')
  return t('narration.state.generating')
}

/**
 * 「当前视频模型吃不吃这种素材组合」——生成前提示，并给出一键切换。
 *
 * 依据后端适配器的族定义（aliyun-video.ts）：
 * - happyhorse-1.1-t2v：不接受任何 media
 * - happyhorse-1.1-r2v：只接受 reference_image（不认 first/last frame）
 * - happyhorse-1.1-i2v：**恰好 1 张 first_frame**（不能同时给尾帧）
 * 所以最后一镜（只有首帧）用 i2v 是合法的，而中间片段（首帧+尾帧）不行——不能一刀切地拦。
 */
const MODEL_FRAME_SUPPORT = {
  'happyhorse-1.1-t2v': 'none',
  'happyhorse-1.1-r2v': 'reference',
  'happyhorse-1.1-i2v': 'first',
}
function clipModelIssue(pair) {
  if (!pair) return ''
  const model = String(videoPick.value.model || '')
  if (!model) return ''
  const support = MODEL_FRAME_SUPPORT[model]
  if (!support) return ''
  const needsLast = !!effectiveLastFrame(pair)
  if (!needsLast && support === 'first') return ''      // 单帧 + i2v：合法组合
  if (support === 'none') return t('narration.clips.modelIssueNoMedia', { model })
  if (support === 'reference') return t('narration.clips.modelIssueReference', { model })
  return t('narration.clips.modelIssueFirstOnly', { model })
}
/** 可替代的、支持当前素材组合的模型（优先能同时吃首尾帧的） */
const frameCapableModel = computed(() => {
  const pair = selectedClipPair.value
  const needsLast = !!effectiveLastFrame(pair)
  return videoModelOptions.value.find((o) => {
    const support = MODEL_FRAME_SUPPORT[o.model] || 'first+last'
    return needsLast ? support === 'first+last' : support === 'first' || support === 'first+last'
  }) || null
})
const anyImageGenerating = computed(() => shots.value.some(s => imageState(s) === 'generating'))
const anyClipGenerating = computed(() => shots.value.some(s => clipState(s) === 'generating'))

function goBack() { navigateTo('/') }

// ===== 关键帧放大预览 =====
// 缩略图只有 ~240px 宽，看不清构图、层次与画面文字；放大后还能一键在窗口间前后翻看。
const preview = ref(null)

/** 打开预览：src 缺省用该镜头的关键帧；非关键帧（如片段尾帧）也能单独放大，但不参与翻页 */
function openImagePreview(shot, src = '') {
  const target = src || shot?.keyframe_image
  if (!target) return
  const gallery = shots.value.filter(s => !!s.keyframe_image)
  const idx = src ? -1 : gallery.findIndex(s => s.id === shot.id)
  preview.value = {
    src: assetUrl(target),
    title: sbLabelOf(shot),
    shotNumber: shot?.shot_number ?? 0,
    narration: shot?.narration_text || '',
    prompt: shot?.keyframe_prompt || '',
    zoom: 'fit',
    index: idx < 0 ? 0 : idx,
    total: idx < 0 ? 1 : gallery.length,
  }
}

function closePreview() { preview.value = null }

function togglePreviewZoom() {
  if (!preview.value) return
  preview.value.zoom = preview.value.zoom === 'fit' ? 'actual' : 'fit'
}

/** 前后翻看（仅在关键帧画廊内，且跳过没有图的镜头） */
function stepPreview(delta) {
  if (!preview.value || preview.value.total <= 1) return
  const gallery = shots.value.filter(s => !!s.keyframe_image)
  const next = preview.value.index + delta
  if (next < 0 || next >= gallery.length) return
  const shot = gallery[next]
  preview.value = {
    ...preview.value,
    src: assetUrl(shot.keyframe_image),
    title: sbLabelOf(shot),
    shotNumber: shot.shot_number ?? 0,
    narration: shot.narration_text || '',
    prompt: shot.keyframe_prompt || '',
    index: next,
  }
}

/** 预览标题用与列表一致的分镜标签 */
function sbLabelOf(shot) {
  const name = String(shot?.keyframe_prompt || shot?.narration_text || '').trim()
  return name ? name.slice(0, 40) : `#${shot?.shot_number ?? ''}`
}

/** Esc 关闭、左右方向键翻页 */
function onPreviewKey(e) {
  if (!preview.value) return
  if (e.key === 'Escape') { e.preventDefault(); closePreview(); return }
  if (e.key === 'ArrowLeft') { e.preventDefault(); stepPreview(-1); return }
  if (e.key === 'ArrowRight') { e.preventDefault(); stepPreview(1) }
}

async function loadDrama() {
  const d = await dramaAPI.get(dramaId)
  // 反向守卫：漫剧项目不该进口播工作台（手输 URL / 老链接）
  if (d && d.project_type && d.project_type !== 'narration') {
    await navigateTo(`/drama/${dramaId}`, { replace: true })
    return
  }
  drama.value = d
  // 口播项目是单集形态；若意外存在多集，优先取「真正装了口播镜头」的那一集，
  // 否则会出现「明明有数据却显示空」的假丢失
  const eps = d?.episodes || []
  const listed = await narrationAPI.shots(dramaId).catch(() => null)
  const withShots = listed?.episode_id
  episodeId.value = (withShots && eps.some(e => e.id === withShots) ? withShots : eps[0]?.id) ?? null
}

async function loadBrief() {
  const res = await narrationAPI.brief(dramaId)
  const b = res?.brief || {}
  form.topic = b.topic || ''
  form.target_duration_sec = b.target_duration_sec ?? 60
  form.aspect_ratio = b.aspect_ratio || '16:9'
  form.speech_rate = b.speech_rate ?? 1.1
  form.voice_id = b.voice_id || ''
  form.clip_with_audio = !!b.clip_with_audio
  savedBrief.value = briefSnapshot()
}

async function loadScripts() {
  const res = await narrationAPI.scripts(dramaId)
  scripts.value = res?.scripts || []
}

async function loadPlan() {
  if (!selectedScript.value) { plan.value = null; return }
  const res = await narrationAPI.plan(dramaId)
  plan.value = res?.plan || null
}

async function loadShots() {
  const res = await narrationAPI.shots(dramaId)
  shots.value = res?.shots || []
  generatingCounts.value = res?.counts || null
  // 默认全选参与导出
  if (!exportSelectedIds.value.length) exportSelectedIds.value = shots.value.map(s => s.id)
  else exportSelectedIds.value = exportSelectedIds.value.filter(id => shots.value.some(s => s.id === id))
  // 刷新页面后若仍有任务在跑，自动接上进度显示
  if (anyImageGenerating.value || anyClipGenerating.value) void watchUntilIdle()
  // 默认选中第一段：否则左列没有任何高亮，右侧却已有内容，看起来像「没选中」
  if (!clipPairs.value.some(p => p.shot.id === selectedClipShotId.value)) {
    selectedClipShotId.value = clipPairs.value[0]?.shot.id || 0
  }
  // 选中段被换掉（重新扩写镜头）时，历史里正在查看的那条也要复位
  if (!clipPairs.value.some(p => p.shot.id === selectedClipShotId.value)) previewClipTaskId.value = 0
}

async function loadMerges() {
  if (!episodeId.value) return
  try { merges.value = (await mergeAPI.list(episodeId.value)) || [] } catch { merges.value = [] }
}

// ===== ⑧ 字幕：成片后的独立阶段 =====
// 字幕行由成片时间轴生成（后端复用 video_merges.timeline），生成后可自由编辑：
// 改字幕不会影响配音与画面，两条产物（硬烧 / 软字幕）可并存对比。
const subtitleMergeId = ref(0)
const subLines = ref([])
const subStyle = reactive({ maxChars: 20, offsetSec: 0, fontSize: 20, outline: 2, marginV: 24, primaryColour: '&H00FFFFFF' })
const subMeta = ref(null)
const subStatus = ref('draft')
const subError = ref('')
const subLoading = ref(false)
const subSaving = ref(false)
const subRendering = ref(false)
const subDirty = ref(false)
let subPollTimer = null

const completedMerges = computed(() => (merges.value || []).filter(m => m.status === 'completed' && (m.merged_url || m.mergedUrl)))
const mergeOptions = computed(() => completedMerges.value.map(m => ({
  value: m.id,
  label: `${m.title || '成片'} · ${m.duration || 0}s · ${formatHistoryTime(m.completed_at || m.completedAt)}`,
})))

/** ASS 颜色（&HAABBGGRR）↔ 十六进制（#RRGGBB）：界面上给颜色选择器用 */
const subColorHex = computed({
  get: () => {
    const m = /^&H([0-9A-Fa-f]{2})?([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(String(subStyle.primaryColour || ''))
    return m ? `#${m[4]}${m[3]}${m[2]}`.toLowerCase() : '#ffffff'
  },
  set: (hex) => {
    const h = String(hex || '#ffffff').replace('#', '')
    if (h.length === 6) subStyle.primaryColour = `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase()
  },
})
function onSubColorInput() { subDirty.value = true }
function formatSubTime(sec) {
  const total = Math.max(0, Number(sec) || 0)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}

const subOutputs = computed(() => {
  const list = []
  if (subMeta.value?.srt_url) list.push({ url: `/${subMeta.value.srt_url}`, tag: 'SRT', tagClass: '' })
  if (subMeta.value?.burned_url) list.push({ url: `/${subMeta.value.burned_url}`, tag: t('narration.subs.tagBurn'), tagClass: 'tag-accent' })
  if (subMeta.value?.soft_url) list.push({ url: `/${subMeta.value.soft_url}`, tag: t('narration.subs.tagSoft'), tagClass: 'tag-success' })
  return list
})

function applySubtitle(data) {
  subMeta.value = { srt_url: data.srt_url, burned_url: data.burned_url, soft_url: data.soft_url }
  subLines.value = (data.lines || []).map(l => ({ ...l }))
  Object.assign(subStyle, data.style || {})
  subStatus.value = data.status || 'draft'
  subError.value = data.error_msg || ''
  subDirty.value = false
}

async function loadSubtitle(mergeId = subtitleMergeId.value) {
  if (!mergeId) return
  subLoading.value = true
  try {
    const data = await narrationAPI.subtitle(dramaId, mergeId)
    subtitleMergeId.value = mergeId
    applySubtitle(data)
    if (data.status === 'rendering') scheduleSubPoll()
  } catch (e) {
    toastError(e, { fallback: 'narration.subs.loadFailed' })
  } finally {
    subLoading.value = false
  }
}

/** 渲染是异步的（硬烧要重编码整片）：轮询到 ready/failed */
function scheduleSubPoll() {
  if (subPollTimer) return
  subPollTimer = setInterval(async () => {
    try {
      const data = await narrationAPI.subtitle(dramaId, subtitleMergeId.value)
      subMeta.value = { srt_url: data.srt_url, burned_url: data.burned_url, soft_url: data.soft_url }
      subStatus.value = data.status
      subError.value = data.error_msg || ''
      if (data.status !== 'rendering') {
        clearInterval(subPollTimer); subPollTimer = null
        if (data.status === 'ready') toast.success(t('narration.subs.renderDone'))
        subDirty.value = false
        // 刷新产物列表但保留正在编辑的文本
        subMeta.value = { srt_url: data.srt_url, burned_url: data.burned_url, soft_url: data.soft_url }
      }
    } catch { clearInterval(subPollTimer); subPollTimer = null }
  }, 2000)
}

async function saveSubtitle() {
  if (!subtitleMergeId.value) return false
  subSaving.value = true
  try {
    const data = await narrationAPI.saveSubtitle(dramaId, {
      merge_id: subtitleMergeId.value,
      lines: subLines.value,
      style: { ...subStyle },
    })
    applySubtitle(data)
    toast.success(t('narration.subs.saved'))
    return true
  } catch (e) {
    toastError(e, { fallback: 'narration.subs.saveFailed' })
    return false
  } finally {
    subSaving.value = false
  }
}

async function renderSubtitle(burn, soft) {
  if (!subtitleMergeId.value || subRendering.value) return
  // 渲染前先保存：否则烧的是上一次的文本
  if (subDirty.value) { if (!await saveSubtitle()) return }
  subRendering.value = true
  try {
    await narrationAPI.renderSubtitle(dramaId, { merge_id: subtitleMergeId.value, burn, soft })
    subStatus.value = 'rendering'
    scheduleSubPoll()
    toast.success(t('narration.subs.renderStarted'))
  } catch (e) {
    toastError(e, { fallback: 'narration.subs.renderFailed' })
  } finally {
    subRendering.value = false
  }
}

/** 选中成片后自动加载它的字幕（没有就用时间轴初始化一份） */
watch(subtitleMergeId, (id, old) => { if (id && id !== old) void loadSubtitle(id) })

async function loadConfigs() {
  try {
    const [txt, img, vid, aud] = await Promise.all([
      aiConfigAPI.list('text'), aiConfigAPI.list('image'), aiConfigAPI.list('video'), aiConfigAPI.list('audio'),
    ])
    textConfigs.value = txt || []
    imageConfigs.value = img || []
    videoConfigs.value = vid || []
    audioConfigs.value = aud || []
  } catch (e) {
    toastError(e, { fallback: 'narration.loadFailed' })
  }
}

async function reloadAll() {
  loading.value = true
  try {
    await Promise.all([loadConfigs(), loadDrama()])
    await loadBrief()
    await loadScripts()
    await loadPlan()
    await loadShots()
    await loadMerges()
    // 字幕阶段默认挂到最近的成片上（没有成片则保持空，面板会提示先生成成片）
    if (!subtitleMergeId.value && completedMerges.value.length) {
      await loadSubtitle(completedMerges.value[0].id)
    }
  } catch (e) {
    toastError(e, { fallback: 'narration.loadFailed' })
  } finally {
    loading.value = false
  }
}

function briefPayload() {
  return {
    topic: form.topic,
    target_duration_sec: Number(form.target_duration_sec),
    aspect_ratio: form.aspect_ratio,
    speech_rate: Number(form.speech_rate),
    voice_id: form.voice_id,
    clip_with_audio: form.clip_with_audio,
  }
}

/** 简报的「已落库」快照：用来判断表单里有没有未保存改动 */
const savedBrief = ref(null)
function briefSnapshot() { return { ...briefPayload() } }
const briefDirty = computed(() => {
  if (!savedBrief.value) return false
  const cur = briefSnapshot()
  return Object.keys(cur).some(k => String(cur[k] ?? '') !== String(savedBrief.value[k] ?? ''))
})

/**
 * 保存简报：写入 `dramas.metadata.narration`（主题另同步到项目描述，便于列表辨认）。
 * 它是**全链路唯一的参数来源**：字数预算、逐镜时长、TTS 倍速都取自它；
 * 服务端算分镜计划（扩写镜头）时读的也是这份已落库的值，所以扩写前必须先保存，
 * 否则会出现「界面显示 1.5 倍、实际按旧的 1.1 倍切镜头」的静默错位。
 */
async function saveBrief({ silent = false } = {}) {
  if (briefSaving.value) return false
  briefSaving.value = true
  try {
    await narrationAPI.saveBrief(dramaId, briefPayload())
    savedBrief.value = briefSnapshot()
    if (!silent) {
      toast.success(t('narration.brief.saved', { rate: Number(form.speech_rate).toFixed(2), budget: derivedCharBudget.value }))
    }
    try { await dramaAPI.update(dramaId, { description: form.topic }) } catch { /* 忽略 */ }
    return true
  } catch (e) {
    toastError(e, { fallback: 'narration.brief.saveFailed' })
    return false
  } finally {
    briefSaving.value = false
  }
}

/** 依赖简报的服务端操作前先落库（有改动才写，静默不打扰） */
async function ensureBriefSaved() {
  if (!briefDirty.value) return true
  return await saveBrief({ silent: true })
}

async function generateScripts() {
  if (writing.value || !canWrite.value) return
  writing.value = true
  try {
    await ensureBriefSaved()
    const res = await narrationAPI.writeScripts(dramaId, episodeId.value,
      t('narration.brief.writePrompt', { topic: form.topic, sec: form.target_duration_sec, budget: derivedCharBudget.value }),
      { model: textPick.value.model, configId: textPick.value.configId })
    await loadScripts()
    if (scripts.value.length) { toast.success(t('narration.brief.writeDone', { n: scripts.value.length })); activeNode.value = 'scripts' }
    else toast.error(t('narration.brief.writeEmpty', { text: String(res?.text || '').slice(0, 120) }))
  } catch (e) {
    toastError(e, { fallback: 'narration.brief.writeFailed' })
  } finally {
    writing.value = false
  }
}

async function selectScript(s) {
  selecting.value = s.id
  try {
    await narrationAPI.selectScript(dramaId, s.id)
    await loadScripts()
    await loadPlan()
    toast.success(t('narration.scripts.selectedToast', { angle: s.angle || s.title }))
    activeNode.value = 'plan'
  } catch (e) {
    toastError(e, { fallback: 'narration.scripts.selectFailed' })
  } finally {
    selecting.value = null
  }
}

async function runShotPlanner() {
  if (planning.value || !selectedScript.value) return
  planning.value = true
  try {
    // 服务端的逐镜计划按**已落库**的倍速计算，先保存避免用到旧倍速
    await ensureBriefSaved()
    await narrationAPI.planShots(dramaId, episodeId.value, t('narration.plan.expandPrompt', {
      rate: Number(form.speech_rate).toFixed(2),
      shots: plan.value?.shots?.length || 0,
    }), { model: textPick.value.model, configId: textPick.value.configId })
    await loadShots()
    await loadPlan()
    if (shots.value.length) { toast.success(t('narration.plan.expandDone', { n: shots.value.length })); activeNode.value = 'images' }
    else toast.error(t('narration.plan.expandEmpty'))
  } catch (e) {
    toastError(e, { fallback: 'narration.plan.expandFailed' })
  } finally {
    planning.value = false
  }
}

/** 生成关键帧图片（写 storyboards.first_frame_image，后续用作首尾帧） */
async function generateImages(targets) {
  const list = (targets || []).filter(s => imageState(s) !== 'generating')
  if (busy.images || !list.length) return
  busy.images = true
  try {
    let queued = 0
    for (const s of list) {
      try {
        const res = await taskAPI.generate({
          type: 'image',
          storyboard_id: s.id,
          drama_id: dramaId,
          prompt: s.keyframe_prompt,
          frame_type: 'first_frame',
          // 顶栏所选图片模型（不带配置 id 时后端回退到集锁定的配置）
          model: imagePick.value.model || undefined,
          config_id: imagePick.value.configId,
        })
        if (res?.id) queued++
      } catch (e) {
        // 单张提交失败不影响其它镜头，并把原因记到该卡片上
        s.image_task = { id: null, status: 'failed', error_msg: String(e?.message || e), created_at: new Date().toISOString(), elapsed_sec: null }
      }
    }
    if (queued) toast.success(t('narration.images.started', { n: queued }))
    // 状态以服务端任务为准：立刻刷新一次让卡片进入「生成中」
    await loadShots()
    void watchUntilIdle()
  } catch (e) {
    toastError(e, { fallback: 'narration.images.failed' })
  } finally {
    busy.images = false
  }
}

// ===== 关键帧提示词可编辑（每个镜头一份草稿；改完直接用它重新生成）=====
// 与片段提示词同一套手感：失焦 / Ctrl+Enter 提交，脏态可见，可放弃改动。
// 生成图片时下发的就是 keyframe_prompt（写回 image_prompt），所以编辑后点「重新生成」即按新提示词出图。
// 注意：本文件是 JS 的 <script setup>，不要写 TS 泛型（写过 reactive<Record<...>> 直接让 Vite 编译失败）
const imgPromptDrafts = reactive({})
const imgPromptBaselines = reactive({})
const imgPromptSavingId = ref(0)
const imgPromptSavedId = ref(0)
let imgPromptFlashTimer = null

/** 草稿（首次访问时用服务端值初始化，并记下基线供「放弃改动」使用） */
function imgPromptDraft(shot) {
  if (imgPromptDrafts[shot.id] === undefined) {
    imgPromptDrafts[shot.id] = String(shot.keyframe_prompt || '')
    imgPromptBaselines[shot.id] = imgPromptDrafts[shot.id]
  }
  return imgPromptDrafts[shot.id]
}
function setImgPromptDraft(shot, value) { imgPromptDrafts[shot.id] = String(value ?? '') }
function imgPromptDirty(shot) {
  return String(imgPromptDraft(shot)).trim() !== String(shot.keyframe_prompt || '').trim()
}

/** 提交关键帧提示词：只写 image_prompt 一个字段 */
async function commitImgPrompt(shot) {
  if (!shot || imgPromptSavingId.value) return
  const draft = String(imgPromptDraft(shot)).trim()
  if (draft === String(shot.keyframe_prompt || '').trim()) return
  imgPromptSavingId.value = shot.id
  try {
    await storyboardAPI.update(shot.id, { image_prompt: draft })
    shot.keyframe_prompt = draft
    imgPromptSavedId.value = shot.id
    if (imgPromptFlashTimer) clearTimeout(imgPromptFlashTimer)
    imgPromptFlashTimer = setTimeout(() => { if (imgPromptSavedId.value === shot.id) imgPromptSavedId.value = 0 }, 2000)
  } catch (e) {
    // 保存失败回滚成服务端的值，避免界面与库里不一致
    imgPromptDrafts[shot.id] = String(shot.keyframe_prompt || '')
    toastError(e, { fallback: 'narration.images.promptSaveFailed' })
  } finally {
    imgPromptSavingId.value = 0
  }
}

/** 放弃改动：还原到编辑前基线；若 blur 已经存过一次，则把基线写回去做真撤销 */
async function resetImgPrompt(shot) {
  const target = imgPromptBaselines[shot.id] ?? String(shot.keyframe_prompt || '')
  imgPromptDrafts[shot.id] = target
  if (String(shot.keyframe_prompt || '') === target) return
  imgPromptSavingId.value = shot.id
  try {
    await storyboardAPI.update(shot.id, { image_prompt: target })
    shot.keyframe_prompt = target
  } catch (e) {
    imgPromptDrafts[shot.id] = String(shot.keyframe_prompt || '')
    toastError(e, { fallback: 'narration.images.promptSaveFailed' })
  } finally {
    imgPromptSavingId.value = 0
  }
}

/** 生成首尾帧片段（镜头 i 的关键帧 → 镜头 i+1 的关键帧） */async function generateClips(pairs) {
  // 只要求"有首帧"：最后一镜没有下一帧也能生成（按首帧 + 提示词驱动的单图生视频）
  const list = (pairs || []).filter(p => clipState(p.shot) !== 'generating' && effectiveFirstFrame(p))
  if (busy.clips || !list.length) return
  busy.clips = true
  try {
    let queued = 0
    for (const p of list) {
      try {
        const res = await taskAPI.generate({
          type: 'video',
          storyboard_id: p.shot.id,
          drama_id: dramaId,
          prompt: p.shot.video_prompt || p.shot.keyframe_prompt || p.shot.narration_text,
          // 首尾帧用「生效值」：用户选过候选就用选的，没选才回落到当前关键帧。
          // 尾帧可能没有（最后一镜）：此时只发首帧，由提示词驱动画面运动（单图生视频）。
          first_frame_url: effectiveFirstFrame(p),
          last_frame_url: effectiveLastFrame(p) || undefined,
          generate_audio: form.clip_with_audio,
          // 片段长度贴近该句时长；各家视频模型区间不同（MiniMax/Wan 常见 4~15s），取交集最稳
          duration: Math.max(4, Math.min(15, Math.round(p.targetDuration))),
          resolution: exportResolution.value,
          // 顶栏所选视频模型（首尾帧由镜头 i 与 i+1 的关键帧决定）
          model: videoPick.value.model || undefined,
          config_id: videoPick.value.configId,
        })
        if (res?.id) queued++
      } catch (e) {
        p.shot.clip_task = { id: null, status: 'failed', error_msg: String(e?.message || e), created_at: new Date().toISOString(), elapsed_sec: null }
      }
    }
    if (queued) toast.success(t('narration.clips.started', { n: queued }))
    await loadShots()
    void watchUntilIdle()
  } catch (e) {
    toastError(e, { fallback: 'narration.clips.failed' })
  } finally {
    busy.clips = false
  }
}

/**
 * 有任务在跑时轮询镜头列表，直到没有「生成中」为止（或超时）。
 * 状态来自服务端任务表，因此刷新页面后仍能恢复进度显示。
 */
async function watchUntilIdle({ intervalMs = 2500, maxTries = 120 } = {}) {
  for (let i = 0; i < maxTries; i++) {
    if (!anyImageGenerating.value && !anyClipGenerating.value) return
    await new Promise(r => setTimeout(r, intervalMs))
    await loadShots()
  }
  if (anyImageGenerating.value || anyClipGenerating.value) toast.warning(t('narration.poll.timeout', { n: 1 }))
}

/** 逐句配音：倍速由项目简报统一控制（画面对齐的依据） */
async function synthesizeShots(targets) {
  if (busy.audio || !targets.length) return
  busy.audio = true
  try {
    const res = await narrationAPI.synthesize(dramaId, {
      shot_ids: targets.map(s => s.id),
      speed: Number(form.speech_rate),
      voice_id: form.voice_id || undefined,
      // 顶栏选的音频模型（含所属配置）：不传则后端用启用配置的首个模型
      config_id: audioPick.value.configId,
      model: audioPick.value.model || undefined,
    })
    await loadShots()
    const n = res?.synthesized ?? 0
    toast.success(t('narration.audio.done', { n, sec: res?.total_with_pauses_sec ?? 0 }))
    if (res?.errors?.length) toast.warning(String(res.errors[0]).slice(0, 160))
  } catch (e) {
    toastError(e, { fallback: 'narration.audio.failed' })
  } finally {
    busy.audio = false
  }
}

function toggleExport(id) {
  exportSelectedIds.value = exportSelectedIds.value.includes(id)
    ? exportSelectedIds.value.filter(x => x !== id)
    : [...exportSelectedIds.value, id]
}
function toggleAllExport() {
  exportSelectedIds.value = allSelected.value ? [] : shots.value.map(s => s.id)
}

async function startMerge() {
  if (merging.value || !exportSelectedIds.value.length) return
  merging.value = true
  mergeStatusText.value = t('narration.export.merging')
  try {
    const res = await narrationAPI.merge(dramaId, {
      shot_ids: exportSelectedIds.value,
      include_audio: exportIncludeAudio.value,
      resolution: exportResolution.value,
    })
    const mergeId = res?.merge_id
    toast.success(t('narration.export.started', { n: res?.segments ?? 0, sec: res?.planned_total_sec ?? 0 }))
    // 轮询合并状态（与漫剧拼接同一张表）
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 3000))
      const latest = await mergeAPI.status(episodeId.value).catch(() => null)
      if (latest && (latest.status === 'completed' || latest.status === 'failed')) {
        if (latest.status === 'completed') {
          toast.success(t('narration.export.done', { sec: latest.duration ?? 0 }))
          mergeStatusText.value = ''
          await loadMerges()
          activeNode.value = 'merges'
        } else {
          toastError(latest.error_msg, { fallback: 'narration.export.failed' })
          mergeStatusText.value = String(latest.error_msg || '')
        }
        break
      }
    }
  } catch (e) {
    toastError(e, { fallback: 'narration.export.failed' })
    mergeStatusText.value = ''
  } finally {
    merging.value = false
  }
}

async function removeMerge(m) {
  try {
    await mergeAPI.remove(m.id)
    toast.success(t('narration.merges.deleted'))
    await loadMerges()
  } catch (e) {
    toastError(e, { fallback: 'narration.merges.deleteFailed' })
  }
}

onMounted(async () => {
  tickTimer = setInterval(() => { now.value = Date.now() }, 1000)
  window.addEventListener('keydown', onPreviewKey)
  await reloadAll()
})
onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
  if (promptFlashTimer) clearTimeout(promptFlashTimer)
  if (imgPromptFlashTimer) clearTimeout(imgPromptFlashTimer)
  if (subPollTimer) clearInterval(subPollTimer)
  window.removeEventListener('keydown', onPreviewKey)
})
</script>

<style scoped>
.narration-studio { height: 100vh; display: flex; flex-direction: column; background: var(--bg-base); }
.ns-topbar { display: flex; align-items: center; gap: 14px; padding: 10px 18px; border-bottom: 1px solid var(--border); background: var(--bg-elevated); }
.ns-title-wrap { display: flex; align-items: center; gap: 8px; }
.ns-type-tag { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; background: var(--accent-bg); color: var(--accent-text); border: 1px solid var(--accent-glow); }
.ns-title { font-size: 14px; font-weight: 600; color: var(--text-1); }
.ns-topbar-meta { display: flex; gap: 8px; margin-left: 10px; }
.ns-meta-chip { padding: 3px 9px; border-radius: 999px; font-size: 11px; font-family: var(--font-mono); background: var(--bg-hover); color: var(--text-2); border: 1px solid var(--border); }
/* 模型选择器：与漫剧工作台同样的紧凑排布，放不下时水平滚动而不换行挤压 */
.ns-model-picks { display: flex; align-items: center; gap: 8px; margin-left: 12px; min-width: 0; overflow-x: auto; }
.ns-model-picks::-webkit-scrollbar { height: 0; }
.ns-topbar-right { margin-left: auto; }

.ns-body { flex: 1; display: flex; min-height: 0; }

/* ===== 树形菜单（对齐漫剧工作台的左栏语义：分区 + 子项）===== */
.ns-sidebar { width: 226px; flex-shrink: 0; border-right: 1px solid var(--border); overflow-y: auto; padding: 12px 10px 24px; }
.pipeline { display: flex; flex-direction: column; gap: 14px; }
.pipe-section { display: flex; flex-direction: column; gap: 4px; }
.pipe-section-label { font-size: 11px; font-weight: 700; letter-spacing: .04em; color: var(--text-3); padding: 0 8px 4px; text-transform: none; }
.pipe-section.is-active .pipe-section-label { color: var(--accent-text); }
.pipe-item {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; cursor: pointer;
  padding: 7px 9px; border-radius: var(--radius); border: 1px solid transparent;
  background: transparent; color: var(--text-2); font-size: 12.5px;
}
.pipe-item:hover { background: var(--bg-hover); color: var(--text-1); }
.pipe-item.active { background: var(--accent-bg); border-color: var(--accent-glow); color: var(--accent-text); font-weight: 600; }
.pipe-item-dot { width: 6px; height: 6px; flex-shrink: 0; border-radius: 50%; background: var(--border); }
.pipe-item.done .pipe-item-dot { background: var(--success); }
.pipe-item.active .pipe-item-dot { background: var(--accent); }
.pipe-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pipe-badge { font-size: 10.5px; font-family: var(--font-mono); color: var(--text-3); background: var(--bg-hover); border-radius: 999px; padding: 1px 6px; }
.pipe-item.active .pipe-badge { color: var(--accent-text); background: var(--bg-elevated); }

/* ===== 右侧单面板 ===== */
.ns-main { flex: 1; overflow-y: auto; padding: 16px 20px 40px; display: flex; flex-direction: column; }
/* 需要"按父容器高度排布"的面板（如首尾帧片段）：整卡撑满，内部各列自己滚动 */
.ns-card-fill { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.ns-card-fill > .ns-clip-layout { flex: 1; min-height: 320px; align-items: stretch; overflow: hidden; }
.ns-card-fill .ns-clip-list-col { height: 100%; min-height: 0; max-height: none; overscroll-behavior: contain; }
.ns-card-fill .ns-clip-detail { min-height: 0; max-height: 100%; overflow-y: auto; overscroll-behavior: contain; }
/*
 * 关键：右侧详情是 flex 列，默认 flex-shrink:1 会把「视频舞台」压成 0 高
 * （实测 stage 高度为 0、检查器溢出到容器之外，看起来就是"内容显示不全"）。
 * 这里禁止子项收缩，让它们保持自然高度，由容器滚动来呈现 —— 与左列互不影响。
 */
.ns-card-fill .ns-clip-detail > * { flex: 0 0 auto; }
.ns-vid-inspector > * { flex: 0 0 auto; }
.ns-card { padding: 16px 18px; }
.ns-card-head { margin-bottom: 12px; }
.ns-card-title { font-size: 14px; font-weight: 650; color: var(--text-1); margin: 0 0 4px; }
.ns-card-desc { font-size: 11.5px; color: var(--text-3); margin: 0; line-height: 1.6; }

.ns-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; }
.ns-span2 { grid-column: span 2; }
.ns-topic { resize: vertical; line-height: 1.6; font-family: inherit; }
.ns-check-field { display: flex; flex-direction: row; align-items: center; gap: 8px; flex-wrap: wrap; }
.ns-inline-check { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-2); cursor: pointer; }

.ns-rate-field { display: flex; flex-direction: column; gap: 6px; }
.ns-rate-row { display: flex; align-items: center; gap: 10px; }
.ns-range { flex: 1; min-width: 120px; accent-color: var(--accent); }
.ns-rate-input { width: 84px; }
.ns-rate-unit { font-size: 12px; color: var(--text-2); }
.ns-rate-presets { display: flex; gap: 6px; }
.ns-chip { padding: 3px 9px; border-radius: 999px; font-size: 11px; font-family: var(--font-mono); border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text-2); cursor: pointer; }
.ns-chip.on { border-color: var(--accent); color: var(--accent-text); background: var(--accent-bg); }

.ns-derived { margin-top: 14px; padding: 10px 12px; border-radius: var(--radius); background: var(--accent-bg); border: 1px solid var(--accent-glow); display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.ns-derived-item { display: flex; flex-direction: column; gap: 2px; }
.ns-derived-label { font-size: 10.5px; color: var(--text-3); }
.ns-derived-value { font-size: 13px; font-weight: 700; color: var(--accent-text); }
.ns-derived-value.warn { color: var(--error); }
.ns-derived-hint { font-size: 11px; color: var(--text-3); margin-left: auto; }

.ns-actions { display: flex; align-items: center; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.ns-actions-top { margin-top: 0; margin-bottom: 12px; }
.ns-empty { font-size: 12px; color: var(--text-3); }
.ns-ok-hint { font-size: 11.5px; color: var(--success); margin-top: 8px; }
.ns-warn { font-size: 11.5px; color: var(--warn-text); margin: 4px 0; line-height: 1.6; }

/* 口播稿 */
.ns-scripts { display: flex; flex-direction: column; gap: 12px; }
.ns-script { border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; background: var(--bg-elevated); }
.ns-script.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent-glow) inset; }
.ns-script-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.ns-script-title { font-size: 12.5px; font-weight: 600; color: var(--text-1); }
.ns-script-meta { font-size: 11px; color: var(--text-3); }
.ns-script-body { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 12.5px; line-height: 1.8; color: var(--text-2); max-height: 260px; overflow-y: auto; }

/* 计划表 */
.ns-plan-summary { display: flex; gap: 18px; flex-wrap: wrap; margin-bottom: 10px; }
.ns-table { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; margin-top: 10px; }
.ns-tr { display: grid; grid-template-columns: 48px 1fr 72px 88px; gap: 8px; padding: 7px 10px; font-size: 12px; border-top: 1px solid var(--border); }
.ns-tr:first-child { border-top: none; }
.ns-th { background: var(--bg-hover); color: var(--text-3); font-size: 11px; }
.ns-td-text { color: var(--text-1); line-height: 1.55; }

/* 镜头卡片（关键帧） */
.ns-shot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.ns-shot-card { border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; background: var(--bg-elevated); display: flex; flex-direction: column; gap: 8px; }
.ns-shot-head { display: flex; align-items: center; gap: 8px; }
.ns-shot-no { font-size: 11.5px; font-weight: 700; color: var(--text-2); }
.ns-shot-badge { font-size: 10.5px; padding: 2px 7px; border-radius: 999px; border: 1px solid var(--border); color: var(--text-3); display: inline-flex; align-items: center; gap: 4px; }
.ns-shot-badge.done { color: var(--success); border-color: var(--success); }
.ns-shot-badge.failed { color: var(--error); border-color: var(--error); }
.ns-shot-badge.generating { color: var(--accent-text); border-color: var(--accent); background: var(--accent-bg); }
.ns-shot-card.is-busy { border-color: var(--accent-glow); }
.ns-thumb { position: relative; aspect-ratio: 16/9; border-radius: calc(var(--radius) - 2px); overflow: hidden; background: var(--bg-hover); display: grid; place-items: center; }
.ns-thumb img { width: 100%; height: 100%; object-fit: cover; }
/* 可放大：给出手型与放大角标，避免用户不知道能点 */
.is-zoomable { cursor: zoom-in; }
.is-zoomable:hover img { transform: scale(1.02); transition: transform .18s ease; }
.ns-thumb-zoom {
  position: absolute; right: 5px; bottom: 5px; display: grid; place-items: center;
  width: 20px; height: 20px; border-radius: 5px;
  background: rgba(0, 0, 0, .5); color: #fff; opacity: 0; transition: opacity .15s ease; pointer-events: none;
}
.is-zoomable:hover .ns-thumb-zoom { opacity: 1; }
.ns-thumb-sm { width: 84px; flex-shrink: 0; aspect-ratio: 16/9; }
.ns-thumb-empty { font-size: 11px; color: var(--text-3); }
/* 生成中：覆盖层 + 走时进度 */
.ns-thumb-progress { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--accent-text); font-size: 11.5px; font-family: var(--font-mono); }
.ns-thumb-hint { font-size: 10.5px; color: var(--text-3); font-family: inherit; }
/* 失败：占位图位置直接给出原因 */
.ns-thumb-error { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; text-align: left; max-height: 100%; overflow: auto; }
.ns-thumb-error-title { font-size: 11px; font-weight: 700; color: var(--error); }
.ns-thumb-error-msg { font-size: 10.5px; line-height: 1.45; color: var(--text-2); word-break: break-word; }
.ns-warn-tight { display: flex; align-items: center; gap: 8px; margin: 0; }
/* 未保存提示：让「保存简报」的用途一眼可见 */
.ns-dirty-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 999px; font-size: 11px;
  background: var(--warning-bg); color: var(--warn-text); border: 1px solid var(--warn-border);
}
.ns-prompt { font-size: 11.5px; line-height: 1.6; color: var(--text-2); margin: 0; }
/* 可编辑的关键帧提示词：紧凑但够写两三行，状态提示放在下方一行 */
.ns-img-prompt { display: flex; flex-direction: column; gap: 5px; }
.ns-prompt-input { font-size: 11.5px; line-height: 1.6; resize: vertical; min-height: 66px; }
.ns-prompt-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ns-prompt-tight { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ns-narration { font-size: 11.5px; line-height: 1.6; color: var(--text-1); margin: 0; border-left: 2px solid var(--accent-glow); padding-left: 8px; }

/* 片段：左列列表 + 右侧详情（参照漫剧视频页：列表选段、详情看主视频与历史版本） */
.ns-frame-mini { position: relative; width: 132px; flex-shrink: 0; aspect-ratio: 16/9; border-radius: 6px; overflow: hidden; background: var(--bg-hover); display: grid; place-items: center; }
.ns-frame-mini img { width: 100%; height: 100%; object-fit: cover; }
.ns-frame-tag { position: absolute; left: 4px; bottom: 4px; font-size: 9.5px; padding: 1px 5px; border-radius: 4px; background: rgba(0, 0, 0, .55); color: #fff; }
.ns-arrow { color: var(--text-3); }
.ns-clip-dur { font-size: 11px; color: var(--text-3); }
.ns-clip-layout { display: grid; grid-template-columns: minmax(240px, 300px) 1fr; gap: 14px; align-items: start; }
.ns-clip-list-col { display: flex; flex-direction: column; gap: 6px; max-height: 620px; overflow-y: auto; padding-right: 4px; flex: 1 1 auto; }
.ns-clip-item {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; cursor: pointer;
  padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-elevated); color: var(--text-2);
}
.ns-clip-item:hover { border-color: var(--border-strong); }
.ns-clip-item.active { border-color: var(--accent); background: var(--accent-bg); }
.ns-clip-item.done .ns-shot-no { color: var(--success); }
.ns-clip-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ns-clip-item-title {
  font-size: 12px; color: var(--text-1); line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.ns-clip-item-meta { font-size: 10.5px; color: var(--text-3); }
.ns-clip-list-hint { margin: 4px 2px 0; }

.ns-clip-detail { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.ns-clip-frames { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ns-clip-frames .ns-frame-mini { width: 168px; }
.ns-clip-frames-meta { display: flex; flex-direction: column; gap: 3px; }
.ns-clip-prompt {
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.ns-clip-player {
  width: 100%; max-width: 560px; aspect-ratio: 16/9; border-radius: var(--radius);
  background: #0b0d11; display: grid; place-items: center; overflow: hidden;
}
.ns-clip-player video { width: 100%; height: 100%; object-fit: contain; background: #000; }
.ns-clip-player-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--text-3); font-size: 11.5px; padding: 12px; text-align: center; }
.ns-clip-player-empty.is-error { color: var(--error); }
.ns-clip-detail-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.ns-clip-history { border-top: 1px solid var(--border); padding-top: 10px; }
.ns-clip-history-head { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--text-3); margin-bottom: 8px; }
.ns-clip-history-count { padding: 1px 7px; border-radius: 999px; background: var(--bg-hover); font-family: var(--font-mono); }
.ns-clip-history-list { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.ns-clip-history-item {
  position: relative; flex: 0 0 auto; width: 132px; aspect-ratio: 16/9; border-radius: 6px; overflow: hidden;
  border: 1px solid var(--border); background: var(--bg-hover); cursor: pointer;
}
.ns-clip-history-item video { width: 100%; height: 100%; object-fit: cover; }
.ns-clip-history-item.current { border-color: var(--success); }
.ns-clip-history-item.viewing { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent-glow) inset; }
.ns-clip-history-item.failed { border-color: var(--error); }
.ns-clip-history-loading,
.ns-clip-history-failed { width: 100%; height: 100%; display: grid; place-items: center; color: var(--text-3); font-weight: 700; }
.ns-clip-history-failed { color: var(--error); font-size: 16px; }
.ns-clip-history-time {
  position: absolute; left: 4px; bottom: 4px; font-size: 9.5px;
  padding: 1px 5px; border-radius: 4px; background: rgba(0, 0, 0, .55); color: #fff;
}
.ns-clip-history-badge {
  position: absolute; right: 4px; bottom: 4px; font-size: 9.5px;
  padding: 1px 5px; border-radius: 4px; background: var(--success-bg); color: var(--tag-success-text);
}
.ns-clip-history-badge.is-pending { background: var(--accent-bg); color: var(--accent-text); }
.ns-clip-history-badge.is-failed { background: var(--error-bg); color: var(--error); }
.ns-clip-history-del {
  position: absolute; right: 4px; top: 4px; display: none; place-items: center;
  width: 18px; height: 18px; border-radius: 5px; border: none; cursor: pointer;
  background: rgba(0, 0, 0, .55); color: #fff; font-size: 12px; line-height: 1;
}
.ns-clip-history-item:hover .ns-clip-history-del { display: grid; }

/* ===== 片段检查器：结构对齐漫剧「分镜视频」（播放器头部/舞台 → 历史 → 检查器） ===== */
.ns-vid-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ns-vid-head-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ns-vid-title { font-size: 13px; font-weight: 600; color: var(--text-0); }
.ns-vid-status {
  display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px; border-radius: 999px;
  font-size: 11px; background: var(--bg-hover); color: var(--text-2);
}
.ns-vid-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-3); }
.ns-vid-status.is-done { background: var(--success-bg); color: var(--tag-success-text); }
.ns-vid-status.is-done .ns-vid-dot { background: var(--success); }
.ns-vid-status.is-video { background: var(--accent-bg); color: var(--accent-text); }
.ns-vid-status.is-video .ns-vid-dot { background: var(--accent); }
.ns-vid-status.is-generating { background: var(--accent-bg); color: var(--accent-text); }
.ns-vid-status.is-generating .ns-vid-dot { background: var(--accent); }
.ns-vid-status.is-failed { background: var(--error-bg); color: var(--error); }
.ns-vid-status.is-failed .ns-vid-dot { background: var(--error); }
.ns-vid-sub { font-size: 11px; color: var(--text-3); }
.ns-vid-head-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
/* 头部操作常驻可辨：全局禁用态透明度 0.45 在这些按钮上几乎看不见，用户会以为"按钮时有时无" */
.ns-vid-head-actions .btn:disabled { opacity: .65; }
.ns-vid-current-tag { display: inline-flex; align-items: center; gap: 4px; }

.ns-vid-stage {
  width: 100%; max-width: 640px; aspect-ratio: 16/9; border-radius: var(--radius);
  background: #0b0d11; display: grid; place-items: center; overflow: hidden;
}
.ns-vid-video { width: 100%; height: 100%; object-fit: contain; background: #000; }
.ns-vid-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--text-3); padding: 16px; text-align: center; }
.ns-vid-empty.is-error { color: var(--error); }
.ns-vid-empty-copy { display: flex; flex-direction: column; gap: 4px; }
.ns-vid-empty-title { font-size: 12.5px; font-weight: 600; color: var(--text-1); }
.ns-vid-empty.is-error .ns-vid-empty-title { color: var(--error); }
.ns-vid-empty-desc { font-size: 11.5px; line-height: 1.6; max-width: 380px; word-break: break-word; }

.ns-vid-inspector { display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--border); padding-top: 12px; }
.ns-vid-section { display: flex; flex-direction: column; gap: 7px; }
.ns-vid-section-head { display: flex; align-items: center; gap: 8px; }
.ns-vid-label { font-size: 11.5px; font-weight: 600; color: var(--text-2); }
.ns-vid-section-head .btn { margin-left: auto; }
.ns-vid-refs { display: flex; gap: 8px; flex-wrap: wrap; }
.ns-vid-ref {
  position: relative; width: 132px; aspect-ratio: 16/9; border-radius: 6px; overflow: hidden;
  border: 1px solid var(--border); background: var(--bg-hover); cursor: zoom-in; padding: 0;
}
.ns-vid-ref img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ns-vid-ref small {
  position: absolute; left: 4px; bottom: 4px; font-size: 9.5px; padding: 1px 5px;
  border-radius: 4px; background: rgba(0, 0, 0, .55); color: #fff;
}
.ns-vid-refs-empty { font-size: 11.5px; color: var(--text-3); }
/* 首尾帧选择器：参考帧旁的候选切换 + 候选条 */
.ns-frame-pickers { display: flex; align-items: center; gap: 8px; margin-left: 4px; }
.ns-frame-candidates { display: flex; flex-direction: column; gap: 8px; border: 1px dashed var(--border-strong); border-radius: 6px; padding: 8px 10px; }
.ns-frame-candidates-head { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--text-3); }
.ns-frame-candidates-list { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.ns-frame-cand { width: 96px; }
.ns-vid-ref.overridden { border-color: var(--accent); }

/* 关键帧候选：一个镜头保留多张，可选用/删除 */
.ns-kf-history { display: flex; flex-direction: column; gap: 6px; border-top: 1px dashed var(--border); padding-top: 8px; }
.ns-kf-history-head { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-3); }
.ns-kf-history-list { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.ns-kf-item {
  position: relative; flex: 0 0 auto; width: 108px; aspect-ratio: 16/9; border-radius: 6px; overflow: hidden;
  border: 1px solid var(--border); background: var(--bg-hover); cursor: zoom-in; padding: 0;
}
.ns-kf-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ns-kf-item.current { border-color: var(--success); }
.ns-kf-use {
  position: absolute; left: 4px; top: 4px; display: none; place-items: center;
  padding: 1px 6px; border: none; border-radius: 5px; cursor: pointer; font-size: 9.5px;
  background: var(--accent); color: var(--on-accent);
}
.ns-kf-item:hover .ns-kf-use { display: grid; }
.ns-vid-prompt {
  margin: 0; font-size: 12px; line-height: 1.65; color: var(--text-1);
  background: var(--bg-hover); border-radius: 6px; padding: 8px 10px; white-space: pre-wrap; word-break: break-word;
}
/* 可编辑提示词：编辑态给足高度，保存态用轻量文字提示（不抢视线） */
.ns-vid-prompt-input { font-size: 12px; line-height: 1.65; resize: vertical; min-height: 96px; }
.ns-vid-save-state { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-3); }
.ns-vid-save-state.is-ok { color: var(--success); }
.ns-vid-save-state.is-dirty { color: var(--warn-text); }
.ns-vid-params { display: flex; flex-wrap: wrap; gap: 6px 18px; }
.ns-vid-param { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-3); }
.ns-vid-param b { color: var(--text-1); font-weight: 600; }
.ns-vid-effective { font-size: 11px; color: var(--text-3); }
.ns-vid-warn {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 10px; border-radius: 6px; font-size: 11.5px;
  background: var(--warning-bg); color: var(--warn-text); border: 1px solid var(--warn-border);
}
.ns-vid-action { width: 100%; justify-content: center; }

/* 生成详情弹框 */
/* ===== 字幕面板：左侧逐条编辑 + 右侧样式与产物 ===== */
.ns-sub-layout { display: grid; grid-template-columns: 1fr minmax(260px, 320px); gap: 16px; align-items: start; }
.ns-sub-lines { display: flex; flex-direction: column; gap: 6px; max-height: 62vh; overflow-y: auto; padding-right: 4px; }
.ns-sub-line { display: grid; grid-template-columns: 28px 108px 1fr; gap: 8px; align-items: start; }
.ns-sub-no { font-size: 11px; color: var(--text-3); padding-top: 8px; text-align: right; }
.ns-sub-time { font-size: 11px; color: var(--text-3); padding-top: 8px; }
.ns-sub-text { font-size: 12px; line-height: 1.5; resize: vertical; min-height: 44px; }
.ns-sub-side { display: flex; flex-direction: column; gap: 14px; }
.ns-sub-params { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; }
.ns-sub-param { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-3); }
.ns-sub-param .input { padding: 5px 8px; font-size: 12px; }
.ns-sub-color { padding: 2px; height: 30px; }
.ns-sub-outputs { display: flex; flex-direction: column; gap: 6px; }
.ns-sub-output {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--border);
  border-radius: 6px; background: var(--bg-elevated); color: var(--text-1); text-decoration: none; font-size: 11px;
}
.ns-sub-output:hover { border-color: var(--accent); }

.ns-detail-dialog { width: min(720px, calc(100vw - 48px)); max-height: 88vh; display: flex; flex-direction: column; }
.ns-detail-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--border); }
.ns-detail-title { font-size: 14px; font-weight: 700; color: var(--text-0); }
.ns-detail-sub { font-size: 11px; }
.ns-detail-body { padding: 14px 18px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.ns-detail-grid { display: grid; grid-template-columns: 110px 1fr; gap: 8px 14px; margin: 0; }
.ns-detail-grid dt { font-size: 11.5px; color: var(--text-3); }
.ns-detail-grid dd { margin: 0; font-size: 12px; color: var(--text-1); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ns-detail-path { word-break: break-all; }
.ns-detail-error {
  display: flex; gap: 8px; align-items: flex-start; font-size: 11.5px;
  background: var(--error-bg); color: var(--error); border-radius: 6px; padding: 8px 10px; word-break: break-word;
}
.ns-detail-error-label { font-weight: 600; flex-shrink: 0; }
.ns-detail-prompt-head { display: flex; align-items: center; gap: 8px; }
.ns-detail-prompt {
  margin: 0; font-size: 11.5px; line-height: 1.65; color: var(--text-1);
  background: var(--bg-hover); border-radius: 6px; padding: 8px 10px;
  white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto;
}

/* 配音 */
.ns-audio-list { display: flex; flex-direction: column; gap: 8px; }
.ns-audio-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-elevated); }
.ns-audio-text { flex: 1; min-width: 160px; font-size: 12px; color: var(--text-1); line-height: 1.5; }
.ns-audio-row audio { height: 30px; }

/* 导出 */
.ns-export-list { display: flex; flex-direction: column; gap: 6px; }
.ns-export-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-elevated); }
.ns-export-row.off { opacity: .5; }
.ns-export-mid { flex: 1; min-width: 160px; display: flex; align-items: center; gap: 8px; }

/* 成片 */
.ns-merge-list { display: flex; flex-direction: column; gap: 12px; }
.ns-merge-row { border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; background: var(--bg-elevated); }
.ns-merge-main { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ns-merge-title { font-size: 12.5px; font-weight: 600; color: var(--text-1); }
.ns-merge-time { font-size: 11px; color: var(--text-3); margin-left: auto; }
.ns-merge-body { display: flex; gap: 12px; margin-top: 10px; align-items: flex-start; }
.ns-merge-video { width: 300px; border-radius: 6px; background: #000; }
.ns-merge-actions { display: flex; flex-direction: column; gap: 8px; }

/* ===== 关键帧放大预览浮层 ===== */
.ns-lightbox {
  position: fixed; inset: 0; z-index: 1200;
  background: rgba(8, 10, 14, .82);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.ns-lightbox-panel {
  display: flex; flex-direction: column; width: min(1200px, 96vw); max-height: 92vh;
  background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, .45);
}
.ns-lightbox-head {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-bottom: 1px solid var(--border);
}
.ns-lightbox-title { font-size: 12.5px; color: var(--text-1); max-width: 46%; }
.ns-lightbox-count { font-size: 11px; color: var(--text-3); }
.ns-lightbox-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.ns-lightbox-body {
  flex: 1; min-height: 0; display: grid; place-items: center;
  background: #0b0d11; overflow: auto; padding: 12px;
}
.ns-lightbox-body.fit img { max-width: 100%; max-height: calc(92vh - 220px); object-fit: contain; display: block; }
/* 原始尺寸：1:1 显示并允许滚动，便于检查画面细节与文字 */
.ns-lightbox-body.actual img { max-width: none; max-height: none; display: block; }
.ns-lightbox-foot { padding: 10px 14px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
.ns-lightbox-narration { margin: 0; font-size: 12px; color: var(--text-1); line-height: 1.6; }
.ns-lightbox-prompt { margin: 0; font-size: 11.5px; color: var(--text-3); line-height: 1.6; max-height: 72px; overflow-y: auto; }
.ns-lightbox-nav { display: flex; gap: 8px; justify-content: flex-end; }
</style>
