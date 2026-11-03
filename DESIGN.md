---
name: 书签管理器
description: 以目录、列表和检查依据组织紧凑的桌面整理工作台。
colors:
  primary: '#3e63dd'
  primary-hover: '#3358d4'
  primary-text: '#3a5bc7'
  primary-selection: '#edf2fe'
  primary-subtle: '#f7f9ff'
  surface: white
  sidebar: '#f9f9fb'
  hover: '#f0f0f3'
  divider: '#e0e1e6'
  text: '#1c2024'
  muted: '#60646c'
  success: '#218358'
  warning: '#ab6400'
  attention: '#cc4e00'
  danger: '#ce2c31'
  dark-surface: '#111113'
  dark-sidebar: '#18191b'
  dark-hover: '#212225'
  dark-divider: '#2e3135'
  dark-text: '#edeef0'
  dark-muted: '#b0b4ba'
  dark-primary-text: '#9eb1ff'
  dark-primary-selection: '#182449'
  unsaved: '#4f3422'
  dark-unsaved: '#ffe7b3'
typography:
  headline:
    fontFamily: '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 24px
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: -0.025em
  title:
    fontFamily: '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 13px
    fontWeight: 500
  caption:
    fontFamily: '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  detail-body:
    fontFamily: '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.8
rounded:
  badge: 3px
  control: 4px
  navigation: 6px
  panel: 8px
  dialog: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  section: 24px
  page: 32px
  workspace: 24px
  compact: 16px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.surface}'
    rounded: '{rounded.control}'
    padding: 0 12px
    height: 32px
  button-soft:
    backgroundColor: '#0047f112'
    textColor: '#002bb7c5'
    rounded: '{rounded.control}'
    padding: 0 12px
    height: 32px
  button-ghost:
    textColor: '#0007149f'
    rounded: '{rounded.control}'
    padding: 4px 8px
  input:
    rounded: '{rounded.control}'
    height: 32px
    textColor: '{colors.text}'
  navigation-selected:
    backgroundColor: '{colors.primary-selection}'
    textColor: '{colors.primary-text}'
    rounded: '{rounded.navigation}'
    padding: 8px 12px
  status-chip:
    rounded: '{rounded.badge}'
    padding: 2px 6px
  preview-panel:
    backgroundColor: '{colors.sidebar}'
    rounded: '{rounded.panel}'
    padding: 24px
---

# Design System: 书签管理器

## Overview

**Creative North Star: "书签整理工作台"**

界面围绕目录、书签列表与检查依据展开。冷灰侧栏与内容面形成稳定层级，靛蓝只承担主操作、当前选择和建议结果；紧凑排版让用户连续比较、确认并应用变更。

使用实际 Radix Themes 3.3.0，主题配置为 Indigo、Slate、medium 圆角和 100% 缩放。系统中文字体服务于 Windows 桌面阅读，浅色和深色保留相同的信息顺序。这里记录交互原型的视觉系统；真实业务实现状态以 PRODUCT.md 与原型说明为准。

**Key Characteristics:**

- 目录、列表、详情形成连续工作区。
- 细分隔线、浅色块和紧凑行距组织内容。
- 颜色、文字与操作依据共同表达状态。
- 桌面窗口自由缩放，滚动区与固定操作区保持明确分工。

## Colors

主色为克制的靛蓝，中性色采用偏冷的 Slate。前置 token 是当前 sRGB 实值；运行时仍使用 Radix 变量及其深色、广色域适配，不另建一套替代色板。

### Primary

`primary` 对应 `--accent-9`，主按钮悬停使用 `--accent-10`；`primary-text` 对应 `--accent-11`。导航选择使用 `--accent-3`，列表当前行使用 `--accent-2`，悬停后升为 `--accent-3`。Radix soft 控件使用透明的 `--accent-a3` 与 `--accent-a11`，不与不透明的选择底色混用。

### Neutral

`surface` 对应 `--color-background`；`sidebar`、`hover`、`divider`、`text`、`muted` 分别对应 Slate 的 2、3、5、12、11 级。深色以同名 `dark-` token 表达这些角色，主实色仍由 Radix Indigo 9 提供。详情面使用 `--gray-1`，输入框保留 Radix surface 与 alpha 描边；占位提示使用 `--gray-11` 且不降低透明度。未保存文字使用 `--amber-12`，对应 `unsaved` 与 `dark-unsaved`。

`success`、`warning`、`attention`、`danger` 是浅色状态文字，对应 Green、Amber、Orange、Red 的 11 级；深色及标签底色直接使用相应 Radix 主题变量。青、紫、粉等颜色只出现在站点字母头像等身份提示中，不构成额外品牌主色。

**The 语义优先 Rule.** 靛蓝表示操作与选择；绿色、琥珀色、橙色、红色分别表达通过、跳转、需关注与失效。状态必须保留文字，未检查使用灰色。

## Typography

标题与正文共用前置 token 中的系统字体栈，无独立展示字体。页面标题使用 `headline`，工作区标题略收为 23px；区块标题使用 `title`，正文基准使用 `body`。表单标签与列表标题以 13px、500 字重保持密度；地址、路径、详情标签及底部状态文字使用 12px，详情字段内容使用 `detail-body` 的 13px。说明正文通常为 12–13px。数字计数使用等宽数字特性。

列表标题与地址可单行省略，详情和变更预览中的完整地址必须可换行。主要信息不应因辅助文字缩小而失去可读性。

## Layout

仅面向桌面端，应用壳占满当前窗口，不设置窗口最小宽高。顶部栏默认高 62px，窗口高度不超过 620px 时收为 52px；底部状态栏最小高 31px。左侧目录栏宽度随窗口在 164–216px 间变化，展开的详情栏在 224–292px 间变化。

工作区标题、搜索、选择操作与书签表格位于同一个可滚动区域（`list-scroll`），列表底部计数和详情入口（`list-bottom`）固定在该区域之外，最小高 40px。目录树和展开的详情内容各自滚动。工作区水平内边距为 24px，紧凑列表收为 16px；通用内容页最大宽 1250px，内边距为 `28px clamp(16px, 2.2vw, 32px) 32px`。

| 条件 | 实际适配 |
| --- | --- |
| 主内容容器宽度 ≤850px | 隐藏详情栏，底部“查看详情”打开弹窗；导入预览移到下方，AI 目录树与明细改为上下排列。 |
| 书签列表容器宽度 ≤680px | 隐藏目录列，标题、搜索、选择区和列表底部的水平边距收为 16px。 |
| 窗口高度 ≤620px | 压缩顶部栏与工作区标题间距，隐藏工作区标题说明。 |
| 窗口宽度 ≤1100px | 精简底部辅助说明与文件夹计数，保留关键状态。 |

宽窗口可使用底部入口收起或重新展开详情。以上宽度条件区分内容容器与整个窗口，不作为最小窗口限制。工具栏与表单按可用空间换行；具体窗口验证样本记录在原型说明和 surface brief 中。

导航行最小高 38px，目录行最小高 32px，表头高 39px，书签行高 62px。重复间距沿用前置 spacing，局部 10px、20px 等值服从现有紧凑组合，不强行归一。

## Elevation & Depth

常驻内容主要以 Slate 底色和 1px 分隔线分层。菜单、选择器和弹窗沿用 Radix 的浮层阴影；弹窗使用 `--shadow-6`，菜单使用 `--shadow-5`。底部通知的实际阴影为 `0 8px 30px rgba(0, 0, 0, .16)`。这些完整值及动态规则保存在 sidecar。

**The 平面优先 Rule.** 常驻区域以底色和细边界分层，浮层阴影只说明菜单、弹窗与通知的遮挡关系。

## Shapes

medium 主题下，标准按钮和输入框圆角为 control，导航为 navigation，预览面与重复分组为 panel，常规弹窗为 dialog。小状态标签使用 badge。细边界先于阴影区分容器；头像采用小圆角方形，状态点采用圆形。

图标使用 Radix SVG 与源码中的文件夹 SVG；站点和浏览器字母是身份占位头像。此视觉系统不依赖外部栅格图片。

## Components

按钮保留 Radix solid、soft、ghost 三种常用变体：solid 承担主要确认，soft 用于辅助动作，ghost 用于轻量操作与工具图标。标准 size 2 高 32px，字级 14px；默认与悬停、按下、禁用状态沿用组件库。自定义按钮和链接的键盘焦点使用 2px 靛蓝外轮廓与 3px 偏移。

输入框使用 Radix surface 变体，保留可见标签、辅助说明、焦点边界与错误提示。导航选中态同时使用靛蓝底色、文字和字重。状态标签使用 soft 背景、文字与小圆点，保持明确状态名。

左侧“写回浏览器”和“导出 HTML”使用各自明确的文字与图标，不合并为“输出”。报告作为完成后的结果页，不占常驻导航。备份路径以可换行的只读面板展示，复用 Slate 2 底色、Slate 5 边界和 8px 圆角；不显示文件选择或目录设置控件。

“新建”只包含添加书签与新建文件夹；来源目录旁的“目录操作”集中放置新建文件夹、合并文件夹和清理空文件夹。目录行在悬停或键盘焦点进入时显示更多按钮，同时保留右键菜单。

预览容器使用细边界与冷灰底色。地址修复默认不选中，原地址与建议地址可分别打开；跳转状态、响应与跳转链明确标为演示证据，内容一致性仍由用户人工核对。勾选确认行后才纳入应用，标题与图标建议独立分组。弹窗内容可滚动，底部操作区独立。

AI 目录整理先展示涉及移动的目标目录树，计数为“已选 / 建议移入”。用户可按目录批量选择或逐条选择；点击有直接建议的目标目录查看对应明细，每条建议可展开分类依据。未涉及的目录保持原样。

任务完成或取消后，仅在书签工作区与检查结果页显示简短状态，不再显示进度条；其他页面不保留该状态条占位。进行中和暂停状态继续使用任务进度与操作入口。

动态仅辅助状态变化：来源选择的颜色过渡为 160ms，通知进入为 160ms，工作指示点以 1.3s 呼吸变化。遵循 `prefers-reduced-motion`，关闭动画和过渡。Radix 浮层保留其原生开启、关闭与焦点管理。

## Do's and Don'ts

### Do:

- Do 使用真实 Radix 控件及其主题变量，保留键盘焦点与禁用状态。
- Do 在预览中并列呈现原值、依据和建议结果，长地址允许换行。
- Do 维持深浅主题的角色对应，按内容容器空间切换详情栏与详情弹窗，保留固定的底部操作入口。

### Don't:

- Don't 引入 Material 3 作为第二套组件外观。
- Don't 将语义状态色用于无关装饰，或仅用颜色表示检查结果。
- Don't 把原型的固定演示结果描述成已接通浏览器、网络或 AI 服务。
