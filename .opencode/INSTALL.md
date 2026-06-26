# Installing spec-superflow for OpenCode

## Prerequisites

- [OpenCode.ai](https://opencode.ai) installed

## Installation

Add spec-superflow to the `plugin` array in your `opencode.json` (global or project-level):

```json
{
  "plugin": ["spec-superflow@git+https://github.com/MageByte-Zero/spec-superflow.git"]
}
```

Restart OpenCode. That's it — the plugin auto-installs and registers all skills.

Verify by asking: "Tell me about workflow-orchestrator"

## Usage

Use OpenCode's native `skill` tool:

```
use skill tool to list skills
use skill tool to load spec-superflow/workflow-orchestrator
```

## Updating

spec-superflow updates automatically when you restart OpenCode.

To pin a specific version:

```json
{
  "plugin": ["spec-superflow@git+https://github.com/MageByte-Zero/spec-superflow.git#v0.1.0"]
}
```

## Troubleshooting

### Plugin not loading

1. Check logs: `opencode run --print-logs "hello" 2>&1 | grep -i spec-superflow`
2. Verify the plugin line in your `opencode.json`
3. Make sure you're running a recent version of OpenCode

### Skills not found

1. Use `skill` tool to list what's discovered
2. Check that the plugin is loading (see above)

### Tool mapping

When skills reference Claude Code tools, OpenCode adapts:
- `TodoWrite` → `todowrite`
- `Task` with subagents → `@mention` syntax
- File operations → native OpenCode tools
