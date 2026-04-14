# Document 08: Pattern Consistency & Drift Detection

> **Suite:** Vibe Coding Best Approach v2.0 — External Analysis Upgrade  
> **Priority:** 🟡 High  
> **Addresses Gap:** "Over 10+ slices, AI output quality degrades and patterns drift silently — what worked in Slice 1 differs from Slice 8."

---

## The Drift Problem

### What is "Vibe Drift"?

Vibe Drift is the gradual, invisible degradation of code consistency that occurs as AI agents generate more features over time. It manifests as:

- **Layer Violations:** Validation logic appearing in Controllers (should be in FluentValidation)
- **CQRS Pollution:** Query handlers that modify state
- **Pattern Fragmentation:** 3 different error-handling styles across 10 handlers
- **Naming Entropy:** `GetOrderByIdQuery` vs `OrderDetailQuery` vs `OrderGetQuery` — inconsistent conventions
- **Test Decay:** Early slices have 90% coverage; later slices have 40%
- **Rules Blindness:** The AI starts ignoring `.cursor/rules/` constraints as the codebase grows and its "attention" dilutes

### Why This Happens

As your codebase grows, the AI has more competing "evidence" about how things are done:
- Older patterns in the codebase may conflict with newer rules
- The AI synthesizes existing patterns AND new rules — sometimes choosing the wrong one
- Without explicit canonical references, the AI interprets "follow existing patterns" differently each session

---

## Part 1: The Canonical Slice System

### 1.1 What is a Canonical Slice?

A **Canonical Slice** is the designated "gold standard" implementation for each pattern in your codebase. It is the implementation that ALL subsequent slices must match structurally.

**Rules:**
1. **Designate Slice 1** of each new module as the canonical reference
2. The canonical slice is **reviewed more rigorously** than subsequent slices
3. When architectural rules change, **update the canonical slice first** — then run drift detection on all subsequent slices
4. The canonical slice is documented with a **`# [CANONICAL]`** header comment

### 1.2 Canonical Slice Registry

Maintain `CANONICAL_REGISTRY.md` in the project root:

```markdown
# Canonical Slice Registry

## Backend Patterns

| Pattern | Canonical File | Module | Last Reviewed |
|---|---|---|---|
| CQRS Command Handler | `Application/Orders/Commands/CreateOrder/CreateOrderCommandHandler.cs` | Orders | 2026-04-01 |
| CQRS Query Handler | `Application/Orders/Queries/GetOrderById/GetOrderByIdQueryHandler.cs` | Orders | 2026-04-01 |
| FluentValidation | `Application/Orders/Commands/CreateOrder/CreateOrderCommandValidator.cs` | Orders | 2026-04-01 |
| EF Core Configuration | `Infrastructure/Persistence/Configurations/OrderConfiguration.cs` | Orders | 2026-04-01 |
| API Controller | `API/Controllers/OrdersController.cs` | Orders | 2026-04-01 |
| xUnit Handler Test | `Tests/Application.UnitTests/Orders/CreateOrderCommandHandlerTests.cs` | Orders | 2026-04-01 |

## Frontend Patterns

| Pattern | Canonical File | Module | Last Reviewed |
|---|---|---|---|
| Angular Standalone Component | `frontend/src/app/orders/create-order/create-order.component.ts` | Orders | 2026-04-01 |
| HTTP Service | `frontend/src/app/orders/orders.service.ts` | Orders | 2026-04-01 |
| Component Spec | `frontend/src/app/orders/create-order/create-order.component.spec.ts` | Orders | 2026-04-01 |
```

---

## Part 2: Automated Drift Detection

### 2.1 The Drift Detection Prompt (Run Every 3 Slices or Weekly)

```
## Role
You are a Code Consistency Auditor. Your job is to detect drift — places where new 
code has diverged from established canonical patterns.

## Task: Drift Analysis

Compare the following files against their canonical references:

### Files to Audit
New Implementation:
- [PASTE NEW HANDLER FILE]
- [PASTE NEW VALIDATOR FILE]
- [PASTE NEW CONTROLLER FILE]
- [PASTE NEW TEST FILE]

Canonical References:
- [PASTE CANONICAL HANDLER FROM REGISTRY]
- [PASTE CANONICAL VALIDATOR FROM REGISTRY]
- [PASTE CANONICAL CONTROLLER FROM REGISTRY]
- [PASTE CANONICAL TEST FROM REGISTRY]

## Analysis Dimensions
For each file pair, identify and classify:

1. **[DRIFT]** — Code that differs AND is WORSE than the canonical (violates documented rules)
   Format: [DRIFT] File:Line — Description of drift — Rule violated (cite .cursor/rules/ file)

2. **[IMPROVEMENT]** — Code that differs AND is BETTER than the canonical (should be promoted)
   Format: [IMPROVEMENT] File:Line — Description — Recommend promoting to new canonical

3. **[NEUTRAL]** — Code that differs but is neither better nor worse (context-specific)
   Format: [NEUTRAL] File:Line — Description — Reason why this deviation is acceptable

4. **[CONSISTENCY]** — Items that match the canonical exactly (affirm, don't list individually — just count)

## Output Summary
```
Drift Report — [Feature Name] vs. Canonical
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DRIFT items:       [N] — These MUST be fixed before merge
IMPROVEMENT items: [N] — Review for canonical promotion
NEUTRAL items:     [N] — Acceptable, document reason
Consistency Score: [X%] — Percentage of patterns matching canonical
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Verdict: [PASS (≥85% consistent) | WARN (70-84%) | FAIL (<70%)]
```
```

### 2.2 Consistency Score Thresholds

| Score | Status | Action Required |
|---|---|---|
| ≥ 85% | ✅ PASS | Standard PR review |
| 70–84% | ⚠️ WARN | Address all DRIFT items before merge |
| < 70% | ❌ FAIL | Block merge — full rewrite of drifted files required |

---

## Part 3: Pattern-by-Pattern Checklist

### 3.1 Command Handler Consistency Checklist

Verify every new handler against this checklist:

```
□ Class inherits from IRequestHandler<TCommand, Result<TResponse>>
□ Constructor uses primary constructor syntax (C# 12+)
□ Dependencies injected: repository + unit of work + current user service (no more, no less)
□ Handler body: Fetch → Validate domain rules → Call entity method → Persist → Return Result
□ No business logic in the handler (entity method handles it)
□ No direct DbContext usage (only via repository)
□ Logs one structured log entry at Information level (success) and one at Warning (business rejection)
□ Returns Result.Failure() with a descriptive error code — never throws business exceptions
□ Async all the way — no .Result or .Wait()
□ CancellationToken passed to all async calls
```

### 3.2 Validator Consistency Checklist

```
□ Class inherits AbstractValidator<TCommand>
□ All required fields have RuleFor(...).NotEmpty()
□ String fields have MaximumLength matching entity column config
□ Foreign key IDs validated with .GreaterThan(Guid.Empty) or .NotEmpty()
□ Business-rule validation (cross-field) uses .Must() or .MustAsync()
□ Error messages are user-friendly (not technical exceptions)
□ No database calls in validators (use handler for existence checks)
```

### 3.3 Test Consistency Checklist

```
□ Test class name: [HandlerName]Tests
□ One test method per acceptance criterion
□ Method naming: Given_[state]_When_[action]_Then_[expected]
□ All mocks created with Moq (no manual stubs)
□ Uses FluentAssertions for all assertions (no Assert.Equal)
□ Arrange / Act / Assert sections clearly separated by blank lines
□ No shared test state (each test is independent, no [Collection] sharing)
□ Unhappy paths test exception type AND message content
□ Domain events verified using mock.Verify() — not just checking return value
```

---

## Part 4: Drift Prevention (Proactive)

### 4.1 "Canonical Context" Rule in `.cursor/rules/`

Add this to `00_global.mdc`:

```
## Pattern Consistency Enforcement

When generating any handler, validator, controller, or test:
1. FIRST, reference the canonical example from CANONICAL_REGISTRY.md
2. Structure your output to MATCH the canonical structurally (method order, constructor, using statements)
3. If you deviate from the canonical for a valid reason, add a comment: // [DEVIATION: reason]
4. NEVER deviate from the canonical without an explicit deviation comment

The canonical files are:
- Handler: Application/Orders/Commands/CreateOrder/CreateOrderCommandHandler.cs
- Validator: Application/Orders/Commands/CreateOrder/CreateOrderCommandValidator.cs
- Controller: API/Controllers/OrdersController.cs
- Test: Tests/Application.UnitTests/Orders/CreateOrderCommandHandlerTests.cs
```

### 4.2 Pattern Promotion Process

When the drift detection finds an **[IMPROVEMENT]** — code that is genuinely better than the canonical:

```
Step 1: Validate the improvement
  → Is it actually better by the criteria in .cursor/rules/?
  → Does it solve a documented problem?
  → Is it consistent with SOLID principles?

Step 2: Update the canonical file
  → Apply the improvement to the canonical file
  → Add a comment: // [PROMOTED from feature/X on DATE: reason]
  → Commit with message: refactor(canonical): promote [improvement] to canonical pattern

Step 3: Update CANONICAL_REGISTRY.md
  → Update "Last Reviewed" date
  → Note the improvement in a "Changelog" section

Step 4: Apply to older slices (optional, risk-based)
  → For critical improvements (security, performance): apply immediately
  → For style improvements: apply in a dedicated "pattern normalization" sprint
```

---

## Part 5: The Monthly Pattern Audit

Schedule a **monthly pattern audit** (30-60 minutes):

```
Monthly Drift Audit Agenda
══════════════════════════

1. Run drift detection on the 5 most recently merged slices (10 min)
   → Input: Files from each merged branch vs. canonical registry
   → Output: Consistency scores for each slice

2. Review "Recurring AI Mistake Patterns" in AI_OBSERVABILITY_SUMMARY.md (5 min)
   → Which patterns does the AI get wrong repeatedly?

3. Update .cursor/rules/ to prevent recurring mistakes (15 min)
   → One new constraint per recurring pattern

4. Update Canonical Registry if improvements were promoted (5 min)

5. Document audit results in AI_OBSERVABILITY_SUMMARY.md (5 min)

Tool: Run PROMPT-14: Batch Drift Analysis (see Document 05 update)
```

---

## Summary

Vibe Drift is an **invisible enemy** — your codebase can look functional while quietly becoming inconsistent and unmaintainable. The Canonical Slice system and automated drift detection turn pattern consistency from a "hope-based" practice into a **measurable, enforceable standard**.

**The Core Rule:**
> Every 3rd slice, run drift detection. No exceptions.

**Next Step:** → [Document 09: Emergency Revert Protocol](./09_Emergency_Revert_Protocol.md)
