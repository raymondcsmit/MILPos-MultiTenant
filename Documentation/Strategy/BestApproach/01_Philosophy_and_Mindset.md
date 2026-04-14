# Document 01: Philosophy & Mindset for AI-Assisted Development

> **Suite:** Vibe Coding Best Approach v2.0  
> **Prerequisite:** None — Start here.

---

## The Fundamental Shift: From Coder to Conductor

The original approach described the developer's role shift correctly but didn't go far enough. In 2026, the transformation is complete:

| Old Mental Model | New Mental Model |
|---|---|
| "I write code" | "I define intent and verify outcomes" |
| "I use AI to autocomplete" | "I orchestrate AI agents for discrete tasks" |
| "I author the solution" | "I architect the system and audit the output" |
| "I review AI suggestions" | "I govern AI behavior through rules and constraints" |
| "Prompts are throwaway inputs" | "Prompts are versioned, reusable infrastructure" |

> **Core Mantra:** You are the **Architect, Conductor, and Auditor**. The AI is a highly capable junior engineer who needs specific instructions, clear boundaries, and mandatory code reviews.

---

## The Three Pillars of the Mindset

### Pillar 1: Intent over Syntax

Stop thinking in terms of *how* code is written. Think exclusively about **what the system should do** and **what invariants it must never violate**.

**In Practice:**
- Before writing any prompt, write a one-sentence **Intent Statement**:
  > *"The system must allow a Draft Order to move to Pending only when it has at least one line item and a valid customer ID. This transition must fail silently if attempted programmatically without going through the `SubmitOrderCommand`."*
- This intent statement becomes the foundation of your acceptance test AND your prompt.

**What to Avoid:**
- Prompting for implementation details: ❌ *"Add a boolean flag `isSubmitted` to the Order entity"*
- Instead, prompt for behavior: ✓ *"Implement the Order submission flow so that a Draft order transitions to Pending, validating at least one order line exists via FluentValidation"*

---

### Pillar 2: Context is Infrastructure

The single biggest cause of AI hallucinations, incorrect implementations, and architectural drift is **insufficient or incorrect context**.

**Context Management Rules:**
1. **Context is a Product**: Maintain your context files with the same discipline as source code.
2. **The Smallest Signal Principle**: Provide only high-signal, relevant information. Avoid dumping entire codebases into the context — the AI's attention budget is finite and "junk context" dilutes quality.
3. **Context Has a Half-Life**: Re-establish critical context when starting a new session or a new feature slice. Do not assume the AI "remembers" your architecture from yesterday.
4. **Structured Context Over Free Text**: Use structured formats (YAML, Mermaid, tables) instead of prose paragraphs where possible. AI models parse structured data more reliably.

**The Four Layers of Context:**
```
Layer 1: Project Level (Persistent)
    → .cursor/rules/*.mdc files
    → Architecture Decision Records (ADRs)
    → Tech Stack & Constraints Document

Layer 2: Feature Level (Per Slice)
    → Domain model excerpt for this feature
    → Relevant existing code snippets
    → Acceptance criteria for this slice

Layer 3: Session Level (Per Conversation)
    → What was completed in the last session
    → Current "in-progress" component
    → Active blocking issues

Layer 4: Task Level (Per Prompt)
    → Single, specific, contained task
    → Expected input/output contract
    → Anti-patterns to avoid
```

---

### Pillar 3: Verification is Non-Negotiable

The #1 mistake in vibe coding is treating AI-generated code as production-ready output. **AI excels at the 80%, but the 20% — edge cases, concurrency, security — requires human verification and adversarial testing.**

**The "Trust but Verify" Contract:**
- ✅ Trust AI for: `boilerplate generation`, `pattern replication`, `test scaffolding`, `refactoring known patterns`
- ⚠️ Verify carefully for: `business logic complexity`, `state transitions`, `authentication/authorization`
- ❌ Never delegate to AI without deep review: `security-critical code`, `financial calculations`, `data migrations`

**The 60/40 Rule:**

> In a well-functioning AI-assisted team, developers spend **~40% of time prompting/generating** and **~60% of time verifying, testing, and hardening**.

If your ratio is reversed (more generating, less verifying) — your technical debt is accumulating fast.

---

## The "Conductor" Framework in Practice

Think of your AI coding toolkit as an orchestra:

| Role | Description | Tool Examples |
|---|---|---|
| **You (Conductor)** | Set tempo, define intent, approve outputs | The Developer |
| **Lead Instrument (AI Agent)** | Primary code generator | Cursor Agent, Copilot Workspace |
| **Section (Specialized Agents)** | Task-specific AI helpers | Testing agent, Security scan agent |
| **Score (Context Files)** | The "music" everyone follows | `.cursor/rules/`, ADRs, Domain Model |
| **Rehearsal (Dev Loop)** | Practice before going live | Local tests, feature branches |
| **Performance (Delivery)** | The final product | CI/CD pipeline, production deploy |

---

## Common Mindset Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: "Prompt and Forget"
Generating a feature in one large prompt and immediately committing without review.
**Fix:** Always run tests, always do a diff review before committing.

### ❌ Anti-Pattern 2: "Context Laziness"
Relying on the AI to "figure out" your architecture without providing explicit rules and context.
**Fix:** Invest 20 minutes upfront creating proper `.cursor/rules/` files. This pays dividends across every subsequent session.

### ❌ Anti-Pattern 3: "Monolith Prompting"
Asking the AI to "build the entire order management module" in one prompt.
**Fix:** Decompose to atomic tasks. One prompt = one specific, contained task.

### ❌ Anti-Pattern 4: "Test Last"
Building features first, writing tests at the end (if at all).
**Fix:** Tests are the *first deliverable* of every slice. See Document 03.

### ❌ Anti-Pattern 5: "Vibe and Ship"
Letting the aesthetic/speed of AI generation override engineering discipline.
**Fix:** Speed is a byproduct of quality. Establish your foundation (rules + tests) before you optimize for speed.

---

## The 5-Minute Pre-Flight Check (Before Any AI Session)

> **From External Analysis — Priority 🟢 Polish (High practical value)**

Run this check BEFORE opening your AI tool — every single day:

```bash
# Step 1: Verify the build is healthy
dotnet build    # Must succeed — zero errors

# Step 2: Verify all tests are green
dotnet test     # All tests must pass — red tests = corrupted state

# Step 3: Verify no orphaned changes  
git status      # Uncommitted changes? Commit or stash BEFORE prompting
```

- [ ] `dotnet build` passes with **0 errors, 0 warnings** (warnings-as-errors policy)
- [ ] `dotnet test` — **all tests green** (red tests mean a previous session corrupted state)
- [ ] `git status` — **no uncommitted changes** (commit or stash before AI session)
- [ ] `CONTEXT.md` reviewed and accurate for today's slice
- [ ] Today's goal defined: *"By end of day, Slice X will have [specific deliverable]"*

> ⚠️ **If any check fails, resolve it BEFORE prompting the AI.**  
> The AI cannot reliably fix a broken build. Starting from a broken state almost always makes it worse.

---

## Mode Differences: Solo Developer vs. Team

> **From External Analysis — Priority 🟢 Polish**

This framework was designed for teams with formal code review. Solo developers need specific adaptations:

| Practice | Solo Developer | Team |
|---|---|---|
| Code review | Run PROMPT-09 (adversarial audit) + 24-hour "cooling off" before re-reading | Human PR review with ≥ 1 reviewer |
| Architecture decisions | ADRs still required, but self-approved | ADRs require 2+ person sign-off |
| `AI_DECISIONS.md` | Self-completed, self-reviewed | Reviewed as part of PR checklist |
| Emergency revert | Solo responsibility — practice the protocol on a test branch weekly | On-call rotation with escalation path |
| Context maintenance | Single `CONTEXT.md`, no sync needed | Shared `CONTEXT.md` + daily 5-minute team sync |
| Drift detection | Run every 3 slices, self-reviewed | Run every 3 slices + team pattern review monthly |
| Quality scorecard | Track personally in `AI_QUALITY_SCORECARD.md` | Shared scorecard, reviewed in sprint retrospective |

**Solo Developer Safety Nets (Compensating Controls):**
- **The 24-Hour Rule:** For any slice with overall `Medium` confidence in `AI_DECISIONS.md`, review the diff again the next morning with fresh eyes before merging
- **The Buddy Principle:** Even as a solo developer, consider a monthly async code review with a trusted peer or in a developer community
- **The Canary-First Policy:** Always run the Canary Test (Document 09) before complex tasks — you have no second pair of eyes to catch early drift

---

## Daily Developer Checklist (The "Conductor's Prep")

Additional checks *after* the Pre-Flight Check:
- [ ] Is my `.cursor/rules/` file up to date with the latest architectural decisions?
- [ ] Do I have the domain model and relevant entity relationships in my context?
- [ ] Have I written the acceptance criteria for today's target slice?
- [ ] Is my feature branch created and the previous slice committed?
- [ ] Do I know exactly which ONE thing I'm building today?
- [ ] Is `CANONICAL_REGISTRY.md` referencing the right canonical files for this module?

---

## Summary

> The vibe coding mindset is not about writing less code — it's about **applying engineering discipline to AI orchestration**. The developer who masters this mindset will deliver higher-quality software faster than any team writing everything manually, while avoiding the chaos of undisciplined AI generation.

**Next Step:** → [Document 02: Context & Rule Orchestration](./02_Context_and_Rule_Orchestration.md)  
**Also See:** → [Document 09: Emergency Revert Protocol](./09_Emergency_Revert_Protocol.md) — what to do when the AI catastrophically misbehaves
