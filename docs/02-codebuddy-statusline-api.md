# CodeBuddy StatusLine API 参考文档

> 来源: https://www.codebuddy.ai/docs/cli/statusline
> 适用版本: CodeBuddy Code 2.x

## 1. 概述

CodeBuddy Code 支持 StatusLine 自定义，在界面底部显示上下文信息，类似于 shell 的 PS1 提示符（如 oh-my-zsh）。

## 2. 配置方式

### 2.1 交互式配置
```
/statusline
```
CodeBuddy Code 会帮助你设置自定义 statusline，默认尝试复制终端提示符。

### 2.2 直接配置

在 `.codebuddy/settings.json` 或 `~/.codebuddy/settings.json` 中添加:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.codebuddy/statusline.sh",
    "padding": 0
  }
}
```

**配置参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `type` | string | 固定为 `"command"` |
| `command` | string | statusline 脚本路径 |
| `padding` | number | 设为 `0` 可让 statusline 延伸到边缘 |

### 2.3 项目级 vs 用户级

| 级别 | 配置文件 | 作用范围 |
|------|---------|---------|
| 用户级 | `~/.codebuddy/settings.json` | 所有项目 |
| 项目级 | `.codebuddy/settings.json` | 当前项目 |

## 3. 运行机制

- **更新触发**: 会话消息更新时触发
- **更新频率**: 最多每 300ms 更新一次
- **输出方式**: 脚本 stdout 第一行作为 statusline 文本
- **样式支持**: ANSI 颜色码
- **数据输入**: CodeBuddy Code 通过 stdin 传递 JSON 格式的上下文信息

## 4. stdin JSON 数据结构

### 4.1 完整结构

```json
{
  "hook_event_name": "Status",
  "session_id": "abc123...",
  "transcript_path": "/path/to/transcript.json",
  "cwd": "/current/working/directory",
  "model": {
    "id": "gpt-5",
    "display_name": "GPT-5"
  },
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory"
  },
  "version": "2.9.0",
  "output_style": {
    "name": "default"
  },
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 45000,
    "total_api_duration_ms": 2300,
    "total_lines_added": 156,
    "total_lines_removed": 23
  }
}
```

### 4.2 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `hook_event_name` | string | 固定为 `"Status"` |
| `session_id` | string | 会话唯一标识 |
| `transcript_path` | string | transcript.json 文件路径 |
| `cwd` | string | 当前工作目录 |
| `model.id` | string | 模型标识 |
| `model.display_name` | string | 模型显示名称 |
| `workspace.current_dir` | string | 当前工作目录 |
| `workspace.project_dir` | string | 项目目录 |
| `version` | string | CodeBuddy Code 版本 |
| `output_style.name` | string | 输出样式名 |
| `cost.total_cost_usd` | number | 总 API 成本（美元） |
| `cost.total_duration_ms` | number | 总会话时长（毫秒） |
| `cost.total_api_duration_ms` | number | 总 API 调用时长 |
| `cost.total_lines_added` | number | 添加代码行数 |
| `cost.total_lines_removed` | number | 删除代码行数 |

## 5. 示例脚本

### 5.1 基础 Bash 脚本

```bash
#!/bin/bash
input=$(cat)

MODEL_DISPLAY=$(echo "$input" | jq -r '.model.display_name')
CURRENT_DIR=$(echo "$input" | jq -r '.workspace.current_dir')

echo "[$MODEL_DISPLAY] 📁 ${CURRENT_DIR##*/}"
```

### 5.2 带 Git 信息的脚本

```bash
#!/bin/bash
input=$(cat)

MODEL_DISPLAY=$(echo "$input" | jq -r '.model.display_name')
CURRENT_DIR=$(echo "$input" | jq -r '.workspace.current_dir')

GIT_BRANCH=""
if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null)
    if [ -n "$BRANCH" ]; then
        GIT_BRANCH=" | 🌿 $BRANCH"
    fi
fi

echo "[$MODEL_DISPLAY] 📁 ${CURRENT_DIR##*/}$GIT_BRANCH"
```

### 5.3 带颜色的脚本

```bash
#!/bin/bash
input=$(cat)

MODEL_DISPLAY=$(echo "$input" | jq -r '.model.display_name')
CURRENT_DIR=$(echo "$input" | jq -r '.workspace.current_dir')

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

GIT_BRANCH=""
if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null)
    if [ -n "$BRANCH" ]; then
        if ! git diff-index --quiet HEAD -- 2>/dev/null; then
            STATUS="*"
        else
            STATUS=""
        fi
        GIT_BRANCH=" ${GREEN}on${NC} ${YELLOW}$BRANCH$STATUS${NC}"
    fi
fi

echo -e "${BLUE}[$MODEL_DISPLAY]${NC} 📁 ${GREEN}${CURRENT_DIR##*/}${NC}$GIT_BRANCH"
```

### 5.4 带成本统计的脚本

```bash
#!/bin/bash
input=$(cat)

MODEL_DISPLAY=$(echo "$input" | jq -r '.model.display_name')
CURRENT_DIR=$(echo "$input" | jq -r '.workspace.current_dir')
TOTAL_COST=$(echo "$input" | jq -r '.cost.total_cost_usd')
LINES_ADDED=$(echo "$input" | jq -r '.cost.total_lines_added')
LINES_REMOVED=$(echo "$input" | jq -r '.cost.total_lines_removed')

COST_STR=""
if [ "$TOTAL_COST" != "null" ] && [ "$TOTAL_COST" != "0" ]; then
    COST_STR=$(printf " | 💰 \$%.4f" "$TOTAL_COST")
fi

STATS=""
if [ "$LINES_ADDED" != "null" ] && [ "$LINES_ADDED" != "0" ]; then
    STATS=" | +$LINES_ADDED -$LINES_REMOVED"
fi

echo "[$MODEL_DISPLAY] 📁 ${CURRENT_DIR##*/}$COST_STR$STATS"
```

### 5.5 Node.js 脚本

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const data = JSON.parse(input);

    const model = data.model.display_name;
    const currentDir = path.basename(data.workspace.current_dir);

    let gitBranch = '';
    try {
        const branch = execSync('git branch --show-current', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        if (branch) gitBranch = ` | 🌿 ${branch}`;
    } catch (e) {}

    const BLUE = '\x1b[0;34m';
    const GREEN = '\x1b[0;32m';
    const NC = '\x1b[0m';

    console.log(`${BLUE}[${model}]${NC} 📁 ${GREEN}${currentDir}${NC}${gitBranch}`);
});
```

## 6. ANSI 颜色码参考

### 文本颜色
```bash
BLACK='\033[0;30m'    RED='\033[0;31m'
GREEN='\033[0;32m'    YELLOW='\033[0;33m'
BLUE='\033[0;34m'     PURPLE='\033[0;35m'
CYAN='\033[0;36m'     WHITE='\033[0;37m'
```

### 粗体颜色
```bash
BOLD_RED='\033[1;31m'     BOLD_GREEN='\033[1;32m'
BOLD_YELLOW='\033[1;33m'  BOLD_BLUE='\033[1;34m'
BOLD_CYAN='\033[1;36m'
```

### 重置
```bash
NC='\033[0m'
```

## 7. 注意事项

1. **脚本需可执行**: `chmod +x ~/.codebuddy/statusline.sh`
2. **保持简洁**: statusline 应适合单行显示
3. **使用 jq 解析**: Bash 中解析 JSON 的必备工具
4. **测试脚本**: 手动运行验证:
   ```bash
   echo '{"model":{"display_name":"Test"},"workspace":{"current_dir":"/test"}}' | ./statusline.sh
   ```
5. **UTF-8 编码**: 确保中文字符和 emoji 正确显示
6. **缓存昂贵操作**: Git 状态检查等可以适当缓存
7. **Windows 兼容**: 通过 Git Bash 执行，使用 bash 语法

## 8. 与 Claude Code StatusLine API 对比

| 特性 | Claude Code | CodeBuddy Code |
|------|-------------|----------------|
| 配置位置 | `.claude/settings.json` | `.codebuddy/settings.json` |
| 更新频率 | ~300ms | ~300ms |
| stdin JSON | 丰富（上下文窗口、速率限制等） | 基础（模型、成本、工作区） |
| transcript 访问 | ✅ `transcript_path` | ✅ `transcript_path` |
| 上下文窗口数据 | ✅ 原生 token 计数 | ❌ 未提供 |
| 速率限制数据 | ✅ 订阅者可用 | ❌ 未提供 |
| 插件打包 | `.claude-plugin/` | `.codebuddy-plugin/` 或 `.claude-plugin/` |
