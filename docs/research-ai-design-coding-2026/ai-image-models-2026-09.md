# AI 视觉 / 图像生成模型调研（截止 2026 年 9 月 24 日）

> 调研方法：全部结论基于 2026-09-24 当日联网检索的公开页面。每条结论后附可点击来源与发布时间。无法交叉验证的内容一律标注「未核实」，不做推断填充。
> 币种：除注明外均为美元（USD）。

---

## 0. 结论速览

1. **Artificial Analysis 文本生图榜与图像编辑榜的榜首都是 OpenAI `GPT Image 2.5 Sunburst (max)`**，文本生图 Elo 1196、图像编辑 Elo 1181（[Artificial Analysis 文本生图榜](https://artificialanalysis.ai/image/leaderboard/text-to-image)，2026-09 检索；[Artificial Analysis 图像编辑榜](https://artificialanalysis.ai/image/leaderboard/editing)，2026-09 检索）。
2. **Google 的图像旗舰已不是 Nano Banana Pro**。Nano Banana Pro（`gemini-3-pro-image`）在榜上排第 10（Elo 1101），而 2026 年 2 月发布的 Nano Banana 2（`gemini-3.1-flash-image`）排第 6（Elo 1122）（同上，Artificial Analysis 文本生图榜，2026-09 检索）。
3. **字节 Seedream 5.0 Pro 是国产图像模型在榜最高位者**（文本生图第 15，Elo 1078），且**在图像编辑榜（第 8，Elo 1109）反超 Nano Banana Pro（第 13，Elo 1098）**（同上，Artificial Analysis 两榜，2026-09 检索）。
4. **定价层面出现明显倒挂**：GPT Image 2.5 每张 1K 图最低约 $0.006（`low`）、最高约 $0.211（`max`）（[Apidog，2026-09-09](https://apidog.com/blog/gpt-image-2-5-flare-vs-sunburst-vs-gpt-image-2/)），而 Nano Banana Pro 1K/2K 每张 $0.134、4K $0.24（[Modellix，2026-07-22](https://www.modellix.ai/blog/nano-banana-pro-pricing/)）；Seedream 5.0 Pro 仅 0.3 元/张（[智东西，2026-07-09](https://zhidx.com/p/574086.html)），单位成本显著低于海外旗舰。
5. **Adobe 是唯一把「多模型聚合」做成主战略的厂商**：Firefly 内已挂 30+ 个模型（含 Google Nano Banana 2、OpenAI、Runway、Kling），并自研 Firefly Image Model 5（[Adobe 官方博客，2026-03-19/2026-03-23 日文版](https://blog.adobe.com/jp/publish/2026/03/23/cc-adobe-firefly-expands-video-image-creation-with-new-ai-capabilities-custom-models)）。

---

## 1. Google — Nano Banana Pro / Gemini 3 Pro Image（`gemini-3-pro-image`）

### 1.1 发布与版本状态

- Nano Banana Pro（对外模型名 Gemini 3 Pro Image，API ID `gemini-3-pro-image`）于 **2025 年 11 月**发布，Artificial Analysis 标注的 release 为 **Nov 2025**（[Artificial Analysis 文本生图榜](https://artificialanalysis.ai/image/leaderboard/text-to-image)，2026-09 检索）。
- Adobe 在 **2025-11-20** 宣布把 Gemini 3 Nano Banana Pro 接入 Firefly 与 Photoshop，可作为发布时间的旁证（[Adobe 官方博客，2025-11-20](https://blog.adobe.com/en/publish/2025/11/20/google-gemini-3-nano-banana-pro-firefly-photoshop)）。
- **它已不是 Google 最新 / 最强的图像模型。** 榜上存在更新的 Nano Banana 2（`Gemini 3.1 Flash Image`，2026 年 2 月）与 Nano Banana 2 Lite（`Gemini 3.1 Flash Lite Image`，2026 年 6 月），且 Nano Banana 2 的 Elo（1122）高于 Nano Banana Pro（1101）（[Artificial Analysis 文本生图榜](https://artificialanalysis.ai/image/leaderboard/text-to-image)，2026-09 检索）。
- Google 官方开发者博客确认该模型可编程调用（[Google 官方博客：Build with Nano Banana Pro](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-3-pro-image-developers/)，页面发布于 2025-11，具体日未核实）。

### 1.2 分辨率能力

- 支持 **1K / 2K / 4K** 输出；计费按分辨率分档（[Modellix，2026-07-22](https://www.modellix.ai/blog/nano-banana-pro-pricing/)；[Google Cloud 生成式 AI 定价页（中文），2026-09 检索](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing?hl=zh-cn)）。
- Adobe 侧集成说明也确认「可生成最高 4K 高分辨率图像」（[Tech Research Online，2026-08-04](https://techresearchonline.com/news/adobe-expands-firefly-and-photoshop-with-gemini-3-nano-banana-pro-integration/)）。

### 1.3 文字渲染

- Adobe 官方口径：该模型「调用 Google 的广泛知识库，提升视觉生成任务中的事实准确性」（转引自 [Tech Research Online，2026-08-04](https://techresearchonline.com/news/adobe-expands-firefly-and-photoshop-with-gemini-3-nano-banana-pro-integration/)）。
- **具体 OCR / 文字渲染量化指标：未核实**（未找到 Google 官方公布的分数）。

### 1.4 官方 API 定价（按 tokens 计费）

Google Cloud 中文定价页的描述为：Gemini 3 Pro Image **每张输入图片收取 560 个 token**，输出图片按分辨率伸缩——1K/2K 为 **1,120 个 token（$0.134）**，4K 更高（[Google Cloud 生成式 AI 定价页（中文）](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing?hl=zh-cn)，2026-09 检索）。

对照第三方拆解（引用 Google 自身定价页截图）：

| 档位 | 标准价 | Batch（-50%） |
|---|---|---|
| 1K / 2K（1,120 tokens） | **$0.134 / 张** | $0.067 / 张 |
| 4K（2,000 tokens） | **$0.24 / 张** | $0.12 / 张 |

- 计费口径为 **$120 / 100 万输出 tokens**；换算验证：1,120 × $120/1M = $0.1344（[Modellix，2026-07-22](https://www.modellix.ai/blog/nano-banana-pro-pricing/)）。
- 输入参考图约 560 tokens ≈ $0.0011，可忽略（同上）。
- 同一来源指出：**网上流传的「$0.15 / $0.30 每张」是错误数字**，无法与 Google 公布的 token 数对齐（同上）。
- InferenceBench 独立列出同样口径：$0.134 / 张（1K-2K），4K $0.24（[InferenceBench，最后校验 2026-06-20](https://inferencebench.io/models/google/gemini-3-pro-image/)）。
- 聚合平台价（如 Modellix）为 1K/2K $0.1265、4K $0.2093，但**高于 Google 官方 Batch 价**（[Modellix，2026-07-22](https://www.modellix.ai/blog/nano-banana-pro-pricing/)）。

### 1.5 免费额度

- **API 侧：无免费额度。** Google 定价页将 `gemini-3-pro-image` 的 Free Tier 标为「Not available」（[Modellix，2026-07-22](https://www.modellix.ai/blog/nano-banana-pro-pricing/)）。
- **Gemini app 侧：免费用户有极小配额。** 2025-11 发布初期免费用户为每天 3 张 Nano Banana Pro 图，一周后 Google 以「需求过大」为由下调至**每天 2 张**，并把 Gemini 3 Pro 免费档改为「Basic access（每日限额可能频繁变动）」；付费 **Google AI Pro 100 prompts/天、Google AI Ultra 500 prompts/天**不受影响（[Chrome Unboxed，2025-11-28](https://chromeunboxed.com/google-throttles-free-access-to-gemini-3-pro-and-nano-banana-pro-due-to-overwhelming-demand/)）。
- Gemini app 用量规模：不到两个月生成 **10 亿张** Nano Banana Pro 图片（[9to5Google，2026-01-12](https://9to5google.com/2026/01/12/gemini-nano-banana-pro-milestone/)）。
- **当前（2026-09）免费档的实际每日额度：未核实**（Google 未公布固定数字）。

### 1.6 Gemini app 内可用性

- 可用，且是消费端主要分发渠道（[Google 官方博客：Where to use Nano Banana Pro](https://blog.google/products-and-platforms/products/gemini/where-to-use-nano-banana-pro/)，2025-11）。
- 同时已进入 **Adobe Firefly 与 Photoshop**：Firefly 内支持最多 **6 张参考图**融合生成，Photoshop 内驱动 Generative Fill 做 prompt 式编辑（[Tech Research Online，2026-08-04](https://techresearchonline.com/news/adobe-expands-firefly-and-photoshop-with-gemini-3-nano-banana-pro-integration/)）。

---

## 2. 字节跳动 — Seedream 4.x / 5.0 / 5.0 Pro

### 2.1 发布时间线

| 版本 | 发布时间 | 来源 |
|---|---|---|
| Seedream 4.0 | **2025-09-09** | [字节 Seed 官方博客，2025-09-09](https://seed.bytedance.com/zh/blog/seedream-4-0-officially-released-beyond-drawing-into-imagination) |
| Seedream 4.5 | **2025-12-04** | [IT之家/智东西，2026-02-10](https://m.ithome.com/html/920755.htm) |
| Seedream 5.0（预览版） | **2026-02-10** | [IT之家/智东西，2026-02-10](https://m.ithome.com/html/920755.htm) |
| Seedream 5.0 Lite | 2026-02（Artificial Analysis 标注） | [Artificial Analysis 图像编辑榜](https://artificialanalysis.ai/image/leaderboard/editing)，2026-09 检索 |
| **Seedream 5.0 Pro** | **2026-07-08 晚间** | [智东西，2026-07-09](https://zhidx.com/p/574086.html) |

### 2.2 能力

**Seedream 4.0**（[字节 Seed 官方博客，2025-09-09](https://seed.bytedance.com/zh/blog/seedream-4-0-officially-released-beyond-drawing-into-imagination)）：
- 同一套架构统一文生图与通用编辑；支持文生图、图生图、图像编辑、多图编辑、组图生成。
- **最高分辨率从 2K 扩展至 4K 超高清**，并引入自适应长宽比。
- 原生集成 Canny / Depth / Mask 等视觉信号控制（无需 ControlNet）。
- 高级文字渲染，可处理公式、表格、化学结构、统计图。
- DiT 推理速度较 Seedream 3.0 提升 10 倍以上。

**Seedream 5.0（预览版）**（[IT之家/智东西，2026-02-10](https://m.ithome.com/html/920755.htm)）：
- **首次支持「检索生图」（联网知识整合）**——这是该代最标志性的新能力。
- 分辨率：**2K 为直出，4K 为 AI 增强后分辨率**。
- 新增**笔刷精准编辑**（用户可控制笔刷选择并调整相应元素）。
- 多步逻辑推理、空间理解、特定领域知识增强。
- 实测结论：能理解「静谧科技感」等抽象提示词，但生成效果相比 Seedream 4.5「很难说有跨越式提升」，**联网搜索能力尚不稳定**（同上）。

**Seedream 5.0 Pro**（[智东西，2026-07-09](https://zhidx.com/p/574086.html)）：
- 四项重点强化：复杂信息可视化、交互式精准编辑、真实影像与人像质感、原生多语种输入与生成。
- 支持**图层智能拆分**（把完整海报拆为文字、主体、背景、装饰等独立图层）；但火山方舟体验平台当时**暂不支持查看图层**，该能力无法完整验证（同上）。
- 支持法语、德语、俄语、日语、韩语、西班牙语、阿拉伯语等十余种语言直接输入与生成（同上）。
- 实测短板：**复杂中文信息图仍易出错**（单张图最多出现 5 处文字错误）、电商 UI 与草图渲染完成度不足、人物一致性仍是短板（同上）。

### 2.3 即梦 / 剪映 / CapCut 可用性

- **Seedream 4.0**：发布即上线 **即梦、豆包、火山方舟**（[字节 Seed 官方博客，2025-09-09](https://seed.bytedance.com/zh/blog/seedream-4-0-officially-released-beyond-drawing-into-imagination)）。
- **Seedream 5.0**：**2026-02-10 上线剪映、剪映海外版 CapCut、字节 AI 创作平台「小云雀」，在即梦 AI 开启灰度测试，图片生成限时免费体验**；CapCut 官宣称所有用户**可免费使用 20 次**，美国地区后续上线（[IT之家/智东西，2026-02-10](https://m.ithome.com/html/920755.htm)）。另有报道称剪映已上线 Seedream 5.0 Preview（[中国证券网](https://www.cnstock.com/commonDetail/637191)，日期未核实）。
- **Seedream 5.0 Pro**：**2026-07-08 已上线火山方舟体验中心，将陆续在豆包、即梦上线**（[智东西，2026-07-09](https://zhidx.com/p/574086.html)）。
- **Seedream 5.0 Pro 在即梦/豆包的正式上线日期：未核实。**

### 2.4 火山方舟 API 定价

Seedream 5.0 Pro **按输入图与输出图分别计费**（[智东西，2026-07-09](https://zhidx.com/p/574086.html)）：

| 项目 | 价格 |
|---|---|
| 输入图（首张） | 免费 |
| 输入图（后续每张） | 0.02 元 / 张 |
| 输出图 ≤ 236 万像素 | **0.3 元 / 张** |
| 输出图 > 236 万像素 | **0.6 元 / 张** |

- Artificial Analysis 记录的 Seedream 5.0 Pro API 价为 **$90.0 / 1,000 张**，Seedream 4.0 为 **$30.0 / 1,000 张**（[Artificial Analysis 文本生图榜](https://artificialanalysis.ai/image/leaderboard/text-to-image)，2026-09 检索）。

### 2.5 与 Nano Banana Pro 的对比评测结论

**Artificial Analysis 榜单口径**（客观 Elo，[文本生图榜](https://artificialanalysis.ai/image/leaderboard/text-to-image) / [图像编辑榜](https://artificialanalysis.ai/image/leaderboard/editing)，2026-09 检索）：

| 模型 | 文本生图 Elo（名次） | 图像编辑 Elo（名次） |
|---|---|---|
| Seedream 5.0 Pro | 1078（第 15） | **1109（第 8）** |
| Nano Banana Pro | **1101（第 10）** | 1098（第 13） |

→ **文本生图 Nano Banana Pro 略胜（+23）；图像编辑 Seedream 5.0 Pro 反超（+11）。**

**媒体/自媒体实测口径**：
- 智东西实测 Seedream 5.0 Pro 后结论是「**比不上 ChatGPT Images 2.0**」，在真实感、人物相似度、平台细节复刻、长文本逻辑正确性上仍有差距；但在信息图、精准编辑、商业视觉和本地化中文场景上「追赶势头已经很明显」（[智东西，2026-07-09](https://zhidx.com/p/574086.html)）。
- CapCut 官方推文称 Seedream 5.0 **可与 Nano Banana Pro 对标且更便宜**；但实测与舆论反馈认为其在**艺术设计感上稍弱于 Nano Banana Pro**，升级「优先考虑智能水平而非美观」（[IT之家/智东西，2026-02-10](https://m.ithome.com/html/920755.htm)）。
- 同一媒体的对比实测：提示词「用左手写字的人 + 背景 5:25 时钟」，Seedream 5.0 与 Nano Banana Pro **双双失败**（一个手错、一个钟错），Nano Banana Pro 生成的时钟约为 5:30（同上）。

---

## 3. OpenAI — GPT-Image 系列 / ChatGPT Images 2.5

### 3.1 版本与发布时间

- **`gpt-image-2`**：2026 年 4 月发布，快照 `gpt-image-2-2026-04-21`（[Artificial Analysis 文本生图榜](https://artificialanalysis.ai/image/leaderboard/text-to-image)，2026-09 检索；[Apidog，2026-09-09](https://apidog.com/blog/gpt-image-2-5-flare-vs-sunburst-vs-gpt-image-2/)）。
- **ChatGPT Images 2.5**：**2026-09-08 发布**，在 ChatGPT 内替换 Images 2.0，API 侧落地为两个模型 **`gpt-image-2.5-flare`** 与 **`gpt-image-2.5-sunburst`**（快照日期 `2026-09-08`）（[Apifox 中文整理](https://apifox.com/apiskills/what-is-chatgpt-images-2-5-cn/)，2026-09；官方发布博文 [OpenAI: Introducing ChatGPT Images 2.5](https://openai.com/index/introducing-chatgpt-images-2-5/)，2026-09-08）。
- 官方卖点：图像生成延迟比 Images 2.0 **最多降低 50%**、主体保留更好、只改动被点名的部分（同上）。
- **ChatGPT 端新功能**：Sketch、Templates、图片评论、分享 prompt（这四项**不进 API**）（同上）。
- **质量档位**：`low` / `medium` / `high` / `xhigh` / `max` / `auto`，其中 `xhigh`、`max` 为新增（同上）。
- **规格**：输出最高 **4K** 自定义尺寸；编辑接口支持最多 **16 张参考图**；输出 PNG / JPEG / WebP；支持 `partial_images`（0–3）流式（[WaveSpeed，2026-09-09](https://wavespeed.ai/blog/ai-models/gpt-image-2-5-flare-and-sunburst-now-on-wavespeedai/)）。
- **安全标记**：每张图带 C2PA 元数据与不可见水印，水印技术为 Google DeepMind 的 SynthID（[Apifox](https://apifox.com/apiskills/what-is-chatgpt-images-2-5-cn/)）。

### 3.2 API 定价

**按 token 单价与 `gpt-image-2` 完全一致**（[Apidog，2026-09-09](https://apidog.com/blog/gpt-image-2-5-flare-vs-sunburst-vs-gpt-image-2/)；[Apifox](https://apifox.com/apiskills/what-is-chatgpt-images-2-5-cn/)）：

| 计费项 | Flare | Sunburst | gpt-image-2（Standard） | gpt-image-2（Batch，-50%） |
|---|---|---|---|---|
| Image input | $8.00 /1M | $8.00 /1M | $8.00 /1M | $4.00 /1M |
| Cached image input | $2.00 /1M | $2.00 /1M | $2.00 /1M | $1.00 /1M |
| **Image output** | **$30.00 /1M** | **$30.00 /1M** | **$30.00 /1M** | $15.00 /1M |
| Text input | $5.00 /1M | $5.00 /1M | $5.00 /1M | $2.50 /1M |

**每张图实际成本（1024×1024，仅 image output tokens）**（同上）：

| quality | tokens | 1024×1024 成本 | 1536×1024 成本 |
|---|---|---|---|
| low | 196 | $0.00588 | $0.00474 |
| medium | 439 | $0.01317 | $0.01029 |
| high | 1,756 | $0.05268 | $0.04116 |
| xhigh | 3,122 | $0.09366 | $0.07377 |
| **max** | **7,024** | **$0.21072** | $0.16464 |

关键要点（同上）：
- **质量档位被重新贴标签**：2.5 的 `high`（1,756 tokens）等于旧 gpt-image-2 的 `medium` 预算；2.5 的 `max`（7,024 tokens）等于旧 `high` 预算；`low` 未变。
- 因此「API 涨价 2 倍」的早期报道**是误读**——那是拿 2.5 Standard 对比 gpt-image-2 **Batch 半价**行（同上）。
- **Flare 与 Sunburst 每张图 token 预算相同、单价相同**，Sunburst 的溢价是**延迟**不是费用（同上）。
- 10,000 张 1024×1024 月度预算：2.5 `high` = **$526.80**；gpt-image-2 `high` = $2,110；2.5 `max` = $2,107.20（同上）。
- Artificial Analysis 采用的统一口径为 **$210.7 / 1,000 张**（对应 max 档）（[Artificial Analysis 文本生图榜](https://artificialanalysis.ai/image/leaderboard/text-to-image)，2026-09 检索）。
- 流式 `partial_images: 3` 每张额外 +300 tokens ≈ **+$0.009**（[Apidog，2026-09-09](https://apidog.com/blog/gpt-image-2-5-flare-vs-sunburst-vs-gpt-image-2/)）。

### 3.3 ChatGPT 端可用性与免费额度

- **覆盖所有档位，包括 Free**——OpenAI 措辞为 "across all tiers"，桌面 / 移动 / Web 全平台（[Apifox](https://apifox.com/apiskills/what-is-chatgpt-images-2-5-cn/)）。
- **各套餐具体生成上限：官方未公布固定数字**，应用内横幅显示当前上限并随需求浮动（同上）。
- 社区报告（**非官方数据，标注为未核实**）：Free 约每 24 小时 2–3 张或滚动 3 小时窗口 3–10 张；Plus 约每 3 小时 40–50 张；Go 为免费档的 10×；Pro 基本不限量（同上）。

---

## 4. Midjourney

### 4.1 版本与发布时间

| 版本 | 时间 | 说明 | 来源 |
|---|---|---|---|
| V8 Alpha | **2026-03-17** | 重写代码库，5× 提速、原生 2K（`--hd`）、文字渲染大幅改进 | [WaveSpeed，2026-03-19](https://wavespeed.ai/blog/posts/what-is-midjourney-v8-features-pricing-how-to-use-2026/) |
| V8.1 | **2026-06-11 起成为默认模型** | 取代 V7 成为默认；SD 约 4 秒出图，HD 约 12 秒；HD 分辨率是 V7 的 4 倍 | [Midjourney 官方更新，2026-06-11](https://updates.midjourney.com/v8-1-is-now-the-default-model/) |
| V8.0 Alpha 弃用 | **2026-06-25 前后**（官宣「两周后弃用」） | — | [Midjourney 官方更新，2026-06-11](https://updates.midjourney.com/v8-1-is-now-the-default-model/) |
| **V8.2** | **2026-07-24** | 最新版本；聚焦美学、画质与个性化，个性化画像池大幅扩充 | [Midjourney 官方更新，2026-07-24](https://updates.midjourney.com/version-8-2/) |
| V8 编辑模型 | 2026-08-27 | 为 V8 系列推出编辑模型 | [Midjourney 官方更新，2026-08-27](https://updates.midjourney.com/edit-model-for-v8/) |
| Alpha 更新（Style 预览、默认参数等） | 2026-09-23/24 | alpha.midjourney.com 持续迭代；编辑器已支持 v8.1 与 v8.2 edit 类型 | [Midjourney Alpha Changelog，2026-09-24](https://updates.midjourney.com/alpha-changelog-9-23-26/) |

> **注意**：V8.1 于 2026-06-11 被宣布为默认模型，V8.2 于 2026-07-24 发布。**V8.2 是否已取代 V8.1 成为默认模型：未核实**（官方 V8.2 公告未明确说明默认位变更）。

### 4.2 功能要点

- V8 Alpha 引入 `--hd`（原生 2K）、`--q 4`（增强连贯性）、`--chaos`、`--weird`、`--exp`、`--raw`；对话模式、网格模式、侧边栏设置；完全向后兼容 V7 的个性化画像、moodboard、`--sref`（[WaveSpeed，2026-03-19](https://wavespeed.ai/blog/posts/what-is-midjourney-v8-features-pricing-how-to-use-2026/)）。
- V8.1：文字渲染「比以往任何时候都好」，HD 模式渲染尺寸是 V7 的 2 倍、分辨率 4 倍；V7 的 Omni Reference 尚未完整移植到 V8（[Midjourney 官方，2026-06-11](https://updates.midjourney.com/v8-1-is-now-the-default-model/)；[AI Weekly，2026-07-25](https://aiweekly.co/learning-ai/generative-ai/how-to-use-midjourney)）。
- **Draft Mode**（2026-06 上线，仅 Web）：一次 24 张 512px 图，成本 0.4 GPU 分钟，是标准 4 图 prompt 的一半成本、六倍产出（[AI Weekly，2026-07-25](https://aiweekly.co/learning-ai/generative-ai/how-to-use-midjourney)）。
- **Canvas 编辑 / Vary Region**（局部重绘）；任意 V8.1 图可「Rerun as HD」重渲染为 2048px（同上）。
- **仍然没有公开 API**，闭源生态（[WaveSpeed，2026-03-19](https://wavespeed.ai/blog/posts/what-is-midjourney-v8-features-pricing-how-to-use-2026/)）。

### 4.3 订阅价格（2026-07-25 校验）

Midjourney 卖的是 **GPU 时长**而非图片张数（[AI Weekly，2026-07-25](https://aiweekly.co/learning-ai/generative-ai/how-to-use-midjourney)）：

| 套餐 | 月付 | 年付（一次性） | Fast GPU 时长 | Relax 模式 | Stealth 模式 |
|---|---|---|---|---|---|
| Basic | $10 | $96/年（$8/月） | 3.3 小时 | 无 | 无 |
| Standard | $30 | $288/年（$24/月） | 15 小时 | 有 | 无 |
| Pro | $60 | $576/年（$48/月） | 30 小时 | 有（含 SD 视频） | 有 |
| Mega | $120 | $1,152/年（$96/月） | 60 小时 | 有（含 SD 视频） | 有 |

- 标准 V8.1 图 = 0.8 GPU 分钟；HD 图（2048px）= 1.3 GPU 分钟。Basic 的 3.3 小时约合 **247 张**标准图或 **150 张** HD 图（同上）。
- 额外 fast GPU 时长 **$4/小时**（任意套餐）（同上）。
- **无免费试用**（2023 年已取消）（同上）。
- **商用授权**：所有付费套餐含商用权；但**上一自然年公司总营收超过 100 万美元者必须用 Pro 或 Mega**。Basic/Standard 生成的图默认在社区画廊公开可见（同上）。

---

## 5. Adobe Firefly

### 5.1 2026 年最新版本与模型合作

- **2026-03-19（美东）/ 2026-03-23（日文版）**：Adobe 发布 **Firefly 自定义模型（Custom Models）公测**，并宣布 Firefly 已可使用 **30+ 个业界前沿 AI 模型**——包括 **Google Nano Banana 2、Veo 3.1、Runway Gen-4.5、Adobe Firefly Image Model 5（正式 GA）、Kling 2.5 Turbo**（[Adobe 官方博客（日文），2026-03-23 / 英文原文 2026-03-19](https://blog.adobe.com/jp/publish/2026/03/23/cc-adobe-firefly-expands-video-image-creation-with-new-ai-capabilities-custom-models)）。
- **Gemini 3 Nano Banana Pro 接入 Firefly 与 Photoshop**：**2025-11-20** 官宣；Firefly 内支持最多 6 张参考图，Photoshop 内驱动 Generative Fill 做 prompt 式编辑、支持最高 4K（[Adobe 官方博客，2025-11-20](https://blog.adobe.com/en/publish/2025/11/20/google-gemini-3-nano-banana-pro-firefly-photoshop)；[Tech Research Online，2026-08-04](https://techresearchonline.com/news/adobe-expands-firefly-and-photoshop-with-gemini-3-nano-banana-pro-integration/)）。
- **OpenAI GPT-Image 1.5 上线 Firefly**：**2026-01-13**，Firefly Pro / Premium 订阅用户在 1 月 15 日前可不限量生成（[IT之家，2026-01-13](https://www.ithome.com/0/912/657.htm)）。
- 平台同时整合 Adobe 自家及 **OpenAI、Runway、Black Forest Labs、Pika、Ideogram、Google** 等厂商的图像/音频/视频模型（同上）。
- **自定义模型**：可用**用户自己拥有权利的图像**训练可复用模型，默认私有；**训练图不会被用于训练其他模型**（[Adobe 官方博客，2026-03-19](https://blog.adobe.com/jp/publish/2026/03/23/cc-adobe-firefly-expands-video-image-creation-with-new-ai-capabilities-custom-models)）。
- 另有 **Project Moonlight**（跨 Adobe 应用的对话式 agent 界面，2026-03 扩大私测）（同上）。

### 5.2 定价（生成式点数订阅制）

2026-01 口径（[IT之家，2026-01-13](https://www.ithome.com/0/912/657.htm)）：

| 方案 | 月费 | 每月点数 |
|---|---|---|
| Standard | $9.99 | 2,000 |
| Pro | $19.99 | 4,000 |
| Premium | $199.99 | 50,000 |

- 2026-03 期间 Adobe 提供**限时无限量视频与图像生成**（使用 Firefly 内多个模型）（[Adobe 官方博客，2026-03-19](https://blog.adobe.com/jp/publish/2026/03/23/cc-adobe-firefly-expands-video-image-creation-with-new-ai-capabilities-custom-models)）。
- **2026-09 当前的最新方案与点数表：未核实**（未取到 Adobe 官方定价页原文）。

### 5.3 商用安全（commercially safe）与训练数据

- Adobe 官方立场（经第三方总结）：**Firefly 仅使用已授权的 Adobe Stock 数据或公有领域数据进行训练**，并**为企业客户提供 IP 侵权诉讼的财务补偿（indemnification）**（[TraderFox 股票分析，2026-06-05](https://mobile.traderfox.com/blog/aktien-magazin/chartanalyse-adobe-ki-chancen-vs-urheberrechtsrisiken/p-173349/)）。该分析称这是 Adobe 在 AI 竞争中的「护城河」（同上）。
- **该主张正遭到法律挑战**：2026 年 6 月在圣何塞提交的股东派生诉讼诉状指控 Adobe 在**其 AI 技术栈部分环节依赖「受污染的训练数据」**的情况下，仍向市场销售「commercially safe」的 AI（[Stockholder Complaint, Courthouse News 存档，2026-06](https://www.courthousenews.com/wp-content/uploads/2026/06/stockholder-complaint-sanjose.pdf)）。
- **该诉讼的具体案号、当前审理进展与判决结果：未核实。**

### 5.4 股价与 AI 影响

- **ADBE 实时价：$239.61（2026-09-24 09:38 EDT，-0.45%）**；市值 **$93.26B（同比 -39.6%）**；52 周区间 **$190.12 – $363.70**；TTM 营收 $25.97B（+12.0%）；PE 13.44；分析师共识评级 **Hold**，目标价 $276.40（[StockAnalysis，2026-09-24 实时](https://stockanalysis.com/stocks/adbe/)）。
- 技术面：Adobe 处于多年下行通道，**从高点最多下跌约 70%**，当前在月线 GD200（约 $233）附近初步止稳；若站上 $275 才谈得上趋势反转，跌破月线 GD200 则可能回探 $209（[TraderFox，2026-06-05](https://mobile.traderfox.com/blog/aktien-magazin/chartanalyse-adobe-ki-chancen-vs-urheberrechtsrisiken/p-173349/)）。
- **AI 对业绩的影响是双面的**：Q1 2026 创纪录营收 $6.40B（+11%），Firefly 生态的经常性收入**增长两倍**（同上）；但 **Q3 FY2026（2026-09-10 财报）超预期后股价仍下跌**，市场对 AI 变现节奏存疑，同时公司**宣布 CEO 交接**（[StockAnalysis 新闻聚合，2026-09-11 前后](https://stockanalysis.com/stocks/adbe/)）。
- 具体分析师动作（2026-09-11 前后，均转引自 StockAnalysis 聚合页）：Morgan Stanley 维持「Sell」；JPMorgan 目标价由 $340 下调至 $315（维持 Buy）；UBS / BMO / Evercore ISI / Baird / Piper Sandler 上调目标价至 $250–$270 区间（同上）。

---

## 6. Recraft

### 6.1 版本与发布

- **Recraft V4：2026 年 2 月发布**（[Recraft 官方文档 · Recraft V4](https://www.recraft.ai/docs/recraft-models/recraft-V4)）。
- **Recraft V4.1：2026-05-14 发布（当前最新）**，共 9 个版本（[Recraft 官方文档 · Recraft V4.1](https://www.recraft.ai/docs/recraft-models/recraft-v4-1)）。

### 6.2 矢量（SVG）输出能力

- **V4 / V4.1 是「目前唯一能生成可编辑、生产级 SVG 图形」的模型**——矢量输出保留可缩放几何与离散色块，可直接用于专业设计流程（[Recraft 官方文档 · Recraft V4](https://www.recraft.ai/docs/recraft-models/recraft-V4)）。
- **V4.1 的 Vector 系列「交付完全可导出的矢量」，可重塑、改色、微调**（[Recraft 官方文档 · Recraft V4.1](https://www.recraft.ai/docs/recraft-models/recraft-v4-1)）。
- 支持导出格式：**SVG、PNG、JPG、PDF、TIFF、Lottie**（[Recraft 官方文档 · Recraft V4](https://www.recraft.ai/docs/recraft-models/recraft-V4)）。
- Pro 版本原生产出 **2048×2048 px**（同上）。
- V4 的已知限制（尚未支持）：风格创建、prompt 式编辑、图像组、艺术级别控制（同上）。

### 6.3 定价

**API 按张计价（USD）**（[Recraft 官方文档 · Recraft V4](https://www.recraft.ai/docs/recraft-models/recraft-V4)；[Recraft 官方文档 · Recraft V4.1](https://www.recraft.ai/docs/recraft-models/recraft-v4-1)）：

| Recraft V4 系列 | 单价 | 中位耗时 |
|---|---|---|
| Recraft V4 | $0.04 | 10s |
| Recraft V4 Pro | $0.25 | 30s |
| Recraft V4 Vector | $0.08 | 15s |
| Recraft V4 Pro Vector | $0.30 | 45s |

| Recraft V4.1 系列 | 单价 | 中位耗时 |
|---|---|---|
| Recraft V4.1 | $0.035 | 6.5s |
| Recraft V4.1 Pro | $0.21 | 12s |
| Recraft V4.1 Utility | $0.035 | 8.5s |
| Recraft V4.1 Utility Pro | $0.21 | 14s |
| Recraft V4.1 Vector | $0.08 | 12s |
| Recraft V4.1 Vector Pro | $0.30 | 15s |
| Recraft V4.1 Utility Vector | $0.08 | 14s |
| Recraft V4.1 Utility Pro Vector | $0.30 | 17s |
| **Recraft V4.1 Flash** | **$0.007** | **1.3s** |

- **所有 Recraft V4 / V4.1 版本都可在所有套餐上使用，包括 Free 套餐**（[Recraft 官方文档 · Recraft V4](https://www.recraft.ai/docs/recraft-models/recraft-V4)；[V4.1](https://www.recraft.ai/docs/recraft-models/recraft-v4-1)）。
- **订阅方案**：Free / Basic **$12.50 每用户每月** / Pro **$20 每月** 等 4 档（[CostBench，最后校验 2026-07-25，置信度低——仅 1 个来源](https://costbench.com/software/ai-image-generators/recraft/)）。**完整档位表与各档点数：未核实**（Recraft 官方定价页 `recraft.ai/pricing` 为 JS 渲染，无法抓取正文）。

---

## 7. Ideogram

### 7.1 版本与发布时间

- **Ideogram 4.0：2026-06-03 发布**，**9.3B 参数开放权重（open-weight）**文生图模型；权重、推理代码与 prompt 指南公开在 Hugging Face 与 GitHub，量化版本可在**单张 24GB GPU** 上运行（[Morphic 模型页，引 Ideogram 官方发布](https://morphic.com/resources/models/ideogram-4)，2026-06；[The Rundown AI，最后复核 2026-08-30](https://www.therundown.ai/tools/ideogram)）。
- 授权模式为 **open-weight 而非完全开源**：商用部署由随用量伸缩的许可证覆盖（[Morphic](https://morphic.com/resources/models/ideogram-4)）。

### 7.2 文字渲染能力

- **核心卖点**：Ideogram 官方公布 **X-Omni 英文 OCR 基准 0.97 分**（衡量图内文字是否真的可读且拼写正确），并支持多语言文字（[Morphic](https://morphic.com/resources/models/ideogram-4)；[The Rundown AI，2026-08-30 复核](https://www.therundown.ai/tools/ideogram)）。
- 其他差异化控制能力（[Morphic](https://morphic.com/resources/models/ideogram-4)）：
  - **Bounding-box 布局控制**：用框 + 简短描述钉住元素位置。
  - **结构化 JSON 提示**：模型**完全在结构化 JSON caption 上训练**，可逐元素指定场景、样式、要渲染的确切字符串、hex 颜色。
  - **调色板条件**：最多 **16 个 hex 颜色**。
  - **三档速度**：Turbo / Default / Quality，对应 12 / 20 / 48 步。
- 分辨率：**每边 256–2048 px**（最高 2K），支持灵活比例，含 2048×768 超宽横幅（同上）。
- 局限：即便是排版导向模型仍可能拼错词、扭曲字母或改变布局细节（[The Rundown AI，2026-08-30 复核](https://www.therundown.ai/tools/ideogram)）。

### 7.3 定价

**订阅方案**（[The Rundown AI 复核 Ideogram 官方定价页，2026-08-30](https://www.therundown.ai/tools/ideogram)）：

| 方案 | 价格 | 说明 |
|---|---|---|
| Free | $0 | 符合条件的账号每周获得 slow credits（数量可变）；**生成内容公开**、不私密 |
| Plus | **$20/月** 或 **$15/月**（年付） | 1,000 priority credits/月 + 无限 slow credits；私密生成；角色一致性；$4 加购 150 credits |
| Pro | **$60/月** 或 **$42/月**（年付） | 3,500 priority credits/月；批量生成；最大队列；$4 加购 250 credits |
| Team | **$30/用户/月** 或 **$20/用户/月**（年付） | 每人 1,500 priority credits/月；最少 2 人 |
| Enterprise | 定制 | 定制模型训练、API 量级折扣（单独计费） |

- **单张成本**：Ideogram 4.0 一张图 = Turbo **2** credits、Balanced **4** credits、Quality **6** credits（[The Rundown AI，2026-08-30 复核](https://www.therundown.ai/tools/ideogram)）。
- **API 与订阅是两套独立计费**（订阅 credits 不含 API）（同上）。
- **第三方平台 API 价（fal.ai）**：Turbo 约 $0.03/百万像素（≈ $0.03/1K 图）、Balanced $0.06、Quality $0.10（[DEV Community，2026-06-06](https://dev.to/igorgridel/ideogram-40-is-on-7-platforms-heres-what-it-actually-costs-1np9)）。
- **Ideogram 官方定价页在 2026-06 时点渲染为空**，是上述第三方作者无法取到 4.0 官方价的原因（同上）；截至 2026-08-30 已被 The Rundown 复核到完整档位表（如上）。

---

## 8. Artificial Analysis 榜单排名（2026 年 9 月）

**检索时间：2026-09-24。** 榜单页未显示明确的「最后更新」时间戳，但「上月新增」列表包含多款 2026 年 9 月发布的模型（GPT Image 2.5 Sunburst / Flare、MAI-Image-2.6-Flash、Muse Image、Grok Imagine Image 2.0 等）。

### 8.1 文本生图（Text to Image）榜首

> **榜首：OpenAI `GPT Image 2.5 Sunburst (max)`，Elo 1196（95% CI −9/+9，样本 13,511），2026 年 9 月发布，API 价 $210.7 / 1,000 张。**
> 来源：[Artificial Analysis · Text to Image Leaderboard](https://artificialanalysis.ai/image/leaderboard/text-to-image)，2026-09-24 检索。

前 20 名节选（同上）：

| 排名 | 厂商 | 模型 | Elo | 发布 | API 价 /1k 图 |
|---|---|---|---|---|---|
| 1 | OpenAI | **GPT Image 2.5 Sunburst (max)** | **1196** | Sep 2026 | $210.7 |
| 2 | OpenAI | GPT Image 2.5 Flare (max) | 1190 | Sep 2026 | $210.7 |
| 3 | OpenAI | GPT Image 2 (high) | 1171 | Apr 2026 | $211.0 |
| 4 | SpaceXAI | Grok Imagine Image 2.0 | 1154 | Aug 2026 | $60.0 |
| 5 | Microsoft AI | MAI-Image-2.6 | 1147 | Aug 2026 | $38.9 |
| 6 | Google | Nano Banana 2 (Gemini 3.1 Flash Image) | 1122 | Feb 2026 | $67.0 |
| 7 | Meta | Muse Image | 1112 | Jul 2026 | $10.0 |
| 8 | OpenAI | GPT Image 1.5 (high) | 1102 | Dec 2025 | $133.0 |
| 9 | Microsoft AI | MAI-Image-2.5 | 1102 | Jun 2026 | $48.1 |
| **10** | **Google** | **Nano Banana Pro (Gemini 3 Pro Image)** | **1101** | **Nov 2025** | **$134.0** |
| 13 | Google | Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image) | 1092 | Jun 2026 | $33.6 |
| 14 | Alibaba | Qwen-Image-3.0-Pro | 1088 | Jul 2026 | $40.0 |
| **15** | **ByteDance Seed** | **Seedream 5.0 Pro** | **1078** | **Jul 2026** | **$90.0** |
| 16 | Alibaba | Qwen-Image-3.0 | 1076 | Jul 2026 | $30.0 |
| 20 | ByteDance Seed | Seedream 4.0 | 1028 | Sep 2025 | $30.0 |

> Midjourney、Adobe Firefly 自有模型、Recraft、Ideogram 均**未出现在该榜**（Midjourney 无公开 API；Ideogram 4.0 为该榜「上月新增」之外的开放权重模型）。

### 8.2 图像编辑（Image Editing）榜首

> **榜首：OpenAI `GPT Image 2.5 Sunburst (max)`，Elo 1181（95% CI −8/+8，样本 17,196），2026 年 9 月发布，API 价 $210.7 / 1,000 张。**
> 来源：[Artificial Analysis · Image Editing Leaderboard](https://artificialanalysis.ai/image/leaderboard/editing)，2026-09-24 检索。

前 15 名节选（同上）：

| 排名 | 厂商 | 模型 | Elo | 发布 | API 价 /1k 图 |
|---|---|---|---|---|---|
| 1 | OpenAI | **GPT Image 2.5 Sunburst (max)** | **1181** | Sep 2026 | $210.7 |
| 2 | OpenAI | GPT Image 2.5 Flare (max) | 1163 | Sep 2026 | $210.7 |
| 3 | Microsoft AI | MAI-Image-2.6 | 1135 | Aug 2026 | $38.9 |
| 4 | Microsoft AI | MAI-Image-2.6-Flash | 1125 | Sep 2026 | $19.5 |
| 5 | OpenAI | GPT Image 2 (high) | 1122 | Apr 2026 | $211.0 |
| 6 | Meta | Muse Image | 1117 | Jul 2026 | $10.0 |
| 7 | Microsoft AI | MAI-Image-2.5 | 1114 | Jun 2026 | $48.1 |
| **8** | **ByteDance Seed** | **Seedream 5.0 Pro** | **1109** | **Jul 2026** | **$90.0** |
| 9 | Google | Nano Banana 2 (Gemini 3.1 Flash Image) | 1108 | Feb 2026 | $67.0 |
| 10 | Microsoft AI | MAI-Image-2.5-Pro | 1106 | Jul 2026 | $108.5 |
| 12 | OpenAI | GPT Image 1.5 (high) | 1104 | Dec 2025 | $133.0 |
| **13** | **Google** | **Nano Banana Pro (Gemini 3 Pro Image)** | **1098** | **Nov 2025** | **$134.0** |
| 16 | Alibaba | Qwen-Image-3.0-Pro | 1078 | Jul 2026 | $40.0 |
| 20 | ByteDance Seed | Seedream 5.0 Lite | 1057 | Feb 2026 | $35.0 |

---

## 9. 横向对比表

| 模型 | 厂商 | 最新版本与发布时间 | 关键能力 | 输出形态 | 定价 | 免费额度 | 商用 / 版权要点 | 来源 |
|---|---|---|---|---|---|---|---|---|
| **Nano Banana Pro**（`gemini-3-pro-image`） | Google | 2025-11 发布；同门更新版为 Nano Banana 2（`gemini-3.1-flash-image`，2026-02）与 Lite（2026-06） | 1K/2K/4K；多轮对话编辑；知识库增强；Adobe Firefly/Photoshop 集成，支持 6 张参考图 | 位图（PNG 等）；API 同步生成 | **$0.134/张**（1K/2K）、**$0.24/张**（4K）；$120/1M 输出 tokens；Batch −50% 至 $0.067/$0.12；输入图 ≈560 tokens（$0.0011） | **API 无免费额度**（Free Tier "Not available"）；Gemini app 免费档曾为 3→**2 张/天**；AI Pro 100 prompts/天、Ultra 500 | 商用需遵循 Google 条款；**具体训练数据与版权补偿政策未核实** | [Modellix 2026-07-22](https://www.modellix.ai/blog/nano-banana-pro-pricing/)；[Google Cloud 定价页](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing?hl=zh-cn)；[Chrome Unboxed 2025-11-28](https://chromeunboxed.com/google-throttles-free-access-to-gemini-3-pro-and-nano-banana-pro-due-to-overwhelming-demand/)；[AA 榜](https://artificialanalysis.ai/image/leaderboard/text-to-image) |
| **Seedream 5.0 Pro** | 字节跳动 Seed | **2026-07-08** | 复杂信息可视化、交互式精准编辑、真实人像质感、原生多语种（10+ 语言）、图层拆分、检索生图（5.0 引入）；**4K** | 位图；图层分离 | **0.3 元/张**（输出 ≤236 万像素）、**0.6 元/张**（>236 万像素）；输入图首张免费、后续 0.02 元/张；AA 口径 $90/1k | 火山方舟体验中心可试；**CapCut 曾向所有用户提供 20 次免费**（5.0 期） | 中国境内合规运营；**训练数据与版权政策未核实** | [智东西 2026-07-09](https://zhidx.com/p/574086.html)；[IT之家 2026-02-10](https://m.ithome.com/html/920755.htm)；[AA 榜](https://artificialanalysis.ai/image/leaderboard/text-to-image) |
| **Seedream 4.0 / 4.5** | 字节跳动 Seed | 4.0：**2025-09-09**；4.5：**2025-12-04** | 文生图 + 通用编辑同架构；2K→**4K**；原生 Canny/Depth/Mask 控制；高级文字渲染（公式/表格） | 位图 | AA 口径 $30/1k（4.0） | 即梦/豆包/火山方舟可试 | 同上 | [字节 Seed 官方 2025-09-09](https://seed.bytedance.com/zh/blog/seedream-4-0-officially-released-beyond-drawing-into-imagination)；[IT之家 2026-02-10](https://m.ithome.com/html/920755.htm) |
| **GPT Image 2.5**（Flare / Sunburst） | OpenAI | **2026-09-08** | 5 档质量 + auto；最高 **4K**；编辑支持 **16 张参考图**；Flare 高并发低延迟、Sunburst 重精度编辑；延迟较 2.0 最多 −50% | 位图（PNG/JPEG/WebP）；C2PA + SynthID 水印 | **$8/1M** image input、**$30/1M** image output、$5/1M text input；单张 1024²：low **$0.0059** → max **$0.2107**；Flare 与 Sunburst 同价 | ChatGPT **全档位含 Free** 可用；**具体上限官方未公布** | 商用遵循 OpenAI 条款；每张图带 C2PA + SynthID；**训练数据版权政策未核实** | [Apidog 2026-09-09](https://apidog.com/blog/gpt-image-2-5-flare-vs-sunburst-vs-gpt-image-2/)；[Apifox](https://apifox.com/apiskills/what-is-chatgpt-images-2-5-cn/)；[OpenAI 官方](https://openai.com/index/introducing-chatgpt-images-2-5/)；[WaveSpeed 2026-09-09](https://wavespeed.ai/blog/ai-models/gpt-image-2-5-flare-and-sunburst-now-on-wavespeedai/) |
| **GPT Image 2 / 1.5** | OpenAI | 2：**2026-04**（快照 `gpt-image-2-2026-04-21`）；1.5：**2025-12** | 旧代旗舰，仍在服务；Batch 折扣仅 2 支持 | 位图 | 2：`high` $0.211/张（1024²）；Batch 半价 | 同 ChatGPT 体系 | 同上 | [AA 榜](https://artificialanalysis.ai/image/leaderboard/text-to-image)；[Apidog 2026-09-09](https://apidog.com/blog/gpt-image-2-5-flare-vs-sunburst-vs-gpt-image-2/) |
| **Midjourney V8.2** | Midjourney | **2026-07-24**（V8.1 于 2026-06-11 起为默认；V8 alpha 2026-03-17） | 美学/画质/个性化；V8.1：SD 4s、HD 12s、HD 分辨率 4× V7；文字渲染大幅改进；Draft Mode（24 张 512px / 0.4 GPU 分钟）；Canvas 局部重绘；`--sref` 风格参考 | 位图 | Basic **$10**、Standard **$30**、Pro **$60**、Mega **$120**/月（年付 $8/$24/$48/$96 每月等效）；额外 fast GPU $4/小时；**无免费试用** | **无免费额度** | 所有付费套餐含商用权；**年营收 >$1M 的公司须用 Pro/Mega**；Basic/Standard 图默认公开（Stealth 仅 Pro/Mega）；**训练数据版权与诉讼情况未核实** | [Midjourney 官方 V8.2 2026-07-24](https://updates.midjourney.com/version-8-2/)；[官方 V8.1 公告 2026-06-11](https://updates.midjourney.com/v8-1-is-now-the-default-model/)；[AI Weekly 2026-07-25](https://aiweekly.co/learning-ai/generative-ai/how-to-use-midjourney)；[WaveSpeed 2026-03-19](https://wavespeed.ai/blog/posts/what-is-midjourney-v8-features-pricing-how-to-use-2026/) |
| **Adobe Firefly**（平台 + Firefly Image Model 5） | Adobe | Firefly Image Model 5 **GA 于 2026-03**；自定义模型公测 **2026-03-19** | 聚合 **30+ 模型**（Google Nano Banana 2 / Veo 3.1、OpenAI、Runway Gen-4.5、Kling 2.5 Turbo、Black Forest Labs、Ideogram 等）；自定义模型（用自有素材训练、默认私有、不用于训练他人模型）；Quick Cut、图像编辑器；Project Moonlight 私测 | 位图 + 视频 | Standard **$9.99**/月（2,000 点）、Pro **$19.99**/月（4,000 点）、Premium **$199.99**/月（50,000 点）；2026-03 限时无限量生成 | 限时无限量生成（需付费订阅）；**长期免费额度未核实** | **官方称 Firefly 仅用已授权 Adobe Stock 或公有领域数据训练，并为企业客户提供 IP 侵权财务补偿**；但 **2026-06 股东诉讼指控其 AI 栈部分依赖「受污染训练数据」** | [Adobe 官方 2026-03-19](https://blog.adobe.com/jp/publish/2026/03/23/cc-adobe-firefly-expands-video-image-creation-with-new-ai-capabilities-custom-models)；[Adobe 官方 2025-11-20](https://blog.adobe.com/en/publish/2025/11/20/google-gemini-3-nano-banana-pro-firefly-photoshop)；[IT之家 2026-01-13](https://www.ithome.com/0/912/657.htm)；[TraderFox 2026-06-05](https://mobile.traderfox.com/blog/aktien-magazin/chartanalyse-adobe-ki-chancen-vs-urheberrechtsrisiken/p-173349/)；[股东诉状 2026-06](https://www.courthousenews.com/wp-content/uploads/2026/06/stockholder-complaint-sanjose.pdf) |
| **Recraft V4.1** | Recraft | **2026-05-14**（V4：2026-02） | **唯一可生成可编辑生产级 SVG 矢量**的模型；排版与插图；Pro 原生 2048×2048 | **矢量 SVG** + PNG/JPG/PDF/TIFF/**Lottie** | API：V4.1 $0.035、Pro $0.21、Vector $0.08、Vector Pro $0.30、**Flash $0.007**（每张）；订阅 Free / Basic $12.50 / Pro $20 每用户每月 | **所有 V4/V4.1 版本均可在 Free 套餐使用** | 商用依 Recraft 条款；**训练数据来源与版权政策未核实** | [Recraft 官方 V4.1](https://www.recraft.ai/docs/recraft-models/recraft-v4-1)；[Recraft 官方 V4](https://www.recraft.ai/docs/recraft-models/recraft-V4)；[CostBench 2026-07-25](https://costbench.com/software/ai-image-generators/recraft/) |
| **Ideogram 4.0** | Ideogram | **2026-06-03** | 9.3B 开放权重；**X-Omni 英文 OCR 0.97**；bounding-box 布局控制；结构化 JSON 提示；16 色 hex 调色板；Turbo/Default/Quality 三档；256–2048px | 位图（最高 2K）；API 支持透明背景 PNG | 订阅：Free / Plus **$20**（年付 $15）/ Pro **$60**（年付 $42）/ Team **$30 每用户**；4.0 单图 = Turbo 2 / Balanced 4 / Quality 6 credits；fal.ai API 约 $0.03–$0.10/张 | **Free 档：每周 slow credits（数量可变）**，生成内容公开 | 开放权重可用商业许可自托管；官方称不限制用户对输出的权利，但**不保证不涉及第三方 IP 或肖像权**；商用自托管需遵守随用量伸缩的许可 | [Morphic（引 Ideogram 官方）](https://morphic.com/resources/models/ideogram-4)；[The Rundown AI 2026-08-30 复核](https://www.therundown.ai/tools/ideogram)；[DEV 2026-06-06](https://dev.to/igorgridel/ideogram-40-is-on-7-platforms-heres-what-it-actually-costs-1np9) |

---

## 10. 未核实项清单

以下内容在本次调研中**未能取得可交叉验证的一手来源**，明确标注为「未核实」，请勿当作事实使用：

### Google / Nano Banana Pro
1. **Nano Banana Pro 的 GA（正式可用）日期**——InferenceBench 标注为 2026-06-18，但未获第二个来源交叉验证；Google Cloud 官方 GA 博客页（`cloud.google.com/blog/products/ai-machine-learning/nano-banana-2-and-nano-banana-pro-are-generally-available`）抓取失败。
2. **Google 官方定价页原文**——`ai.google.dev/gemini-api/docs/pricing` 与 Google Cloud 定价页正文均抓取失败；价格数据来自 Modellix 引用 Google 页面截图（2026-07-22）与 Google Cloud 中文定价页的搜索摘要（2026-09-24）。
3. **Nano Banana Pro 的文字渲染量化指标**（OCR 准确率等）——Google 未公布可检索的官方分数。
4. **Gemini app 免费档在 2026-09 的实际每日生图额度**——Google 仅称「Basic access，限额可能频繁变动」，未公布固定数字。
5. **Google 图像模型的训练数据来源与版权补偿政策**。

### 字节 Seedream
6. **Seedream 5.0 Pro 在即梦 AI / 豆包的正式（非「陆续」）上线日期**。
7. **Seedream 5.0 / 5.0 Pro 的完整官方技术报告与榜单分数**（无官方 MagicBench 数据链接可取）。
8. **中国证券网「剪映上线 Seedream 5.0 Preview」报道的具体发布日期**。
9. **Seedream 系列训练数据来源与版权政策**。

### OpenAI
10. **ChatGPT Images 2.5 各套餐的具体生成上限**——OpenAI 未公布，社区报告（Free 2–3 张/天、Plus 40–50 张/3 小时等）**属未核实**。
11. **`/v1/batch` 是否接受 2.5 模型 ID**——截至 2026-09-09 官方文档未确认。
12. **`thinking` 参数在 2.5 上的支持状态**——2.5 文档未提及。
13. **`gpt-image-2` 的弃用日期**——未公布。
14. **OpenAI 官方发布博文原文**（`openai.com/index/introducing-chatgpt-images-2-5/`）返回 HTTP 403，价格与功能细节来自 Apidog / Apifox / WaveSpeed 的引用。
15. **GPT Image 2.5 的训练数据来源与版权政策**。

### Midjourney
16. **V8.2 是否已取代 V8.1 成为默认模型**——V8.1 于 2026-06-11 被宣布为默认，V8.2 于 2026-07-24 发布，但官方公告未说明默认位是否变更。
17. **Midjourney 官方订阅页原文**（`midjourney.com/plans`、`docs.midjourney.com/docs/plans`）均返回 403，价格来自 AI Weekly（2026-07-25，声称已对官方文档与定价页校验）。
18. **Midjourney 训练数据版权与在审诉讼的具体情况**。

### Adobe
19. **Adobe Firefly 在 2026-09 的当前方案与点数额度**——采用的是 2026-01 口径。
20. **股东诉讼的案号、审理进度与结果**——仅取得 2026-06 诉状存档 PDF。
21. **Adobe Q3 FY2026 财报的原始一手数据**（Investing.com / Yahoo Finance 均返回 403）；数字来自 StockAnalysis 新闻聚合。
22. **Adobe「CEO 交接」的具体人选与时间表**。

### Recraft
23. **完整的官方订阅档位与各档点数表**——官方定价页为 JS 渲染无法抓取；CostBench 仅 1 个来源、自评「置信度低」。
24. **Recraft 训练数据来源与商用赔偿政策**（是否像 Adobe 一样提供 IP indemnification）。

### Ideogram
25. **Ideogram 官方定价页原文**——`ideogram.ai/pricing` 直连失败；数据来自 The Rundown AI（2026-08-30 声称已复核官方定价页）。
26. **Ideogram 4.0 在 2026-09 是否已有更新版本（如 4.x）**——本次检索未发现 4.0 之后的版本。

### Artificial Analysis
27. **榜单页面的明确「最后更新」时间戳**——页面未标注；仅能确认「上月新增」包含 2026-09 发布的模型，检索时间为 2026-09-24。
28. **Elo 分数的统计方法学细节与「Personal Leaderboard」对全局排名的影响**。

### 其他
29. **Midjourney、Recraft、Ideogram、Adobe Firefly 自有模型均未出现在 Artificial Analysis 的文本生图 / 图像编辑榜中**，因此无法给出它们与上述上榜模型的 Elo 直接对比。
