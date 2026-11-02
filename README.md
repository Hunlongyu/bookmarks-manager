# 书签管理器

本地优先的桌面书签管理与清理工具。目前仅完成工程初始化，未实现书签导入、编辑、检测、浏览器同步或 AI 功能。

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

[功能规划](docs/书签管理器功能文档.md)用于后续选择开发范围，不表示相关功能已经实现。

框架参考：[Wails](https://github.com/wailsapp/wails)、[Radix Themes](https://www.radix-ui.com/themes/docs/overview/getting-started)。
