# 「设计稿 → 代码」技术现状 与 设计生成评测基准

**核查截止日期：2026-09-24** ｜ 全部结论均来自本次联网检索/抓取的公开来源，链接与来源日期随结论给出。

## 方法论说明（请先读）

1. **一手优先**：Figma 官方帮助中心（help.figma.com）、Figma 开发者文档（developers.figma.com）、Figma 博客、arXiv abs/HTML、CVPR/ASE/NAACL 论文页为一手来源。
2. **明确区分三类证据**：
   - **官方可核实**：官方页面直接写出的事实（能力、席位要求、限流、工具清单）。
   - **第三方来源**：媒体/评测站/聚合站。此类信息我会标注「第三方」。
   - **抓取受限**：`figma.com/pricing`、`designarena.ai/leaderboard/*`、`arena.ai`、`lmarena.ai` 均为 JS 渲染或 Cloudflare 拦截，我的抓取器只能拿到页面骨架/被拦截页。**这类页面上的具体数字，我只采用「第三方在相近日期抓取的静态快照」并明确标注快照时间戳**，不做任何记忆补全。
3. **凡未能核实的，直接写「未核实」**，不推测。

---

# 主题 A：「设计稿 → 代码」链路技术现状

## A0. 关键时间线（均为可核实来源）

| 时间 | 事件 | 来源 |
| --- | --- | --- |
| 2025-03-11 | Figma 启用新的计费模型（Full / Dev / Collab / View 席位制） | [Guide to billing / Professional 计费页提及 "Figma introduced updates to its billing model on March 11, 2025"](https://help.figma.com/hc/en-us/articles/360041061034-Manage-billing-on-the-Professional-plan)（官方，页面无发布日期） |
| **2025-06-04** | **Dev Mode MCP Server 进入 Beta**，仅桌面端，官方确认支持 VS Code with Copilot、Cursor、Windsurf、Claude Code；限 Dev 或 Full 席位（Professional/Organization/Enterprise） | [gihyo.jp 报道（2025-06-05，引用 Figma 官方推文 2025-06-04）](https://gihyo.jp/article/2025/06/figma-dev-mode-mcp-server)；[Figma 官方博客](https://www.figma.com/blog/introducing-figmas-dev-mode-mcp-server/)（博客正文为 JS 渲染，未能读取正文） |
| 2025-09（Schema 2025） | **Figma MCP server 正式 GA（generally available）**；**Code Connect UI GA**（Organization/Enterprise）；变量模式上限提升；Extended collections | [What's new from Schema 2025（官方帮助中心）](https://help.figma.com/hc/en-us/articles/35794667554839-What-s-new-from-Schema-2025) |
| **2025-09-23** | **官方远程 MCP server（remote MCP）上线**（免桌面端、OAuth 授权、`https://mcp.figma.com/mcp`） | **第三方**：[AIbase 报道，发布于 2025-09-24，称"9月23日 Figma 正式上线官方远程 MCP server"](https://www.aibase.com/news/21538)（该文同时写错了端点 URL，见「未核实项」） |
| 2026-05（May 2026 release notes livestream） | **write to canvas / code to canvas** 的 agentic 工作流（`/figma-use`、`/figma-generate-design`、`/figma-generate-library`、`/prototype-to-figma`） | [Workflow lab: Code to canvas（官方，明确引用 "May 2026 Release notes livestream"）](https://help.figma.com/hc/en-us/articles/40219873508247-Workflow-lab-Code-to-canvas) |

---

## A1. Figma Dev Mode 在 2026 年的能力与定价

### 能力（官方可核实）

Dev Mode 在**所有付费方案**可用，需要 **Full 或 Dev 席位**（[Guide to Dev Mode，官方](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode)）。开发者用它：

- 高级 inspect（layout/spacing、颜色、原型交互、组件属性、变体信息），Code/List 双视图切换；
- **Compare changes / Compare with main component**（版本对比）；
- **Ready for dev 状态 + Focus view + 通知**；注意：`Completed` 状态**仅 Organization 与 Enterprise** 可用；
- **组件游乐场**（Explore component behavior：试变体与变量模式而不改稿）；
- Dev resources（Jira / Storybook / GitHub / VS Code 链接）、Dev Mode 插件；
- **Figma for VS Code 扩展**（在编辑器内看设计、看评论、代码建议、代码文件↔组件关联）；
- Code Connect 代码片段（条件见 A3）。
（同上官方来源）

### 席位模型（官方可核实）

席位四类，一人一席位（[Manage seats in Figma，官方](https://help.figma.com/hc/en-us/articles/360039960434)）：

| 席位 | 包含 |
| --- | --- |
| Full | 全部产品（Figma Design、Make、Dev Mode、Draw、Slides、FigJam） |
| Dev | **Dev Mode、Figma Slides、FigJam**；Figma Design 仅查看+评论；不含 Slides 的设计模式 |
| Collab | FigJam、Slides；**无 Dev Mode**，仅基础 inspect |
| View | 免费；仅查看+评论 |

### 定价：官方数字未能取得，第三方数字如下

- **官方口径是可核实但无数字**：Figma 帮助中心明确写 "To check the current price per seat for your plan, visit figma.com/pricing"，并把 Pricing 页作为唯一价格来源（[Manage seats](https://help.figma.com/hc/en-us/articles/360039960434)、[Guide to billing](https://help.figma.com/hc/en-us/articles/29717597009431-Guide-to-billing-at-Figma)、[Professional 计费页](https://help.figma.com/hc/en-us/articles/360041061034-Manage-billing-on-the-Professional-plan)）。
- **`figma.com/pricing` 本次无法读取**：抓取仅返回页面标题 `Plans & Pricing | Figma`，正文为客户端渲染。→ **官方价目数字：未核实（抓取受限）**。
- **第三方数字（2026-06，仅供参考，非官方）**：Dev 席位 **$12/月（Professional，年付）、$25（Organization）、$35（Enterprise）**；设计侧 Full 席位 **$16–$90/月**（[Dupple《The 8 Best Design Handoff Tools in 2026》，2026-06-16，更新于 2026-06](https://dupple.com/learn/best-design-handoff-tools)）。该文自称引用 Figma 官方 Pricing 页，但**我无法用官方页复核**。

### Dev seat 是否"包含在 Organization/Enterprise"？

- **功能层面**：Dev Mode 本身是 Professional/Organization/Enterprise 都提供的功能（官方 plans & features 表把 Dev Mode 标为 Pro/Org/Enterprise ✓）——[Figma plans and features（官方）](https://help.figma.com/hc/en-us/articles/360040328273-Figma-plans-and-features)。
- **费用层面**：**不是"包含"，而是按席位单独计费**。官方计费文档写明"Your overall subscription cost is based on the number of **Full, Dev, and Collab seats** in your plan"；View 席位免费（[Guide to billing，官方](https://help.figma.com/hc/en-us/articles/29717597009431-Guide-to-billing-at-Figma)）。因此 Org/Enterprise 只是"可以买 Dev 席位"，不是送。
- **附加门槛**：Code Connect 需 **Organization 或 Enterprise + Full/Dev 席位**（A3）；**Variables REST API 仅 Enterprise**（官方 plans 表）；Extended collections 需 Enterprise + Full 席位（[Schema 2025](https://help.figma.com/hc/en-us/articles/35794667554839-What-s-new-from-Schema-2025)）。

---

## A2. Figma MCP Server：发布时间、能力、客户端、限制

### 两个 server（官方）

| | 远程 MCP server（官方推荐） | 桌面 MCP server |
| --- | --- | --- |
| 端点 | `https://mcp.figma.com/mcp` | 本机（Figma 桌面 App 内运行，历史教程常见 `http://127.0.0.1:3845/mcp`） |
| 席位/方案 | **所有席位与所有方案** | **Dev 或 Full 席位 + 所有付费方案** |
| 能力范围 | **最全**：含 write to canvas、code to canvas、`search_design_system`、`download_assets`、`get_libraries` 等"remote only"工具 | 面向组织/企业的特定场景；**不提供 `use_figma` / `generate_figma_design`** |
| 定位差异 | 基于链接（link-based）取上下文 | 支持"选中即提示（selection-based prompting）" |

来源：[Guide to the Figma MCP server（官方）](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)、[Code to canvas 开发文档（官方）](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/)、[Tools and prompts（官方）](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)。

### 能力清单（官方工具表，节选但完整覆盖功能域）

- **设计→代码（Read）**：`get_design_context`（**默认输出 React + Tailwind**，可改为 Vue / 纯 HTML+CSS / iOS）、`get_metadata`（稀疏 XML 大纲，用于大稿拆分）、`get_screenshot`（PNG，仅单个节点）、`download_assets`（最多 20 节点；同时返回"渲染导出"与"原始上传源图"，PNG/JPG/SVG/PDF，raw 模式每调用上限 20 张源图）、`get_variable_defs`（**返回选中范围的变量与样式：颜色/间距/字体等 token**）、`get_motion_context`（关键帧、缓动、预生成 CSS `@keyframes` 与 motion.dev 代码）、`get_figjam`。
- **设计系统 / Code Connect**：`get_libraries`、`search_design_system`、`get_code_connect_map`、`add_code_connect_map`，以及 Figma 触发的 `get_code_connect_suggestions` / `get_context_for_code_connect` / `send_code_connect_mappings`。
- **代码→设计（Write）**：`use_figma`（通用增删改查：页面、frame、组件、变体、**变量**、样式、文本、图片、auto layout；支持 FigJam 与 Slides）、`generate_figma_design`（把浏览器里的真实 UI 抓成 Figma 图层）、`create_new_file`、`upload_assets`（单文件 ≤10MB，PNG/JPG/GIF/WebP）、`generate_diagram`（Mermaid → FigJam）。
- **生成式插件 / shader**：`list_generative_plugins` / `get_...` / `create_...` / `update_...`，shader 的 list/get/create/update（**写入前必须先加载 `figma-shaders` 或 `figma-generative-plugins` skill**，属强制前置）。
- **Weave 工具组**：`weave_list_tools` / `weave_get_tool_inputs` / `weave_upload_asset` / `weave_run_tool` / `weave_get_tool_output` / `weave_cancel_tool_run`（**消耗 Weave credits，需付费独立 Weave 账号，运行前需用户确认成本**）。
- **账号**：`whoami`（邮箱、所属方案、席位类型；`create_*` 插件/shader 的 `planKey` 必须取自它）。
- **MCP Prompt**：`create_design_system_rules`（生成 rules/instructions 文件）。**并非所有客户端支持 MCP prompts**。
- **Skills**：`figma-use`（等价于 "write to canvas"）、`figma-use-figjam`、`figma-use-slides`、`figma-code-connect`、`figma-generate-design`、`figma-generate-library`、`figma-shaders`、`figma-generative-plugins`；部分随 MCP server 预装。
（来源同上：[Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)、[Workflow lab: Code to canvas](https://help.figma.com/hc/en-us/articles/40219873508247-Workflow-lab-Code-to-canvas)、[Guide to the Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)）

### 支持的客户端（官方表格，2026-09 抓取）

官方明确："你必须使用支持 MCP server 的代码编辑器/应用"，且**只有 Figma MCP Catalog 中列出的客户端能连**（新客户端需申请 waitlist）——[Rate limits & access（官方）](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)；目录页：`figma.com/mcp-catalog`。

| 客户端 | 桌面 server | 远程 server | write to canvas（仅远程） | 插件/skill |
| :---: | :---: | :---: | :---: | --- |
| Amazon Q | ✓ | | | |
| Android Studio | ✓ | ✓ | | |
| Augment Code | ✓ | ✓ | ✓ | |
| **Claude Code** | ✓ | ✓ | ✓ | Figma plugin |
| Claude Desktop | ✓ | ✓ | ✓ | Figma connector |
| **Codex (OpenAI)** | ✓ | ✓ | ✓ | Codex Skills |
| Copilot CLI | ✓ | ✓ | ✓ | Figma plugin |
| **Cursor** | ✓ | ✓ | ✓ | Figma plugin |
| Factory | ✓ | ✓ | ✓ | |
| Firebender | ✓ | ✓ | ✓ | |
| Gemini CLI | ✓ | ✓ | | Extension |
| Kiro | ✓ | ✓ | ✓ | Kiro Powers |
| Openhands | ✓ | | | |
| Replit | | ✓ | | |
| **VS Code** | ✓ | ✓ | ✓ | Figma plugin |
| Warp | ✓ | ✓ | ✓ | |
| Xcode（beta） | | ✓ | ✓ | Figma plugin |

（[Guide to the Figma MCP server，官方表格](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)）
**注意**：`figma.com/mcp-catalog` 我未能抓取成功，上表以帮助中心帮助页表格为准。

### 限制与已知问题（官方，逐条可核实）

**限流（[Rate limits & access，官方](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)）**

| 席位 | Starter | Professional | Organization | Enterprise |
| --- | --- | --- | --- | --- |
| View / Collab | 20/月 | 6/月 | 6/月 | 6/月 |
| Dev / Full | （未列出） | 200/日，10/分 | 200/日，15/分 | 600/日，20/分 |

> 说明：官方表格中 Dev/Full 一行只写了三个数值，结合同页升级指引"If you have a Full or Dev seat on an **Organization** plan (200 tool calls per day), upgrade to an **Enterprise** plan (600 tool calls per day)"，可推断空白格为 Starter。**Organization = 200/日、Enterprise = 600/日**为官方文字直接支持。限流只作用于"读取 Figma 数据"的工具；`add_code_connect_map`、`create_new_file`、`whoami` **豁免**。`generate_figma_design` 亦豁免标准限流（[Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)）。Figma 保留随时调整限流的权利。
> 另注：Schema 2025 页面写的是"Starter 及 View/Collab 席位最多 6 次工具调用/月"，与当前开发者文档的"Starter 20/月"不一致 → 说明官方口径已更新（[Schema 2025](https://help.figma.com/hc/en-us/articles/35794667554839-What-s-new-from-Schema-2025)）。

**其他已知限制（官方）**

- **双 server 同时配置会"抢工具"**：若客户端里同时存在 `http://127.0.0.1:3845/mcp`（桌面）与远程条目，Figma 工具调用可能全部落到桌面 server，导致 `use_figma` / `generate_figma_design` 永不出现；需删除本地条目并重启客户端（工具列表仅在启动时读取）。（[Code to canvas](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/)）
- **token 爆炸**：官方给出的真实报错示例为 Claude Code 报 `get_design_context` 响应 351,378 tokens 超过 25,000 上限，解决方式是调 `MAX_MCP_OUTPUT_TOKENS`。（[Known issues with MCP clients](https://developers.figma.com/docs/figma-mcp-server/mcp-clients-issues/)）
- **Cursor 调用失败**多为认证 token 过期/损坏，需 "Clear All MCP Tokens" 后重登。（同上）
- **大而重的 frame 要避免**：应拆成组件/逻辑块，否则慢、报错或返回不完整。（[Avoid selecting large, heavy frames](https://developers.figma.com/docs/figma-mcp-server/avoid-large-frames/)）
- **取变量时可能返回代码**：模型工具选择出错，需在 prompt 里明确 "Get the variable names and values for this selection"。（[Tried to fetch variables, but got code instead](https://developers.figma.com/docs/figma-mcp-server/variables-vs-code/)）
- **企业级托管授权**目前**只支持 Claude + Okta Cross App Access（XAA）**，否则每个用户都要走 OAuth。（[Rate limits & access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)）
- **`use_figma`（write to canvas）与 code to canvas 目前免费（beta），官方明确"最终会变成按用量计费的付费功能"**。（[Guide to the Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)）
- **权限模型**：只能访问你本来就有权查看/编辑的 Figma 内容；无法直接"跳转"到你粘贴的 URL（只取其中的 node ID）。（同上）

---

## A3. Code Connect / 组件映射

### 官方文档与作用（官方）

- 官方文档入口：[Code Connect Introduction（developers.figma.com）](https://developers.figma.com/docs/code-connect/)；帮助中心：[Code Connect](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect)。
- **可用范围（关键成本点）**：Code Connect 需要 **Dev 或 Full 席位**，且**仅 Organization 与 Enterprise 方案**（[Introduction，官方](https://developers.figma.com/docs/code-connect/)；[Schema 2025](https://help.figma.com/hc/en-us/articles/35794667554839-What-s-new-from-Schema-2025) 亦写明 Code Connect UI 仅 Org/Enterprise）。
- **作用**：把仓库里的真实组件接到 Figma 组件上；Dev Mode inspect 时显示**来自你设计系统的真实代码片段**，而不是自动生成的示例代码；并且**直接提升 Figma MCP server 给 AI agent 的实现精度**（官方原文：connections "enhance the Figma MCP server's ability to guide AI agents with more precise implementation details by giving them direct references to your actual code"）。
- **两条路径**：
  - **Code Connect CLI + 模板文件（推荐）**：框架无关的 TypeScript（`figma.code` 模板），可配任何语言/框架；`figma-code-connect` skill 可由 Figma 组件 URL 自动写模板。
  - **Code Connect UI**：在 Figma 内连 GitHub 仓库；支持**一对多映射**（同一设计组件映射到 React/SwiftUI/Jetpack Compose/Vue 等多实现）；Org/Enterprise GA，含"组件映射建议、基于真实源码的 AI 生成片段、给 LLM 的 MCP 使用说明"。
  - 两者可共存；CLI 创建的连接会出现在 UI 里，但**只能在 CLI 中编辑**。

### 局限性（官方，逐条）

1. **框架专用 parser 已停止维护**：官方明确指出 "Framework-specific parsers will no longer receive updates or support. Template files are now the only actively maintained way"——React/HTML/SwiftUI/Compose 指南都被归入 **Legacy**。（[Connecting React components，官方](https://developers.figma.com/docs/code-connect/react/)）
2. **Code Connect 文件不被执行**：CLI 把代码片段当**字符串**处理。因此**三元/条件表达式会原样输出而非求值**，**不能在 for 循环里动态构造 `figma.connect` 调用**。（同上）
3. **属性映射需手工**：设计与代码的 props 通常不是 1:1，必须写 `figma.string/boolean/enum/instance/children/nestedProps/slot` 等映射。（同上）
4. **嵌套实例必须各自单独连接**；变体间图层名不一致时要用 `figma.children("*")` 通配或统一命名。（同上）
5. **slot 不遍历子内容**：默认只渲染 slot 引用本身；只有 `connectedInstances` 才渲染有 Code Connect 定义的实例，其余文本/图层/嵌套实例会被省略。（同上）
6. **code to canvas 明确"还不会做组件与样式映射"**："Captures come in as plain Figma layers with variables bound if any are available. They are **not automatically mapped to your library components or styles**. Further design system support is on the roadmap."（[Turn coded screens into editable design layers，官方](https://help.figma.com/hc/en-us/articles/40826832449303-Turn-coded-screens-into-editable-design-layers)）

---

## A4. Design tokens / Variables：Figma MCP 如何输出 token，以及 Style Dictionary 等

### Figma Variables 本身（官方）

- **变量模式上限**：Professional 每集合 ≤10 模式；Organization ≤20；Enterprise 无限（配合 Extended collections）。（[Figma plans and features](https://help.figma.com/hc/en-us/articles/360040328273-Figma-plans-and-features)、[Schema 2025](https://help.figma.com/hc/en-us/articles/35794667554839-What-s-new-from-Schema-2025)）
- **Variables REST API 仅 Enterprise**（官方 plans 表，同上）。
- **Dev Mode 中可查看变量与"建议变量"**（[Guide to Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode)）。
- **Check designs**（Org/Enterprise，早期访问）可审计硬编码值并建议应使用的变量。（[Schema 2025](https://help.figma.com/hc/en-us/articles/35794667554839-What-s-new-from-Schema-2025)、[Turn coded screens…](https://help.figma.com/hc/en-us/articles/40826832449303-Turn-coded-screens-into-editable-design-layers)）

### Figma MCP 如何输出 tokens（官方）

- **工具**：`get_variable_defs` —— "Returns the variables and styles used in your Figma selection, such as colors, spacing, and typography"；示例 prompt：「get the variables used in my Figma selection」「what color and spacing variables are used…」「list the variable names and their values…」。（[Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)）
- **反向写 token**：`use_figma` 可「create a color variable collection from my design tokens」「set up spacing tokens in my Figma file」。（同上）
- **code to canvas 的变量自动绑定**：若目标文件已加入含变量的 library，Figma 会**自动把颜色/数字/字符串变量绑定到抓取图层的兼容属性**；匹配优先级为 **① 网页 CSS 变量名 ↔ Figma 变量的 code syntax → ② 与变量名匹配 → ③ 最佳匹配且 scope 最窄的变量**；**带透明度的颜色变量不会被绑定**。（[Turn coded screens…](https://help.figma.com/hc/en-us/articles/40826832449303-Turn-coded-screens-into-editable-design-layers)）
- **支持的（可绑定的）属性**：frame 的 fill/stroke 颜色、描边宽度、圆角、padding、gap、图层不透明度；文本层的文字色、字体族/字号/字重/行高/字距；其他矢量层的 fill/stroke。（同上）
- **已知坑**：① 模型可能选错工具，直接把代码而不是变量吐回来（[官方 FAQ](https://developers.figma.com/docs/figma-mcp-server/variables-vs-code/)）；② 构建过程把 CSS 变量名压缩/混淆（如 `--font-size` → `var(--Mhs7de)`）后 Figma 无法匹配，建议从 dev server URL 抓取。（[Turn coded screens…](https://help.figma.com/hc/en-us/articles/40826832449303-Turn-coded-screens-into-editable-design-layers)）

### Style Dictionary / Tokens Studio（第三方工具，与官方 MCP 的关系）

- **Style Dictionary**（Amazon 开源的 token 构建系统）官方定位："Export your Design Tokens to any platform - iOS, Android, CSS, JS, HTML, sketch files, style documentation…"，并**前向兼容 Design Tokens Community Group (DTCG) 规范**（[styledictionary.com 首页](https://styledictionary.com/)，版本页含 v4 迁移/v3 文档）。
- **Tokens Studio for Figma**：官方文档存在完整的 **Export to Figma**（21 种 token 类型 → Figma Variables/Styles：Boolean/Text/Color/Gradient/Opacity/Dimension/Number/Spacing/Sizing/Border Width/Radius/Border/Box Shadow/Typography 等）与 **Import Variables from Figma** 流程，并有 "Style Dictionary + SD Transforms" 章节（[Tokens Studio「Export to Figma Guide」](https://docs.tokens.studio/figma/export/)；[「Import from Figma」章节同站](https://docs.tokens.studio/figma/import/)）。
- ⚠️ **重要边界**：**Figma 官方 MCP 文档中没有任何 "Style Dictionary 集成/导出" 工具**。目前官方链路是 `get_variable_defs`（读 token）+ `use_figma`（写变量集合），**Style Dictionary / Tokens Studio 属于 Figma 之外的独立工具链**，需要自己用插件/REST API 把桥接起来。→ 关于「Figma MCP 直接输出 Style Dictionary 格式」的说法：**未核实，且官方文档不支持该说法**。

---

## A5. 逆向链路：从代码生成可编辑 Figma 设计稿

Figma 官方在 2026 年**明确区分两个功能**，容易混淆（[Code to canvas 文档开头即给出 Note](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/)）：

| | **Code to canvas**（"从代码到画布"，即用户说的 code to Figma） | **Write to canvas** |
| --- | --- | --- |
| 工具 | `generate_figma_design` | `use_figma` |
| 做什么 | 把**浏览器里正在运行的真实 UI**（生产/预发/localhost）抓成 Figma Design 图层；可抓整屏、单个元素、整条多步流程 | agent **直接在画布上创建/修改**原生 Figma 内容（frame、组件、变体、变量、auto layout、样式、文本、图片） |
| 前提 | **必须用远程 MCP server**；仅部分客户端；仅部分客户端 | 同样**仅远程 server** |
| 输出 | "Captured frames become standard Figma design layers"，可整理/复制/重排/改文案/标注 | 原生可编辑对象 |
| 席位 | **任意席位可在草稿里创建/编辑文件**；要编辑草稿之外的既有文件需 **Full 席位 + 编辑权限** | 同上（受席位与文件权限约束） |

### 支持的客户端（code to canvas，官方列表）

Augment、Claude Code、Codex、Cursor、Factory、Firebender、VS Code、Warp、**Xcode 27 beta**。（[Code to canvas](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/)、[Guide to the Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)）

### 开放状态与形态（官方）

- **开放状态**：功能**处于 beta、持续改进**，write-to-canvas/code-to-canvas **目前免费**，官方明确"**最终会变成按用量计费的付费功能**"。（[Guide to the Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)）
- **操作方式**：在 agent 里说 "Start a local server for my app and capture the UI in a new Figma file"（或给既有文件 URL、或"capture to my clipboard"）；客户端会起本地服务、注入脚本、开浏览器；浏览器里用抓取工具条选 **Entire screen** / **Select element**；对线上站点可让客户端用 Playwright 注入脚本。（[Code to canvas](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/)）
- **另外两种"代码/原型 → 可编辑图层"的官方入口**：① Figma Chrome 扩展；② 从 Figma Make 预览 "Copy design layers"。（[Turn coded screens…](https://help.figma.com/hc/en-us/articles/40826832449303-Turn-coded-screens-into-editable-design-layers)）
- **闭环**：抓回来后可在画布上评审 → 再把优化后的 Figma frame 链接交回 agent 实现，官方称之为 "UI rendered from code → canvas for alignment → back to code for implementation" 的 roundtrip。官方 skill 名：`/prototype-to-figma`、`/figma-generate-design`、`/figma-generate-library`。（[Workflow lab: Code to canvas](https://help.figma.com/hc/en-us/articles/40219873508247-Workflow-lab-Code-to-canvas)、[Code to canvas](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/)）

### 不支持 / 会掉质量的情况（官方）

- **不做组件与样式映射**（只能绑变量，见 A3/A4）。
- **复杂滚动驱动、`<canvas>` 渲染、虚拟列表页面可能抓不干净**；建议改用"元素级抓取"。
- **`chrome://` 等特权页无法抓取**。
- 抓取前在带动画的页面上要先滚到底，否则交互/内容缺失。
- 官方提示：**变量库必须在抓取前就加入目标文件**，否则不会绑定。
（以上均出自 [Turn coded screens…](https://help.figma.com/hc/en-us/articles/40826832449303-Turn-coded-screens-into-editable-design-layers)）

---

## A6. 「可编辑矢量 vs 生成位图」与「还原度」评测方法与数字

### A6.1 矢量/图层 与 位图 的边界（官方可核实）

**「可编辑矢量」侧（code to canvas / write to canvas）**

- 抓取结果落地为**标准 Figma 设计图层**（frame / text / vector），可绑定变量、可 auto layout 化、可复用组件、可标注、可 Version history 对比；**文本是真文本层**（支持 text color fills、font family/size/weight、line height、letter spacing 绑定），矢量层支持 fill/stroke 绑定。（[Turn coded screens…](https://help.figma.com/hc/en-us/articles/40826832449303-Turn-coded-screens-into-editable-design-layers)）
- **注意"半矢量"限制**：自动绑定的是**变量**，**不是组件/样式**；复杂动画、canvas 渲染、虚拟列表会退化。（同上）

**「位图」侧（MCP 里的截图/导出工具）**

| 需求 | 该用哪个工具 | 输出 | 节点数 | 格式 | 原始源图 |
| --- | --- | --- | --- | --- | --- |
| 让 agent **看**设计长什么样 | `get_screenshot` | PNG（inline base64 或 URL） | 单节点 | 恒为 PNG | ❌ 总是重新渲染 |
| 让 agent **交付/导出/跨文件搬运**素材 | `download_assets` | 仅 URL | ≤20 | PNG/JPG/SVG/PDF（导出）；原格式（raw） | ✅ raw 模式返回原始上传二进制 |

（[Tools and prompts，官方](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)）
关键点：`download_assets` **每次调用同时返回"渲染导出图"与"原始源图"两者**；无导出设置时按 `defaultFormat`/`defaultScale`（0.01–4×），scale=1 时渲染长边约上限 **4096px**；raw 源图每次最多 **20 张**（超出会置 `rawImagesTruncated: true`）；上传侧 `upload_assets` **单文件 ≤10MB**。（同上）
→ 也就是：**"图"可以拿到，但拿到的是位图/导出物；"可编辑"只能靠 code to canvas / write to canvas 这条路径**，二者不是同一个工具。

### A6.2 设计稿→代码 还原度的评测方法与具体数字

#### (1) Design2Code（NAACL 2025）—— 这一领域的"基准鼻祖"

- **规模与方法**：人工从 C4 validation 里筛出 **484 个真实网页**（平均 31,216 tokens/页、平均 158 个 HTML 标签、DOM 平均深度 13、平均 22 种标签），另有 80 例 Design2Code-HARD。指标：**CLIP 相似度**（先去文字）+ **LLEM 低层元素匹配**（Block-Match / Text / Position / Color，位置用归一化中心坐标 1−max(|Δx|,|Δy|)，颜色用 CIEDE2000）。人类评估：Prolific 招募，每题 5 人多数票，时薪 $16。（[arXiv:2403.03163v3，2025-02-09 修订](https://arxiv.org/html/2403.03163v3)）
- **GPT-4o（direct）**：Block 93.0 / Text 98.2 / Position 85.5 / Color 84.1 / CLIP 90.4；**GPT-4V（direct）**：85.8 / 97.4 / 80.5 / 73.3 / 86.9；Claude 3 Opus：90.2 / 97.5 / 77.9 / 71.4 / 87.0；开源 LLaVA-1.6-7B：50.4 / 87.9 / 69.1 / 63.4 / 84.6。（同上）
- **人评关键数字**：以 Gemini 1.0 Pro Vision direct 为基线两两比较；**49% 的 AI 生成网页被认为可与原网页"互换部署"**；而在盲测"哪个设计更好"时，**GPT-4V 生成的网页在 64% 的案例里被认为比原参考网页设计得更好**。（同上）
- **作者结论**：模型主要在"回忆视觉元素"和"生成正确布局"上失分。（[arXiv:2403.03163 摘要页，2024-03-05 提交，v3 2025-02-09](https://arxiv.org/abs/2403.03163)）

#### (2) DesignCoder（ACM / Information and Software Technology 2026）

- **出处**：arXiv:2506.13663；期刊版为 *Information and Software Technology* Vol 198（DOI [10.1016/j.infsof.2026.108214](https://dl.acm.org/doi/10.1016/j.infsof.2026.108214)）。
- **方法**：UI Grouping Chain（视觉切分 → 语义抽取 → 组件分组，构造组件树）+ 分治式代码生成 + 基于 Appium 渲染截图的视觉感知自修复；目标框架 **React Native**；数据集 **300 个移动 UI 稿**（250 来自 Figma 社区 + 50 来自企业 Sketch 项目）。（[ar5iv 全文](https://ar5iv.labs.arxiv.org/html/2506.13663)）
- **相比 SOTA 基线 Prototype2Code**：视觉指标 **MSE +37.63%（一说 37.64%）、CLIP +9.52%、SSIM +12.82%**；结构指标 **TreeBLEU +30.19%、Container Match +29.31%、Tree Edit Distance +24.67%**（企业数据集为 +24.31%/+4.60%/+11.69% 与 +17.78%/+22.45%/+26.33%）。（同上）
- **绝对数值（Table 1/2，Figma 数据集）**：DesignCoder **MSE 22.65 / CLIP 0.92 / SSIM 0.88 / TreeBLEU 0.69 / CM 0.75 / TED 28.21**；对照 Prototype2Code 36.32 / 0.84 / 0.78 / 0.53 / 0.58 / 40.00；GPT-4o 70.59 / 0.69 / 0.61 / 0.24 / 0.31 / 49.85；Claude-3.5 82.47 / 0.67 / 0.52 / 0.24 / 0.33 / 41.49；企业级平台 CodeFun 28.45 / 0.93 / 0.71 / 0.52 / 0.61 / 35.63。（同上）
- **开发者用户研究（5 分制，DesignCoder vs 基线）**：代码可用性 **4.52 vs 3.57**；修改效率 **4.20 vs 3.24**；可读性 **4.75 vs 4.43**；可维护性 **4.32 vs 3.32**。（同上）

#### (3) Waffle（Purdue，image→HTML 微调方法）

- **测试集**：自建 WebSight-Test **500 例**（合成网页）+ Design2Code **484 例**（真实网页）。指标：HTML-Match（像素级完全匹配的百分比，去掉样式与属性）、CW-SSIM、CLIP、LLEM。（[ar5iv 全文 arXiv:2410.18362](https://ar5iv.labs.arxiv.org/html/2410.18362)）
- **WebSight-Test HTML-Match**：**VLM-WebSight + Waffle 37.00%**（标准微调 28.00%）；Moondream2 + Waffle 27.60%（21.60%）；**GPT-4o 仅 11.40%**、GPT-4o mini 10.20%、Gemini 1.5 Pro 9.40%。（同上）
- **Design2Code**：VLM-WebSight+Waffle CW-SSIM 0.2815 / CLIP 85.98 / LLEM 77.81（GPT-4o 为 0.2776 / 89.03 / 83.67 —— 即**复杂真实网页上 GPT-4o 在 CLIP/LLEM 仍胜出**）；Moondream2+Waffle 在 Design2Code 上全面弱于 GPT-4o 系列。（同上）
- **结论性数字**：Waffle 相对标准微调最高提升 **+9.00 pp HTML-Match、+0.0982 CW-SSIM、+32.99 CLIP、+27.12 pp LLEM**；训练语料为 231,940 网页-HTML 对。（同上）

#### (4) 2026 年的新发现：模型会"照抄重复模式"而不是照抄像素

- **Pattern over Pixels**（ASE 2026 / 41st IEEE/ACM ASE，arXiv:2608.03691，**2026-08-04**）：在"重复 UI 模式的填空任务"上，从 Design2Code 的 30 个网页构造 **1,440 张评测截图**（卡片宽度/文字字号扰动，含加噪与边界位置），评测 5 个前沿 MLLM。
  - **平均偏置率 69.78%（卡片宽度）与 80.22%（文字字号）**；**平均准确率仅 21.17% 与 7.89%**；Codex-5.3 最好，但从卡片 68.61% 掉到文字 13.89%；Flash-3.0 在文字上偏置率达 **96.11%**。
  - 结论：**推理越用力偏置越低**，但定性证据显示"模型能识别异常元素，仍然选择覆盖它以符合模式"。（[arXiv:2608.03691](https://arxiv.org/abs/2608.03691)）
  - 这一条对 A6 很关键：**"还原度指标高"不等于"细节忠实"**。

#### (5) 2026 年产业侧的经验数字（第三方，非受控实验）

- **Figma-to-code 的时间节省与返工**：第三方评测称 2026 年"减少前端开发时间 30–60%，但产出仍需 **20–40% 手工清理**"；设计稿纪律决定质量（"Accuracy is directly proportional to design discipline"）。（[Dupple《Screenshot to Code: 2026 AI Tools Tested + Real Limits》，2026-04-07](https://dupple.com/blog/screenshot-to-code)）
- 另一篇 2026-06 的横向评测称生成器"能到 70–90%，但**没有一个是原样可上线的**，命名/状态逻辑/无障碍/组件库集成仍需人做"。（[Dupple，2026-06-16](https://dupple.com/learn/best-design-handoff-tools)）
- 官方 MCP 试用的"效率"说法（**注意是厂商/媒体口径，不是独立评测**）：AIbase 称"早期测试显示开发迭代时间可减少 60%–80%"。（[AIbase，2025-09-24](https://www.aibase.com/news/21538)）

---

## A7. Figma 官方 MCP vs 第三方（Builder.io / Anima / Locofy 等）

### 结论先行

官方 MCP 的**结构性优势是"双向"**：`get_design_context` 等（设计→代码）+ `use_figma` / `generate_figma_design`（代码→画布）+ Code Connect 映射 + 变量自动绑定，且这些能力**只有远程官方 server 提供**。第三方工具的主战场仍是**单向"设计→代码"，但在"映射到你仓库里已有的组件/框架"这件事上更成熟**，并且通常提供官方没有的托管产物（可分享 URL、playground、多框架导出）。

### 逐家（可核实来源）

| 工具 | 定位与形态 | 与 Figma MCP 的关系 | 价格（来源口径） |
| --- | --- | --- | --- |
| **Builder.io Visual Copilot 2.0** | Figma 插件把选区转成 React / Next / Vue / Angular / Svelte；经由 CLI 落进你的仓库；把设计映射到**你自己的组件** | Builder 官方明确说 **"Figma MCP is the right layer for pulling design context, writing to the canvas, and sending live UI back into Figma"**，Builder 自己负责"超出一次会话的持久工作"（会话工具的边界是它自己承认的核心短板） | 免费插件 + 付费版（第三方口径：Free ≤5 用户 + 有限 Agent Credits，其后按用户+用量计费） |
| **Anima** | 自有 **Anima MCP**：远程 HTTP 端点 `https://public-api.animaapp.com/v1/mcp`，支持 Claude Code / Cursor / 支持 remote HTTP MCP 的客户端；可"给一个 Figma URL 就在你的项目里实现选中 frame"；playground 是**真实 Git 仓库**（可 clone、改、push）；可读取团队 design system（**可能需 Enterprise 配置**） | **与 Figma MCP 并行/互补**，不是替代：它走自己的 OAuth 与 Anima 账号，能发布到 Anima URL | 第三方口径：Free；Standard $12/月；Pro $22–24/月；Enterprise 起 $500/月（年付） |
| **Locofy (Lightning)** | 多框架 D2C（React / Vue / Angular / Next.js / Gatsby / HTML+CSS / **React Native / Flutter**），处理断点与交互；官方自述用 "Large Design Models"，按 **LDM token** 计费 | 未发现官方 MCP server 与其对 Figma MCP 的定位说明 → **未核实** | 第三方口径：Free 600 tokens；Starter $33.30/月；Pro $99.90/月；Enterprise 定制（年付）。**官方站 locofy.ai 只返回了标题，未取到产品页面细节** |
| **社区/免费替代** | Builder.io 在 2025-07 的教程里推荐免费社区 server **[GLips/Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP)** 作为"不想付费"的选项 | 早于官方 server 的社区方案 | 免费 |
| **Supernova** | 停在 design tokens 层：把设计/token/代码库汇总，向工程侧推生产级产物，**并含一个 MCP server** | tokens 管道 + MCP 导出，属"token 一致性"专项 | 第三方口径：个人免费版；Pro $20/builder 席位/月 或 $35/full 席位/月（年付，≤25 席位） |

来源：[Builder.io《How to Use Figma's Remote MCP》，2026-04-02](https://www.builder.io/blog/figma-remote-mcp)；[Builder.io《Design to Code with the Figma MCP Server》，2025-07-03（2025-11-18 更新）](https://www.builder.io/blog/figma-mcp-server)；[Anima MCP 官方文档](https://docs.animaapp.com/docs/anima-mcp)（页面标注 "Updated about 2 months ago"）；[Dupple 2026-06-16（含各家价格与"70–90% 需人工收尾"的判断）](https://dupple.com/learn/best-design-handoff-tools)；[Locofy 官网](https://www.locofy.ai/)。

### ⚠️ 对比的方法论警告

**没有找到任何官方 MCP 与第三方工具的受控同任务对比实验**（同一设计稿、同一目标仓库、同一评测指标）。上表中"谁更强"的说法**全部是厂商博客或评测站的编辑判断**，不可当作测评数字使用。（本次检索未发现此类 head-to-head 基准 → 见「未核实项」）

---

# 主题 B：设计生成评测基准

## B1. Design Arena（designarena.ai）

### 方法论（**官方来源可核实**：[Design Arena Methodology](https://notes.designarena.ai/methodology/)）

- **排名来源**：社区两两偏好投票，"每一次两两比较等权"。
- **评分模型**：**用 Bradley–Terry 模型近似 Elo** —— 迭代至强度估计稳定（阈值 **0.0001**）或最多 **200 次迭代**；每次用"总胜场 ÷ 对所有对手的比较概率之和"更新强度；强度归一化后按 **`Rating = 400 × log₁₀(strength)`** 转成评分。
- **门槛与统计**：投票数低于阈值（**2025-10-12 时为 15 票**）的参与者在计算前被剔除；误差用**约 95% Wilson 置信区间**；**榜单每 2 小时更新**；**少于 50 票的模型打 "new" 标签**（预期波动大）。（[Methodology 笔记页](https://notes.designarena.ai/methodology/)）
  > ⚠️ **官方两处口径不完全一致**：notes 方法论页写"榜单与柱状图过滤掉少于 **15** 次两两比较的模型"，而官网当前 methodology 页写"主柱状图过滤掉少于 **50** 次两两比较的模型，pending updates soon" ⇒ **以官网当前页为准时门槛是 50，notes 页未同步**。
- **防偏置设计（官方 About 页的锦标赛图）**：**模型身份全程匿名**；每个投票会话**随机抽 4 个模型 + 1 个备用**，同 prompt 同时生成；赛制是 **4 模型 5 场对战**——Battle 1（A vs B）、Battle 2（C vs D）→ Battle 3（胜者组）、Battle 4（败者组）→ Battle 5（季军/冠军加赛），**每场产生 1 票，共 5 票**，从而保证一次会话就能给出 1–4 名的完整排序，且"每场两两比较都贡献有意义的数据"。官方强调这是为了"在每一次会话里榨出最多的有效比较"。（[About | Design Arena（官方 methodology 页）](https://www.designarena.ai/about)）
- **官方自陈的定位与门槛（同上）**：自我定位为 "A subjective framework for evaluating AI design capabilities"；**主柱状图过滤掉两两比较少于 50 次的模型**；模型在达到"足够的两两比较（typically 200，按分类不同）"之前标记为 **preliminary**；官方口号是 **"A mirror, not a scoreboard"（是镜子，不是记分牌）**。
- **Builder 类别另有一套流程（同上）**：同样 prompt 一次性（one-shot）发给所有 builder，随机两两盲投；官方明确称这是 "an initial, best-effort procedure"，并计划扩展为多轮 prompt、更广任务集、更多 builder。
- **prompt 处理**：用户输入 <5k 字符；有 "enhance prompt" 按钮，调用 **`gemini-2.5-flash-lite-preview-09-2025`**（官方说明是出于成本考虑）；输入经同一模型审核（禁止政治、色情、仇恨等）。
- **系统提示词公开**：单轮 HTML 各 arena 的 system prompt 公布在 `designarena.ai/system-prompts`（页面称直接由源码渲染）；agentic 评测的 system prompt 需邮件索取。
- **采样参数**：不统一到单一值，跟随各 provider 默认；`max_tokens` 按 provider 分别设置；reasoning 模型用其必需设置（如 temperature=1）。
- **Arena 分类**：Model Arena（单文件 html/js/css）、Builder Arena（返回可部署 URL）、Mobile Builder Arena、Image Arena、Video Arena、Audio Arena、Agent Arena（工具调用 + 部署到 Vercel，参评者含 Cursor/Devin/Google CLI/Codex/Factory Droids/Claude Code）、Slides Arena、Video-to-Video Arena。

### 组织背景（官方）

- 由 **Arcada Labs / The Intelligence Company** 运营（博客 logo 文件名为 Arcada Labs；官网页脚 "© 2026 Design Arena by Intelligence"）；官方自述 Design Arena 是"**世界首个 AI 设计基准**，由 **190+ 国家、超过 2,000,000 名用户**投票驱动"；同公司还有 Prediction Arena、Social Arena、Audio Arena。（[About The Intelligence Company](https://notes.designarena.ai/about/)）
- **YC 身份已核实（一手）**：Design Arena 在 **Y Combinator 官方 Launch YC 页**有发布帖《Design Arena - #1 Benchmark for AI Design》，发布人 **Grace Li**，页面相对时间标注 "about 1 year ago"；正文自述 "**Design Arena is the first crowdsourced benchmark for AI-generated design**"、发布 4 周吸引 **47K+ 用户、136 个国家**、隶属 **Arcada Labs**（"our broader mission at Arcada Labs"）；团队页写明 **Kamryn Ohly（CTO，哈佛计算机+教育，前 Apple）** 与 **Grace Li（CEO，哈佛计算机+神经科学，前 Apple）**，"We're all best friends from Harvard!"。（[Launch YC: Design Arena | Y Combinator](https://www.ycombinator.com/launches/O5h-design-arena-1-benchmark-for-ai-design)）
- ⚠️ 但**具体 YC 批次**（媒体称 S25）在 YC 官方 Launch 页上**没有标注** → 见「未核实项」。

### 2026 年 9 月各分类榜首与分数

> ⚠️ **数据获取方式**：`designarena.ai/leaderboard/*` 四个分类页我都成功抓取到页面，但**榜单表格为客户端渲染，正文空白**（只拿到站点导航）。因此下表采用第三方在 **2026-09-02** 的静态抓取快照，快照页明确标注 `Scraped 2026-09-02T18:07:1x`，并给出回源链接到 designarena.ai 对应榜单。

| 分类 | #1 | #2 | #3 | #4 | #5 | 参评模型数 | 来源（快照时间） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Website** | **Kimi K3**（Moonshot AI）**1362** | GPT-5.6 Sol (XHigh) 1338 | Claude Fable 5.1 1334 | GPT-5.6 Sol (Medium) 1332 | Muse Spark 1.2 1329 | 173 | [BenchmarkList 快照 2026-09-02T18:07:19Z](https://benchmarklist.com/arenas/design_arena_website/) |
| **UI Component** | **Claude Fable 5.1**（Anthropic）**1381** | Kimi K3 1379 | Claude Opus 5 1370 | Qwen3.8 Max 1358 | GPT-5.6 Sol (XHigh) 1356 | 154 | [BenchmarkList 快照 2026-09-02T18:07:19Z](https://benchmarklist.com/arenas/design_arena_ui_components/) |
| **Image to HTML** | **Kimi K3** **1259** | Qwen3.8 Max 1243 | Muse Spark 1.2 1241 | GPT-5.6 Sol (Medium) 1239 | Claude Fable 5 1234 | 30 | [BenchmarkList 快照 2026-09-02T18:07:21Z](https://benchmarklist.com/arenas/design_arena_image_to_website/) |
| **Graphic Design** | **GPT Image 2**（OpenAI）**1451** | Reve 2.1 1389 | Reve 2.0 1369 | Grok Imagine Image 2 1325 | GPT-Image-1.5 1312 | 73 | [BenchmarkList 快照 2026-09-02T18:07:31Z](https://benchmarklist.com/arenas/design_arena_graphic_design/) |

**同快照下的其他相关分类（补充）**

| 分类 | #1 | #2 | #3 | 来源 |
| --- | --- | --- | --- | --- |
| Full-Stack Web App | Claude Opus 5 **1362** | Kimi K3 1358 | Qwen3.8 Max 1332 | [BenchmarkList](https://benchmarklist.com/arenas/design_arena_fullstack/) |
| Frontend Web App | Kimi K3 **1335** | Qwen3.8 Max 1335 | Claude Fable 5 1288 | [BenchmarkList](https://benchmarklist.com/arenas/design_arena_frontend/) |
| Image-to-Web App | Kimi K3 **1291** | Claude Fable 5 1271 | Muse Spark 1.2 1271 | [BenchmarkList 快照 2026-09-02T09:18:05Z](https://benchmarklist.com/arenas/design_arena_image_to_webapp/) |
| Agentic Game Dev | Claude Fable 5 **1285** | GPT-5.6 Sol (XHigh) 1268 | Claude Opus 5 1267 | [BenchmarkList](https://benchmarklist.com/arenas/design_arena_agentic_game_dev/) |
| Godot Game Dev | Claude Fable 5 **1344** | GPT-5.6 Sol (Medium) 1271 | Grok 4.5 1270 | [BenchmarkList](https://benchmarklist.com/arenas/design_arena_godot_game_dev/) |
| Android App | Claude Fable 5 **1303** | Grok 4.6 1300 | Claude Opus 5 1278 | [BenchmarkList](https://benchmarklist.com/arenas/design_arena_android/) |
| ASCII Art | Claude Opus 5 **1383** | Claude Fable 5 1363 | Muse Spark 1.1 1315 | [BenchmarkList 快照 2026-09-02T18:07:28Z](https://benchmarklist.com/arenas/design_arena_ascii/) |
| Data Visualization | Claude Fable 5.1 **1393** | Kimi K3 1369 | Claude Opus 5 1358 | [BenchmarkList 快照 2026-09-02T18:07:21Z](https://benchmarklist.com/arenas/design_arena_data_viz/) |
| 3D Design | Kimi K3 **1438** | GPT-5.6 Sol (XHigh) 1425 | Claude Fable 5.1 1418 | [BenchmarkList 快照 2026-09-02T18:07:21Z](https://benchmarklist.com/arenas/design_arena_3d/) |

> **数字新鲜度警告（一手可核实）**：Design Arena 官方 Changelog 显示 **2026-09-20 新增 `gpt-6-astra-max`、09-22 新增 `claude-opus-5-5`/`gpt-6-sol`/`gpt-6-luna`、09-23 新增 `grok-4.7`/`arrow-2-telos`**；另外 **09-15 退役了 3 个模型**（grok-4-20-beta 两个变体 + gemini-3.1-pro-preview）。（[Design Arena Changelog（官方）](https://www.designarena.ai/changelog)）
> ⇒ 上表快照是 **09-02**，**到 09-24 名次与分数极可能已变化**；尤其 `claude-opus-5-5`（09-22 才入场）在快照里根本不存在。
> **另有第三方聚合口径**（票数合并拟合，非按分类，可信度更低）：DataLearner 的 "Arcada Labs Code Categories Arena Leaderboard"，数据版本 **2026-09-21**，166 个模型，榜首 **Kimi K3 1385.00（95% CI ±8.9，6,718 票）**，其后为 Muse Spark 1.3 Max 1369.00（12,744 票）、GPT-6 Astra (xhigh) 1365.00、Muse Spark 1.3 (xhigh) 1363.00（16,388 票）。（[DataLearnerAI](https://www.datalearner.com/en/leaderboards/external/arcada-code)，数据版本 2026-09-21；**第三方转载，官方页面未复核**）

**官方博客的交叉印证**：Design Arena 官方博客 2026-07-23 发文《Kimi K3's Design Secret may be in its Thinking Traces》，明确写 **"Kimi K3 … ranks 1st on our single-shot Frontend Arena with an Elo of 1392"**，比 Kimi K2.6 高 10 位、比 Kimi K2.7 Code 高 16 位。（[Design Arena Blog，2026-07-23](https://notes.designarena.ai/kimi-k3s-design-secret-may-be-in-its-thinking-traces/)）
→ 注意：**同一模型在 "single-shot Frontend Arena" 是 1392，而在 9 月 2 日快照的 "Frontend Web App Arena" 是 1335、"Website" 是 1362**。**不同 arena 的 Elo 不可直接互相比较**，引用时必须带分类名。

### 局限（官方自述 + 结构性问题）

- 官方把"少于 50 票打 `new` 标签"、"约 95% Wilson 置信区间"、"达到 ~200 次两两比较前标 `preliminary`"写进方法论，等于**官方自己承认新模型/低票数模型的分数不可靠**。
- 官方只公开"投票计数 + 统计口径"，**未公开投票者质量控制机制**；notes 页本身也说榜单之外的数据并非全部开源，并自定位为 "subjective framework"。
- **基准测的是"单次/少轮生成的观感偏好"**：官方文档并未声称它衡量可维护性、可访问性、真实工程集成或"生成结果在 Figma 里是否可编辑"。
- **采样参数不标准化**（跟随各 provider 默认、`max_tokens` 各自设置）⇒ 同一模型换个 provider 配置就可能得到不同分数。

---

## B2. WebDev Arena / LMArena 的 WebDev 榜

### 现状与数据来源（重要更正）

- 2026 年 9 月被第三方标注为 "WebDev Arena" 的榜单，**回源链接是 `https://arena.ai/leaderboard/code`**（不是 lmarena.ai）：快照页写明 `Coding / Arena / Scraped 2026-09-02T18:07:11Z / Source ↗ https://arena.ai/leaderboard/code`。（[BenchmarkList WebDev Arena](https://benchmarklist.com/arenas/arena_ai_code/)）
- `arena.ai` 本次抓取被 **Cloudflare 403 拦截**；`lmarena.ai` 多次抓取 `fetch failed`。→ **LMArena 站点本身是否仍单独托管 WebDev 榜，未核实。**
- 因此下表用**两个独立第三方来源交叉验证**（同一数字集）：BenchmarkList 快照（2026-09-02）与法国媒体 Blog du Modérateur 报道（2026-09-03）。

### 2026 年 9 月榜首与 Elo（Arena ELO，124 个模型）

| # | 模型 | 开发者 | Elo | 与 #1 差距 |
| --- | --- | --- | --- | --- |
| 1 | **claude-fable-5.1-max** | Anthropic | **1765.37** | Leader |
| 2 | qwen3.8-max-0902 | Alibaba | 1687.74 | −77.6 |
| 3 | claude-opus-5-max | Anthropic | 1687.23 | −78.1 |
| 4 | kimi-k3-max | Moonshot | 1673.82 | −91.5 |
| 5 | qwen3.8-max | Alibaba | 1669.22 | −96.1 |
| 6 | claude-opus-5-high | Anthropic | 1661.23 | −104.1 |
| 7 | grok-4.6-high | SpaceXAI | 1629.06 | −136.3 |
| 8 | claude-fable-5 | Anthropic | 1628.42 | −136.9 |
| 9 | hy4-preview | Tencent | 1625.78 | −139.6 |
| 10 | qwen3.8-flash-next | Alibaba | 1622.28 | −143.1 |

来源：[BenchmarkList WebDev Arena 快照，Scraped 2026-09-02T18:07:11Z](https://benchmarklist.com/arenas/arena_ai_code/)。
交叉印证：[Blog du Modérateur《IA : les meilleurs modèles pour le code et le développement web en septembre 2026》，2026-09-03](https://www.blogdumoderateur.com/ia-meilleurs-modeles-code-developpement-web-septembre-2026/) —— 该文数字为 1,765 / 1,688 / 1,687 / 1,674 / 1,669 / 1,661 / 1,629 / 1,628 / 1,626 / 1,622（四舍五入），并说明 **Claude Fable 5.1 于 2026-09-01 发布**、**Claude Opus 5 Max 是上月榜首**、**中国实验室占据前十的一半**。

### ⚠️ 但 9 月内榜首至少变过一次 —— 任何"9 月榜首"都必须带日期

| 观察日期 | 榜首 | 分数 | 票数 | 来源 |
| --- | --- | --- | --- | --- |
| 2026-09-02 | claude-fable-5.1-max | 1765.37 | — | [BenchmarkList 快照](https://benchmarklist.com/arenas/arena_ai_code/)；[Blog du Modérateur 2026-09-03](https://www.blogdumoderateur.com/ia-meilleurs-modeles-code-developpement-web-septembre-2026/) |
| **2026-09-05** | **gpt-6-astra-max** | **1797** | **1,199** | [Hello, AI《Astra Takes WebDev》，2026-09-07](https://helloai.com/articles/gpt-6-astra-takes-webdev-elo-gate-holds) |
| 2026-09-05（同期对照） | claude-fable-5.1-max 退居其后 | 1762 | 2,275 | 同上 |
| 2026-09-24 | （有中文商业站点称 claude-opus-5-5-max） | 1818 | — | **低可信度单一来源**：[LumeValley，2026-09-24](https://www.lumevalley.com/article-10150.html) → **未核实** |

补充事实（一手可核实的旁证）：Design Arena 官方 Changelog 显示 `gpt-6-astra-max` 于 **2026-09-20** 才被加入其榜单，而 Hello, AI 一文称 **GPT-6 Astra 于 2026-09-03 由 OpenAI 发布**（API id `gpt-6-astra`）。（[Design Arena Changelog](https://www.designarena.ai/changelog)；[Hello, AI 2026-09-07](https://helloai.com/articles/gpt-6-astra-takes-webdev-elo-gate-holds)）
**结论**：2026 年 9 月的"WebDev 榜首"在 **9-02 是 Claude Fable 5.1 Max（1765）**、**9-05 是 GPT-6 Astra Max（1797）**；9-24 的"Opus 5.5 = 1818"仅有单一低可信度来源，**不可采信**。

### 方法论（第三方描述，官方页面不可达）

- "**匿名对决**：两个模型拿到同一指令、各自产出，网友在不知道模型身份的情况下选择更好的一方；这些选择汇成 Elo 分数（借自国际象棋，击败排名更高的对手得分更多）"。（[Blog du Modérateur，2026-09-03](https://www.blogdumoderateur.com/ia-meilleurs-modeles-code-developpement-web-septembre-2026/)）
- 榜单现在**聚合两个面板：front-end 与 fullstack**；单看 front-end 时 Claude Fable 5.1 Max 仍第一，**fullstack 面板则由 Qwen3.8 Max 领先、Claude Fable 5.1 Max 掉出前十，DeepSeek 两款模型进入第 9、10 位**。（同上）
- **官方自述的局限（值得直接引用）**：「投票针对的是**一次请求后的渲染观感**，而不是所产代码的可维护性，也不是它在既有项目中的行为」；表格里的 "rank spread" 列给出名次区间，**新进入者或分数仍属初步的模型该区间通常很宽**；因此这些榜单用于"建立候选清单"，不能单独决定团队选型。（同上）
- ⚠️ **"WebDev Arena 最初与 WebArena / CMU 合作"：未核实** —— 本次未能取得可引用的一手来源（lmarena/arena.ai 均不可达）。

---

## B3. PosterReward（CVPR 2026，arXiv **2603.29855**）—— **已核实存在**

- **出处**：arXiv:2603.29855，**提交于 2026-02-23**（v1），Comments 字段明写 **"Accepted by CVPR'26"**；学科 cs.GR；页内 HTML 标注作者版本日期为 2026-08-24。作者：Jianyu Lai、Sixiang Chen、Jialin Gao 等（香港科技大学（广州）+ 美团 + 香港科技大学）。项目页 `https://alexlai2860.github.io/PosterReward/`。（[arXiv abs 页](https://arxiv.org/abs/2603.29855)、[arXiv HTML v1](https://arxiv.org/html/2603.29855v1)）

### 方法（摘要 + 正文）

1. **数据**：提出**全自动**偏好数据管线，构建 **Poster-Preference-70K**（7 万条海报偏好对）。用多个 MLLM 的"共识"模拟人类判断，替代人工标注。
2. **五维评测体系**：基础视觉质量、AI 伪影、文字准确性、prompt 忠实度、美学价值；官方强调五维"**互相耦合、不能简化为加权平均**"，要求模型整体权衡。
3. **两个模型族 + 四阶段级联训练**：
   - `PosterReward-Pairwise`（生成式，基于 Qwen3-VL-8B，仿 RewardDance：**先出 Yes/No 判断再出 CoT**，推理时可由判断 token 的 logits 反推偏好分）；
   - `PosterReward`（**两阶段判别式**：第一阶段分析模块输出五维分析文本 → 第二阶段评分模块（Qwen3-VL-8B 末层换成两层 MLP + SiLU）输出标量分）；另有省略分析模块的 **`PosterReward-Lite`**。
   - 四阶段：Joint SFT（24.6 万单图分析 + 16 万成对偏好）→ Joint Rejection Sampling FT → Scoring Module Training（Bradley-Terry loss，LoRA r=64）→ **GRPO 强化学习**（冻结评分模块作为 reward，LoRA r=64，lr 1e-6；8×A100 训练 + 8 回放 + 4 部署）。
4. **数据管线的反偏置细节**：主模型面板为 **Gemini-2.5-Pro + GPT-5 + GLM-4.5v**，并**对每一对做两次位置互换**以抵消 MLLM 明显的"偏好第一张图"的位置偏置；电影海报池 80 万图（Seedream 3.0，81K 英文 + 58K 中文 prompt，每 prompt 6 图），非电影池用 Qwen-Image-Lightning（12.5 万英文 + 12.5 万中文 prompt，每 prompt 4 图），并用 **Kendall's W** 量化 6 轮排名的一致性以筛出稳定共识。
5. **两个新基准**：**PosterRewardBench**（评测已有 reward model / MLLM 在海报偏好判断上的准确率）与 **PosterBench**（评测现有文生图模型的海报生成能力）。PosterRewardBench 分 Basic（Flux / Flux-Krea / SD3.5-L 生成，质量差异大）与 Advanced（Seedream 3.0 / 4.0 / Qwen-Image-Lightning，整体质量更高、差异更小）；**所有偏好对由 4 名专业标注者复核，仅保留 ≥3 人共识的样本**。

### 关键结论数字（pointwise 准确率，Table 1）

| 模型 | MMRB2 | HPDv3 | PRB-Basic | PRB-Advanced |
| --- | --- | --- | --- | --- |
| ImageReward | 53.0 | 58.6 | 60.7 | 49.3 |
| PickScore | 57.6 | 65.6 | 66.7 | 44.1 |
| HPSv2 | 55.0 | 65.3 | 70.8 | 43.7 |
| UnifiedReward* | 56.9 | 59.4 | 60.0 | 52.7 |
| **HPSv3（此前 SOTA）** | 58.5 | 76.9 | 72.9 | **41.2** |
| PosterReward-Lite | 60.5 | 77.1 | 83.9 | 85.0 |
| **PosterReward** | 59.6 | 77.8 | **86.7** | **86.0** |

（[arXiv HTML v1，Table 1](https://arxiv.org/html/2603.29855v1)）
**最尖锐的结论**：通用图像偏好模型（尤其 HPSv3）在**高质量、差异细微的 Advanced 海报集上崩到 41.2%**（接近随机），而海报专用模型达 **86.0%**；论文摘要的定性结论是"现有 reward model 主要关注全局图像美学，**忽略了排版与版式这两个关键维度**"，且"领域特定偏好数据稀缺"是主要瓶颈。论文还展示了 reward model 用于 **test-time scaling（Best-of-8 选择）** 与 **RL（Diffusion-NFT）** 的两条下游用法（正文第 7、8 节）。

---

## B4. 其他设计/UI 生成评测基准

| 基准 | 出处与年份 | 测什么 / 规模 | 已核实的关键数字 |
| --- | --- | --- | --- |
| **Design2Code** | NAACL 2025；[arXiv:2403.03163](https://arxiv.org/abs/2403.03163)（v1 2024-03-05，v3 2025-02-09） | 484 个真实网页截图 → 代码；CLIP + LLEM(Block/Text/Position/Color) + 人工 | GPT-4o CLIP 90.4 / Block 93.0；**49% 生成页被认为可互换部署**；**64% 案例里 AI 生成页被认为比原页设计更好**（见 A6.2） |
| **DesignBench** | 2025-06-06 提交，**v3 2026-03-15**；[arXiv:2506.06251](https://arxiv.org/abs/2506.06251)；代码 github.com/WebPAI/DesignBench | **多框架 + 多任务**：React / Vue / Angular / 原生 HTML+CSS × **生成 / 编辑 / 修复** 三类任务；**900 个网页样本**，11 个主题、9 种编辑类型、6 类问题 | 摘要只给"系统性评测揭示框架相关局限/任务瓶颈"，**具体分数需读正文（本次未取到表格）→ 具体百分比未核实** |
| **Interaction2Code** | ASE 2025；[arXiv:2411.03292](https://arxiv.org/abs/2411.03292)（v1 2024-11-05，v3 2026-03-01）；DOI [10.1109/ASE63991.2025.00028](https://ieeexplore.ieee.org/abstract/document/11334714) | 交互式网页生成：**127 个网页、374 个交互**，15 种页面类型、31 类交互；自动指标 + 人工 | 识别出 4 类关键缺陷（交互生成不足、10 类典型失败、视觉细微交互表现差、单模态视觉描述下理解不足），并提出 4 种增强策略（交互元素高亮、Failure-aware Prompting、视觉显著性增强、图文描述组合）；**具体准确率数字未取到 → 未核实** |
| **WebGen-Bench** | NeurIPS 2025；[arXiv:2505.03733](https://arxiv.org/abs/2505.03733)（v1 2025-05-06，v2 2025-08-11） | 从零生成**多文件网站代码库**；647 条测试用例，用 web-navigation agent 自动执行测试；评 3 个 code-agent 框架（Bolt.diy / OpenHands / Aider）× 多模型；另有 WebGen-Instruct 训练集 6,667 条 | **最强组合（Bolt.diy + DeepSeek-R1）仅 27.8% 准确率**；用 WebGen-Instruct 训练的 Qwen2.5-Coder-32B-Instruct 达 **38.2%**，超过最强闭源模型 |
| **WebSight / WebSight-Test** | HuggingFaceM4；v0.1 发布于 **2024-01**；[HF 官方博文原文](https://raw.githubusercontent.com/huggingface/blog/main/websight.md)；技术报告 [arXiv:2403.09029](https://arxiv.org/abs/2403.09029) | 合成的"网页截图 ↔ HTML"配对数据集；衍生模型 Sightseer；WebSight-Test 500 例由 Waffle 论文自建 | **v0.1：823,000 对**；**v0.2：改用真实图片 + 切换 Tailwind CSS，规模扩到 200 万例**；VLM-WebSight+Waffle HTML-Match **37.00%** vs GPT-4o **11.40%**（见 A6.2） |
| **WebArena** | [arXiv:2307.13854](https://arxiv.org/abs/2307.13854)（v1 2023-07-25，v4 2024-04-16） | 高保真可复现的 web agent 环境：4 个真实功能站点域（电商/社交论坛/协作开发/内容管理）+ 工具与知识库；测任务完成的功能正确性 | **最佳 GPT-4 agent 端到端成功率 14.41%**，**人类 78.24%** |
| **UIBert（即 "UI-BERT"）** | IJCAI 2021；[arXiv:2107.13731](https://arxiv.org/abs/2107.13731)（v1 2021-07-29） | 基于 transformer 的图文联合 UI 表征模型，5 个自对齐预训练任务，在大规模无标注 UI 数据上预训练；评测 **9 个真实下游 UI 任务** | 相对强多模态基线**最高 +9.26% 准确率** |
| **UI-Bench** | [arXiv:2508.20410](https://arxiv.org/abs/2508.20410)（v1 2025-08-28，v3 2025-09-03）；排行榜 uibench.ai | 评估 **AI text-to-app 工具的设计能力**：专家成对比较 | **10 工具 × 30 prompt = 300 个生成站点 + 4,000+ 条专家判断**；用 TrueSkill 派生模型排名并给校准置信区间。**各工具具体得分未取到 → 未核实** |
| **ScreenSpot** | 出自 SeeClick 论文；[arXiv:2401.10935](https://arxiv.org/abs/2401.10935)（v1 2024-01-17，v2 2024-02-23） | **首个真实场景 GUI grounding 基准**，覆盖移动/桌面/web 三环境；衡量"根据指令定位屏幕元素"的能力 | 摘要只写 SeeClick 预训练后在 ScreenSpot 上"显著提升"，**未给具体百分比 → 未核实** |
| **ScreenSpot-Pro** | [arXiv:2504.07981](https://arxiv.org/abs/2504.07981)（2025-04-04） | 专业高分辨率场景的 GUI grounding：**23 个应用 / 5 个行业 / 3 种操作系统**，专家标注 | 现有 GUI grounding 模型**最佳仅 18.9%**；作者的 **ScreenSeekeR 视觉搜索方法无需额外训练达 48.1%** |
| **MagicBench**（⚠️ **不是设计/UI 生成基准**，是多模态视频理解） | ACL 2026 长文，[ACL Anthology 2026.acl-long.1314](https://aclanthology.org/2026.acl-long.1314/) | 用魔术表演场景诊断多模态 LLM 的"视觉能动性丧失"与语义依赖；402 个视频 | Visual Agency Loss **12.4%（p<0.01）**。**列入仅为完整性，主题上与其余基准不同类** |
| **「Flame / Flame-UI」** | — | — | **无法确认存在**：本次多轮检索未找到任何名为 Flame-UI 的设计/UI 生成基准 → 见「未核实项」 |
| **Pattern over Pixels（视觉模式补全偏置）** | ASE 2026；[arXiv:2608.03691](https://arxiv.org/abs/2608.03691)，**2026-08-04**；DOI 10.1145/3832783.3834443 | 首个"视觉模式补全偏置"基准：从 Design2Code 的 30 个网页构造 **1,440 张截图**，扰动重复模式中的一个局部元素，要求模型从截图+HTML 上下文恢复被遮的宽度/字号 | 卡片宽度扰动**偏置率 69.78% / 准确率 21.17%**；文字字号扰动**偏置率 80.22% / 准确率 7.89%**；Flash-3.0 在文字上偏置率 **96.11%**；Codex-5.3 从卡片 68.61% 掉到文字 13.89%（见 A6.2） |
| **CoGen** | [arXiv:2601.10536](https://arxiv.org/abs/2601.10536)，**2026-01-15**，8 页/6 图/11 表 | **反向链路**：用文本命令在 Figma 里生成可复用 UI 组件（按钮/标签/输入框），Figma API 抽数据 + Seq2Seq + 微调 T5 | T5 提示生成的**准确率 98%、BLEU 0.2668**；JSON 生成的**成功率最高 100%**（针对指定组件类型） |

---

# 判断：「这些榜单/数字能说明什么，不能说明什么」

## 能说明

1. **链路已经"双向"且进入产品化阶段**（官方可核实）：Figma 的 agentic 能力不再只是"读设计出代码"，而是 `get_design_context`（读）+ `use_figma`（写画布）+ `generate_figma_design`（把运行中的 UI 抓成可编辑图层）+ Code Connect（映射到真实组件）+ 变量自动绑定。这是第三方 D2C 工具目前没有的组合。
2. **成本结构已明确且是"双重收费"**：Dev Mode + Dev/Full 席位（按席位计价），**Code Connect 还要再上一层到 Org/Enterprise**，**Variables REST API 要 Enterprise**；MCP 还叠加**按席位/方案的调用限额**（最紧的是 View/Collab 6 次/月）。任何"用 MCP 做规模化流水线"的方案必须先算这三笔帐。
3. **图文还原度在人眼层面已相当高**：Design2Code 上 GPT-4o 的 Block-Match 93.0、Text 98.2；DesignCoder 在移动 UI 上 SSIM 0.88、CLIP 0.92；Waffle 微调把 HTML-Match 从 11.40%（GPT-4o）推到 37.00%。**"看起来像"这件事已经基本解决**。
4. **但"细节忠实"和"功能正确"远未解决**：Pattern over Pixels 显示模型在重复模式上有 **~70–96% 的偏置率**、文字扰动准确率仅 **7.89%**；WebGen-Bench 最强组合**测试用例通过率仅 27.8%**；Interaction2Code 指出交互生成是专门短板；产业侧一致口径是**还需 20–40% 人工收尾**。
5. **榜单层面：中国实验室与美国头部已互有胜负且高度依赖分类**——Design Arena 的 Website / Image-to-HTML / Frontend / Image-to-Web App 由 **Kimi K3** 领先，UI Component 由 **Claude Fable 5.1** 领先，Graphic Design 由 **GPT Image 2** 领先；WebDev Arena 由 **Claude Fable 5.1 Max（1765）** 大幅领先。跨分类换榜首是常态，**"哪个模型最强"必须先问"哪个分类"**。
6. **专用评测模型明显优于通用美学模型**（PosterReward，官方 CVPR 论文）：在高质量海报集上 **HPSv3 41.2% vs PosterReward 86.0%**，说明"设计质量"不是通用图像美学的子集，**排版/文字/版式需要专门信号**。

## 不能说明

1. **榜单 ≠ 工程质量**。WebDev Arena 的官方局限被第三方明确复述：投票针对**单次请求后的渲染观感**，**不衡量代码可维护性，也不衡量它在既有项目里的行为**；rank spread 对新模型很宽。Design Arena 方法论也只描述"两两偏好 + Elo"，没有任何工程性指标。
2. **这些 arena 数字没有"可复现实验"的属性**：模型池、模型命名（`-max` / `-high` / `-xhigh` / harness 后缀）、采样参数（Design Arena 明确说**不统一**）都在变；Design Arena 每 2 小时更新一次榜单 ⇒ **任何引用都必须带时间戳**。**具体例证**：WebDev Arena 在 2026-09 内榜首从 Claude Fable 5.1 Max（**9-02：1765**）换成 GPT-6 Astra Max（**9-05：1797，仅 1,199 票**）；Design Arena 官方 Changelog 显示 9-20 至 9-23 连续 4 天仍在加模型。**同一句"9 月榜首是 X"在月初和月末指向不同模型。**
3. **Elo 不可跨 arena 比较**。同一模型：Design Arena "single-shot Frontend Arena" **1392**（2026-07-23 官方博客）vs 9 月 2 日快照的 "Website" **1362**、"Frontend Web App" **1335**。把不同分类的分值排成一条总榜是方法论错误。
4. **学术基准的分数不能横向相加**：Design2Code 用 CLIP+LLEM，DesignCoder 用 MSE/CLIP/SSIM/TreeBLEU/CM/TED，Waffle 用 HTML-Match/CW-SSIM/LLEM，WebGen-Bench 用功能测试用例通过率，DesignBench 覆盖 4 框架 ×3 任务。**MSE 与"测试用例通过率"不是同一维度**；论文自报的提升全部是"相对其自选基线"，基线选择（Prototype2Code / DeclarativeUI / GPT-4o）不同则数字不可比。
5. **"可编辑"这件事没有基准在测**。所有列出的 image-to-code 基准测的都是**渲染截图相似度或功能测试**，**没有一个是测"生成结果在 Figma 里是否可编辑/是否绑定到变量/是否复用了组件"**。这是当前评测体系的结构性空白（Figma 官方文档只能给"支持哪些属性的变量绑定"这类定性说明）。
6. **厂商/评测站的对比不能当实验数据**：A7 的"官方 MCP vs Builder/Anima/Locofy"全部来自各方自己的博客或评测站；"减少 60–80% 迭代时间"是媒体转述的早期测试口径，无方法说明、无样本量。（[AIbase，2025-09-24](https://www.aibase.com/news/21538)、[Dupple，2026-04-07](https://dupple.com/blog/screenshot-to-code)）
7. **第三方聚合站本身有风险**：本报告的 Design Arena / WebDev 数字来自 **benchmarklist.com 的快照**，其页面自称 "Beta"/"Information might not be fully accurate"（后者是 llm-registry.com 的免责声明；benchmarklist 自述为 "reviewed static snapshot"）。因此这些数字的正确用途是**建立候选清单**，不是定论。

---

# 未核实项清单

| # | 事项 | 状态与原因 |
| --- | --- | --- |
| 1 | **Figma Dev seat / Full seat 的官方美元价格** | **未核实（官方）**。`figma.com/pricing` 为 JS 渲染，抓取只得到页面标题；`figma.com/pricing-faq` 同样。仅有第三方 2026-06 口径（$12/$25/$35 等），未获官方复核。 |
| 2 | **Figma 官方远程 MCP server 的确切上线日期** | **二手来源（2025-09-23）**。来自 AIbase 报道；该文同时把端点写成 `https://127.0.1:3845/sse`（明显错误，官方为 `https://mcp.figma.com/mcp`），并称"免费方案用户不能使用"（与官方"remote server 所有席位所有方案可用"冲突）⇒ 该来源可靠性有限，日期需以 Figma 官方博客为准，而**官方博客正文我未能读取**（JS 渲染）。 |
| 3 | **Figma 官方博客 `Introducing our Dev Mode MCP server` 的发布日期与正文** | **部分未核实**：官方博客页抓取仅返回标题。发布日期由 gihyo.jp（2025-06-05）引用 Figma 2025-06-04 推文间接核实。 |
| 4 | **`figma.com/mcp-catalog` 的完整客户端清单** | **未核实**：页面抓取未成功。客户端表以帮助中心表格为准。 |
| 5 | **Style Dictionary 与 Figma MCP 的官方集成** | **未核实，且官方文档不支持该说法**。Style Dictionary（[官网](https://styledictionary.com/)、[GitHub](https://github.com/style-dictionary/style-dictionary)）与 Tokens Studio（[Export to Figma](https://docs.tokens.studio/figma/export/)、[Import from Figma](https://docs.tokens.studio/figma/import/)）均为 Figma 之外的独立工具；官方 MCP 工具表里**没有任何 Style Dictionary/Token 导出工具**（只有 `get_variable_defs` 读、`use_figma` 写）。 |
| 6 | **Design Arena 的具体 Y Combinator 批次（媒体称 S25）** | **部分核实**。**YC 身份本身已核实**（[Y Combinator 官方 Launch YC 页](https://www.ycombinator.com/launches/O5h-design-arena-1-benchmark-for-ai-design) 有发布帖，发布人 Grace Li，团队与 Arcada Labs 归属均写明）；但该页**未标注批次**，"S25"仅见于媒体（Crypto Briefing）→ **批次未核实**。另：**融资额口径冲突**（TechCrunch 标题 $7.9M vs Crypto Briefing $8M），均未取到正文 → **未核实**。 |
| 7 | **Design Arena 榜单的原生页面数字** | **未能直接核实**。`designarena.ai/leaderboard/{website,ui-components,image-to-html,graphic-design}` 四个页面抓取成功但**表格为客户端渲染、正文空白**。本报告数字全部来自**第三方 2026-09-02 快照**，已逐条标注时间戳。 |
| 8 | **LMArena（lmarena.ai）自身的 WebDev 榜现状、以及 "WebDev Arena 最初与 WebArena/CMU 合作"** | **未核实**。`lmarena.ai` 多次抓取 `fetch failed`，`arena.ai` 被 Cloudflare 403 拦截。榜单数字以第三方快照 + 法国媒体（2026-09-03）双来源呈现，但其**归属站点（arena.ai）与方法论细节无法从一手页面确认**。 |
| 9 | **DesignBench 的具体分数** | **部分未核实**：基准规模（900 样本 / 3 框架 + HTML / 3 任务）来自 arXiv 摘要，已核实；**各模型的具体百分比未取到**（未读 v3 正文表格）。 |
| 10 | **Interaction2Code 的具体准确率数字** | **部分未核实**：规模（127 页 / 374 交互）与 4 项缺陷、4 项增强策略来自摘要，已核实；**具体指标数值未取到**。 |
| 11 | **DesignCoder 的期刊版（IST Vol 198）正文** | **部分未核实**：DOI 与卷期来自 [ACM DL 条目](https://dl.acm.org/doi/10.1016/j.infsof.2026.108214)（我未打开付费正文）；本报告所有 DesignCoder 数字均来自其 **arXiv/ar5iv 全文**（arXiv:2506.13663）。 |
| 12 | **Design Arena 各类别的"参评模型数"以外的完整榜单** | **未核实**：仅取到各榜前 46–49 行（页面或抓取被截断），未逐条核对全量。 |
| 13 | **Locofy 在 2026 年的产品现状与是否有 MCP server** | **部分未核实**：`locofy.ai` 抓取只返回标题，未取到产品页；价格/框架支持均为第三方 2026-06 口径；**其官方 MCP 能力未核实**。 |
| 14 | **Anima MCP 文档中"需要 Enterprise 配置"之外的具体定价与限额** | **未核实**：官方文档未列价格；第三方口径（$12/$22–24/$500+）未经官方复核。 |
| 15 | **官方 MCP 与第三方 D2C 工具的受控同任务对比** | **未核实（不存在可引用来源）**。A7 的"谁更强"均为厂商/评测站编辑判断，无实验设计、样本量或指标定义。 |
| 16 | **"设计稿→代码还原度"的 2026 年统一 benchmark 分数** | **未核实（不存在统一口径）**。2026 年新论文（如 Pattern over Pixels）仍在各自定义任务上评测；没有跨工具、跨论文的统一还原度排行榜。 |
| 17 | **Design Arena 榜单在 2026-09-24 的真实名次** | **未核实**。快照为 2026-09-02；官方 Changelog 显示 09-20 / 09-22 / 09-23 仍在新增模型（含 `claude-opus-5-5`），且**官网榜单页无法直接读取** ⇒ 09-24 的真实名次/分数无法确认。 |
| 18 | **WebDev Arena 2026-09-24 榜首「claude-opus-5-5-max 1818 / gpt-6-astra-max 1792」** | **未核实**。仅一个带营销内容的商业站点（LumeValley，2026-09-24）给出，无法在 arena.ai（Cloudflare 403）核对。 |
| 19 | **「Flame / Flame-UI」基准是否存在** | **未核实（很可能不存在）**。多轮中英文检索未找到任何以此命名的设计/UI 生成基准。 |
| 20 | **UI-Bench / DesignBench / Design2Code / ScreenSpot 的 headline 具体分数** | **部分未核实**。UI-Bench 摘要未给各工具得分；ScreenSpot（arXiv:2401.10935）摘要只说"显著提升"未给百分比；DesignBench 与 Design2Code 摘要均无单一头条数字。 |
| 21 | **WebSight v0.2 的发布年份** | **未核实**。HF 官方博文（原文 Markdown）只写 v0.1 于 **2024-01** 发布、v0.2 扩到 **200 万例**，**未给出 v0.2 的具体日期**。 |
