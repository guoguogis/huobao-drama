# 原始调研底稿索引（AI 设计 × AI Coding，2026-09）

本目录是 [`../ai-design-ai-coding-2026-deep-research.md`](../ai-design-ai-coding-2026-deep-research.md)（v1.1）的**支撑材料**。

> ⚠️ **使用前必读**：这些是**未整合、未经去重与逐条事实复核**的原始底稿，由并行调研任务在 2026-09-24 生成。它们含有比主报告更细的产品级数据与更长的来源清单，但也可能存在错误、过时信息或互相矛盾之处。
>
> **引用规则**：以主报告的结论为准；需要更细的数据时，回到本目录查找，并**沿着其标注的一手链接自行核验**。

## 文件清单

| 文件 | 内容 | 规模 |
|---|---|---|
| `ai-coding-tools-2026-09.md` | 工具逐个产品档案（国际 + 国产），含"已死/改名/易主"清单、定价大表、并行与后台能力对比、Grok Bot 条款分析 | 77 KB |
| `AI-Coding企业级落地调研报告-2026年9月.md` | 企业落地、成本结构、合规与控制面 | 29 KB |
| `AI设计工具全景_2026-09.md` | 设计工具四层分层地图、海外 12 行 / 国内 6 行对比表、定价与版权、企业采用标准 | 40 KB |
| `ai-image-models-2026-09.md` | 视觉生成模型（含 Artificial Analysis 榜单数据） | 49 KB |
| `design-to-code-and-design-benchmarks-2026-09.md` | 设计→代码链路 + 设计基准原始数据 | 75 KB |
| `design-benchmarks-report.md` | 设计基准补充数据 | 41 KB |
| `open-source-coding-agents-2026-09.md` | 开源 Agent 谱系（Roo Code 关停、Kilo Code/Anaconda、Zoo Code 等） | 91 KB |
| `openhands-research-brief-2026-09-24.md` | OpenHands 专题 | 43 KB |
| `swe-agent-research-brief.md` | SWE-agent 专题 + SWE-bench 排序失效学术分析（arXiv:2609.17394） | 47 KB |

合计约 **490 KB**，含 **200+ 条来源 URL**。

## 已知需要警惕的问题

这批底稿在复核中被发现以下类型的问题，是主报告设立「数据可信度分级」的直接原因：

1. **产品状态易过时**：底稿撰写时依赖的多个"活跃工具"在 2026 年内已关停/易主（Roo Code、Continue、Motiff 等）。
2. **榜单引用必须带日期**：Arena 类榜单为客户端渲染，第三方快照与官方实时数据存在差异；WebDev Arena 在 2026 年 9 月内即更换过榜首。
3. **子任务的二手转述**：部分条目来自二级来源，与厂商一手文档冲突时**一律以一手为准**（例：某底稿曾称 Cursor 仅提供 GPT-6，实抓官方文档为 GPT-5.6 Sol/Terra/Luna 与 GPT-6 并存，已按实抓修正）。
4. **抓取失败导致的缺口**：`openai.com`、`developers.googleblog.com`、`antigravity.google`、`jules.google` 等站点在调研会话中持续返回 403 或连接错误，相关细节依赖二手来源，底稿末尾已逐条标注「未核实」。

## 复核状态

| 复核项 | 状态 |
|---|---|
| Roo Code 关停 | ✅ 已用仓库 README 原文确认 |
| Continue 被 Cursor 收购 | ✅ 已用 DigitalToday 报道确认 |
| Motiff 关停 | ✅ 已用官方公告确认 |
| Kiro CLI 更名 | ✅ 已用 AWS/Kiro 官方迁移文档确认 |
| 文心快码并入 DuMate | ✅ 已用两家媒体确认 |
| OpenAI 终止向 Cursor 供模型 | ✅ 已用两家媒体确认 |
| SWE-bench 排序失效（arXiv:2609.17394） | ✅ 论文存在并已核实摘要要点 |
| iFlyCode / CodeGeeX / Aider 停摆 | ⚠️ **未二次核实**，仅作线索 |
