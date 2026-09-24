# SWE-agent / Princeton 生态 研究简报

**观察日期：2026-09-24**（所有 URL 均为本日实际抓取；GitHub API 的 `updated_at` 亦显示 2026-09-24）
**核实方式**：仅使用 `web_search` / `web_fetch` 实抓内容，不依赖记忆。未能核实者标「未核实」。

---

## 0. 三条会改变整体叙事的关键结论（先读）

1. **SWE-agent 项目已自我降级为 legacy。** 官方 README 顶部警告原文："Most of our current development effort is on mini-swe-agent, which has superseded SWE-agent. It matches the performance of SWE-agent, while being much simpler. … Our general recommendation is to use mini-SWE-agent instead of SWE-agent going forward."[来源](https://raw.githubusercontent.com/SWE-agent/SWE-agent/main/README.md) 官方文档站每页顶部也挂着横幅："We now recommend mini-swe-agent instead of SWE-agent: Same performance, much more simple & flexible"[来源](https://swe-agent.com/latest/faq/) 官方 benchmark 站导航栏已把它标注为 **"SWE-agent (legacy)"**[来源](https://www.swebench.com/)
2. **SWE-agent 最新 release 停在 2025-05-22，不是 2026 年。** 详见 §1、§8。
3. **不存在官方 "SWE-agent 2.0"**，且已验证那条宣称它存在的第三方博客指向的仓库返回 404。详见 §2。

---

## 1. SWE-agent 本体、学术属性、仓库状态、ACI

### 1.1 它是什么
SWE-agent 让用户自选的 LM 自主使用工具去**修复真实 GitHub 仓库里的 issue**，官方描述同时强调可用于进攻性网络安全（CTF）与竞赛编程，并明确标注 `[NeurIPS 2024]`[来源](https://api.github.com/repos/SWE-agent/SWE-agent) 官方对自身定位是"academic project"：README 称 "SWE-agent is built and maintained by researchers from Princeton University and Stanford University"，作者为 John Yang\*、Carlos E. Jimenez\*、Alexander Wettig、Kilian Lieret、Shunyu Yao、Karthik Narasimhan、Ofir Press，联系邮箱含 `johnby@stanford.edu`、`carlosej@cs.princeton.edu`、`kl5675@princeton.edu`[来源](https://raw.githubusercontent.com/SWE-agent/SWE-agent/main/README.md)

README 的四条卖点原文包含 "✅ **Made for research**: Simple & hackable by design"[来源](https://raw.githubusercontent.com/SWE-agent/SWE-agent/main/README.md)

### 1.2 论文（NeurIPS 2024）与数字
- 标题：*SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering*，arXiv:2405.15793，v1 提交 2024-05-06，v3 修订 2024-11-11[来源](https://arxiv.org/abs/2405.15793)
- 会议：Thirty-eighth Annual Conference on Neural Information Processing Systems（NeurIPS 2024）[来源](https://raw.githubusercontent.com/SWE-agent/SWE-agent/main/README.md)
- 论文摘要给出的成绩：在 SWE-bench 上 **pass@1 = 12.5%**，在 HumanEvalFix 上 **87.7%**[来源](https://arxiv.org/abs/2405.15793)
- 官方 SWE-bench 页面对该成绩的表述略有差异：SWE-agent 是"首个用于软件工程任务的 agent 类 AI 系统，在 SWE-bench 上取得 **12.47%**"，而 2023 年 10 月最初的 RAG baseline 只有 **1.96%**[来源](https://www.swebench.com/original.html)

### 1.3 仓库当前状态（GitHub API 实抓）
| 字段 | 值 |
|---|---|
| stars | **20395** [来源](https://api.github.com/repos/SWE-agent/SWE-agent) |
| license | **MIT**（SPDX: MIT）[来源](https://api.github.com/repos/SWE-agent/SWE-agent) |
| language | **Python** [来源](https://api.github.com/repos/SWE-agent/SWE-agent) |
| pushed_at | **2026-09-21T22:02:50Z** [来源](https://api.github.com/repos/SWE-agent/SWE-agent) |
| updated_at | 2026-09-24T13:14:40Z [来源](https://api.github.com/repos/SWE-agent/SWE-agent) |
| archived | **false**（未归档）[来源](https://api.github.com/repos/SWE-agent/SWE-agent) |
| forks / subscribers / open issues | 2234 / 112 / 119 [来源](https://api.github.com/repos/SWE-agent/SWE-agent) |
| created_at | 2024-04-02 [来源](https://api.github.com/repos/SWE-agent/SWE-agent) |
| homepage | https://swe-agent.com [来源](https://api.github.com/repos/SWE-agent/SWE-agent) |

用户提供的三分项（stars 20395 / MIT / last push 2026-09-21）**全部确认**；语言 Python 亦确认。

**但 pushed_at 具有误导性**：main 分支最后一个 commit 实际是 **2026-07-16**（`3ea751c0`，"fix: map multimodal subset to sb-cli's swe-bench-m (#1458)"），其后 5 条 commit 分别落在 2026-07-16、2026-07-16、2026-07-07、2026-07-07、2026-07-07[来源](https://api.github.com/repos/SWE-agent/SWE-agent/commits?per_page=5) 2026-09-21 那次 push 不在 main 上；同一时刻 SWE-agent（22:02:50）、mini-swe-agent（22:02:14）、SWE-ReX（22:03:00）三个仓库几乎同秒被 push[来源](https://api.github.com/repos/SWE-agent/SWE-agent)、[来源](https://api.github.com/repos/SWE-agent/mini-swe-agent)、[来源](https://api.github.com/orgs/SWE-agent/repos) 具体触发原因「未核实」（疑似 bot / 非默认分支推送）。

### 1.4 最新 release tag + 日期（用户要求确认）
**最新 release = `v1.1.0`，发布于 2025-05-22T16:11:39Z**，标题 "v1.1.0: 10s of thousands of training trajectories"[来源](https://api.github.com/repos/SWE-agent/SWE-agent/releases/latest)

完整 release 序列（近 10 条）[来源](https://api.github.com/repos/SWE-agent/SWE-agent/releases?per_page=10)：

| tag | release 名称 | 发布日期 |
|---|---|---|
| v1.1.0 | 10s of thousands of training trajectories | **2025-05-22** |
| v1.0.1 | SOTA on SWE-Bench Full | 2025-02-28 |
| v1.0.0 | — | 2025-02-13 |
| v0.7.0 | **SWE-agent EnIGMA** | 2024-09-25 |
| v0.6.1 | — | 2024-06-20 |
| v0.6.0 | — | 2024-06-05 |
| v0.5.0 | — | 2024-05-28 |
| v0.4.0 | 0.4.0 Web UI | 2024-05-09 |
| v0.3.0 | — | 2024-05-02 |
| v0.2.0 | — | 2024-04-15 |

→ **距观察日已 16 个月没有新 release**。注意 v0.7.0 的 release *名称* 与 tag 不同（名为 EnIGMA），这正是容易误判版本号的地方。

### 1.5 Agent-Computer Interface (ACI) 概念
ACI 的核心定义（官方文档原文）："An ACI is essentially a set of tools and interaction format that allows an agent to interact with a computer-based environment, to perform tasks, such as software engineering."[来源](https://swe-agent.com/latest/background/aci/) 官方立场是"good ACI design leads to much better results when using agents"，并称论文证明"a baseline agent without a well-tuned ACI does much worse than SWE-agent"[来源](https://swe-agent.com/latest/background/aci/)

文档列出的四项 ACI 具体设计[来源](https://swe-agent.com/latest/background/aci/)：
1. **linter**：编辑命令触发时运行，语法不正确则不允许该编辑落地；
2. **专用 file viewer**（代替 `cat`）：**每轮只显示 100 行**效果最好，配套的 file editor 支持上下滚动与文件内搜索；
3. **专用目录字符串搜索命令**：只列出"至少命中一次的文件"，官方发现展示每条命中的更多上下文反而让模型困惑；
4. 命令输出为空时返回 "Your command ran successfully and did not produce any output."

值得注意的对照：mini-swe-agent 已**基本放弃 ACI 思路**——它"除 bash 外没有任何工具，甚至不使用 LM 的 tool-calling 接口"[来源](https://raw.githubusercontent.com/SWE-agent/mini-swe-agent/main/README.md) 这说明"ACI 是必需品"的立场在两年内被团队自己修正。

---

## 2. 是否存在 "SWE-agent 2.0"？—— **不存在，且有明确的伪造证据**

**结论：不存在官方 "SWE-agent 2.0"。** 用户要求"若无则说未核实"，此处可以更进一步——已验证其唯一明显来源是虚构内容：

- 存在一篇第三方博客标题即为 "SWE-agent 2.0: Open-Source Autonomous AI Software Engineering"，署名 **Yuval Avidani**，发布于 **2026-03-13**，站点 yuv.ai[来源](https://yuv.ai/blog/swe-agent-v2)
- 该文声称项目仓库是 `https://github.com/princeton-nlp/SWE-agent-v2`，并给出 `git clone https://github.com/princeton-nlp/SWE-agent-v2.git` 的 quick start[来源](https://yuv.ai/blog/swe-agent-v2)
- **实抓该 URL 返回 HTTP 404**（"Page not found"）[来源](https://github.com/princeton-nlp/SWE-agent-v2) → 仓库不存在
- 该文其它内容也与事实不符：它把 SWE-agent 描述为"operates through a reinforcement learning feedback loop"、用 `python run.py --model gpt-4 --repo_path … --issue_number 123` 作示例命令，而 SWE-agent 真实的 CLI 是 `sweagent run …` 并基于 yaml 配置 + litellm[来源](https://yuv.ai/blog/swe-agent-v2)、[来源](https://swe-agent.com/latest/usage/cli/)
- 官方 release 列表（§1.4，共 10 条，latest = v1.1.0）中不存在任何 2.0[来源](https://api.github.com/repos/SWE-agent/SWE-agent/releases?per_page=10)

**最可能的混淆源**：真正的 "v2" 属于 **mini-swe-agent**（mini-swe-agent **v2**）。其 README 明确写 "This is **mini-swe-agent v2**. Read the migration guide. For the previous version, check out the v1 branch."[来源](https://raw.githubusercontent.com/SWE-agent/mini-swe-agent/main/README.md) 且 mini-swe-agent 确实处在 2.x 版本线上（latest `v2.4.6`，2026-07-23）[来源](https://api.github.com/repos/SWE-agent/mini-swe-agent/releases/latest)

> 补充：SWE-agent 的 GitHub tags 列表本次抓取被 API 限流（HTTP 403 "API rate limit exceeded"），故未能逐 tag 复核；但 release 列表已覆盖全部 10 个发布，结论不依赖 tags。

---

## 3. mini-SWE-agent：100 行 agent、>74%、license / stars / commit

### 3.1 仓库状态（GitHub API 实抓）
| 字段 | 值 |
|---|---|
| stars | **7948** [来源](https://api.github.com/repos/SWE-agent/mini-swe-agent) |
| forks / subscribers / open issues | 1082 / 23 / 76 [来源](https://api.github.com/repos/SWE-agent/mini-swe-agent) |
| license | **MIT** [来源](https://api.github.com/repos/SWE-agent/mini-swe-agent) |
| language | Python [来源](https://api.github.com/repos/SWE-agent/mini-swe-agent) |
| created_at / pushed_at | 2025-06-28 / 2026-09-21T22:02:14Z [来源](https://api.github.com/repos/SWE-agent/mini-swe-agent) |
| archived | false [来源](https://api.github.com/repos/SWE-agent/mini-swe-agent) |
| homepage | https://mini-swe-agent.com [来源](https://api.github.com/repos/SWE-agent/mini-swe-agent) |

**最后一个 commit（main）= 2026-09-03**，作者 John Yang，内容 "Update programbench task prompt"（另有一条同分钟 merge）[来源](https://api.github.com/repos/SWE-agent/mini-swe-agent/commits?per_page=5)
**最新 release = `v2.4.6`，发布于 2026-07-23T03:12:33Z**[来源](https://api.github.com/repos/SWE-agent/mini-swe-agent/releases/latest)

### 3.2 "100 行"的确切范围
README 原文："**Minimal**: Just some 100 lines of python for the [agent class] (and a bit more for the environment, model, and run script) — no fancy dependencies!"[来源](https://raw.githubusercontent.com/SWE-agent/mini-swe-agent/main/README.md) 官方文档同样写 "Just [100 lines of python] (+100 total for env, model, script)"[来源](https://mini-swe-agent.com/latest/)
→ 即 **agent class ≈ 100 行**，加上 env/model/script 再约 100 行。注意区分口径：Simon Willison 描述整个 mini-swe-agent 项目为 "**~9,000 lines of Python**"[来源](https://simonwillison.net/2026/feb/19/swe-bench/) —— "100 行"指的是核心 agent 类，不是整个仓库。

### 3.3 >74% 的准确出处与对应模型（用户重点要求）
- **repo 与官网均只给区间、不指名模型**："**Performant:** Scores **>74%** on the SWE-bench verified benchmark; starts much faster than Claude Code"[来源](https://raw.githubusercontent.com/SWE-agent/mini-swe-agent/main/README.md)、[来源](https://mini-swe-agent.com/latest/) GitHub 仓库的 description 字段也写作 "…but scores >74% on SWE-bench verified!"[来源](https://api.github.com/repos/SWE-agent/mini-swe-agent)
- **可追溯到的具体模型 = Gemini 3 Pro**。官方文档站 News 条目原文："Nov 19: **Gemini 3 Pro reaches 74% on SWE-bench verified with mini-swe-agent!**"[来源](https://mini-swe-agent.com/latest/) → 74% 这一数字来自 Gemini 3 Pro（该 News 条目给出的 X 链接日期为 Nov 19）。
- **官方 rerun 的实际最新分数高于 74%**：SWE-bench 团队 2026-02 的重跑（全部模型统一用 mini-swe-agent scaffold，题目为同一 system prompt）前十分数为 **Claude 4.5 Opus (high reasoning) 76.8%**、Gemini 3 Flash (high) 75.8%、MiniMax M2.5 (high) 75.8%、Claude Opus 4.6 75.6%、GLM-5 (high) 72.8%、GPT-5.2 (high) 72.8%、Claude 4.5 Sonnet (high) 72.8%、Kimi K2.5 (high) 71.4%、DeepSeek V3.2 (high) 70.8%、Claude 4.5 Haiku (high) 70.0%[来源](https://simonwillison.net/2026/feb/19/swe-bench/)
→ 因此 ">74%" 是**保守表述**，实际当前最高约 **76.8%**（2026-02 官方快照）。
- 历史锚点：SWE-agent README News 记 "July 24: Mini-SWE-Agent achieves **65%** on SWE-bench verified in 100 lines of python!"[来源](https://raw.githubusercontent.com/SWE-agent/SWE-agent/main/README.md)

### 3.4 定位与技术差异（官方自述）
- v1.x 与 v2.x **结果不可直接比较**：2.x 用 tool calling 调用动作，1.x 从输出字符串解析动作；1.x 结果温度设为 0.0，2.x 不设温度[来源](https://www.swebench.com/verified.html)
- 采用方列表（README 原文）：Meta、NVIDIA、Essential AI、IBM、**Nebius**、Anyscale、Princeton University、Stanford University 等[来源](https://raw.githubusercontent.com/SWE-agent/mini-swe-agent/main/README.md)
- 官方建议："You should consider mini-swe-agent your default choice."[来源](https://raw.githubusercontent.com/SWE-agent/mini-swe-agent/main/README.md)

---

## 4. enigma 与 nexus

### 4.1 "enigma" 实际是 **EnIGMA** —— SWE-agent 的进攻性安全模式，不是独立新项目
- 含义：**En**hanced **I**nteractive **G**enerative **M**odel **A**gent，用于自主解 CTF 挑战。独立站点 enigma-agent.com，标题 "Interactive Tools Substantially Assist LM Agents in Finding Security Vulnerabilities"[来源](https://enigma-agent.com/)
- 作者单位横跨 Tel-Aviv University、NYU、NYU Abu Dhabi、Stanford，以及 **Princeton Language and Intelligence, Princeton University**[来源](https://enigma-agent.com/)
- 论文 arXiv:2409.16165；正式发表于 **ICML 2025**（"Forty-second International Conference on Machine Learning"）[来源](https://enigma-agent.com/)、[来源](https://arxiv.org/abs/2409.16165)
- 核心创新 _Interactive Agent Tools_（IAT）：首次让 LM agent 能运行交互式工具（**gdb** 调试器、server 连接工具）；另引入 **Summarizer** 处理长输出[来源](https://enigma-agent.com/)、[来源](https://api.github.com/repos/SWE-agent/SWE-agent/releases?per_page=10)
- 实验规模：**390 个 CTF 挑战 / 4 个 benchmark**[来源](https://enigma-agent.com/)
- 具体成绩[来源](https://enigma-agent.com/)：

| Benchmark | 配置 | % Solved |
|---|---|---|
| NYU CTF | EnIGMA + Claude 3.5 Sonnet | **13.5** |
| NYU CTF | EnIGMA + GPT-4 Turbo (1106) | 7.0 |
| NYU CTF | NYU CTF agent + GPT-4 Turbo（对照） | 4.0 |
| InterCode-CTF | EnIGMA + GPT-4 Turbo (1106) | **72.0** |
| InterCode-CTF | InterCode-CTF Agent（对照） | 40.0 |
| CyBench | EnIGMA + Claude 3.5 Sonnet | **20.0** |
| CyBench | CyBench agent + Claude 3.5 Sonnet（对照） | 17.5 |
| HackTheBox | EnIGMA + Claude 3.5 Sonnet | **26.0** |

- v0.7.0 release notes 的官方口径："**3.3x improvement** over previous agents on the NYU CTF challenge dataset"[来源](https://api.github.com/repos/SWE-agent/SWE-agent/releases?per_page=10)
- 研究还提出 **soliloquizing** 现象（模型自生成幻觉观测而不与环境交互）并给出量化数据泄漏的方法[来源](https://enigma-agent.com/)
- 代码位置：**不是独立仓库，而是 SWE-agent 的 v0.7 分支**[来源](https://enigma-agent.com/) 且**至今未升级到 1.x**——enigma-agent.com 与 SWE-agent 主 README 在 2026-09-24 均仍写着 "Please use SWE-agent 0.7 while we update EnIGMA for 1.0."[来源](https://enigma-agent.com/)、[来源](https://raw.githubusercontent.com/SWE-agent/SWE-agent/main/README.md) → 这是**停滞 2 年**的明确信号。
- 相关仓库：github.com/enigma-agent/benchmarks，2025-06-04 起提供 CyBench 与 InterCode-CTF 的 EnIGMA 格式；**其 stars 未核实**（页面被截断，GitHub API 当时已限流）[来源](https://enigma-agent.com/)、[来源](https://github.com/enigma-agent/benchmarks)

### 4.2 "nexus" —— **未核实：没有找到任何 Princeton 相关的 nexus 项目**
穷尽检索后结论如下：
- SWE-agent 组织下的全部仓库（API 实抓，共 10 个）为：`mini-swe-agent`、`SWE-agent`、`minimal-agent-tutorial`、`SWE-ReX`、`.github`、`mini-traj-web-browser`、`swe-agent-media`、`mini-landing-page`、`test-repo`、`empty_repo` —— **无 nexus**[来源](https://api.github.com/orgs/SWE-agent/repos?per_page=100&sort=updated)
- SWE-bench 组织下的仓库（`SWE-bench`、`SWE-smith`、`experiments`、`sb-cli`、`reading-list`、`swe-bench-multimodal-tasks`、`swe-bench-tasks`、`SWE-smith-envs`、`.github`、`humanevalfix-results` 等）—— **无 nexus**[来源](https://api.github.com/orgs/SWE-bench/repos?per_page=100&sort=updated)
- 搜索 "nexus" 命中的全部是**无关的第三方项目**：*Nexus: Execution-Grounded Multi-Agent Test Oracle Synthesis*（arXiv:2510.26423）、*NEXUS: Structured Runtime Safety for Tool-Using LLM Agents*（arXiv:2607.19356）、GitHub 组织 `nexus-substrate/nexus-agents`，以及一个第三方 fork `SWEAgentNexus/SWE-agent`（不是官方组织）[来源](https://ar5iv.labs.arxiv.org/html/2510.26423)、[来源](https://arxiv.org/html/2607.19356v1)、[来源](https://github.com/nexus-substrate/nexus-agents/issues/1574)、[来源](https://github.com/SWEAgentNexus/SWE-agent)
- **结论：「未核实」——所谓 "Princeton nexus" 项目找不到任何证据，倾向判定为不存在。**

### 4.3 关于"org 从 princeton-nlp 改名为 SWE-agent"
用户这一表述**部分不准确**，需修正：
- 事实层面：SWE-agent 相关仓库今天位于**独立的 `SWE-agent` 组织**（org id 166046056，type Organization）[来源](https://api.github.com/repos/SWE-agent/SWE-agent)
- 但 `princeton-nlp` 组织**本身仍然存在**，页面标题为 "Princeton Natural Language Processing"[来源](https://github.com/princeton-nlp) → 所以不是整个 princeton-nlp 组织被改名
- 历史痕迹：EnIGMA 官网页脚与 SWE-agent v0.7.0 release notes 中的 PR 链接仍指向 `princeton-nlp/SWE-agent`[来源](https://enigma-agent.com/)、[来源](https://api.github.com/repos/SWE-agent/SWE-agent/releases?per_page=10)
- 更准确的说法：**SWE-agent 系列仓库从 princeton-nlp 迁出到新建的 `SWE-agent` 组织**；至于 GitHub 层面具体是"组织改名并保留 ID"还是"仓库转移"，「未核实」（本次未能取得组织 ID 的历史对照）。

---

## 5. SWE-bench 家族现状与饱和判断

### 5.1 官方在册的 benchmark 变体（swebench.com 导航实抓）
导航栏 Benchmarks 分组仅列 5 项：**SWE-bench / SWE-bench Verified / SWE-bench Multilingual / SWE-bench Multimodal / SWE-bench Lite**[来源](https://www.swebench.com/)

| 变体 | 规模 | 关键日期/说明 |
|---|---|---|
| SWE-bench（original/full） | **2,294** 个 instance，来自 **12** 个 Python 仓库 | 2023 年 10 月发布；初始 RAG baseline **1.96%**；SWE-agent **12.47%** [来源](https://www.swebench.com/original.html) |
| SWE-bench Verified | **500** 个 instance，人工筛过 | 与 **OpenAI** 合作创建（人类标注者逐条复核问题描述、测试补丁、可解性）[来源](https://www.swebench.com/verified.html) |
| SWE-bench Lite | 300（据作弊检测文中的 12/300 推算口径） | 官方博客以 "SWE-bench Lite, it's 4% (12/300)" 表述[来源](https://www.swebench.com/post-20251119-cheating.html) |
| SWE-bench Multilingual | **300** 个任务 / **42** 仓库 / **9** 种语言 | 语言含 C、C++、Go、Java、JS、TS、PHP、Ruby、Rust；SWE-agent + Claude 3.7 Sonnet 得 **43%**（同设定在 Verified 为 **63%**），cost limit **$2.50**[来源](https://www.swebench.com/multilingual.html) |
| SWE-bench Multimodal | 初版 **517** 个含视觉元素的 issue；**Multimodal v2（2026-09-01）保留 480 个任务** | v2 移除了已知 flaky/不可评分的测试，重建了 Docker 环境以解决依赖与浏览器漂移[来源](https://www.swebench.com/multimodal.html) |

SWE-bench 仓库本体：stars **5900**、MIT、Python、pushed_at **2026-09-18**、open issues 18、forks 979[来源](https://api.github.com/orgs/SWE-bench/repos?per_page=100&sort=updated)

### 5.2 SWE-bench Pro：**不属于官方 swebench.com 家族**
- 论文 *SWE-Bench Pro: Can AI Agents Solve Long-Horizon Software Engineering Tasks?*，arXiv:2509.16941，v1 提交 2025-09-21，v2 修订 2025-11-14[来源](https://arxiv.org/abs/2509.16941)
- 规模：**1,865** 个问题，来自 **41** 个活跃维护仓库，横跨商业应用 / B2B 服务 / 开发者工具；分为 public（11 仓库）、held-out（12 仓库）与 commercial（18 个专有仓库，需与早期创业公司有正式合作协议）三部分；held-out 与 commercial 不公开，但公开 commercial 集上的结果[来源](https://arxiv.org/abs/2509.16941)
- 设计目标：long-horizon 任务，"may require **hours to days** for a professional software engineer to complete"，常涉及跨多文件补丁与大幅代码修改；所有任务经人工验证；定位为 contamination-resistant testbed[来源](https://arxiv.org/abs/2509.16941)
- **归属判断**：作者列表（Xiang Deng, Jeff Da, Edwin Pan, … Bing Liu, Brad Kenstler）中**不含** SWE-bench/SWE-agent 的 Princeton 团队，且它**未出现在 swebench.com 的 SWE-bench Family 导航**中[来源](https://arxiv.org/abs/2509.16941)、[来源](https://www.swebench.com/) → 判为**独立/第三方 benchmark**（论文摘要未自述所属机构，机构归属「未核实」）

### 5.3 leaderboard 分数（严格区分官方 / 第三方）
**(a) 官方最近一次完整重跑：2026-02，Bash Only（所有模型统一用 mini-SWE-agent scaffold）**
Top-10 见 §3.3（榜首 Claude 4.5 Opus 76.8%）[来源](https://simonwillison.net/2026/feb/19/swe-bench/)
- 该数据的性质（官方页面自述）：同一 system prompt 跑所有模型、发布号对应 mini-SWE-agent 版本、2.x 与 1.x 不可比、官方明确声明"Do _not_ aim to tune the configuration to reach higher and higher scores"[来源](https://www.swebench.com/verified.html)
- ⚠️ **限制说明**：swebench.com 主页的榜单是 JS 渲染图表，纯文本抓取会被截断；上述具体百分比来自 Simon Willison 对 swebench.com 图表的截图记录（他本人注明数字是给图表补标签后所得）[来源](https://simonwillison.net/2026/feb/19/swe-bench/) 我**未能**从 swebench.com 直接抓到 2026-09 的更新榜单，故**未能确认 2026-02 之后官方是否再次重跑**（官方 Blog 列表最新一篇为 2026-01-13）[来源](https://www.swebench.com/blog.html)

**(b) 第三方聚合站（**非官方**，且状态标注为 self-reported/unverified）**
- llm-stats.com SWE-bench Verified 榜（页面标注 "Last updated September 24, 2026"，共 **116** 个模型）：**Claude Fable 5 = 0.950**、Claude Mythos Preview 0.939、Claude Opus 4.8 0.886、Claude Opus 4.7 0.876、Claude Sonnet 5 0.852、Claude Opus 4.5 0.809、Claude Opus 4.6 0.808、Gemini 3.1 Pro 0.806、DeepSeek-V4-Pro-Max 0.806、MiniMax M3 0.805[来源](https://llm-stats.com/benchmarks/swe-bench-verified) → 这一口径下 Verified 已逼近 **95%**
- llm-stats.com SWE-bench Multimodal 榜（同期，仅 **5** 个模型，标注 **Verified 0 / Self-reported 5**、"Status: Unverified"）：Claude Opus 5.5 **0.614**、Claude Mythos Preview 0.590、Qwen3.8-27B 0.386、Claude Opus 4.8 0.384、Claude Sonnet 5 0.281[来源](https://llm-stats.com/benchmarks/swe-bench-multimodal) → Multimodal 分数**明显偏低**（榜首 61.4%），远未饱和
- SWE-bench Pro 第三方榜：benchlm.ai 页面标题为 "SWE-bench Pro Leaderboard (September 2026): **Claude Opus 5.5 Leads at 89.9%**"[来源](https://benchlm.ai/benchmarks/swe-bench-pro) ⚠️ 同站更早的搜索摘要曾写 "Claude Fable 5.1 Leads at 81.2%"，**两处数字互相矛盾**，故该数值可靠性低，仅作第三方参考，具体排名「未核实」。morphllm.com 的 SWE-bench Pro 榜本次被 Vercel 安全校验拦截（HTTP 429），**未核实**[来源](https://www.morphllm.com/swe-bench-pro)

### 5.4 是否"已饱和"—— 证据链（倾向：Verified 饱和且被认为失效；Multimodal 与 Pro 未饱和但 Pro 可信度受质疑）
1. **官方团队自己的动作**：把 SWE-agent 标为 legacy、把重心移到 mini-swe-agent，并新增 **ProgramBench**（自称 "new & extremely challenging benchmark"）、**DeepSWE**、**CodeClash** 等新评测方向[来源](https://www.swebench.com/)、[来源](https://mini-swe-agent.com/latest/)
2. **增长停滞**：OpenAI 指出 SWE-bench Verified 的提升在 **2025-08 → 2026-02 之间放缓到约 6%（六个月）**[来源](https://gigazine.net/gsc_news/en/20260429-swe-bench-verified/)
3. **OpenAI 宣布停止报告 Verified 成绩**，理由两条（2026-02 分析）：①测试有时拒绝正确解法——审计了模型**未解决**任务中的 **27.6%**，发现其中**至少 59.4%** 含"会拒绝功能正确提交"的缺陷测试；②**数据污染**——部分前沿模型能复现问题陈述与真实修复代码，说明性能提升可能来自"考前看过题"，而非模型能力本身。OpenAI 转向推荐 SWE-bench Pro 作为替代[来源](https://gigazine.net/gsc_news/en/20260429-swe-bench-verified/)（⚠️ 一手页面 `https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/` 对 web_fetch 返回 **HTTP 403**，其简体中文版同样 403，故上述内容来自 gigazine 的报道转述，**一手措辞未核实**）
4. **排序能力已失效（学术证据，2026-09-15）**：arXiv:2609.17394 *Coding Agents Have Converged: Why the SWE-bench Leaderboard Can No Longer Order Its Top Entries*（ADMA 2026 接收）审计 **254** 份 SWE-bench 提交（4 个 split，不重跑模型）后指出：Verified 上**榜首两名各解出 500 中的 396 个**；前十名共享 **285** 个成功与 **51** 个失败，仅剩 **164** 个能区分它们的 instance；前沿解法集合的 median nesting **0.935**（分数隐含基线仅 0.774）；**29 组相邻的 Verified top-30 配对在 α=0.05 下用 McNemar 检验没有一组能被区分开**；模型-scaffold 交互带来的 within-model scaffold 区间可达 **29.8 个百分点**，而 top-30 的总分差只有 **8.8 点**[来源](https://arxiv.org/abs/2609.17394)
5. **提交作弊/污染检测机制已常态化**：官方 2025-11-19 博客称已写脚本检测预测与 gold patch 的逐 hunk 完全匹配，Verified 提交的平均完全匹配率为 **6.7%（约 34/500）**，范围 0–13%；Lite 为 **4%（12/300）**；full 为 **2.45%（约 56/2294）**；一份提交（`20240820_honeycomb`）达 **78.7%/87.2%**（后查明是把 2236 条 full-split 预测误传为 Verified 提交的人为错误），官方今后将对 **>20%** 的提交要求解释[来源](https://www.swebench.com/post-20251119-cheating.html)
6. **替代品也出问题**：2026-07-08 OpenAI 报告在对 SWE-bench Pro 的 **731** 个公开任务做质量审计后判定 **27.4%** 任务已损坏（人工分类口径为 **34.1%**），综合估计**约 30% 的 SWE-bench Pro 任务不可评估**；四类问题为测试过严、题目说明不足、测试覆盖过窄、题目误导。背景数字：八个月内最先进模型在公开任务上的通过率从 **23.3%** 升至 **80.3%**。OpenAI **撤回了此前推荐 SWE-bench Pro 的建议**[来源](https://gigazine.net/gsc_news/en/20260709-openai-coding-evaluations)（⚠️ 一手页面 `https://openai.com/index/separating-signal-from-noise-coding-evaluations/` 未抓取成功，内容来自 gigazine 转述）
7. **对比之下 Multimodal 未被饱和**：第三方榜榜首仅 61.4%（§5.3b）[来源](https://llm-stats.com/benchmarks/swe-bench-multimodal)

---

## 6. License、预期用途、是否有托管/云版本

- **License：SWE-agent = MIT**（README 写 "## 🪪 License — MIT. Check `LICENSE`."，GitHub API license 字段亦为 MIT）[来源](https://raw.githubusercontent.com/SWE-agent/SWE-agent/main/README.md)、[来源](https://api.github.com/repos/SWE-agent/SWE-agent)
- 同生态其它仓库同为 **MIT**：mini-swe-agent、SWE-ReX、SWE-bench、SWE-smith、sb-cli、swe-agent-media、SWE-bench/.github[来源](https://api.github.com/repos/SWE-agent/mini-swe-agent)、[来源](https://api.github.com/orgs/SWE-agent/repos?per_page=100&sort=updated)、[来源](https://api.github.com/orgs/SWE-bench/repos?per_page=100&sort=updated)
- **预期用途是研究，而非商业工具**：README 明写 "✅ **Made for research**: Simple & hackable by design"，且 "SWE-agent is built and maintained by researchers from Princeton University and Stanford University"[来源](https://raw.githubusercontent.com/SWE-agent/SWE-agent/main/README.md) 对 mini-swe-agent 的定位则是 "The `mini` agent wants to be a hackable tool, not a black box. Some agents are overfitted research artifacts. Others are UI-heavy frontend monsters."[来源](https://raw.githubusercontent.com/SWE-agent/mini-swe-agent/main/README.md)
- **官方托管云版：未找到。** 「未核实」——检索未发现任何官方 "SWE-agent cloud" / 官方 SaaS 产品。官方文档 FAQ 只把云执行描述为一种**部署选项**而非托管服务："Your only limitation might be the availability of the docker containers for your environments. But you can always execute SWE-agent in the cloud."[来源](https://swe-agent.com/latest/faq/)
- **第三方托管/集成确实存在**（这是"云化"的真实形态）：
  - **Nebius Token Factory** 文档在 Sandboxes → Contree SDK → Integrations 下提供专门的 "Mini-SWE-Agent Integration" 页面[来源](https://docs.tokenfactory.nebius.com/sandboxes/sdk/integrations/mini-swe-agent) Nebius 同时被 mini-swe-agent README 列为其采用方之一[来源](https://raw.githubusercontent.com/SWE-agent/mini-swe-agent/main/README.md)
  - **SWE-ReX** 是官方自研的"云上/本地沙箱执行"层，描述为 "Sandboxed code execution for AI agents, locally or on the cloud. Massively parallel, easy to extend. Powering SWE-agent and more."（stars 601、MIT、pushed_at 2026-09-21）；SWE-agent v1.0.0 release notes 明确提到可用 **Modal、AWS** 等运行 SWE-ReX 来"本地跑 agent、云端执行代码"[来源](https://api.github.com/orgs/SWE-agent/repos?per_page=100&sort=updated)、[来源](https://api.github.com/repos/SWE-agent/SWE-agent/releases?per_page=10)
  - **sb-cli** 提供"Run SWE-bench evaluations remotely"（远程评测服务），stars 82、MIT[来源](https://api.github.com/orgs/SWE-bench/repos?per_page=100&sort=updated)
  - 其它第三方托管教程（如阿里云函数计算"构建 SWE Agent"、Clore.ai 指南）在搜索中出现，但**均为「未核实」**——本次未逐篇抓取正文[来源](https://help.aliyun.com/zh/functioncompute/building-the-swe-agent)、[来源](https://docs.clore.ai/guides/guides_v2-zh/ai-ping-tai-yu-zhi-neng-ti/swe-agent)

---

## 7. 已知批评与短板（均带来源）

### 7.1 每个 issue 的成本（cost per issue）
- 官方 bash-only leaderboard 的**统一预算设定**：所有 LM 都以 **$3 预算、最多 250 步**运行；官方解释"agents succeed fast, but fail slowly"，多数模型在 **50 步**前就成功[来源](https://www.swebench.com/post-250808-gpt5.html)
- **GPT-5-nano 约 1.5 美分/instance**（原文 "maxing out somewhere at 1.5 ¢/instance"）；**GPT-5-mini 跑完整流程约 1.5 小时、花 $18**；GPT-5-mini 的成本不到 GPT-5 的 **1/5**，代价是约 **5 个百分点**的性能[来源](https://www.swebench.com/post-250808-gpt5.html)
- SWE-bench Multilingual 的基线评测使用 **$2.50** cost limit[来源](https://www.swebench.com/multilingual.html)
- mini-swe-agent 的默认配置里有 `cost_limit: 3.0`（agent 默认）与 `step_limit: 250`、`cost_limit: 3.`（swebench 配置）[来源](https://www.swebench.com/post-250808-gpt5.html)
- 2025-08 时点："Anthropic's Claude Opus 4 is still unbeaten, and GPT-5 is on par with Claude Sonnet 4"[来源](https://www.swebench.com/post-250808-gpt5.html)

### 7.2 对强前沿模型的依赖（scaffold 影响小于模型）
- **官方自己的结论**：SWE-bench Multilingual 的 trajectory 分析发现成功与失败任务的 action 分布"非常相似"，因此"suggesting that **model capabilities are the limiting factor in resolution rate rather than agent design**"[来源](https://www.swebench.com/multilingual.html)
- 量化证据：within-model scaffold 区间可达 **29.8 个百分点**，而 top-30 模型的总分差仅 **8.8 点** —— 即"换 scaffold"的影响可能大于"换模型"的排名差；不过该论文的观察性设计**不能识别因果性 scaffold 效应**[来源](https://arxiv.org/abs/2609.17394)
- 榜单口径问题：官方 bash-only 榜**所有模型共用同一 system prompt**，因此"不衡量各家 harness 或调优 prompt 的质量"[来源](https://simonwillison.net/2026/feb/19/swe-bench/)

### 7.3 真实仓库表现 vs benchmark
- **任务本身偏小**（SWE-bench 团队自述的 limitation）：SWE-bench 的采集策略天然筛出改动很少的 PR —— Multilingual 中 **gold patch 中位数仅 10 行代码，95 分位 110 行**，而"Real-world software engineering tasks often require significantly larger code modifications."[来源](https://www.swebench.com/multilingual.html)
- **SWE-bench Pro 的立论就是 benchmark 不够真实**：它专门针对 "realistic, complex, enterprise-level problems beyond the scope of SWE-BENCH"，任务需专业工程师数小时到数天[来源](https://arxiv.org/abs/2509.16941)
- **数据污染 / 记忆而非推理**：OpenAI 发现部分前沿模型能复现问题陈述与真实修复代码；同时也存在"SWE-Bench Illusion: When State-of-the-Art LLMs Remember Instead of Reason"这类专门研究（该文出现在 ACM DL，本次**未抓取正文，未核实**）[来源](https://gigazine.net/gsc_news/en/20260429-swe-bench-verified/)、[来源](https://dl.acm.org/doi/10.1145/3786583.3786882)
- **测试本身有缺陷**：Verified 失败任务中 27.6% 被审计、其中至少 59.4% 含拒绝正解的测试[来源](https://gigazine.net/gsc_news/en/20260429-swe-bench-verified/)；SWE-bench Pro 约 30% 任务被判定损坏[来源](https://gigazine.net/gsc_news/en/20260709-openai-coding-evaluations)
- **评分工具有被误用的风险**：官方自己的检测脚本发现过 78.7%/87.2% 完全匹配的异常提交（虽最终归因于文件误传）[来源](https://www.swebench.com/post-20251119-cheating.html)

### 7.4 维护状态
见 §8。核心事实：**SWE-agent 被自己的团队宣布为被 mini-swe-agent 取代**；EnIGMA 仍卡在 SWE-agent 0.7。

### 7.5 环境搭建复杂度
- SWE-agent 依赖 Docker 容器环境，FAQ 首条即承认这一限制："Your only limitation might be the availability of the docker containers for your environments."[来源](https://swe-agent.com/latest/faq/)
- 配置报错体验差：FAQ 承认 "I got a very long error message about various configuration options not working? … This is probably because of union types … If none of them work, we throw an error which then tells you why we cannot initialize any of the types, so this will get somewhat long and confusing."[来源](https://swe-agent.com/latest/faq/)
- Multimodal 还需额外注意：图片需 < 10MB、需连网、需 multimodal 配置[来源](https://swe-agent.com/latest/faq/)
- **benchmark 构建端的难度量化**（间接说明真实仓库环境化之难）：SWE-bench Multilingual 在仓库筛选阶段就丢弃了约 **30%** 的仓库，原因是"can't be built locally, take too long to build, or take too long to run tests"；且因 300 个任务分散在 42 个仓库、依赖几乎不共享，最终**跳过**了 pre-built environment image 层[来源](https://www.swebench.com/multilingual.html)
- **mini-swe-agent 的核心卖点正是解决这些复杂度**：它把每个动作当独立 `subprocess.run`，官方"Trust me"式论证了不需要常驻 shell 会话的三条理由（难以判断命令何时结束、坏命令会杀掉 shell、打断命令会污染后续输出），并称这"avoids so many issues"[来源](https://mini-swe-agent.com/latest/faq/)
- **反过来，mini 的简化也有代价（官方列出的 limitation）**：默认无 bash 以外工具；动作从 triple-backtick 块解析；动作之间彼此独立 → "the agent cannot change directories or export environment variables"（需每条命令前缀 `cd …` / `export …`）[来源](https://mini-swe-agent.com/latest/faq/)

### 7.6 一个反直觉的批评线索
官方博客 *Roulette mode!*（2025-08-19，作者 Kilian Lieret）标题即结论：**每一步随机切换模型能提升性能**（"Randomly switching between models at every step can boost performance"）[来源](https://www.swebench.com/blog.html)、[来源](https://mini-swe-agent.com/latest/) 这直接说明单模型单 scaffold 的分数并非稳健的能力度量。

---

## 8. 维护活跃度核查

| 项目 | 最新 release | main 最后 commit | stars | open issues | 判断 |
|---|---|---|---|---|---|
| **SWE-agent** | **v1.1.0 / 2025-05-22** [来源](https://api.github.com/repos/SWE-agent/SWE-agent/releases/latest) | **2026-07-16** [来源](https://api.github.com/repos/SWE-agent/SWE-agent/commits?per_page=5) | 20395 [来源](https://api.github.com/repos/SWE-agent/SWE-agent) | 119 [来源](https://api.github.com/repos/SWE-agent/SWE-agent) | 仅维护、无发版、官方宣布被取代 |
| **mini-swe-agent** | **v2.4.6 / 2026-07-23** [来源](https://api.github.com/repos/SWE-agent/mini-swe-agent/releases/latest) | **2026-09-03**（John Yang）[来源](https://api.github.com/repos/SWE-agent/mini-swe-agent/commits?per_page=5) | 7948 [来源](https://api.github.com/repos/SWE-agent/mini-swe-agent) | 76 [来源](https://api.github.com/repos/SWE-agent/mini-swe-agent) | **现役主线** |
| SWE-ReX | — | pushed 2026-09-21 [来源](https://api.github.com/orgs/SWE-agent/repos?per_page=100&sort=updated) | 601 | 57 | 活跃（沙箱执行层） |
| SWE-smith | — | pushed 2026-09-21 [来源](https://api.github.com/orgs/SWE-bench/repos?per_page=100&sort=updated) | 786 | 24 | 活跃（NeurIPS 2025 D&B **Spotlight**）[来源](https://api.github.com/orgs/SWE-bench/repos?per_page=100&sort=updated) |
| SWE-bench | — | pushed 2026-09-18 [来源](https://api.github.com/orgs/SWE-bench/repos?per_page=100&sort=updated) | 5900 | 18 | 活跃 |
| minimal-agent-tutorial | — | pushed 2026-02-03 [来源](https://api.github.com/orgs/SWE-agent/repos?per_page=100&sort=updated) | 27 | 4 | 低活跃教学仓库 |
| EnIGMA（位于 SWE-agent v0.7 分支） | 随 v0.7.0（2024-09-25） | 未再更新 | — | — | **停滞**，官方仍要求用 0.7 [来源](https://enigma-agent.com/) |

**贡献者活动细节**：
- SWE-agent 近 5 条 commit 的作者为外部/社区贡献者 **Anas Khan (anxkhn)**（3 条）、**Taksh Kothari (Chessing234)**（1 条），内容以修文档与修 multimodal/sb-cli 缺陷为主（如 "docs: fix removed problem_statement flags"、"fix: strip query/fragment from repo URLs"），且多条由 Cursor 协作者署名（`Co-authored-by: Cursor`）[来源](https://api.github.com/repos/SWE-agent/SWE-agent/commits?per_page=5) → 属"社区小修"而非核心开发
- mini-swe-agent 近期维护者为核心作者 **John Yang**；v2.4.6 由 **klieret** 发布，其提交邮箱为 `klieret@meta.com`[来源](https://api.github.com/repos/SWE-agent/mini-swe-agent/commits?per_page=5) → 关键维护者现就职 Meta（仅陈述可观察事实）
- 两个仓库的 `pushed_at` 均为 2026-09-21（与 SWE-ReX 同秒），但**均不在 main 分支上**，故"最后推送时间"不能当作代码活跃度证据[来源](https://api.github.com/repos/SWE-agent/SWE-agent)、[来源](https://api.github.com/repos/SWE-agent/mini-swe-agent)

---

## 9. 一句话总结

SWE-agent 是 Princeton/Stanford 团队 2024 年以 **NeurIPS 2024 论文 + ACI 概念**开创 coding agent 范式的学术项目（12.5% → 现由 mini-swe-agent 在 Verified 上推到官方口径 76.8%，MIT 许可，20395 stars 仍在增长），但**它在 2026 年已被自己的团队用 100 行的 mini-swe-agent 取代并标注为 legacy（最新 release 停在 2025-05-22）**，其进攻性安全分支 EnIGMA 停滞在 v0.7；"SWE-agent 2.0" 与 "Princeton nexus" 均**不存在**（前者唯一来源的博客指向一个 404 仓库）；而在 SWE-bench 侧，Verified 已被 OpenAI 判定"不再是有效度量"（59.4% 的失败案例含缺陷测试 + 数据污染）并在 2026-09 被学术审计证明**已无法区分 top-30 的相邻名次**，Multimodal（第三方榜首仅 61.4%）与 Multilingual（Claude 3.7 仅 43%）则仍未饱和——但天花板更高的 SWE-bench Pro 本身也在 2026-07 被 OpenAI 判定约 30% 任务损坏。

---

## 10. 本次实际抓取的全部 URL

**GitHub / raw（官方一手）**
1. https://api.github.com/repos/SWE-agent/SWE-agent
2. https://api.github.com/repos/SWE-agent/mini-swe-agent
3. https://api.github.com/repos/SWE-agent/SWE-agent/releases/latest
4. https://api.github.com/repos/SWE-agent/SWE-agent/releases?per_page=10
5. https://api.github.com/repos/SWE-agent/mini-swe-agent/releases/latest
6. https://api.github.com/orgs/SWE-agent/repos?per_page=100&sort=updated
7. https://api.github.com/orgs/SWE-bench/repos?per_page=100&sort=updated
8. https://api.github.com/repos/SWE-agent/SWE-agent/commits?per_page=5
9. https://api.github.com/repos/SWE-agent/mini-swe-agent/commits?per_page=5
10. https://raw.githubusercontent.com/SWE-agent/SWE-agent/main/README.md
11. https://raw.githubusercontent.com/SWE-agent/mini-swe-agent/main/README.md
12. https://github.com/princeton-nlp
13. https://github.com/princeton-nlp/SWE-agent-v2 → **HTTP 404**
14. https://github.com/enigma-agent/benchmarks
15. https://api.github.com/repos/SWE-agent/SWE-agent/tags?per_page=20 → **HTTP 403（API 限流，未取得内容）**

**官方文档站 / 官网**
16. https://swe-agent.com/latest/faq/
17. https://swe-agent.com/latest/background/aci/
18. https://mini-swe-agent.com/latest/
19. https://mini-swe-agent.com/latest/faq/
20. https://enigma-agent.com/

**SWE-bench 官方**
21. https://www.swebench.com/
22. https://www.swebench.com/verified.html
23. https://www.swebench.com/original.html
24. https://www.swebench.com/multilingual.html
25. https://www.swebench.com/multimodal.html
26. https://www.swebench.com/blog.html
27. https://www.swebench.com/post-250808-gpt5.html
28. https://www.swebench.com/post-20251119-cheating.html

**论文**
29. https://arxiv.org/abs/2405.15793
30. https://arxiv.org/abs/2409.16165
31. https://arxiv.org/abs/2509.16941
32. https://arxiv.org/abs/2609.17394

**第三方 / 媒体 / 聚合站**
33. https://simonwillison.net/2026/feb/19/swe-bench/
34. https://gigazine.net/gsc_news/en/20260429-swe-bench-verified/
35. https://gigazine.net/gsc_news/en/20260709-openai-coding-evaluations
36. https://llm-stats.com/benchmarks/swe-bench-verified
37. https://llm-stats.com/benchmarks/swe-bench-multimodal
38. https://benchlm.ai/benchmarks/swe-bench-verified
39. https://benchlm.ai/benchmarks/swe-bench-pro
40. https://yuv.ai/blog/swe-agent-v2
41. https://docs.tokenfactory.nebius.com/sandboxes/sdk/integrations/mini-swe-agent
42. https://www.morphllm.com/swe-bench-pro → **HTTP 429（Vercel 安全校验拦截，未取得内容）**

**仅通过搜索结果出现、未抓取正文（故相关论断标未核实）**
43. https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/ → **HTTP 403**
44. https://openai.com/zh-Hans-CN/index/why-we-no-longer-evaluate-swe-bench-verified/ → **HTTP 403**
45. https://openai.com/index/separating-signal-from-noise-coding-evaluations/
46. https://dl.acm.org/doi/10.1145/3786583.3786882
47. https://help.aliyun.com/zh/functioncompute/building-the-swe-agent
48. https://docs.clore.ai/guides/guides_v2-zh/ai-ping-tai-yu-zhi-neng-ti/swe-agent
49. https://github.com/nexus-substrate/nexus-agents/issues/1574
50. https://ar5iv.labs.arxiv.org/html/2510.26423
51. https://arxiv.org/html/2607.19356v1
52. https://github.com/SWEAgentNexus/SWE-agent

---

## 11. 未核实清单（汇总）

| 事项 | 状态 |
|---|---|
| 官方 "SWE-agent 2.0" | **确认不存在**，唯一来源博客所引仓库 404 |
| "Princeton nexus" 项目 | **未核实** —— SWE-agent/SWE-bench 组织内无该仓库，检索命中全为无关第三方项目 |
| princeton-nlp 组织是否被 GitHub「改名」（而非仓库迁移） | **未核实** —— princeton-nlp 组织本身仍存在 |
| 2026-09-21 三仓库同秒 push 的具体触发原因 | **未核实**（疑似 bot / 非默认分支） |
| SWE-agent 全部 git tags 逐条核对 | **未核实** —— tags API 返回 403 限流；改由 release 列表覆盖 |
| swebench.com 官方榜单在 2026-02 之后是否再次完整重跑 | **未核实**（官方 Blog 最新一篇为 2026-01-13） |
| OpenAI 两份原始博文的精确措辞与数字 | **未核实一手** —— openai.com 对 web_fetch 返回 403，数字取自 gigazine 转述 |
| SWE-bench Pro 的机构归属 | **未核实** —— 摘要未自述机构；仅确认非 swebench.com 家族、作者不含 Princeton 团队 |
| SWE-bench Pro 第三方榜首分数 | **未核实 / 自相矛盾** —— benchlm 页面标题 89.9%（Claude Opus 5.5）vs 搜索摘要 81.2%（Claude Fable 5.1）；morphllm 被 429 拦截 |
| "SWE-Bench Illusion" 论文正文 | **未核实**（仅见于 ACM DL 与搜索摘要） |
| 阿里云 / Clore.ai 等第三方托管方案细节 | **未核实**（未抓取正文） |
| enigma-agent/benchmarks 仓库 stars | **未核实**（页面截断 + API 限流） |
| llm-stats.com 榜单的完整性与可信度 | 第三方聚合、页面自标 self-reported / Unverified，**不能等同官方榜** |
