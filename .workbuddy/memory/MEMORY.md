# CodeBuddy HUD 项目记忆

## 项目概况
- **位置**: `Q:/projects/codebuddy-hud`
- **目的**: 为 CodeBuddy Code 创建类似 claude-hud 的实时 statusline HUD 插件
- **参考项目**: jarrodwatts/claude-hud (21.9k stars, MIT)
- **技术栈**: TypeScript + Node.js, 零生产依赖
- **当前阶段**: Phase 1 MVP 完成

## 关键架构决策
- 使用 CodeBuddy StatusLine API (`statusLine` command 模式)
- stdin JSON 接收 CodeBuddy 上下文数据（model, workspace, cost 等）
- CodeBuddy 不提供上下文窗口使用量和速率限制数据（与 Claude Code 差异）
- 插件目录使用 `.codebuddy-plugin/`（优先于 `.claude-plugin/`）
- 项目级配置在 `.codebuddy/settings.json`

## 源码结构
```
src/
├── index.ts              # 主入口
├── stdin.ts              # stdin JSON 读取 (250ms首字节超时)
├── transcript.ts         # Transcript JSONL 解析 (Phase 2)
├── git.ts                # Git 状态 (分支/脏状态/ahead-behind) + 缓存
├── config.ts             # 配置加载/验证 (RecursivePartial merge)
├── cache.ts              # 通用 TTL 缓存 (Phase 2)
├── types.ts              # TypeScript 类型 + TranscriptSummary 等
├── render/
│   ├── index.ts          # 渲染入口 (多行输出)
│   ├── session-line.ts   # 会话信息行
│   ├── tools-line.ts     # 工具活动行 (Phase 2)
│   ├── agents-line.ts    # 代理状态行 (Phase 2)
│   ├── todos-line.ts     # 待办进度行 (Phase 2)
│   ├── colors.ts         # ANSI 颜色
│   └── width.ts          # CJK/emoji 宽度
└── utils/
    └── terminal.ts       # 终端宽度检测
```

## Transcript 格式 (CodeBuddy)
- JSONL 格式，每行一个 JSON 对象
- 5 种条目类型：message, function_call, function_call_result, file-history-snapshot, reasoning
- function_call 关键字段：name(工具名), callId, arguments(JSON string)
- function_call_result 关键字段：name, callId, status("completed"), output({type, text})
- Agent 调用：name="Agent"，arguments 含 description/prompt
- TaskCreate/TaskUpdate：arguments 含 subject/description/status/taskId
- message：role(user/assistant), status("completed"), content(array)

## 当前阶段
- Phase 1 MVP ✅
- Phase 2 高级功能 ✅ (transcript 解析 + 多行 HUD + 缓存)
- Phase 3 增强功能 (待实现)：配置系统完善、多布局模式、自适应、国际化
