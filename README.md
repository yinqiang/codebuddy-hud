# CodeBuddy HUD

Real-time statusline HUD for [CodeBuddy Code](https://www.codebuddy.cn/) — context health, tool activity, git status, and session stats at a glance.

```
[GLM-5.1] │ codebuddy-hud │ git:(main ✱) │ ⏱ 10m │ 💰 $0.023 │ +156 -23
⚡ Edit: config.ts │ ✓ Read ×3 │ ✓ Bash ×2
▸ Fix auth bug ██████░░ 3/7
```

## Features

- **Session Stats** — Model name, project path, duration, cost, code stats (+/- lines), version, session ID
- **Git Integration** — Branch, dirty state, ahead/behind counts, file stats with line diffs
- **Tool Activity** — Active tool with detail, completed tool call counts (top 5)
- **Agent Tracking** — Active sub-agent descriptions, completed agent count
- **Task Progress** — Visual progress bar, completed/total, active task subjects
- **3 Presets** — `full` / `essential` / `minimal` for different information density
- **5 Themes** — `default` / `dracula` / `solarized` / `monokai` / `nord`
- **i18n** — English (`en`) and Chinese (`zh`) with localized labels, tool names, and duration formats
- **Adaptive Layout** — Automatically switches between compact and expanded layouts based on terminal width
- **High Performance** — Parallel git execution, incremental transcript parsing with byte-level tail reading for large files (>256KB), consistently under 100ms total

## Installation

### Option 1: Marketplace (Recommended)

```bash
# Add this repo as a plugin marketplace
/plugin marketplace add yinqiang/codebuddy-hub

# Install the plugin
/plugin install codebuddy-hud

# Run the setup command to configure
/codebuddy-hud:setup
```

That's it — the setup command handles building, statusline registration, and config creation automatically.

### Option 2: Clone & Build (Manual)

```bash
git clone https://github.com/yinqiang/codebuddy-hub.git codebuddy-hud
cd codebuddy-hud
npm ci
npm run build
```

### Option 3: Download Release

Download the latest release archive, extract it, and run:

```bash
cd codebuddy-hud
npm ci
npm run build
```

### Register with CodeBuddy Code

Add the statusline command to your CodeBuddy Code settings.

**Project-level** (`.codebuddy/settings.json` in your project root):

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/codebuddy-hud/dist/index.js",
    "padding": 0
  }
}
```

**User-level** (`~/.codebuddy/settings.json`):

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/codebuddy-hud/dist/index.js",
    "padding": 0
  }
}
```

> **Important**: Replace `/absolute/path/to/codebuddy-hud` with the actual path. On Windows, use forward slashes (e.g., `Q:/projects/codebuddy-hud/dist/index.js`).
>
> If the user-level `settings.json` already exists, merge the `statusLine` key into it — do NOT overwrite other settings.

### Create Config

Create `config.json` in the plugin root (same directory as `dist/`):

```json
{
  "preset": "essential",
  "theme": "default",
  "language": "en",
  "adaptiveLayout": true
}
```

### Verify

```bash
echo '{"model":{"id":"test","display_name":"Test"},"workspace":{"current_dir":"'$(pwd)'","project_dir":"'$(pwd)'"},"cost":{"total_cost_usd":0.01,"total_duration_ms":60000,"total_api_duration_ms":5000,"total_lines_added":10,"total_lines_removed":2},"session_id":"setup-test","version":"2.9.0"}' | node dist/index.js
```

You should see a colored statusline like `[Test] │ your-project │ git:(main) │ ...`.

## Configuration

### Presets

| Preset | Model | Project | Git | Duration | Cost | Code Stats | Tools | Agents | Todos |
|--------|-------|---------|-----|----------|------|------------|-------|--------|-------|
| **full** | ✓ | ✓ | full (dirty+ahead/behind+stats) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **essential** | ✓ | ✓ | dirty only | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| **minimal** | ✓ | ✓ | — | — | — | — | — | — | — |

### Themes

| Theme | Style |
|-------|-------|
| **default** | Classic terminal colors (cyan/yellow/magenta/green) |
| **dracula** | Dark purple/pink/cyan palette |
| **solarized** | Warm earth tones with blue accents |
| **monokai** | Bold green/yellow/pink on dark |
| **nord** | Cool blue/frost palette |

### Language Options

| Language | Git label | Duration | Tool names |
|----------|-----------|----------|------------|
| **en** | git | 10m | Read, Write, Bash... |
| **zh** | 仓库 | 10分 | 读, 写, 执行... |

### Full Configuration

Any field overrides the preset value:

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

## How It Works

CodeBuddy Code provides session data via stdin as JSON. The HUD process:

1. **Reads stdin** — Model, workspace, cost, transcript path from CodeBuddy Code
2. **Loads config** — Merges preset → theme → user overrides
3. **Fetches git status** — Parallel `git` commands (branch, dirty check, ahead/behind) with 3s cache and 800ms timeout per command
4. **Parses transcript** — Extracts tool activity, agent status, and task progress from JSONL; uses byte-level tail reading for files >256KB
5. **Renders output** — ANSI-colored statusline to stdout

```
stdin JSON → Node.js process → stdout (ANSI colored)
```

## Performance

| Scenario | Time |
|----------|------|
| Essential preset (typical) | ~60ms |
| Full preset (large repo) | ~80ms |
| 26MB transcript parsing | ~3ms (tail read) |
| No git / no transcript | ~10ms |

Set `CODEBUDDY_HUD_PROFILE=1` to see timing breakdown on stderr:

```
[hud-profile] stdin:2ms config:1ms git:55ms transcript:3ms render:1ms total:62ms
```

## Architecture

```
src/
├── index.ts              # Main entry, pipeline orchestration
├── stdin.ts              # Stdin JSON parsing
├── config.ts             # Config loader with preset/theme/i18n
├── git.ts                # Git status (parallel execution, cached)
├── transcript.ts         # Transcript JSONL parser (incremental + tail)
├── cache.ts              # TTL cache for git results
├── i18n.ts               # English/Chinese strings
├── types.ts              # Type definitions & defaults
├── utils/
│   └── terminal.ts       # Terminal width detection
└── render/
    ├── index.ts          # Render dispatcher, adaptive layout
    ├── session-line.ts   # Main session line (model/project/git/duration/cost)
    ├── tools-line.ts     # Tool activity line
    ├── agents-line.ts    # Agent status line
    ├── todos-line.ts     # Task progress line
    ├── colors.ts         # ANSI color helpers, progress bar
    └── width.ts          # Visual width calculation (CJK-aware)
```

## Development

```bash
npm run build          # Compile TypeScript
npm run dev            # Watch mode
npm run test           # Build + run tests
npm run test:stdin     # Smoke test with sample stdin
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Statusline not showing | Check `node` is in PATH, verify `settings.json` has correct path to `dist/index.js` |
| Chinese/emoji garbled | Ensure terminal supports UTF-8 encoding |
| Slow on large repos | Use `essential` or `minimal` preset; set `adaptiveLayout: true` |
| Profile performance | Set env var `CODEBUDDY_HUD_PROFILE=1` and check stderr |
| Git info missing | Verify the project is a git repo and `git` is in PATH |

## License

MIT
