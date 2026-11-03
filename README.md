# 书签管理器

按需导入、整理、检查和清理浏览器书签的桌面工具，Windows 优先，面向 1 万条以内书签。支持范围规划为 Chrome、Edge、Firefox 直接读取与备份后覆盖写回，以及 HTML 导入导出。目前仅完成工程初始化，业务功能仍待实现。

## 技术栈

- Go + Wails v3.1.0
- React + TypeScript + Vite
- Radix Themes + CSS
- pnpm 12.16.1

采用 Wails 官方 React 模板，移除了问候服务、时钟事件和模板演示页面；当前窗口仅显示应用名称。沿用官方生成的构建资源与任务，应用图标暂用模板占位图。

## 开发环境

需要 Go 1.26 或更新版本、Node.js 22.12 或更新版本、pnpm 12.16.1。Windows 需要 WebView2 Runtime。

安装固定版本的 Wails CLI：

```powershell
go install github.com/wailsapp/wails/v3/cmd/wails3@v3.1.0
wails3 doctor
```

确保 Go 的 bin 目录在 PATH 中。在仓库根目录运行：

```powershell
pnpm --dir frontend install --frozen-lockfile
wails3 dev
```

开发模式会启动 Go 桌面应用与 Vite 服务，默认端口为 9245。Wails 任务默认使用 pnpm。

## 验证与构建

```powershell
pnpm --dir frontend typecheck
pnpm --dir frontend build
go vet ./...
go test ./...
wails3 build
```

Go 通过 embed 嵌入 frontend/dist，因此首次执行 Go 检查前需要先构建前端。当前没有业务测试，go test 仅验证现有包能够编译。

Windows 可执行文件输出到 bin/bookmarks-manager.exe。其他平台的模板构建配置保留，需在对应环境中验证；安装包与签名尚未配置。

## 目录

```text
main.go             Wails 应用与窗口入口
go.mod / go.sum     Go 依赖与校验
Taskfile.yml        开发、构建任务入口
build/              Wails 平台构建资源及配置
frontend/           React、Radix Themes 与 Vite 工程
docs/               功能规划文档
```

[功能清单](docs/书签管理器功能文档.md)记录多轮讨论确认的范围与边界；[新版开发计划](docs/新版开发计划.md)给出 P0、P1、P2 顺序、技术依赖与验收要求。每次启动建立新整理会话，配置和页面分析缓存保存在 AppData。[交互原型](原型/index.html)使用实际 React 与 Radix Themes 组件，可离线打开；源码和使用说明见[原型目录](原型/README.md)。

框架参考：[Wails](https://github.com/wailsapp/wails)、[Radix Themes](https://www.radix-ui.com/themes/docs/overview/getting-started)。
