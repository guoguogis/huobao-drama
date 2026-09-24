# 设计生成评估基准 / 排行榜调研报告

> 调研日期：2026-09-24（本文所有链接均为当日实际抓取）
> 方法说明：本报告所有事实均来自当日在线检索与抓取。凡属**搜索结果摘要 / 缓存描述**而非实际页面正文的，已单独标注；凡未能在线核实的，标注「未核实」。
> 重要限制：`lmarena.ai` 当日本会话抓取直接失败（`fetch failed`），`arena.ai` 返回 Cloudflare 403（`Sorry, you have been blocked`）——因此这两个官方榜单页面**未能直接读取**，相关数字只能依赖第三方转载，可信度已逐条标注。

---

## 1. Design Arena（designarena.ai）

### 1.1 公司、创始人、上线时间、YC

- Design Arena 由 **Arcada Labs**（官网页脚与博客署名为 "The Intelligence Company" / "Intelligence"）运营，官网页脚显示「© 2026 Design Arena by Intelligence」([About | Design Arena](https://www.designarena.ai/about)，页面未标注更新日期，抓取于 2026-09-24)。
- YC 官方 Launch 页面由 **Grace Li** 发布，标题为「Design Arena - #1 Benchmark for AI Design」，副标题「Attracted 47K+ users across 136 countries in 4 weeks」，页面时间标记为「about 1 year ago」；团队自述「We're all best friends from Harvard!」，成员为 **Kamryn Ohly（CTO，哈佛计算机+教育，前 Apple）** 与 **Grace Li（CEO，哈佛计算机+神经科学，前 Apple）** ([Launch YC: Design Arena](https://www.ycombinator.com/launches/O5h-design-arena-1-benchmark-for-ai-design)，页面标记「about 1 year ago」，抓取于 2026-09-24)。
- 融资：TechCrunch 报道标题为「Design Arena creators raise $7.9 million to bring taste to AI models」，URL 日期段为 2026/08/03 ([TechCrunch](https://techcrunch.com/2026/08/03/designarena-creators-raise-7-9-million-to-bring-taste-to-ai-models/)，2026-08-03；**注意：该页正文本次抓取被截断，仅能确认标题与日期**）。
- 另一家媒体给出的金额为 **800 万美元**，并写到「Founded in 2025 by Grace Li, Design Arena emerged from the **Y Combinator S25** cohort」、平台已有「more than 5 million users across 140-plus countries」([Crypto Briefing](https://cryptobriefing.com/design-arena-raises-8m-ai-benchmarking/)，2026-08-03)。
- 第三方榜单站 DataLearner 亦将 Design Arena 描述为「developed by Arcada Labs, a **Y Combinator-backed** platform」([DataLearnerAI](https://www.datalearner.com/en/leaderboards/external/arcada-code)，数据版本 2026-09-21)。

> 口径冲突提示：TechCrunch 标题写 **$7.9M**，Crypto Briefing 标题写 **$8M**（疑为四舍五入差异）；YC 具体批次 **S25** 仅见于 Crypto Briefing 一家，YC 官方 Launch 页未标注批次 → **YC 批次视为「部分核实」**。

### 1.2 方法论（官方一手来源）

来自官网 About 页与官方博客 Methodology 页：

- **赛制是「4 模型锦标赛 + 匿名对战」**，不是简单的一对一：每个投票会话随机抽取 4 个模型（外加 1 个备用），全部收到相同 prompt、同时生成；先进行 2 场匿名两两对战，胜者组/败者组再各打一场，最后一场为季军/冠军加赛，共 **5 场对战 = 5 票**，可产出完整的 1–4 名排序 ([About | Design Arena](https://www.designarena.ai/about)，抓取 2026-09-24)。
- **投票者是人类社区用户**，不是 AI 评委：「Community preferences shape the rankings」「Rankings emerge from collective community preferences rather than curated opinions」。模型身份全程隐藏以防品牌偏见 ([About | Design Arena](https://www.designarena.ai/about))。
- **评分模型是 Bradley-Terry，不是标准 Elo**：官方明确写「The Elo score is approximated through the Bradley-Terry model」，迭代收敛阈值 `0.0001` 或最多 `200` 次迭代，换算公式 `Rating = 400 × log₁₀(strength)` ([Design Arena Methodology](https://notes.designarena.ai/methodology/)，页面提及「fifteen as of Oct. 12, 2025」；同一说法亦见 [About | Design Arena](https://www.designarena.ai/about))。
- 每场两两比较等权计入，无过滤、无编辑干预；胜率 = 头对头胜场百分比 ([About | Design Arena](https://www.designarena.ai/about))。
- **榜单刷新频率：每 2 小时**；票数少于 15 的模型在计算 strength 前被剔除；少于 50 票的模型打「new」标签；误差用约 95% Wilson 置信区间 ([Design Arena Methodology](https://notes.designarena.ai/methodology/))。
- Prompt 会被 AI 改写与审核：改写与内容审核均调用 `gemini-2.5-flash-lite-preview-09-2025`，官方称「This model was selected for cost purposes」；输入 prompt 限制在 5k 字符以内 ([Design Arena Methodology](https://notes.designarena.ai/methodology/))。
- 系统 prompt 对各家保持一致以降低偏差，公布在 [designarena.ai/system-prompts](https://designarena.ai/system-prompts)（该链接来自官方方法论页正文，本次未单独抓取）。
- **Builder 类别另有一套流程**：同样 prompt 一次性（one-shot）交给所有 builder，随机两两配对盲投；官方注明这是「an initial, best-effort procedure」([About | Design Arena](https://www.designarena.ai/about))。
- 榜单确实在活跃更新：官方 Changelog 最新条目为 **September 23, 2026**（新增 `grok-4.7`、`arrow-2-telos`），9 月 22 日新增 `claude-opus-5-5`、`gpt-6-sol`、`gpt-6-luna`，9 月 20 日新增 `gpt-6-astra-max` ([Design Arena Changelog](https://www.designarena.ai/changelog)，2026-09-23)。

### 1.3 官方自陈的局限 / 注意事项

- 「A subjective framework for evaluating AI design capabilities」——官方自我定位为主观框架 ([About | Design Arena](https://www.designarena.ai/about))。
- 主柱状图会过滤掉两两比较不足 **50** 次的模型；模型在两两比较达到「typically 200, varying by category」之前标记为 **preliminary（初步）** ([About | Design Arena](https://www.designarena.ai/about))。
- 官方称这是「A mirror, not a scoreboard」，强调排行榜是镜子不是记分牌 ([About | Design Arena](https://www.designarena.ai/about))。
- Builder 类别「Planned extensions include multi-turn prompts, a broader task set, and additional builders」（多轮 prompt、更广任务集、更多 builder 尚在计划中）([About | Design Arena](https://www.designarena.ai/about))。
- 输出 token 上限、temperature 等**未标准化**，遵循各 provider 自身配置；推理模型使用其要求设置（如 temperature = 1）([Design Arena Methodology](https://notes.designarena.ai/methodology/))。

### 1.4 各分类榜单与分数（约 2026 年 9 月）

**重要前提**：designarena.ai 的 `/leaderboard/*` 页面为 JS 渲染，本次抓取只得到页脚与导航，**榜单数字无法从官网 HTML 直接读出**。以下数字来自独立聚合站 **BenchmarkList**，其页面明确标注 `Scraped 2026-09-02T18:07:19Z` 且注明「Showing the reviewed static snapshot. A newer Arena Worker observation replaces this table when available.」→ 属于**第三方静态快照**，非官网实时值。

#### (1) Website（官网 `/leaderboard/website`）
共收录 **173** 个模型，榜首分数 **1362**，前二差 **24** 分 ([Website Design Arena Ranking | BenchmarkList](https://benchmarklist.com/arenas/design_arena_website/)，快照 2026-09-02)：

| 排名 | 模型 | 开发者 | Elo |
|---|---|---|---|
| 1 | Kimi K3 | Moonshot AI | 1362 |
| 2 | GPT-5.6 Sol (XHigh) | OpenAI | 1338 |
| 3 | Claude Fable 5.1 | Anthropic | 1334 |
| 4 | GPT-5.6 Sol (Medium) | OpenAI | 1332 |
| 5 | Muse Spark 1.2 | Meta | 1329 |
| 6 | GLM-5.3 | Zhipu AI | 1327 |
| 7 | Claude Opus 5 | Anthropic | 1326 |
| 8 | Gemini 3.6 Flash | Google | 1319 |
| 9 | GLM 5.2 | Zhipu AI | 1319 |
| 10 | Gemini 3.7 Flash | Google | 1318 |
| 11 | Claude Fable 5 | Anthropic | 1315 |
| 12 | Grok 4.6 | xAI | 1314 |

#### (2) UI Component（官网 `/leaderboard/ui-components`）
共 **154** 个模型，榜首 **1381**，前二差仅 **2** 分 ([UI Component Arena Ranking | BenchmarkList](https://benchmarklist.com/arenas/design_arena_ui_components/)，快照 2026-09-02)：

| 排名 | 模型 | 开发者 | Elo |
|---|---|---|---|
| 1 | Claude Fable 5.1 | Anthropic | 1381 |
| 2 | Kimi K3 | Moonshot AI | 1379 |
| 3 | Claude Opus 5 | Anthropic | 1370 |
| 4 | Qwen3.8 Max | Alibaba | 1358 |
| 5 | GPT-5.6 Sol (XHigh) | OpenAI | 1356 |
| 6 | GLM-5.3 | Zhipu AI | 1351 |
| 7 | Muse Spark 1.2 | Meta | 1351 |
| 8 | GPT-5.6 Sol (Medium) | OpenAI | 1350 |
| 9 | GLM-5.3-Flash | Zhipu AI | 1347 |
| 10 | Claude Fable 5 | Anthropic | 1339 |

#### (3) Image to HTML
BenchmarkList 将官网 `/leaderboard/image-to-html` 收录为「**Image-to-Website Arena**」，说明为「Models recreate a reference image as a functional website」。共 **30** 个模型，榜首 **1259**，前二差 **16** ([Image-to-Website Arena Ranking | BenchmarkList](https://benchmarklist.com/arenas/design_arena_image_to_website/)，快照 2026-09-02)：

| 排名 | 模型 | 开发者 | Elo |
|---|---|---|---|
| 1 | Kimi K3 | Moonshot AI | 1259 |
| 2 | Qwen3.8 Max | Alibaba | 1243 |
| 3 | Muse Spark 1.2 | Meta | 1241 |
| 4 | GPT-5.6 Sol (Medium) | OpenAI | 1239 |
| 5 | Claude Fable 5 | Anthropic | 1234 |
| 6 | Gemini 3.7 Flash | Google | 1234 |
| 7 | GPT-5.6 Sol (XHigh) | OpenAI | 1231 |
| 8 | Grok 4.6 | xAI | 1228 |
| 9 | GLM-5.3-Flash | Zhipu AI | 1224 |
| 10 | Claude Opus 5 | Anthropic | 1222 |

> 注意：官网另有独立的 `/leaderboard/image-to-webapp` 分类，BenchmarkList 单列（Image-to-Web App Arena，榜首 Kimi K3 **1291**，第二 Claude Fable 5 **1271**，[Arena 总表](https://benchmarklist.com/arenas/)，抓取 2026-09-24）。请不要把这两者混为一谈。

#### (4) Graphic Design（官网 `/leaderboard/graphic-design`）
共 **73** 个模型，榜首 **1451**，前二差 **62** 分——是各分类中差距最大的 ([Graphic Design Arena Ranking | BenchmarkList](https://benchmarklist.com/arenas/design_arena_graphic_design/)，快照 2026-09-02)：

| 排名 | 模型 | 开发者 | Elo |
|---|---|---|---|
| 1 | GPT Image 2 | OpenAI | 1451 |
| 2 | Reve 2.1 | Reve | 1389 |
| 3 | Reve 2.0 | Reve | 1369 |
| 4 | Grok Imagine Image 2 | xAI | 1325 |
| 5 | GPT-Image-1.5 | OpenAI | 1312 |
| 6 | Muse Image | Meta | 1300 |
| 7 | Seedream 5.0 Pro | ByteDance | 1293 |
| 8 | Qwen Image 3 Pro | Alibaba | 1287 |
| 9 | Gemini 3.1 Flash Image Gen 2K (Nano Banana 2) | Google | 1278 |
| 10 | Ideogram 4.0 | Ideogram | 1272 |

#### (5) ASCII Art（官网 `/leaderboard/ascii`）
共 **82** 个模型，榜首 **1383**，前二差 **20** ([ASCII Art Arena Ranking | BenchmarkList](https://benchmarklist.com/arenas/design_arena_ascii/)，快照 2026-09-02)：

| 排名 | 模型 | 开发者 | Elo |
|---|---|---|---|
| 1 | Claude Opus 5 | Anthropic | 1383 |
| 2 | Claude Fable 5 | Anthropic | 1363 |
| 3 | Muse Spark 1.1 | Meta | 1315 |
| 4 | Claude Opus 4.7 | Anthropic | 1312 |
| 5 | Grok 4.6 | xAI | 1309 |
| 6 | Claude Opus 4.8 | Anthropic | 1302 |
| 7 | Gemini 3.1 Pro Preview | Google | 1298 |
| 8 | Gemini 3.6 Flash | Google | 1291 |
| 9 | Grok 4.5 | xAI | 1289 |
| 10 | GPT-5.6 Sol (XHigh) | OpenAI | 1285 |

#### (6) Data Visualization（官网 `/leaderboard/data-viz`）
共 **155** 个模型，榜首 **1393**，前二差 **24** ([Data Visualization Arena Ranking | BenchmarkList](https://benchmarklist.com/arenas/design_arena_data_viz/)，快照 2026-09-02)：

| 排名 | 模型 | 开发者 | Elo |
|---|---|---|---|
| 1 | Claude Fable 5.1 | Anthropic | 1393 |
| 2 | Kimi K3 | Moonshot AI | 1369 |
| 3 | Claude Opus 5 | Anthropic | 1358 |
| 4 | Muse Spark 1.2 | Meta | 1355 |
| 5 | Gemini 3.7 Flash | Google | 1340 |
| 6 | Claude Fable 5 | Anthropic | 1330 |
| 7 | GPT-5.6 Sol (XHigh) | OpenAI | 1327 |
| 8 | GPT-5.6 Sol (Medium) | OpenAI | 1325 |
| 9 | GLM 5.2 | Zhipu AI | 1318 |
| 10 | Gemini 3.6 Flash | Google | 1316 |

#### (7) 3D Design（官网 `/leaderboard/3d-design`）
共 **148** 个模型，榜首 **1438**，前二差 **13** ([3D Design Arena Ranking | BenchmarkList](https://benchmarklist.com/arenas/design_arena_3d/)，快照 2026-09-02)：

| 排名 | 模型 | 开发者 | Elo |
|---|---|---|---|
| 1 | Kimi K3 | Moonshot AI | 1438 |
| 2 | GPT-5.6 Sol (XHigh) | OpenAI | 1425 |
| 3 | Claude Fable 5.1 | Anthropic | 1418 |
| 4 | GLM-5.3 | Zhipu AI | 1408 |
| 5 | GLM-5.3-Flash | Zhipu AI | 1385 |
| 6 | Claude Opus 5 | Anthropic | 1368 |
| 7 | Qwen3.8 Max | Alibaba | 1366 |
| 8 | Claude Fable 5 | Anthropic | 1358 |
| 9 | GPT-5.6 Sol (Medium) | OpenAI | 1353 |
| 10 | Gemini 3.7 Flash | Google | 1353 |

#### (8) Code / Frontend 聚合榜（跨子类合并）
DataLearner 转载的「Arcada Labs Code Categories Arena Leaderboard」把各代码子类票数**合并**后用 Bradley-Terry 拟合（非按类别加权，票多的类别影响更大），收录 **166** 个模型，数据版本 **2026 年 09 月 21 日**，榜首 Kimi K3 **1385.00**（95% CI ±8.9，6,718 票）([DataLearnerAI](https://www.datalearner.com/en/leaderboards/external/arcada-code)，数据版本 2026-09-21)：

| 排名 | 模型 | 分数 | 95% CI | 票数 |
|---|---|---|---|---|
| 1 | Kimi K3 (Moonshot AI) | 1385.00 | ±8.9 | 6,718 |
| 2 | Muse Spark 1.3 Max (Meta) | 1369.00 | ±6.6 | 12,744 |
| 3 | GPT-6 Astra (xhigh) (OpenAI) | 1365.00 | ±9.1 | 6,226 |
| 4 | Muse Spark 1.3 (xhigh) (Meta) | 1363.00 | ±5.9 | 16,388 |
| 5 | GPT-5.6 Sol (xhigh) (OpenAI) | 1350.00 | ±7.9 | 8,172 |
| 6 | Claude Fable 5.1 (Anthropic) | 1345.00 | ±8 | 7,944 |
| 7 | DeepSeek-V4.1-Flash (DeepSeek) | 1339.00 | ±6.5 | 12,743 |
| 8 | Claude Opus 5 (Anthropic) | 1337.00 | ±6.1 | 14,387 |
| 9 | GPT-5.6 Sol (medium) (OpenAI) | 1333.00 | ±5 | 22,279 |
| 10 | GLM-5.3 (智谱AI) | 1327.00 | ±6.1 | 14,192 |

#### (9) 其他子榜（BenchmarkList 总表速览，快照 2026-09-02）
([SOTA AI Arena Rankings | BenchmarkList](https://benchmarklist.com/arenas/)，抓取 2026-09-24)

- **Frontend Web App Arena**：Kimi K3 **1335** / Qwen3.8 Max **1335** / Claude Fable 5 **1288** / Claude Opus 5 **1284** / Claude Opus 4.7 **1279**
- **Full-Stack Web App Arena**：Claude Opus 5 **1362** / Kimi K3 **1358** / Qwen3.8 Max **1332** / Claude Fable 5 **1295** / GPT-5.6 Sol (XHigh) **1288**
- **Image-to-Web App Arena**：Kimi K3 **1291** / Claude Fable 5 **1271** / Muse Spark 1.2 **1271** / Grok 4.5 **1239** / Grok 4.6 **1235**
- **Agentic Game Dev Arena**：Claude Fable 5 **1285** / GPT-5.6 Sol (XHigh) **1268** / Claude Opus 5 **1267** / Kimi K3 **1249** / Claude Opus 4.7 **1247**
- **Godot Game Dev Arena**：Claude Fable 5 **1344** / GPT-5.6 Sol (Medium) **1271** / Grok 4.5 **1270** / Claude Sonnet 5 **1268** / Claude Opus 4.8 **1253**
- **Android App Arena**：Claude Fable 5 **1303** / Grok 4.6 **1300** / Claude Opus 5 **1278** / Gemini 3.7 Flash **1270**

#### (10) 官方博客给出的历史分数（一手来源，可作趋势对照）
- 「Kimi K3, Moonshot AI's latest open-weight model, ranks 1st on our single-shot Frontend Arena with an **Elo of 1392**」( [Kimi K3's Design Secret may be in its Thinking Traces](https://notes.designarena.ai/kimi-k3s-design-secret-may-be-in-its-thinking-traces/)，2026-07-23)。
- 「GPT-5.6 Sol… ranks 1st overall… 18 places higher than its predecessor GPT-5.5」( [How OpenAI's Sol Finally Learned Design Taste](https://notes.designarena.ai/how-openais-sol-finally-learned-design-taste/)，2026-07-15)（该页未给出具体 Elo 数值）。
- 「GLM 5.2 ranks 1st overall on Design Arena's single-turn, HTML Web Design (Non-Agentic) evaluation, 5 places higher than its predecessor GLM-5.1」( [How GLM-5.2 Beat Fable 5 at Website Design](https://notes.designarena.ai/how-glm-5-2-beat-fable-5-at-website-design/)，2026-06-19)。
- 官方另有 **Audio Realism Benchmark**（2026-08-04 发布），称传统 1–5 MOS 已饱和 ([Audio Realism Benchmark](https://notes.designarena.ai/audio-realism-benchmark-measuring-realism-in-audio-models/)，2026-08-04)。

> 数据新鲜度声明：上述排行榜数字我**看到的是 2026-09-02 的静态快照**（BenchmarkList）与 **2026-09-21 的聚合数据**（DataLearner）。官网 changelog 显示 9/20–9/23 仍在新增模型（`gpt-6-astra-max`、`claude-opus-5-5`、`grok-4.7`），因此**这些具体名次与分数到 2026-09-24 极可能已经变动**。

---

## 2. WebDev Arena / LMArena WebDev 排行榜

### 2.1 它是什么 / 与 LMArena 的关系

- 多个来源把它与 LMArena（原 LMSYS Chatbot Arena）体系关联：BenchmarkList 的「WebDev Arena」页面把数据来源标为 `https://arena.ai/leaderboard/code`，分类为「Coding / Arena」，描述为「Human-preference rankings for front-end and full-stack web development, including agentic coding workflows」([WebDev Arena Ranking | BenchmarkList](https://benchmarklist.com/arenas/arena_ai_code/)，快照 2026-09-02)。
- 独立榜单站 LLM Registry 直接以「**LMArena WebDev ELO** Leaderboard」为页名收录 ([LMArena WebDev ELO Benchmark Leaderboard | LLM Registry](https://llm-registry.com/benchmark/lmarena-webdev-elo)，页面无发布日期；该页正文本次抓取被截断，仅得到标题与站点框架)。
- 法语科技媒体 blogdumoderateur 描述其机制：「La WebDev Arena fonctionne par duels anonymisés. Deux modèles reçoivent la même consigne… les internautes désignent celle qu'ils jugent la plus aboutie **sans connaître l'identité des concurrents**. Ces choix alimentent un **score Elo**, emprunté aux échecs」，并说明该榜**现已聚合两条独立赛道：front-end 与 fullstack** ([Blog du Modérateur](https://www.blogdumoderateur.com/ia-meilleurs-modeles-code-developpement-web-septembre-2026/)，2026-09-03)。
- 同文给出的方法学局限（值得引用）：「Le vote porte sur un rendu apprécié après **une seule requête**, pas sur la maintenabilité du code produit ni son comportement dans un projet existant. La colonne « rank spread »… souvent large pour les entrants récents ou les scores encore préliminaires.」([Blog du Modérateur](https://www.blogdumoderateur.com/ia-meilleurs-modeles-code-developpement-web-septembre-2026/)，2026-09-03)。

> **「WebDev Arena 起步于与 WebArena / CMU 的合作」——未核实。** 本次会话中我未能找到任何一手或二手来源支持该说法。相关尝试：`lmarena.ai` 抓取直接失败；`arena.ai` 返回 Cloudflare 403；`aiwiki.ai/wiki/webdev_arena` 返回 429（Vercel 安全校验）。**在无来源的情况下，我不对此说法作任何确认。**

### 2.2 约 2026 年 9 月的排名与分数

**（a）2026-09-02/03 口径**——两个独立来源互相吻合：

BenchmarkList 快照（124 个模型，榜首 1765.4，前二差 77.6）([WebDev Arena Ranking | BenchmarkList](https://benchmarklist.com/arenas/arena_ai_code/)，快照 2026-09-02)：

| 排名 | 模型 | 开发者 | Arena ELO |
|---|---|---|---|
| 1 | claude-fable-5.1-max | Anthropic | 1765.37 |
| 2 | qwen3.8-max-0902 | Alibaba | 1687.74 |
| 3 | claude-opus-5-max | Anthropic | 1687.23 |
| 4 | kimi-k3-max | Moonshot | 1673.82 |
| 5 | qwen3.8-max | Alibaba | 1669.22 |
| 6 | claude-opus-5-high | Anthropic | 1661.23 |
| 7 | grok-4.6-high | SpaceXAI | 1629.06 |
| 8 | claude-fable-5 | Anthropic | 1628.42 |
| 9 | hy4-preview | Tencent | 1625.78 |
| 10 | qwen3.8-flash-next | Alibaba | 1622.28 |

法语媒体给出的同期 top 10 与之几乎逐条一致（数字为其四舍五入值）：Claude Fable 5.1 Max 1765 / Qwen3.8-max-0902 1688 / Claude Opus 5 Max 1687 / Kimi K3 Max 1674 / Qwen3.8 Max 1669 / Claude Opus 5 High 1661 / Grok 4.6 High 1629 / Claude Fable 5 1628 / Hy4-preview 1626 / Qwen3.8 Flash Next 1622；并提到「Claude Fable 5.1 Max 与第二名的差距超过 **75 分**，在这个通常只差几分的榜上很罕见」，以及**在 fullstack 赛道 Claude Fable 5.1 Max 掉出 top 10，由 Qwen3.8 Max 登顶**，DeepSeek 以两个模型进入 fullstack 前十（第 9、第 10）([Blog du Modérateur](https://www.blogdumoderateur.com/ia-meilleurs-modeles-code-developpement-web-septembre-2026/)，2026-09-03)。

**（b）2026-09-05/07 口径**——榜首换人：

「Arena.ai's **September 5, 2026** WebDev board lists **gpt-6-astra-max at 1797** on **1,199 votes**, rank 1. **Claude Fable 5.1-max is 1762** on **2,275 votes**. **Grok 4.6-high is 1625**. **Muse Spark 1.3 (xHigh)** finally has a code-arena slug at **1622**.」([Astra Takes WebDev. helloai's Elo Gate Still Holds](https://helloai.com/articles/gpt-6-astra-takes-webdev-elo-gate-holds)，2026-09-07)。

**（c）2026-09-24 口径**——又换人（**低可信度来源，需谨慎**）：

某中文商业站点称「**1818 分。Claude Opus 5.5 (Max) 把 Code Arena: WebDev 的榜首位置拿走了。第二名 GPT-6 Astra (Max) 停在 1792 分，差 26 分**」，并称上一代 Opus 5 (Max) 为 **1692** 分 ([LumeValley](https://www.lumevalley.com/article-10150.html)，发布时间 2026-09-24)。

> ⚠️ 该站是带营销内容的商业站点，我**无法在官方 arena.ai 上核对这组数字**（Cloudflare 403）。**「Opus 5.5 = 1818、GPT-6 Astra = 1792」标注为「未核实（仅单一低可信度二手来源）」。**

### 2.3 时效性小结

WebDev Arena 榜首在 2026 年 9 月内至少变动两次（9/2：Fable 5.1-max 1765 → 9/5：gpt-6-astra-max 1797 → 9/24 有来源称：Opus 5.5 1818）。**任何单一快照都不可当作「当前值」**；上文已注明各数字的确切观察日期。

---

## 3. PosterReward（arXiv 2603.29855）

### 3.1 论文是否存在：**存在，ID 正确**

arXiv abs 页可直接访问：(https://arxiv.org/abs/2603.29855)
- 标题：**PosterReward: Unlocking Accurate Evaluation for High-Quality Graphic Design Generation**
- **arXiv:2603.29855 (cs.GR)**，提交时间 **Submitted on 23 Feb 2026**（v1: Mon, 23 Feb 2026 14:35:30 UTC）
- 作者：Jianyu Lai, Sixiang Chen, Jialin Gao, Hengyu Shi, Zhongying Liu, Fuxiang Zhai, Junfeng Luo, Xiaoming Wei, Lujia Wang, Lei Zhu
- Comments 栏明确写：**Accepted by CVPR'26** ([arXiv:2603.29855](https://arxiv.org/abs/2603.29855)，2026-02-23)
- CVPR 2026 开放获取页亦存在：Lai_PosterReward_Unlocking_Accurate_Evaluation_for_High-Quality_Graphic_Design_Generation_CVPR_2026_paper（搜索结果指向 [CVF Open Access](https://www.openaccess.thecvf.com/content/CVPR2026/html/Lai_PosterReward_Unlocking_Accurate_Evaluation_for_High-Quality_Graphic_Design_Generation_CVPR_2026_paper.html)，该条为搜索结果描述，本次未逐字抓取该页正文）
- 项目页：`https://alexlai2860.github.io/PosterReward/`（见论文 HTML 正文）
- 单位：**香港科技大学（广州）+ 美团 + 香港科技大学**（论文 HTML 正文 affiliation）

> **结论：该论文真实存在，arXiv ID 2603.29855 正确，且已被 CVPR 2026 接收。任务描述中的「reportedly a CVPR 2026 paper with arXiv ID 2603.29855」经核实成立。**

### 3.2 它是什么：reward model + 数据集 + 两个新 benchmark

**（不是 RL 算法，也不是纯 benchmark 论文，而是「奖励模型 + 偏好数据集 + 评测基准」三合一）**，来源：论文 HTML 正文 ([arXiv:2603.29855v1 HTML](https://arxiv.org/html/2603.29855v1)，2026-02-23)。

**要解决的问题**：现有 reward model（如 HPSv3、UnifiedReward）只关注全局图像美学，忽略**排版（typography）与布局（layout）**；同时缺少设计领域偏好数据——论文指出最大的偏好数据集 HPDv3 中 design 仅占 **9.9%**（角色 29.4%、建筑 18.9%、艺术 18.2%）。

**数据集**：提出 **Poster-Preference-70K**，即 **70k 海报偏好数据**，通过多 MLLM「共识」自动构建（AI 偏好作为人类判断的代理），口号是「the first fully automated preference data collection framework」。
- 数据源：电影海报池 0.8M 张（Seedream 3.0 从 81K 英文 + 58K 中文 prompt 生成，每 prompt 6 张）；非电影海报池由 Qwen-Image-Lightning 从 125k 英文 + 125k 中文 prompt 生成，每 prompt 4 张。
- 用 Kendall's W（Kendall's Coefficient of Concordance）度量多轮排序一致性；电影类选出 W 值最高的 top 20k 英文 + 10k 中文 prompt 组，可形成 450k 候选对 → 经中间模型 6 轮排序、要求至少 5 轮顺序一致，得到 **164k 候选对**。
- 非电影类：先筛同尺寸对 → 214k 候选；再用 CLIP（语义相似）+ DINOv3（结构相似）筛高差异对 → **36k 高方差对**；另用 Seedream 4.0 生成 36k 高质量海报，形成 **108k 新候选对**。
- 最终由 **Gemini-2.5-Pro + GPT-5 + GLM-4.5v** 三模型组成评审团做多模型过滤；因为发现 MLLM 存在明显**位置偏见**（倾向选第一张），每对**交换顺序评两次**。

**五维评价体系**：Foundational Visual Quality / AI Artifacts / Textual Accuracy / Prompt Fidelity / Aesthetic Value，五维耦合、不能简单加权平均。

**模型**（基于 Qwen3-VL-8B）：
- **PosterReward**：两阶段判别式（第一阶段 analysis 模块，第二阶段 scoring 模块用两层 MLP + SiLU 替换末层输出标量）
- **PosterReward-Lite**：省略 analysis 模块以加速
- **PosterReward-Pairwise**：生成式，先输出 Yes/No 判断再输出 CoT（遵循 RewardDance 做法），推理时可由 judgment token 的 logits 反推偏好分

**训练流水线（四阶段级联）**：Joint SFT → Joint Rejection Sampling Fine-Tuning → Scoring Module Training（LoRA rank 64）→ **GRPO 强化学习**（LoRA rank 64，8×A100 训练 + 8×A100 rollout + 4×A100 部署 reward model）。SFT 数据：**246k 单图分析样本 + 160k 配对偏好样本**。

### 3.3 结论与数字

**PosterRewardBench（PRB）**：由 4 位专业标注者复核，仅保留至少 3 人一致的偏好对。分 Basic（Flux / Flux-Krea / SD3.5-L 生成，质量差异大）与 Advanced（Seedream3.0 / Seedream4.0 / Qwen-Image-Lightning 生成，整体质量更高、差异更小）。

点式 reward model 准确率（Table 1，↑）([arXiv:2603.29855v1 HTML](https://arxiv.org/html/2603.29855v1)，2026-02-23)：

| 模型 | MMRB2 | HPDv3 | PRB-Basic | PRB-Advanced |
|---|---|---|---|---|
| ImageReward | 53.0 | 58.6 | 60.7 | 49.3 |
| PickScore | 57.6 | 65.6 | 66.7 | 44.1 |
| HPSv2 | 55.0 | 65.3 | 70.8 | 43.7 |
| UnifiedReward* | 56.9 | 59.4 | 60.0 | 52.7 |
| HPSv3 | 58.5 | 76.9 | 72.9 | 41.2 |
| **PosterReward-Lite** | 60.5 | 77.1 | **83.9** | **85.0** |
| **PosterReward** | 59.6 | 77.8 | **86.7** | **86.0** |

**核心结论**：PosterReward 在 PRB-Basic 达 **86.7%**、PRB-Advanced 达 **86.0%**，显著超过最强基线 HPSv3（72.9% / **41.2%**）——尤其在高品质样本（Advanced）上，HPSv3 只有 41.2%，而 PosterReward 有 86.0%，差距 **44.8 个百分点**。论文同时报告了 **Best-of-8 测试时扩展**与 **Diffusion-NFT 强化学习**两个附录实验（正文第 7、8 节），**本次抓取在 Table 2 处被截断，未能读到这两节的完整数值 → 相关具体数字标注「未核实」**。

---

## 4. 其他设计 / UI 生成基准

以下每一项均经在线核实；能拿到数字的给出数字，拿不到的明确标注。

### 4.1 DesignBench（UI 代码生成基准）
- **是什么**：多框架、多任务的前端代码生成基准，覆盖 **React、Vue、Angular 三大框架 + 原生 HTML/CSS**，评估三类任务：**generation（生成）、edit（编辑）、repair（修复）**。
- **数据集规模**：**900 个网页样本**，跨 **11 个主题、9 种编辑类型、6 类问题**。
- **论文**：arXiv:2506.06251，v1 于 **2025-06-06** 提交，最新 v3 于 **2026-03-15** 修订；代码与数据在 `github.com/WebPAI/DesignBench` ([arXiv:2506.06251](https://arxiv.org/abs/2506.06251)，last revised 2026-03-15)。
- **headline 数字**：摘要给出的是「critical insights into MLLMs' framework-specific limitations, task-related bottlenecks」，**摘要中未给出单一头条准确率数字** → 具体数值标注「未核实」。

### 4.2 Design2Code
- **是什么**：首个真实世界的「设计稿 → 代码」基准。人工筛选 **484 个多样化真实网页**作为测试用例，并设计一套自动评测指标，辅以人工评估。
- **测试模型**：GPT-4o、GPT-4V、Gemini、Claude 等多种多模态提示方法。
- **结论**：「models mostly lag in **recalling visual elements** from the input webpages and generating **correct layout designs**」。
- **论文**：arXiv:2403.03163，v1 于 **2024-03-05**，v3 于 **2025-02-09**；**NAACL 2025** ([arXiv:2403.03163](https://arxiv.org/abs/2403.03163)，last revised 2025-02-09)。
- **headline 数字**：**摘要中未给出单一头条准确率/相似度数字** → 标注「未核实」。

### 4.3 WebSight
- **是什么**：HuggingFace 发布的**合成**「网页截图 ↔ HTML 代码」配对数据集，用于训练 VLM 把设计图转成 HTML。
- **规模（有明确数字）**：
  - v0.1（**2024 年 1 月**发布）：**823,000** 对 HTML 代码与对应截图。
  - v0.2：改用**真实图片**、切换到 **Tailwind CSS**（替代传统 CSS），规模**扩展到 2,000,000 例**。
- **衍生模型**：Sightseer（基于该数据集微调的 VLM）。
- **来源**：[From screenshots to HTML code: Introducing the WebSight dataset | Hugging Face Blog](https://raw.githubusercontent.com/huggingface/blog/main/websight.md)（博文原始 Markdown，页面未显示发布日期；v0.1 时间由正文「In January 2024, we introduced WebSight-v0.1」给出）；技术报告 arXiv:2403.09029（由该博文 Resources 段列出）。

### 4.4 WebArena
- **是什么**：高保真、可复现的**自主 web agent 环境**，包含 4 个真实功能网站域（电商、社交论坛、协作软件开发、内容管理），并配有地图、用户手册等工具与外部知识库。
- **headline 数字（有明确数字）**：最佳 **GPT-4 agent 端到端任务成功率仅 14.41%**，人类为 **78.24%**。
- **论文**：arXiv:2307.13854，v1 **2023-07-25**，v4 **2024-04-16**；项目页 `webarena.dev` ([arXiv:2307.13854](https://arxiv.org/abs/2307.13854)，last revised 2024-04-16)。

### 4.5 VisualWebArena
- **是什么**：把 WebArena 扩展到**视觉接地任务**，要求多模态 agent 处理图文输入、理解自然语言指令并在网站上执行动作。
- **论文**：arXiv:2401.13649，v1 **2024-01-24**，v2 **2024-06-06**；**Accepted to ACL 2024**；项目页 `jykoh.com/vwa` ([arXiv:2401.13649](https://arxiv.org/abs/2401.13649)，v2 2024-06-06)。
- **headline 数字**：**摘要未给出单一成功率数字**。搜索结果的缓存描述中出现「**25.2% (229 tasks) in VisualWebArena are specified with image inputs**」（来自 ar5iv 页面片段）——**这是搜索结果/缓存片段而非我直接读取的摘要正文，标注为「未核实（缓存片段）」**。

### 4.6 UIBert（即任务中所说的 "UI-BERT"）
- **是什么**：基于 transformer 的**图文联合 UI 表征模型**，通过 5 个自对齐（self-alignment）预训练任务在大规模无标注 UI 数据上预训练。
- **headline 数字（有明确数字）**：在 **9 个真实下游 UI 任务**上，UIBert 相对强多模态基线**最多提升 9.26% 准确率**。
- **论文**：arXiv:2107.13731，v1 **2021-07-29**，v2 **2021-08-10**；**IJCAI 2021** ([arXiv:2107.13731](https://arxiv.org/abs/2107.13731)，v2 2021-08-10)。
- 注意：「UI-BERT」是 UIBert 的常见写法，二者指同一工作。

### 4.7 UI-Bench（注意与 UIBert 完全不同）
- **是什么**：评估 **AI text-to-app 工具**视觉表现力的基准，用**专家成对比较（expert pairwise comparison）**。
- **规模（有明确数字）**：**10 个工具 × 30 个 prompt = 300 个生成站点**，**4,000+ 条专家判断**；用 **TrueSkill 派生模型**排名并给出校准置信区间。
- 公开了 prompt 集、开源评测框架与公开排行榜 `uibench.ai/leaderboard`。
- **论文**：arXiv:2508.20410，v1 **2025-08-28**，v3 **2025-09-03** ([arXiv:2508.20410](https://arxiv.org/abs/2508.20410)，v3 2025-09-03)。
- **headline 数字**：**摘要未给出各工具的具体得分** → 标注「未核实」。

### 4.8 ScreenSpot
- **是什么**：**首个真实场景的 GUI grounding 基准**，覆盖移动端、桌面端、web 三种环境；在 SeeClick 论文中提出。
- **论文**：arXiv:2401.10935（SeeClick: Harnessing GUI Grounding for Advanced Visual GUI Agents），v1 **2024-01-17**，v2 **2024-02-23** ([arXiv:2401.10935](https://arxiv.org/abs/2401.10935)，v2 2024-02-23)。
- **headline 数字**：摘要只说「After pre-training, SeeClick demonstrates significant improvement in ScreenSpot over various baselines」，**未给出具体百分比** → 标注「未核实」。

### 4.9 ScreenSpot-Pro
- **是什么**：面向**专业高分辨率**场景的 GUI grounding 基准，含 5 个行业、3 种操作系统、**23 个应用**的真实高分辨率截图与专家标注。
- **headline 数字（有明确数字）**：现有 GUI grounding 模型表现极差，**最佳模型仅 18.9%**；作者提出的 **ScreenSeekeR** 视觉搜索方法在**无需额外训练**下达到 **48.1%** SOTA。
- **论文**：arXiv:2504.07981，v1 **2025-04-04**；榜单见 `gui-agent.github.io/grounding-leaderboard` ([arXiv:2504.07981](https://arxiv.org/abs/2504.07981)，2025-04-04)。另有 ACM Multimedia 2025 版本 ([ACM DL](https://dl.acm.org/doi/10.1145/3746027.3755688)，该条为搜索结果描述，未逐字抓取)。

### 4.10 WebGen-Bench
- **是什么**：衡量 LLM agent **从零生成多文件网站代码库**的能力。指令由人工标注者 + GPT-4o 共同制作，覆盖 3 大类 13 小类 web 应用。
- **规模（有明确数字）**：**647 个测试用例**（由 GPT-4o 生成后人工筛改）；训练集 **WebGen-Instruct 含 6,667 条网站生成指令**。
- **headline 数字（有明确数字）**：最佳组合 **`Bolt.diy` + DeepSeek-R1 仅 27.8%** 准确率；把 Qwen2.5-Coder-32B-Instruct 在该训练集轨迹上训练后达到 **38.2%**，超过最强闭源模型。
- **论文**：arXiv:2505.03733，v1 **2025-05-06**，v2 **2025-08-11**；亦见 NeurIPS 2025 Datasets & Benchmarks Track ([arXiv:2505.03733](https://arxiv.org/abs/2505.03733)，v2 2025-08-11)。

### 4.11 Interaction2Code
- **是什么**：**首个系统性研究 MLLM 生成可交互网页**的工作；形式化「Interaction-to-Code」任务。基准含 **127 个独立网页、374 个不同交互**，覆盖 **15 种网页类型、31 个交互类别**。
- **结论（四点局限）**：(1) 交互生成远弱于整页生成；(2) 易犯十类失败；(3) 视觉上细微的交互表现差；(4) 仅用单一模态视觉描述时对交互理解不足。提出四种增强策略：Interactive Element Highlighting、Failure-aware Prompting (FAP)、Visual Saliency Enhancement、Visual-Textual Descriptions Combination。
- **论文**：arXiv:2411.03292，v1 **2024-11-05**，v3 **2026-03-01**；**发表于 ASE 2025**（DOI 10.1109/ASE63991.2025.00028）([arXiv:2411.03292](https://arxiv.org/abs/2411.03292)，v3 2026-03-01)。

### 4.12 MagicBench
- **是什么**：诊断**多模态 LLM 的视觉能动性丧失（Visual Agency Loss）与语义依赖**的基准，场景是**魔术表演**（旁白刻意与物理现实背离）。
- **规模（有明确数字）**：**402 个视频**；另含 Physical Constraint Set (PCS) 协议评估物理规律遵循度。
- **headline 数字（有明确数字）**：在语义真空中，多模态表现相对纯视觉「capability probe」**崩塌 12.4%（p < 0.01）**；该差距在对称提示下依然存在。结论称 MLLM 更像「language-guided passive observers」。
- **论文**：ACL 2026 长文，Anthology ID `2026.acl-long.1314`，页码 28493–28511，2026 年 7 月，San Diego ([ACL Anthology](https://aclanthology.org/2026.acl-long.1314/)，ACL 2026)。
- ⚠️ **归类提示**：MagicBench **不是**设计/UI 生成基准，而是多模态视频理解基准。任务清单把它列为候选，我如实报告，但它在主题上与本报告其余基准不同类。

### 4.13 「Flame / Flame-UI」
- **未核实。** 本次多轮检索（含中英文查询）**未能找到任何名为 "Flame-UI" 的设计/UI 生成基准**，也未能确认存在一个在此语境下指代前端代码生成的 "Flame" 基准。检索中出现过一篇题为 *Reward Design for UI Polishing* 的论文（arXiv:2511.08195，仅见搜索结果链接，未逐字抓取），但与 "Flame" 无关。
- **结论：无法确认该基准存在。标注「未核实」。**

### 4.14 其他需说明的项
- **「UI-Bench」**：经核实**存在**，即 4.7 节的 arXiv:2508.20410（AI text-to-app 工具设计能力基准）。此前我曾怀疑它只是 UIBert 的误写，事实是**两者都存在且是不同的东西**。
- **「WebArena / VisualWebArena」**：均已核实，见 4.4 / 4.5。

---

## 5. 未核实项清单

以下条目**在本报告中未被在线核实**，请勿作为事实使用：

1. **WebDev Arena 起源于与 WebArena / CMU 的合作** —— 未找到任何来源支持。`lmarena.ai` 抓取失败、`arena.ai` 被 Cloudflare 403 拦截，无法从官方侧核实。
2. **WebDev Arena 与 LMArena（lmarena.ai）的官方从属关系** —— 只能确认第三方站点把数据源指向 `arena.ai/leaderboard/code`、LLM Registry 以「LMArena WebDev ELO」命名收录；**官方页面本身未能读取**。
3. **Design Arena 的 YC 具体批次 S25** —— 仅 Crypto Briefing 一家给出；YC 官方 Launch 页未标注批次。融资额 **$7.9M（TechCrunch）vs $8M（Crypto Briefing）** 亦存在口径差异。
4. **Design Arena 的精确上线日期** —— YC Launch 页仅标「about 1 year ago」（相对时间），未见确切日期。
5. **WebDev Arena 2026-09-24 榜首数据「Claude Opus 5.5 (Max) 1818 / GPT-6 Astra (Max) 1792 / Opus 5 (Max) 1692」** —— 仅一个低可信度商业站点给出，无法在官方榜核对。
6. **PosterReward 的 Best-of-8 测试时扩展与 Diffusion-NFT 强化学习实验的具体数值** —— 论文 HTML 正文在 Table 2 处被截断，这两节（第 7、8 节）的完整数字未读到。
7. **PosterReward 的 CVPR Open Access 页面正文** —— 仅通过搜索结果确认该页存在（标题与文件名吻合），未逐字抓取 PDF 正文。
8. **DesignBench / Design2Code / UI-Bench / ScreenSpot 的 headline 准确率数字** —— 各自摘要中确实未给出单一头条准确率（已逐条说明）；若要具体数值需读正文。
9. **VisualWebArena「25.2%（229 tasks）为图像输入任务」** —— 来自搜索结果的缓存片段，非我直接读取的摘要正文。
10. **「Flame / Flame-UI」基准** —— 多轮检索后**无法确认其存在**。
11. **TechCrunch 报道正文** —— 抓取被截断，只能确认标题（$7.9 million）与 URL 日期（2026/08/03）。
12. **Design Arena 各分类榜单的官网实时数值** —— 官网 `/leaderboard/*` 为 JS 渲染，本次只能读到页脚/导航；报告中的数字全部来自 BenchmarkList 的 **2026-09-02 静态快照**，**非实时值**，且官方 changelog 显示 9/20–9/23 仍有新模型加入，故这些数字到 2026-09-24 很可能已变动。
13. **ScreenSpot-Pro 的 ACM Multimedia 2025 版本信息** —— 仅来自搜索结果描述（ACM DL 链接），未逐字抓取。

---

## 6. 数据来源可靠性分级（供交叉判断）

| 级别 | 来源 | 说明 |
|---|---|---|
| A：一手官方 | designarena.ai/about、/changelog、notes.designarena.ai/methodology/、ycombinator.com/launches、arXiv abs/HTML 页、ACL Anthology | 直接抓取正文，可信度最高 |
| B：独立聚合站 | benchmarklist.com、datalearner.com | 明确标注快照时间与抓取来源；数值为第三方转述，可能与官网实时值有偏差 |
| C：科技媒体 | blogdumoderateur.com（2026-09-03）、helloai.com（2026-09-07）、Crypto Briefing（2026-08-03）、TechCrunch（2026-08-03） | 有署名/日期，数字通常与 B 级吻合 |
| D：低可信度 | lumevalley.com（2026-09-24，商业站点） | 单一来源、无交叉验证，已单独标注 |
| — 不可访问 | lmarena.ai（fetch failed）、arena.ai（Cloudflare 403）、aiwiki.ai（429）、baike.baidu.com（403）、xenospectrum.com（403） | 官方榜单页均未能读取 |
