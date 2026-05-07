# CodeBuddy 插件系统参考文档

> 来源: https://www.codebuddy.ai/docs/cli/plugins-reference
> 适用版本: CodeBuddy Code 2.x

## 1. 插件系统概述

CodeBuddy 插件系统允许通过标准化机制扩展 AI 助手功能。插件可提供 6 类组件:

| 组件 | 位置 | 格式 |
|------|------|------|
| Commands (命令) | `commands/` | Markdown + frontmatter |
| Agents (代理) | `agents/` | Markdown + frontmatter |
| Skills (技能) | `skills/` | 目录 + SKILL.md |
| Hooks (钩子) | `hooks/hooks.json` | JSON 配置 |
| MCP Servers | `.mcp.json` | JSON 配置 |
| LSP Servers | `.lsp.json` | JSON 配置 |

## 2. 插件清单 (plugin.json)

### 必填字段
```json
{
  "name": "plugin-name",       // kebab-case，无空格
  "description": "描述"
}
```

### 完整示例
```json
{
  "name": "codebuddy-hud",
  "version": "1.0.0",
  "description": "Real-time statusline HUD for CodeBuddy Code",
  "author": {
    "name": "Author",
    "email": "email@example.com",
    "url": "https://github.com/author"
  },
  "homepage": "https://github.com/author/codebuddy-hud",
  "repository": "https://github.com/author/codebuddy-hud",
  "license": "MIT",
  "keywords": ["hud", "statusline", "monitoring"],
  "category": "Development Tools",
  "features": ["Context monitoring", "Tool tracking"],
  "requirements": {
    "node": ">=18.0.0"
  },
  "commands": ["./commands/setup.md"],
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

## 3. 目录结构

```
plugin/
├── .codebuddy-plugin/       # 元数据目录（优先）
│   └── plugin.json          # 必需：插件清单
├── .claude-plugin/          # 兼容目录
│   └── plugin.json
├── commands/                # 命令
├── agents/                  # 代理
├── skills/                  # 技能
├── hooks/                   # 钩子配置
├── .mcp.json               # MCP 服务器
├── .lsp.json               # LSP 服务器
├── scripts/                # 脚本
├── LICENSE
└── README.md
```

**重要**: `.codebuddy-plugin/` 优先，`.claude-plugin/` 兼容。

## 4. Commands (命令)

### 格式
```markdown
---
description: Command description
allowed-tools: Read,Write,Bash
argument-hint: Argument hint
model: Model ID or name
---
Command prompt content
```

### 命名规则
- `commands/status.md` → `/plugin-name:status`
- `commands/deploy/production.md` → `/plugin-name:deploy:production`

## 5. Hooks (钩子)

### 可用事件

| 事件 | 说明 |
|------|------|
| `PreToolUse` | 工具调用前（可阻止） |
| `PostToolUse` | 工具调用后 |
| `UserPromptSubmit` | 用户提交提示后 |
| `Notification` | 发送通知时 |
| `Stop` | 停止响应时 |
| `SubagentStop` | 子代理停止时 |
| `PreCompact` | 压缩前 |
| `SessionStart` | 会话开始 |
| `SessionEnd` | 会话结束 |

### 配置示例
```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "${CODEBUDDY_PLUGIN_ROOT}/scripts/format.sh",
          "timeout": 30000
        }
      ]
    }
  ]
}
```

### Matcher 规则
- 具体工具名: `"Bash"`, `"Edit"`
- 全部工具: `"*"`
- 正则表达式: `"mcp__github__.*"`

## 6. 环境变量

| 变量 | 说明 |
|------|------|
| `${CODEBUDDY_PLUGIN_ROOT}` | 插件目录绝对路径（优先） |
| `${CLAUDE_PLUGIN_ROOT}` | 兼容变量名 |
| `${CODEBUDDY_PROJECT_DIR}` | 项目目录路径 |

## 7. CLI 命令

```bash
# 市场管理
codebuddy plugin marketplace add <source>
codebuddy plugin marketplace list
codebuddy plugin marketplace update <name>
codebuddy plugin marketplace remove <name>

# 插件管理
codebuddy plugin install <plugin-name>
codebuddy plugin list
codebuddy plugin enable <plugin-name>
codebuddy plugin disable <plugin-name>
codebuddy plugin uninstall <plugin-name>
```

## 8. 调试

```bash
codebuddy --verbose
```

显示内容:
- 插件加载日志
- 清单错误
- 命令/代理/技能注册
- MCP 服务器初始化
- 钩子配置加载

## 9. 兼容性说明

| 概念 | Claude Code | CodeBuddy Code |
|------|-------------|----------------|
| 元数据目录 | `.claude-plugin/` | `.codebuddy-plugin/`（优先） |
| 环境变量 | `${CLAUDE_PLUGIN_ROOT}` | `${CODEBUDDY_PLUGIN_ROOT}`（优先） |
| 命名空间 | 完全兼容 | 自动识别旧命名 |

**迁移**: 可选择重命名目录和变量，但非必需——CodeBuddy 自动识别兼容格式。
