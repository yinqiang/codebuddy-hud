# CodeBuddy HUD

[CodeBuddy Code](https://www.codebuddy.cn/) 实时状态栏 HUD — 一目了然掌握上下文状态、工具活动、Git 状态与会话统计。

```
[GLM-5.1] │ codebuddy-hud │ 仓库:(main ✱) │ ⏱ 10分 │ 💰 $0.023 │ +156 -23
⚡ 编辑: config.ts │ ✓ 读 ×3 │ ✓ 执行 ×2
▸ 修复认证bug ██████░░ 3/7
```

## 功能特性

- **会话统计** — 模型名称、项目路径、持续时间、费用、代码统计（+/- 行数）、版本号、会话 ID
- **Git 集成** — 分支、脏状态、领先/落后提交数、文件统计与行级差异
- **工具活动** — 当前执行的工具及详情，已完成工具调用计数（前 5 个）
- **代理追踪** — 活跃子代理描述，已完成代理计数
- **任务进度** — 可视化进度条，已完成/总数，进行中任务标题
- **3 种预设** — `full` / `essential` / `minimal`，按需选择信息密度
- **5 种主题** — `default` / `dracula` / `solarized` / `monokai` / `nord`
- **国际化** — 英文（`en`）与中文（`zh`），标签、工具名、时长格式均已本地化
- **自适应布局** — 根据终端宽度自动切换紧凑/展开布局
- **高性能** — Git 命令并行执行，大文件（>256KB）增量解析 + 字节级尾部读取，总耗时稳定在 100ms 以内

## 安装

### 方式一：插件市场（推荐）

```bash
# 添加本仓库为插件市场
/plugin marketplace add yinqiang/codebuddy-hud

# 安装插件
/plugin install codebuddy-hud

# 运行 setup 命令完成配置
/codebuddy-hud:setup
```

三条命令即可完成安装。setup 命令会自动处理构建、statusline 注册和配置文件创建。

### 方式二：克隆构建（手动）

```bash
git clone <repo-url> codebuddy-hud
cd codebuddy-hud
npm ci
npm run build
```

### 方式三：下载 Release

下载最新发布包，解压后执行：

```bash
cd codebuddy-hud
npm ci
npm run build
```

### 注册到 CodeBuddy Code

在 CodeBuddy Code 的配置文件中添加 statusline 命令。

**项目级**（项目根目录下的 `.codebuddy/settings.json`）：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/codebuddy-hud/dist/index.js",
    "padding": 0
  }
}
```

**用户级**（`~/.codebuddy/settings.json`）：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/codebuddy-hud/dist/index.js",
    "padding": 0
  }
}
```

> **注意**：将 `/absolute/path/to/codebuddy-hud` 替换为实际路径。Windows 环境下使用正斜杠（如 `Q:/projects/codebuddy-hud/dist/index.js`）。
>
> 如果用户级 `settings.json` 已存在，将 `statusLine` 合并进去即可，**不要**覆盖其他配置项。

### 创建配置文件

在插件根目录（与 `dist/` 同级）创建 `config.json`：

```json
{
  "preset": "essential",
  "theme": "default",
  "language": "zh",
  "adaptiveLayout": true
}
```

### 验证安装

```bash
echo '{"model":{"id":"test","display_name":"Test"},"workspace":{"current_dir":"'$(pwd)'","project_dir":"'$(pwd)'"},"cost":{"total_cost_usd":0.01,"total_duration_ms":60000,"total_api_duration_ms":5000,"total_lines_added":10,"total_lines_removed":2},"session_id":"setup-test","version":"2.9.0"}' | node dist/index.js
```

正常情况下会输出彩色状态栏，如 `[Test] │ 你的项目 │ 仓库:(main) │ ...`。

## 配置说明

### 预设

| 预设 | 模型 | 项目 | Git | 时长 | 费用 | 代码统计 | 工具 | 代理 | 任务 |
|------|------|------|-----|------|------|----------|------|------|------|
| **full** | ✓ | ✓ | 完整（脏+领先/落后+统计） | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **essential** | ✓ | ✓ | 仅脏状态 | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| **minimal** | ✓ | ✓ | — | — | — | — | — | — | — |

### 主题

| 主题 | 风格 |
|------|------|
| **default** | 经典终端色（青/黄/品红/绿） |
| **dracula** | 深紫/粉/青色系 |
| **solarized** | 暖色调大地色系，蓝色点缀 |
| **monokai** | 醒目绿/黄/粉，深色背景 |
| **nord** | 冷蓝/霜白色系 |

### 语言选项

| 语言 | Git 标签 | 时长格式 | 工具名称 |
|------|----------|----------|----------|
| **en** | git | 10m | Read, Write, Bash... |
| **zh** | 仓库 | 10分 | 读, 写, 执行... |

### 完整配置

任意字段会覆盖预设值：

```json
{
  "preset": "full",
  "theme": "dracula",
  "language": "zh",
  "adaptiveLayout": true,
  "lineLayout": "compact",
  "pathLevels": 1,
  "maxWidth": null,
  "gitStatus": {
    "enabled": true,
    "showDirty": true,
    "showAheadBehind": true,
    "showFileStats": true
  },
  "display": {
    "showModel": true,
    "showProject": true,
    "showContextBar": false,
    "showDuration": true,
    "showCost": true,
    "showCodeStats": true,
    "showVersion": true,
    "showSessionId": true,
    "sessionIdLength": 8,
    "showToolsLine": true,
    "showAgentsLine": true,
    "showTodosLine": true
  }
}
```

## 工作原理

CodeBuddy Code 通过 stdin 以 JSON 格式提供会话数据。HUD 进程处理流程：

1. **读取 stdin** — 从 CodeBuddy Code 获取模型、工作区、费用、transcript 路径
2. **加载配置** — 合并预设 → 主题 → 用户覆盖
3. **获取 Git 状态** — 并行执行 `git` 命令（分支、脏检查、领先/落后），3 秒缓存，单命令 800ms 超时
4. **解析 transcript** — 从 JSONL 提取工具活动、代理状态和任务进度；大文件（>256KB）使用字节级尾部读取
5. **渲染输出** — ANSI 彩色状态栏输出到 stdout

```
stdin JSON → Node.js 进程 → stdout（ANSI 彩色）
```

## 性能

| 场景 | 耗时 |
|------|------|
| essential 预设（典型） | ~60ms |
| full 预设（大仓库） | ~80ms |
| 26MB transcript 解析 | ~3ms（尾部读取） |
| 无 git / 无 transcript | ~10ms |

设置 `CODEBUDDY_HUD_PROFILE=1` 可在 stderr 查看各阶段耗时：

```
[hud-profile] stdin:2ms config:1ms git:55ms transcript:3ms render:1ms total:62ms
```

## 项目结构

```
src/
├── index.ts              # 主入口，流程编排
├── stdin.ts              # stdin JSON 解析
├── config.ts             # 配置加载（预设/主题/国际化）
├── git.ts                # Git 状态（并行执行，缓存）
├── transcript.ts         # Transcript JSONL 解析器（增量 + 尾部读取）
├── cache.ts              # Git 结果 TTL 缓存
├── i18n.ts               # 英文/中文字符串
├── types.ts              # 类型定义与默认值
├── utils/
│   └── terminal.ts       # 终端宽度检测
└── render/
    ├── index.ts          # 渲染分发，自适应布局
    ├── session-line.ts   # 主会话行（模型/项目/git/时长/费用）
    ├── tools-line.ts     # 工具活动行
    ├── agents-line.ts    # 代理状态行
    ├── todos-line.ts     # 任务进度行
    ├── colors.ts         # ANSI 颜色辅助，进度条
    └── width.ts          # 可视宽度计算（CJK 感知）
```

## 开发

```bash
npm run build          # 编译 TypeScript
npm run dev            # 监听模式
npm run test           # 构建 + 运行测试
npm run test:stdin     # 使用示例 stdin 冒烟测试
```

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 状态栏不显示 | 检查 `node` 是否在 PATH 中，确认 `settings.json` 中 `dist/index.js` 路径正确 |
| 中文/emoji 乱码 | 确保终端支持 UTF-8 编码 |
| 大仓库响应慢 | 使用 `essential` 或 `minimal` 预设；设置 `adaptiveLayout: true` |
| 性能分析 | 设置环境变量 `CODEBUDDY_HUD_PROFILE=1`，查看 stderr 输出 |
| Git 信息缺失 | 确认项目是 git 仓库且 `git` 在 PATH 中 |

## 许可证

MIT
