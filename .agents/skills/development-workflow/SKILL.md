---
name: development-workflow
description: Enforces development workflow when implementing features or tasks. Covers module impact analysis, validation (lint, typecheck), and optional testing. Use when implementing new features, fixing bugs, or executing tasks from plans.
---

# Development Workflow

Follow this workflow before and after implementing any feature or task.

## 1. Module impact analysis

Before writing code, determine which parts of the monorepo are affected:

| Area | Path | Notes |
|------|------|--------|
| Portfolio marketing pages | `apps/web/src/app/page.tsx`, `apps/web/src/components/*-section.tsx` | Hero, about, projects, contact. |
| Hacker News showcase & chat | `apps/web/src/app/hackernews/` | Public showcase + authenticated chat UI. |
| API routes | `apps/web/src/app/api/` | Route handlers (`route.ts`), streaming, auth. |
| Site copy & project cards | `apps/web/src/lib/site.ts` | Names, descriptions, external links. |
| Auth & database | `apps/web/src/lib/auth.ts`, `apps/web/src/lib/mongodb.ts` | NextAuth, MongoDB client. |
| Infrastructure | `infra/` | Terraform; only touch when the task is infra-related. |
| CI/CD | `.github/workflows/` | Pipelines; coordinate workflow changes with deploy assumptions. |

State which rows the change touches before implementing. If the task spans App Router + infra, call that out explicitly.

## 2. Tests

This repo’s **web app does not yet wire a unit-test runner** (no Vitest/Jest script in `apps/web/package.json`). **Default validation:**

- `pnpm turbo lint` (from repo root)
- `cd apps/web && npx tsc --noEmit`
- Targeted manual checks for UI and API behavior

**When adding non-trivial business logic** (pure functions, parsers, pricing helpers), prefer **extracting testable pure functions** into dedicated modules so a test runner can be added later without refactoring call sites.

**Do not** block small fixes on inventing a test stack—do block obvious regressions with typecheck + lint.

## 3. Post-implementation

After completing a task:

- Run `pnpm turbo lint` from the repo root (or `pnpm turbo build` for broader checks before merge).
- Run `cd apps/web && npx tsc --noEmit`.
- Smoke-test affected routes locally when the change is user-facing.
