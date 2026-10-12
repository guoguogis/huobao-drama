# 视频拼接（最后剪辑）逻辑与复用指南

> 面向「把这套能力搬到别的项目」的场景。本文的每条结论都来自本仓库代码 + 2026-09 的一次真实素材实测，
> 实测数据与命令见 [第 5 节](#5-实测结论与已知限制重要)。
>
> 结论先行：真正需要复用的核心约 **4 个文件 / 300 行**，其中最麻烦的部分（ffmpeg 二进制探测、
> 路径注入防护、缺失文件预检、异步完成竞态）都不依赖本项目业务；但**现有拼接命令有两个静默损坏的坑**，
> 直接照搬会带过去（第 5 节），建议改用第 6 节的参考实现。

---

## 1. 链路全景

```
每个分镜的成品视频                         data/static/videos/<uuid>.mp4
        │
        │  sys_task(type=video, status=completed, local_path)   ← 「历史版本」数据源
        ▼
① 选片（前端，导出页）      每个分镜一行 → 单选一个版本
        │                    exportOverrides() → { 分镜id: "static/videos/x.mp4" }
        ▼
② POST /api/v1/merge/episodes/:id/merge
        │   body: { storyboard_ids?: number[], video_overrides?: { [sbId]: "static/..." } }
        ▼
③ mergeEpisodeVideos()  （backend/src/services/ffmpeg-merge.ts）
        ├─ 取分镜：WHERE episode_id=? ORDER BY storyboard_number，可按 storyboard_ids 过滤
        ├─ 取用路径：video_overrides[sb.id] || sb.video_url || sb.composed_video_url
        ├─ 丢掉没有视频的镜头（允许部分拼接）；一个都不剩 → throw（路由转 400）
        ├─ 预检 checkFfmpegSuite()：ffmpeg/ffprobe 不可用 → 带修复指引的报错
        ├─ 预检文件真实存在：缺失 → 「镜头 S3、S7 的视频文件已丢失」
        ├─ INSERT video_merges(status=processing) → 立刻返回 merge_id（HTTP 200）
        └─ 异步 doMerge()（不 await）
              ├─ 写 concat 列表：每行 file '<绝对路径>'（LF 结尾）
              ├─ ffmpeg -f concat -safe 0 -i list \
              │        -fflags +genpts -c:v libx264 -preset medium -crf 23 \
              │        -c:a aac -ar 48000 -b:a 192k -movflags +faststart out.mp4
              ├─ 抽 0.5s 处画面为海报帧（640 宽，同名 _poster.jpg）
              └─ video_merges → completed(merged_url, duration)；episodes.video_url = 成片
        ▼
④ 前端轮询 GET /merge/episodes/:id/merge（每 3s）→ completed / failed 后停止
        ▼
⑤ 成片列表 GET /merge/episodes/:id/merges（软删过滤、新的在前、最多 30 条）
        → 播放 / 下载 / 删除（软删）
```

**磁盘布局**

| 路径 | 内容 | 生命周期 |
|---|---|---|
| `data/static/videos/<uuid>.mp4` | 单镜头生成产物 | 长期（删除任务记录不删文件） |
| `data/static/merged/<uuid>.mp4` | 拼接成片 | **不会被自动清理**（见第 9 节） |
| `data/static/merged/<uuid>_poster.jpg` | 成片海报帧 | 同上 |
| `data/static/temp/<uuid>.txt` | concat 列表 | 拼接成功后 `unlinkSync` 删除 |

**对外访问**：`/static/*` 由 `serveStatic({ root: DATA_ROOT })` 提供；本项目该前缀挂了登录守卫
（`app.use('/static/*', requireAuth)`），所以前端播放必须带会话 Cookie；生产环境前端与后端同源。

---

## 2. 模块地图与复用评级

| 文件 | 关键导出 | 职责 | 复用 |
|---|---|---|---|
| `backend/src/utils/video-overrides.ts` | `parseVideoOverrides(raw)` | 校验「分镜id → 站内路径」覆盖表 | ★★★ 纯函数、零依赖，**直接抄** |
| `backend/src/utils/ffmpeg.ts` | `ffmpeg`、`checkFfmpegSuite()` | 解析内置/环境变量二进制 + `-version` 探测 + 成功缓存 | ★★★ 只读 2 个环境变量，**直接抄** |
| `backend/src/utils/video-poster.ts` | `posterPathFor`、`extractVideoPoster` | 抽 0.5s 海报帧 | ★★★ 换掉 `getAbsolutePath` 即可 |
| `backend/src/utils/media-probe.ts` | `probeDurationSeconds(absPath)` | 媒体时长（WAV 直接读 RIFF 头，其余走 ffprobe） | ★★★ 同上，WAV 分支值得单独复用 |
| `backend/src/utils/paths.ts` | `DATA_ROOT`、`STORAGE_ROOT` | 全项目唯一路径锚点 | ★★ 换成你自己的锚点 |
| `backend/src/services/ffmpeg-merge.ts` | `mergeEpisodeVideos(episodeId, dramaId, storyboardIds?, videoOverrides?)` | 编排 + concat + 落库 | ★★ 核心逻辑可搬，需替换 DB/路径/日志 |
| `backend/src/routes/merge.ts` | 4 个 HTTP 端点 | 参数解析 + 部分拼接 + 列表/软删 | ★★ 换 Web 框架即可 |
| `backend/src/db/schema.ts` `videoMerges` | 表定义 | 成片记录 | ★★ 字段可直接照搬 |
| `frontend/app/views/drama/episode.vue`（导出区块） | 选片状态机 | 每个分镜一行、单选、覆盖表、轮询 | ★★ 逻辑可搬，UI 需重画 |
| `frontend/app/composables/useApi.ts` `mergeAPI` | 4 个请求封装 | 客户端契约 | ★ 直接抄 |

> 参考实现：`docs/snippets/merge-videos.mjs`（零依赖，只用 `node:child_process`，
> 已用混采样率 / 混分辨率 / 无音轨三种素材实测通过）。

---

## 3. 数据契约

### 3.1 表 `video_merges`

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | |
| `episode_id` / `drama_id` | INTEGER | 归属 |
| `title` | TEXT | 当前写死 `Episode {id} Merge` |
| `provider` / `model` | TEXT **NOT NULL** | 固定 `ffmpeg` / `ffmpeg-concat-h264-aac` |
| `status` | TEXT | `processing` → `completed` / `failed` |
| `scenes` | TEXT | JSON 数组，**参与拼接的片段相对路径**（可直接作为审计/重放依据） |
| `merged_url` | TEXT | 成片相对路径 `static/merged/<uuid>.mp4` |
| `duration` | INTEGER | 秒（ffprobe 取整） |
| `error_msg` | TEXT | 失败原因（前端 `mapError` 直接展示） |
| `created_at` / `completed_at` / `deleted_at` | TEXT | `deleted_at` 非空 = 软删（列表查询过滤） |

### 3.2 HTTP

```
POST   /api/v1/merge/episodes/:id/merge
       body  { storyboard_ids?: number[], video_overrides?: { "12": "static/videos/a.mp4" } }
       200   { code: 200, data: { merge_id: 34, status: "processing" } }
       400   { code: 400, message: "所选镜头还没有可拼接的视频" | "镜头 S3 的视频文件已丢失…"
                                  | "video_overrides 只接受站内 static/ 路径：…" }

GET    /api/v1/merge/episodes/:id/merge       → 最新一条（toSnakeCase）或 null
GET    /api/v1/merge/episodes/:id/merges      → 软删过滤、新的在前、最多 30 条
DELETE /api/v1/merge/merges/:id               → 软删；非法 id / 不存在 / 已删 → 400
GET    /api/v1/episodes/:id/generation-tasks  → { tasks: [...], merges: [...] }（导出页一次拿全）
```

### 3.3 「历史版本」行的形态（`sys_task`）

| 字段 | 说明 |
|---|---|
| `local_path` | 站内相对路径（**优先**），`static/videos/<uuid>.mp4` |
| `result_url` | 上游原始 URL（未下载成功时的兜底） |
| `status` | `processing` / `completed` / `failed` |
| `prompt` / `model` / `provider` / `params` / `task_id` | 生成详情弹框的数据来源 |

**命名坑（务必注意）**：`GET /tasks` 返回的是 Drizzle 原始行（**camelCase**：`localPath`、`createdAt`），
而 `GET /episodes/:id/generation-tasks` 走 `toSnakeCaseArray`（**snake_case**：`local_path`、`created_at`）。
前端因此统一用兼容函数取值：

```js
function taskClipPath(t) { return t?.local_path || t?.localPath || t?.result_url || t?.resultUrl || '' }
function taskCreatedAt(t) { return t?.created_at || t?.createdAt || '' }
```

---

## 4. 剪辑算法现状（逐步）

1. **顺序**：`ORDER BY storyboard_number`（不是 id），保证成片镜头顺序与分镜序号一致。
2. **取用优先级**：`video_overrides[id]` > `storyboard.video_url`（主视频）> `composed_video_url`（历史数据兼容）。
   - 覆盖表的意义：导出时可用某个**历史版本**，而不必改动分镜自身的主视频。
3. **允许部分拼接**：没有视频的镜头被跳过；全部都没有才报错。
4. **concat 解复用**：写一个列表文件，用 `-f concat -safe 0` 让 ffmpeg 把多段当作一条流读取；
   `-safe 0` 是为了允许绝对路径（默认只允许相对路径）。
5. **整体重编码**：`libx264 preset=medium crf=23` 视频 + `aac 48kHz 192k` 音频，`+faststart` 便于网页秒开。
   重编码 ≠ 归一化：**没有任何 scale/fps/aresample 滤镜**，因此默认假设各段规格一致（见第 5 节实测反例）。
6. **失败处理**：`doMerge` 的异常只写库（`status=failed` + `error_msg`），HTTP 早在第 3 步就返回 200 了——
   前端必须靠轮询才能知道结果。

---

## 5. 实测结论与已知限制（重要）

实测素材（均取自本仓库真实产物）：

| 片段 | 分辨率 | 帧率 | 音频 |
|---|---|---|---|
| A `09b2449a…` | 1280×720 | 24 | aac 32 000 Hz 立体声 |
| B `1af4832c…` | 1280×720 | 24 | aac **24 000 Hz** 立体声 |
| C `0c90ab9d…` | **1344×768** | 24 | aac 32 000 Hz 立体声 |
| M | 同 C，`-an` 去音轨 | 24 | **无** |

### 5.1 现有命令（concat 解复用）

| 组合 | 退出码 | 视频时长 | 音频时长 | 结论 |
|---|---|---|---|---|
| A + B（同分辨率、**混采样率**） | 0 | 29.167s | **21.984s** | ❌ 音频短 **7.18s**，成片后半段无声；stderr 大量 `Error submitting packet to decoder: Invalid data found` |
| A + C（**混分辨率**） | 0 | 24.256s | 24.2s | ⚠️ 能出片，自动放大填满 1280×720（无黑边；1.75 → 1.778 约 1.6% 横向拉伸） |
| **M + A（首段无音轨）** | 0 | 24.167s | **无音轨** | ❌ **整条成片音轨彻底消失**，尽管第二段有声音 |
| A + M（末段无音轨） | 0 | 24.250s | 14.112s | ⚠️ 后半段没有音频轨覆盖 |

要点：**这些失败全部是静默的**——退出码 0、接口 200、成片能播，用户只会觉得"后半段没声音"。

顺带确认：本项目写的列表格式（Windows 反斜杠绝对路径 + 单引号 + LF）是**对的**，
单引号内的反斜杠被当作字面量，实测 A+B 得到 29.167s（= 两段之和）。

### 5.2 参考实现（逐段归一化 + concat 滤镜）

```
ffmpeg -y -i A -i B \
  -filter_complex "\
    [0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24[v0];\
    [0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a0];\
    …（每段一组）…;\
    [v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
  -c:a aac -ar 48000 -b:a 192k -movflags +faststart out.mp4
```

| 组合 | 视频时长 | 音频时长 | 备注 |
|---|---|---|---|
| A + B（混采样率） | 29.270s | **29.269s** | ✅ 音视频齐平，无解码错误 |
| A + C（混分辨率） | 24.224s | 24.224s | ✅ |
| A + M（无音轨段） | 24.209s | 24.205s | ✅ 缺音轨段自动用 `anullsrc` 垫静音 |

无音轨段的做法：为该段额外接一个输入
`-f lavfi -t <该段时长> -i anullsrc=channel_layout=stereo:sample_rate=48000`，
再在滤镜里用它当该段的音频源。

---

## 6. 抽取到新项目：三层

### 层 A — 纯函数（0 依赖，建议原样搬）

- `parseVideoOverrides(raw)`：**安全边界，别省**。它挡的是"请求方指定任意本地文件参与拼接"——
  下游 `toAbsPath` 对绝对路径是直接采用的，缺了这层校验等于开放任意文件读取。
  规则：键必须是正整数；值必须是 `static/` 开头且不含 `..`；任一项非法则**整体拒绝**。
- `posterPathFor(rel)` / `probeDurationSeconds` 的 WAV 分支（按 RIFF 块遍历取 `data/byteRate`，
  比 spawn ffprobe 快且不依赖二进制）。

### 层 B — 单模块（Node + 一个 ffmpeg 二进制）

| 搬运项 | 需要替换的锚点 |
|---|---|
| `checkFfmpegSuite()` | 二进制来源：`FFMPEG_BIN` / `FFPROBE_BIN` 环境变量 + 可选 npm 包；**保留 `-version` 探测**，否则坏二进制会以同步 `EFTYPE` 崩掉整个 Node 进程 |
| `extractVideoPoster()` | `getAbsolutePath()` → 你的路径解析 |
| `mergeVideos()`（参考实现） | 分辨率/帧率/采样率目标值、CRF、并发数 |

### 层 C — 端到端（HTTP + DB）

最小改造点（其余可照抄）：

1. **路径锚点**：`DATA_ROOT`（`HUOBAO_DATA_DIR`）与 `STORAGE_ROOT`（`STORAGE_PATH`）→ 换成你的两个目录。
2. **表**：`video_merges` 直接照搬（含 `deleted_at` 软删——删记录不删文件是刻意的）。
3. **任务表**：这套设计的"历史版本"能力来自「每段生成视频都留一行任务记录」，若你的项目没有，
   至少要保留 `local_path + status + created_at` 三列，否则选片功能无从谈起。
4. **异步语义**：接口立刻返回 `merge_id`，结果靠轮询/推送；务必把 `error_msg` 落库并回传。
5. **静态访问**：成片要能被前端播放；若要给外部系统拉取，注意本项目 `/static/*` 是**要登录**的，
   对外提供时你需要另开签名 URL 或独立分发通道。

---

## 7. 前端选片状态机（复用要点）

```js
exportSbTasks   // { [sbId]: TaskRow[] }  只放 completed 且有文件的，组内按 created_at 倒序
exportPickBySb  // { [sbId]: path }       每个分镜最多一个；键不存在 = 该分镜不参与拼接
exportSelTouched// 用户动过手就不再自动全选
```

- **每段一行**：只列「有视频版本」的分镜（`exportRows = sbs.filter(s => exportSbClips(s).length)`）。
- **默认选片**：主视频优先，主视频不在版本列表里（记录被删 / 指向拼接产物）才退回第一条；
  失效选择会被清理。
- **单选 + 反选**：再点已选中的那条 = 该分镜不参与拼接（`pickExportClip`）。
- **覆盖表**：`exportOverrides()` 只输出"选中且路径非空"的键值。
- **轮询**：`doMerge()` POST 成功后 `setInterval` 3s 查状态，terminal 即 `clearInterval`。
- **删除成片**：软删后**先从本地列表移除**再重新拉取，避免等接口回来才消失。
- 单片段预览走独立弹框（`openClipPlayer`），不参与拼接逻辑。

---

## 8. 测试与守卫

| 测试 | 覆盖 |
|---|---|
| `backend/tests/video-overrides.test.ts`（6） | 覆盖表校验：空值、合法路径、绝对路径/`..` 拒绝、非法键、非对象入参、部分非法整体拒绝 |
| `backend/tests/merge-delete.test.ts`（2） | 软删语义、列表过滤、文件保留、重复删/非法 id |
| `backend/tests/merge-direct-video-structure.test.mjs`（3） | 直接用生成产物、部分拼接、文件预检、ffmpeg 预检、**拼接命令与本文档一致**（含"尚未归一化"的显式断言） |

建议补齐（见第 9 节）：拼接前的**媒体一致性校验**（各段分辨率/帧率/采样率是否有音轨），
以及拼接后的**结果自检**（总时长 ≈ 各段之和，偏差阈值内）。

---

## 9. 建议改进（按性价比排序）

1. **改用归一化配方**（第 5.2 节，实测已通）：一次性解决混采样率音频截断、首段无音轨导致整条失声、
   混分辨率拉伸三个问题。
2. **无音轨段垫静音**：配方里已含 `anullsrc` 分支。
3. **拼接并发锁**：同一集重复点「拼接所选」会产生多条记录并同时跑多个 ffmpeg（本项目未加锁）。
4. **成片文件生命周期**：现在软删只删记录，`static/merged/` 会无限增长；建议加保留策略
   （保留最近 N 条，或"文件未被任何未删记录引用时清理"）。
5. **结果自检**：拼接后比对 `Σ各段时长` 与成片时长，偏差 > 10% 直接标记失败并提示。
6. **进度可见**：目前只有 `processing/completed/failed`；`doMerge` 可以把 ffmpeg 的
   `-progress` 输出按秒回写，做真实进度条。
7. **参数可配**：`preset/crf/分辨率` 目前写死，多项目复用时建议提到配置或请求参数。
