# knocker

## 项目
旧版 Knocker（C# WinForms 托盘定时提醒，历史保留在本仓库 commit `5725397`，原工作副本 `D:\work\code\knocker-legacy`）按 ghost-in-shell-sdk v0.9.0 重做的 GhostInShell 工具。工具 id `knocker`。TypeScript + React 19，tsup 构建，Vitest 测试。远端 `https://github.com/Late1nAutumn/knocker.git`（在旧历史之上追加提交，不改写历史）。

## 架构
- `src/main/alarm.ts`：纯状态机 stopped/counting/ringing/snoozing，时钟外部传入。
- `src/main/knocker.ts`：服务层，负责计时 tick（1s）、`ctx.sound` 循环播放、`ctx.popup` / `closePopup` / `onPopupAction`、`ctx.tray`、前台检测（UI 每 5s 报告，超时 12s）。
- `src/main/settingsStore.ts`：设置以一行 JSON 存在 `settings` 表。
- `src/ui/`：单页（StatusCard 环形倒计时 + 设置卡片自动保存）；提醒时用 overlay 弹层；`Popup.tsx` 是 shell 弹窗卡片。
- `src/shared/`：channels 类型、常量、i18n（en / zh-CN）。

## 状态
- 2026-11-24：首版完成，测试 29/29 通过，typecheck、build 均正常。尚未 commit / tag / push，也未接入 shell。
- 能力请求 R-1（弹窗按钮回传 + closePopup）已由 shell 在 sdk v0.9.0 实现，工具已改为直接调用。
- 接入流程：用户同意后 push tag，把 tag 发给 shell 会话，由它添加 git tag 依赖（shell 从不用本地路径接工具）。

## 关键决策
- 不提供默认铃声：与旧版一致，由用户指定本机音频路径；不设置则静音提醒。
- 托盘只在提示文字或菜单变化时调用 `tray.set`，因为 shell 每次都会重建菜单，会关掉用户正打开的菜单。所以提示里的剩余时间按分钟显示。
- 工具在前台时不弹 shell popup，改为工具内弹层（GUIDE 7.5）。
- 设置自动保存；新的提醒间隔从下一轮倒计时起生效（与旧版一致）。
- 由 shell 负责单实例、关闭缩到托盘、退出，工具不实现。
- 不支持 `.wma`（shell 的音频格式不含它）。

## 待办
- 用户确认后：commit、打 tag `v0.1.0`、push，再把 tag 发给 shell 会话。
