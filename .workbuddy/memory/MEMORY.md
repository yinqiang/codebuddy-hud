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
├── git.ts                # Git 状态 (分支/脏状态/ahead-behind)
├── config.ts             # 配置加载/验证
├── types.ts              # TypeScript 类型
├── render/
│   ├── index.ts          # 渲染入口
│   ├── session-line.ts   # 会话信息行
│   ├── colors.ts         # ANSI 颜色
│   └── width.ts          # CJK/emoji 宽度
└── utils/
    └── terminal.ts       # 终端宽度检测
```

## Phase 2 待确认
- CodeBuddy transcript.json 格式（需获取实际文件）
- stdin JSON 是否有额外未文档化的字段
- 是否可能获取上下文窗口 token 数据
