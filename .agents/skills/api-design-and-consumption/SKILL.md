---
name: api-design-and-consumption
description: Design and consume REST-style APIs with minimal payloads, single-purpose endpoints, and efficient patterns. Use when implementing new API route handlers in Next.js, consuming external or internal APIs, or reviewing API design decisions.
---

# API Design and Consumption

Guidelines for building and using APIs that are efficient, focused, and maintainable.

## Core Principles

### 1. Minimal Payloads

**Responses:** Return only the data the consumer needs. No extra fields for "maybe later" or "just in case."

- ✅ List endpoint returns `{ id, name }` when the consumer only needs to render a dropdown
- ❌ Same endpoint returning full entity with 20 fields the consumer never uses
- Prefer dedicated endpoints for different use cases over one "rich" endpoint that returns everything

**Requests:** Send only what the API requires. Do not echo back full objects when identifiers suffice.

- ✅ Update with `[{ id }, { tmpId }]` — identifiers and order only
- ❌ Sending full objects when the handler only uses two fields

### 2. Single Responsibility per Endpoint

Each route handler serves one specific purpose. Avoid "do-everything" endpoints.

- ✅ Separate handlers or paths for distinct operations when shapes differ materially
- ❌ One handler that accepts many optional flags to switch behavior opaquely
- Split by use case: e.g. search vs detail vs lightweight list

### 3. Efficiency in Consumption

- **Avoid over-fetching:** Don't request full objects when a subset satisfies the UI
- **Avoid under-fetching:** Don't make N requests when one batch would do (where the product allows it)
- **Prefer server-side work for secrets:** Keep API keys and privileged calls in Route Handlers or Server Components — not in client bundles

---

## Implementation Checklist

### When Implementing a Route Handler (`apps/web/src/app/api/.../route.ts`)

- [ ] Identify the **single use case** this handler serves
- [ ] Define the **minimum response shape** for that use case — no extra fields
- [ ] Define the **minimum request shape** — only required/meaningful input
- [ ] Use appropriate HTTP verb and status codes
- [ ] Validate input at the boundary (schemas, early returns for bad input)
- [ ] Paginate or cap list/stream outputs — never unbounded responses without an explicit contract

### When Consuming an API from Client Components

- [ ] Inspect what the endpoint **actually returns** — use only what you need
- [ ] Build the **smallest valid request** — map from UI state to minimal payload before sending
- [ ] Prefer **same-origin** `fetch('/api/...')` (or abstractions that wrap it) with correct `credentials` when sessions/cookies matter
- [ ] Do **not** embed secrets in client code — call your Route Handler and let the server call upstream services

---

## Patterns

### Request Mapping

Before sending, reduce to the minimal payload the server documented.

### Response Handling

Use only the fields you need. Don't pass through or store unused data.

### Schema Alignment

Keep validation aligned with the minimal contract. If the API accepts only specific fields, reject or strip unknown keys early so the contract stays obvious in code.

---

## Additional Considerations

| Topic | Guideline |
|-------|-----------|
| **Error handling** | Consistent error format; appropriate HTTP status codes; no raw stack traces to clients |
| **Idempotency** | For create/update flows that need safe retries, consider idempotency keys |
| **Versioning** | Prefer additive changes; for breaking changes, version path or document migration |
| **Naming** | Consistent casing (e.g. camelCase for JSON); resource-oriented paths |
| **Pagination** | Always paginate or cap lists; use limit/offset or cursor |
| **Streaming** | If using streams (e.g. NDJSON), document content type and client parsing expectations |

---

## Project-Specific Notes (portfolio)

- **Handlers live under** `apps/web/src/app/api/` as `route.ts` files (App Router).
- **Auth:** Use NextAuth session in handlers when routes must be protected; mirror patterns from existing auth-gated API routes.
- **MongoDB / OpenAI:** Access only from server-side code (handlers, server utilities) — **never** expose connection strings or API keys to the client.
