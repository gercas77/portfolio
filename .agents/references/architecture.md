# Hacker News RAG — architecture (target design)

Companion to the Next.js app in [`apps/web/`](../../apps/web). The full narrative, costs, and delivery checklist live in [`apps/README.md`](../../apps/README.md). **Use this file** when you need **system shape, layers, and service boundaries** without loading the entire apps README.

## Scope

Event-driven ingestion of Hacker News stories, enrichment (content, embeddings, summaries), and a **RAG chat** over MongoDB Vector Search + OpenAI. The sections below describe the **target** deployment. **What is implemented today** is mostly the **web** app (portfolio + HN UI + `/api/chat` over **seeded** data); pipeline containers and RabbitMQ/Redis are **Phase 2–3** (see status in `apps/README.md`).

---

## Layers (data flow)

| Layer | Flow |
|-------|------|
| **Ingestion** | Firebase SSE → Ingestor → MongoDB (title + metadata) → publishes `story.created` |
| **Embedding** | `story.created` → Embedder → OpenAI `text-embedding-3-small` → MongoDB (vector) |
| **Fetch** | `story.created` → Fetcher → HTTP + Readability → MongoDB (content) → publishes `story.fetched` |
| **Summarization** | `story.fetched` → Summarizer → OpenAI `gpt-4o` → MongoDB (summary) |
| **Chat** | User → CloudFront (+ WAF) → Next.js `/api/chat` → LLM agent (`gpt-4o-mini`) → tool: search MongoDB (vectors + summary context) → streamed response |
| **Frontend** | User → CloudFront (+ WAF) → Next.js `/hackernews` (product UI) |

Embedding and fetch run in parallel from `story.created`. Summarization runs after a successful fetch.

---

## ECS target (single EC2 host)

| Service | Role | Exposed |
|---------|------|--------|
| **web** | Next.js — portfolio + API routes (chat, auth) | Public via CloudFront |
| **pipeline** | Ingestor, embedder, fetcher, summarizer (one process, shared connections) | Private |
| **rabbitmq** | AMQP broker; topology declared in code | Private |
| **redis** | Rate limiting (sliding window); ephemeral | Private |

---

## Stack (summary)

- **Runtime:** Node.js + TypeScript  
- **Frontend:** Next.js 14 (App Router), Tailwind, shadcn-style UI  
- **Broker:** RabbitMQ (topic exchange) — **planned** for live pipeline  
- **Database:** MongoDB Atlas + Vector Search  
- **LLM:** OpenAI (chat, summarization, embeddings)  
- **Auth:** Google OAuth (NextAuth.js) for protected chat  
- **Observability:** CloudWatch; Langfuse for LLM traces (target for prod path)  
- **Edge:** CloudFront, WAF, Route 53, ACM  
- **Infra:** Terraform, Docker, ECR, ECS on EC2  

---

## Web service (routes relevant to agents)

| Route | Role |
|-------|------|
| `/` | Portfolio landing |
| `/hackernews` | HN Insights showcase |
| `/hackernews/chat` | Authenticated chat UI |
| `/api/chat` | Streaming chat + `search_hn` tool → MongoDB |
| `/api/auth/*` | NextAuth |

Locally, chat runs against **seeded** `hn_articles`; live SSE → pipeline is not wired until later phases.

---

## When to open the full doc

Open **[`apps/README.md`](../../apps/README.md)** when you need: current status bullets, delivery phases, cost estimates, MongoDB/RabbitMQ details, Terraform module inventory, UX copy, or security notes — not for routine code edits that only need paths from **`AGENTS.md`** at repo root.
