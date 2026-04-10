# @remotion/codex-plugin

OpenAI Codex plugin that packages [Remotion](https://remotion.dev) skills for AI-assisted video creation.

## Building

```bash
bun build.mts
```

This copies skills from `packages/skills/skills/` and `.claude/skills/` into the `skills/` directory in the Codex plugin format.

## Local testing

1. Build the plugin: `bun build.mts`
2. Copy or symlink this directory to `~/.codex/plugins/remotion`
3. Add the marketplace entry to `~/.agents/plugins/marketplace.json`:

```json
{
  "name": "remotion",
  "interface": {
    "displayName": "Remotion"
  },
  "plugins": [
    {
      "name": "remotion",
      "source": {
        "source": "local",
        "path": "./.codex/plugins/remotion"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Coding"
    }
  ]
}
```

4. Restart Codex

## Plugin structure

```
.codex-plugin/
  plugin.json          # Plugin manifest
skills/
  remotion/            # Remotion best practices (animations, audio, etc.)
    SKILL.md
    rules/*.md
  add-cli-option/      # Contributing: add CLI options
  add-expert/          # Contributing: add experts to the experts page
  add-new-package/     # Contributing: scaffold a new @remotion/* package
  add-sfx/             # Contributing: add sound effects
  docs-demo/           # Contributing: add interactive docs demos
  pr/                  # Contributing: open a pull request
  video-report/        # Contributing: debug user-reported videos
  web-renderer-test/   # Contributing: add web renderer tests
  writing-docs/        # Contributing: write documentation
```

## Skills included

### For Remotion users

- **remotion** — Best practices for video creation with Remotion and React. Covers animations, timing, audio, captions, 3D, transitions, charts, text effects, fonts, and 30+ more topics.

### For Remotion contributors

- **add-cli-option** — How to add or convert CLI options
- **add-expert** — Add an expert to the experts page
- **add-new-package** — Scaffold a new `@remotion/*` package
- **add-sfx** — Add sound effects to `@remotion/sfx`
- **docs-demo** — Add interactive demos to documentation
- **pr** — Open a pull request with proper formatting
- **video-report** — Debug user-reported video issues
- **web-renderer-test** — Add visual snapshot tests
- **writing-docs** — Documentation writing guidelines
