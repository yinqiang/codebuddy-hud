# Claude HUD 项目研究报告

> 来源: https://github.com/jarrodwatts/claude-hud
> 版本: v0.0.12 (最新), 418 commits, 21.9k stars, 966 forks
> 许可: MIT
> 作者: Jarrod Watts

## 1. 项目概述

Claude HUD 是一个 Claude Code 插件，在终端 statusline 区域实时显示会话状态信息：上下文使用率、工具活动、子代理追踪、待办进度。始终在用户输入下方可见。

**核心价值**: 让开发者实时了解 AI 助手的工作状态，避免上下文溢出和资源浪费。

## 2. 核心功能

### 2.1 会话信息行
```
[Opus 4.5] │ my-project git:(main*) │ Context █████░░░░░ 45% │ Usage ██░░░░░░░░ 25% (1h 30m / 5h)
```

- **项目路径**: 当前工作目录（可配置 1-3 级目录深度）
- **模型标识**: 当前使用的模型名称 `[Opus]` / `[Sonnet]` 等
- **上下文健康度**: 可视化进度条 + 百分比，颜色随使用率变化（绿→黄→红）
- **Git 状态**: 分支名、脏状态(*)、ahead/behind 提交数
- **使用率配额**: 5h/7d 消耗百分比和重置倒计时
- **会话时长**: 运行时间

### 2.2 工具活动行
```
◐ Edit: auth.ts | ✓ Read ×3 | ✓ Grep ×2
```
- 运行中工具显示旋转指示器 + 目标文件
- 完成工具按类型聚合 + 计数

### 2.3 代理状态行
```
◐ explore [haiku]: Finding auth code (2m 15s)
```
- 代理类型、模型、描述、运行时长

### 2.4 待办进度行
```
▸ Fix authentication bug (2/5)
```
- 当前任务或完成状态 + 进度计数

## 3. 技术架构

### 3.1 数据流

```
Claude Code → stdin JSON → claude-hud → stdout → 终端显示
           ↘ transcript JSONL (工具/代理/待办追踪)
```

**关键特性**:
- 使用 Claude Code 原生 token 数据（非估算）
- 通过 transcript JSONL 解析工具/代理活动
- 约 300ms 更新周期
- 无需单独窗口或 tmux
- 任何终端均可用

### 3.2 stdin JSON 数据结构

Claude Code 通过 stdin 传递以下 JSON 结构:

```typescript
interface StdinData {
  // 工作区信息
  transcript_path: string;       // transcript 文件路径
  cwd: string;                   // 当前工作目录
  project_dir: string;           // 项目目录
  git_worktree?: string;         // git worktree 路径

  // 模型信息
  model: {
    id: string;                  // 模型标识
    display_name: string;        // 显示名称
  };

  // 上下文窗口
  context_window: {
    context_window_size: number;
    current_usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    };
  };

  // 成本追踪
  cost: {
    total_cost_usd: number;
    total_duration_ms: number;
    total_api_duration_ms: number;
    total_lines_added: number;
    total_lines_removed: number;
  };

  // 速率限制
  rate_limits: {
    five_hour: {
      used_percentage: number;
      resets_at: string;
    };
    seven_day: {
      used_percentage: number;
      resets_at: string;
    };
  };

  // 效力等级
  effort?: string | object;
}
```

### 3.3 Transcript 解析

Transcript 文件是 JSONL 格式，每行一个 JSON 对象:

```typescript
interface TranscriptLine {
  timestamp?: string;
  type?: string;        // 'assistant' | 'system' | 'custom-title' | ...
  subtype?: string;     // 'compact_boundary' | ...
  slug?: string;
  customTitle?: string;
  message?: {
    content?: ContentBlock[];
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    };
  };
  compactMetadata?: {
    trigger?: string;
    preTokens?: number;
    postTokens?: number;
    durationMs?: number;
  };
}

interface ContentBlock {
  type: string;        // 'tool_use' | 'tool_result'
  id?: string;
  name?: string;       // 工具名: Read, Write, Edit, Bash, Task, Agent, ...
  input?: Record<string, unknown>;
  tool_use_id?: string;
  is_error?: boolean;
}
```

**解析逻辑**:
1. 逐行读取 JSONL 文件
2. 提取 `tool_use` → 记录工具开始
3. 提取 `tool_result` → 标记工具完成
4. `Task`/`Agent` 工具 → 追踪子代理
5. `TodoWrite`/`TaskCreate`/`TaskUpdate` → 追踪待办
6. `assistant` 类型 → 累计 token 用量
7. `compact_boundary` → 追踪压缩边界

### 3.4 缓存机制

- 使用 SHA256 哈希 transcript 路径作为缓存文件名
- 缓存文件存储在 HUD 插件目录的 `transcript-cache/` 下
- 基于 mtime + size 判断是否需要重新解析
- 缓存版本号 (v3) 用于失效处理

## 4. 源码结构

```
claude-hud/
├── .claude-plugin/
│   ├── plugin.json          # 插件清单
│   └── marketplace.json     # 市场清单
├── commands/                # 命令实现
│   ├── setup.md             # /claude-hud:setup 命令
│   └── configure.md         # /claude-hud:configure 命令
├── src/
│   ├── index.ts             # 主入口: 读取 stdin → 解析 transcript → 渲染
│   ├── stdin.ts             # stdin JSON 读取 (250ms首字节超时, 30ms空闲超时)
│   ├── transcript.ts        # JSONL 解析 (工具/代理/待办/token)
│   ├── config.ts            # 配置管理 (默认值/验证/合并/迁移)
│   ├── config-reader.ts     # 配置文件计数 (CLAUDE.md/rules/MCPs/hooks)
│   ├── claude-config-dir.ts # 配置目录处理
│   ├── constants.ts         # 常量定义
│   ├── types.ts             # TypeScript 类型定义
│   ├── cost.ts              # 成本计算
│   ├── memory.ts            # 内存使用追踪
│   ├── context-cache.ts     # 上下文缓存
│   ├── effort.ts            # 效力等级解析
│   ├── speed-tracker.ts     # 输出速度追踪
│   ├── git.ts               # Git 状态获取 (分支/脏状态/差异/ahead-behind)
│   ├── external-usage.ts    # 外部使用率快照
│   ├── extra-cmd.ts         # 额外命令处理
│   ├── debug.ts             # 调试工具
│   ├── version.ts           # 版本管理
│   ├── i18n/                # 国际化 (en/zh)
│   ├── render/              # 渲染模块
│   │   ├── index.ts         # 渲染主入口 (compact/expanded 布局)
│   │   ├── session-line.ts  # 会话信息行渲染
│   │   ├── tools-line.ts    # 工具活动行渲染
│   │   ├── agents-line.ts   # 代理状态行渲染
│   │   ├── todos-line.ts    # 待办进度行渲染
│   │   ├── colors.ts        # 颜色管理
│   │   ├── width.ts         # 字符宽度计算 (CJK/emoji)
│   │   ├── format-reset-time.ts  # 重置时间格式化
│   │   └── lines/           # 子行渲染模块
│   │       ├── cost.ts
│   │       ├── prompt-cache.ts
│   │       ├── identity.ts
│   │       ├── project.ts
│   │       ├── added-dirs.ts
│   │       ├── git-files.ts
│   │       ├── environment.ts
│   │       ├── memory.ts
│   │       ├── session-tokens.ts
│   │       └── index.ts
│   └── utils/
│       └── terminal.ts      # 终端宽度检测
├── tests/                   # 测试文件
├── dist/                    # 编译输出
├── package.json             # NPM 包配置 (零生产依赖!)
└── tsconfig.json            # TypeScript 配置
```

## 5. 配置系统

### 5.1 默认配置

```json
{
  "language": "en",
  "lineLayout": "expanded",
  "showSeparators": false,
  "pathLevels": 1,
  "maxWidth": null,
  "forceMaxWidth": false,
  "elementOrder": ["project", "addedDirs", "context", "usage", "promptCache", "memory", "environment", "tools", "agents", "todos"],

  "gitStatus": {
    "enabled": true,
    "showDirty": true,
    "showAheadBehind": false,
    "showFileStats": false,
    "branchOverflow": "truncate",
    "pushWarningThreshold": 0,
    "pushCriticalThreshold": 0
  },

  "display": {
    "showModel": true,
    "showProject": true,
    "showAddedDirs": true,
    "addedDirsLayout": "inline",
    "showContextBar": true,
    "contextValue": "percent",
    "showConfigCounts": false,
    "showCost": false,
    "showDuration": false,
    "showSpeed": false,
    "showTokenBreakdown": true,
    "showUsage": true,
    "usageBarEnabled": true,
    "showResetLabel": true,
    "usageCompact": false,
    "showTools": false,
    "showAgents": false,
    "showTodos": false,
    "showSessionName": false,
    "showClaudeCodeVersion": false,
    "showEffortLevel": false,
    "showMemoryUsage": false,
    "showPromptCache": false,
    "promptCacheTtlSeconds": 300,
    "showSessionTokens": false,
    "showOutputStyle": false,
    "mergeGroups": [["context", "usage"]],
    "autocompactBuffer": "enabled",
    "contextWarningThreshold": 70,
    "contextCriticalThreshold": 85,
    "usageThreshold": 0,
    "sevenDayThreshold": 80,
    "environmentThreshold": 0,
    "externalUsagePath": "",
    "externalUsageFreshnessMs": 300000,
    "modelFormat": "full",
    "modelOverride": "",
    "customLine": "",
    "timeFormat": "relative"
  },

  "colors": {
    "context": "green",
    "usage": "brightBlue",
    "warning": "yellow",
    "usageWarning": "brightMagenta",
    "critical": "red",
    "model": "cyan",
    "project": "yellow",
    "git": "magenta",
    "gitBranch": "cyan",
    "label": "dim",
    "custom": 208
  }
}
```

### 5.2 配置选项分类

| 分类 | 选项 | 说明 |
|------|------|------|
| 布局 | `lineLayout` | `expanded` 多行 / `compact` 单行 |
| 路径 | `pathLevels` | 目录深度 1-3 |
| 上下文 | `contextValue` | `percent` / `tokens` / `remaining` / `both` |
| Git | `showDirty`, `showAheadBehind`, `showFileStats` | Git 状态显示 |
| 代理 | `showAgents`, `showTools`, `showTodos` | 活动行显示 |
| 颜色 | `colors.*` | 8 种预设色 / 256色 / hex |
| 高级 | `elementOrder`, `mergeGroups` | 元素排列和分组 |

### 5.3 配置预设

| 预设 | 内容 |
|------|------|
| Full | 所有功能：工具、代理、待办、Git、使用率、时长 |
| Essential | 活动行 + Git 状态，最少干扰 |
| Minimal | 核心：模型名 + 上下文条 |

## 6. 插件系统

### 6.1 plugin.json
```json
{
  "name": "claude-hud",
  "description": "Real-time statusline HUD for Claude Code",
  "version": "0.1.0",
  "author": { "name": "Jarrod Watts", "url": "https://github.com/jarrodwatts" },
  "commands": ["./commands/setup.md", "./commands/configure.md"],
  "homepage": "https://github.com/jarrodwatts/claude-hud",
  "license": "MIT"
}
```

### 6.2 安装方式
```bash
/plugin marketplace add jarrodwatts/claude-hud
/plugin install claude-hud
/claude-hud:setup
```

### 6.3 运行时机制
- Claude Code 将 statusline 脚本作为子进程运行
- 通过 stdin 传入 JSON 数据
- 脚本 stdout 输出第一行作为 statusline 内容
- 每 300ms 更新一次
- 支持 ANSI 颜色码

## 7. 关键技术亮点

### 7.1 零生产依赖
package.json 中无任何生产依赖，只有 TypeScript 和 c8 作为 devDependencies。

### 7.2 CJK/Emoji 宽度处理
使用 `Intl.Segmenter` 进行 grapheme 分割，正确处理 CJK 字符和 emoji 的终端显示宽度。

### 7.3 自适应布局
- 自动检测终端宽度
- 当内容超宽时，按 separator 分割换行
- 支持 `truncate` 和 `wrap` 两种溢出模式

### 7.4 Transcript 缓存
- SHA256 路径哈希作为缓存键
- 基于 mtime + size 判断缓存有效性
- 避免每次 300ms 更新都全量解析

### 7.5 上下文压缩感知
追踪 `compact_boundary` 事件，区分合法的 post-compact 零值和临时 stdin 故障。

### 7.6 国际化
支持 `en` 和 `zh` 两种语言，通过 `language` 配置切换。
