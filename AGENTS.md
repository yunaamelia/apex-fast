# AGENTS.md

**Generated:** 2026-02-20
**Commit:** e450823

## OVERVIEW

Bun/TypeScript library for AI agents to edit code/files. Includes MCP server (stdio + SSE modes). Published as `apex-fast` to npm.

## STRUCTURE

```
.
├── src/           # Source (4 TS files + tests co-located)
├── dist/          # Compiled output (gitignored)
├── .agent/        # Antigravity Kit framework (18 agents, 37 skills)
├── .sisyphus/     # Planning tool (unrelated to library)
└── .ansible/      # Infra automation (unrelated to library)
```

## WHERE TO LOOK

| Task            | Location                                   |
| --------------- | ------------------------------------------ |
| Library entry   | `src/index.ts` → `dist/index.js`           |
| CLI/MCP server  | `src/mcp-server.ts` → `dist/mcp-server.js` |
| Core plugin     | `src/fast-apply-plugin.ts`                 |
| Tests           | `src/*.test.ts` (co-located with source)   |
| Agent framework | `.agent/AGENTS.md`                         |

## CONVENTIONS

- **Tests**: Co-located with source (`*.test.ts`), not separate directory
- **Imports**: Group external first, internal second. Use explicit `.ts` extensions
- **NeverNest**: Exit early, avoid deep nesting
- **Error handling**: Check `error instanceof Error` before accessing props. Prefix with `[ERROR]`
- **Naming**: Classes `PascalCase`, methods `camelCase`, files `kebab-case.ts`

## ANTI-PATTERNS

- `as any`, `@ts-ignore`, `@ts-expect-error` — **NEVER**
- Empty catch blocks — **NEVER**
- Deleting failing tests — **NEVER**
- Barrel exports — **avoid** (index.ts re-export is exception)

## COMMANDS

```bash
mise run build     # or: bun build ./src/index.ts --outdir dist --target bun
mise run test      # or: bun test (vitest)
mise run lint      # or: eslint .
mise run lint:fix  # eslint --fix
mise run format    # prettier --write
```

## CI/CD

- **PRs**: `mise run setup` → `lint` → `test` → `build`
- **Release**: Release Please on main → dispatch to publish
- **Publish**: NPM OIDC Trusted Publishing (no API tokens)

## NOTES

- `mise run` tasks NOT defined in mise.toml (runs package.json scripts by convention)
