# gercastro.xyz — Portfolio & Public Work

Personal portfolio and project showcase for **Germán Castro**, Senior Fullstack Engineer with 11+ years of experience building SaaS products across Latin America. This monorepo hosts the site and doubles as a small reference for how I structure apps (Turborepo, strict Node pin, CI, Vercel).

**Live site:** [gercastro.xyz](https://gercastro.xyz)  
**Repository:** [github.com/gercas77/portfolio](https://github.com/gercas77/portfolio)

For service architecture and implementation details, see [`apps/README.md`](./apps/README.md).

---

## Repository layout

```
portfolio/
├── apps/
│   └── web/                 ← Next.js site (deploy this directory on Vercel)
├── packages/                ← Reserved for shared packages later
├── .github/workflows/
│   └── ci.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---


## Next steps

1. **Agent ergonomics** — Add a `**.agents`** folder (skills, rules, and related agent config) so the repo is consistent for AI-assisted workflows (e.g. Cursor).
2. **Landing design** — Iterate on hero, typography, spacing, and motion so the first screen matches the quality bar you want.
3. **Content** — Tune copy in `apps/web` (e.g. `src/lib/site.ts` and sections) as projects and positioning evolve.
4. **Terraform on AWS** — Define **Route 53 hosted zone** for `gercastro.xyz` and **DNS records pointing to Vercel** so all infrastructure **outside Vercel** (DNS / future AWS resources) is owned as code in Terraform, with Vercel remaining the app host.

