<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="submit">
      <div class="login-brand">
        <img class="login-logo" src="/icon-192.png" alt="" />
        <div class="login-brand-text">
          <h1 class="login-title">{{ t('login.title') }}</h1>
          <p class="login-sub">{{ t('login.subtitle') }}</p>
        </div>
      </div>

      <label class="login-field">
        <span class="login-label">{{ t('login.username') }}</span>
        <input
          v-model="form.username"
          class="login-input"
          type="text"
          name="username"
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
          :disabled="loading"
          @input="error = ''"
        />
      </label>

      <label class="login-field">
        <span class="login-label">{{ t('login.password') }}</span>
        <input
          v-model="form.password"
          class="login-input"
          type="password"
          name="password"
          autocomplete="current-password"
          :disabled="loading"
          @input="error = ''"
        />
      </label>

      <p v-if="error" class="login-error">{{ error }}</p>

      <button class="login-submit" type="submit" :disabled="loading || !canSubmit">
        <Loader2 v-if="loading" :size="15" class="login-spin" />
        <LogIn v-else :size="15" />
        {{ loading ? t('login.submitting') : t('login.submit') }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { Loader2, LogIn } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuth } from '~/composables/useAuth'

// 登录页不套应用外壳（侧边栏/顶栏此时都没有意义）
definePageMeta({ layout: false })

const { t } = useI18n()
const route = useRoute()
const { login, authenticated, refresh } = useAuth()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

const canSubmit = computed(() => !!form.username.trim() && !!form.password)

/** 只接受站内相对路径，避免 redirect 参数被用作开放重定向 */
const redirectTarget = computed(() => {
  const raw = route.query.redirect
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
})

onMounted(async () => {
  // 已登录时直接放行（例如手动访问 /login）
  if (await refresh()) {
    await navigateTo(redirectTarget.value, { replace: true })
  }
})

async function submit() {
  if (loading.value || !canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    await login(form.username.trim(), form.password)
    form.password = ''
    await navigateTo(redirectTarget.value, { replace: true })
  } catch (e: any) {
    error.value = e?.message || t('login.failed')
    form.password = ''
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-base);
}
.login-card {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 28px 26px 22px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 14px);
  box-shadow: var(--shadow-lg);
}
.login-brand { display: flex; align-items: center; gap: 12px; }
.login-logo { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; }
.login-brand-text { min-width: 0; }
.login-title { margin: 0; font-size: 17px; font-weight: 700; color: var(--text-0); letter-spacing: -0.01em; }
.login-sub { margin: 2px 0 0; font-size: 12px; color: var(--text-3); line-height: 1.5; }

.login-field { display: flex; flex-direction: column; gap: 5px; }
.login-label { font-size: 12px; font-weight: 600; color: var(--text-2); }
.login-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  font-size: 13.5px;
  color: var(--text-0);
  background: var(--bg-input, var(--surface-input));
  border: 1px solid var(--border-strong, var(--border));
  border-radius: 9px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.login-input:focus { border-color: var(--border-focus, var(--accent)); box-shadow: 0 0 0 3px var(--accent-glow); }
.login-input:disabled { opacity: 0.6; }

.login-error {
  margin: 0;
  padding: 8px 10px;
  font-size: 12.5px;
  color: var(--error);
  background: var(--error-bg);
  border-radius: 8px;
}

.login-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  margin-top: 2px;
  font-size: 13.5px;
  font-weight: 650;
  color: var(--on-accent, #fff);
  background: var(--accent-gradient);
  border: none;
  border-radius: 9px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.login-submit:disabled { opacity: 0.55; cursor: not-allowed; }
.login-spin { animation: login-spin 0.9s linear infinite; }
@keyframes login-spin { to { transform: rotate(360deg); } }
</style>
