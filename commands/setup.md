---
description: Set up the CodeBuddy HUD statusline
allowed-tools: Read,Write,Bash
argument-hint: preset (full|essential|minimal) [options]
---

# Setup CodeBuddy HUD

You are helping the user set up the CodeBuddy HUD statusline for their CodeBuddy Code environment.

## Steps

1. **Check prerequisites**: Verify Node.js 18+ is installed by running `node --version`. If not available, guide the user to install it.

2. **Detect environment**: Auto-detect settings where possible:
   - **language**: Check if the user communicates in Chinese → suggest `zh`, otherwise `en`
   - **project type**: Check if current directory is a git repo (`git rev-parse --git-dir`)
   - **terminal width**: Not detectable during setup, recommend `adaptiveLayout: true`

3. **Determine configuration** (from argument or ask user):
   - **preset**: `full` | `essential` | `minimal` (default: `essential`)
   - **theme**: `default` | `dracula` | `solarized` | `monokai` | `nord` (default: `default`)
   - **language**: `en` | `zh` (default: based on user's language)
   - **layout**: `compact` | `expanded` (default: `compact`, recommend `adaptiveLayout: true`)

4. **Build the HUD**: Run `cd ${CODEBUDDY_PLUGIN_ROOT} && npm ci && npm run build`

5. **Configure statusline**: Update `.codebuddy/settings.json` (project-level) or `~/.codebuddy/settings.json` (user-level) with:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ${CODEBUDDY_PLUGIN_ROOT}/dist/index.js",
    "padding": 0
  }
}
```

Replace `${CODEBUDDY_PLUGIN_ROOT}` with the actual absolute path to the plugin directory. On Windows, use forward slashes (e.g., `Q:/projects/codebuddy-hud/dist/index.js`).

**Important**: If updating user-level settings (`~/.codebuddy/settings.json`), merge the `statusLine` key into the existing JSON — do NOT overwrite other settings like `model`, `sandbox`, `enabledPlugins`, etc.

6. **Create config**: Create `${CODEBUDDY_PLUGIN_ROOT}/config.json` based on the user's choices.

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

### Context Bar (context usage)

To show a visual context usage bar (token usage vs. context window):

```json
{
  "display": {
    "showContextBar": true
  },
  "contextBar": {
    "mode": "percent",
    "showBreakdown": false
  }
}
```

`contextBar.mode` options:
| Mode | Example Output |
|-------|----------------|
| `percent` (default) | `▐██░░░░░░░ 8%` |
| `tokens` | `▐██░░░░░░░ 10.8k/128k` |
| `remaining` | `▐██░░░░░░░ 117k left` |
| `both` | `▐██░░░░░░░ 8% (10.8k/128k)` |

Note: Context window size is estimated by model ID. If the model is unknown, only token count is shown.

7. **Verify**: Run a quick smoke test:
   ```bash
   echo '{"model":{"id":"test","display_name":"Test"},"workspace":{"current_dir":"'$(pwd)'","project_dir":"'$(pwd)'"},"cost":{"total_cost_usd":0.01,"total_duration_ms":60000,"total_api_duration_ms":5000,"total_lines_added":10,"total_lines_removed":2},"session_id":"setup-test","version":"2.9.0"}' | node ${CODEBUDDY_PLUGIN_ROOT}/dist/index.js
   ```
   The output should show a colored statusline with `[Test] │ project-name │ ...`

8. **Tell user**: The HUD is set up and will appear in the statusline on the next update cycle (~300ms). To debug performance, set `CODEBUDDY_HUD_PROFILE=1` and check stderr output.

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

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Statusline not showing | Check `node` is in PATH, verify `settings.json` has correct path to `dist/index.js` |
| Chinese/emoji garbled | Ensure terminal supports UTF-8 encoding |
| Slow on large repos | Use `essential` or `minimal` preset; set `adaptiveLayout: true` |
| Profile performance | Set env var `CODEBUDDY_HUD_PROFILE=1` and check stderr |
| Git info missing | Verify the project is a git repo and `git` is in PATH |
