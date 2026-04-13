# Feature: <feature-name>

> **Status**: <status> | **Priority**: <priority>

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

<Detailed description of the feature, its purpose, and value to users>

## User Story

As a <type of user>
I want to <action/goal>
So that <benefit/value>

## Problem Statement

<Clearly define the specific problem or opportunity this feature addresses>

## Solution Statement

<Describe the proposed solution approach and how it solves the problem>

## Feature Metadata

**Feature Type**: [New Capability/Enhancement/Refactor/Bug Fix]
**Estimated Complexity**: [Low/Medium/High]
**Primary Systems Affected**: [List of main components/services]
**Dependencies**: [External libraries or services required]

---

## CONTEXT REFERENCES

### Relevant Codebase Files — MUST READ BEFORE IMPLEMENTING

<List files with line numbers and relevance>

- `path/to/file.ts` (lines X-Y) — Why: Contains pattern for X that we'll mirror
- `path/to/model.ts` (lines X-Y) — Why: Database model structure to follow

### New Files to Create

- `path/to/new_file.ts` — Description of what this file does

### Relevant Documentation

- [Documentation Title](https://example.com/docs#section)
  - Specific section: <relevant section>
  - Why: <how this helps the implementation>

### Patterns to Follow

<Specific patterns extracted from codebase — include actual code references from the project, not generic examples>

---

## IMPLEMENTATION PLAN

### Phase 1: <Phase Name>

<Brief description of this phase's goal>

### Phase 2: <Phase Name>

<Brief description>

(Continue as needed)

---

## STEP-BY-STEP TASKS

Execute every task in order, top to bottom. Each task is atomic and independently testable.

**Task keywords**: CREATE (new files), UPDATE (modify existing), ADD (insert into existing), REMOVE (delete), REFACTOR (restructure), MIRROR (copy pattern)

### Phase 1: <Phase Name>

- [ ] **{ACTION}** `{target_file}`
  - **IMPLEMENT**: Specific implementation detail
  - **PATTERN**: Reference to existing pattern — `file:line`
  - **IMPORTS**: Required imports and dependencies
  - **GOTCHA**: Known issues or constraints to avoid
  - **VALIDATE**: `executable validation command`

(Continue with all tasks in dependency order, each with checkbox)

---

## TESTING STRATEGY

### Manual Validation

<Specific manual testing steps for this feature>

### Edge Cases

<List specific edge cases that must be tested>

### Security & Performance Considerations

<Access control checks, input validation, N+1 queries, unbounded lists, etc. — omit section if not applicable>

---

## VALIDATION COMMANDS

### Level 1: Type check

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -40
```

### Level 2: Lint (monorepo)

```bash
pnpm turbo lint
```

### Level 3: Manual Validation

<Feature-specific manual testing steps>

---

## ACCEPTANCE CRITERIA

- [ ] <Specific, measurable criterion>
- [ ] <Another criterion>

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met

---

## NOTES

### Design Decisions

<Key architectural/implementation choices made during planning, with rationale>

### Trade-offs

<What was considered and rejected, and why>

### Risks

<Known risks or areas of uncertainty>
