# -*- coding: utf-8 -*-
"""
构建《设计即代码》视频分镜表（02-分镜与生图提示词.csv）。

这个脚本是分镜表的唯一事实来源：改这里 -> 重跑 -> 得到 CSV。
已把试图得到的规则编码进去：
  1) 线条必须连续闭合（用户明确要求）
  2) 黑墨线为主，蓝/橙只做点缀
  3) 只在 S01 / S27 出现手与马克笔，且必须是黑线稿平涂（禁肤色、指甲）
"""
import csv
import os

OUT = r"D:\code\GitHub\huobao-drama\design-as-code\02-分镜与生图提示词.csv"
ANCHOR = r"D:\code\GitHub\huobao-drama\design-as-code\prompts\S00-v3.txt"

PREFIX = (
    "hand-drawn whiteboard marker sketch illustration, single-panel explainer diagram, "
    "off-white textured paper background, bold uneven black ink outlines, diagonal hatching shading, "
    "palette limited to black plus cobalt blue and warm orange accents, clean centered composition, "
    "generous negative space, 16:9, no text no letters no words no numbers"
)
LINE_RULE = (
    "; every line is a single continuous unbroken stroke, every shape is closed, no gaps, "
    "no broken strokes, no floating marks, ALL lines are solid and drawn in one pass, "
    "never dashed, never dotted, no dotted outlines, no dashed decorative frames, "
    "bold black ink as the primary line work with "
    "cobalt blue and warm orange only as sparse accents"
)
HAND_RULE = (
    "; the hand and marker drawn as simple flat line art with flat single-tone fills, "
    "no realistic skin shading, no fingernails"
)
NO_HAND_RULE = "; no realistic human hand, no photorealistic people"

NEG = (
    "text, letters, words, chinese characters, numbers, watermark, logo, photorealistic, "
    "3D render, glossy, neon glow, gradient mesh, cluttered, busy background, deformed hands, "
    "distorted faces, blurry, low contrast, broken line, line gap, floating stroke, "
    "detached mark, incomplete shape, dashed line, dotted line, dashed border, dotted outline, "
    "realistic hand, skin tone, fingernails, muscle shading"
)

# 屏幕板书文字：开发者视角版台词定稿后同步调整（更短、更像开发会写在白板上的话）
# 注意：BOARD 是屏幕板书文字的**权威来源**，会覆盖下面 SHOTS 里的同名字段；
# 改板书请只改这里，SHOTS 里的那一列仅作历史留档。
BOARD = {
    "S01": "设计稿来了，你再实现一遍",
    "S02": "你和设计稿之间，隔着手工活",
    "S03": "设计即代码 / Design as Code",
    "S04": "设计稿 → 你项目里能用的代码",
    "S05": "切图 · 标注 · 一个个量间距",
    "S06": "设计决策，以代码形式到手",
    "S07": "设计稿 = 一棵 JSON 节点树",
    "S08": "节点 → 中间表示",
    "S09": "中间表示 → Vue / React / 小程序",
    "S10": "照抄坐标 = 钉死的绝对定位",
    "S11": "换算成弹性布局",
    "S12": "设计稿的分组 ≠ 页面的结构",
    "S13": "类名要读得懂 · 认出你项目里的真组件",
    "S14": "只给截图，机器得先猜结构",
    "S15": "编辑器兜下限 · AI 定上限",
    "S16": "省下的是“照稿再实现一遍”",
    "S17": "还有那句“跟设计稿不太像”",
    "S18": "改一版设计，重新生成一版",
    "S19": "设计意图落到代码，不用你猜",
    "S20": "但 ≠ 替你上线",
    "S21": "最后一公里，还是你走",
    "S22": "一次性活动页 ≠ 长期系统",
    "S23": "通用方案 ≈ 1–2 人年",
    "S24": "✅ 中后台 / 活动页　❌ 强交互 / 多状态",
    "S25": "设计上下文 → 编码 Agent",
    "S26": "设计令牌 + 组件契约 = 接口",
    "S27": "要拆掉的是“翻译”",
}

# 镜号, 章节, 时间码, 时长, 画面中文描述, 英文主体, 屏幕板书文字, 运镜与动效, 备注
SHOTS = [
    ("S01", "开场", "00:00-00:05", "5",
     "深夜长桌，左边的人在手绘板上画界面，右边的人对着同一张稿子在笔记本上重画",
     "two minimalist line-drawn characters at one long desk at night, the left one drawing a UI wireframe on a graphics tablet, the right one retyping the same wireframe on a laptop, one large shared UI mockup sheet floating above the desk, a desk lamp and a coffee cup",
     "设计稿来了，你再实现一遍", "缓慢推近 100%→106%；板书文字从上方落下", "人物只画背影，避免五官；这是首次出现手，必须为黑线稿平涂"),
    ("S02", "开场", "00:05-00:10", "5",
     "设计稿与代码之间裂开一道断崖，两侧各站一个小人，上方飘着尺子、对话气泡与碎片",
     "a deep vertical cliff or gap splitting the frame; on the left ledge a small line-drawn designer holding a sketch sheet, on the right ledge a small developer holding a laptop, floating above the gap: a pair of scissors, a measuring ruler, and two speech bubbles as debris",
     "切图 · 标注 · 反复沟通", "三个漂浮物依次轻微上下浮动；镜头缓慢横移", "断崖要留出中央字幕安全区"),
    ("S03", "第一章", "00:10-00:15", "5",
     "正中央一块黑板样式的标题面板，四周散落画笔、花括号、齿轮、放大镜等线稿小图标",
     "a large blank blackboard panel at the center of the frame, surrounded by floating hand-drawn icons: a paintbrush, curly braces, a gear, a magnifier, and a code bracket, with a chalk stick resting below",
     "设计即代码 / Design as Code", "图标逐个淡入；黑板中央留给标题字", "章节卡也叠在这里"),
    ("S04", "第一章", "00:15-00:20.5", "5.5",
     "左半张静态设计稿折叠成台阶，过渡到右半张代码块结构，中间是转化箭头",
     "one large UI mockup sheet on the left folding step by step into a tidy stack of code blocks on the right, a thick transformation arrow connecting them, small sparkle marks at the fold",
     "设计稿 → 可用代码", "沿箭头方向做擦除揭示；折叠处加闪光粒子", "折叠台阶是本镜的记忆点"),
    ("S05", "第一章", "00:20.5-00:26", "5.5",
     "三个图标并排——剪刀、标注尺、对话气泡，被一条粗斜线依次划掉",
     "three floating icons in a row, a pair of scissors, a measuring ruler and a speech bubble, each crossed out with one bold diagonal marker stroke, evenly spaced on otherwise empty paper",
     "省掉三个环节", "三条斜线按 0.4s 间隔依次画出来", "划线动画后期加，不要靠生图；首版多画了一个带五官的小人，已移除"),
    ("S06", "第一章", "00:26-00:31.5", "5.5",
     "放大镜下把细节纹理、交互箭头、组件方块与三块不同尺寸屏幕一起装进代码盒子",
     "a magnifying glass over a UI mockup; inside the lens: texture detail lines, a curved interaction arrow, a square component block; next to it a phone, a tablet and a monitor outline; all of them feeding into a single open code box",
     "细节 · 交互 · 布局 · 响应式", "镜头从放大镜推向代码盒子", "元素较多，允许生 3 张挑 1 张"),
    ("S07", "第二章", "00:31.5-00:37.5", "6",
     "一张设计稿被掀开一角，露出内部相连的节点树，每个节点是一张小卡片",
     "a large UI mockup sheet peeled open at one corner like paper, revealing a tree of connected node cards inside, each node card drawn as a small rounded rectangle linked by branches",
     "设计稿 = 一棵 JSON 树", "掀开动作做成遮罩动画；节点依次点亮", "全片知识增量点，画面要最清楚"),
    ("S08", "第二章", "00:37.5-00:43", "5.5",
     "节点树流入手绘漏斗机，另一头吐出规整的方块结构",
     "a tree of node cards on the left flowing into a hand-drawn funnel machine in the middle; out of the funnel come neatly stacked uniform structural blocks on the right, showing order replacing chaos",
     "节点 → DSL（中间语言）", "节点沿曲线流入漏斗；方块的整齐感要明显", "漏斗是中间表示的视觉隐喻"),
    ("S09", "第二章", "00:43-00:49", "6",
     "手绘代码打印机：左边投入结构方块，右边吐出四卷贴有标签的代码卷轴",
     "a hand-drawn printing machine in the middle; a stack of structural blocks enters from the left, four long paper scrolls of code come out on the right, each scroll tagged with a different small shape badge",
     "DSL → Vue / React / 小程序 / ArkUI", "卷轴依次送出，每条配一个标签弹出", "框架名靠后期文字，勿让 AI 画字"),
    ("S10", "第二章", "00:49-00:55", "6",
     "页面元素被图钉和坐标十字线钉死在画布上，旁边小人挠头",
     "page elements pinned to a canvas by thumbtacks with crosshair coordinate lines drawn through them, rigid and frozen; a small line-drawn character beside the canvas scratching its head",
     "照抄坐标 = 绝对定位", "镜头轻微抖动一次，强化僵硬感", "情绪转折镜，画风保持但气氛收紧"),
    ("S11", "第二章", "00:55-01:01", "6",
     "元素先水平投影分成两组，再竖直投影量出间距，最后变成弹性积木",
     "left group of scattered squares projected horizontally to the right into two neat rows, then projected vertically to reveal even gaps, guide lines and arrows everywhere, ending in elastic spring-like flexible blocks",
     "投影法 → Flex 布局", "分两步走：先水平投影，再竖直投影；配生长箭头", "信息最密的一镜，动画必须分步"),
    ("S12", "第二章", "01:01-01:07", "6",
     "左侧歪斜的稿子分组，中间聚类机器，右侧整齐的页面结构树",
     "on the left a messy skewed grouping of design boxes, in the middle a small clustering machine, on the right a clean tidy tree structure of page sections",
     "设计稿的分组 ≠ 网页结构", "左侧抖动、右侧稳定，形成对比", "左右对比可做分屏滑入"),
    ("S13", "第二章", "01:07-01:13", "6",
     "一个元素被贴标签，标注工具与机械臂各贴一张；远处是按钮、表格、卡片的组件方块",
     "one element with a blank label tag attached; a simple mechanical tag dispenser machine and a small robot arm each attaching a second blank label tag; behind them a row of component blocks drawn as a button, a table and a card",
     "类名要语义化 · 认出组件", "标签逐个贴上，配轻快音效", "标签内容后期加，生图留白；首版把标注工具画成了人手，已改为机械装置"),
    ("S14", "第二章", "01:13-01:19", "6",
     "截图进入眼睛加网格的识别装置，输出带框元素，再进入转换管线",
     "a screenshot rectangle entering a hand-drawn recognition device drawn as a large eye behind a grid mesh; the device outputs outlined element boxes on the other side, which then feed into a pipeline conveyor",
     "截图输入，先过 AI 识别", "识别框逐个弹出，带扫描线", "强调多了一步"),
    ("S15", "第二章", "01:19-01:25", "6",
     "天平两端分别是编辑器工具与机械脑，中间托盘里是生成的代码块",
     "a seesaw balance scale; on the left pan a simple editor tool icon, on the right pan a small robot head, and in the middle hanging tray a stack of generated code blocks",
     "下限靠编辑器，上限靠 AI", "天平轻微摆动后静止", "金句镜，给足停留时间"),
    ("S16", "第三章", "01:25-01:30.5", "5.5",
     "大时钟旁，橡皮把成堆重复代码块擦掉，只剩一小叠",
     "a large wall clock with a big eraser wiping away a tall pile of duplicated identical code blocks, leaving a much smaller tidy stack behind",
     "① 效率：少做重复劳动", "橡皮自右向左扫过", "四点价值统一构图：左图标 + 右讲解区"),
    ("S17", "第三章", "01:30.5-01:36", "5.5",
     "两张图纸几乎完全重合，旁边一把对齐尺与水平仪",
     "two large translucent sheets, one showing a UI mockup and one showing a matching page layout, overlapping almost perfectly in the middle, with an alignment ruler and level bubble at the side",
     "② 一致性：设计与实现对齐", "两张纸从两侧滑入后重合", "重合瞬间加一个轻微闪光"),
    ("S18", "第三章", "01:36-01:41", "5",
     "循环箭头串起改稿、重新生成、上线三站，小人推着小车循环",
     "a circular arrow loop connecting three stations: a sketch sheet, a regenerated code block, and a rocket; a small line-drawn character rolls a tiny cart along the loop instead of carrying bricks",
     "③ 迭代：改完重新生成", "箭头上有一个移动的光点表示循环", "节奏可略快"),
    ("S19", "第三章", "01:41-01:46", "5",
     "一支铅笔牵出一条线跨过沟壑，直连到对岸的代码块",
     "a simple line-art pencil drawing one single continuous line that travels across a gap and lands on a small code card on the far side, the pencil is plain outline with a flat single-tone body, the code card is drawn with outline only and contains no solid black fill",
     "④ 门槛：设计师也能参与实现", "线条生长到对岸，端点亮起", "四点收束，语气可上扬；首版铅笔过于写实、代码块被涂成实心黑块，已改为线稿"),
    ("S20", "第四章", "01:46-01:51.5", "5.5",
     "写着一键上线的大按钮被打上叉，旁边弹出一沓待办清单",
     "a large round button with a blank face crossed out by a bold red-orange marker X, and beside it a thick stack of checklist papers springing out",
     "但，≠ 一键上线", "打叉动画要干脆，配一个低沉音效", "全片语气转折点，语速必须放慢"),
    ("S21", "第四章", "01:51.5-01:57.5", "6",
     "通往上线之路最后一段坑洼未修，散落四块待修方块，小人在修路",
     "a long road from a UI mockup on the left toward a flag on the right, the final stretch of the road is broken and potholed, scattered with four blank labeled crates along the damaged part, a small character repairing the road",
     "最后一公里：逻辑 · 状态 · 接口 · 异常", "镜头沿路推进到破损段并停住", "四块方块对应四个后期标签"),
    ("S22", "第四章", "01:57.5-02:03", "5.5",
     "左侧一次性易拉宝，右侧需要长期维护的在建大楼，小车只能运走易拉宝",
     "left side a rolled-up one-off promotional banner on a stand, right side a tall multi-story building under long-term construction with scaffolding, a delivery cart only able to carry the banner",
     "绝对定位代码 ≈ 一次性活动页", "左右分屏，先看左再看右", "对比构图，保持两侧体量均衡"),
    ("S23", "第四章", "02:03-02:09", "6",
     "天平大幅倾斜：一端是沙漏与金币，另一端是一个大齿轮",
     "an oversized balance scale tilting heavily; one pan holds an hourglass and a pile of coins, the other pan holds a single large gear labeled by a blank tag",
     "自研通用方案 ≈ 1–2 人年", "天平倾斜后轻微回弹", "量级信息靠字幕，画面不要出现数字"),
    ("S24", "第四章", "02:09-02:14.5", "5.5",
     "左右两个大框：左边表格、列表页、静态页打勾，右边复杂流程图、多状态面板打叉",
     "two large panels side by side; the left panel contains a data table, a list page and a simple static page with a bold check mark; the right panel contains a tangled flow chart and a multi-state dashboard with a bold cross mark",
     "✅ 中后台 / 活动页 / 静态页　❌ 强交互 / 多状态", "左右依次弹出，勾叉带描边动画", "对勾与叉后期加，避免 AI 画错符号"),
    ("S25", "第五章", "02:14.5-02:20", "5.5",
     "设计稿、需求文档、代码仓库三个节点汇入机械脑，机械脑在真实仓库里改代码",
     "three input nodes, a sketch sheet, a document page and a repository box, all feeding with arrows into one central robot brain; below the brain, code blocks inside a repository folder are being modified with a wrench",
     "设计上下文 → 编码 Agent", "三条箭头依次点亮汇入", "趋势镜，避免出现任何厂商标识"),
    ("S26", "第五章", "02:20-02:25", "5",
     "左侧色卡、间距尺、字号标尺，右侧拼图块，两边各持一半在中间拼合",
     "on the left a color swatch fan, a spacing ruler and a font size scale; on the right a set of jigsaw puzzle pieces; the two sides each hold half and interlock perfectly in the middle",
     "设计令牌 + 组件契约 = 共同语言", "拼图从两侧合拢，接触点闪光", "术语靠字幕，画面只画形状"),
    ("S27", "第五章", "02:25-02:30", "5",
     "流水线上翻译齿轮被吊走，下游直接出成品",
     "an assembly line conveyor; a large gear representing translation is being lifted out and removed by a small crane, while finished products roll off the end of the line",
     "删掉翻译这道工序", "齿轮被吊起移出画面，镜头微微拉远", "收尾镜，最后 0.5s 留白再出片尾；本镜不要手"),
]

HEADER = ["镜号", "章节", "时间码", "时长秒", "画面中文描述", "英文生图提示词",
          "负向词", "屏幕板书文字", "运镜与动效", "备注"]

anchor_prompt = open(ANCHOR, encoding="utf-8").read().strip()

rows = [[
    "S00", "风格锚点", "参考图", "0",
    "风格锚点图（无手版 v3）：白板上一张闭合的界面线框加一小棵节点树，黑墨线为主、蓝橙仅作点缀",
    anchor_prompt, NEG + ", hand, fingers, person",
    "（无）",
    "先出这一张；通过后作为后续 27 镜的 style reference",
    "v3 已定档：黑墨线为主、无手、线条全部连续闭合",
]]

for shot, chapter, tc, dur, desc_cn, subject, board, motion, note in SHOTS:
    prompt = PREFIX + "; subject: " + subject + LINE_RULE
    # 手只在 S01 出现（其实测结论：主体里本来没有手时，一旦在提示词里提"手"，
    # 模型会把一只写实的手硬贴在画面角落——S27 首版就是这样翻车的）
    prompt += HAND_RULE if shot == "S01" else NO_HAND_RULE
    board = BOARD.get(shot, board)
    rows.append([shot, chapter, tc, dur, desc_cn, prompt, NEG, board, motion, note])

with open(OUT, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, quoting=csv.QUOTE_ALL)
    w.writerow(HEADER)
    w.writerows(rows)

# 自检
bad = [r[0] for r in rows if len(r) != len(HEADER)]
total = sum(float(r[3]) for r in rows[1:])
print("ROWS=", len(rows), "BAD_COLS=", bad)
print("TOTAL_SECONDS=", total)
print("PROMPT_LEN_MIN=", min(len(r[5]) for r in rows), "MAX=", max(len(r[5]) for r in rows))
print("SIZE_BYTES=", os.path.getsize(OUT))

# ---- 额外产出：机器可读的提示词清单（供 backend/scripts/gen-shots.ts 直接消费）----
import json

SLUGS = {
    "S00": "style-anchor", "S01": "opening-redraw", "S02": "the-gap", "S03": "title-card",
    "S04": "sheet-to-code", "S05": "skip-three-steps", "S06": "what-carries-over",
    "S07": "json-tree", "S08": "nodes-to-dsl", "S09": "dsl-printer", "S10": "absolute-position",
    "S11": "projection-flex", "S12": "regroup-structure", "S13": "semantic-naming",
    "S14": "screenshot-recognition", "S15": "floor-and-ceiling", "S16": "efficiency",
    "S17": "consistency", "S18": "iteration", "S19": "threshold", "S20": "not-one-click",
    "S21": "last-mile", "S22": "one-off-vs-longterm", "S23": "build-cost", "S24": "fit-or-not",
    "S25": "design-context-agent", "S26": "tokens-and-contracts", "S27": "remove-translation",
}

PROMPT_DIR = r"D:\code\GitHub\huobao-drama\design-as-code\prompts\shots"
os.makedirs(PROMPT_DIR, exist_ok=True)

manifest = {}
for r in rows:
    shot, prompt = r[0], r[5]
    slug = SLUGS.get(shot, "shot")
    with open(os.path.join(PROMPT_DIR, f"{shot}-{slug}.txt"), "w", encoding="utf-8") as f:
        f.write(prompt)
    manifest[shot] = prompt

with open(os.path.join(PROMPT_DIR, "shots.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print("PROMPT_FILES=", len(manifest), "->", PROMPT_DIR)
