# Portfolio monorepo — agent context

Quick orientation for implementing changes. **Avoid loading all of [`apps/README.md`](./apps/README.md)** unless you need the full product write-up — it is long. Use the **documentation references** below and pull extra files only when the task requires them.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo (`pnpm-workspace.yaml`, `turbo.json`).
- **App:** Next.js 14 (App Router) in **`apps/web/`** — TypeScript, Tailwind, shadcn-style UI under `src/components/ui/`.
- **Deploy:** Docker + ECS (see `apps/web/Dockerfile`, `infra/`, `.github/workflows/deploy.yml`).

## Layout

| Area | Path |
|------|------|
| Pages & routes | `apps/web/src/app/` |
| Shared UI | `apps/web/src/components/` |
| Site copy & project list | `apps/web/src/lib/site.ts` |
| API route handlers | `apps/web/src/app/api/` |
| Auth / DB helpers | `apps/web/src/lib/auth.ts`, `apps/web/src/lib/mongodb.ts` |
| Infra (Terraform) | `infra/` |

## Commands (from repo root)

```bash
pnpm install
pnpm turbo lint
pnpm turbo build
```

Typecheck the web app:

```bash
cd apps/web && npx tsc --noEmit
```

## Conventions

- Prefer **4-space** indentation; match existing files in the same directory.
- **Frontend:** default exports for page components; `handle*` prefix for event handlers; Tailwind + theme variables from `globals.css` / `tailwind.config.ts`.
- **Route handlers:** `export async function GET|POST|…` in `route.ts`; validate inputs; avoid leaking stack traces to clients.

## Implementation plans

Feature plans live under **`documentation/tasks/YYYYMMDD_<slug>/README.md`** (see `.agents/skills/plan-feature/`).

---

## Documentation references (load on demand)

| Need | Open |
|------|------|
| **System architecture** — layers, ECS services, stack summary, key routes for the HN RAG work | [`.agents/references/architecture.md`](./.agents/references/architecture.md) |
| **Repo status** — domain not live yet, layout, high-level next steps | [`README.md`](./README.md) |
| **Full product & ops narrative** — delivery phases, costs, deep pipeline/RabbitMQ/MongoDB sections, Terraform walkthrough | [`apps/README.md`](./apps/README.md) |

**Rule of thumb:** start with **`AGENTS.md`** + **`architecture.md`** for backend/HN/infra tasks; open **`apps/README.md`** only when you need delivery-checklist detail, cost tables, or long design rationale.
