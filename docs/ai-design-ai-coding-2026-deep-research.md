# AI 设计 × AI Coding 深度调研与工具对比分析报告

**版本**：v1.4
**数据截止**：2026 年 9 月 24 日
**调研方法**：公开一手资料（厂商官方文档/定价页、模型系统卡、基准榜原始数据、开源仓库 README 原文）+ 第三方独立评测 + 行业调研报告的交叉验证；对无法核实的条目显式标注「未核实」。

---

## v1.4 变更说明（相对 v1.3）

v1.4 是**收官轮**：修正一处事实错误，并把一项二手数字升级为官方口径。

| # | 项 | 结果 |
|---|---|---|
| 1 | 🔴 v1.3 把 **Amp** 写作「Sourcegraph / Factory」并列 | **错误。** Amp 已从 Sourcegraph **分拆独立**（Amp, Inc. / Amp Frontier Corporation），已拆为独立行 | [Sourcegraph Blog](https://webflow.sourcegraph.com/blog/why-sourcegraph-and-amp-are-becoming-independent-companies) [ampcode.com/news/amp-inc](https://ampcode.com/news/amp-inc) |
| 2 | v1.1 引用的「Claude agent teams 约 7 倍 token」来自二手来源 | ✅ **升级为官方确认**：Claude Code 官方成本文档原文确认 **约 7× token**，并补充 **agent teams 默认关闭**（需 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`） | [Claude Code 官方成本文档](https://code.claude.com/docs/en/costs) |
| 3 | v1.0 的成本模型只有公式、缺基准值 | ✅ **新增厂商公开成本基准**：**约 $13/开发者/活跃日、$150–250/开发者/月，90% 用户活跃日低于 $30**；并补充缓存 TTL、额度池、降本手段等官方说明 | 同上 |

> **收敛声明**：至 v1.4，本报告在既有检索能力范围内已收敛。剩余未解项仅为 **Firebase Studio 的官方定价与 2026 状态**一项，其边际信息价值不足以支撑继续迭代。**建议以此版本定稿。**

---

## v1.3 变更说明（相对 v1.2）

v1.3 **闭合了 v1.2 中显式标记为"未打穿"的 Jules 空白**，并新增一条针对云服务类产品的活性核查方法。

| # | 项 | 结果 |
|---|---|---|
| 1 | **Jules 的迭代活跃度** | ✅ **由 npm registry 官方 API 独立确认**：CLI `@google/jules` 最新 0.1.42 发布于 **2025-12-16**（逾 9 个月未更新）；官方 SDK/MCP/merge/fleet 四个包最后发布于 **2026-03-09/10**（逾 6 个月未更新） |
| 2 | **Jules 的官方定价** | ✅ **确认 AI Ultra 由 $249.99 降至 $99.99/月**（I/O 2026 官方计划改版，非促销） |
| 3 | **"官方 SDK 级舰队编排"这一差异化能力** | ✅ **确认四个官方包存在**（含 `jules-fleet` 的 analyze→dispatch→merge 流水线） |
| 4 | **新增方法论：云服务"活性三指标"** | 见 §3.7 —— 官方包发版时间戳、changelog 与 FAQ 一致性、发布账号是否为厂商官方 |

> **一条自我校验记录**：关于 Jules 的 AI Ultra 原价，调研过程中先后出现过 `$124.99` 与 `$249.99` 两个互相矛盾的二手数字。经媒体交叉核实，**$249.99 → $99.99 正确，$124.99 错误**。这再次说明：**同一主题的二手数字若前后不一致，必须回到权威源（这里是 npm registry 与多家媒体交叉）定案，不能取其一。**
>
> **仍未打穿的空白（仅剩一项）**：Firebase Studio 的官方定价与 2026 状态。

---

## v1.2 变更说明（相对 v1.1）

v1.2 是**对我自己 v1.1 内容的纠错**。终轮取证直接命中 v1.1 中一处**已发布的合规结论错误**：

| # | v1.1 的表述 | v1.2 修正 | 确认来源（一手） |
|---|---|---|---|
| 1 | 🔴 Kiro「**合规仅 HIPAA，无自有 SOC 2 / ISO 27001**（需走 AWS Artifact）」 | **错误。** Kiro 已纳入 AWS 的 **ISO/IEC 27001:2022** 认证范围（2026-09-08 公告，EY CertifyPoint 认证，荷兰认可委员会认可）；另有 HIPAA eligible、GovCloud、**Pro 及以上 IP 赔偿**、Pro 及以上内容不用于训练基础模型、SSO（Okta / Entra ID / AWS IAM Identity Center） | [Kiro 官方博客 2026-09-08](https://kiro.dev/blog/iso-27001/) [Kiro Enterprise 页](https://kiro.dev/enterprise/) |
| 2 | 「Amazon Q Developer **CLI 事实退场**／已更名 Kiro CLI」 | **只对了一半。** CLI 与控制台确已更名 Kiro（AWS 原文："The Amazon Q Developer CLI has been rebranded to Kiro."），**但 IDE 插件 + Pro 订阅仍作为独立商品在售，EOS 2027-04-30**（12 个月迁移期；2026-05-15 起停止新注册，2026-05-29 起最新编码模型仅在 Kiro 提供） | [AWS 官方 EOS 公告](https://docs.aws.eu/amazonq/latest/qdeveloper-ug/what-is.html) |

**v1.2 同时补充**（不涉及纠错）：

- **GitHub Copilot 桌面 app**（v1.1 遗漏的重要形态）：每 session 独占一个 git worktree + 分支、云/本地双沙箱、每 session 独立选模型、**Agent Merge**、BYOK（含 Ollama）。
- **Agent HQ 的交付现实**：2025-10-28 承诺 5 家厂商（Anthropic/OpenAI/Google/Cognition/xAI），**2026-09 仍只有 Claude + Codex，且仍是 public preview**，Google Jules 缺位。
- **VS Code Agent Host（1.129，2026-07）与 AHP**：面向多 harness（Copilot SDK / Claude Agent SDK）的持久、可移植 agent session 架构。
- **Google CodeMender**：在沙箱内构造并运行 PoC exploit 来**验证**漏洞可利用性的托管式 AI 安全 Agent。
- **GitHub Spark 已弃用（2026-08-04）／GitHub Models 已退役（2026-07-30）**，计入 §3.7 存续期清单。
- **澄清一个常见错误传闻**：**Microsoft 没有收购 Cursor**。据 CNBC（2026-04-22），Microsoft 曾考虑收购但**放弃并退出竞购**，其后走自研路线（MAI-Code-1.1-Flash）。任何"微软收购 Cursor"的表述都是错的。

> **Jules 的空白已闭合（见 §3.7 观察项）**：Jules 于 **2025-08-06 转正**；**AI Ultra 由 $249.99 降至 $99.99/月**；Jules 的**官方 npm 包最后发布于 2026-03-09/10、CLI 最后发布于 2025-12-16**——以上均已独立确认。`jules.google` 在本次调研会话中始终抓取失败，故改用 **npm registry 官方 API**（发布者 `google-wombot` 即 Google 官方账号）作为权威替代源；该产品的 SOC 2 / ISO 27001 状态、文档自相矛盾等断言**仍未能独立验证**，仅作观察项列出，不构成结论。
>
> **仍未打穿的空白（仅剩一项）**：Firebase Studio 的官方定价与 2026 状态。

---

## v1.1 变更说明（相对 v1.0）

v1.1 引入了一轮**专门针对"产品存续状态"的复核**，结果推翻或修正了 v1.0 的若干结论。所有变更项均已用一手来源确认：

| # | v1.0 的表述 | v1.1 修正 | 确认来源（一手） |
|---|---|---|---|
| 1 | 把 **Roo Code** 列为活跃开源工具 | **已于 2026-05-15 关停**，冻结于 v3.54.0；官方 README 明文 "The Roo Code Extension was shut down on May 15th."，团队转向云端产品 Roomote，社区 fork Zoo Code 承接 | [Roo Code 仓库 README](https://raw.githubusercontent.com/RooCodeInc/Roo-Code/main/README.md) |
| 2 | 把 **Continue** 列为活跃开源工具 | **已被 Cursor（SpaceX）收购**（2026-06 前后随 60 亿美元交易一并易主），用户数据导出截至 2026-07-15 后删除 | [DigitalToday](https://www.digitaltoday.co.kr/en/view/73581/cursor-acquires-open-source-coding-assistant-continue) |
| 3 | 把 **Amazon Q Developer CLI** 列为平台型 Agent | **已更名为 Kiro CLI**（AWS 官方迁移文档） | [Kiro 迁移文档](https://kiro.dev/docs/upgrade-guides/migrating-from-q/) |
| 4 | 把 **文心快码（Comate）** 列为独立可选型产品 | **2026-09-07 并入百度搭子 DuMate**，不再作为独立选型对象 | [网易科技](https://www.163.com/dy/article/L686FSP505198CJN.html) [钛媒体](https://m.tmtpost.com/nictation/8131505.html) |
| 5 | 把 **Motiff 妙多** 标为「未核实当期能力」 | **已关停**：2026-04-24 公告、2026-06-23 停服、2026-10-31 数据导出截止。国内"AI 生成可编辑 UI 稿"赛道实际只剩 MasterGo、即时设计、Pixso | [Motiff 官方公告](https://motiff.com/help/others/462390803479041) |
| 6 | 称 Claude Design 额度「独立计量、独立周限额」 | **已改为与 Chat / Claude Code 共用额度池**；实测约 25 分钟可消耗 Pro 周额度的 80% | [Fast Company](https://www.fastcompany.com/91561193/anthropics-updated-claude-design-gives-vibe-coders-and-their-design-oversight-more-control) [PCWorld 转引](https://zhidx.com/p/550570.html) |
| 7 | 未提及模型供给关系的结构性断裂 | **OpenAI 宣布终止向 Cursor 供模型，2026-11-12 生效**（理由是 SpaceX 收购后无法确信其按 OpenAI 条款使用技术） | [Times of India](https://timesofindia.indiatimes.com/technology/tech-news/openai-ends-relationship-with-cursor-following-the-spacex-acquisition-makes-it-clear-elon-musk-is-the-big-reason-says-starting-november-12-/affcmtoi_articleshow/133611738.cms) [中国青年网](https://d.youth.cn/shrgch/202608/t20260830_16841593.htm) |
| 8 | 未量化"产品存续期"风险 | 新增 §3.7：12 个月内已有 10 个产品关停/改名/易主 | 见 §3.7 |

**同时新增**（不涉及纠错，但显著强化了原有论证）：SWE-bench 排序失效的学术证据（arXiv:2609.17394）、并行 subagent 的成本反例、Design Arena 四类目完整快照、设计还原度硬指标、Figma MCP 速率限制、zeroheight 2026 设计系统调研、Copilot AI Credits 精确计费。

> **这轮复核本身就是一个结论**：AI 工具的产品存续期已短于企业典型采购周期（通常 12–24 个月）。v1.0 交付 24 小时内就发现 8 处需要修正，其中 3 处是"我引用的工具已经不存在了"。

---

## 0. 摘要：十二条核心结论

1. **模型层的"编码能力"已经饱和到基准失效的程度，竞争焦点转移到 Harness 与验证环节。** SWE-bench Verified 榜首已达 96–97%（Claude Opus 5），前 20 名的分数挤压在 77%–97% 的区间，OpenAI 已公开说明不再用该基准评估新模型。真正的差异不在"能不能写对"，而在"能不能被信任地交付"。[Steel 榜单](https://leaderboard.steel.dev/leaderboards/swe-bench-verified/)
2. **中国模型在"设计/前端"这一细分赛道上首次实现反超。** 2026 年 6 月智谱 GLM-5.2 在 Design Arena 单轮 HTML 网页设计榜首次登顶，超过 Claude Fable 5、Opus 4.6/4.7，且推理价格仅为对手的 1/7–1/11（$1.40/$4.40 vs $10/$50 每百万 token）。[IT之家/凤凰科技](https://tech.ifeng.com/c/8u6UKRPSNWH) [ComputerBase](https://www.computerbase.de/news/apps/lokales-ki-modell-aus-china-glm-5-2-verdraengt-claude-fable-5-bei-web-design-von-der-spitze.98017/)
3. **但"设计审美"与"工程质量"是两个不同的榜单。** 2026 年 9 月 WebDev Arena 总榜第一仍是 Claude Fable 5.1 Max（Elo 1765），而全栈子榜第一是阿里 Qwen3.8 Max，Fable 5.1 Max 甚至掉出全栈前十——说明"能做出好看的界面"与"能在既有工程里把功能做对"是两种能力。[Blog du Modérateur](https://www.blogdumoderateur.com/ia-meilleurs-modeles-code-developpement-web-septembre-2026/)
4. **"AI 设计"与"AI Coding"正在合流为同一件事。** Claude Design（2026-04-17 发布）可把结果导出到 Canva / HTML / **Claude Code**；Figma 的 Design Agent 与 MCP 让 Agent 直接读写画布；v0/Lovable/Bolt 生成的是真实代码仓库。设计与编码的分界线正在从"工具边界"退化为"角色分工"。[The Register](https://www.theregister.com/2026/04/17/anthropic_debuts_claude_design/) [Figma Blog](https://www.figma.com/blog/the-figma-agent-is-here/)
5. **生产力收益是真实的，但被高估且分布极不均匀。** Techreviewer 2026 年对 127 家软件公司的调研显示，报告"生产力提升超过 50%"的公司比例从 2024 年的 7.5% 跃升到 30.7%，但同时约 90% 的公司至少遭遇过一种负面效应。[Techreviewer](https://techreviewer.co/research/ai-in-software-development-in-2026)
6. **AI 生成代码的第一大成本不是 token，而是评审与验证。** 同一调研中 44.1% 的公司表示"AI 增加了代码评审工作量"，52.8% 遇到过幻觉或错误建议，33.1% 在 AI 生成代码中发现安全/漏洞问题；37.0% 认为出现了"过度依赖/开发者技能退化"。[Techreviewer](https://techreviewer.co/research/ai-in-software-development-in-2026)
7. **"代码变便宜、证明变昂贵"已成为行业共识。** AAIF 汇总的实践数据：A Place for Mom 的 Grace 平台 10 个月产出 3478 个 PR、合并 2822 个（81% 合并率），其首席工程师把剩余风险命名为 **comprehension debt（理解债）**；Datadog 每周约 1 万个 PR 需靠窄域 Agent 评审兜底；Amazon 对 6000+ 失败 Agent 轨迹的审计显示，死循环与超时占了近三分之一失败原因。[AAIF](https://aaif.io/blog/code-is-cheap-proof-is-the-bottleneck)
8. **Agent 的权限越大，供应链风险越致命。** MCP 已于 2025-12-09 捐献 Linux Foundation 旗下的 Agentic AI Foundation（Anthropic/Block/OpenAI 共同发起，Google/Microsoft/AWS/Cloudflare/Bloomberg 支持），一年内 SDK 月下载超 9700 万、活跃 server 超 1 万；但同期 MCP STDIO 命令注入类漏洞被曝可能影响约 20 万台暴露的 server，安全与生态扩张同步放大。[MCP 官方博客](https://modelcontextprotocol.info/blog/joins-agentic-ai-foundation/) [Lyrie 研究](https://lyrie.ai/research/research/2026-05-04-15-deepdive-mcp-stdio-command-injection-200k-servers-mother-of-all-ai-supply-chains)
9. **"vibe coding" 的规模化天花板是安全与治理，不是生成能力。** 对 1645 个 Lovable 生成应用的审计发现 170 个（10.3%）存在严重的 Supabase 行级安全（RLS）配置缺陷；另有研究称最高 45% 的 AI 生成代码含安全漏洞。这也是"在 Lovable 做原型、在 Cursor/Claude Code 加固"成为主流工作流的原因。[AgentMarketCap](https://agentmarketcap.ai/blog/2026/04/06/vibe-coding-agentic-lovable-bolt-vercel-v0-500m-funding)
10. **对企业的现实建议：不要选"最好的工具"，要选"可治理的组合"。** 平均每家公司同时在用约 4 款 AI 工具（Claude/Claude Code 93.7%、ChatGPT/OpenAI 77.2%、Gemini 58.3%、Copilot 57.5%、Cursor 52.0%），多工具并存已成常态，治理复杂度而非工具能力才是当前主要矛盾。[Techreviewer](https://techreviewer.co/research/ai-in-software-development-in-2026)
11. **产品存续期已短于采购周期——这是 v1.1 最重要的发现。** 12 个月内：Roo Code 关停、Continue 被 Cursor 收购、Motiff 关停、GitHub Spark 弃用、Windsurf 品牌消失、Gemini CLI 并入 Antigravity、Amazon Q Developer CLI 更名 Kiro（IDE 插件 EOS 2027-04-30）、通义灵码更名 Qoder CN、文心快码并入 DuMate。**"一次选型管两年"不再成立，必须按季度复核。** 详见 §3.7。
12. **并行 Agent 的收益被系统性高估。** Codex 官方 DevEx 负责人称超过 2 个 sub-agent "几乎纯粹是烧钱"；有团队实测 1,393 个 subagent 花费约 19,300 美元；Claude agent teams 约 7 倍 token。**并行度应作为成本参数调优，而非能力指标炫耀。** 详见 §3.2。

---

## 1. 研究范围与数据可信度声明

### 1.1 本报告覆盖什么

| 维度 | 覆盖内容 |
|---|---|
| **AI Coding** | 模型层（编码/Agent 能力）、Harness 层（CLI / AI IDE / 平台型 / 云端自主 / 开源自托管）、协议与标准（MCP、AGENTS.md、Agent Skills）、评测基准、定价、国产替代 |
| **AI Design** | 视觉素材生成、界面/设计稿生成、可运行原型生成、设计系统级生成、设计→代码链路 |
| **交集** | Design-to-Code、Figma MCP、Claude Design→Claude Code、Design Token 与组件映射 |
| **组织侧** | 真实生产力证据、质量与可维护性、安全与合规、成本结构、落地方法论与选型框架 |

**不覆盖**：3D/游戏资产管线、视频生成、工业设计、AI 辅助硬件设计。

### 1.2 数据可信度分级

本报告对每类数据的可信度做如下标注，请读者按此权重采信：

| 级别 | 含义 | 示例 |
|---|---|---|
| **A 级** | 厂商官方文档/定价页/系统卡、排行榜原始数据 | Cursor 定价页、Claude Code 文档、SWE-bench 榜单 |
| **B 级** | 第三方独立评测、权威媒体、可复核的行业调研 | WebDev Arena、Techreviewer 调研、ComputerBase |
| **C 级** | 单一来源爆料、厂商转述、未获对侧确认的事件 | 本报告 7.3 节中的部分安全事件 |
| **未核实** | 未取得 2026-09 一手数据 | 部分国内设计工具、部分图像模型的当期状态 |

**重要提醒**：AI 工具领域价格与功能的中位失效周期约为 2–3 个月。本报告所有定价均标注了采集时间，采购决策前必须回到官方页面复核。

---

## 2. 技术演进主线：从"补全"到"长时程自主"

### 2.1 四个阶段（2021 → 2026）

| 阶段 | 时间 | 交互形态 | 代表 | 人的角色 |
|---|---|---|---|---|
| **L1 补全** | 2021–2022 | 行内 ghost text | Copilot 初代、Tabnine | 写作者 |
| **L2 对话** | 2023–2024 | Chat + 内联编辑 | ChatGPT、Copilot Chat、Cursor Chat | 提问者 |
| **L3 单 Agent** | 2024–2025 | 任务级自主执行（读文件、跑命令、改多文件） | Cursor Composer、Claude Code、Codex、Devin | 派活 + 审查 |
| **L4 多 Agent / 长时程** | 2025Q4–2026 | 并行 Agent 团队、云端后台任务、跨会话协作、动态工作流 | Claude Code Agent Teams、Cursor Cloud Agents、GitHub Agent HQ、Devin Desktop ACP | 编排 + 验证 |

**判断依据**：Claude Code 官方文档的 "Agents and parallel work" 章节已把 **subagents、agent view、agent teams、cross-session messaging、dynamic workflows、worktrees** 列为一等公民能力，并独立提供 `hooks / channels / scheduled tasks / goals / headless` 等自动化原语——这意味着"一个人指挥一支 Agent 团队"从技巧变成了产品形态。[Claude Code Docs](https://code.claude.com/docs/en/agent-teams) [Worktrees](https://code.claude.com/docs/en/worktrees)

### 2.2 2026 年的五个关键工程范式

**范式一：Harness 决定天花板，模型只决定地板。**
同一模型在裸 API、第三方平台、原生 Harness 中的表现可以差一个量级。Cursor 的 Composer 2.5、Anthropic 的 Claude Code、阿里 Qoder 都把这层工程体系当作核心竞争力。国产厂商对此的表述尤为直白：**"模型决定地板，Harness 决定天花板"**。[36氪/第一新声](https://eu.36kr.com/zh/p/3888237831551749)

**范式二：上下文工程（Context Engineering）取代提示工程。**
支撑这个论断的是可量化的工程细节：GLM-5.2 在 Design Arena 胜出的分析指出，它在 **91% 的会话中使用 TailwindCSS**、51% 使用 Font Awesome、更可靠地调用 Chart.js/Three.js，这些"工具与约定的选择"直接转化为胜率提升（第三方库相关会话胜率 +6.0pp，交互设计 +1.2pp）。相比之下 Claude Fable 5 仅 57% 使用 TailwindCSS。[IT之家](https://tech.ifeng.com/c/8u6UKRPSNWH)

**范式三：技能与协议的标准化。**
MCP 解决"Agent 如何接工具"，AGENTS.md 解决"Agent 如何理解仓库约定"，Agent Skills（SKILL.md）解决"Agent 如何复用领域流程"。三者都已成为 Agentic AI Foundation 的创始项目。[MCP 官方博客](https://modelcontextprotocol.info/blog/joins-agentic-ai-foundation/)

**2026 年的协议层进展（v1.1 补充）：**

| 协议/规范 | 状态 | 采纳度 |
|---|---|---|
| **MCP** | 2025-12-09 捐献 AAIF（Linux Foundation） | 捐赠时 **9,700 万月 SDK 下载、10,000+ 活跃 server** |
| **A2A** | **2026-08 加入 AAIF**，v1.0 于 2026-03 发布 | **150+ 组织**；华为 Celia、腾讯微信已落地 |
| **AGENTS.md** | AAIF 创始项目（Amp 首创，2025-08-20 定名） | **超过 6 万个开源项目**采用；Claude Code 已增加回退支持 |
| **Agent Skills** | 被收编为 **MCP 官方扩展（SEP-2640 已 Final）** | ⚠️ **规范先行、实现滞后**——官方矩阵显示主流客户端基本尚未实现 |
| **AHP（Agent Host 架构）** | VS Code **1.129（2026-07）引入 Agent Host**，2026-08-26 发布架构说明 | 面向**多 harness** 设计：同时支持 Copilot SDK 与 Claude Agent SDK；目标是持久、可移植的 agent session |

来源：[VS Code Blog — Introducing the Agent Host](https://code.visualstudio.com/blogs/2026/08/26/agent-host-architecture) [VS Code Docs — agent-host](https://raw.githubusercontent.com/microsoft/vscode-docs/main/docs/agents/concepts/agent-host.md)

来源：[MCP 官方博客](https://modelcontextprotocol.info/blog/joins-agentic-ai-foundation/) [agents.md](https://agents.md/) [Amp — AGENTS.md](https://ampcode.com/news/AGENTS.md)

> **实务含义**：AGENTS.md 已经成为事实标准，**现在投入编写仓库约定文件的回报是确定的**；而 Agent Skills 虽然规范已定，但跨客户端可用性仍需逐个验证，不要基于宣传材料做架构决策。

**范式四：隔离与并行成为基础设施。**
git worktree 从"高级技巧"变成官方推荐的多会话隔离方案；云端沙箱让 Agent 可以"过夜工作"；GitHub Agent HQ 支持在同一个 PR 流程里调度第三方 Agent（Claude、Codex）。[GitHub Blog](https://github.blog/news-insights/company-news/pick-your-agent-use-claude-and-codex-on-agent-hq/)

**范式五：验证成为一等工程对象。**
Endor Labs 把当前风险命名为 **generation-verification asymmetry（生成-验证不对称）**：一个 Agent 引入依赖，第二个基于它构建，第三个部署它，而人类还没理解系统中多了什么。[AAIF](https://aaif.io/blog/code-is-cheap-proof-is-the-bottleneck)

### 2.3 资本与产业结构：2026 年发生的三件大事

| 事件 | 时间 | 影响 |
|---|---|---|
| **Anthropic 发布 Claude Design** | 2026-04-17 | 发布当日 Figma 股价下跌约 7%；对话式设计与"设计→代码"闭环被打通 [The Register](https://www.theregister.com/2026/04/17/anthropic_debuts_claude_design/) |
| **Windsurf 更名 Devin Desktop** | 2026-06-02 | Cognition 通过 OTA 把 Windsurf 重塑为多 Agent 编排桌面端，默认首屏变成 Agent Kanban [AICoderScope](https://aicoderscope.com/blog/ai-coding-agents-7-way-comparison-june-2026/) |
| **SpaceX 完成对 Cursor 的 600 亿美元收购** | 2026-08-14 | 2026 年最大科技并购之一；xAI（现归入 SpaceXAI）与 Cursor 合并，随后推出 Grok 4.5（7 月）、Grok Bot、Grok 4.6 [Bloomberg](https://www.bloomberg.com/news/articles/2026-08-14/spacex-completes-its-60-billion-cursor-acquisition) [VietnamPlus](https://www.vietnamplus.vn/spacex-thau-tom-cursor-voi-60-ty-usd-thuong-vu-lon-nhat-lich-su-nganh-cong-nghe-post1130336.vnp) |

---

## 3. AI Coding 深度调研

### 3.1 模型层格局（2026 年 9 月）

#### 3.1.1 SWE-bench Verified：饱和与污染并存

| 排名 | 模型 | 得分 | 厂商 | 时间 |
|---|---|---|---|---|
| 1 | Claude Opus 5（Vals.ai 独立复现） | **97.00%** ±0.76 | Anthropic | 2026-09 |
| 2 | Claude Opus 5（系统卡五轮平均） | 96.0% | Anthropic | 2026-07 |
| 3 | Claude Mythos 5 | 95.5% | Anthropic | 2026-06 |
| 4 | Claude Fable 5 | 95.0% | Anthropic | 2026-06 |
| 5 | Claude Opus 4.8 | 88.6% | Anthropic | 2026-05 |
| 6 | Claude Opus 4.7 | 87.6% | Anthropic | 2026-04 |
| 7 | GPT-5.6 Sol | 82.2% | OpenAI | 2026-07 |
| 8 | Claude Opus 4.5 | 80.9% | Anthropic | 2025-11 |
| 9 | **DeepSeek-V4-Pro-Max** | 80.6% | DeepSeek | 2026-04 |
| 10 | Gemini 3.1 Pro | 80.6% | Google DeepMind | 2026-02 |
| 11 | **Kimi K2.6** | 80.2% | Moonshot | 2026-04 |
| 12 | **MiniMax M2.5**（开放权重最高） | 80.2% | MiniMax | 2026-02 |
| 13 | GPT-5.2 | 80.0% | OpenAI | 2025-12 |
| 14 | **GLM-5.2** | 80.0% | 智谱 | 2026-07 |
| 15 | Claude Sonnet 4.6 | 79.6% | Anthropic | 2026-02 |
| 16 | **Qwen3.6 Plus** | 78.8% | 阿里 | 2026-04 |
| 17 | **Inkling**（开放权重） | 77.6% | Thinking Machines | 2026-07 |

数据来源：[Steel.dev SWE-bench Verified 榜单](https://leaderboard.steel.dev/leaderboards/swe-bench-verified/)（最后更新 2026-09-04）

**怎么读这张表：**

- **不要用它做采购决策。** 该榜自身在方法学说明中明确警告：基准已高度成熟并被大规模暴露在公开训练数据中，接近饱和后的高分段应带污染与测试设计折扣解读。
- **该榜已出现"榜首断层"**：第 1–4 名（95%–97%）与第 5 名（88.6%）之间存在明显台阶，且全部来自同一家厂商，说明"谁在做 Agent 后训练"比"谁的基础模型更强"更决定结果。
- **开放权重与闭源的差距已缩小到 15 个百分点以内**（DeepSeek-V4-Pro-Max 80.6% vs Claude Opus 5 96%），但在高价值企业场景中这个差距仍然显著。
- **斯坦福 AI Index 2026** 在报告发布时点的观察是：顶尖模型高度集中在 **70%–76%** 区间（[中文版 PDF](https://hai.stanford.edu/assets/files/hai-ai-index-2026-chinese-version-082226.pdf)）——半年内该集群的上沿已被推高约 20 个百分点。
- **排序能力已被学术证明失效（v1.1 新增，最强证据）**：arXiv:2609.17394《Coding Agents Have Converged: Why the SWE-bench Leaderboard Can No Longer Order Its Top Entries》（ADMA 2026 接收，2026-09-15）审计 **254 份** SWE-bench 提交后给出：
  - Verified 榜首两名**各解出 500 题中的 396 题**；
  - 前十名共享 **285 个成功**与 **51 个失败**，仅剩 **164 个 instance** 能区分它们；
  - **29 组相邻的 top-30 配对，在 α=0.05 下用 McNemar 检验没有一组能被区分开**；
  - **模型-scaffold 交互带来的 within-model 区间可达 29.8 个百分点，而 top-30 的总分差只有 8.8 点**。
  
  **结论：换 Harness 的影响大于换模型带来的名次差。** 该论文的观察性设计不能识别因果性 scaffold 效应，但足以证明"用 SWE-bench 排名选模型"在统计上不成立。[arXiv:2609.17394](https://arxiv.org/abs/2609.17394)

#### 3.1.2 WebDev Arena（2026 年 9 月）：前端与全栈的能力分叉

| 排名 | 模型 | Elo |
|---|---|---|
| 1 | **Claude Fable 5.1 Max**（2026-09-01 发布） | 1765 |
| 2 | Qwen3.8-max-0902（阿里） | 1688 |
| 3 | Claude Opus 5 Max | 1687 |
| 4 | Kimi K3 Max（月之暗面） | 1674 |
| 5 | Qwen3.8 Max | 1669 |
| 6 | Claude Opus 5 High | 1661 |
| 7 | Grok 4.6 High（SpaceXAI） | 1629 |
| 8 | Claude Fable 5 | 1628 |
| 9 | Hy4-preview（腾讯） | 1626 |
| 10 | Qwen3.8 Flash Next | 1622 |

数据来源：[Blog du Modérateur 汇总 Arena 数据](https://www.blogdumoderateur.com/ia-meilleurs-modeles-code-developpement-web-septembre-2026/)

**三个关键观察：**

1. **前十名中中国模型占一半**（Qwen 三席、Kimi 一席、腾讯一席），这是中国模型在前端/Web 设计赛道最具说服力的一次集体进入。
2. **前端与全栈的能力排序不同**：全栈子榜第一是 **Qwen3.8 Max**，Claude Fable 5.1 Max 掉出前十，DeepSeek 两款模型进入第九、第十。原因不难理解——全栈要求长链路的状态管理、数据层与错误处理，而单轮前端生成更依赖视觉先验与库使用熟练度。
3. **方法学局限必须记住**：WebDev Arena 是"单次请求匿名对战 + 人类投票"，评的是**一次渲染的观感**，不是代码可维护性，也不是它在既有工程里的行为。榜单适合用来生成候选清单，不适合单独拍板。

#### 3.1.3 成本维度的重构：2026 年 9 月的价格战

OpenAI 在 GPT-6 Astra 之后 3 周内推出 GPT-6 Sol 与 Luna，把 API 价格砍半：

| 模型 | 输入（$/M token） | 输出（$/M token） | 备注 |
|---|---|---|---|
| GPT-5.6 Sol | 4 → **2** | 20 → **10** | 相对上一代价格减半 |
| GPT-6 Luna | 0.20 → **0.10** | 1.20 → **0.50** | 面向 Free/Go 用户开放桌面端 |
| Composer 2（Cursor） | 0.50 | 2.50 | 快速版 $1.50/$7.50 |
| GLM-5.2（智谱） | 1.40 | 4.40 | MIT 许可、1M 上下文 |
| Claude Fable 5 | 10 | 50 | 同期对比基准 |

数据来源：[ComputerBase](https://www.computerbase.de/news/apps/halb-so-viele-fehler-openai-schickt-gpt-6-sol-und-luna-ins-rennen.99515/) [Cursor Blog](https://cursor.com/en-US/blog/composer-2) [ComputerBase/GLM](https://www.computerbase.de/news/apps/lokales-ki-modell-aus-china-glm-5-2-verdraengt-claude-fable-5-bei-web-design-von-der-spitze.98017/)

**三条被低估的成本杠杆：**

1. **Prompt Caching 的折扣幅度在放大。** GPT-6 对复用的输入 token 给出 **90% 折扣**，且更积极地触发缓存。对常驻 Agent 与长上下文工程来说，这比单价下调更影响总成本。
2. **"每任务成本"正在取代"每 token 价格"成为采购口径。** GPT-6 Sol 在 DeepSWE 上达到 68.8%（最大推理）——仅落后 Claude Fable 5 最强配置 1.1 个百分点，而**单任务成本低约 80%**。
3. **缓存读价成为竞争焦点。** Claude Fable 5.1（2026-09-01）的主要变化之一就是下调缓存读取价格，并放宽了安全护栏（[Blog du Modérateur](https://www.blogdumoderateur.com/ia-meilleurs-modeles-code-developpement-web-septembre-2026/)）。

#### 3.1.4 DeepSWE 与"评测噪音"问题

OpenAI 已明确表示不再用 SWE-bench Verified 评估新模型，转而采用更能分离信号与噪音的评测（[OpenAI: Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/)）。与此同时，**DeepSWE、Terminal-Bench（已迭代到 4.0）、CursorBench、SWE-bench Pro、SWE-bench Multilingual** 等新基准共同构成了 2026 年的评测矩阵。

一个具有代表性的对比（Cursor Composer 2）：

| 模型 | CursorBench | Terminal-Bench 2.0 | SWE-bench Multilingual |
|---|---|---|---|
| Composer 2 | 61.3 | 61.7 | 73.7 |
| Composer 1.5 | 44.2 | 47.9 | 65.9 |
| Composer 1 | 38.0 | 40.0 | 56.9 |

来源：[Cursor Blog: Introducing Composer 2](https://cursor.com/en-US/blog/composer-2)

**结论**：厂商自建基准（CursorBench）与通用基准（Terminal-Bench）上的相对排序一致性较高，但绝对分数不可跨基准比较。**任何单一基准的分数都不构成采购依据。**

### 3.2 Harness 层：五类形态与代表产品

| 形态 | 交互主场 | 交给谁用 | 代表 | 核心权衡 |
|---|---|---|---|---|
| **终端 / CLI Agent** | 本地终端 | 资深工程师、平台团队 | Claude Code、OpenAI Codex CLI、Antigravity CLI（原 Gemini CLI，2026-05-19 合并迁移）、OpenCode、Aider | 可观测性最强、可脚本化，但无内联补全 |
| **AI IDE** | 编辑器 | 日常写码的所有工程师 | Cursor、Devin Desktop（原 Windsurf）、Kiro、Zed、Trae、Qoder | 体验最顺滑，但受编辑器形态约束、订阅制成本刚性 |
| **平台原生 Agent** | GitHub / 云厂商控制面 | 已有强 GitHub 工作流的团队 | GitHub Copilot（含桌面 app + Agent HQ）、**Kiro**（AWS，原 Amazon Q Developer CLI / 控制台已更名；IDE 插件 EOS 2027-04-30） | 与 PR/CI 集成最深，跨平台自由度低 |
| **云端自主 Agent** | 浏览器/云沙箱 | 需要异步、长时间任务 | OpenAI Codex 云任务、Devin、Google Jules、Cursor Cloud Agents | 可"过夜工作"，但代码出境、air-gap 场景不可用 |
| **开源 / 可自托管** | 自选 | 安全敏感、需私有化 | OpenCode、Cline、Kilo Code（Anaconda）、Zoo Code、OpenHands | 透明可控，但需自建 Harness 与运维能力。⚠️ 该赛道 12 个月内已发生 Roo Code 关停、Continue 被收购、Aider 停摆等事件，**选型前必须核验仓库最近提交时间**（见 §3.7） |

### 3.3 国际工具对比大表（数据采集：2026-09）

| 工具 | 厂商 | 形态 | 模型 | 并行/后台能力 | 个人定价 | 企业/合规 | 最适合 | 主要短板 |
|---|---|---|---|---|---|---|---|---|
| **Claude Code** | Anthropic | CLI/终端 | Claude 系列（Opus 5 / Fable 5.x / Sonnet） | ★★★★★ Subagents、Agent Teams、worktrees、跨会话消息、动态工作流、定时任务、Goals、headless | Pro $20 / Max 5x $100 | 组织级 admin setup、MCP、Skills、Plugins、Hooks、Artifacts、合规文档 | 本地可观测的深度 Agent 工程、大规模重构、自动化流水线 | 无内联补全；Pro 档速率上限对无人值守 Agent 偏紧 |
| **OpenAI Codex** | OpenAI | CLI + 云沙箱 | GPT-6 Sol/Luna、GPT-5.x-Codex | ★★★★ 云任务队列（Plus 约 10–60 任务/5 小时窗口） | 含于 ChatGPT Plus $20 / Pro 5x $100 | 企业版 Codex（ChatGPT Enterprise/Business） | 异步、可丢后台的编码任务；已有 ChatGPT 订阅者零边际成本 | 云执行、air-gap 与数据出境受限场景不可用 |
| **GitHub Copilot**（IDE 插件 + **桌面 app** + Agent HQ） | GitHub/Microsoft | IDE 插件 + **桌面应用** + GitHub 平台 | 多家（GPT-5.x mini、Claude Haiku/其他）；**Agent HQ 目前仅支持 Claude 与 Codex** | ★★★★ **桌面 app：每 session 独占一个 git worktree + 分支**、云/本地双沙箱、每 session 独立选模型、**Agent Merge**（盯 CI 与 reviewer，可委派"过 CI""处理 review""条件满足即合并"）、BYOK（含 Ollama） | Pro $10 / Pro+ $39 / Max $100（个人）；Business $19 / Enterprise $39（每用户每月）；AI Credits 1 credit = $0.01 | 企业控制最完整：SSO/SCIM、审计、策略、代码审查 | GitHub 原生团队、PR 自动化、企业统一治理、需要桌面端并行 Agent | 计费复杂（AI Credits + Actions 分钟双重消耗），历史上曾引发账单争议；⚠️ **Agent HQ 交付远小于承诺**：2025-10-28 承诺 5 家（Anthropic/OpenAI/Google/Cognition/xAI），**2026-09 仍只有 Claude + Codex 且仍是 public preview，Google Jules 缺位** |
| **Cursor** | Anysphere（SpaceX 旗下） | AI IDE | 自研 Composer 2/2.5 + 前沿模型 + Grok 系列 | ★★★★ Cloud Agents、Background Agents、Projects 协调器（可派发上千 subagent）、关机不停、自托管机器 | Hobby 免费 / Individual **$20** / Teams **$40 每人每月** / Enterprise 定制 | SOC 2、ISO 27001、ISO 42001、AIUC-1；SCIM、审计日志、仓库/模型/MCP 访问控制、网络与自动运行管控 | IDE 内日常编码、多文件重构、Tab 补全体验 | 🔴 **OpenAI 模型 2026-11-12 起断供**；模型供给日益依赖 Grok 系；个人档 $60 与 $200 之间存在价格断层；额度悬崖 |
| **Devin Desktop**（原 Windsurf） | Cognition | AI IDE + 云 Agent | SWE-1.x + Claude 系列 | ★★★★★ Agent Command Center（Kanban 编排本地+云 Agent） | Pro $20 + Devin 用量 $40 | Teams 席位 + 用量 | 多 Agent 并行编排、需要"看板式"管理的团队 | 默认首屏改为 Kanban 引发体验摩擦；ACP 迁移期粗糙 |
| **Kiro（含原 Q Developer CLI）** | AWS | AI IDE + CLI + Web + Crew + Mobile | Claude 系列 + 专用模型路由（Auto agent）；Free 档含 Sonnet 4.5 | ★★★ Spec 驱动 + Hooks + cloud sessions + property-based testing（按 spec 验证生成代码）；subagent 上限 3h / 单轮 4h / 1000 次工具调用 | Free $0（50 credits）/ Pro $20（1,000）/ Pro+ $40（2,000）/ Pro Max $100（5,000）/ Power $200（10,000）；加购 $0.04/credit | **ISO/IEC 27001:2022**（2026-09-08 纳入 AWS 认证范围，EY CertifyPoint 认证）、HIPAA eligible、GovCloud、SSO（Okta / Entra ID / AWS IAM Identity Center）、模型/MCP/扩展集中注册表 + 细粒度权限、**Pro 及以上 IP 赔偿**、Pro 及以上内容不用于训练基础模型 | 规格驱动开发（先写需求与验收标准再生成） | 积分消耗不可预测（单个大 spec 可耗 200–300 credits）；**原 Amazon Q Developer IDE 插件仍在售但 EOS 2027-04-30**，不可视为长期方案 |
| **Antigravity 2.0** | Google | 桌面应用 + CLI + SDK | Gemini 系列 | ★★★★ 多 Agent、后台任务、**浏览器子 Agent** | Pro $20 / AI Ultra $100 | Google Cloud 生态 | 需要浏览器自动化 + 自建 Agent 管线的团队 | 内联补全弱于 Cursor；**Gemini CLI 已于 2026-05-19 并入 Antigravity CLI，免费额度于 2026-06-18 结束**，迁移有成本 |
| **OpenCode** | 开源（MIT） | CLI | 75+ 提供商，含本地 Ollama | ★★★ | 免费（自付模型费） | 完全自控、可离线 | 安全敏感、需代码审计与数据不出境 | 需自建工程能力；无厂商支持 |
| **Cline / Kilo Code / Zoo Code** | 开源（Kilo Code 已被 **Anaconda** 收购） | VS Code / JetBrains 扩展 + CLI + Cloud | 任意（含本地模型、Ollama/LM Studio）；Kilo Gateway 500+ 模型 | ★★★ Kilo Code 支持并行 agent + 并发 worktree + 容器化 Cloud Agents | Free $0（BYO-key）；Kilo Code Teams $15/用户/月、Kilo Pass 从 $19/月、云算力按秒 $0.33–$1.20/h | Kilo Code：SSO/OIDC/SCIM、审计日志、EU 数据驻留、SOC 2 Type I | 本地模型、隐私优先的个人与小组；Roo Code 用户迁移 | 企业治理成熟度低于 Copilot/Cursor；**训练用途 opt-out 默认关闭**；生态碎片化 |
| ~~Roo Code~~ / ~~Continue~~ / ~~Aider~~ ⚠️ | Roo Code Inc. / Continue / Aider | — | — | — | — | — | **均不建议新采用** | **Roo Code 2026-05-15 关停**；**Continue 被 Cursor 收购、数据 2026-07-15 后删除**；据报 Aider 自 2026-05 起停摆（未二次核实） |
| **Amp**（**已独立于 Sourcegraph**） | **Amp, Inc. / Amp Frontier Corporation**（2026 年从 Sourcegraph 分拆独立） | Agent 平台 | 多家 | ★★★★ | 按量 | 企业级 | 大型代码库的批量迁移与自动化 | 生态与文档相对小众（未核实当期定价细节）；⚠️ 本报告未核实其 IDE 扩展与免费档的当期状态 |
| **Factory Droid** | Factory | Agent 平台 | 多家 | ★★★★ | 按量 | 企业级 | 自动化流水线、Droid Computers 云沙箱 | 生态相对小众 |

**说明**：并行/后台能力用五星制做相对标注，依据是官方文档中并行会话、后台任务、隔离机制（worktree/沙箱）与编排原语的完备程度，非绝对性能排序。

#### ⚠️ 并行 Agent 的成本反例（v1.1 新增，重要制衡）

"多 Agent 并行"是 2026 年最被过度营销的能力。以下反例必须与上面的能力表一起读：

| 反例 | 内容 |
|---|---|
| **Codex 团队自述** | OpenAI Codex 官方 DevEx 负责人表示，超过 **2 个 sub-agent 时"几乎纯粹是烧钱"** |
| **实测数据** | 有团队实测 **1,393 个 subagent 花费约 19,300 美元** |
| **Token 放大** | ✅ **官方文档确认**：Claude Code 的 agent teams 在 teammate 以 plan mode 运行时，消耗约 **7 倍 token**（每个 teammate 维护独立上下文窗口并作为独立实例运行）；且 **agent teams 默认关闭**，需设 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 才启用 |
| **平台硬限制** | GitHub cloud agent 存在 **59 分钟硬上限**，且**单分支、单 PR** |

来源：[Mixed News 汇总（Codex 开发者观点与 Nous 实测）](https://mixed-news.com/en/codex-developer-parallel-agents-limit-nous-1393-agents/)

**实务结论**：并行 Agent 的收益来自**任务可独立切分**且**验证成本低**的场景（如批量迁移、多模块独立重构、并行跑测试矩阵）。对于需要强一致性判断的任务，并行的边际收益会迅速转负，且会把"理解债"放大数倍。**建议把并行度当作成本参数来调优，而不是当作能力指标来炫耀。**

### 3.4 国产工具对比大表（数据采集：2026-08～09）

| 工具 | 厂商 | 形态 | 核心模型 | 设计稿转代码 | 个人定价 | 企业定价 | 合规 |
|---|---|---|---|---|---|---|---|
| **CodeBuddy** | 腾讯云 | 插件 + IDE + CLI 三端 | 混元 + DeepSeek + 多模型切换 | ✅ 内置 Figma | 体验版免费；标准 ¥99、高级 ¥199、旗舰 ¥999/月 | SaaS ¥198/人/月；专有云 ¥316/人/月 | 等保三级、ISO 42001 |
| **Qoder CN** | 阿里云 | 全家桶（IDE+插件+CLI+QoderWork+QoderWake） | Qwen-Coder + GLM + Kimi | ❌ 不支持 | 社区版免费；专业 ¥59、高级 ¥169/月 | 标准 ¥99/席位·月；VPC ¥199/席位·月 | 等保三级、ISO 42001、代码不出境 |
| **文心快码 / DuMate** ⚠️ | 百度智能云 | 原为插件 + AI IDE + Zulu 智能体 | 文心 5.0 + DeepSeek V4 / Kimi K2.6 / MiniMax M3 / GLM 5.2 | ✅ Figma2Code（点选元素指令式修改） | **2026-09-07 并入百度搭子 DuMate**，独立定价页已不可用；历史报价（专业 ¥59、旗舰 ¥199/月）**可能已过时** | 历史报价：专业 ¥150/人/月、旗舰 ¥358/人/月、专属版 ¥2500/人/年（**未核实**） | 等保三级、ISO 42001、数据不出境 | 品牌与产品线归属变更中，**当前不再是稳定的独立选型对象，需重新向百度确认产品线** |
| **TRAE Code** | 字节跳动 | IDE + 插件 + SOLO Agent + TraeWork | GLM-5.2、Seed-2.1-Turbo、Seed-Code | ✅ 需配置 MCP + Figma AI Bridge | 免费基础版；Pro ¥99、Pro+ ¥239、Ultra ¥699/月 | 团队版 ¥149/席/月；旗舰版 ¥259/席/月 | 代码不上云、模型不训练用户数据 |
| **Doubao-Seed-Code** | 字节跳动 | 模型（Agentic Coding 专用） | Seed-Code | — | **¥1.20/百万输入 token**；原生兼容 Anthropic API | — | — |
| **iFlow CLI** | 阿里（心流） | CLI | Qwen3-Coder、DeepSeek-V3.1 等 | — | 个人永久免费 | — | — |
| **Kimi Code** | 月之暗面 | CLI/插件 | Kimi K2.x/K3 | — | 未核实当期定价 | — | — |
| **CodeGeeX** | 智谱 | 插件 | GLM 系列 | — | 有免费档 | 支持私有化 | 可私有化 |

来源：[腾讯云开发者社区横向评测](https://cloud.tencent.cn/developer/article/2726398) [36氪/第一新声](https://eu.36kr.com/zh/p/3888237831551749) [CSDN 2026 国产 AI 编程工具决策指南](https://www.csdn.net/article/2026-09-15/165479362)

**国产替代的三条路径（源自业内共识）：**

1. **企业级"全家桶"路线**——模型与 Harness 同源（如 Qoder + Qwen），换取工程深度、数据合规、审计与权限管控。适合已深度绑定单一云生态的组织。
2. **开源"自由派"路线**——OpenCode（MIT，GitHub 星标 17 万+，支持 75+ 模型提供商，含本地 Ollama），换取完全可审计与离线能力。适合安全团队与强监管行业。
3. **极致性价比路线**——Doubao-Seed-Code（¥1.20/百万输入 token、原生兼容 Anthropic API，可无痛迁移）、iFlow CLI（个人免费）。适合独立开发者与小型团队。

### 3.5 ⚠️ 中国市场特有风险：Claude Code "后门"事件

> **可信度：C 级（单一来源的官方通报转述，未见对侧确认）。本节按原文转述并标注来源，供合规评估参考，不构成事实认定。**

据中国媒体报道，**工业和信息化部网络安全威胁和漏洞信息共享平台（NVDB）** 于 2026 年 7 月发布风险提示，指 AI 编程工具 Claude Code 存在安全后门隐患、危害严重。报道描述的机制为：

- 自 2026-04-02 发布的 **2.1.91 版本**起内置检测逻辑，受影响版本为 **2.1.91–2.1.196**；
- 仅在用户配置**第三方 API 代理**时激活，检查系统时区是否为 `Asia/Shanghai` / `Asia/Urumqi`，并将代理域名与一份硬编码的**147 个中国科技公司及 AI 实验室域名清单**比对；
- 命中结果通过**隐写术**回传——修改系统提示词中日期的标点与格式（连字符换斜杠、视觉近似的 Unicode 字符替换撇号），不产生额外网络请求，因此数月未被发现。

同期被提及的其他安全事件包括：源代码因构建配置失误泄露、CVE-2025-59536 远程代码执行漏洞（评分 8.7）、网络沙箱在五个月内未真正安全（SOCKS5 协议空字节注入可绕过）。

**企业侧的连锁反应**：阿里巴巴据报于 2026-07-03 内部通知、07-10 起全面禁止员工在办公环境使用 Claude 系列产品，推荐自研 Qoder 作为替代。

来源：[36氪 / 第一新声](https://eu.36kr.com/zh/p/3888237831551749)

**给中国区企业的实务建议：**
1. 立即盘点涉及 Claude Code 的 CI/CD、脚本、Makefile 与本地插件调用，确认版本区间。
2. 对任何具备"读仓库 + 跑命令 + 读密钥"权限的 Agent，按**最小权限 + 网络出口白名单 + 审计留痕**三项硬性要求整改，与供应商国别无关。
3. 涉及数据出境的场景，优先采用境内部署或开源自托管方案。

### 3.6 定价结构对比与成本模型

#### 3.6.1 个人档：$20 已成为事实标准

| 工具 | 入门付费档 | 中档 | 高档 |
|---|---|---|---|
| Cursor | Pro $20 | Pro+ $60 | Ultra $200 |
| Claude Code | Pro $20（据 2026-06 报道约 45 prompts/5 小时窗口） | Max 5x $100 | Max 20x 更高 |
| GitHub Copilot | Pro $10 | Pro+ $39 | Max $100 |
| OpenAI Codex | 含于 ChatGPT Plus $20 | Pro 5x $100 | — |
| Kiro | Pro $20 | Pro+ $40 | Power $200 |
| Devin Desktop | Pro $20 | + Devin 用量 $40 | Max $200 |
| Antigravity | Pro $20 | — | AI Ultra $100 |

**Copilot 的计费换底（v1.1 新增）**：GitHub Copilot 已于 **2026-06-01 起废弃 premium requests**，改为 **AI Credits** 计量，**1 credit = $0.01**。席位分档为 Pro $10 / Pro+ $39 / Max $100 / **Business $19 / Enterprise $39**（每用户每月）。**关键风险**：Copilot 的 code review 等工作流会同时消耗 AI Credits 与 GitHub Actions 分钟，历史上曾造成数千个团队的账单意外。[GitHub Docs — Copilot 模型与计费](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing) [GitHub Blog](https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/)

#### 3.6.2 团队档的真实成本：席位制 vs 用量制

| 工具 | 标准席 | 溢价席 | 计费单位 |
|---|---|---|---|
| **Cursor Teams** | $40/席/月（月付）；$32/席/月（年付） | Premium $96/席/月（年付） | 席位 + 用量 |
| **Cursor Individual** | Pro $20 / Pro+ $60 / Ultra $200 | — | 订阅内含额度 + 按量 |
| **GitHub Copilot** | Pro $10 / Pro+ $39 / Max $100（个人）；Business 按席位 | — | 席位 + AI credits（+ 可能触发 Actions 分钟） |
| **Claude Code** | Pro $20（含额度） | Max 5x $100 / Max 20x 更高 | 席位内含额度，独立于 Claude Design 额度 |
| **Kiro** | Pro $20（1,000 credits/月） | Pro+ $40 / Power $200 | credits，超出按 $0.04/credit |

> 注：Cursor 2026-06 曾调整 Teams 定价为 Standard $32 / Premium $96（年付口径）；现行官方页面显示 Teams 为 $40/人/月，两者为**月付与年付口径差异**，非前后矛盾。

#### 3.6.3 用于预算规划的经验公式

```
月度总成本 ≈ 席位数 × 席位单价
           + Σ(各模型输入 token × 输入单价 × (1 − 缓存命中率 × 缓存折扣))
           + Σ(各模型输出 token × 输出单价)
           + 评审与返工的人力成本   ← 通常被严重低估
```

**三个反直觉但被数据支持的事实：**

**（0）先看 Anthropic 自己给出的企业成本基准（v1.4 新增，官方一手）：**

> *"Across enterprise deployments, the average cost is around **$13 per developer per active day and $150-250 per developer per month**, with costs remaining **below $30 per active day for 90% of users**."*
> —— [Claude Code 官方成本文档](https://code.claude.com/docs/en/costs)

这是目前**唯一由厂商公开给出的、可直接用于预算建模的编码 Agent 成本基准**。它的三个用法：

1. **做预算的起点**：$150–250/开发者/月 可直接进入 ROI 模型，无需从 token 单价反推；
2. **识别异常用户**：90% 的用户活跃日成本低于 $30，**超出这个水平的用户值得单独分析**（通常是长会话未清理或默认使用高成本模型）；
3. **官方也建议先小范围试点建立基线**，再全量推广——与本报告 §7.3 的 30 天方案一致。

**同一文档还给出了几项对成本影响极大的官方说明：**

| 项 | 官方说明 |
|---|---|
| **Prompt Cache 生命周期** | 订阅制下为 **1 小时**；一旦开始消耗 usage credits 则**降为 5 分钟**；API key / 云厂商默认 **5 分钟** |
| **会话成本累积** | 长会话即使只问一句话，也会因携带完整历史而产生成本（缓存读价）；**`/clear` 不花钱，`/compact` 本身是一次大请求** |
| **后台开销** | 会话摘要、命令处理等后台功能通常 **低于 $0.04/会话** |
| **额度池** | Team/Enterprise 的每席位额度**与 Claude chat、Cowork 共享**，按滚动 5 小时 + 每周窗口重置 |
| **subagent 降本** | 把跑测试、取文档、处理日志等"高噪音操作"委派给 subagent，只回传摘要 |
| **上下文工程降本** | 官方建议 `CLAUDE.md` **控制在 200 行以内**，把专门流程移入按需加载的 Skills；优先用 CLI 工具（`gh`/`aws`/`gcloud`）而非 MCP server，因为前者不产生逐工具列表开销 |

1. **缓存命中率是最大的成本杠杆。** 在 90% 缓存折扣下，把命中率从 30% 提到 70% 往往比换一个便宜 30% 的模型更有效。
2. **"无人值守 Agent"必须按高档订阅规划。** 据报道 Claude Code Pro 档约 45 prompts/5 小时窗口是按交互式使用校准的（2026-06 数据，需以官方最新限额为准），无人值守的长任务会在中途触限并留下部分修改的仓库。[AICoderScope](https://aicoderscope.com/blog/ai-coding-agents-7-way-comparison-june-2026/)
3. **评审成本可能超过订阅成本。** 44.1% 的受访公司表示 AI 增加了代码评审工作量；在已有高评审标准的团队中，token 成本通常是总拥有成本中的小项。

### 3.7 ⚠️ 产品存续期风险：12 个月内的关停、改名与易主清单（v1.1 新增）

这是本轮复核中**最具决策价值、也最被行业分析忽略**的发现：AI 编程/设计工具的产品存续期，已经短于企业典型的采购与替换周期（12–24 个月）。

| 产品 | 状态 | 时间 | 确认来源 |
|---|---|---|---|
| **Roo Code** | **关停并归档**（冻结 v3.54.0），团队转向 Roomote，社区 fork Zoo Code 承接 | 2026-05-15 | [仓库 README 原文](https://raw.githubusercontent.com/RooCodeInc/Roo-Code/main/README.md)：*"The Roo Code Extension was shut down on May 15th."* |
| **Continue** | **被 Cursor（SpaceX）收购**，用户数据导出至 2026-07-15 后删除 | 2026-06 | [DigitalToday](https://www.digitaltoday.co.kr/en/view/73581/cursor-acquires-open-source-coding-assistant-continue) |
| **Motiff 妙多** | **关停**：2026-04-24 公告 → 2026-06-23 停服 → 2026-10-31 数据导出截止 | 2026-06-23 | [官方公告](https://motiff.com/help/others/462390803479041) |
| **Windsurf** | **品牌消失**，OTA 更名为 Devin Desktop（Cognition） | 2026-06-02 | [Devin 官方博客](https://devin.ai/blog/windsurf-is-now-devin-desktop/) |
| **Amazon Q Developer** | **部分更名**：CLI 与控制台已更名为 Kiro（AWS 原文："The Amazon Q Developer CLI has been rebranded to Kiro."）；**但 IDE 插件 + Pro 订阅仍作为独立商品在售，EOS 2027-04-30**（12 个月迁移期；2026-05-15 起停止新注册，2026-05-29 起最新编码模型仅在 Kiro 提供） | 2026-05 起 | [AWS 官方 EOS 公告](https://docs.aws.eu/amazonq/latest/qdeveloper-ug/what-is.html) [Kiro 迁移文档](https://kiro.dev/docs/upgrade-guides/migrating-from-q/) |
| **GitHub Spark** | **已弃用** | 2026-08-04 | [GitHub Changelog](https://github.blog/changelog/) |
| **GitHub Models** | **已退役** | 2026-07-30 | 同上 |
| **Gemini CLI** | **并入 Antigravity CLI**，免费额度结束 | 2026-05-19 / 06-18 | [The Register](https://assets.theregister.com/2026/05/20/202615/) |
| **通义灵码** | **更名为 Qoder CN** | 2026-05-20 | [阿里云帮助中心](https://www.alibabacloud.com/help/zh/lingma/billing-description) |
| **文心快码（Comate）** | **并入百度搭子 DuMate** | 2026-09-07 | [网易科技](https://www.163.com/dy/article/L686FSP505198CJN.html) |
| **iFlyCode**（科大讯飞） | 据报域名失效、API 不可达（**未二次核实**） | 2026 | — |
| **CodeGeeX**（智谱） | 据报插件长期未更新、已移出官网产品线（**未二次核实**） | 2026 | — |
| **Aider** | 据报自 2026-05 起无新提交（**未二次核实**） | 2026-05 | — |

**由此产生的采购规则（v1.1 建议）**：

1. **把"存续期条款"写进采购要求**：要求供应商提供数据导出承诺、源可用性说明，以及（对开源工具）明确的维护者与商业支持实体。
2. **季度复核，而非年度复核**：本清单中位数存续期不足 12 个月，年度复核会失效。
3. **对开源工具做"仓库活性三查"**：最近 commit 时间、release 节奏、是否有公司实体背书（Roo Code 关停后，Apache-2.0 许可仍允许你继续用，但**不再有 bug 修复与安全补丁**）。
4. **优先选"有商业模式且有付费企业客户"的工具**：Vibe Kanban 母公司 bloop 以"找不到商业模式"为由关停，是这类风险的典型样本。
5. **多模型冗余从"优化项"升级为"风险控制项"**：OpenAI 断供 Cursor（2026-11-12 生效）证明**模型供给关系可以因并购而在一夜之间改变**。

#### 观察项：Google Jules —— "官方停更、用户仍在增长"的已验证案例（v1.2 补充）

`jules.google` 在本次调研会话中始终抓取失败，因此本报告改用 **npm registry 官方 API** 作为权威替代源（发布者 `google-wombot` 即 Google 官方 npm 账号）。下表严格区分「已独立确认」与「未能独立验证」：

| 断言 | 状态 | 依据 |
|---|---|---|
| Jules 于 **2025-08-06 转正**（out of beta；免费档每日 15 个任务） | ✅ **已独立确认** | [Google 官方博客](https://blog.google/innovation-and-ai/models-and-research/google-labs/jules-now-available/) [Gigazine](https://gigazine.net/gsc_news/en/20250807-ai-coding-agent-jules-public) |
| Google 于 I/O 2026 **把 AI Ultra 从 $249.99 降至 $99.99/月**（属官方计划改版，非未说明的促销） | ✅ **已独立确认** | [tech.liga.net](https://tech.liga.net/ai/news/google-obnovila-ii-podpiski-ai-ultra-teper-stoit-100-v-mesyats) [Orange Tech](https://tech.orange.fr/innovation/sciences/google-ai-casse-en-deux-le-prix-de-son-abonnement-et-offre-youtube-premium-CNT000002prbVI.html) [ZDNet Japan](https://japan.zdnet.com/article/35247708/) |
| **CLI `@google/jules` 最新版本 0.1.42 发布于 2025-12-16，至数据截止已 9 个多月未发新版** | ✅ **已独立确认** | [npm registry](https://registry.npmjs.org/-/v1/search?text=scope:google%20jules&size=20) |
| **官方 npm 包自 2026-03-09/10 后再无新版本**：`jules-sdk` 0.2.0 与 `jules-mcp` 0.2.0（2026-03-09）、`jules-merge` 0.1.0 与 `jules-fleet` 0.0.1-experimental.35（2026-03-10） | ✅ **已独立确认** | 同上 |
| **存在官方 SDK 级舰队编排层**：`jules-sdk`（`jules.all()` 带并发控制）、`jules-fleet`（analyze→dispatch→merge）、`jules-merge`（官方描述 *"Reconcile overlapping PR changes from parallel AI agents"*）、`jules-mcp` | ✅ **已独立确认存在** | 同上 |
| **用户侧采用并未停止**：`jules-sdk` 月下载约 **40,088**，`jules-fleet` 约 **17,519**，`jules-merge` 约 **17,262**，`jules-mcp` 约 **12,645** | ✅ **已独立确认** | 同上 |
| 其他四家（Copilot / Devin / Codex / Amp）**未以独立包形式提供同层编排能力** | ⚠️ 本报告未独立验证 | 调研底稿 |
| FAQ 仍写 "currently in Public Beta" 与 changelog 的 GA 说法冲突；usage-limits 页模型信息滞后；**无模型选择器** | ⚠️ **未独立验证** | 调研底稿 |
| 每任务一台**全新短生命周期 Ubuntu VM**；**不支持 `npm run dev` 类常驻进程**；**官方未提及本地 worktree 概念**（以云会话/VM 隔离替代）；**无官方 VS Code / JetBrains 扩展**；API 仍为 **v1alpha**（最多 3 个 key） | ⚠️ **未独立验证** | 调研底稿 |
| 内建 **Critic Agent**（对抗式评审）+ **Planning Critic**（官方称任务失败率降 9.5%）、**CI Fixer**、**Repoless 会话**、issue 打 `jules` label 触发、支持 **AGENTS.md**、**明确不用私有仓库内容训练** | ⚠️ **未独立验证** | 调研底稿 |
| **SOC 2 / ISO 27001 未获官方确认**；VPC / SSO / 数据驻留 / IP 赔偿**无一手证据** | ⚠️ **未独立验证** | 调研底稿 |
| 唯一可引用的第三方质量对照：**2025-10-01 PR Arena —— Jules 78.5% 合并率（35,400 PR）vs Codex Cloud 84.2%（190 万 PR）** | ⚠️ **未独立验证**（量级差约 54 倍，若成立可说明采用规模差距） | 调研底稿 |
| "Jules 2.0" 无官方条目 → **该产品线不存在**，"2.0" 为第三方媒体叫法 | ⚠️ **未独立验证** | 调研底稿 |

**这个案例的方法论价值（把它列进存续期章节的原因）**：

npm 数据揭示了一个**单看 changelog 看不到的形态——官方停止发版，但用户仍在增长**。CLI 9 个月未更新、官方包 6 个月未更新，而 SDK 月下载仍达 4 万次。这比"产品关停"更难判断：它既没有死，也没有在被持续改进。

**由此对 §3.7 采购规则的补充**：

> **云服务类产品没有 Git 提交可查。判断其"活性"应当改用三个替代指标：**
> 1. **官方 npm / PyPI / VS Code Marketplace 的发版时间戳**（最客观，且可程序化核查）；
> 2. **官方 changelog 与 FAQ 的一致性**（自相矛盾是维护动力下降的早期信号）；
> 3. **发布主体是否为厂商官方账号**（本例中 `google-wombot` 可确认官方属性，第三方同名包则不可）。

---

## 4. AI Design 深度调研

### 4.1 价值分层：四层能力而非一个品类

市场上"AI 设计工具"被混为一谈，但它们解决的问题完全不同。企业选型的第一步是识别自己需要哪一层：

| 层级 | 交付物 | 是否可编辑 | 是否可进生产 | 代表工具 |
|---|---|---|---|---|
| **L1 视觉素材** | 位图/插画/海报/信息图 | 有限（局部重绘、图层分离） | 作为素材可以 | GPT Image 2、Nano Banana Pro/2、Seedream 5.0 Pro、Recraft、Ideogram、Grok Imagine |
| **L2 界面设计稿** | 可编辑设计稿（矢量/图层） | 是 | 需转译 | Figma（First Draft / Agent）、Claude Design、MasterGo、即时设计、Pixso |

> ⚠️ **国内 L2 赛道已收缩**：Motiff 妙多**已于 2026-06-23 停服**（2026-04-24 公告，数据导出截至 2026-10-31），国内"AI 生成可编辑 UI 稿"实际只剩 MasterGo、即时设计、Pixso 三家。[Motiff 官方公告](https://motiff.com/help/others/462390803479041)
| **L3 可运行界面/应用** | 可部署的代码仓库 | 是（代码） | 通常需加固 | v0、Lovable、Bolt、Replit、Figma Make |
| **L4 设计系统级** | Design Token、组件库、规范文档 | 是 | 可以直接 | Figma MCP + 设计系统接入、Claude Design 自定义设计系统 |

**关键判断**：L1 与 L2 解决"想法可视化"，L3 与 L4 才开始触及"进入生产"。绝大多数关于 AI 设计的失望，来源于用 L1/L2 的期望去评估 L3/L4 的任务（或反之）。

### 4.2 生成式 UI 与原型工具对比（2026 年 8–9 月）

| 工具 | 厂商 | 核心能力 | 输出形态 | 计费结构 | 适合场景 | 主要短板 |
|---|---|---|---|---|---|---|
| **Claude Design** | Anthropic | 对话式生成视觉资产、原型、线框、演示、营销物料；支持自定义设计系统（接入 GitHub 仓库、本地代码文件、上传的 Figma 文件、字体/Logo 资源、文本规范）；2026 年中更新后与编码 Agent 协同更好 | 导出 .zip/.pdf/.pptx，或导出到 **Canva / HTML / Claude Code**（**官方导出目的地名单中没有 Figma**，回 Figma 需第三方插件） | **与 Chat / Claude Code 共用额度池**（早期"独立周限额"的说法已过时）；含在 Pro $20 / Max $100 / Max 20x $200 内，无独立订阅 | 设计探索、产品线框与 mockup、Pitch Deck、营销物料；已有 Claude 订阅的团队零接入成本 | 2026-04-17 以 research preview 发布；**额度是硬伤**（第三方实测约 25 分钟消耗 Pro 周额度 80%，误删后 5 分钟耗尽剩余）；**无审计日志** |
| **Figma（Make + Design Agent + First Draft）** | Figma | 画布向 Agent 开放；Make 支持 prompt-to-app、**plan mode**（先出结构化计划再生成）；Make Kits 与附件上下文 | 可运行原型 + 代码；Figma Sites（beta）可直接发布响应式站点 | **AI credits 制**，按席位分配：Starter 500/月（另每日上限 150）、Professional 3,000/月、Organization 3,500/月、Enterprise 4,250/月；可增购或按量 | 已在 Figma 生态内的团队；设计系统驱动的一致性要求 | credit 消耗不可预测（改字体约 30+、加交互约 75+、从零生成应用约 100+）；agentic 功能复杂度直接决定成本 |
| **v0** | Vercel | 生成 React/Tailwind 组件、页面、Next.js 应用；沙箱运行时；Git 面板直接建分支与 PR；数据库集成 | 可进仓库的代码 | 免费（$5 credits/月、7 条消息/日）；Plus **$30/人/月**；Business **$100/人/月**；Enterprise 定制 | 已有 Vercel/Next.js 技术栈的前端团队；设计→代码的组件级交付 | 席位制定价，10 人即 $1,000/月起；非前端场景不擅长 |
| **Lovable** | Lovable（瑞典） | 非工程师把"能跑的应用"做到上线：内置 DB、认证、存储、函数 | 完整全栈 Web 应用（GitHub/GitLab 双向同步） | 免费（5 credits/日、30/月）；Pro **$25**（100 credits/月）；Business **$50**（含 SSO）；**不按席位计费，成员无限** | 业务部门内制、公民开发、内部工具 | 复杂业务逻辑与性能优化会触顶；RLS 配置缺陷风险（见 7.3） |
| **Bolt** | StackBlitz | 浏览器内开发环境，代码主导 | 全栈应用（可选数据库提供商，数据库数量不限） | 免费（30 万 token/日、100 万/月）；Pro **$25**（1,000 万 token/月起）；Teams **$30/人月** | 工程师主导的快速原型；需要自选数据库架构 | token 计费难以预估；席位制定价随人数线性增长 |
| **Replit** | Replit | 端到端云端开发环境 + Agent | 可运行应用 | 未核实当期定价 | 教学、快速验证、非本地环境 | 未核实当期企业能力 |

**100 人规模的基本费结构差（不含实际消耗）**——这是本报告中最具决策价值的一组数字：

| 人数 | Lovable Business | Bolt Teams | v0 Business |
|---|---|---|---|
| 5 | **$50** | $150 | $500 |
| 20 | **$50** | $600 | $2,000 |
| 50 | **$50** | $1,500 | $5,000 |
| 100 | **$50** | $3,000 | $10,000 |

来源：[株式会社100 基于三家公司官方 Pricing 的对比（2026-08-31 数据）](https://hubspot.100inc.co.jp/lovable-vs-bolt-vs-v0)

**必须同时阅读的免责说明**（原文作者已强调，本报告认同）：
- Lovable 席位免费但 **credits 是共享池**，100 人使用会推高 credits 需求（例如 Business 2,000 credits 档约 $960/月）；
- Bolt 与 v0 同样会因人数增加产生额外消耗；
- 因此正确的口径是"**基本费 + 实际消耗**"，上表只反映**固定费的结构差**。

**结构性结论**：Lovable 只按"用了多少"增长；Bolt 与 v0 同时按"多少人 × 用了多少"增长。**当企业希望把 AI 设计/构建能力广泛分发给非工程角色时，这个差异是决定性的；反之，如果是少数工程师集中使用，席位制并无劣势。**

### 4.3 视觉生成模型对比：Design Arena 图形成像榜（2026-09-02）

| 排名 | 模型 | 厂商 | Elo | 与第一差距 |
|---|---|---|---|---|
| 1 | **GPT Image 2** | OpenAI | 1451 | 领先 |
| 2 | Reve 2.1 | Reve | 1389 | −62 |
| 3 | Reve 2.0 | Reve | 1369 | −82 |
| 4 | Grok Imagine Image 2 | xAI | 1325 | −126 |
| 5 | GPT-Image-1.5 | OpenAI | 1312 | −139 |
| 6 | Muse Image | Meta | 1300 | −151 |
| 7 | **Seedream 5.0 Pro** | 字节跳动 | 1293 | −158 |
| 8 | Qwen Image 3 Pro | 阿里 | 1287 | −164 |
| 9 | Gemini 3.1 Flash Image Gen 2K（Nano Banana 2） | Google | 1278 | −173 |
| 10 | Ideogram 4.0 | Ideogram | 1272 | −179 |
| 11 | Gemini 3 Pro Image 2K（Nano Banana Pro） | Google | 1268 | −183 |
| 18 | Recraft V4.1 Utility Pro | Recraft | 1217 | −234 |
| 36 | Seedream 4.0 | 字节跳动 | 1166 | −285 |

数据来源：[Design Arena Graphic Design 榜单（经 BenchmarkList 于 2026-09-02 抓取，共 73 个模型）](https://benchmarklist.com/arenas/design_arena_graphic_design/)

**解读要点：**
- **GPT Image 2 在设计审美榜上领先幅度显著（+62 Elo）**，其与 GPT-Image-1.5 的代际间隔也最大，是 2026 年视觉侧最明确的领先。
- **中国模型已进入第一梯队但不居首**：Seedream 5.0 Pro 第 7、Qwen Image 3 Pro 第 8。
- **"设计能力"与"工程化能力"在产品设计上出现分工**：Seedream 5.0 Pro 的官方能力清单明显偏向**生产可用性**而不仅是好看——复杂信息图（单图内同时容纳时间线、柱状图、折线图、饼图）、交互式精确编辑（点选/套索/草图渲染/颜色材质替换/**图层分离**/多图融合）、超过 10 种语言的本地化文本渲染。[字节 Seed 官方博客](https://seed.bytedance.com/en/blog/beyond-generation-it-understands-design-introducing-seedream-5-0-pro)
- **图层分离是最被低估的能力**：能把海报拆成 10+ 个带透明度的独立图层，意味着输出可以进入真实的设计工作流（可拖动、可替换主体），而不是一张"死图"。这实际上是 L1→L2 的桥。

#### Design Arena 四类目完整快照（2026-09-02，v1.1 新增）

| 类目 | 榜首模型 | Elo |
|---|---|---|
| **Website（单轮 HTML 网页设计）** | **Kimi K3**（月之暗面） | 1362 |
| **UI Component（UI 组件）** | **Claude Fable 5.1** | 1381 |
| **Image to HTML（图转 HTML）** | **Kimi K3** | 1259 |
| **Graphic Design（图形成像）** | **GPT Image 2** | 1451 |

来源：[BenchmarkList 抓取的 Design Arena 快照](https://benchmarklist.com/arenas/design_arena_website/)（抓取时间 2026-09-02）

> ⚠️ **榜单必须带日期引用**：Design Arena 官方榜页为客户端渲染且对抓取返回 403，所有公开引用实际都是第三方带时间戳的快照。官方在 2026-09-20 至 09-23 仍在持续加模型，**09-24 的名次已与 09-02 快照不同**。
>
> 更极端的例子是 **WebDev Arena 在 9 月内换了榜首**：09-02 为 claude-fable-5.1-max（1765.37），09-05 变为 **gpt-6-astra-max（1797）**。**任何"某模型第一"的说法，若不附日期，都是无效信息。**

### 4.4 设计稿→代码链路：Figma MCP 是当前事实标准

**技术机制**：Figma 提供 MCP server，Claude Code、Cursor、VS Code + Copilot、Windsurf 等作为 client 连接。Remote MCP 在所有 Figma 套餐可用；桌面版 server 需要付费套餐的 Dev 或 Full 席位。

**三个已可日常使用的标准工作流**：

1. **提取 Design Token**：在 Dev Mode 启用 MCP server → 选中 frame → 复制链接 → 交给 Claude Code，要求列出所有颜色与间距 token → 返回来自真实文件的结构化 JSON。
2. **生成组件代码**：选中卡片或按钮图层 → 粘贴链接到 Cursor → 要求写出 React 组件 → Cursor 通过 MCP 查询 Figma，返回反映真实间距与色值的代码。
3. **生成样式指南**：选中设计系统页面 → 要求以 Markdown 记录 → 输出组件到视觉规则的映射，可直接入库。

**决定输出质量的不是模型，而是 Figma 文件本身的组织度**：未命名的图层产出低质结果，命名规范的组件才能产出可用输出。**Live UI capture（实时 UI 捕获）仅 remote server 支持**，Claude Code、Codex、VS Code 已支持。

来源：[Figma MCP 教程（Abduzeedo, 2026-03-10）](https://abduzeedo.com/figma-mcp-tutorial-how-ai-tools-automate-your-design-workflow)

#### Figma MCP 的两个硬约束（v1.1 新增）

**（1）速率限制是现实约束，不是技术细节：**

| 席位类型 | MCP 调用额度 |
|---|---|
| View / Collab 席位 | **6 次/月** |
| Starter 计划 | 20 次/月 |
| Dev / Full 席位（Professional） | **200 次/日**（10 次/分） |
| Dev / Full 席位（Organization） | 200 次/日（15 次/分） |
| Dev / Full 席位（Enterprise） | **600 次/日**（20 次/分） |

来源：[Figma MCP 速率限制与访问文档](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)

> **这意味着把设计→代码做成日常流程，必须购买 Dev/Full 席位**；用 View/Collab 席位（6 次/月）做 Agent 工作流在数学上不可行。这是采购前最容易漏算的一项。

**（2）训练数据条款按套餐方向相反：**

| 套餐 | AI 训练数据默认状态 |
|---|---|
| Starter / Professional | **默认开启**（用于训练） |
| Organization / Enterprise | **默认关闭** |

来源：[Builder.io 对比页](https://www.builder.io/compare/builder-vs-figma-make)

> 对设计资产敏感的企业，**必须核实自己所在套餐的默认值并显式确认**，不要假设"付费即不训练"。

#### 设计→代码的还原度：硬数字（v1.1 新增）

"看起来像"已经基本解决，但"结构对"远未解决。可用以下量化指标判断成熟度：

| 指标 | 数值 | 含义 | 来源 |
|---|---|---|---|
| **Design2Code：GPT-4o Block-Match** | **93.0**，49% 生成页可直接互换 | 视觉布局还原已成熟 | [arXiv:2403.03163](https://arxiv.org/abs/2403.03163) |
| **DesignCoder vs Prototype2Code** | MSE **+37.63%**、CLIP **+9.52%**、SSIM **+12.82%** | 专用方法优于通用方法 | [arXiv:2506.13663](https://arxiv.org/abs/2506.13663) |
| **DesignCoder TreeBLEU** | **0.69**（GPT-4o 基线 **0.24**） | 结构还原仍处于低水平 | 同上 |
| **Waffle HTML-Match** | **37%** | 生成代码与原页 HTML 结构匹配度低 | [arXiv:2410.18362](https://arxiv.org/abs/2410.18362) |
| **WebGen-Bench 最强组合** | **27.8%** | 多页项目级生成成功率低 | [arXiv:2505.03733](https://arxiv.org/abs/2505.03733) |
| **重复模式偏置率** | **69.78%–80.22%** | 模型强烈倾向于复用训练中的布局模式，导致同质化 | [arXiv:2608.03691](https://arxiv.org/abs/2608.03691) |
| **文字扰动下的准确率** | **7.89%** | 内容改变后模型仍照搬视觉模式，是"看起来对、其实错"的根因 | 同上 |

> **一个被明确指出的评测空白**：目前所有 image-to-code 基准都**不测**"生成结果在 Figma 里是否可编辑、是否绑定变量、是否复用组件"——而这恰恰是"设计稿→代码"链路最核心的工程指标。**任何声称高还原度的工具，都应该要求它用你自己的设计系统做一次现场验证。**

**Figma 画布向 Agent 开放**是 2026 年的结构性变化——Agent 不再只能"读"设计稿，而是可以在画布上生成与修改。[Figma Blog: Agents, Meet the Figma Canvas](https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/) [The Figma Design Agent is Here](https://www.figma.com/blog/the-figma-agent-is-here/)

**Design-to-Code 的三条工程路线**：

| 路线 | 机制 | 还原度 | 适用 | 风险 |
|---|---|---|---|---|
| **Token 同步** | 设计 token（颜色/间距/字体/圆角）通过 MCP 或 CI 同步到代码变量 | 中高（样式一致） | 已有设计系统的成熟团队 | 组件结构仍需人工映射 |
| **组件映射** | 维护"Figma 组件 ↔ 代码组件"的显式映射表 | 最高 | 中大型团队、长期维护 | 前期投入大，需要持续维护 |
| **自由生成** | 直接让模型看图/看 MCP 数据生成代码 | 中（首版快） | 原型、独立页面、营销页 | 与既有设计系统漂移；《AI 设计工具若忽视设计系统会制造更多问题》一文对此有专门论述（[UXPin](https://www.uxpin.com/studio/blog/ai-design-tools-ignore-design-system/)） |

### 4.5 设计侧评测基准：可用但需谨慎

| 基准 | 评什么 | 机制 | 主要局限 |
|---|---|---|---|
| **Design Arena** | 设计审美与落地设计 | 众包盲测、Elo 排名，分单轮 HTML 网页设计、UI 组件、游戏、数据可视化、3D、图形成像等类目 | 评的是"观感"，不评可维护性与工程行为；同类生成结果趋同（GLM-5.2 被指生成网页相似度较高） |
| **WebDev Arena** | Web 开发/前端/全栈 | 匿名对战 + 人类投票 + Elo，已拆分 front-end 与 fullstack 两个子榜 | 单轮渲染观感，非代码质量；rank spread 常较宽 |
| **PosterReward（CVPR 2026）** | 高质量图形设计生成的评价方法 | 研究性质的奖励/评价模型，用于给设计生成结果打分 | 处于研究阶段，未成为工业标准 [CVPR 2026](https://openaccess.thecvf.com/content/CVPR2026/papers/Lai_PosterReward_Unlocking_Accurate_Evaluation_for_High-Quality_Graphic_Design_Generation_CVPR_2026_paper.pdf) |
| **Looks Right, Works Right（arXiv 2607.28645）** | 多屏移动应用生成的项目级基准 | 项目级任务而非单屏，检验"看起来对"是否"用起来对" | 较新，覆盖面有限 [arXiv](https://arxiv.org/abs/2607.28645) |

**方法论提醒**：Design Arena 在解释 GLM-5.2 胜出时给出了非常有价值的量化归因——**库使用率**（91% TailwindCSS vs 57%）、**第三方库调用可靠性**（Chart.js/Three.js）、**CDN 图片使用**、**排版/视觉布局/动画**表现。这提示我们：在"设计生成"这件事上，**约定与工具链的熟练度**和**模型能力**至少同等重要。同时，Design Arena 也明确指出 GLM-5.2 在**游戏开发、数据可视化、3D 设计**上仍落后 Claude Fable 5，在 **UI 组件**类目仅排第四，且生成内容同质化较高、代码量多约 25%、耗时约 305 秒（约为 Fable 5 的两倍）。[ComputerBase](https://www.computerbase.de/news/apps/lokales-ki-modell-aus-china-glm-5-2-verdraengt-claude-fable-5-bei-web-design-von-der-spitze.98017/)

### 4.6 图像/视觉模型的计费：以 Figma AI credits 为例

Figma 的 AI credits 体系是当前最复杂的"设计侧计费"样本，值得作为预算规划的参考：

| AI 能力 | 每次消耗 credits |
|---|---|
| AI 搜索、重命名图层、FigJam 摘要/聚类 | 免费 |
| FigJam 模板与图表生成 | 2–24 / 提示 |
| 移除背景 | 1–5 / 图 |
| 矢量化图像 | 2–5 / 图 |
| 提升分辨率 / 擦除物体 / 隔离物体 / 扩图 | 5–10 / 图 |
| 生成图像 / 编辑图像 | ChatGPT Images 2.0：2；Nano Banana 2 Lite：6；Nano Banana：8；**Nano Banana 2：16** |
| 添加交互 | 20 / 次 |
| Figma Make（agentic） | 浮动：改字体 ~30+、加交互 ~75+、从零生成应用 ~100+ |
| plan mode | 计划与构建分别计费；可能高于普通提示，但良好规划可减少后续纠错 |

来源：[Figma 官方帮助中心：How AI credits work](https://help.figma.com/hc/en-us/articles/33459875669015-How-AI-credits-work)（费率截至 2026-08-25）

**三条实务结论：**
1. **不同图像模型的单次成本相差 8 倍**（2 vs 16 credits）——模型选择本身就是成本决策。
2. **agentic 功能的成本不可事前预估**，官方明确表示无法在运行前预测；只能通过事后查看消耗来校准。
3. **撤销不退还 credits**。这要求团队把"提示质量"当作成本控制手段，而不是当作体验问题。

### 4.7 设计侧的组织现实：zeroheight 2026 调研（v1.1 新增）

前面都是工具能力，这一节是**人的现实**。zeroheight 对 123 位从业者的调研给出了设计侧最诚实的数字：

| 指标 | 数值 |
|---|---|
| 团队已使用 AI | **82%** |
| AI 用量显著上升 | **61%** |
| **"设计生成"的净满意度** | **−53**（负面） |
| 最满意的 AI 用途 | **写文档**（63%） |
| 反映 **UI 绕过设计系统** | **59%** |
| 认为**"影子 AI"已造成实际问题** | **50%** |

来源：[zeroheight — State of AI in Design Systems](https://zeroheight.com/resources/state-of-ai-in-design-systems/)

**这组数字是整份报告中最有价值的一张表**，因为它解释了为什么"AI 设计工具能力在涨、设计团队满意度在跌"：

1. **净满意度 −53 说明"生成"不是设计团队的真实痛点。** 最满意的是文档（63%）——即**降低重复劳动**，而非**替代设计判断**。
2. **59% 的 UI 绕过设计系统**，正是"自由生成"路线（§4.4 第三条路线）的直接后果：生成速度越快，系统漂移越快。
3. **50% 的影子 AI 问题**说明工具已经在绕过治理流程进入生产。

**给设计负责人的推论**：引入 AI 设计工具的优先级应当是 **① 先修设计系统 → ② 再接 AI 生成 → ③ 最后才考虑"设计稿直接生成代码"**。顺序反了，59% 这个数字会继续上升。

---

## 5. AI Design × AI Coding 的合流

### 5.1 合流的四个技术证据

1. **Claude Design 的导出目标包含 Claude Code**：设计产物可以直接成为编码 Agent 的输入。设计不再是编码的上游文档，而是同一条流水线上的中间产物。
2. **Figma 画布对 Agent 双向开放**：Agent 既能读设计稿（MCP），也能在设计稿上生成与修改（Design Agent）。
3. **v0/Lovable/Bolt 的产物是代码仓库**：设计工具的输出物与编码工具的输入物是同一个东西。
4. **编码工具反向具备设计能力**：Cursor 支持 MCP/skills/hooks 与设计资源接入；CodeBuddy 内置 Figma 设计稿转代码；文心快码提供 Figma2Code；TRAE 通过 MCP + Figma AI Bridge 打通。

### 5.2 合流带来的组织后果

| 传统分工 | 合流后的形态 | 证据 |
|---|---|---|
| 设计师出稿 → 前端还原 | 设计稿与代码在同一个 Agent 会话中迭代 | Figma MCP 三工作流；Claude Design → Claude Code |
| 前端 / 后端 / 测试分工 | "全栈 + Agent 编排"角色扩大；初级工程师借助 Agent 独立完成复杂系统设计 | 易仓科技案例：中级工程师可独立设计复杂系统；原计划招 2 人的项目最终 1 人用 Qoder 完成上线 [36氪](https://eu.36kr.com/zh/p/3888237831551749) |
| 工程师"写代码" | 工程师"审核与把关" | Google 内部新代码 75% 由 AI 生成后交人工审核；复杂迁移任务中人机协同比一年前纯人工快 6 倍 [环球网/搜狐](https://www.sohu.com/a/1013570310_99900743) |
| 知识沉淀在资深工程师脑中 | 知识资产化为可复用的 Skill / 知识库 | 亚信科技（近万名研发人员）用 Qoder 构建企业级知识库，新员工熟悉单一模块的时间从数月大幅缩短 |

### 5.3 大厂内部的 AI 代码占比：横向对照（2025Q4–2026）

| 公司 | 指标 | 数值 | 时间 |
|---|---|---|---|
| **Google** | 内部新代码 AI 生成比例 | 25%（2024-10）→ 50%（2025 秋）→ **75%**（2026-04） | 2026-04 |
| **Google** | AI 使用纳入部分工程师年度绩效 | 是 | 2026 |
| **Meta** | 部分组织"Agent-Assisted"代码改动目标 | 55% | 2025Q4 |
| **Meta** | 创作组织中预计使用 AI 编写超过 75% 提交代码的工程师比例 | 65% | 2026H1 |
| **Snap** | 新代码由 AI 生成的最低比例 | 65% | 2026 |
| **Microsoft** | 部分项目 AI 编写代码比例 | 20%–30%（Nadella, 2025-04） | 2025 |
| **Microsoft** | CTO Kevin Scott 预测 5 年内 AI 生成代码比例 | 95% | 2025-04 |
| **Gartner** | 预测 2026 年底新增代码中 AI 生成占比 | 60% | 2026 |

来源：[搜狐/环球网](https://www.sohu.com/a/1013570310_99900743) [AgentMarketCap 引 Gartner](https://agentmarketcap.ai/blog/2026/04/06/vibe-coding-agentic-lovable-bolt-vercel-v0-500m-funding)

> **注意口径差异**：这些数字统计的是"AI 生成/辅助"的比例，且各公司对"AI 生成"的定义（是否包含补全、是否包含 Agent 提交、是否经过人工重写）并不统一。**不要把 75% 与 65% 直接比较。**

---

## 6. 企业落地：效益、风险与治理

### 6.1 真实生产力证据：正反两面

**正面证据（B 级）**
- Techreviewer 2026 调研（n=127）：报告"生产力提升 >50%"的公司从 2024 年的 7.5% 升至 **30.7%**；**近 97%** 表示有改善；**无一家报告下降**。
- Google：复杂代码迁移任务中，Agent 与工程师协同比一年前纯人工快 **6 倍**。
- A Place for Mom：10 个月 3478 个 PR、合并 2822 个（**81% 合并率**），依赖持久上下文、结构化规划、隔离 worktree 与 10 阶段多 Agent 评审流水线。

**反面证据（B 级）**
- 同一调研：**52.8%** 遇到幻觉/错误建议，**44.1%** 表示 AI 增加了代码评审工作量，**33.1%** 在 AI 代码中发现安全或漏洞问题，**37.0%** 认为出现过度依赖/开发者技能退化（高于技术债 23.6%、缺陷增加 22.0%）。
- Stack Overflow 2026 年 2 月脉冲调研：**58%** 的开发者每天在工作中使用 AI（2025 年为 47%），但 **38%** 把"不信任结果"列为使用 AI 学习的首要障碍；**仅 1%** 只依赖 AI，**58%** 同时使用 AI 与技术文档。[Stack Overflow Blog](https://stackoverflow.blog/2026/03/16/domain-expertise-still-wanted-the-latest-trends-in-ai/)
- 业界提出的"**AI 税**"概念：AI 加速了产出，但也引入了验证、溯源与理解成本的附加税。

> **本报告立场**：迄今最有说服力的结论不是"AI 让开发者更快"或"AI 让开发者更慢"，而是**收益高度依赖任务类型、代码库成熟度与组织的验证能力**。在无测试、无 CI、无评审规范的团队中，AI 的净效应很可能为负。

### 6.2 质量与可维护性

| 发现 | 数据 | 来源 |
|---|---|---|
| 重构占比下降、代码重复上升 | "Refactoring is down 70% while code duplication is up 81%" | [GitClear 行业统计](https://www.gitclear.com/industry_stats/ai_code_quality_signal_graphs) |
| AI 生成代码的安全漏洞比例 | 最高可达 45%（综合研究） | [AgentMarketCap](https://agentmarketcap.ai/blog/2026/04/06/vibe-coding-agentic-lovable-bolt-vercel-v0-500m-funding) |
| Lovable 生成应用的 RLS 缺陷 | 1645 个应用中 **170 个（10.3%）** 存在严重 Supabase 行级安全配置问题 | 同上 |
| "更多代码、更多缺陷" | Faros 报告（2026-04）指出 AI 驱动开发的权衡 | [ADTmag](https://adtmag.com/articles/2026/04/22/more-code-more-bugs.aspx) |
| 代码可维护性下滑 | LeadDev 专题报道 | [LeadDev](https://leaddev.com/ai/code-maintainability-plummets-in-the-ai-coding-era) |
| 理解债（comprehension debt） | 工程师可在 2 小时交付过去 2 天的工作量，但可能无法在凌晨 2 点调试它 | [AAIF](https://aaif.io/blog/code-is-cheap-proof-is-the-bottleneck) |

**可操作的推论**：如果引入 AI 后"重构占比"与"重复代码率"这两个指标恶化，说明团队在用 AI 加速**写新代码**而不是**改善系统**。这两个指标比任何生产力指标都更适合做治理 KPI。

### 6.3 安全与风险清单

| 风险类别 | 具体形态 | 证据/案例 | 缓解措施 |
|---|---|---|---|
| **提示注入** | 通过仓库文件、网页、Issue 内容注入指令，劫持具备 shell/网络权限的 Agent | CSA 研究：提示注入可绕过 Claude Code 自动模式的安全分类器 [CSA Labs](https://labs.cloudsecurityalliance.org/research/csa-research-note-claude-code-automode-prompt-injection-2026/) | 关闭 auto-run 或加白名单；对不可信内容做隔离；关键操作强制人工确认 |
| **MCP 供应链** | MCP STDIO 命令注入；暴露的 server 被滥用；恶意 MCP server | 报道称约 20 万台暴露 server 受影响，Anthropic 被指不认为这是设计缺陷 [Lyrie](https://lyrie.ai/research/research/2026-05-04-15-deepdive-mcp-stdio-command-injection-200k-servers-mother-of-all-ai-supply-chains) [The Register](https://www.theregister.com/2026/04/16/anthropic_mcp_design_flaw/) | 只装可信 MCP server；限制网络出口；定期审计已装 server |
| **Agent 越权/破坏性操作** | Agent 执行不可逆操作（删除生产数据等） | Replit Agent 删除生产数据库事件（2025）已成为品类标志性案例 [Safeguard](https://safeguard.sh/resources/blog/replit-agent-database-deletion-vibe-coding-2025) | 生产环境凭证与 Agent 环境物理隔离；禁止 Agent 持有写权限的生产凭证 |
| **数据外泄/合规** | 代码、密钥、业务数据出境；隐蔽回传 | 本报告 3.5 节所述的 Claude Code 事件（C 级可信度） | 数据分类分级；出口白名单；境内/私有化部署 |
| **生成代码漏洞** | 认证逻辑、数据库访问、依赖引入环节出错 | 10.3% RLS 缺陷率；最高 45% 漏洞率 | 强制 SAST/DAST/依赖扫描；把安全门禁加进 CI；不让 Agent 跳过 |
| **Agent 行为的不可解释性** | 6000+ 失败轨迹中死循环与超时占近 1/3 | Amazon 审计 [AAIF](https://aaif.io/blog/code-is-cheap-proof-is-the-bottleneck) | 超时与最大迭代数硬限制；轨迹留存与可回放 |
| **多 Agent 共享凭据的隐式信任边界**（v1.1 新增） | Grok Bot 条款明文规定：同一用户的多个 Bot **"must not be treated as separate security boundaries"**（不得视为独立安全边界）；删除一个 Bot 可能**不删除共享凭据** | [Cursor / Grok Bot 条款](https://cursor.com/en-US/terms/grok-bot) | 不要把"一个 Bot 一个权限"当作隔离手段；按数据域而非按 Agent 划分边界；删除 Bot 时同步轮换其共享凭据 |
| ✅ **生成代码漏洞的自动化验证（正面进展）** | Google **CodeMender** 已作为托管式 AI 安全 Agent 提供：在沙箱内**构造并运行 PoC exploit** 来验证漏洞是否真实可利用，而非仅做静态模式匹配 | [InfoSecurity Magazine](https://www.infosecurity-magazine.com/news/google-codemender-available-ai/) [Constellation Research](https://www.constellationr.com/insights/news/google-cloud-launches-ai-cybersecurity-agent-codemender) | 纳入"验证层"工具选型候选：**能证明漏洞可利用的扫描器，比只报告可疑模式的扫描器更适合与 Agent 生成代码配合使用** |

### 6.4 合规与控制面对比

| 能力 | Cursor | Claude Code / Anthropic | GitHub Copilot | OpenAI Codex |
|---|---|---|---|---|
| 认证 | SOC 2、ISO 27001、ISO 42001、AIUC-1 | 企业级合规文档、组织 admin setup | 企业级（Microsoft 合规体系） | ChatGPT Enterprise 合规体系 |
| SSO / SCIM | ✅ SAML/OIDC SSO、SCIM 席位管理 | ✅（Team/Enterprise） | ✅ | ✅（Enterprise） |
| 审计日志 | ✅ | ✅ | ✅ | ✅ |
| 仓库/模型/MCP 访问控制 | ✅ | 部分通过组织策略与 hooks | ✅ | 部分 |
| 自动运行/浏览器/网络管控 | ✅（Auto-run、browser、network controls） | ✅（hooks、权限提示） | ✅ | 云沙箱天然隔离 |
| 隐私模式/训练数据排除 | ✅ Team-wide privacy mode | ✅（视套餐） | ✅ | ✅（Enterprise/API） |
| 私有化/VPC | Enterprise | 企业方案 | GitHub Enterprise Server 路径 | 云为主 |

来源：各厂商官方定价与企业页面（[Cursor Pricing](https://cursor.com/en-US/pricing)、[Claude Code admin setup](https://code.claude.com/docs/en/admin-setup)、[GitHub Copilot 定价](https://github.com/features/copilot)）

**一个容易被忽略的对比维度**：Figma 提供 **AI Usage API**（Enterprise 计划），可程序化拉取 AI 使用数据；Cursor 提供 **AI code tracking API** 与 usage analytics。**"能否拿到使用数据的 API"应当成为企业采购的硬性要求**——没有它，治理只能靠人工统计。

### 6.5 落地方法论：12 条护栏

**事前（策略层）**
1. **先定义"不允许 Agent 做什么"**，再定义它能做什么（生产凭证、资金操作、对外发送）。
2. **数据分级**：哪些代码可以出公司网络、哪些只能进本地/私有化模型。
3. **工具白名单**：承认多工具并存（平均约 4 款）的现实，但要求登记、统一 Git 同步目标与统一审计出口。

**事中（工程层）**
4. **Agent 权限最小化**：默认只读，写权限按目录授权，网络出口白名单。
5. **可逆性优先**：所有 Agent 操作走分支与 worktree，禁止直接推主干。
6. **确定性检查与概率性判断分层**：lint / type check / 单测 / SAST 是确定性的，必须前置于 Agent 的"自我判断"。
7. **不要试图用一个巨型评审 Agent 兜底**：Datadog 的做法值得借鉴——把评审 Agent 的范围收窄到"可靠性风险"，并要求它指出"哪一行会在半夜叫醒你"。

**事后（度量层）**
8. **KPI 选"重构占比"与"重复代码率"**，而不是"AI 生成代码行数"。
9. **度量评审负担**：PR 体积分布、评审时长、返工率。若评审负担上升而交付未改善，说明引入方式有问题。
10. **度量理解债**：抽查"最近合并的 AI 主导 PR，作者能否解释关键设计取舍"。

**组织层**
11. **培训优先于招聘**：调研显示企业内部培训比例升至 72.4%，而依赖招聘外部 AI 专家的比例从 2024 年的 35.0% 降至 2026 年的 15.0%。
12. **保留"无 AI"技能基线**：37% 的公司已观察到技能退化，特别是初级开发者。至少在初级培养路径上保留从零手写的训练环节。

---

## 7. 选型决策框架

### 7.1 按角色/场景的推荐矩阵

| 场景 | 首选 | 次选 | 关键理由 |
|---|---|---|---|
| **资深工程师的深度重构 / 平台工程** | Claude Code（Max 档） | Codex CLI、OpenCode | 本地可观测性、Agent Teams、worktree 隔离、hooks 可脚本化 |
| **日常 IDE 编码（个人）** | Cursor Pro（$20） | Devin Desktop、Antigravity | Tab 补全与多文件编辑体验最成熟 |
| **GitHub 原生团队 / PR 自动化** | GitHub Copilot + Agent HQ | Copilot Max | 与 PR/CI/Issues 集成最深，可在同一流程调度 Claude 与 Codex |
| **规格驱动与合规强约束项目** | Kiro | 文心快码（SPEC 模式） | 先写需求与验收标准再生成，白盒化交付 |
| **需要浏览器自动化/自建 Agent 管线** | Antigravity 2.0 | — | 原生浏览器子 Agent + SDK |
| **多 Agent 并行编排** | Devin Desktop | Claude Code Agent Teams | Kanban 式 Agent 指挥中心 |
| **非工程角色的原型/内部工具** | Lovable | Bolt、v0 | 席位免费 + 内置后端，适合广泛分发 |
| **前端组件的设计→代码** | v0 | Figma Make | 组件级输出可直接进入仓库 |
| **设计与研发一体化的团队** | Figma（Make + Design Agent + MCP） | Claude Design | 画布双向开放、design token 可同步 |
| **视觉素材/营销物料规模化** | GPT Image 2 | Seedream 5.0 Pro、Nano Banana 2 | Design Arena 审美榜领先；Seedream 的可编辑性与图层分离最强 |
| **安全敏感 / 数据不出境** | OpenCode + 本地模型 | Qoder VPC 版、文心快码专属版、CodeGeeX 私有化 | 可审计、可离线、境内推理 |
| **国内中小团队性价比** | TRAE Code / 文心快码 | Doubao-Seed-Code + iFlow CLI | ¥59–¥199/月区间，人民币计价 |

### 7.2 组合策略：三种被验证的搭配

| 组合 | 构成 | 适用 | 成本量级（10 人） |
|---|---|---|---|
| **"原型→加固"** | Lovable/Bolt（原型）→ Cursor 或 Claude Code（加固） | 业务部门提需求、研发团队交付 | Lovable Business $50 + Cursor Teams $400/月 |
| **"IDE + 终端 + PR"** | Cursor（日常）+ Claude Code（大任务）+ Copilot（PR 评审） | 中大型研发团队的主流组合 | $20×N + $100×k + $39×N |
| **"设计→代码一体化"** | Figma（含 AI credits）+ v0/Cursor + Claude Code | 产品/设计/研发同团队 | Figma 席位费 + AI credits + $30/人 |

> **反模式警告**：组合越复杂，治理成本增长快于收益。至少统一两件事——**Git 同步目标**与**审计日志出口**——否则数年后会重演"存量系统黑盒化"的问题。

### 7.3 30 天试点方案（可直接执行）

| 阶段 | 时间 | 动作 | 成功判据 |
|---|---|---|---|
| **W1 基线** | 第 1 周 | 采集基线：PR 体积分布、评审时长、缺陷密度、重构占比、重复代码率 | 五项指标有可复现的取值 |
| **W2 单点验证** | 第 2 周 | 选 1 个中等复杂度的真实需求（非 demo），由 2–3 人用选定的 1–2 款工具完成；全程记录提示、干预与返工 | 需求按期交付，且 PR 通过全部 CI 门禁 |
| **W3 护栏补齐** | 第 3 周 | 补齐 Agent 权限最小化、分支/worktree 强制、SAST 前置、凭证隔离；把 AI credits/token 消耗接入统一账单视图 | 无 Agent 持有生产写权限；账单可按人/项目归因 |
| **W4 复测与决策** | 第 4 周 | 复测五项指标；访谈参与者（含"是否理解自己提交的代码"）；做继续/放弃/扩大的决策 | 有明确的量化结论与下一步范围 |

**试点成功的判据不是"感觉快了"，而是**：① 五项指标中至少两项客观改善；② 评审负担未上升；③ 无新增安全事件；④ 参与者能解释自己提交的代码。

---

## 8. 趋势判断（2026Q4 – 2028）

| # | 判断 | 依据 | 置信度 |
|---|---|---|---|
| 1 | **评测将全面从"解题"转向"验证"**：基准重心从 SWE-bench 转向轨迹质量、成本、可复现性与安全属性 | OpenAI 弃用 SWE-bench Verified；DeepSWE/Terminal-Bench 4.0 兴起；AAIF 把验证列为核心议题 | 高 |
| 2 | **"设计"与"编码"在工具层彻底合并**，剩下的是角色而非工具的边界 | Claude Design→Claude Code；Figma 画布对 Agent 双向开放 | 高 |
| 3 | **席位制定价会被用量制侵蚀**：Agent 让"人"不再是成本的准确代理变量 | Lovable 的席免+credits 共享池模式已在规模上证明优势 | 中高 |
| 4 | **开源模型在企业"够用"区间站稳**：开放权重在 SWE-bench Verified 已达 80%+，在成本敏感场景足以替代 | MiniMax M2.5、GLM-5.2、DeepSeek-V4、Inkling | 高 |
| 5 | **中国市场将出现"合规驱动的工具分层"**：海外工具在强监管行业收缩，国产工具在 Harness 深度上继续追赶 | Claude Code 事件后阿里禁用；国产工具已具备三端形态与企业治理能力 | 中高 |
| 6 | **"理解债"会成为一级工程指标**，并催生新的工具品类（代码理解、变更解释、设计取舍记录） | AAIF、Datadog、Amazon 的一致指向 | 中高 |
| 7 | **安全重心从"模型对齐"转向"Agent 权限与供应链"**：MCP server、Skills、插件成为新的攻击面 | MCP 20 万 server 风险、提示注入绕过 auto mode | 高 |
| 8 | **图像/设计模型的可编辑性将比审美更重要**：图层分离、局部精确编辑、token 化输出决定能否进入生产 | Seedream 5.0 Pro 的能力重心；Figma credit 表显示编辑类调用频率最高 | 中高 |

---

## 附录 A：术语表

| 术语 | 含义 |
|---|---|
| **Harness** | 包裹大模型的工程体系：上下文管理、工具调用、规划、验证、沙箱。决定同一模型的能力上限 |
| **MCP** | Model Context Protocol，Agent 与外部工具/数据源交互的开放协议；2025-12 捐献 Linux Foundation 旗下 AAIF |
| **AGENTS.md** | 面向 Agent 的仓库约定文件（OpenAI 捐赠，AAIF 创始项目） |
| **Agent Skills / SKILL.md** | 可复用的领域流程封装规范 |
| **Subagent** | 由主 Agent 派生、拥有独立上下文窗口的子 Agent |
| **Worktree** | git worktree，用于并行会话的文件系统隔离 |
| **Comprehension debt** | 理解债：交付速度超过理解速度所累积的风险 |
| **Generation-verification asymmetry** | 生成-验证不对称：生成能力增长快于验证能力 |
| **Design Token** | 设计系统的最小原子（颜色、间距、字体、圆角等）跨工具/代码的变量化表达 |
| **RLS** | Row Level Security，Supabase/Postgres 的行级安全策略，vibe coding 最常见的漏洞来源 |

## 附录 B：主要数据来源

**官方文档与定价页（A 级）**
- [Claude Code Docs — Agent Teams](https://code.claude.com/docs/en/agent-teams) / [Worktrees](https://code.claude.com/docs/en/worktrees) / [Admin setup](https://code.claude.com/docs/en/admin-setup)
- [Cursor Pricing](https://cursor.com/en-US/pricing) / [Introducing Composer 2](https://cursor.com/en-US/blog/composer-2)
- [Figma — How AI credits work](https://help.figma.com/hc/en-us/articles/33459875669015-How-AI-credits-work) / [Agents, Meet the Figma Canvas](https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/) / [The Figma Design Agent is Here](https://www.figma.com/blog/the-figma-agent-is-here/)
- [Claude Design 帮助中心](https://support.claude.com/en/articles/14604416-get-started-with-claude-design)
- [字节 Seed — Seedream 5.0 Pro](https://seed.bytedance.com/en/blog/beyond-generation-it-understands-design-introducing-seedream-5-0-pro)
- [GitHub Blog — Agent HQ](https://github.blog/news-insights/company-news/pick-your-agent-use-claude-and-codex-on-agent-hq/) / [Copilot 个人计划调整](https://github.blog/news-insights/company-news/github-copilot-individual-plans-introducing-flex-allotments-in-pro-and-pro-and-a-new-max-plan/)
- [MCP — joins the Agentic AI Foundation](https://modelcontextprotocol.info/blog/joins-agentic-ai-foundation/)

**排行榜与独立评测（A/B 级）**
- [Steel.dev — SWE-bench Verified](https://leaderboard.steel.dev/leaderboards/swe-bench-verified/)
- [Terminal-Bench 官方](https://www.tbench.ai/)
- [Design Arena Graphic Design（BenchmarkList 抓取）](https://benchmarklist.com/arenas/design_arena_graphic_design/)
- [BenchLM — DeepSWE](https://benchlm.ai/benchmarks/deepswe) / [IDE-Bench](https://benchlm.ai/benchmarks/idebench)
- [Blog du Modérateur — WebDev Arena 2026-09](https://www.blogdumoderateur.com/ia-meilleurs-modeles-code-developpement-web-septembre-2026/)

**行业调研与媒体（B 级）**
- [Techreviewer — AI in Software Development 2026](https://techreviewer.co/research/ai-in-software-development-in-2026)
- [Stack Overflow Blog — 2026-03-16](https://stackoverflow.blog/2026/03/16/domain-expertise-still-wanted-the-latest-trends-in-ai/)
- [AAIF — Code Is Cheap. Proof Is the Bottleneck.](https://aaif.io/blog/code-is-cheap-proof-is-the-bottleneck)
- [AgentMarketCap — Vibe Coding Goes Agentic](https://agentmarketcap.ai/blog/2026/04/06/vibe-coding-agentic-lovable-bolt-vercel-v0-500m-funding)
- [株式会社100 — Lovable/Bolt/v0 对比（2026-08 官方定价）](https://hubspot.100inc.co.jp/lovable-vs-bolt-vs-v0)
- [AICoderScope — 7 大 AI 编码 Agent 对比（2026-06）](https://aicoderscope.com/blog/ai-coding-agents-7-way-comparison-june-2026/)
- [ComputerBase — GLM-5.2 登顶 Design Arena](https://www.computerbase.de/news/apps/lokales-ki-modell-aus-china-glm-5-2-verdraengt-claude-fable-5-bei-web-design-von-der-spitze.98017/) / [GPT-6 Sol 与 Luna](https://www.computerbase.de/news/apps/halb-so-viele-fehler-openai-schickt-gpt-6-sol-und-luna-ins-rennen.99515/)
- [The Register — Anthropic debuts Claude Design](https://www.theregister.com/2026/04/17/anthropic_debuts_claude_design/)
- [The Register — Bye-bye, Gemini CLI; Google nudges devs toward Antigravity](https://assets.theregister.com/2026/05/20/202615/) / [Virtualization Review — Gemini CLI 并入 Antigravity CLI](https://virtualizationreview.com/articles/2026/05/19/google-moves-gemini-cli-into-antigravity-cli-as-agent-platform-expands.aspx)
- [IT之家/凤凰科技 — GLM 5.2 登顶 Design Arena](https://tech.ifeng.com/c/8u6UKRPSNWH)
- [搜狐/环球网 — Google 75% 新代码 AI 生成](https://www.sohu.com/a/1013570310_99900743)
- [36氪/第一新声 — Claude Code 后门风波与国产替代](https://eu.36kr.com/zh/p/3888237831551749)
- [腾讯云开发者社区 — 国产 AI 编程助手横向评测](https://cloud.tencent.cn/developer/article/2726398)
- [GitClear — AI 代码质量信号](https://www.gitclear.com/industry_stats/ai_code_quality_signal_graphs)
- [LeadDev — 可维护性下滑](https://leaddev.com/ai/code-maintainability-plummets-in-the-ai-coding-era)
- [Bloomberg — SpaceX completes $60B Cursor acquisition](https://www.bloomberg.com/news/articles/2026-08-14/spacex-completes-its-60-billion-cursor-acquisition)
- [VietnamPlus — SpaceX 完成 Cursor 收购](https://www.vietnamplus.vn/spacex-thau-tom-cursor-voi-60-ty-usd-thuong-vu-lon-nhat-lich-su-nganh-cong-nghe-post1130336.vnp)
- [斯坦福 AI Index 2026（中文版）](https://hai.stanford.edu/assets/files/hai-ai-index-2026-chinese-version-082226.pdf)

## 附录 C：时效性声明与阅读约定

1. 本报告全部定价、版本号与榜单名次**采集于 2026 年 9 月 24 日前后**，其中 Figma AI credits 费率截至 2026-08-25，Lovable/Bolt/v0 定价截至 2026-08-31，SWE-bench Verified 榜单更新于 2026-09-04，Design Arena 快照抓取于 2026-09-02。
2. 本领域价格与功能的中位失效周期约 2–3 个月；**产品存续期的中位数已不足 12 个月**（见 §3.7）。**任何采购决策前必须回到官方页面复核，并完成"仓库活性三查"。**
3. 标注为「未核实」的条目表示本报告未能取得该时点的一手数据，不作为结论使用。v1.1 中已标「未二次核实」的条目（iFlyCode、CodeGeeX、Aider）仅作线索，**不可作为决策依据**。
4. 第 3.5 节涉及的安全事件为单一来源转述，已按 C 级可信度标注，仅供合规评估参考，不构成事实认定。
5. **所有竞技榜（Design Arena / WebDev Arena）的排名必须带日期引用**——2026 年 9 月内 WebDev Arena 榜首即发生过更替（09-02 → 09-05）。

## 附录 D：v1.1 / v1.2 新增的关键来源

- [Kiro — ISO/IEC 27001:2022 认证公告](https://kiro.dev/blog/iso-27001/) / [Kiro Enterprise](https://kiro.dev/enterprise/)
- [AWS — Amazon Q Developer IDE 插件 EOS 公告](https://docs.aws.eu/amazonq/latest/qdeveloper-ug/what-is.html)
- [VS Code Blog — Agent Host 架构](https://code.visualstudio.com/blogs/2026/08/26/agent-host-architecture)
- [InfoSecurity Magazine — Google CodeMender](https://www.infosecurity-magazine.com/news/google-codemender-available-ai/)
- [Roo Code 仓库 README（关停原文）](https://raw.githubusercontent.com/RooCodeInc/Roo-Code/main/README.md)
- [DigitalToday — Cursor 收购 Continue](https://www.digitaltoday.co.kr/en/view/73581/cursor-acquires-open-source-coding-assistant-continue)
- [Motiff 官方关停公告](https://motiff.com/help/others/462390803479041) / [中文站停服说明](https://miaoduo.com/help/others/489912186378811)
- [Kiro — 从 Q CLI 迁移](https://kiro.dev/docs/upgrade-guides/migrating-from-q/)
- [arXiv:2609.17394 — Coding Agents Have Converged（SWE-bench 排序失效）](https://arxiv.org/abs/2609.17394)
- [Mixed News — 并行 subagent 成本反例](https://mixed-news.com/en/codex-developer-parallel-agents-limit-nous-1393-agents/)
- [GitHub Docs — Copilot 模型与计费](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing)
- [Figma MCP 速率限制](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)
- [zeroheight — State of AI in Design Systems 2026](https://zeroheight.com/resources/state-of-ai-in-design-systems/)
- [BenchmarkList — Design Arena 快照](https://benchmarklist.com/arenas/design_arena_website/)
- [Times of India — OpenAI 终止与 Cursor 合作](https://timesofindia.indiatimes.com/technology/tech-news/openai-ends-relationship-with-cursor-following-the-spacex-acquisition-makes-it-clear-elon-musk-is-the-big-reason-says-starting-november-12-/affcmtoi_articleshow/133611738.cms)
- [Fast Company — Claude Design 更新](https://www.fastcompany.com/91561193/anthropics-updated-claude-design-gives-vibe-coders-and-their-design-oversight-more-control)
- [网易科技 — 百度文心快码并入搭子](https://www.163.com/dy/article/L686FSP505198CJN.html) / [钛媒体](https://m.tmtpost.com/nictation/8131505.html)
- [Cursor / Grok Bot 条款](https://cursor.com/en-US/terms/grok-bot)

## 附录 E：配套原始调研材料

本报告的支撑材料（含 200+ 条逐条来源 URL、逐产品档案、开源 agent 谱系、设计基准与 image-to-code 评测原始数据）存放于：

```
docs/research-ai-design-coding-2026/
├── ai-coding-tools-2026-09.md                          # 工具逐个产品档案（国际 + 国产）
├── AI-Coding企业级落地调研报告-2026年9月.md              # 企业落地、成本、合规
├── AI设计工具全景_2026-09.md                            # 设计工具分层与对比
├── ai-image-models-2026-09.md                          # 视觉生成模型
├── design-to-code-and-design-benchmarks-2026-09.md     # 设计→代码链路与基准
├── design-benchmarks-report.md                         # 设计基准原始数据
├── open-source-coding-agents-2026-09.md                # 开源 Agent 谱系
├── openhands-research-brief-2026-09-24.md              # OpenHands 专题
└── swe-agent-research-brief.md                         # SWE-agent 专题 + SWE-bench 失效分析
```

> 这些是**未整合的原始底稿**，含有比本报告更细的产品级数据与更长的来源清单，但**未经去重与事实复核**，引用时请以本报告的结论为准，或回到其标注的一手链接自行核验。

---

*报告完 · v1.4 · 2026-09-24*
