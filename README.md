# gercastro.xyz — Portfolio & Public Work

Personal portfolio and project showcase for **Germán Castro**, Senior Fullstack Engineer with 11+ years of experience building SaaS products across Latin America. This monorepo hosts the site and doubles as a small reference for how I structure apps (Turborepo, strict Node pin, CI, and deployment automation).

**Custom domain (`gercastro.xyz`):** not live yet — the app is built and much of the AWS stack is provisioned in Terraform, but the first production cutover is **still pending** (blocked on AWS account verification for CloudFront and related capacity). Treat `gercastro.xyz` as the **intended** URL until DNS and deployment catch up.

**Repository:** [github.com/gercas77/portfolio](https://github.com/gercas77/portfolio)

For current status, phases, and architecture, see [`apps/README.md`](./apps/README.md).

---

## Repository layout

```
portfolio/
├── apps/
│   └── web/                 ← Next.js site (Dockerfile for ECS; see apps/README)
├── documentation/tasks/    ← Dated implementation plans (see .agents/skills/plan-feature)
├── .agents/
│   ├── skills/            ← Agent skills (planning, UI, API, workflow)
│   └── references/        ← Focused docs (e.g. architecture) to avoid loading all of apps/README
├── packages/                ← Reserved for shared packages later
├── .github/workflows/
│   ├── ci.yml              ← PR: lint + build
│   └── deploy.yml          ← main: Docker build, ECR, ECS deploy
├── AGENTS.md                ← Short repo map for agents (commands, paths, doc index)
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---


## Next steps

Aligned with the delivery plan in [`apps/README.md`](./apps/README.md) — validation and most **Phase 1** infrastructure work are done; the custom domain is not serving traffic yet.

1. **Unblock AWS account verification** — Enable CloudFront distribution and EC2 auto scaling that the Terraform plan expects, so the stack can serve HTTPS on `gercastro.xyz`.
2. **First public deployment** — Run the GitHub Actions deploy pipeline end to end and ship the portfolio plus Hacker News showcase and auth-protected chat against seeded data on the domain.
3. **Phase 2–3 (Hacker News product)** — Live event-driven pipeline: RabbitMQ, Redis, ingestor / embedder / fetcher / summarizer containers; replace validation-only assumptions with continuous data (see apps README for the full checklist).
4. **Phase 4** — Production observability (e.g. Langfuse, tighter CloudWatch usage) on the live path.
5. **Portfolio polish** — Landing design (hero, typography, motion) and copy in `apps/web` (e.g. `src/lib/site.ts`) as positioning evolves.
6. **Agent workflows** — Skills under **`.agents/skills/`**; extra focused docs under **`.agents/references/`**. See **`AGENTS.md`** for commands, paths, and which doc to open when; feature plans under **`documentation/tasks/`**.

