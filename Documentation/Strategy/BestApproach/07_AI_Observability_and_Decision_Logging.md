# Document 07: AI Agent Observability & Decision Logging

> **Suite:** Vibe Coding Best Approach v2.0 — External Analysis Upgrade  
> **Priority:** 🔴 Critical  
> **Addresses Gap:** "The framework assumes AI behaves correctly. There is no audit trail for *why* the AI made specific implementation choices."

---

## The Observability Problem

Your CI/CD pipeline monitors whether code runs correctly. But when an AI agent makes a wrong architectural decision that produces a subtle bug — one that only surfaces 3 months later under specific conditions — you have no traceability. You cannot answer: *"Why did the AI choose this approach, and what alternatives did it consider?"*

**The Result:** Debugging AI-generated code is harder than debugging hand-written code because the *reasoning* is invisible.

**The Solution:** Make AI reasoning an explicit, versioned artifact — the `AI_DECISIONS.md` file.

---

## Part 1: The `AI_DECISIONS.md` Standard

### 1.1 What It Is

`AI_DECISIONS.md` is a mandatory, per-feature-branch audit log that captures every significant implementation decision made during AI-assisted development. It is committed alongside the code and persists in the repository history.

Think of it as a **Architectural Decision Record (ADR) for the micro-level** — not "why did we choose Clean Architecture?" but "why did the AI put this state transition logic in the entity and not the handler?"

### 1.2 When to Create an Entry

Create an `AI_DECISIONS.md` entry for every decision involving:
- Where business logic is placed (entity vs. handler vs. service)
- Which design pattern is used (strategy vs. switch, event vs. direct call)
- Concurrency and transaction handling approach
- Error handling and exception strategy
- Performance optimization choice (eager vs. lazy loading, caching)
- Any deviation from the established canonical pattern

### 1.3 The `AI_DECISIONS.md` Template

```markdown
# AI Decision Log — [Feature/Slice Name]

**Branch:** feature/[slice-name]  
**Date:** [YYYY-MM-DD]  
**Slice Scope:** [Brief description of what this slice implements]  
**AI Tool Used:** [Cursor / Windsurf / Copilot Workspace]  
**Confidence Score:** [High / Medium / Low]

---

## Decision Log

### Decision 1: [Short Decision Title]

| Field | Detail |
|---|---|
| **Decision Point** | [What choice had to be made?] |
| **AI Choice** | [What the AI chose] |
| **Rationale** | [Why — which rule/pattern/project standard drove this?] |
| **Rule Cited** | [`01_architecture.mdc` / `05_security.mdc` / etc.] |
| **Alternatives Rejected** | [What else was considered and why rejected] |
| **Risk** | [Low / Medium / High — what could go wrong with this choice?] |
| **Reversibility** | [Easy / Hard / Irreversible] |

### Decision 2: [Short Decision Title]

[Same table structure...]

---

## Assumptions Made

List any assumptions the AI made about ambiguous requirements:

| Assumption | Basis | Validation Required? |
|---|---|---|
| [Assumption 1] | [Inferred from X] | [Yes/No — and how to validate] |

---

## Known Limitations / Technical Debt Introduced

| Item | Description | Priority | Tracking Ticket |
|---|---|---|---|
| [Limitation 1] | [Description] | [P1/P2/P3] | [JIRA-XXX or N/A] |

---

## Post-Implementation Confidence Assessment

- **Domain logic correctness:** [High/Medium/Low] — [Reason]
- **Security posture:** [High/Medium/Low] — [Reason]  
- **Performance profile:** [High/Medium/Low] — [Reason]
- **Test coverage adequacy:** [High/Medium/Low] — [Reason]

**Overall Slice Confidence:** [High/Medium/Low]

> `Low` confidence = mandatory human deep-review before merging.
> `Medium` confidence = standard PR review process.
> `High` confidence = standard PR review process + automated checks sufficient.
```

---

### 1.4 Completed Example: `AI_DECISIONS.md` for SubmitOrderCommand

```markdown
# AI Decision Log — Submit Order Command

**Branch:** feature/orders-submit  
**Date:** 2026-04-09  
**Slice Scope:** SubmitOrderCommand — transitions Order from Draft to Pending with validation  
**AI Tool Used:** Cursor (Claude Sonnet 4.5)  
**Confidence Score:** High

---

## Decision Log

### Decision 1: State Transition Location

| Field | Detail |
|---|---|
| **Decision Point** | Where to place the Draft→Pending transition logic |
| **AI Choice** | `Order.Submit()` domain method inside the entity |
| **Rationale** | Domain logic belongs in the aggregate root (Clean Architecture). The entity is the only place that can enforce its own invariants atomically. |
| **Rule Cited** | `01_architecture.mdc` — "Business logic must live in domain entities, not in handlers" |
| **Alternatives Rejected** | Handler-based transition (rejected — violates encapsulation; entity would have public setters) |
| **Risk** | Low — standard DDD pattern |
| **Reversibility** | Easy |

### Decision 2: Concurrency Handling

| Field | Detail |
|---|---|
| **Decision Point** | How to prevent duplicate submissions from concurrent requests |
| **AI Choice** | EF Core `RowVersion` byte[] + catch `DbUpdateConcurrencyException` in handler |
| **Rationale** | Matches existing `Order` entity concurrency token. Optimistic locking is appropriate for low-contention order submission. |
| **Rule Cited** | `05_security.mdc` — "Apply concurrency tokens on all entities that can be updated concurrently" |
| **Alternatives Rejected** | Pessimistic locking (rejected — unnecessary overhead for low-contention scenario); timestamp-based (rejected — not current project standard) |
| **Risk** | Medium — under very high concurrency, users will see "order was updated by another request" errors. Acceptable per business requirements. |
| **Reversibility** | Hard (requires migration to change strategy) |

---

## Assumptions Made

| Assumption | Basis | Validation Required? |
|---|---|---|
| Order can only be submitted by its creator OR a manager | Inferred from existing `[Authorize]` patterns on other Order endpoints | Yes — confirm with PO |
| Line item count ≥ 1 is the only guard condition | Requirements say "valid order" — interpreted as non-empty | Yes — may need customer ID validation too |

---

## Known Limitations / Technical Debt Introduced

| Item | Description | Priority | Tracking Ticket |
|---|---|---|---|
| No idempotency key | Re-submitting the same command twice (network retry) could cause confusion | P2 | To be filed |

---

## Post-Implementation Confidence Assessment

- **Domain logic correctness:** High — state machine is explicit and tested
- **Security posture:** High — authorization checked, tenant isolation confirmed  
- **Performance profile:** High — single DB round-trip, indexed lookups
- **Test coverage adequacy:** High — 7 tests covering AC-1 to AC-4 + 2 invalid transition tests

**Overall Slice Confidence:** High
```

---

## Part 2: AI Observability in the CI/CD Pipeline

### 2.1 Automated Observability Check

Add to your PR template (`.github/pull_request_template.md`):

```markdown
## AI-Assisted Development Checklist

### Required (block merge if unchecked):
- [ ] `AI_DECISIONS.md` exists in the branch root for this feature
- [ ] All "Low Confidence" decisions have been flagged for deep human review
- [ ] All `[ASSUMPTION: ...]` comments in code have been resolved or tracked

### Quality Gates:
- [ ] Overall Slice Confidence is NOT "Low"
- [ ] All assumptions in `AI_DECISIONS.md` are validated or have tracking tickets
- [ ] Technical debt items are logged in the issue tracker
```

### 2.2 Session-Level Logging with PROMPT-13

Add PROMPT-13 to your prompt library — invoke it at the **end of every feature slice session**:

---

## PROMPT-13: AI Decision Logging (End-of-Slice)

**When to Use:** After implementing any feature slice. Run this as the **last prompt** of every session.

```
## Role
You are the AI agent that just implemented the [FEATURE_NAME] slice.
Produce an `AI_DECISIONS.md` entry for this session.

## Task
Review everything generated in this session and document:

1. **All significant implementation decisions** — For each one:
   - What was the decision point?
   - What did you (the AI) choose?
   - Which project rule (from .cursor/rules/) drove this choice?
   - What alternatives did you consider and reject, and why?

2. **All assumptions made** — For any ambiguity in the requirements, what did you assume?

3. **Confidence assessment** — For each area (logic, security, performance, tests), rate your confidence High/Medium/Low and briefly explain why.

4. **Known limitations** — What technical debt did this implementation introduce? What should be improved in a follow-up?

## Output Format
Use the AI_DECISIONS.md template from Document 07 exactly.
Be honest — flag Medium/Low confidence items even if the code looks correct to you.

## Session Summary
Feature implemented: [FEATURE_NAME]
Files created/modified: [LIST FILES]
Tests written: [COUNT]
```

---

## Part 3: Observability Dashboard (Team Level)

For teams, maintain a living `AI_OBSERVABILITY_SUMMARY.md` at the project root:

```markdown
# AI Observability Summary — [Project Name]

**Last Updated:** [DATE]

## Confidence Distribution

| Sprint | High Confidence | Medium (Monitor) | Low (Review) |
|---|---|---|---|
| Sprint 1 | 8 slices | 2 slices | 0 slices |
| Sprint 2 | 6 slices | 3 slices | 1 slice → REVIEWED |

## Active Assumptions (Unvalidated)

| Branch | Assumption | Owner | Due Date |
|---|---|---|---|
| feature/orders-submit | Line item ≥ 1 is only guard condition | @DevName | 2026-04-15 |

## Technical Debt from AI Decisions

| ID | Item | Sprint Introduced | Priority | Status |
|---|---|---|---|---|
| TD-001 | No idempotency key on SubmitOrder | Sprint 1 | P2 | Backlog |

## Recurring AI Mistake Patterns

Track patterns that the AI repeatedly gets wrong — then update `.cursor/rules/` to prevent them:

| Pattern | Frequency | Rule Added | Date Fixed |
|---|---|---|---|
| Validation in controller instead of FluentValidation | 3x | `02_backend.mdc` Line 45 | 2026-04-05 |
```

---

## Summary

The `AI_DECISIONS.md` standard transforms invisible AI reasoning into a **traceable, searchable, reviewable artifact**. It closes the "why did the AI do this?" gap that makes debugging AI-generated code so painful.

**The Core Rule:**
> No feature slice is considered complete until its `AI_DECISIONS.md` is committed alongside the code.

**Next Step:** → [Document 08: Pattern Consistency & Drift Detection](./08_Pattern_Consistency_and_Drift_Detection.md)
