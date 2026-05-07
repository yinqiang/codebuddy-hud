---
description: Set up the CodeBuddy HUD statusline
allowed-tools: Read,Write,Bash
argument-hint: preset name (full|essential|minimal)
---

# Setup CodeBuddy HUD

You are helping the user set up the CodeBuddy HUD statusline for their CodeBuddy Code environment.

## Steps

1. **Check Node.js**: Verify Node.js 18+ is installed by running `node --version`.

2. **Determine preset** (from argument or ask user):
   - **full**: All features enabled - model, project, git (dirty + ahead/behind + file stats), duration, cost, code stats, session ID
   - **essential**: Core features - model, project, git (dirty), duration, cost
   - **minimal**: Bare minimum - model and project only

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

5. **Create config** (optional): Create `${CODEBUDDY_PLUGIN_ROOT}/config.json` based on the preset:

**Full preset**:
```json
{
  "lineLayout": "compact",
  "pathLevels": 1,
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
    "showVersion": false,
    "showSessionId": true,
    "sessionIdLength": 8
  }
}
```

**Essential preset**:
```json
{
  "lineLayout": "compact",
  "pathLevels": 1,
  "gitStatus": {
    "enabled": true,
    "showDirty": true,
    "showAheadBehind": false,
    "showFileStats": false
  },
  "display": {
    "showModel": true,
    "showProject": true,
    "showContextBar": false,
    "showDuration": true,
    "showCost": true,
    "showCodeStats": false,
    "showVersion": false,
    "showSessionId": false,
    "sessionIdLength": 8
  }
}
```

**Minimal preset**:
```json
{
  "lineLayout": "compact",
  "pathLevels": 1,
  "gitStatus": {
    "enabled": false
  },
  "display": {
    "showModel": true,
    "showProject": true,
    "showContextBar": false,
    "showDuration": false,
    "showCost": false,
    "showCodeStats": false,
    "showVersion": false,
    "showSessionId": false,
    "sessionIdLength": 8
  }
}
```

6. **Verify**: Tell the user the HUD is set up and will appear in the statusline on the next update cycle (~300ms).
