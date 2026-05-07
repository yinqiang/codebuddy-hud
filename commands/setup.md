---
description: Set up the CodeBuddy HUD statusline
allowed-tools: Read,Write,Bash
argument-hint: preset (full|essential|minimal) [options]
---

# Setup CodeBuddy HUD

You are helping the user set up the CodeBuddy HUD statusline for their CodeBuddy Code environment.

## Steps

1. **Check Node.js**: Verify Node.js 18+ is installed by running `node --version`.

2. **Determine configuration** (from argument or ask user):
   - **preset**: `full` | `essential` | `minimal` (default: `essential`)
   - **theme**: `default` | `dracula` | `solarized` | `monokai` | `nord` (default: `default`)
   - **language**: `en` | `zh` (default: `en`)
   - **layout**: `compact` | `expanded` (default: `compact`)

3. **Build the HUD**: Run `cd ${CODEBUDDY_PLUGIN_ROOT} && npm ci && npm run build`

4. **Configure statusline**: Update `.codebuddy/settings.json` (project-level) or `~/.codebuddy/settings.json` (user-level) with:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ${CODEBUDDY_PLUGIN_ROOT}/dist/index.js",
    "padding": 0
  }
}
```

Replace `${CODEBUDDY_PLUGIN_ROOT}` with the actual plugin directory path.

5. **Create config**: Create `${CODEBUDDY_PLUGIN_ROOT}/config.json` based on the user's choices. The config supports:

### Minimal config (preset-only)

Just specify a preset and optionally theme/language:

```json
{
  "preset": "essential",
  "theme": "default",
  "language": "en",
  "adaptiveLayout": true
}
```

### Full config (with overrides)

Any field in the config overrides the preset value:

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

### Preset descriptions

| Preset | Model | Project | Git | Duration | Cost | Code Stats | Tools | Agents | Todos |
|--------|-------|---------|-----|----------|------|------------|-------|--------|-------|
| **full** | ✓ | ✓ | full (dirty+ahead/behind+stats) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **essential** | ✓ | ✓ | dirty only | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| **minimal** | ✓ | ✓ | — | — | — | — | — | — | — |

### Theme descriptions

| Theme | Style |
|-------|-------|
| **default** | Classic terminal colors (cyan/yellow/magenta/green) |
| **dracula** | Dark purple/pink/cyan palette |
| **solarized** | Warm earth tones with blue accents |
| **monokai** | Bold green/yellow/pink on dark |
| **nord** | Cool blue/frost palette |

### Language options

| Language | Git label | Duration | Tool names |
|----------|-----------|----------|------------|
| **en** | git | 10m | Read, Write, Bash... |
| **zh** | 仓库 | 10分 | 读, 写, 执行... |

6. **Verify**: Tell the user the HUD is set up and will appear in the statusline on the next update cycle (~300ms).
