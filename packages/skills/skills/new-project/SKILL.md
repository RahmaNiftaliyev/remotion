---
name: new-project
description: Set up a new Remotion project in an empty folder or workspace. Use when the current directory has no existing project files.
metadata:
  tags: remotion, create, setup, new, project, scaffold
---

When in an empty folder or workspace with no existing project, scaffold a new Remotion project using:

```bash
npx create-video@latest --yes --blank --no-tailwind my-video
```

Replace `my-video` with a suitable project name.

### Flags

- `--yes` — Non-interactive mode, skips all prompts and skill installation.
- `--blank` — Uses the blank/empty template as a starting point.
- `--no-tailwind` — Skips adding TailwindCSS (can be omitted if Tailwind is desired).

After scaffolding, `cd` into the project directory and install dependencies:

```bash
cd my-video
npm install
```

Then start the Remotion Studio dev server:

```bash
npx remotion studio
```
