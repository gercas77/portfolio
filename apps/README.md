# Hacker News RAG Agent — Real-Time Intelligence

I am building an event-driven platform that ingests Hacker News stories in real time, enriches them with article content, generates embeddings, and exposes a conversational AI chat where users can ask questions about recent tech news using RAG (Retrieval-Augmented Generation).

**Live:** [gercastro.xyz](https://gercastro.xyz) — portfolio and showcase routes; the Hacker News chat and APIs need production secrets in Secrets Manager and (for RAG) appropriate MongoDB/seed data.

## Current Status

**Validation stage complete.** In the **Final Implementation Stage**, **Phase 1** is **complete**: **1.1** (auth, rate limits, protected chat) and **1.2** (Terraform, CI/CD, public URL, Secrets Manager → ECS). What remains in that stage is **Phase 2–4** (live pipeline, enrichment, hardening) — see [Delivery Plan](#delivery-plan).

What's built and working locally:

- Full chat experience over seeded HN data (~100 articles with embeddings, content, summaries)
- LLM agent with `search_hn` tool (OpenAI function calling, NDJSON streaming, citation rendering)
- Google OAuth, per-user rate limiting, execution metadata panel
- Public showcase page (`/hackernews`) + auth-protected chat (`/hackernews/chat`)

What's provisioned on AWS (Terraform):

- VPC, EC2 (ASG), ALB, ECS cluster and **web** service, Route 53, ACM wildcard, **CloudFront** + WAF, ECR, Secrets Manager, CloudWatch dashboard + alarms
- CI/CD (GitHub Actions: PR validation + **deploy on push to `main`**: ECR + ECS)
- Runtime config: a **Secrets Manager** JSON secret (`<project>-<env>/app-env`) is referenced from the **ECS task definition**; each JSON key is injected as a container environment variable. `NODE_ENV` and `NEXTAUTH_URL` are set in the task (not in the secret file).
- Multi-stage Dockerfile with Next.js standalone output

What's not built yet:

- Live event-driven pipeline (ingestor, embedder, fetcher, summarizer, RabbitMQ, Redis) — Phase 2-3
- Production observability (Langfuse integration, optional CloudFront access logs, deeper CloudWatch Insights) — Phase 4

The architecture sections below describe the **target system design**. The [Delivery Plan](#delivery-plan) section tracks what I have implemented and what remains.

## Purpose

I built this as a portfolio project to demonstrate production-grade engineering practices across:

- Event-driven architecture with RabbitMQ

- RAG with MongoDB Vector Search + OpenAI

- Agentic patterns (LLM with tool use)

- Infrastructure as Code with Terraform

- Containerized deployment on AWS ECS

- Observability, rate limiting, and auth

I chose Hacker News because it provides a publicly verifiable, text-rich, real-time data source that any technical reviewer can validate.

## Architecture Overview (Target Design)

<table>
  <tr>
    <th>Layer</th>
    <th>Flow</th>
  </tr>
  <tr>
    <td><strong>Ingestion</strong></td>
    <td>Firebase SSE → Ingestor → MongoDB (title + metadata) → publishes <code>story.created</code></td>
  </tr>
  <tr>
    <td><strong>Embedding</strong></td>
    <td><code>story.created</code> → Embedder → OpenAI <code>text-embedding-3-small</code> (circuit breaker) → MongoDB (vector)</td>
  </tr>
  <tr>
    <td><strong>Fetch</strong></td>
    <td><code>story.created</code> → Fetcher → HTTP + Readability → MongoDB (content) → publishes <code>story.fetched</code></td>
  </tr>
  <tr>
    <td><strong>Summarization</strong></td>
    <td><code>story.fetched</code> → Summarizer → OpenAI <code>gpt-4o</code> (circuit breaker) → MongoDB (summary)</td>
  </tr>
  <tr>
    <td><strong>Chat</strong></td>
    <td>User → CloudFront (+ WAF) → Next.js <code>/api/chat</code> → LLM Agent (<code>gpt-4o-mini</code>) → Tool: search MongoDB (vector match + summary context) → streamed response</td>
  </tr>
  <tr>
    <td><strong>Frontend</strong></td>
    <td>User → CloudFront (+ WAF) → Next.js <code>/hackernews</code> (chat UI)</td>
  </tr>
</table>

Embedding and fetch run in parallel from the same `story.created` event. Summarization runs only after a successful fetch.

The target deployment runs four containers on a single EC2 instance managed by ECS:

<table>
  <tr>
    <th>Service</th>
    <th>Role</th>
    <th>Exposed</th>
  </tr>
  <tr>
    <td><strong>web</strong></td>
    <td>Next.js — frontend + API routes (chat, auth)</td>
    <td>Public via CloudFront</td>
  </tr>
  <tr>
    <td><strong>pipeline</strong></td>
    <td>Single Node.js process running four logical components: ingestor (SSE → MongoDB → RabbitMQ), embedder (title → vector), fetcher (URL → content), summarizer (content → summary). Shares one RabbitMQ connection, one MongoDB connection, and one logging context.</td>
    <td>Private</td>
  </tr>
  <tr>
    <td colspan="3"><strong>Infrastructure services</strong> — stateful services that support the application but are not application logic. Both run as separate containers because they have their own processes and lifecycle.</td>
  </tr>
  <tr>
    <td><strong>rabbitmq</strong></td>
    <td>Message broker (AMQP). Exchange/queue/binding configuration is declared in pipeline code via <code>assertExchange</code>/<code>assertQueue</code>, keeping messaging topology visible and versioned in the codebase.</td>
    <td>Private</td>
  </tr>
  <tr>
    <td><strong>redis</strong></td>
    <td>Rate limiting counters (sliding window). Ephemeral data — if the container restarts, counters reset and users temporarily regain their request budget. No persistence needed.</td>
    <td>Private</td>
  </tr>
</table>

## Stack

- **Runtime:** Node.js + TypeScript (all services)

- **Frontend:** Next.js 14 (App Router), Tailwind, shadcn/ui

- **Message broker:** RabbitMQ (AMQP, topic exchange)

- **Database:** MongoDB Atlas (free tier) with Vector Search index

- **LLM:** OpenAI (gpt-4o-mini for chat, gpt-4o for article summarization, text-embedding-3-small for embeddings)

- **Auth:** Google OAuth via NextAuth.js

- **Observability:** CloudWatch (logs + metrics), Langfuse (LLM traces)

- **Rate limiting:** Redis (sliding window, self-hosted container) + AWS WAF

- **Infra:** Terraform, Docker, ECR, ECS on EC2, CloudFront, WAF, Route 53, ACM

- **CI/CD:** GitHub Actions → build → push ECR → deploy ECS

---

## Services

> I have implemented and validated the **web** service locally. The **pipeline**, **rabbitmq**, and **redis** services are designed but not yet implemented (Phase 2-3).

### web ✅

Next.js application serving the portfolio site and the **Hacker News RAG Agent** feature.

**Routes:**

- `/` — Portfolio landing

- `/hackernews` — Hacker News RAG Agent showcase (entry to the chat product)

- `/api/chat` — Chat endpoint. Runs an LLM agent with a `search_hn` tool that queries MongoDB Vector Search (title embeddings) with semantic query + structured filters (date range, score, etc.). Matched articles include their summary (when available) as context for the response

- `/api/auth/`* — Google OAuth flow via NextAuth.js

**Key behaviors:**

- Auth required to use the chat

- Rate limited: 20 messages/hour per authenticated user (Redis, sliding window)

- Request logging middleware: method, path, status, duration → CloudWatch via stdout

- Each chat response includes execution metadata (query generated, filters applied, documents found, tokens consumed, latency per step) displayable on-demand in the UI

**Chat flow:**

1. User sends a message

2. Server persists the user message to `hn_chat_messages`, loads the last 5 messages for that `userId` as conversation context (configurable in code)

3. LLM agent (gpt-4o-mini) receives the conversation context with a system prompt scoped to HN tech news queries. Decides whether to invoke the `search_hn` tool or respond with a fallback ("I can only help with tech news queries")

5. If tool is invoked: LLM generates semantic query + structured filters + document limit → MongoDB Vector Search on title embeddings (pre-filtered by date) → matched articles returned with title, URL, score, and summary (when available) as context → LLM generates final response

6. Server persists the assistant message to `hn_chat_messages` with `inference` metadata (model used, tokens, cost, tool calls, latency, Langfuse trace ID)

7. Response is streamed to the client. Execution metadata is available on-demand in the UI for transparency

**Prompt injection mitigation:** system prompt explicitly constrains the agent's scope and instructs it to reject off-topic or manipulative inputs.

### pipeline (Phase 2-3)

Single Node.js process that runs four logical components: ingestor, embedder, fetcher, and summarizer. All share one RabbitMQ connection, one MongoDB connection, and common infrastructure (logging, circuit breakers, graceful shutdown). Each component is a separate module with its own queue subscription and handler — logically independent but operationally unified.

#### Ingestor

Long-running component that maintains an SSE connection to the HN Firebase API.

**Data sources:**

- `https://hacker-news.firebaseio.com/v0/topstories.json` (SSE)

- `https://hacker-news.firebaseio.com/v0/newstories.json` (SSE)

- `https://hacker-news.firebaseio.com/v0/beststories.json` (SSE)

- `https://hacker-news.firebaseio.com/v0/showstories.json` (SSE)

**Flow:**

1. Connects via SSE, receives array of story IDs on each update

2. Diffs against known IDs to detect new stories

3. Fetches story detail from `/v0/item/{id}.json`

4. Filters: only `type: "story"`, ignores jobs/polls

5. Writes the story to MongoDB `hn_articles` via upsert on `hnId` (title, URL, score, metadata only — no status fields). Downstream consumers are triggered by the RabbitMQ event, not by polling status fields

6. Publishes the `hnId` to RabbitMQ exchange `hn-events` with routing key `story.created`. Messages carry only the ID — consumers fetch what they need from MongoDB. Both the embedding and fetch queues receive this event in parallel

**Deduplication and delivery semantics:** the ingestor maintains an in-memory `Set<number>` of recently seen story IDs. Since the SSE feeds push the full top/new/best/show arrays on every update, the same story ID appears across multiple feeds and multiple updates. This gives effective single-publish behavior during normal runtime, but delivery is still **at-least-once** across restarts. The set is bounded (capped at ~10,000 IDs, oldest evicted) since stories older than a few hours naturally rotate out of all feeds. On restart, the set is empty — but MongoDB upsert on `hnId` and consumer idempotency make re-published events safe.

**Publisher confirms:** RabbitMQ channel is opened in **confirm mode**. Each publish waits for a broker ack before the message is considered sent. If the broker nacks or the connection drops mid-publish, the ingestor logs the failure and retries on the next SSE update cycle (the story ID remains in the incoming array until it rotates out).

**Resilience:** auto-reconnects on SSE disconnection (built into the protocol via `Last-Event-ID`).

**Observability:** logs structured events for stories detected per hour, SSE reconnections, RabbitMQ publish errors, and dedup set size (to detect memory leaks).

#### Consumer shared behavior

All three consumers (embedder, fetcher, summarizer) follow the same patterns:

**Idempotency:** before processing, each consumer checks if its `jsonData` section already exists (any status). If so, the message is acked and skipped — no external call is made. To reprocess an article, clear the corresponding `jsonData` section and data field (`embedding`, `content`, or `summary`).

**Failure handling:** on any processing or write failure, the message is nacked with requeue. Main consumer queues are declared as **quorum queues** with `x-delivery-limit: 3` and dead-lettering configured, so a message that exceeds 3 deliveries is routed to the consumer's DLQ. The consumer writes the error to its `jsonData` section with `status: "FAILED"`. If the consumer crashes mid-processing, RabbitMQ redelivers the unacked message — idempotency makes this safe.

**Circuit breaker (embedder + summarizer):** both OpenAI-dependent consumers implement independent circuit breakers (different models can have independent outages):

- **Closed** (normal): requests flow to OpenAI. After **3 consecutive failures**, the circuit **opens**.
- **Open**: consumer **unsubscribes** from its queue. Messages accumulate safely in RabbitMQ (no retry budget consumed). A health check pings OpenAI every **30 seconds**.
- **Half-open**: on health check success, the consumer re-subscribes and processes one message as a probe. Success → **close**. Failure → re-open.

**Backpressure:** all consumers use `prefetch: 5`. This bounds concurrency while keeping throughput adequate for the volume (~400 stories/day). Queue bindings, DLX routing, and prefetch values are documented in the rabbitmq section below.

**Queue health logging:** the pipeline periodically polls `channel.checkQueue()` for all queues (main + DLQ) and logs `messageCount` and `consumerCount` as structured JSON. These logs reach CloudWatch automatically via stdout and are queryable with CloudWatch Insights — no additional monitoring infrastructure needed.

**Observability:** each consumer logs processing time, errors, redelivery count, and circuit breaker state transitions (embedder + summarizer). Queue health logs provide continuous visibility into queue depth and DLQ accumulation without requiring access to the RabbitMQ Management UI.

#### Embedder

Generates vector embeddings from article titles. Runs in parallel with the fetcher — articles become searchable immediately after ingestion, without waiting for content extraction or summarization.

**Flow:**

1. Consumes `hnId` from queue `embedding-generation` (`story.created`)

2. Reads the article title from MongoDB

3. Generates embedding via OpenAI `text-embedding-3-small`

4. Updates the document with the embedding vector and sets `jsonData.embedding` with `status: "COMPLETED"`

#### Fetcher

Extracts article content from URLs. Runs in parallel with the embedder. Only successfully fetched articles flow to the summarizer.

**Flow:**

1. Consumes `hnId` from queue `content-fetch` (`story.created`)

2. Reads the article URL from MongoDB

3. Checks URL against a static domain blacklist (paywalled sites, bot-protected domains). Blacklisted → sets `jsonData.fetch` with `status: "SKIPPED"` and reason, acks, no HTTP request

4. Extracts content via `ArticleExtractor` (default: HTTP fetch + Mozilla Readability parser; I designed the interface for plug-and-play replacement with Playwright or an external service)

5. On success: updates document with `content`, sets `jsonData.fetch` with `status: "COMPLETED"`, publishes `hnId` with routing key `story.fetched`

6. On failure: sets `jsonData.fetch` with `status: "FAILED"` and error. Does **not** publish to summarization queue

**Domain blacklist:** static list of domains that consistently block automated fetching. Short-circuits known failures — avoids wasting retry budget. Extensible based on observed patterns in `jsonData.fetch.error`.

#### Summarizer

Generates summaries of fetched article content using gpt-4o. Only processes articles that were successfully fetched. The summary serves as rich context for the chat agent's responses — it is not used for vector search.

**Flow:**

1. Consumes `hnId` from queue `summarization` (`story.fetched`)

2. Reads the article content + title from MongoDB

3. Generates summary via OpenAI gpt-4o (~200-300 words)

4. Updates the document with the `summary` and sets `jsonData.summary` with `status: "COMPLETED"`

On redelivery after a crash between the OpenAI call and the MongoDB write, the summary is regenerated — same input produces equivalent output, and the cost of one redundant gpt-4o call is negligible vs. the complexity of preventing it.

### Infrastructure services (Phase 2)

#### rabbitmq

Standard RabbitMQ instance running in its own container. Separate from the pipeline because it is a stateful broker with its own process — not application logic.

**Exchanges:**

- `hn-events` (type: topic) — main event exchange
- `hn-events-dlx` (type: topic) — dead letter exchange

**Queue type/config:**

- Main consumer queues (`embedding-generation`, `content-fetch`, `summarization`) are declared as **quorum queues** with `x-delivery-limit: 3`, dead-letter exchange `hn-events-dlx`, and queue-specific dead-letter routing keys.
- DLQ queues (`*-dlq`) are durable queues bound to `hn-events-dlx`.
- Queue arguments are declared in code at startup via `assertQueue(...)` to keep retry/DLQ behavior explicit and versioned.

**Queues and bindings:**

<table>
  <tr>
    <th>Queue</th>
    <th>Binding key</th>
    <th>Dead letter</th>
    <th>Purpose</th>
  </tr>
  <tr>
    <td><code>embedding-generation</code></td>
    <td><code>story.created</code></td>
    <td><code>embedding-generation-dlq</code></td>
    <td>Title → vector embedding</td>
  </tr>
  <tr>
    <td><code>content-fetch</code></td>
    <td><code>story.created</code></td>
    <td><code>content-fetch-dlq</code></td>
    <td>URL → article content</td>
  </tr>
  <tr>
    <td><code>summarization</code></td>
    <td><code>story.fetched</code></td>
    <td><code>summarization-dlq</code></td>
    <td>Content → summary (gpt-4o)</td>
  </tr>
  <tr>
    <td><code>embedding-generation-dlq</code></td>
    <td>—</td>
    <td>—</td>
    <td>Failed embeddings</td>
  </tr>
  <tr>
    <td><code>content-fetch-dlq</code></td>
    <td>—</td>
    <td>—</td>
    <td>Failed fetches</td>
  </tr>
  <tr>
    <td><code>summarization-dlq</code></td>
    <td>—</td>
    <td>—</td>
    <td>Failed summarizations</td>
  </tr>
</table>

**Message flow:**

```
                    ┌→ story.created → [embedding-generation] → Embedder
                    │                        ↓ (after 3 deliveries)
                    │               [embedding-generation-dlq]
                    │
Ingestor ──────────┤
                    │
                    └→ story.created → [content-fetch] → Fetcher → story.fetched → [summarization] → Summarizer
                                            ↓ (after 3 deliveries)                      ↓ (after 3 deliveries)
                                      [content-fetch-dlq]                         [summarization-dlq]
```

The topic exchange pattern allows adding new consumers without modifying publishers. Both `embedding-generation` and `content-fetch` bind to `story.created` — a single publish fans out to both queues. A future `notifications` queue could bind to `story.*` to receive all story events.

#### redis

Standard Redis instance. Key pattern: `ratelimit:{userId}` — sliding window counter, 20 messages/hour. No persistence. The web service checks the counter before forwarding the request to the LLM agent — rejected requests never reach OpenAI.

---

## Data Model (MongoDB Atlas)

### Collection: `users`

```

{

  email: string,

  name: string,

  pictureUrl: string,

  createdAt: Date,

  lastLoginAt: Date

}

```

### Collection: `hn_chat_messages`

```

{

  userId: ObjectId,                // references users collection — one chat per user
  role: "user" | "assistant",
  contentMarkdown: string,

  // only present when role: "assistant"
  inference: {
    model: "gpt-4o-mini",
    tokensIn: number,
    tokensOut: number,
    estimatedCostUsd: number,      // calculated: tokens × model price lookup
    toolCalls: [{
      name: "search_hn",
      args: { query: string, filters: object, limit: number },
      resultsCount: number
    }] | [],
    latencyMs: number,
    langfuseTraceId: string
  } | null,

  createdAt: Date

}

```

Each user has a single chat. The conversation is the ordered sequence of `hn_chat_messages` for that `userId`. The `inference` field captures execution metadata per assistant response — tokens, cost, tool calls with search arguments, and a link to the full Langfuse trace. This serves both observability (what is the system doing) and product analytics (what are users asking, at what cost).

### Collection: `hn_articles`

```

{

  hnId: number,                    // unique index — idempotency key
  title: string,
  url: string,
  score: number,
  author: string,
  descendants: number,

  // Embedding (embedder) — generated from title
  embedding: number[] | null,      // 1536-dim vector (text-embedding-3-small)

  // Content extraction (fetcher)
  content: string | null,          // extracted article text

  // Summarization (summarizer) — only for successfully fetched articles
  summary: string | null,          // gpt-4o generated summary (~200-300 words)

  // Pipeline metadata — each consumer writes its section on completion or failure.
  // null = not yet processed (no status field needed — the event drives execution, not polling).
  // Status distinguishes COMPLETED/FAILED/SKIPPED from "never attempted".
  jsonData: {
    embedding: {
      status: "COMPLETED" | "FAILED",
      completedAt: Date | null,
      error: string | null
    } | null,
    fetch: {
      status: "COMPLETED" | "FAILED" | "SKIPPED",
      method: "readability" | null,
      completedAt: Date | null,
      error: string | null,        // last error message if failed
      skippedReason: string | null // e.g., "blacklisted domain: nytimes.com"
    } | null,
    summary: {
      status: "COMPLETED" | "FAILED",
      completedAt: Date | null,
      tokensIn: number | null,
      tokensOut: number | null,
      error: string | null
    } | null                       // null if not yet processed or content was never fetched
  },

  hnPostedAt: Date,                // original HN timestamp
  createdAt: Date,                 // when ingestor first saw it
  expireAt: Date                   // TTL: createdAt + 30 days

}

```

**Indexes:**

- Unique index on `hnId` — idempotency guarantee
- TTL index on `expireAt` — automatic cleanup after 30 days
- Vector Search index on `embedding` — RAG queries with pre-filtering on `hnPostedAt`

---

## Infrastructure

I defined all infrastructure with Terraform in `/infra`, organized as reusable modules (`networking`, `ecs`, `cdn`, `dns`, `ecr`, `secrets`, `monitoring`). Remote state is stored in S3 with DynamoDB locking.

> Provisioned resources are marked ✅. Resources planned for future phases are marked 📋.

### AWS Resources

- ✅ **VPC** with public subnets across 2 AZs (no NAT gateway — EC2 instances in public subnets, restricted by security groups)

- ✅ **EC2** (e.g. t3.medium) running ECS-optimized Amazon Linux 2023 AMI, managed by an Auto Scaling Group

- ✅ **ECS cluster** with EC2 capacity provider. Currently defines the **web** service task; pipeline, RabbitMQ, and Redis task definitions are 📋 Phase 2-3

- ✅ **ALB** with HTTPS listener (TLS 1.3) + HTTP→HTTPS redirect

- ✅ **ECR** repository for the web image (lifecycle: keep last N images). A separate pipeline image is 📋 Phase 2

- ✅ **CloudFront distribution** in front of the ALB (HTTPS, caching for `/_next/static/*`, WAF, origin: ALB)

- ✅ **ACM certificate** (wildcard `*.gercastro.xyz` + apex) with DNS validation via Route 53

- ✅ **Route 53** hosted zone for `gercastro.xyz` (A records alias to CloudFront)

- ✅ **Security groups:** ALB accepts HTTP/HTTPS from the internet; EC2 instances accept traffic only from the ALB security group. No direct public access to instances

- ✅ **WAF** web ACL attached to CloudFront: IP rate limiting (2000 req/5min) + AWS managed common rule set

- ✅ **Secrets Manager** for application secrets (see ECS task: JSON keys for `MONGODB_URI`, `MONGODB_DB_NAME`, OAuth, `OPENAI_API_KEY`, `NEXTAUTH_SECRET`, etc.; fill the secret in AWS, then deploy)

- ✅ **CloudWatch** dashboard (ECS CPU/memory + ALB requests/errors), CPU utilization alarm, 5xx alarm

### External Services

- **MongoDB Atlas** (free tier, us-east-1) — database + Vector Search

- **OpenAI API** — embeddings + chat completions

- **Langfuse** (cloud free tier) — LLM observability

### CI/CD (GitHub Actions) ✅

Two workflows:

- **`ci.yml`** (on PR to `main`): lint + typecheck via Turborepo
- **`deploy.yml`** (on push to `main`): lint → Docker build (multi-stage, Next.js standalone) → push to ECR (tagged with git SHA + `latest`) → update ECS task definition → force new deployment

---

## Design Decisions

**Why Hacker News?**

I needed a publicly verifiable, real-time data source with text-rich content suitable for RAG. HN stories and their linked articles provide semantic depth that makes vector search meaningful — unlike purely numerical/tabular data (e.g., earthquakes) where structured queries would suffice. Any reviewer can verify the system works by comparing chat answers against actual HN content.

**Why one pipeline service instead of four separate containers?**

The ingestor, embedder, fetcher, and summarizer are logically independent (separate queues, separate handlers) but operationally simple enough to share a process. One container means: one RabbitMQ connection, one MongoDB connection, one Docker image, one ECS task definition, one log stream. Circuit breakers and queue subscriptions are independent objects in memory — they don't need process isolation to function correctly. The tradeoff is that a crash in one component restarts all four, but at ~400 stories/day the recovery cost (RabbitMQ redelivers unacked messages) is negligible. If any component needed independent scaling, I could split it into its own container — the code is already modular.

**Why RabbitMQ as a container instead of Amazon MQ?**

Two reasons. First, the exchange/queue/binding configuration is declared in application code via `assertExchange`/`assertQueue`/`bindQueue` — visible, versioned, and reviewable alongside the consumers that use them. Amazon MQ wouldn't change this (the AMQP client code is the same), but self-hosting keeps the entire messaging topology in the repo with zero external console configuration. Second, cost: Amazon MQ starts at ~$25/month for the smallest instance (mq.t3.micro), which would nearly triple the infrastructure cost. The tradeoff is that if the EC2 instance dies, in-flight messages in RabbitMQ are lost — but since pipeline results are persisted in MongoDB, any lost messages only affect articles that hadn't been processed yet. New stories from SSE will continue to flow on restart.

**Why RabbitMQ over Kafka, Redis Streams, or SQS?**

RabbitMQ is the right tool for this volume (hundreds of events/day). Kafka is designed for millions of events per second and adds operational complexity that isn't justified here. Redis Streams would work but offers weaker delivery guarantees. SQS is a black box — I chose RabbitMQ's exchange/queue/binding model because it is visible in the codebase and lets me demonstrate messaging patterns (topic routing, dead letter queues, consumer acknowledgments) explicitly.

**Why ECS on EC2 instead of Fargate?**

Cost and control. For an always-on, low-throughput workload, a single EC2 instance running ECS is typically cheaper than equivalent always-on Fargate tasks plus supporting networking components. The added complexity is in Terraform — provisioning the instance with an ECS-optimized AMI, registering it to the cluster, and mapping all four task definitions to a single instance. That complexity lives in infrastructure code, not application code. I also wanted to work with the EC2 launch type specifically because it exercises deeper AWS knowledge than a purely managed deploy.

**Why CloudFront + ALB instead of just ALB?**

CloudFront adds edge caching for static assets (`/_next/static/*`), global TLS termination, and WAF attachment at the CDN layer. The ALB handles health checks, target group routing, and HTTPS termination at the origin. At this traffic profile (mostly recruiter visits), CloudFront's static asset caching eliminates redundant origin requests and the WAF rate-limiting provides baseline DDoS protection without additional per-request cost at the ALB.

**Why not Vercel for the frontend?**

Since the backend already runs on AWS, I chose to keep everything in one platform to simplify networking (internal communication within the VPC), CI/CD (single pipeline), and infrastructure management (single Terraform state). This also gave me the opportunity to deploy Next.js in a containerized environment, which is more representative of enterprise setups than Vercel.

**Why an LLM agent with tools instead of a sequential pipeline?**

A sequential pipeline (classify intent → generate query → search → respond) works but is rigid. An agent with a `search_hn` tool implicitly handles intent classification (it simply doesn't call the tool for off-topic queries), is extensible (adding a new tool doesn't require pipeline changes), and reflects the agentic pattern that the industry is adopting. The tradeoff of less deterministic behavior is mitigated by a constrained system prompt and Langfuse observability.

**Why fetch + Readability instead of Playwright for article extraction?**

Most HN-linked articles are server-rendered blogs and documentation that don't require JavaScript execution. Playwright is slower (seconds vs. milliseconds), heavier (requires Chromium), and harder to run in a container. I designed the `ArticleExtractor` interface so Playwright or an external service can be swapped in without touching the rest of the pipeline.

**Why self-hosted Redis instead of Upstash?**

Rate limiting counters are ephemeral and latency-sensitive. A Redis container on the same EC2 instance gives sub-millisecond access with zero external dependencies. Upstash would add a network roundtrip for every rate limit check and an external service dependency for data that is inherently disposable. The container uses ~5MB of RAM, no persistence configured — if it restarts, users temporarily regain their request budget, which is an acceptable tradeoff. This also follows the same pattern as RabbitMQ: I prefer self-hosted infrastructure services that keep the stack self-contained.

**Why CloudWatch + Langfuse instead of New Relic/Datadog?**

CloudWatch comes free with ECS — container logs and basic infra metrics require zero configuration. Langfuse fills the specific gap of LLM observability (traces, token usage, tool call inspection) that generic APM tools don't cover well. This combination costs $0 and covers all critical observability needs. I can add New Relic or Datadog later as a plug-in enhancement if needed.

**Why upsert on hnId instead of insertOne + catch duplicate?**

A unique index on `hnId` is the real guarantee — it prevents duplicates at the database level regardless of application logic. Given that index, the choice is between `insertOne` (catch `E11000` duplicate key error on redelivery) and `updateOne` with `upsert: true`. Both are correct. I prefer upsert here because: (1) redelivery is a normal event in RabbitMQ, not an exception — modeling it as a silent overwrite is cleaner than a try/catch for expected errors, and (2) HN story metadata (score, descendants) updates constantly, so a redelivered message with fresher data naturally wins via overwrite. With insertOne, that update would be silently discarded.

**Why enqueue only IDs instead of full payloads?**

Messages carry only the `hnId`. Each consumer reads what it needs from MongoDB. This keeps messages small (bytes, not kilobytes), avoids duplicating article content across queues, and means consumers always work with the latest document state — not a stale snapshot from when the message was published. The tradeoff is an extra MongoDB read per consumer per message, but at ~400 stories/day this is negligible (~1,200 reads/day across three consumers, all within the same process sharing one connection pool).

**Why three parallel pipelines (embedding, fetch, summarization) instead of a sequential chain?**

Each pipeline has a different dependency, failure profile, and criticality:

- **Embedding** (OpenAI embedding API): makes articles searchable. Highest priority — without it, the article doesn't exist for users. Runs immediately on ingestion because it only needs the title, which is always available.
- **Fetching** (external HTTP): extracts article content. I/O bound, fails per-URL (paywall, timeout), non-correlated failures. Independent of OpenAI.
- **Summarization** (OpenAI gpt-4o): generates rich context for agent responses. Only possible after successful fetch. Enhancement, not critical path.

In a sequential chain, a fetch failure or OpenAI outage delays everything downstream. With parallel pipelines, an article is searchable in seconds (embedding completes) even if the fetch takes 5 seconds or the summarizer's circuit breaker is open. Each pipeline progresses independently and the document accumulates state progressively.

**Why embed titles only instead of full content or summaries?**

Consistency. If some embeddings represent titles and others represent full summaries, vector similarity scores become inconsistent — short, dense title embeddings and long, detailed summary embeddings occupy different regions of the vector space. Title-only embeddings ensure all vectors represent the same thing: what the article is about (topic-level). This makes search results comparable across all articles regardless of fetch success. Summaries serve a different purpose: providing the agent with rich context to generate informed responses, not improving search ranking.

Title embeddings are effective for topic-level matching — including semantic queries with zero keyword overlap (I validated this locally at 8/10 rank-1 accuracy on synonym-only queries). The known limitation is that queries about specific details mentioned only in the article body (not the title) won't match. The natural next step would be content chunking: splitting article text into ~200-400 token segments, embedding each chunk independently, and searching at chunk level. This would enable matching on specific claims, code snippets, or arguments within articles. It is out of scope for the current build but the architecture supports it — a new `chunk-embedding` consumer could bind to `story.fetched` alongside the summarizer without modifying existing pipelines.

**Why track pipeline status in MongoDB instead of relying on RabbitMQ DLQ?**

The DLQ tells you "something failed" but not the full story. With `jsonData.embedding.status`, `jsonData.fetch.status`, `jsonData.summary.status` and their associated metadata in the document, you can query: how many articles are stuck? At which stage? What was the last error? This enables a recovery job that re-enqueues failed documents without touching the DLQ at all — MongoDB becomes the source of truth for pipeline state, and RabbitMQ is purely a transport mechanism. The tradeoff is that every consumer must update metadata on both success and failure, but this is a few extra fields per write, not a meaningful cost.

**Why nack-to-DLQ instead of infinite retries?**

Infinite retries with exponential backoff sound robust but create a hidden problem: a single poison message (e.g., an article that crashes the parser) blocks the queue behind it (head-of-line blocking in a single-consumer setup). Moving failures to a DLQ after 3 deliveries keeps the main queue flowing. DLQ messages are inspectable, replayable, and countable — a DLQ depth alert is a better operational signal than a silently retrying consumer.

**Why 30-day TTL on articles?**

The chat is about "recent tech news." Articles older than 30 days are stale for this use case, and keeping them indefinitely grows storage and vector index size without adding value. MongoDB's TTL index handles cleanup automatically with zero application code.

**Why Google OAuth?**

It's the simplest auth flow to implement (NextAuth.js handles it in minutes), requires no password management, and serves my goal of tracking who uses the system. I kept the user model intentionally minimal (email, name, picture) — just enough to identify users for rate limiting and usage analytics.

---

## Observability (Target)

> I configured infrastructure metrics and application logs via Terraform (CloudWatch log groups, dashboard, alarms). LLM tracing (Langfuse) and pipeline observability will be implemented in Phase 3-4.

<table>
  <tr>
    <th>Layer</th>
    <th>What</th>
    <th>How</th>
  </tr>
  <tr>
    <td><strong>Infrastructure</strong></td>
    <td>CPU, memory, CloudFront request count, error rates, cache hit ratio</td>
    <td>CloudWatch metrics (automatic with ECS + CloudFront)</td>
  </tr>
  <tr>
    <td><strong>Application logs</strong></td>
    <td>Structured JSON logs from all services</td>
    <td>pino → stdout → CloudWatch Logs</td>
  </tr>
  <tr>
    <td><strong>API performance</strong></td>
    <td>Response times, status codes per route</td>
    <td>Custom Next.js middleware → CloudWatch</td>
  </tr>
  <tr>
    <td><strong>CloudFront access logs</strong></td>
    <td>Full request/response metadata</td>
    <td>CloudFront standard logs → S3 (optional)</td>
  </tr>
  <tr>
    <td><strong>LLM traces</strong></td>
    <td>Per-conversation: tool calls, parameters, tokens, latency per step</td>
    <td>Langfuse</td>
  </tr>
  <tr>
    <td><strong>User-facing</strong></td>
    <td>Execution metadata per chat message (query, filters, docs found, tokens, timing)</td>
    <td>Returned in API response, displayed on-demand in UI</td>
  </tr>
  <tr>
    <td><strong>Pipeline</strong></td>
    <td>Fetch success/skip/fail rates, embedding throughput, summarization throughput, DLQ depths per queue, circuit breaker state</td>
    <td>Structured logs → CloudWatch Logs. Queue depths via periodic <code>checkQueue()</code> polling. Queryable with CloudWatch Insights</td>
  </tr>
</table>

---

## Cost Analysis

I designed the system to run at minimal cost. Exact figures TBD after real usage profiling — the structure below reflects the cost model and split.

### Volume assumptions

HN publishes ~300-500 new stories per day. With ~70% having fetchable article content averaging ~2,000 words (~2,700 tokens), and ~30% falling back to title-only (~15 tokens):

<table>
  <tr>
    <th>Component</th>
    <th>Calculation</th>
    <th>Monthly cost</th>
  </tr>
  <tr>
    <td><strong>EC2 (t3.medium on-demand)</strong></td>
    <td>1 instance × $0.0416/hr × 730 hrs</td>
    <td>~$TBD</td>
  </tr>
  <tr>
    <td><strong>OpenAI embeddings</strong> (text-embedding-3-small)</td>
    <td>~15,000 stories × ~20 avg title tokens × $0.02/1M tokens</td>
    <td>~$TBD</td>
  </tr>
  <tr>
    <td><strong>OpenAI summarization</strong> (gpt-4o)</td>
    <td>~X successfully fetched articles/day × ~Y tokens/article × $5/1M input + $15/1M output</td>
    <td>~$TBD</td>
  </tr>
  <tr>
    <td><strong>OpenAI chat</strong> (gpt-4o-mini)</td>
    <td>~X queries/day × ~Y tokens/query × $0.15/1M input + $0.60/1M output</td>
    <td>~$TBD</td>
  </tr>
  <tr>
    <td><strong>MongoDB Atlas</strong></td>
    <td>Free tier (512MB storage, shared cluster)</td>
    <td>$0</td>
  </tr>
  <tr>
    <td><strong>Redis</strong></td>
    <td>Self-hosted container on EC2 (included in instance cost)</td>
    <td>$0</td>
  </tr>
  <tr>
    <td><strong>CloudFront</strong></td>
    <td>Low-traffic baseline example (US/Canada): 100k HTTPS requests + 10GB data transfer/month ≈ request + transfer charges (no fixed hourly LB fee)</td>
    <td>~$0.95</td>
  </tr>
  <tr>
    <td><strong>AWS WAF</strong></td>
    <td>1 web ACL ($5) + 3 rules ($3) + 100k requests ($0.60 / 1M)</td>
    <td>~$8.06</td>
  </tr>
  <tr>
    <td><strong>Langfuse</strong></td>
    <td>Free tier (50k observations/month)</td>
    <td>$0</td>
  </tr>
  <tr>
    <td><strong>Total</strong></td>
    <td></td>
    <td><strong>~$TBD/month</strong></td>
  </tr>
</table>

### Cost optimization decisions

**Embedding cost is negligible.** Title-only embeddings are ~20 tokens each. At 15,000 stories/month this is pennies. Don't optimize.

**Summarization is the main variable cost.** gpt-4o processes ~200-300 successfully fetched articles/day. The blacklist and fetch failures naturally reduce volume — only articles with actual content reach the summarizer. This is where cost scales with volume.

**Chat cost is low by design.** gpt-4o-mini handles all user-facing chat. The agent decides the document limit per search alongside the semantic query and structured filters — the number of documents retrieved is part of the search strategy, not a hardcoded cost lever.

**Cloud edge cost is mostly WAF fixed fees at low traffic.** With CloudFront + WAF and recruiter-scale traffic, request/data charges are typically small; the predictable floor is mostly `WAF web ACL + rules`.

---

## Beyond MVP

Features I consider out of scope for the initial build but recognize as important in a production system:

- **Response caching**: cache frequent chat queries (e.g., "what's trending today?") in Redis with a short TTL (~15 min). High hit rate expected since many users ask similar questions about the same day's news. Reduces OpenAI chat cost and latency for common queries.

- **Recovery job**: scheduled job that queries MongoDB for documents stuck in `FAILED` status (across any pipeline: embedding, fetch, summarization) with attempts below a threshold, and re-enqueues them. Makes the system self-healing beyond what RabbitMQ retries provide, using MongoDB as the source of truth instead of the DLQ.

- **Alerting**: CloudWatch alarms on queue depth, DLQ depth, circuit breaker state changes, and embedding pipeline lag. Currently metrics are logged but not alerting.

- **Playwright fallback for enrichment**: swap in a headless browser for URLs that require JavaScript rendering. I designed the `ArticleExtractor` interface for this, but Playwright adds container size and latency.

- **Content chunk embeddings**: my current title-only embeddings handle topic-level matching well but miss details buried in article bodies. Chunking article content into ~200-400 token segments and embedding each independently would enable retrieval on specific claims, code examples, or arguments. A `chunk-embedding` consumer would bind to `story.fetched` alongside the summarizer — no changes to existing pipelines.

---

## Delivery Plan <a id="delivery-plan"></a>

The target architecture described in this document remains the final destination. I intentionally split delivery into two stages:

1. **Validation stage** — de-risk the product experience, data model, and retrieval quality locally before infrastructure work
2. **Final implementation stage** — deploy the portfolio/showcase publicly, add auth and rate limiting, and **then** (Phase 2–4) replace the seeded dataset with the live event-driven pipeline. The **public deploy + auth + infra** slice (**Phase 1.1** + **1.2**) is ✅ **complete**; the live pipeline and hardening work below are still open.

This split is deliberate: for a portfolio-first site, the highest initial risk is not Terraform or ECS wiring — it is whether the showcase actually feels convincing once real-looking data, retrieval, citations, and execution metadata are present in the UI.

### Validation Stage

#### Phase 1 — Seed representative HN data locally ✅

- [x] TypeScript seed script (`scripts/seed-hn.ts`) that fetches recent HN stories, extracts content, generates embeddings and summaries, and inserts into MongoDB using the final document shape
- [x] ~100 seeded articles with representative mix of pipeline states: 100% embeddings, ~79% content extracted, ~74% summaries, plus realistic `FAILED` states (rate limits, paywalled domains, JS-only pages, short content)
- [x] Retrieval quality validated via eval script (`scripts/eval-title-embeddings.ts`) with 33 queries: 11 broad topical, 11 positive controls (keyword overlap), 10 semantic-only (zero keyword overlap). Title-only embeddings achieved 8/10 rank-1 accuracy on synonym-only queries, confirming semantic search works beyond keyword matching

~100 articles proved sufficient for validation — the corpus covers enough topic diversity (AI, infrastructure, programming languages, hardware, politics, science) and pipeline state variety to exercise all retrieval and edge-case scenarios. I kept the seed script reusable for local setup and demos.

#### Phase 2 — Portfolio shell + public showcase page ✅

- [x] Portfolio information architecture: rename/reframe the current `Projects` section into a showcase-oriented section
- [x] Public Hacker News RAG Agent landing page explaining the problem, architecture, and key engineering decisions in English
- [x] Routing between portfolio and showcase, with a CTA that leads to the interactive product

**Validation:** a recruiter or reviewer can land on the portfolio, understand who built it, discover **Hacker News RAG Agent** as the featured showcase, and reach the product entry point without confusion.

#### Phase 3 — Local chat experience over seeded data ✅

- [x] Chat route and UI (`/hackernews`)
- [x] Chat API endpoint (`/api/chat`) with LLM agent, `search_hn` tool, and retrieval flow over seeded `hn_articles`
- [x] Source/citation rendering and execution metadata disclosure panel
- [x] Brief explainer at the top of the chat page
- [x] No Google auth yet — open access for local validation

**Validation:** local end-to-end interaction works. A user can ask about recent tech news, receive grounded answers from the seeded corpus, inspect how the answer was generated, and hit realistic edge cases before infrastructure complexity is introduced.

#### Phase 4 — UX and data-model refinement ✅

- [x] Iterate on prompt contract, search filters, and document limit strategy
- [x] Source/citation presentation and metadata panel design
- [x] Error states and empty-result handling
- [x] Schema/index adjustments discovered during local testing

**Validation:** the showcase feels credible enough to publish, and the data model has been validated by an actual working chat experience rather than by architecture assumptions alone.

**Phase 4 highlights:** I replaced the sequential embed→search→context-inject pipeline with OpenAI function calling (agentic tool-use). Added NDJSON streaming protocol, interactive citation rendering, real execution metadata panel, distinct error states (400/429/503/500/network), and prompt injection mitigation. Vector index currently uses post-search `$match` for score filtering; pre-filter on `hnPostedAt` deferred to Phase 2 when live data provides date diversity.

### Final Implementation Stage

Phase **1** of this stage is **done** (**1.1** + **1.2**): the site is public on the domain, the **web** stack runs on AWS, CI/CD deploys from `main`, and runtime configuration is wired through Secrets Manager into the ECS task. The remaining phases in this block are **2–4** (live ingestion → enrichment → hardening).

#### Phase 1.1 — Auth, rate limiting, and protected chat ✅

- [x] NextAuth.js Google login (provider + session management)
- [x] `users` collection — upsert on login (email, name, pictureUrl, createdAt, lastLoginAt)
- [x] Protected `/hackernews/chat` route (auth gate modal if unauthenticated)
- [x] Public `/hackernews` showcase route remains accessible without login
- [x] MVP rate limiting via MongoDB: per-user message counter + window reset timestamp on the user document. Same check location in the chat route — swap to Redis later

**Validation:** unauthenticated visitors can browse the public showcase. Clicking into the chat shows an auth gate with a Google sign-in button. Authenticated users can chat under a per-user rate limit enforced via MongoDB. The rate limit resets correctly after the window expires.

#### Phase 1.2 — Infrastructure and CI/CD ✅

- [x] Terraform remote state (S3 + DynamoDB lock table, bootstrapped outside Terraform)
- [x] Modular Terraform: networking (VPC public-only, no NAT), ECS (EC2 launch type), ALB, **CloudFront** + **WAF**, Route 53, ACM (wildcard), Secrets Manager, ECR, CloudWatch; ECS task **secrets** from Secrets Manager JSON; IAM (task execution role, etc.)
- [x] CloudFront distribution + EC2 ASG + public DNS → live traffic on the domain
- [x] GitHub Actions CI/CD: `ci.yml` (PR: lint + typecheck), `deploy.yml` (main: lint → Docker build → push ECR → update ECS task def → deploy)
- [x] Multi-stage Dockerfile with Next.js standalone output
- [x] Public URL: site and routes served over HTTPS; **chat and DB-backed features** require the Secrets Manager secret populated and a compatible MongoDB/seed (same app contract as local)

**Validation:** end-to-end path User → **CloudFront** → **ALB** → **ECS** task; CI/CD from `main` updates the image. Full **Hacker News RAG** experience on the public domain matches local only once secrets, OAuth redirect URIs, and data (e.g. seeded corpus) are aligned with production.

**Phase 1.2 complete** — this closes **Phase 1** of the Final Implementation Stage (together with 1.1).

#### Phase 2 — Live ingestion foundation

- [ ] RabbitMQ and Redis containers
- [ ] Pipeline container with ingestor enabled (SSE → MongoDB → RabbitMQ)
- [ ] MongoDB indexes and exchange/queue topology declared in code
- [ ] Upgrade rate limiting from MongoDB MVP to Redis sliding window

**Validation:** live stories appear in `hn_articles` with title, URL, score, and metadata. Queue health logs confirm that `story.created` events are being published and accumulated for downstream consumers. Rate limiting is backed by Redis with a proper sliding window.

#### Phase 3 — Live enrichment pipeline

- [ ] Embedder, fetcher, summarizer consumers with OpenAI integrations
- [ ] Circuit breakers and DLQ configuration
- [ ] Progressive handoff from seeded validation data to continuously enriched live data

**Validation:** documents ingested from the live pipeline populate `embedding`, `content`, and `summary` over time. `jsonData.embedding`, `jsonData.fetch`, and `jsonData.summary` accurately reflect `COMPLETED`, `FAILED`, or `SKIPPED` states, and DLQs capture exhausted failures after 3 deliveries.

#### Phase 4 — Production hardening and seeded-data retirement

- [ ] Remove temporary validation-only assumptions from the product
- [ ] Confirm chat quality against live data
- [ ] Preserve seed script for reproducible local environments
- [ ] Tighten observability around the production path

**Validation:** the public product runs on the intended architecture, answers are backed by live Hacker News data, and the seeded dataset is no longer required for normal operation.