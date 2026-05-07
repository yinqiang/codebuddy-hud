# Claude HUD 源码关键模块详解

> 从 jarrodwatts/claude-hud 仓库提取的核心实现细节

## 1. 主入口 (index.ts)

### 执行流程

```
main()
  ├── readStdin()                    # 读取 stdin JSON
  ├── parseTranscript(transcriptPath) # 解析 transcript
  ├── applyContextWindowFallback()    # 上下文窗口回退
  ├── countConfigs(cwd)              # 计数配置文件
  ├── loadConfig()                   # 加载用户配置
  ├── getGitStatus(cwd)              # 获取 Git 状态
  ├── getUsageFromStdin()            # 从 stdin 获取使用率
  │   └── getUsageFromExternalSnapshot() # 备用：外部快照
  ├── parseExtraCmdArg()             # 解析额外命令参数
  ├── resolveEffortLevel()           # 解析效力等级
  ├── getMemoryUsage()               # 获取内存使用
  ├── getClaudeCodeVersion()         # 获取版本
  └── render(ctx)                    # 渲染输出
```

### RenderContext 组装

```typescript
const ctx: RenderContext = {
  stdin,              // stdin JSON 原始数据
  transcript,         // 解析后的 transcript 数据
  claudeMdCount,      // CLAUDE.md 文件数量
  rulesCount,         // 规则数量
  mcpCount,           // MCP 服务器数量
  hooksCount,         // 钩子数量
  sessionDuration,    // 会话时长字符串
  gitStatus,          // Git 状态
  usageData,          // 使用率数据
  memoryUsage,        // 内存使用
  config,             // 用户配置
  extraLabel,         // 额外标签
  outputStyle,        // 输出样式
  claudeCodeVersion,  // Claude Code 版本
  effortLevel,        // 效力等级
  effortSymbol,       // 效力等级符号
};
```

## 2. stdin 读取 (stdin.ts)

### 关键参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| firstByteTimeoutMs | 250ms | 等待首字节超时 |
| idleTimeoutMs | 30ms | 数据间隔超时 |
| maxBytes | 256KB | 最大数据量 |

### 读取策略

1. 如果 stdin 是 TTY → 返回 null（非管道模式）
2. 设置 utf8 编码
3. 监听 `data`/`end`/`error` 事件
4. 每收到 chunk 尝试 JSON.parse
5. 解析成功立即 resolve
6. 超时或错误返回 null

### 数据提取函数

```typescript
getContextPercent(stdin)    // 上下文使用百分比
getBufferedPercent(stdin)   // 缓冲后的百分比（考虑 autocompact）
getModelName(stdin)         // 模型名称
getProviderLabel(stdin)     // 供应商标签 (Bedrock/Vertex)
getTotalTokens(stdin)       // 总 token 数
shouldHideUsage(stdin)      // 是否隐藏使用率
getUsageFromStdin(stdin)    // 从 stdin 提取使用率数据
```

## 3. Transcript 解析 (transcript.ts)

### 核心数据结构

```typescript
interface TranscriptData {
  tools: ToolEntry[];           // 最近 20 个工具
  agents: AgentEntry[];         // 最近 10 个代理
  todos: TodoItem[];            // 所有待办
  sessionStart?: Date;          // 会话开始时间
  sessionName?: string;         // 会话名称
  lastAssistantResponseAt?: Date;
  sessionTokens?: SessionTokenUsage;
  lastCompactBoundaryAt?: Date;
  lastCompactPostTokens?: number;
}
```

### 解析流程

```
parseTranscript(path)
  ├── 检查缓存（SHA256 哈希 + mtime/size）
  │   └── 命中 → 直接返回
  ├── 逐行读取 JSONL
  │   ├── custom-title → sessionName
  │   ├── assistant → 累计 token + lastAssistantResponseAt
  │   ├── compact_boundary → 记录压缩边界
  │   └── processEntry()
  │       ├── tool_use → 创建 ToolEntry / AgentEntry
  │       │   ├── Task/Agent → agentMap
  │       │   ├── TodoWrite → 更新 todos
  │       │   ├── TaskCreate → 新增 todo
  │       │   ├── TaskUpdate → 更新 todo
  │       │   └── 其他 → toolMap
  │       └── tool_result → 标记完成
  ├── 截取最近 N 条
  └── 写入缓存
```

### 工具目标提取

```typescript
extractTarget(toolName, input)
  Read/Write/Edit → file_path / path
  Glob            → pattern
  Grep            → pattern
  Skill           → skill name
  Bash            → command (截断30字符)
```

### 任务状态规范化

```typescript
'pending' | 'not_started'  → 'pending'
'in_progress' | 'running'  → 'in_progress'
'completed' | 'done'       → 'completed'
```

## 4. Git 状态 (git.ts)

### 执行的 Git 命令

| 命令 | 用途 | 超时 |
|------|------|------|
| `git rev-parse --abbrev-ref HEAD` | 获取分支名 | 1s |
| `git --no-optional-locks status --porcelain` | 脏状态+文件统计 | 1s |
| `git diff --numstat HEAD` | 行级差异 | 2s |
| `git rev-list --left-right --count @{upstream}...HEAD` | ahead/behind | 1s |
| `git remote get-url origin` | 远程 URL | 1s |

### 返回数据

```typescript
interface GitStatus {
  branch: string;         // 分支名
  isDirty: boolean;       // 是否有未提交变更
  ahead: number;          // 领先远程的提交数
  behind: number;         // 落后远程的提交数
  fileStats?: FileStats;  // 文件变更统计
  lineDiff?: LineDiff;    // 行级差异
  branchUrl?: string;     // GitHub 分支 URL
}
```

### 文件统计解析

状态码映射:
- `M` = modified, `A` = added, `D` = deleted, `R` = renamed, `C` = copied
- `??` = untracked
- 支持 rename 格式: `pkg/{old.ts => new.ts}`

## 5. 渲染系统 (render/)

### 5.1 渲染主入口 (render/index.ts)

#### 布局模式

**Compact 模式**:
- 1-2 行: 会话信息行 + 可选活动行

**Expanded 模式**:
- 多行: 每个元素独立一行
- 支持 mergeGroups: `[['context', 'usage']]` 将多个元素合并到同一行
- 支持 elementOrder: 自定义元素排列顺序

#### 核心渲染函数

```typescript
renderElementLine(ctx, element)
  'project'     → renderProjectLine(ctx)
  'addedDirs'   → renderAddedDirsLine(ctx)
  'context'     → renderIdentityLine(ctx)
  'usage'       → renderUsageLine(ctx)
  'promptCache' → renderPromptCacheLine(ctx)
  'memory'      → renderMemoryLine(ctx)
  'environment' → renderEnvironmentLine(ctx)
  'tools'       → renderToolsLine(ctx)
  'agents'      → renderAgentsLine(ctx)
  'todos'       → renderTodosLine(ctx)
```

#### ANSI 处理

- `stripAnsi(str)`: 移除所有 ANSI 转义序列
- `visualLength(str)`: 计算可见宽度（考虑 CJK/emoji）
- `truncateToWidth(str, maxWidth)`: 截断到指定宽度
- `wrapLineToWidth(line, maxWidth)`: 按 separator 分割换行

### 5.2 会话行渲染 (render/session-line.ts)

#### 组装顺序

1. **模型 + 上下文条**: `[Opus] █████░░░░░ 45%`
2. **项目路径 + Git**: `my-project git:(main*)`
3. **会话名称**: (可选)
4. **版本号**: (可选)
5. **配置计数**: CLAUDE.md / rules / MCPs / hooks
6. **使用率**: 5h/7d 配额 + 重置倒计时
7. **会话 token**: (可选)
8. **时长**: ⏱ 5m
9. **Prompt 缓存**: (可选)
10. **成本估算**: (可选)
11. **速度**: (可选)

#### 上下文条颜色

| 阈值 | 颜色 | 默认值 |
|------|------|--------|
| 正常 | `colors.context` | green |
| ≥ warning | `colors.warning` | yellow |
| ≥ critical | `colors.critical` | red |

默认: warning=70%, critical=85%

#### Token 格式化

```typescript
formatTokens(n)
  ≥ 1,000,000 → "1.2M"
  ≥ 1,000     → "156k"
  < 1,000     → "890"
```

## 6. 配置系统 (config.ts)

### 配置文件位置
`{HUD_PLUGIN_DIR}/config.json`

### 加载流程
1. 读取用户配置文件
2. 解析 JSON
3. 与默认配置合并
4. 验证每个字段
5. 无效值回退到默认

### 验证函数

| 函数 | 有效值 |
|------|--------|
| validatePathLevels | 1, 2, 3 |
| validateLineLayout | 'compact', 'expanded' |
| validateContextValue | 'percent', 'tokens', 'remaining', 'both' |
| validateLanguage | 'en', 'zh' |
| validateColorValue | 预设名 / 0-255 / #rrggbb |
| validateThreshold | 0-100 |
| validateElementOrder | 有效元素名数组 |

### 迁移支持
`migrateConfig()` 处理 v0.0.x → v0.1.x 的配置格式变化。
