/**
 * 模型选择的纯逻辑 —— 漫剧工作台与口播工作台**共用同一套 key 语义**。
 *
 * 为什么必须共用：顶栏的选择值会被直接送进后端适配器与 Agent 请求，
 * 两处各写一份「怎么拼 key / 怎么从 key 取配置 id」迟早会漂移，
 * 表现就是「顶栏换了模型但生成还是旧模型」这类难查的问题。
 *
 * key 形态：`provider/model@配置id`
 * - 同名模型可能来自不同厂商，也可能来自同一厂商的不同配置
 *   （例如同一 MiniMax-H3 既有官方直连也有私有中转）——必须带配置 id，否则第二份配置的同一模型根本选不到
 * - 裸模型名（去掉 provider 前缀与 @配置id）才是发给上游的 model 字段
 */

/** localStorage 键：两类工作台共用同一个用户偏好（换模型后到哪都是这个选择） */
export const MODEL_STORE_KEYS = {
  chat: 'huobao:model:chat',
  image: 'huobao:model:image',
  video: 'huobao:model:video',
  audio: 'huobao:model:audio',
} as const

export interface ModelPickOption {
  key: string
  model: string
  provider: string
  configId: number
  configName: string
}

/** 配置里的模型数组（API 可能返回数组或 JSON 字符串） */
export function configModels(cfg: any): string[] {
  const raw = cfg?.model
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  try {
    const m = JSON.parse(raw)
    return Array.isArray(m) ? m.filter(Boolean) : [m].filter(Boolean)
  } catch {
    return [raw].filter(Boolean)
  }
}

/** 汇总该类型全部**启用**配置的模型（按优先级降序），选中值连同所属配置一起带回 */
export function collectModelOptions(cfgs: any[]): ModelPickOption[] {
  const seen = new Set<string>()
  const out: ModelPickOption[] = []
  const sorted = [...(cfgs || [])].filter(c => c.is_active).sort((a, b) => (b.priority || 0) - (a.priority || 0))
  for (const c of sorted) {
    for (const m of configModels(c)) {
      const key = `${c.provider}/${m}@${c.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ key, model: m, provider: c.provider, configId: c.id, configName: c.name || '' })
    }
  }
  return out
}

/** 复合键 → 裸模型名（后端适配器按厂商校验模型名，不能带 provider 前缀或 @配置id 后缀） */
export function bareModelName(key?: string | null): string {
  if (!key) return ''
  const at = key.indexOf('@')
  const bare = at >= 0 ? key.slice(0, at) : key
  const i = bare.indexOf('/')
  return i >= 0 ? bare.slice(i + 1) : bare
}

/** 复合键 → 所属配置 id（兼容改造前存下的 'provider/model' 形式） */
export function ownerConfigId(options: ModelPickOption[], key?: string | null): number | undefined {
  if (!key) return undefined
  const exact = options.find(o => o.key === key)
  if (exact) return exact.configId || undefined
  const legacy = options.find(o => `${o.provider}/${o.model}` === key)
  return legacy?.configId || undefined
}

/** 同类模型是否来自多个配置（决定下拉里是否要显示配置名，避免同名混淆） */
export function hasMultiConfigs(options: ModelPickOption[]): boolean {
  return new Set(options.map(o => o.configId)).size > 1
}

/** 读取持久化的模型选择（空串 = 跟随配置默认） */
export function readStoredModel(key: string, legacyKey = ''): string {
  try {
    return localStorage.getItem(key) || (legacyKey && localStorage.getItem(legacyKey)) || ''
  } catch {
    return ''
  }
}

/** 写入持久化的模型选择（空串则清除） */
export function storeModel(key: string, value: string): void {
  try {
    value ? localStorage.setItem(key, value) : localStorage.removeItem(key)
  } catch { /* 隐私模式下静默 */ }
}

/**
 * 解析「实际生效的模型」：顶栏选了什么就用什么，没选则跟随该类型优先级最高配置的首个模型。
 * 返回 { model, configId } —— 两者要一起下发，否则可能出现模型名与配置对不上。
 */
export function resolveEffectiveModel(
  selectedKey: string,
  options: ModelPickOption[],
): { model: string; configId?: number; key: string } {
  if (selectedKey) {
    return { model: bareModelName(selectedKey), configId: ownerConfigId(options, selectedKey), key: selectedKey }
  }
  const first = options[0]
  if (!first) return { model: '', configId: undefined, key: '' }
  return { model: first.model, configId: first.configId, key: first.key }
}
