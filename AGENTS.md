# AGENTS.md

**Generated:** 2026-02-20
**Commit:** 1fcf9b0
**Branch:** main

## OVERVIEW

apex-fast is a Bun module (ES2021+) using TypeScript, Vitest, ESLint, Prettier. Early-stage project with extensive AI agent framework in `.agent/`.

## STRUCTURE

```
./
├── src/           # Source code (index.ts entry point)
├── .agent/        # AI agent framework (rules, agents, skills, workflows)
├── .mise/tasks/   # All task definitions (no package.json scripts)
└── dist/          # Build output (gitignored)
```

## WHERE TO LOOK

| Task         | Location                     | Notes                       |
| ------------ | ---------------------------- | --------------------------- |
| Main entry   | `src/index.ts`               | Public API exports          |
| Build config | `mise.toml` + `.mise/tasks/` | All commands via mise       |
| AI rules     | `.agent/rules/GEMINI.md`     | P0 priority - read first    |
| Validation   | `.agent/scripts/`            | checklist.py, verify_all.py |

## CONVENTIONS

- **Imports:** External first, then internal. Explicit `.ts` extensions. No barrel exports.
- **Types:** Strict mode. Never `any`, `@ts-ignore`, `@ts-expect-error`, `as any`.
- **Error Handling:** Check `error instanceof Error`. Prefix `[ERROR]`. No empty catches.
- **Pattern:** NeverNest (early returns over deep nesting).

## NAMING

| Type               | Convention             | Example         |
| ------------------ | ---------------------- | --------------- |
| Classes            | `PascalCase`           | `FastApply.ts`  |
| Methods/Properties | `camelCase`            | `applyEdit()`   |
| Constants          | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`   |
| Utilities          | `kebab-case.ts`        | `file-utils.ts` |

## COMMANDS

```bash
mise run setup     # Install dependencies
mise run build     # Build to dist/
mise run test      # Run Vitest
mise run lint      # ESLint (fix: mise run lint:fix)
mise run typecheck # tsc --noEmit
```

## ANTI-PATTERNS

- `any`, `@ts-ignore`, `@ts-expect-error`, `as any` - **NEVER**
- Empty catch blocks - **NEVER**
- Barrel exports - **NEVER**
- Deep nesting - **AVOID** (use early returns)

## TESTING

- Framework: Vitest (`describe`, `it`, `expect`)
- Location: `*.test.ts` alongside source files

## CI/CD

- PRs: `setup` → `lint` → `test` → `build`
- Releases: Release Please + NPM Trusted Publishing
- Branches: `feat/*`, `fix/*`, `docs/*`, `chore/*`
- Commits: Conventional (`feat:`, `fix:`, `docs:`, `chore:`)

## RULE PRIORITY

P0 (`.agent/rules/GEMINI.md`) > P1 (Agent `.md`) > P2 (`SKILL.md`)

**Before implementation:** Read GEMINI.md → Check agent frontmatter → Load skills.
