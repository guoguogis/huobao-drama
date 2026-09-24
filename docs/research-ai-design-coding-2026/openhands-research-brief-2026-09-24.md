# OpenHands 研究简报（观测日期：2026-09-24）

> 所有数据均来自本次实际抓取的 URL。未抓到的内容一律标注「未核实」。
> 关键背景：截至 2026-09-24，`OpenHands/OpenHands` 这个仓库的**产品本体已经不是旧版 OpenHands GUI，而是 Agent Canvas**；旧 monorepo 已拆分为多仓库。

---

## 1. 组织/公司名称，是否改名

- 面向用户的品牌是 **OpenHands**，官网 `openhands.dev`（仓库 homepage 字段即为此）[来源](https://api.github.com/repos/OpenHands/OpenHands)。
- **法律实体仍是 All Hands AI**：隐私政策生效日 2025-09-03，正文通篇自称 "All Hands AI"，联系地址 "All Hands AI, 24 Oak Street, Unit 2, Cambridge, MA 02139"，联系邮箱 `contact@all-hands.dev` [来源](https://www.openhands.dev/privacy)。
- Enterprise / Cloud 仓库的 LICENSE 版权行写的是 `Copyright (c) 2026 All Hands AI` [来源](https://raw.githubusercontent.com/OpenHands/enterprise/main/LICENSE)、[来源](https://raw.githubusercontent.com/OpenHands/OpenHands-Cloud/main/LICENSE)。
- **没有改名为 "OpenHands, Inc." 的证据**；官网页脚只写 "© 2026 OpenHands"（品牌版权行）[来源](https://www.openhands.dev/pricing)。→ 「公司法人是否更名为 OpenHands」**未核实**（TrademarkElite 页面抓取返回 403，无法读取）。
- **GitHub 组织确实改过名**：`All-Hands-AI` → `OpenHands`，执行时间 2025-10-23 16:00 UTC（issue 创建于 2025-10-14，关闭于 2025-10-24）[来源](https://api.github.com/repos/OpenHands/OpenHands/issues/11376)。镜像仓库同步迁移：`ghcr.io/all-hands-ai/...` → `ghcr.io/openhands/...` [来源](https://api.github.com/repos/OpenHands/OpenHands/issues/11376)。
- 组织目前有 **51 个公开仓库** [来源](https://api.github.com/search/repositories?q=org:OpenHands&per_page=100&sort=updated)。

---

## 2. 架构：CLI / GUI / SDK / Docker / Skills / 事件流 / 语言栈 / 许可证

### 2.1 四个产品面（官方定义）

| 面 | 定位 | 源码 |
|---|---|---|
| **Agent Canvas** | 浏览器客户端 + 控制中心（会话、文件、终端、后端、自动化） | `OpenHands/OpenHands` |
| **Software Agent SDK + Agent Server** | Python 组合式 agent 库；Agent Server 通过 REST/WebSocket 暴露 agent 执行、会话、工具、工作区 | `OpenHands/software-agent-sdk` |
| **OpenHands Cloud** | 托管商业服务 | 封闭/未开源主仓 |
| **OpenHands Enterprise** | 商业自托管/授权部署 | `OpenHands/enterprise` |

[来源](https://raw.githubusercontent.com/OpenHands/docs/main/overview/introduction.mdx)

### 2.2 Agent Canvas 架构（组件与状态归属）

- 核心链路：**Browser → Agent Canvas → 选中的 backend**；Agent Server 负责会话执行，Automation Server 负责定时/事件触发的运行生命周期 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/agent-canvas/architecture.mdx)。
- 组件表：Agent Canvas（浏览器 UI）、Agent Server（`software-agent-sdk` 内 `openhands-agent-server`）、Automation Server（`OpenHands/automation`）、Workspace/沙箱（部署相关）[来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/agent-canvas/architecture.mdx)。
- 启动器分模式：`agent-canvas`（前端+Agent Server+Automation+ingress）、`--frontend-only`、`--backend-only` [来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/agent-canvas/architecture.mdx)。
- 状态归属：会话历史/LLM profile/secrets/MCP 配置在 Agent Server；自动化定义/调度/事件/运行历史在 Automation Server；文件在工作区；Canvas 只存后端连接信息 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/agent-canvas/architecture.mdx)。
- 执行边界三档：宿主进程（无容器隔离）／Docker 或 Kubernetes（容器/pod 内）／Cloud 或 Enterprise（平台托管沙箱）[来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/agent-canvas/architecture.mdx)。
- 一份对话属于一个 backend，拥有独立历史与工作区；支持从某条消息 **branch 对话** [来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/agent-canvas/overview.mdx)。
- Agent Canvas 明确「不是 agent runtime、不是沙箱」，它只展示后端状态并发请求 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/agent-canvas/architecture.mdx)。

### 2.3 Docker 沙箱 / runtime 容器

- 官方 README 给出 Docker 路径：`docker run -it --rm -p 8000:8000 -v "$HOME/.openhands:/home/openhands/.openhands" -v "${PROJECTS_PATH}:/projects" ghcr.io/openhands/agent-canvas:1.23.0`，前置要求 Docker Desktop / Docker Engine，以及一个 `PROJECTS_PATH` 宿主目录 [来源](https://raw.githubusercontent.com/OpenHands/OpenHands/main/README.md)。
- 也可**不装沙箱**直接跑：`npm install -g @openhands/agent-canvas && agent-canvas`，此时 agent 对本机文件系统有完全访问权（README 有显式 WARNING）[来源](https://raw.githubusercontent.com/OpenHands/OpenHands/main/README.md)。
- 自托管 VM 的端口布局：nginx `:443` → ingress `127.0.0.1:8000` → static `:3001` / agent server `:18000` / automation backend `:18001`；API 鉴权用 `LOCAL_BACKEND_API_KEY`（`openssl rand -base64 32` 生成），每个 `/api/*` 请求须带 `X-Session-API-Key` 头 [来源](https://raw.githubusercontent.com/OpenHands/OpenHands/main/docs/SELF_HOSTING.md)。
- 单用户基线：2 vCPU / 4 GB RAM 足够 [来源](https://raw.githubusercontent.com/OpenHands/OpenHands/main/docs/SELF_HOSTING.md)。
- 历史 runtime 镜像命名（V0 时代）如 `runtime:1.6.0-nikolaik` 与 `openhands:1.7.0` 版本必须严格一致，否则容器启动报错 —— 该细节出自第三方评测，**官方文档未核实** [来源](https://dev.to/jovan_chan_9500711396d4e6/openhands-review-2026-open-source-ai-coding-agent-72-swe-bench-and-the-self-hosting-catch-1a8c)。

### 2.4 事件流架构

- Event System = 不可变、类型安全（Pydantic）的 **append-only 事件日志**，既是 agent 记忆也是外部服务集成点 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/sdk/arch/events.mdx)。
- 分两大类：**LLMConvertibleEvent**（`MessageEvent` / `ActionEvent` / `SystemPromptEvent` / `ObservationEvent` / `UserRejectObservation` / `AgentErrorEvent` / `CondensationSummaryEvent`）与**内部事件**（`ConversationStateUpdateEvent` / `CondensationRequest` / `Condensation` / `PauseEvent`，不进 LLM）[来源](https://raw.githubusercontent.com/OpenHands/docs/main/sdk/arch/events.mdx)。
- `Event.source`（user/agent/environment）与 LLM `role` 是**有意独立的两个概念**，不能用 role 反推来源 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/sdk/arch/events.mdx)。
- 并行工具调用会按 `llm_response_id` 分组，仅保留首个事件的 thought/reasoning [来源](https://raw.githubusercontent.com/OpenHands/docs/main/sdk/arch/events.mdx)。
- 两级错误事件：`AgentErrorEvent`（工具级、发给 LLM、会话继续）vs `ConversationErrorEvent`（会话级、不发给 LLM、run loop 进入 ERROR 并抛 `ConversationRunError`）[来源](https://raw.githubusercontent.com/OpenHands/docs/main/sdk/arch/events.mdx)。

### 2.5 Microagents → Skills

- 旧的 microagents 目录**仍兼容但已被取代**：`.openhands/microagents/` 与 `.openhands/skills/` 继续支持，新写法为 `.agents/skills/<skill-name>/SKILL.md` [来源](https://raw.githubusercontent.com/OpenHands/docs/main/overview/skills.mdx)。
- 遵循 **Agent Skills 规范**（agentskills.io），并扩展了 `triggers`（关键词触发）与 `paths`（路径触发规则）；`paths` 优先级高于 `triggers` [来源](https://raw.githubusercontent.com/OpenHands/docs/main/overview/skills.mdx)。
- 三级渐进披露：Discovery（只加载 name+description）→ Invocation（加载完整 SKILL.md）→ Resources（scripts/references/assets 按需读）[来源](https://raw.githubusercontent.com/OpenHands/docs/main/overview/skills.mdx)。
- 仓库级常驻上下文用 `AGENTS.md`（也识别 `CLAUDE.md`、`GEMINI.md`）[来源](https://raw.githubusercontent.com/OpenHands/docs/main/overview/skills.mdx)。
- 官方 skill registry：`github.com/OpenHands/extensions` [来源](https://raw.githubusercontent.com/OpenHands/docs/main/overview/skills.mdx)。
- 作用域与优先级：project > user > public；同作用域内 `.agents/skills/` > 旧目录 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/overview/skills.mdx)。

### 2.6 语言 / 技术栈

| 仓库 | 语言（GitHub 判定） | 大小 |
|---|---|---|
| `OpenHands/OpenHands`（Agent Canvas） | **TypeScript** | 438,238 KB |
| `OpenHands/software-agent-sdk` | **Python** | 47,801 KB |
| `OpenHands/OpenHands-Cloud` | Python | 5,125 KB |
| `OpenHands/enterprise` | Python | 267,524 KB |
| `OpenHands/benchmarks` | Python | 12,157 KB |
| `OpenHands/fusey`（FUSE/S3 桥） | Go | 271 KB |
| `OpenHands/docs` | MDX | 81,920 KB |

[来源](https://api.github.com/repos/OpenHands/OpenHands)、[来源](https://api.github.com/repos/OpenHands/software-agent-sdk)、[来源](https://api.github.com/orgs/OpenHands/repos?per_page=100&sort=pushed)

- 运行时前置：Node.js **22.12 或更高**、`npm`、`uv`；CLI 包要求 Python **3.12+** 与 uv **0.11.6+** [来源](https://raw.githubusercontent.com/OpenHands/OpenHands/main/README.md)、[来源](https://raw.githubusercontent.com/OpenHands/OpenHands-CLI/main/README.md)。

### 2.7 许可证（**已分化，不是单一 MIT**）

| 仓库 | 许可证 | 观测 |
|---|---|---|
| `OpenHands/OpenHands` | **MIT** | `license.key = mit` [来源](https://api.github.com/repos/OpenHands/OpenHands) |
| `OpenHands/software-agent-sdk` | **MIT** | [来源](https://api.github.com/repos/OpenHands/software-agent-sdk) |
| `OpenHands/benchmarks` | **MIT** | [来源](https://api.github.com/orgs/OpenHands/repos?per_page=100&sort=pushed) |
| `OpenHands/enterprise` | **PolyForm Free Trial License 1.0.0**（自然年超 30 天须商业许可，禁止分发副本） | [来源](https://raw.githubusercontent.com/OpenHands/enterprise/main/LICENSE) |
| `OpenHands/OpenHands-Cloud` | **PolyForm Free Trial License 1.0.0** | [来源](https://raw.githubusercontent.com/OpenHands/OpenHands-Cloud/main/LICENSE) |
| `OpenHands/typescript-client` | 无 license，且 **archived = true** | [来源](https://api.github.com/orgs/OpenHands/repos?per_page=100&sort=pushed) |

- 官方文档明确：「每个公开仓库各自带许可证，**不要假设整个生态同一个许可证**」[来源](https://raw.githubusercontent.com/OpenHands/docs/main/overview/introduction.mdx)。
- 第三方评测（DEV，2026-06-02）称 SDK 是 Apache 2.0 —— **与实际不符，实测为 MIT**，属该文错误 [来源](https://dev.to/jovan_chan_9500711396d4e6/openhands-review-2026-open-source-ai-coding-agent-72-swe-bench-and-the-self-hosting-catch-1a8c)。

### 2.8 CLI / Local GUI 现状

- **CLI 已停止活跃维护**：`OpenHands-CLI` README 顶部明写 "⚠️ This project is no longer actively maintained."，并引导用户转 Agent Canvas [来源](https://raw.githubusercontent.com/OpenHands/OpenHands-CLI/main/README.md)。
- 官方文档措辞较温和：CLI「功能已完备，主要只为稳定性维护」；**Legacy Local GUI 已废弃**，旧 monorepo 快照存于 `OpenHands/legacy` [来源](https://raw.githubusercontent.com/OpenHands/docs/main/overview/introduction.mdx)。

---

## 3. GitHub 硬指标（全部观测于 2026-09-24 UTC）

`OpenHands/OpenHands`：

- **Stars: 89,059** [来源](https://api.github.com/repos/OpenHands/OpenHands)
- **Forks: 11,725** [来源](https://api.github.com/repos/OpenHands/OpenHands)
- **archived: false**（未归档，仍在活跃开发）[来源](https://api.github.com/repos/OpenHands/OpenHands)
- **pushed_at: 2026-09-24T13:34:48Z**；最新 commit 时间 **2026-09-24T13:33:42Z** [来源](https://api.github.com/repos/OpenHands/OpenHands/commits?per_page=5)
- open issues: **880**；watchers: 89,059；subscribers: 497 [来源](https://api.github.com/repos/OpenHands/OpenHands)
- 建仓：2024-03-13T03:33:31Z；默认分支 `main` [来源](https://api.github.com/repos/OpenHands/OpenHands)
- **最新 release：`v1.23.0`，published_at 2026-09-23T17:24:03Z**（created 2026-09-23T17:10:03Z）[来源](https://api.github.com/repos/OpenHands/OpenHands/releases/latest)
- v1.23.0 release 资产为桌面端安装包：macOS universal DMG（333 MB，下载 56）、Windows exe（140 MB，下载 113）、Linux AppImage（194 MB，下载 13）、Ubuntu deb（148 MB，下载 25）[来源](https://api.github.com/repos/OpenHands/OpenHands/releases/latest)
- 官网价格页顶部徽标显示 **89.1K** stars，与 API 一致 [来源](https://www.openhands.dev/pricing)
- 版本节奏佐证（仍在持续发版）：v1.18.0 发布于 2026-09-11；2026 年 8 月共发了 **8 个版本（v1.9.0 → v1.16.0）** [来源](https://newreleases.io/project/github/OpenHands/OpenHands/release/v1.18.0)、[来源](https://www.openhands.dev/blog/new-in-agent-canvas-august-2026)

其它仓库（同一批次观测）：

- `software-agent-sdk`：**1,165 stars / 556 forks**，pushed 2026-09-24T13:32:19Z，MIT，open issues 547 [来源](https://api.github.com/repos/OpenHands/software-agent-sdk)
- `OpenHands-Cloud`：**81 stars / 45 forks**，pushed 2026-09-24T13:35:40Z [来源](https://api.github.com/orgs/OpenHands/repos?per_page=100&sort=pushed)
- `enterprise`：**4 stars / 3 forks**，建仓 2026-07-27T09:28:53Z [来源](https://api.github.com/orgs/OpenHands/repos?per_page=100&sort=pushed)
- `benchmarks`：**125 stars / 90 forks**，pushed 2026-09-04 [来源](https://api.github.com/orgs/OpenHands/repos?per_page=100&sort=pushed)
- `typescript-client`：**archived = true**，17 stars [来源](https://api.github.com/orgs/OpenHands/repos?per_page=100&sort=pushed)
- **结论：项目仍然高度活跃维护中**（当天有 push，前一天有 release）。

> 注：一次 `releases?per_page=100` 调用被 GitHub 限流（HTTP 403），因此未取得完整历史 release 列表；**v1.0.0 的确切发布日期未核实**，且 `https://github.com/OpenHands/OpenHands/releases/tag/v1.0.0` 返回 404。

---

## 4. OpenHands Cloud 定价（观测于 2026-09-24）

**官方价格页 `openhands.dev/pricing` 当前只有三档：**

| 档位 | 价格 | 关键内容 |
|---|---|---|
| Local / Open Source | **Free** | 本地开源，Web GUI + Terminal UI + CLI，Git 集成，社区支持，模型无关；**Max Daily Conversations: Unlimited** |
| SaaS / Individual | **Free** | BYOK 或用 OpenHands provider（at-cost）；托管云端（桌面+移动）；API 支持自动化；Jira/Slack 集成；**Max Daily Conversations: 10**；Users: 1 |
| SaaS 或 Self-hosted / Enterprise | **Custom pricing** | 私有 VPC + BYOK；**Enterprise SAML/SSO**；每用户无限并发会话；Large Codebase SDK；优先支持 + 共享 Slack 频道；Multi-user RBAC；集中团队计费；命名客户工程师 |

[来源](https://www.openhands.dev/pricing)

- Enterprise 提供 **30 天免费试用，无需信用卡**，号称 1 小时内可部署完成 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/index.mdx)。
- ⚠️ **$20/月 的 Cloud Pro 档在今天的官方价格页上已不存在**。该档位仅见于第三方来源：
  - Codeables（2026-04-12）：$20/月，含更高用量、Cloud API、Jira/Slack 集成、at-cost 模型 [来源](https://codeables.dev/article/openhands-cloud-pricing-what-do-i-get-on-the-free-tier-vs-the-20)
  - DEV 评测（2026-06-02）：Cloud Pro **$20/月**，含 **$20 一次性 cloud credits**，LLM at-cost [来源](https://dev.to/jovan_chan_9500711396d4e6/openhands-review-2026-open-source-ai-coding-agent-72-swe-bench-and-the-self-hosting-catch-1a8c)
- **「$20 档是否被下线 / 改名 / 合并进 Individual Free」未核实**：`app.all-hands.dev/pricing` 返回的是空壳页面（无内容），Wayback Machine 抓取失败，官方价格页无历史版本可查 [来源](https://app.all-hands.dev/pricing)。
- **免费额度（free credits）的具体数值未核实**：官方价格页未列任何 credit 数字；仅第三方提到 $20 一次性 credits [来源](https://dev.to/jovan_chan_9500711396d4e6/openhands-review-2026-open-source-ai-coding-agent-72-swe-bench-and-the-self-hosting-catch-1a8c)。

---

## 5. SWE-bench Verified 与 2026 基准

### 5.1 官方（OpenHands Index）最新数据

`openhands-index-results` 中 **claude-opus-4-8**（agent_version **v1.24.0**，提交时间 **2026-06-01**）：

| 基准 | 分数 | 单例成本 | 平均耗时 |
|---|---|---|---|
| **swe-bench** | **83.8**（accuracy） | **$0.75** | **159 s** |
| swt-bench | 84.3 | $0.73 | 164 s |
| gaia | 78.8 | $1.17 | 212 s |
| commit0 | 62.5 | $7.83 | 941 s |
| swe-bench-multimodal | 50.0（solveable_accuracy）／combined 33.3 | $1.81 | 317 s |

[来源](https://raw.githubusercontent.com/OpenHands/openhands-index-results/main/results/claude-opus-4-8/scores.json)

- 该 index 的 swe-bench 跑法与官方 benchmarks 仓库默认一致：数据集为 **`princeton-nlp/SWE-bench_Verified`**，`test` split，`--max-iterations 100`（默认）[来源](https://raw.githubusercontent.com/OpenHands/benchmarks/main/benchmarks/swebench/README.md)。**因此 83.8 可视为 SWE-bench Verified 口径**（推断，非官方逐字声明）。

### 5.2 官方文档给出的 OpenHands Index 均分（用于选型，非 SWE-bench）

- claude-opus-4-8：**71.9**；GPT-5.5：**65.9**；Gemini-3.5-Flash：**62.6**
- 开源权重：GLM-5.1 **58.2**；MiniMax-M3 **57.2**；Kimi-K2.6 **57.1**；GLM-5 **49.4**；Kimi-K2.5 **49.2**
- 本地模型推荐起点 **Qwen3.6-35B-A3B**

[来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/llms/llms.mdx)

### 5.3 历史官方成绩（2025）

- 2025-04-17 官方博客：单轨迹 **60.6%** → 5 次尝试 **66.4%**（推理时扩展 + 自训练 critic 模型，Qwen2.5-Coder-32B 精调）[来源](https://www.openhands.dev/blog/sota-on-swe-bench-verified-with-inference-time-scaling-and-critic-model)。
- 2025-11-18 融资博客：累计 **65,000+ stars、7,000+ forks、300 万+ 下载** [来源](https://www.openhands.dev/blog/weve-just-raised-18-8m-to-build-the-open-standard-for-autonomous-software-development)。

### 5.4 第三方 2026 数字（可信度分级）

- DEV 评测（2026-06-02）：**Claude Sonnet 4.5 在 V1 SDK harness 上约 72%**；**Devstral 24B 约 46.8%**（作 OpenHands 后端时）[来源](https://dev.to/jovan_chan_9500711396d4e6/openhands-review-2026-open-source-ai-coding-agent-72-swe-bench-and-the-self-hosting-catch-1a8c)。
- ⚠️ **存疑来源**：the-agent-report.com（2026-09-16）称「All Hands AI 于 **2026-09-08 发布 OpenHands 1.0**，Qwen3-Coder-480B 达 **68%**、Claude Sonnet 4.5 达 **72%**」。该文与可核事实冲突——同日可查的 release 已是 **v1.23.0**，且 **2026-09-11 才发 v1.18.0**，1.0 不可能在 9 月发布；其引用的二手源（ByteIota/TechPillow）亦未核实。**判定为低可信/疑似回收旧内容** [来源](https://the-agent-report.com/2026/09/openhands-1-0-coding-agent-sandbox/)、[来源](https://api.github.com/repos/OpenHands/OpenHands/releases/latest)、[来源](https://newreleases.io/project/github/OpenHands/OpenHands/release/v1.18.0)。
- 官方 benchmark 仓库支持的项目（2026）：**SWE-Bench、SWE-Bench Pro、GAIA、Commit0、OpenAgentSafety、ProgramBench**，全部状态 Active [来源](https://raw.githubusercontent.com/OpenHands/benchmarks/main/README.md)。

---

## 6. 企业版 / 自托管

### 6.1 能力矩阵（官方 Enterprise vs OSS 对照）

| 能力 | Canvas(本地) | Canvas(VM) | Cloud(托管) | Enterprise(自托管) |
|---|---|---|---|---|
| 隔离沙箱 | — | 路线图中 | ✓ | ✓ |
| 认证授权 / RBAC | — | — | ✓ | ✓（**Keycloak**） |
| 多用户组织 | — | — | ✓ | ✓ |
| **SAML** | — | — | — | ✓ |
| 自定义 runtime 镜像 | — | — | — | ✓ |
| **LLM 网关与预算** | — | — | — | ✓（**LiteLLM**） |
| 可观测性 | — | — | — | ✓（**Laminar**） |
| 插件市场 | — | — | — | ✓ |
| 许可证 | Open Source | Open Source | Commercial SaaS | Commercial |

[来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/enterprise-vs-oss.mdx)

- 官方 Enterprise 文档另列：用户数 Unlimited；BYOK；SSO/SAML ✓；多用户 RBAC ✓；优先支持 ✓；**无 per-seat 授权费**；数据全留在自有基础设施 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/index.mdx)。
- 营销页明确列 **"Complete audit logs for every agent action"**、prompt injection 检测与自动 halt、按项目/团队设预算、按 session 追踪 token 成本 [来源](https://www.openhands.dev/enterprise)。

### 6.2 Kubernetes / Helm

- 支持两种安装：**Replicated 嵌入式集群（单 VM，k0s）** 与 **Helm（已有 K8s）** [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/sizing-guide.mdx)。
- K8s 组件：OpenHands Server、Runtime API、Runtimes(沙箱)、**Keycloak**、**LiteLLM Proxy**、**PostgreSQL**、**Redis**、Conversation Bucket(S3 兼容)、Image Loader [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/k8s-install/index.mdx)。
- 需要安装 **Sysbox** runtime 才能安全跑沙箱 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/k8s-install/index.mdx)。
- Helm chart：`helm upgrade openhands oci://registry.replicated.com/openhands/openhands -n openhands --values values.yaml` [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/analytics.mdx)。
- **门槛**：官方写明「Kubernetes 安装目前仅对**经申请筛选的客户**开放」[来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/k8s-install/index.mdx)。
- 建议双节点池：**sandbox 池 16 vCPU / 64 GiB / 400 GiB SSD**（带 taint），**platform 池 8 vCPU / 32 GiB / 100 GiB** [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/sizing-guide.mdx)。

### 6.3 容量规划（这是"重资源"的硬证据）

- 单沙箱配额：**0.5 vCPU / 4 GiB 内存 / 10 GiB 节点盘 / 10 GiB 卷存储** [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/sizing-guide.mdx)。
- 单 VM 档位：5 并发沙箱→8 vCPU/32 GiB/500 GiB SSD；15→16 vCPU/64 GiB/1 TiB；30→32 vCPU/128 GiB/1.5 TiB；50→64 vCPU/256 GiB/3 TiB；100→96 vCPU/384 GiB/4 TiB；**超过 100 必须走 K8s** [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/sizing-guide.mdx)。
- K8s 档位：10 峰值沙箱→1–1 sandbox 节点 + 2 platform 节点 + 1 TiB 卷；100→1–10 节点 + 3 platform + 10 TiB；1000→5–96 节点 + 5 platform + 100 TiB，PostgreSQL 需独占节点 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/sizing-guide.mdx)。

### 6.4 SSO / SAML

- 支持 SAML SSO，IdP 可为 Okta、Microsoft Entra ID、Google Workspace、ADFS [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/integrations/saml-sso.mdx)。
- ACS(Reply) URL：`https://<auth-hostname>/realms/allhands/broker/enterprise_sso/endpoint`；Entity ID：`https://<auth-hostname>/realms/allhands`；NameID 建议 `persistent` 或 `email`；必须回传 `email`（必需）、`firstName`/`lastName`（建议）[来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/integrations/saml-sso.mdx)。
- **IdP 必须签名断言并提供签名证书**，否则 OpenHands 会跳过创建 SSO provider，用户回落到内置登录页 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/integrations/saml-sso.mdx)。
- 实测坑：`curl -sL "<metadata>" | grep -c X509Certificate` 返回 **0** 即会失败 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/integrations/saml-sso.mdx)。
- **air-gapped / 纯离线部署：官方文档未出现该表述，未核实**（只提到 on-premises / private cloud / VPC）[来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/index.mdx)。

### 6.5 LLM provider 支持

- 底座是 **LiteLLM**，理论上「任何 LiteLLM 支持的模型」都能接 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/llms/llms.mdx)。
- 官方 provider 指南列表：**AWS Bedrock、Azure、Google、Groq、本地 LLM(SGLang/vLLM)、LiteLLM Proxy、Moonshot AI、OpenAI、OpenHands、OpenRouter** [来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/llms/llms.mdx)。
- 本地模型路径：**Ollama、LM Studio、vLLM、SGLang**；Enterprise 自托管推荐起点 Qwen3.6-35B-A3B [来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/llms/llms.mdx)。
- BYOK 明确列举：Anthropic、OpenAI、**AWS Bedrock、Azure OpenAI、Google Vertex AI** [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/index.mdx)。
- 可设环境变量：`LLM_API_VERSION`、`LLM_EMBEDDING_MODEL`、`LLM_DROP_PARAMS`、`LLM_DISABLE_VISION`、`LLM_CACHING_PROMPT`；重试参数默认 `LLM_NUM_RETRIES=4`、`LLM_RETRY_MIN_WAIT=5s`、`LLM_RETRY_MAX_WAIT=30s`、`LLM_RETRY_MULTIPLIER=2` [来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/llms/llms.mdx)。
- 官方显式 WARNING：**OpenHands 会向 LLM 发大量 prompt，务必设置消费上限并监控** [来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/llms/llms.mdx)。
- OpenHands Enterprise 集成：GitHub、GitLab、**Azure Repos/Boards**、**Bitbucket Data Center**、Jira Cloud、**Jira Data Center**、Slack、外部 LLM 网关、外部可观测平台 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/index.mdx)。

---

## 7. 已知批评与短板（均附可核来源）

### 7.1 安全：运行任意代码的护栏结构性失效

- **GuardFall（Adversa AI 研究，SecurityAffairs 2026-07-01 报道）**：11 个主流开源 AI agent 中 **10 个**存在可绕过的 shell 注入缺陷，OpenHands 在列（同批还有 Hermes、opencode、Goose、Cline、Roo-Code、Aider、Plandex、Open Interpreter、SWE-agent；唯一未中招的是 Continue），样本合计约 **548,000 stars** [来源](https://securityaffairs.com/194546/ai/guardfall-flaw-hits-10-of-11-popular-open-source-ai-agents.html)。
- 报告关键论点：**过滤检查字符串、bash 执行语义**，两者不同；5 类绕过（引号移除 `r''m`、`$IFS`、命令替换、base64 管道、Class E「带特定 flag 才变危险的 POSIX 工具」如 `find -delete`/`dd of=/dev/sda`/`install -m 4755`）[来源](https://securityaffairs.com/194546/ai/guardfall-flaw-hits-10-of-11-popular-open-source-ai-agents.html)。
- **对 OpenHands 的直接测试结论**：在 **local mode**（无容器）下实弹验证，**破坏性命令确实在宿主上执行成功**；沙箱只提供「一次性盒子」保护，一旦工作区非一次性或关闭容器，保护即消失；多数被测 agent 都提供关闭容器的 local-mode 配置 [来源](https://securityaffairs.com/194546/ai/guardfall-flaw-hits-10-of-11-popular-open-source-ai-agents.html)。
- 缓解建议：用重定向 `$HOME` 的 scoped shell 运行 agent（把 `~/.ssh/`、`~/.aws/`、shell history 移出范围）；在 agent 读取前审计仓库配置；CI 中对 fork PR 关闭 agent 执行 [来源](https://securityaffairs.com/194546/ai/guardfall-flaw-hits-10-of-11-popular-open-source-ai-agents.html)。

### 7.2 官方自己文档里承认的安全风险

- 自托管文档 WARNING：**agent server 直接跑在宿主上，对文件系统/环境变量/网络有完全访问权**；「谁能访问 agent server，谁就能获得同等权限」[来源](https://raw.githubusercontent.com/OpenHands/OpenHands/main/docs/SELF_HOSTING.md)。
- 内置 OpenVSCode 与 Canvas **共享同一浏览器 origin**：任何在该 origin 上运行的脚本（含扩展或受损资源）可读取 Canvas 的 `localStorage`，其中保存着**该浏览器中注册过的每一个 backend 的 session API key**（官方 issue #16492）[来源](https://raw.githubusercontent.com/OpenHands/OpenHands/main/docs/SELF_HOSTING.md)。
- npm 直装 / 源码直跑两条路径官方都标注 "WARNING: ... the agent will have full access to your filesystem!" [来源](https://raw.githubusercontent.com/OpenHands/OpenHands/main/README.md)。
- 官方 FAQ 承认：**没有内置认证、隔离或可扩展性，不适合多租户**，定位是单用户本地工作站 [来源](https://docs.openhands.dev/overview/faqs)。
- skill 安装警示：skill 本身不授予权限，但可指示 agent 跑脚本、读文件、用 secrets、调外部工具，只装可信来源 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/overview/skills.mdx)。

### 7.3 成本 / token 消耗

- 官方 issue **#6893「[Bug]: burning though input tokens like hot knife though butter」** 存在（标题可核；正文因 GitHub HTML 页面为 JS 渲染未取到）[来源](https://github.com/OpenHands/OpenHands/issues/6893)。
- 官方文档 WARNING 明确要求设置消费上限 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/llms/llms.mdx)。
- 第三方评测：自托管无 seat 费但「you manage Docker infrastructure and compute」，团队规模化时的运维成本是主要 TCO [来源](https://theaiagentindex.com/blog/openhands-review-2026)。
- 单例成本参考（官方 index）：SWE-bench $0.75/例、GAIA $1.17/例、**Commit0 高达 $7.83/例** [来源](https://raw.githubusercontent.com/OpenHands/openhands-index-results/main/results/claude-opus-4-8/scores.json)。

### 7.4 Docker 资源与部署复杂度

- 官方企业容量表：每沙箱 **0.5 vCPU + 4 GiB + 10 GiB 盘**，100 并发需 **96 vCPU/384 GiB** 单机或 K8s 集群 [来源](https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/sizing-guide.mdx)。
- 社区 issue 仍在追问最低磁盘/内存/CPU 要求（**#6230**）、沙箱内存上限（**#4450**）、docker runtime 从前端走很慢（**#6259**）[来源](https://github.com/OpenHands/OpenHands/issues/6230)、[来源](https://github.com/OpenHands/OpenHands/issues/4450)、[来源](https://github.com/OpenHands/OpenHands/issues/6259)。
- 第三方评测《OpenHands Review 2026》列出的具体痛点：**强依赖 Docker**，CI 里必须挂 `/var/run/docker.sock`，带来端口映射/权限/资源分配问题；`SANDBOX_RUNTIME_CONTAINER_IMAGE` 与 `openhands` 镜像 tag 不一致会立刻以晦涩错误启动失败；**git 凭据处理不可靠**（有时直接推默认分支、取不到 PR 评论与 status check）；**无原生 secrets 管理**（只能靠环境变量注入，无内置 secret store 或掩码）；browser 工具链是最不稳定的一环 [来源](https://dev.to/jovan_chan_9500711396d4e6/openhands-review-2026-open-source-ai-coding-agent-72-swe-bench-and-the-self-hosting-catch-1a8c)。
- 评测同时记录了官方缓解：v1.7.0 加入 `SANDBOX_KVM_ENABLED` 透传 KVM 加速，但**并未移除 Docker 依赖** [来源](https://dev.to/jovan_chan_9500711396d4e6/openhands-review-2026-open-source-ai-coding-agent-72-swe-bench-and-the-self-hosting-catch-1a8c)。
- 任务范围要求高：模糊需求（如「refactor the authentication system」）会产出部分或错误方案，本质是「能干的初级工程师而非高级架构师」，每个 PR 仍需人工 review [来源](https://theaiagentindex.com/blog/openhands-review-2026)。
- 企业能力被墙：多用户 RBAC、SAML/SSO、集中计费、Large Codebase SDK **均需联系销售的定制报价，无法自助评估成本** [来源](https://theaiagentindex.com/blog/openhands-review-2026)。
- 提示注入相关社区 issue：**#10939**「Openhands May Suffer from Malicious Guide Injection via Tavily」[来源](https://github.com/OpenHands/OpenHands/issues/10939)（该 URL 来自搜索结果，本次未逐一抓取正文 → 标题级证据）。

---

## 8. 2026 年及近期重大事件

- **融资（2025-11-18，非 2026）**：**$18.8M Series A**，由 **Madrona** 领投，跟投方 **Menlo Ventures、Pillar VC、Obvious Ventures、Fujitsu Ventures、Alumni Ventures**；同时宣布与 **AMD** 战略合作（Lemonade Server 集成，Ryzen AI PC 本地 agent）[来源](https://www.openhands.dev/blog/weve-just-raised-18-8m-to-build-the-open-standard-for-autonomous-software-development)。
- **组织改名（2025-10）**：GitHub org `All-Hands-AI` → `OpenHands`，GHCR 镜像路径同步迁移 [来源](https://api.github.com/repos/OpenHands/OpenHands/issues/11376)。
- **主产品重命名 + 定位转向（2026-06-16）**：发布 **Agent Canvas**，作为 OpenHands 的「新界面」；主仓库 `OpenHands/OpenHands` 从「OpenHands 单体应用」变为 **Agent Canvas 前端 + 控制中心**；官方明确 "Agent Canvas is becoming the main interface for OpenHands" [来源](https://www.openhands.dev/blog/introducing-agent-canvas)。
- **V0 → V1 SDK 拆分（2025-11）**：Software Agent SDK 独立成仓（`software-agent-sdk`，建仓 2025-08-23），V0 旧架构快照归档到 `OpenHands/legacy` [来源](https://api.github.com/repos/OpenHands/software-agent-sdk)、[来源](https://raw.githubusercontent.com/OpenHands/docs/main/overview/introduction.mdx)。第三方称 V0→V1 拆分发生在 2025 年 11 月，并提醒**大量社区教程仍在描述 V0 架构**，是踩坑主因 [来源](https://dev.to/jovan_chan_9500711396d4e6/openhands-review-2026-open-source-ai-coding-agent-72-swe-bench-and-the-self-hosting-catch-1a8c)。
- **2026-07-27**：`OpenHands/enterprise` 仓库公开建立 [来源](https://api.github.com/orgs/OpenHands/repos?per_page=100&sort=pushed)。
- **2026-08**：Agent Canvas 密集发布 **8 个版本（v1.9.0 → v1.16.0）**；引入 Apps Beta（在 Canvas 内嵌自定义页面）、自动化 live phase、per-run LLM 成本、Provider Connections、自动化 Git Sync；当月 **47 位社区贡献者合入 168 个 PR** [来源](https://www.openhands.dev/blog/new-in-agent-canvas-august-2026)。
  - ⚠️ 同期官方安全注记：**启用的 Canvas Apps 与 Agent Canvas 在同一浏览器上下文执行 JS，不在 iframe/worker 中隔离**，只能启用可信代码 [来源](https://www.openhands.dev/blog/new-in-agent-canvas-august-2026)。
- **2026-09**：v1.18.0（09-11）→ **v1.23.0（09-23）** 连续发版；v1.23.0 新增 universal macOS DMG、Light+/Solarized Light 主题、消费 SDK 1.49.5 与 Automation 1.15.0 [来源](https://newreleases.io/project/github/OpenHands/OpenHands/release/v1.18.0)、[来源](https://api.github.com/repos/OpenHands/OpenHands/releases/latest)。
- **许可证变化**：核心仓库**仍是 MIT，未发现 2026 年变更**；**企业/云仓库是 PolyForm Free Trial 1.0.0**（自然年 >30 天须商业许可）[来源](https://api.github.com/repos/OpenHands/OpenHands)、[来源](https://raw.githubusercontent.com/OpenHands/enterprise/main/LICENSE)。
- **CLI 停止维护**（README 明示），**typescript-client 归档** [来源](https://raw.githubusercontent.com/OpenHands/OpenHands-CLI/main/README.md)、[来源](https://api.github.com/orgs/OpenHands/repos?per_page=100&sort=pushed)。
- **2026 年的收购/新一轮融资：未核实**。搜索仅得到二手聚合站（The Agent Times 等）提及 "acquisition buzz"，无可信一手公告；BusinessWire 的 Series A 稿件抓取失败 [来源](https://www.businesswire.com/news/home/20251118768131/en/OpenHands-Raises-$18.8M-Series-A-to-Bring-Open-Source-Cloud-Coding-Agents-to-Enterprises)（抓取失败）。

---

## 9. 明确未能核实的项（汇总）

1. **"OpenHands 1.0" 的确切发布日期** —— v1.0.0 tag 返回 404，release 列表 API 被限流。第三方称 2026-09-08 发布 1.0，与 v1.23.0/v1.18.0 的时间线冲突，判定不可信。
2. **Cloud 的 $20/月档是否仍存在** —— 官方价格页今天无此档；`app.all-hands.dev/pricing` 为空页，Wayback 抓取失败。
3. **免费 credits 的确切数字** —— 官方页面未列。
4. **公司是否正式更名为 "OpenHands, Inc."** —— 商标页 403；隐私政策与 LICENSE 均显示 All Hands AI。
5. **air-gapped / 纯离线部署支持** —— 官方文档未出现该词。
6. **企业版具体报价** —— 官方明确「Custom pricing」，无公开数字。
7. **社区 issue 正文**（#6893 / #10939 / #6230 / #4450 / #6259）—— GitHub HTML 为 JS 渲染，本次仅取到标题与编号，未取到正文与讨论。
8. **2026 年是否有收购或新融资** —— 未找到可信一手来源。
9. **OpenHands Index 的 "swe-bench" 是否 100% 等价 SWE-bench Verified** —— 依据 benchmarks 仓库默认数据集为 `SWE-bench_Verified` 推断，官方未逐字声明。
10. **HuggingFace 上 openhands-index 数据集的官方 README**（基准定义）—— 抓取失败。
11. **第三方评测中的 V0 遗留细节**（如 `SANDBOX_RUNTIME_CONTAINER_IMAGE` 版本必须完全一致）—— 仅单一第三方来源，官方文档未确认。

---

## 10. 本次实际成功抓取的 URL 清单

**GitHub API / 官方仓库原始文件**
1. https://api.github.com/repos/OpenHands/OpenHands
2. https://api.github.com/repos/OpenHands/OpenHands/releases/latest
3. https://api.github.com/repos/OpenHands/OpenHands/commits?per_page=5
4. https://api.github.com/repos/OpenHands/OpenHands/issues/11376
5. https://api.github.com/repos/OpenHands/software-agent-sdk
6. https://api.github.com/orgs/OpenHands/repos?per_page=100&sort=pushed
7. https://api.github.com/search/repositories?q=org:OpenHands&per_page=100&sort=updated
8. https://api.github.com/repos/OpenHands/docs/contents/enterprise
9. https://raw.githubusercontent.com/OpenHands/OpenHands/main/README.md
10. https://raw.githubusercontent.com/OpenHands/OpenHands/main/docs/SELF_HOSTING.md
11. https://raw.githubusercontent.com/OpenHands/OpenHands-CLI/main/README.md
12. https://raw.githubusercontent.com/OpenHands/software-agent-sdk (via API #5)
13. https://raw.githubusercontent.com/OpenHands/enterprise/main/LICENSE
14. https://raw.githubusercontent.com/OpenHands/OpenHands-Cloud/main/LICENSE
15. https://raw.githubusercontent.com/OpenHands/benchmarks/main/README.md
16. https://raw.githubusercontent.com/OpenHands/benchmarks/main/benchmarks/swebench/README.md
17. https://raw.githubusercontent.com/OpenHands/openhands-index-results/main/README.md
18. https://raw.githubusercontent.com/OpenHands/openhands-index-results/main/results/claude-opus-4-8/scores.json

**官方文档（docs.openhands.dev / raw MDX）**
19. https://docs.openhands.dev/overview/introduction
20. https://raw.githubusercontent.com/OpenHands/docs/main/overview/introduction.mdx
21. https://raw.githubusercontent.com/OpenHands/docs/main/overview/skills.mdx
22. https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/agent-canvas/overview.mdx
23. https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/agent-canvas/architecture.mdx
24. https://raw.githubusercontent.com/OpenHands/docs/main/openhands/usage/llms/llms.mdx
25. https://docs.openhands.dev/openhands/usage/llms/llms
26. https://docs.openhands.dev/openhands/usage/cloud/openhands-cloud
27. https://docs.openhands.dev/overview/faqs
28. https://docs.openhands.dev/enterprise
29. https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/index.mdx
30. https://docs.openhands.dev/enterprise/enterprise-vs-oss
31. https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/enterprise-vs-oss.mdx
32. https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/sizing-guide.mdx
33. https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/analytics.mdx
34. https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/k8s-install/index.mdx
35. https://raw.githubusercontent.com/OpenHands/docs/main/enterprise/integrations/saml-sso.mdx
36. https://raw.githubusercontent.com/OpenHands/docs/main/sdk/arch/events.mdx

**官网 / 博客 / 定价**
37. https://www.openhands.dev/
38. https://www.openhands.dev/pricing
39. https://www.openhands.dev/enterprise
40. https://www.openhands.dev/privacy
41. https://www.openhands.dev/blog/sota-on-swe-bench-verified-with-inference-time-scaling-and-critic-model
42. https://www.openhands.dev/blog/weve-just-raised-18-8m-to-build-the-open-standard-for-autonomous-software-development
43. https://www.openhands.dev/blog/introducing-agent-canvas
44. https://www.openhands.dev/blog/new-in-agent-canvas-august-2026
45. https://app.all-hands.dev/
46. https://app.all-hands.dev/pricing

**第三方（评测 / 安全 / 聚合）**
47. https://dev.to/jovan_chan_9500711396d4e6/openhands-review-2026-open-source-ai-coding-agent-72-swe-bench-and-the-self-hosting-catch-1a8c
48. https://theaiagentindex.com/blog/openhands-review-2026
49. https://codeables.dev/article/openhands-cloud-pricing-what-do-i-get-on-the-free-tier-vs-the-20
50. https://the-agent-report.com/2026/09/openhands-1-0-coding-agent-sandbox/
51. https://securityaffairs.com/194546/ai/guardfall-flaw-hits-10-of-11-popular-open-source-ai-agents.html
52. https://newreleases.io/project/github/OpenHands/OpenHands/release/v1.18.0

**抓取失败的 URL（供参考）**
- https://api.github.com/repos/OpenHands/OpenHands/releases?per_page=100 → 403 限流
- https://github.com/OpenHands/OpenHands/releases/tag/v1.0.0 → 404
- https://www.trademarkelite.com/trademark/trademark-detail/99583644/OPENHANDS → 403
- https://huggingface.co/datasets/OpenHands/openhands-index/raw/main/README.md → fetch failed
- https://web.archive.org/web/20260701000000/https://www.openhands.dev/pricing → fetch failed
- http://archive.org/wayback/available?... → fetch failed
- https://www.businesswire.com/news/home/20251118768131/en/... → fetch failed
- https://index.openhands.dev/home → 返回空内容
- https://shop.zimaspace.com/pages/openhands-hardware-requirements → 内容被截断，无有效正文
- https://raw.githubusercontent.com/OpenHands/OpenHands/main/enterprise/LICENSE → 404
- https://raw.githubusercontent.com/OpenHands/docs/main/overview/skills/index.mdx → 404
- https://www.openhands.dev/faq → 404
