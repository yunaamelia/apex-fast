# AGENTS.md

**Generated:** 2026-02-20
**Commit:** e450823

## OVERVIEW

AI agent framework (Antigravity Kit) for structured development workflows. Contains rules, specialized agents, skills, and validation scripts.

## STRUCTURE

```
.agent/
├── rules/         # P0 rules (GEMINI.md - always read first)
├── agents/        # 20 specialist agent definitions
├── skills/        # 37 skill modules with SKILL.md indexes
├── workflows/     # 11 workflow templates
├── scripts/       # 4 validation scripts
└── .shared/       # Shared resources
```

## WHERE TO LOOK

| Task              | Location                                        |
| ----------------- | ----------------------------------------------- |
| Global rules      | `rules/GEMINI.md`                               |
| Agent definitions | `agents/{agent}.md`                             |
| Skill guides      | `skills/{skill}/SKILL.md`                       |
| Workflows         | `workflows/{workflow}.md`                       |
| Validation        | `scripts/checklist.py`, `scripts/verify_all.py` |

## AGENTS (20)

| Category | Agents                                                                 |
| -------- | ---------------------------------------------------------------------- |
| Planning | orchestrator, project-planner, product-manager, product-owner          |
| Frontend | frontend-specialist, mobile-developer, game-developer                  |
| Backend  | backend-specialist, database-architect, devops-engineer                |
| Quality  | debugger, test-engineer, qa-automation-engineer, performance-optimizer |
| Security | security-auditor, penetration-tester                                   |
| Research | explorer-agent, code-archaeologist, seo-specialist                     |
| Docs     | documentation-writer                                                   |

## SKILLS (37)

| Category    | Skills                                                                                                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core        | clean-code, brainstorming, intelligent-routing, behavioral-modes                                                                                                                                                      |
| Frontend    | frontend-design, mobile-design, tailwind-patterns, web-design-guidelines                                                                                                                                              |
| Backend     | api-patterns, database-design, nodejs-best-practices                                                                                                                                                                  |
| Testing     | testing-patterns, tdd-workflow, webapp-testing                                                                                                                                                                        |
| DevOps      | deployment-procedures, server-management                                                                                                                                                                              |
| Security    | vulnerability-scanner, red-team-tactics                                                                                                                                                                               |
| Performance | performance-profiling                                                                                                                                                                                                 |
| Platform    | bash-linux, powershell-windows, rust-pro, python-patterns                                                                                                                                                             |
| Docs        | documentation-templates, plan-writing                                                                                                                                                                                 |
| Other       | architecture, seo-fundamentals, i18n-localization, mcp-builder, geo-fundamentals, game-development, parallel-agents, code-review-checklist, lint-and-validate, app-builder, nextjs-react-expert, systematic-debugging |

## WORKFLOWS (11)

| Workflow      | Purpose                      |
| ------------- | ---------------------------- |
| orchestrate   | Multi-agent coordination     |
| plan          | 4-phase planning methodology |
| create        | Feature creation             |
| debug         | Systematic debugging         |
| test          | Testing workflows            |
| deploy        | Deployment procedures        |
| brainstorm    | Ideation sessions            |
| enhance       | Code enhancement             |
| preview       | Preview generation           |
| status        | Status reporting             |
| ui-ux-pro-max | Maximum UI/UX quality        |

## SCRIPTS (4)

| Script             | Purpose                      |
| ------------------ | ---------------------------- |
| checklist.py       | Priority-based project audit |
| verify_all.py      | Full verification suite      |
| auto_preview.py    | Automatic preview generation |
| session_manager.py | Session state management     |

## USAGE

```
1. Read rules/GEMINI.md (P0 - always)
2. Identify agent from request domain
3. Read agent .md → Check frontmatter skills
4. Read SKILL.md index → Load specific sections only
5. Execute with agent persona + skill rules
```

## RULE PRIORITY

P0 (`rules/GEMINI.md`) > P1 (`agents/*.md`) > P2 (`skills/*/SKILL.md`)

All rules are binding. Conflict resolution: higher priority wins.
