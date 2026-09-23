<template>
  <AppMenu v-model:open="open" placement="bottom-end" :min-width="236">
    <template #trigger>
      <button
        type="button"
        class="account-trigger"
        :aria-label="t('components.accountMenu.label')"
        aria-haspopup="menu"
        :aria-expanded="open"
        @click.stop="openMenu"
        @mouseenter="openMenu"
        @mouseleave="scheduleClose"
        @focus="openMenu"
        @blur="scheduleClose"
      >
        <span class="account-avatar" aria-hidden="true">{{ initial }}</span>
      </button>
    </template>

    <!-- 面板被 Teleport 到 body，不是触发器的 DOM 后代：靠「延迟关闭 + 进入面板撤销」让指针能移进来 -->
    <div class="account-panel" @mouseenter="cancelClose" @mouseleave="scheduleClose">
      <div class="account-id">
        <span class="account-id-label">{{ t('settings.account.currentUser') }}</span>
        <span class="account-id-name mono">{{ username || '—' }}</span>
      </div>
      <div class="app-menu-sep" />
      <AppMenuItem @click="openPasswordDialog">
        <KeyRound :size="13" :stroke-width="1.8" />
        <span>{{ t('settings.account.changePassword') }}</span>
      </AppMenuItem>
      <AppMenuItem danger @click="doLogout">
        <LogOut :size="13" :stroke-width="1.8" />
        <span>{{ t('settings.account.logout') }}</span>
      </AppMenuItem>
    </div>
  </AppMenu>

  <!-- 修改口令（复用全局 .overlay/.dialog 骨架，与其它弹窗一致） -->
  <Teleport to="body">
    <div v-if="pwOpen" class="overlay" @click.self="closePasswordDialog">
      <div
        class="dialog account-pw-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('settings.account.changePassword')"
      >
        <div class="dialog-head">
          <span class="dialog-title">{{ t('settings.account.changePassword') }}</span>
          <button type="button" class="btn btn-icon" :aria-label="t('common.close')" @click="closePasswordDialog">
            <X :size="15" :stroke-width="1.8" />
          </button>
        </div>
        <div class="dialog-body">
          <p class="account-pw-note">{{ t('settings.account.changePasswordNote', { n: minPasswordLength }) }}</p>
          <label class="account-field">
            <span class="account-field-label">{{ t('settings.account.currentPassword') }}</span>
            <input
              ref="currentInput"
              v-model="pwForm.current"
              class="input"
              type="password"
              autocomplete="current-password"
              @keydown.enter="submitPasswordChange"
            />
          </label>
          <label class="account-field">
            <span class="account-field-label">{{ t('settings.account.newPassword') }}</span>
            <input
              v-model="pwForm.next"
              class="input"
              type="password"
              autocomplete="new-password"
              @keydown.enter="submitPasswordChange"
            />
          </label>
          <label class="account-field">
            <span class="account-field-label">{{ t('components.accountMenu.confirmPassword') }}</span>
            <input
              v-model="pwForm.confirm"
              class="input"
              type="password"
              autocomplete="new-password"
              @keydown.enter="submitPasswordChange"
            />
          </label>
          <p v-if="mismatch" class="account-pw-error">{{ t('components.accountMenu.mismatch') }}</p>
        </div>
        <div class="dialog-foot">
          <button type="button" class="btn" @click="closePasswordDialog">{{ t('common.cancel') }}</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="pwSaving || !canSubmit"
            @click="submitPasswordChange"
          >
            <Loader2 v-if="pwSaving" :size="13" class="animate-spin" />
            {{ t('settings.account.save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * AccountMenu — 顶栏右侧账号入口（语言切换器之后）
 *
 * 鼠标 hover / 聚焦即展开，内容为「当前账号 + 修改口令 + 退出登录」。
 * 菜单面板复用全站统一的 AppMenu（Teleport + 定位 + Esc/外部点击关闭），
 * 只是把触发方式从「点击」扩展为「hover」：
 * 面板不在触发器的 DOM 子树里，指针从头像移向面板时会先触发 mouseleave，
 * 因此这里用「延迟关闭 + 进入面板时撤销」而不是立即关闭。
 */
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { KeyRound, LogOut, Loader2, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { authAPI } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'
import { toastError } from '~/composables/useToast'

const { t } = useI18n()
const { username, minPasswordLength, logout } = useAuth()

const open = ref(false)
/** 头像用账号首字母，避免引入额外头像资源 */
const initial = computed(() => (username.value || '?').trim().charAt(0).toUpperCase() || '?')

const CLOSE_DELAY_MS = 160
let closeTimer = null

function cancelClose() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
}
function openMenu() {
  cancelClose()
  open.value = true
}
function scheduleClose() {
  cancelClose()
  closeTimer = setTimeout(() => { open.value = false }, CLOSE_DELAY_MS)
}
onBeforeUnmount(cancelClose)

// ===== 修改口令 =====
const pwOpen = ref(false)
const pwSaving = ref(false)
const pwForm = reactive({ current: '', next: '', confirm: '' })
const currentInput = ref(null)

const mismatch = computed(() => !!pwForm.confirm && pwForm.next !== pwForm.confirm)
const canSubmit = computed(() =>
  !!pwForm.current
  && pwForm.next.length >= minPasswordLength.value
  && pwForm.next === pwForm.confirm,
)

function openPasswordDialog() {
  open.value = false
  cancelClose()
  pwForm.current = ''
  pwForm.next = ''
  pwForm.confirm = ''
  pwOpen.value = true
  nextTick(() => currentInput.value?.focus?.())
}

function closePasswordDialog() {
  if (pwSaving.value) return
  pwOpen.value = false
}

function onDialogKeydown(e) {
  if (e.key === 'Escape') closePasswordDialog()
}

watch(pwOpen, (v) => {
  if (typeof window === 'undefined') return
  if (v) window.addEventListener('keydown', onDialogKeydown)
  else window.removeEventListener('keydown', onDialogKeydown)
})
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onDialogKeydown)
})

async function submitPasswordChange() {
  if (pwSaving.value || !canSubmit.value) return
  pwSaving.value = true
  try {
    await authAPI.changePassword(pwForm.current, pwForm.next)
    // 后端改密时轮换会话世代并重签当前会话，无需重新登录
    pwOpen.value = false
    toast.success(t('settings.account.changeSuccess'))
  } catch (e) {
    toastError(e, { fallback: 'settings.account.changeFailed' })
  } finally {
    pwSaving.value = false
  }
}

// ===== 退出登录 =====
async function doLogout() {
  open.value = false
  cancelClose()
  await logout()
  await navigateTo('/login', { replace: true })
}
</script>

<style scoped>
.account-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 与顶栏其它图标按钮（ThemeToggle / GitHub）同为 32×32 命中区 */
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--radius-pill);
  line-height: 1;
  transition: box-shadow 0.18s var(--ease-out);
}
.account-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3.5px var(--button-focus);
}

.account-avatar {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  background: var(--accent-gradient);
  color: var(--on-accent);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  user-select: none;
  transition: filter 0.18s var(--ease-out);
}
.account-trigger:hover .account-avatar { filter: brightness(1.06); }

/* 面板内容：与 .app-menu 同为纵向 flex，视觉上等价于直接挂在菜单里 */
.account-panel { display: flex; flex-direction: column; }

.account-id {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 10px 9px;
  min-width: 0;
}
.account-id-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-3);
}
.account-id-name {
  font-size: 12.5px;
  color: var(--text-1);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.account-pw-dialog { width: 420px; max-width: calc(100vw - 48px); }
.account-pw-note {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-2);
  margin-bottom: 14px;
}
.account-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.account-field-label { font-size: 12px; font-weight: 600; color: var(--text-2); }
.account-pw-error { font-size: 12px; color: var(--action-danger); margin-top: -4px; }
</style>
