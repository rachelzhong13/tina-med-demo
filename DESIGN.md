---
name: TINA Medicine Exhibition
description: A QR-first exhibit label that makes one synthetic sample legible and keeps TINA one tap away.
colors:
  clinical-accent: "#08788e"
  clinical-ink: "#102e39"
  clinical-paper: "#f9fcfc"
  clinical-field: "#dce9eb"
  companion-accent: "#527d5b"
  companion-ink: "#22372c"
  companion-paper: "#f7f4e9"
  companion-field: "#dce8d1"
  editorial-accent: "#d3392e"
  editorial-ink: "#171717"
  editorial-paper: "#f7f5ee"
  editorial-signal: "#f1d43b"
  demo-warning: "#f3df9e"
  focus: "#0b78d0"
typography:
  display:
    fontFamily: "Aptos, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 6rem)"
    fontWeight: 820
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Aptos, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "clamp(1.45rem, 2.8vw, 2.3rem)"
    fontWeight: 790
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Aptos, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Aptos, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  editorial: "2px"
  control: "12px"
  companion: "16px"
  assistant: "18px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "76px"
components:
  demo-chip:
    backgroundColor: "{colors.demo-warning}"
    textColor: "{colors.clinical-ink}"
    rounded: "999px"
    padding: "6px 10px"
  assistant-send:
    backgroundColor: "{colors.companion-accent}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 14px"
  assistant-input:
    backgroundColor: "#ffffff"
    textColor: "{colors.companion-ink}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 12px"
  companion-care:
    backgroundColor: "#315d43"
    textColor: "#f8faf4"
    rounded: "{rounded.companion}"
    padding: "42px"
  demo-strip:
    backgroundColor: "{colors.demo-warning}"
    textColor: "#4f3d0b"
    padding: "18px 22px"
---

# Design System: TINA Medicine Exhibition

## Overview

**Creative North Star: “会说话的展品标签”**

TINA 的页面首先是一张与实物样品绑定的博物馆式标签，其次才是一个带问答能力的界面。视觉必须让访客在站立、单手和短暂停留的场景中，先认出样品、看到 Demo 边界，再决定是否通过小水滴继续提问。

系统用三种真实的药品信息载体表达同一组事实：临床记录的精确、护理卡片的陪伴和药盒编辑设计的张力。三者共享内容语义、触控尺度、Demo 信号和小水滴行为，但在构图、字号、留白、圆角与信息展开方式上保持明显差异。反例是通用 AI 仪表盘、发光渐变按钮和多个聊天入口。

**Key Characteristics:**

- 扫码后立即呈现一个样品，不出现选择首页或二次扫码模块。
- 大标题、包装模型和关键事实共同构成首屏，问答入口固定为右下角小水滴。
- 三套方案共用数据和组件逻辑，通过配置改变信息架构与视觉语法。
- Demo 身份是持续可见的安全边界，不是页脚里的附注。

## Colors

配色取自临床纸张、植物护理包装与药品编辑标签；每个方向只有一个主强调色，Demo 黄色跨方向保持稳定语义。

### Primary

- **临床青蓝**：用于 Clinical Precision 的顶部规则、焦点区域与结构强调，表达可核对的资料感。
- **陪伴植绿**：用于 TINA Companion 的护理面、问答按钮与温和状态反馈。
- **编辑朱红**：用于 Pharmaceutical Editorial 的药盒边、警告面和强节奏构图。

### Secondary

- **Demo 信号黄**：只标记虚构、不可服用和资料边界；它不承担普通装饰或主要操作。

### Neutral

- **冷白临床纸**：承载精确信息和细分隔线。
- **暖白护理纸**：承载较长叙述和柔和分组。
- **墨黑编辑纸**：建立药盒目录感，并与红、黄形成高对比。

**The Demo Signal Rule.** 黄色始终意味着“这是虚构展品资料”，不得被复用为普通选中态或促销色。

## Typography

**Display Font:** Aptos，中文回退至 PingFang SC / Microsoft YaHei  
**Body Font:** Aptos，中文回退至 PingFang SC / Microsoft YaHei

**Character:** 字体栈优先保证展会设备上的快速加载和中文覆盖，个性来自紧凑的大标题、标签式细字与方案特有的排版，而不是远程字体依赖。

### Hierarchy

- **Display**：只用于样品名称和设计评审主标题；手机允许主动换行，桌面控制在约 8–10 个汉字宽。
- **Headline**：用于资料区标题，通过明显的上下留白建立阅读段落。
- **Body**：移动端基准不小于 16px，行高保持 1.7 左右，长文桌面宽度限制在约 72ch。
- **Label**：用于字段名、Demo 状态和追溯标签；小字号必须保持足够字重与对比度。

**The Identity First Rule.** 样品名永远是首个 H1；“AI”“Agent”或装饰性眉题不得抢在它之前。

## Layout

内容最大宽度为 1200px，桌面首屏由样品身份和数据生成的包装模型组成两栏。900px 以下改为单栏，720px 以下采用 18–24px 自适应边距、纵向事实列表和更紧凑的展品模型。Clinical 使用十二列资料编排，Companion 使用窄幅纵向叙事，Editorial 使用带边线的双栏目录；三者在手机上都回到同一条自然滚动轴。

页面以 8px 为基础节奏，区块间距使用 24、48、76px 等级。固定的小水滴避开刘海与手势安全区，正文底部预留空间；320px、现代手机宽度、横屏和桌面都不得出现水平滚动。

**The QR Arrival Rule.** 路径从 `/medicine/:id` 开始，首屏直接回答“这是什么”；任何列表首页、扫码按钮或中间导航都不属于该布局系统。

## Elevation & Depth

系统以平面分区为主，阴影只用于确实悬浮的对象：包装模型、Companion 首屏和小水滴面板。Clinical 依靠边线和冷色面分层；Editorial 允许红色硬投影作为印刷错版语汇，但普通内容卡不使用硬阴影。

### Shadow Vocabulary

- **包装悬浮**：柔和的右下偏移阴影，让数据生成的纸盒与背景分离。
- **陪伴面板**：宽而低对比的环境阴影，仅用于圆角主容器。
- **问答面板**：最强的悬浮层级，必须保持与页面内容的清楚边界。

**The Flat Information Rule.** 普通资料靠留白、规则线和色面分组；不要把每段文字塞进同尺寸卡片。

## Shapes

Clinical 以直角和细线为主；Companion 使用 14–16px 的克制圆角；Editorial 使用 2–4px 近直角。胶囊、片剂和条袋形状只出现在包装模型中，服务于剂型识别，不作为无意义装饰。小水滴插画保留自身柔和轮廓，外层裁切只用于在 68–76px 入口内提高可读性。

## Components

### Demo Chip

小型胶囊形标签固定写明“虚构展品 · 不可服用”。它在首屏与横向 Demo strip 形成双重安全提示，不能关闭。

### Exhibit Sections

同一 `ExhibitSection` 根据配置呈现事实网格、叙事、步骤、警告或原生 `details` 追溯档案。标题、字段顺序和交互角色来自 JSON 配置，医学领域事实不得进入 UI 配置。

### Product Visual

`ProductVisual` 从样品名、剂型、规格和 ID 生成展品模型。它是明确的合成视觉，不伪装成真实药盒照片，也不新增未经提供的品牌或批准信息。

### Water-drop Assistant

`water-drop-icon.png` 是仓库原有、由项目方提供的识别资产；本轮不替换源图，只通过 CSS 裁切提高小尺寸可读性。小水滴按钮是唯一的 Agent 入口，保留 Shadow DOM、点击、拖动、会话上下文、Esc 关闭和安全区定位。状态包括 idle、hover、pressed、dragging、opening、thinking、answering、success、error 与 sleep；动画必须表达状态，并在减少动态偏好下停用。

### Inputs and Buttons

问答输入框与发送按钮高度为 48px，关闭按钮为 44px。输入框拥有可见标签、清晰焦点和错误恢复文案；异步发送期间按钮禁用，结果通过文字与状态共同反馈，不能只靠颜色。

## Do's and Don'ts

### Do:

- **Do** 让样品身份、关键事实与 Demo 边界在几秒内可见。
- **Do** 用 `exhibit-ui.json` 管理方案、顺序、可见性和呈现角色，并保持药品事实独立。
- **Do** 在 320px、现代手机、横屏和桌面共同验证触控、换行、安全区与 200% 文本缩放。
- **Do** 让网络或 LLM 失败只影响问答，不影响样品资料阅读。
- **Do** 保留小水滴作为唯一入口，并让它的每个交互状态有明确反馈。

### Don't:

- **Don't** 添加药品选择首页、页面内扫码器、独立聊天页或第二个 Agent 按钮。
- **Don't** 把三套方案复制成三份详情页，或只通过换色制造“不同方案”。
- **Don't** 用真实医疗口吻包装 Demo 内容，或编造药效、批准文号、品牌和照片。
- **Don't** 用通用 AI 渐变、玻璃卡片、emoji 图标或无意义弹跳削弱展品标签的可信感。
- **Don't** 修改、拉伸或重新生成项目方提供的小水滴源图；新裁切必须保持角色可辨认。
