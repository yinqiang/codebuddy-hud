# CodeBuddy HUD 设计方案

> 基于 claude-hud 项目研究和 CodeBuddy StatusLine API 分析

## 1. 项目定位

为 CodeBuddy Code 创建一个类似 claude-hud 的实时状态栏插件，显示会话上下文信息，帮助开发者实时监控 AI 助手工作状态。

**项目名称**: codebuddy-hud
**技术栈**: TypeScript + Node.js（与 claude-hud 一致）
**运行方式**: CodeBuddy Code StatusLine command

## 2. 功能规划

### 2.1 Phase 1: MVP（核心功能）

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 模型标识 | P0 | `[GLM-5.1]` 模型徽章 |
| 项目路径 | P0 | 当前项目目录名 |
| Git 状态 | P0 | 分支名 + 脏状态标记 |
| 会话时长 | P0 | 运行时间 |
| 成本追踪 | P1 | API 调用成本 |
| 代码统计 | P1 | +N/-N 行变更 |

**MVP 效果**:
```
[GLM-5.1] │ codebuddy-hud git:(main*) │ ⏱ 5m │ 💰 $0.0023 │ +156 -23
```

### 2.2 Phase 2: 高级功能

| 功能 | 优先级 | 说明 |
|------|--------|------|
| Transcript 解析 | P0 | 解析 transcript.json 追踪工具活动 |
| 工具活动行 | P1 | 实时显示正在执行的工具 |
| 代理状态行 | P1 | 子代理运行状态 |
| 待办进度行 | P1 | 任务完成进度 |
| 上下文健康度 | P2 | Token 使用量可视化（如 API 提供） |

**Phase 2 效果**:
```
[GLM-5.1] │ codebuddy-hud git:(main*) │ ⏱ 5m │ 💰 $0.0023
◐ Edit: statusline.ts | ✓ Read ×3 | ✓ Grep ×2
▸ Fix authentication bug (2/5)
```

### 2.3 Phase 3: 增强功能

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 配置系统 | P1 | JSON 配置 + 预设 |
| 多布局模式 | P2 | compact / expanded |
| 自定义颜色 | P2 | 主题/颜色配置 |
| 国际化 | P2 | 中文/英文 |
| 速度追踪 | P3 | 输出 token 速度 |
| 内存使用 | P3 | 系统 RAM 使用 |

## 3. 架构设计

### 3.1 整体架构

```
CodeBuddy Code
    │
    ├─ stdin JSON ──→ codebuddy-hud (Node.js)
    │                    │
    │                    ├─ stdin reader     ← 读取/解析 stdin JSON
    │                    ├─ transcript parser ← 解析 transcript.json
    │                    ├─ git status       ← 获取 Git 状态
    │                    ├─ config loader    ← 加载配置
    │                    ├─ cost calculator  ← 计算成本
    │                    └─ renderer         ← 组装输出行
    │                         │
    │                         └─ stdout ──→ CodeBuddy StatusLine
    │
    └─ transcript.json ─→ (文件系统读取)
```

### 3.2 目录结构

```
codebuddy-hud/
├── .codebuddy-plugin/
│   └── plugin.json          # 插件清单
├── commands/
│   └── setup.md             # /codebuddy-hud:setup 命令
├── src/
│   ├── index.ts             # 主入口
│   ├── stdin.ts             # stdin JSON 读取
│   ├── transcript.ts        # transcript JSONL 解析
│   ├── config.ts            # 配置管理
│   ├── git.ts               # Git 状态获取
│   ├── cost.ts              # 成本计算
│   ├── types.ts             # TypeScript 类型
│   ├── constants.ts         # 常量
│   ├── render/
│   │   ├── index.ts         # 渲染主入口
│   │   ├── session-line.ts  # 会话信息行
│   │   ├── tools-line.ts    # 工具活动行
│   │   ├── agents-line.ts   # 代理状态行
│   │   ├── todos-line.ts    # 待办进度行
│   │   ├── colors.ts        # 颜色管理
│   │   └── width.ts         # CJK/emoji 宽度计算
│   └── utils/
│       └── terminal.ts      # 终端宽度检测
├── dist/                    # 编译输出
├── tests/                   # 测试
├── package.json
└── tsconfig.json
```

### 3.3 数据流

1. CodeBuddy Code 每 300ms 通过 stdin 传入 JSON 数据
2. `stdin.ts` 读取并解析 JSON（250ms 首字节超时，30ms 空闲超时）
3. `transcript.ts` 解析 transcript JSONL 获取工具/代理/待办信息
4. `git.ts` 获取 Git 状态
5. `config.ts` 加载用户配置
6. `render/` 组装输出行
7. 通过 stdout 输出

## 4. CodeBuddy vs Claude: API 差异与适配

### 4.1 stdin 数据差异

| 数据 | Claude Code | CodeBuddy Code | 适配方案 |
|------|-------------|----------------|----------|
| 上下文窗口使用量 | ✅ 原生提供 | ❌ 未提供 | 暂不可用，未来可通过 transcript 估算 |
| 速率限制 | ✅ 订阅者可用 | ❌ 未提供 | 暂不可用 |
| 模型信息 | `model.id` + `model.display_name` | `model.id` + `model.display_name` | 直接使用 |
| 工作区 | `cwd` + `project_dir` | `workspace.current_dir` + `workspace.project_dir` | 字段映射 |
| 成本 | `cost.*` | `cost.*` | 直接使用 |
| transcript 路径 | `transcript_path` | `transcript_path` | 直接使用 |
| 版本 | 无 | `version` | 可显示 |

### 4.2 Transcript 格式适配

CodeBuddy Code 的 transcript.json 可能格式与 Claude Code 不同，需要:
1. 实际获取一个 transcript.json 文件分析其格式
2. 适配解析逻辑
3. 处理字段差异

### 4.3 插件系统差异

| 特性 | Claude Code | CodeBuddy Code |
|------|-------------|----------------|
| 元数据目录 | `.claude-plugin/` | `.codebuddy-plugin/`（优先）|
| 环境变量 | `${CLAUDE_PLUGIN_ROOT}` | `${CODEBUDDY_PLUGIN_ROOT}` |
| 兼容性 | - | 兼容 `.claude-plugin/` |

## 5. 技术决策

### 5.1 为什么选择 TypeScript + Node.js

1. **与 claude-hud 一致**: 方便移植和参考
2. **零生产依赖**: claude-hud 的设计理念，只依赖 Node.js 内置 API
3. **类型安全**: TypeScript 提供编译时检查
4. **性能**: Node.js 启动快，满足 300ms 更新周期

### 5.2 为什么不直接 fork claude-hud

1. stdin 数据结构不同，需要适配
2. Transcript 格式可能不同
3. 速率限制/上下文窗口数据不可用
4. 插件目录命名不同
5. 可以参考但需要重新实现

### 5.3 实现语言选择

| 选项 | 优点 | 缺点 |
|------|------|------|
| TypeScript (推荐) | 类型安全、与 claude-hud 一致、可移植 | 需要 build 步骤 |
| Bash | 零依赖、简单 | 复杂逻辑难维护、CJK 处理困难 |
| Python | 易读、库丰富 | 启动慢、依赖管理 |

## 6. 实施计划

### Phase 1 (MVP) - 预计 1-2 天

1. **项目初始化**
   - 创建项目结构
   - 配置 TypeScript + package.json
   - 编写 `.codebuddy-plugin/plugin.json`

2. **核心实现**
   - `stdin.ts`: stdin JSON 读取
   - `index.ts`: 主入口和数据组装
   - `render/session-line.ts`: 基础会话行渲染
   - `git.ts`: Git 状态获取

3. **集成测试**
   - 配置 `.codebuddy/settings.json`
   - 在 CodeBuddy Code 中验证显示
   - 调试和修复

### Phase 2 (高级功能) - 预计 3-5 天

1. **Transcript 解析**
   - 分析 CodeBuddy transcript.json 格式
   - 实现 `transcript.ts`
   - 工具/代理/待办追踪

2. **多行渲染**
   - `render/tools-line.ts`
   - `render/agents-line.ts`
   - `render/todos-line.ts`

3. **缓存优化**
   - Transcript 缓存机制
   - Git 状态缓存

### Phase 3 (增强功能) - 预计 3-5 天

1. **配置系统**
   - `config.ts`: 配置加载/验证/默认值
   - 预设支持（Full/Essential/Minimal）

2. **视觉增强**
   - 颜色配置
   - CJK/emoji 宽度处理
   - 自适应布局

3. **安装命令**
   - `/codebuddy-hud:setup` 命令
   - 自动配置 `.codebuddy/settings.json`

## 7. 风险与待确认事项

### 7.1 高风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Transcript 格式未知 | 无法实现工具/代理追踪 | 先获取实际文件分析格式 |
| 缺少上下文窗口数据 | 无法显示 token 使用率 | 看是否能从 transcript 估算 |

### 7.2 待确认

1. **CodeBuddy transcript.json 格式**: 需要获取一个实际文件确认格式
2. **stdin JSON 是否有额外字段**: 文档中列出的字段可能不完整
3. **CodeBuddy Code 版本兼容**: 需要确认最低支持版本
4. **Windows Git Bash 兼容**: 确认 Git 操作在 Windows 下的行为

## 8. 下一步行动

1. 获取 CodeBuddy Code 的实际 transcript.json 文件，分析格式
2. 确认 stdin JSON 的完整字段列表
3. 启动 Phase 1 MVP 开发
