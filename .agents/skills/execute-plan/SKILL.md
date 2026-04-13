---
name: execute-plan
description: Executes implementation plans from documentation/tasks/. Reads the plan, decides whether to run all tasks or pause between phases, and marks checkboxes as it goes. Use when the user asks to execute a plan, implement a feature, run tasks from a plan, or continue working on a plan.
---

# Execute Implementation Plan

Executes tasks from a `documentation/tasks/YYYYMMDD_slug/README.md` plan file. Handles both full execution and incremental (phase-by-phase or single-task) modes.

## Step 1: Locate the Plan

Resolve the plan file:

1. **If the user provides a path or slug** — use it directly
2. **If ambiguous** — list `documentation/tasks/` folders sorted by date (newest first), show plans that have pending tasks (`- [ ]`), and ask the user to pick

Read the full plan file before proceeding.

## Step 2: Parse Plan State

Scan the `STEP-BY-STEP TASKS` section:

1. Count total tasks (lines matching `- [ ]` or `- [x]`)
2. Count completed (`- [x]`) and pending (`- [ ]`)
3. Identify which **phase** each pending task belongs to

Report to the user:

```
Plan: <feature name>
Progress: X/Y tasks completed
Current phase: <phase name>
Pending tasks: <count>
```

## Step 3: Decide Execution Strategy

Choose strategy based on plan size and user input:

| Condition | Strategy |
|---|---|
| User says "next task" / "una tarea" | **Single** — execute 1 task, stop |
| User says "phase X" / "esta fase" | **Phase** — execute all tasks in that phase, stop |
| Pending tasks <= 6 AND estimated low complexity | **Full** — execute everything |
| Pending tasks > 6 OR high complexity | **Phase-by-phase** — execute current phase, then ask to continue |
| User says "todo" / "everything" / "all" | **Full** — execute everything regardless of size |

If no explicit user preference, default to **phase-by-phase** for plans with more than 6 pending tasks, **full** otherwise.

Announce the chosen strategy before starting: _"This plan has N pending tasks across M phases. I'll execute [all/phase by phase/just the next task]."_

## Step 4: Pre-Execution Context Loading

Before implementing ANY task:

1. Read the **CONTEXT REFERENCES** section — every file listed under "Relevant Codebase Files — MUST READ BEFORE IMPLEMENTING"
2. Read the **Patterns to Follow** section
3. Read **[`AGENTS.md`](../../../AGENTS.md)** for project conventions and doc references
4. For each task about to execute, read the specific PATTERN reference file:lines if provided

This is non-negotiable. Skipping context loading leads to pattern violations and rework.

## Step 5: Execute Tasks

For each pending task, in order:

### 5a. Parse the task

Extract: ACTION, target file, IMPLEMENT, PATTERN, IMPORTS, GOTCHA, VALIDATE

### 5b. Implement

- Follow IMPLEMENT instructions precisely
- Respect PATTERN references — match the style of the referenced code
- Add all IMPORTS at the top of the file
- Watch for GOTCHA warnings
- Match existing code in the target directory: **4-space indent**, TypeScript, early returns in route handlers where appropriate, `handle*` event names in client components

### 5c. Validate

- Run the VALIDATE command specified in the task
- If validation fails: fix the issue, re-run validation
- Do NOT proceed to the next task until validation passes

### 5d. Mark complete

Update the plan file: change `- [ ]` to `- [x]` for the completed task. Preserve the surrounding markdown formatting — only toggle the checkbox, don't reformat adjacent lines.

### 5e. Phase boundary check

If the completed task is the last one in its phase AND the strategy is **phase-by-phase**:

1. Report phase completion with a summary of changes made
2. Ask the user: _"Phase N complete (X tasks). Continue with Phase N+1?"_
3. Wait for confirmation before proceeding

## Step 6: Final Validation

After all tasks are complete (or when the plan is fully done):

1. Run ALL commands from the **VALIDATION COMMANDS** section, in order (Level 1, Level 2, Level 3...)
2. If any command fails, fix the issue and re-run
3. Walk through the **ACCEPTANCE CRITERIA** — verify each one and mark `- [x]`
4. Update the **COMPLETION CHECKLIST** — mark all items `- [x]`

## Step 7: Mark Plan Complete

When the plan is fully complete (all tasks `- [x]`, all validations passing):

1. Update the plan header status: change `> **Status**: doing` to `> **Status**: done`
2. Report completion to the user

## Step 8: Report

After each execution session (whether partial or complete), provide:

```
### Execution Summary

**Plan**: <feature name>
**Tasks completed this session**: N
**Total progress**: X/Y tasks (Z%)
**Phase**: <current/completed phase>

### Changes Made
- <file path> — <brief description>
- ...

### Validation Results
- Lint: PASS/FAIL
- Build: PASS/FAIL
- ...

### Next Steps
- **Next task**: <brief description of next pending task, or "None — plan complete">
- **Tasks remaining**: <count>
- <What remains, or "Plan complete">
```

## Error Handling

- **Task fails validation**: Fix the issue. If unfixable, document the blocker in the plan as a note under the task, do NOT mark it `- [x]`, and stop execution.
- **Ambiguous task**: Ask the user for clarification before implementing. Do not guess.
- **Context window concern**: If you've executed many tasks and feel context is getting stale, suggest pausing and resuming in a new session. The checkboxes preserve progress.
- **Missing pattern file**: If a referenced file doesn't exist, search for it or ask the user. Do not skip context loading.

## Resumability

The checkbox system (`- [ ]` / `- [x]`) makes plans fully resumable across sessions:

- A new session reads the plan, sees which tasks are `- [x]`, and picks up from the first `- [ ]`
- No external state needed — the plan file IS the state
- Phase-by-phase execution naturally creates safe pause points
