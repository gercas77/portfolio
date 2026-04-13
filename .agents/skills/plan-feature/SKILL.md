---
name: plan-feature
description: Creates implementation plans for features or tasks. Analyzes codebase, generates a detailed plan under documentation/tasks/. Use when the user asks to plan a feature, plan a task, or create an implementation plan.
---

# Plan Feature

Creates a comprehensive implementation plan for a feature or task.

## Workflow

### Step 1: Understand the Task

Get a clear understanding of what needs to be built:

1. **If the user describes the feature** — use their description directly
2. **If ambiguous** — ask the user to clarify the scope and requirements

### Step 2: Deep Codebase Analysis

Read **[`AGENTS.md`](../../../AGENTS.md)** first (repo layout, commands, and **documentation index** — prefer **[`.agents/references/architecture.md`](../../../.agents/references/architecture.md)** over the full **`apps/README.md`** unless you need deep product/ops detail). Skim root **[`README.md`](../../../README.md)** when you need repo status. Then use parallel subagents (`explore` type) when useful to gather intelligence across these dimensions:

**1. Existing Implementation**
- Search for code related to the task’s domain — route handlers, components, `lib/` helpers
- Identify existing files that need updates vs new files to create
- Map App Router and API patterns (`apps/web/src/app/api/`)
- Understand MongoDB/auth patterns if applicable

**2. Pattern Recognition**
- Search for similar implementations in the codebase
- Identify coding conventions: naming patterns, file organization, module structure
- Extract error handling and logging approaches
- Document anti-patterns to avoid
- Note how existing patterns for the feature’s domain work (e.g. streaming, forms, chat UI)

**3. Dependency & Integration Analysis**
- Catalog external libraries relevant to the feature
- Understand how those libraries are integrated (imports, configs, versions)
- Map integration points — which existing files connect to the new feature
- Identify configuration files that may need updates

**4. UI/UX Identification** (if feature has a frontend component)
- Determine which pages/components are affected
- Identify relevant Tailwind and component patterns
- Note dynamic states to handle (loading, error, empty, conditional rendering)
- Check for responsive/mobile considerations

### Step 3: Clarify Ambiguities

If requirements are unclear after analysis, **ask the user to clarify before continuing**. Specifically:
- Unresolved architectural choices (e.g. where to place logic, which pattern to follow)
- Missing acceptance criteria or edge case definitions
- Implementation preferences (libraries, approaches)

Do not guess — unclear requirements produce low-quality plans.

### Step 4: External Research

When the feature involves libraries, APIs, or patterns not already well-established in the codebase:

1. Research latest best practices, official documentation, and known gotchas
2. Compile findings as references with URLs and "Why" annotations — these go into the plan’s "Relevant Documentation" section

Skip this step if the feature is purely internal and uses only existing patterns.

### Step 5: Strategic Thinking

Before writing the plan, think critically about:

- **Architecture fit**: How does this feature integrate with the existing system?
- **Order of operations**: What are the critical dependencies between tasks?
- **Failure modes**: Edge cases, race conditions, error scenarios
- **Performance**: Will this introduce N+1 queries, unbounded lists, or heavy computations?
- **Security**: Access control, input validation, data exposure
- **Maintainability**: Is the approach easy to extend and understand?

Choose between alternative approaches with clear rationale. Document key design decisions and trade-offs in the plan’s NOTES section.

### Step 6: Generate the Plan

Create the plan file at:

```
documentation/tasks/YYYYMMDD_<slug>/README.md
```

**Naming rules:**
- Prefix: today's date as `YYYYMMDD`
- Separator: single underscore `_`
- Slug: lowercase, descriptive, hyphens for spaces, no special chars
- Always a folder with `README.md` inside (not a standalone .md file)
- Examples: `20260413_hn-chat-streaming-fix/README.md`, `20260413_projects-section-copy/README.md`

**Plan structure** — use the template in [plan-template.md](plan-template.md).

Key requirements:
- **Header must include** the current status as a blockquote
- **Context references** must include specific file paths with line numbers
- **Every task** must have a checkbox `- [ ]` for progress tracking
- **Patterns** must reference actual code from the codebase (not generic examples)
- **Validation commands** must be executable and non-interactive
- **Data structures in plan docs must be defined as TypeScript interfaces/types**, never as plain bullet lists
- **API work must include explicit endpoint contracts** in the plan:
  - method + path
  - query/path/body parameters (typed)
  - response DTOs (typed)
  - role/access scope when relevant (e.g. authenticated session only)

### Step 7: Report

Provide:
- Summary of the feature and approach
- Path to the created plan file
- Complexity assessment (Low/Medium/High)
- Key risks or considerations
- Confidence score (1-10) for one-pass implementation success

## Plan Quality Criteria

Before delivering the plan, self-assess against these gates:

### Context Completeness
- All necessary patterns identified and documented with file:line references
- External library usage documented with links where applicable
- Integration points clearly mapped
- Gotchas and anti-patterns captured
- Every task has an executable validation command

### Implementation Readiness
- Another agent (or developer) could implement without additional research or clarification
- Tasks ordered by dependency — can execute top-to-bottom
- Each task is atomic and independently testable
- ALL tasks use checkbox format `- [ ]` for progress tracking

### Pattern Consistency
- Tasks follow existing codebase conventions
- New patterns justified with clear rationale
- No reinvention of existing patterns or utils

### Information Density
- No generic references — all specific and actionable
- Task descriptions use codebase-specific terminology
- Validation commands are non-interactive and executable

**Target**: The plan passes the "No Prior Knowledge Test" — someone unfamiliar with the codebase can implement using only plan content + referenced files.
