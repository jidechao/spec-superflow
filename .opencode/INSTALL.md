# Installing spec-superflow for OpenCode

## Prerequisites

- [OpenCode.ai](https://opencode.ai) installed

## Installation

OpenCode discovers agent skills from project skill directories. This repository exposes the existing `skills/` folder through:

```text
.agents/skills -> ../skills
```

If you open OpenCode inside this repository, the skills are available through that project-local entry.

For another project, point that project's `.agents/skills` at this repository's `skills/` directory:

```bash
git clone https://github.com/MageByte-Zero/spec-superflow.git
mkdir -p your-project/.agents
ln -s /absolute/path/to/spec-superflow/skills your-project/.agents/skills
```

If symlinks are not convenient on your platform, copy the folder instead:

```bash
mkdir -p your-project/.agents
cp -R /absolute/path/to/spec-superflow/skills your-project/.agents/skills
```

## Usage

Ask OpenCode to use the workflow entry skill:

```text
use workflow-orchestrator to start
```

Or explicitly load:

```text
spec-superflow/workflow-orchestrator
```

## Troubleshooting

### Skills not found

1. Verify that `your-project/.agents/skills/workflow-orchestrator/SKILL.md` exists.
2. Restart OpenCode after adding or changing the skill directory.
3. Use a real directory copy instead of a symlink if your environment does not follow symlinks.
