# Document 04: The Verification Loop

> **Suite:** Vibe Coding Best Approach v2.0  
> **Prerequisite:** [03 - Vertical Slice Execution](./03_Vertical_Slice_Execution.md)

---

## Overview

This document covers the **most underestimated phase** of AI-assisted development — verification. The original approach mentioned "edge case discovery" as a final step. This upgraded framework treats verification as a **continuous, systemic loop** integrated into every slice, not a bolt-on phase at the end.

> **The 60/40 Rule Restated:** In a well-functioning AI-assisted team, ~40% of time is spent prompting/generating and **~60% verifying, hardening, and committing**. If this ratio is inverted, technical debt is silently accumulating.

---

## Part 1: The Three Verification Layers

Each slice must pass through three verification layers before it can be considered "done":

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Automated Verification (Continuous)            │
│  → Unit Tests, Integration Tests, Build Checks           │
│  → Triggered automatically: on save, on commit, in CI    │
├──────────────────────────────────────────────────────────┤
│  Layer 2: Adversarial Verification (Per Slice)           │
│  → AI acts as Security Auditor + QA Engineer             │
│  → Finds edge cases, concurrency flaws, injection risks  │
├──────────────────────────────────────────────────────────┤
│  Layer 3: Architecture Verification (Per Feature/Sprint) │
│  → AI reviews compliance with Clean Architecture/SOLID   │
│  → Human architect reviews cross-cutting concerns        │
└──────────────────────────────────────────────────────────┘
```

---

## Part 2: Layer 1 — Automated Verification

### 2.1 Test Coverage Targets

| Layer | Test Type | Coverage Target | Tool |
|---|---|---|---|
| Domain | Unit tests for entity methods, state transitions | 95%+ | xUnit + FluentAssertions |
| Application | Unit tests for command/query handlers | 90%+ | xUnit + Moq |
| Application | Validator tests for all validation rules | 100% | xUnit + FluentValidation TestHelper |
| Infrastructure | Integration tests with in-memory DB | Happy path + 2 failure paths | xUnit + EF Core InMemory |
| API | Contract tests for API endpoints | All endpoints | xUnit + WebApplicationFactory |
| Frontend | Component tests for Angular components | Core interaction paths | Jest + Angular Testing Library |

### 2.2 Mandatory Build Gates

Configure in CI/CD (GitHub Actions / Azure DevOps):

```yaml
# .github/workflows/pr-Quality.yml
Quality Gates:
  - dotnet build --no-restore --warningsaserrors   # Zero warnings policy
  - dotnet test --collect:"XPlat Code Coverage"    # Run all tests
  - dotnet-coverage check --threshold 85           # 85% minimum coverage
  - dotnet format --verify-no-changes              # Code style enforcement
  - ng lint                                        # Angular linting
  - ng test --watch=false --code-coverage          # Angular tests
```

### 2.3 Immutable Test Guardrails

> **Critical Rule:** Once a test is green and committed, it becomes an **immutable guardrail**. AI agents should NEVER be permitted to delete or weaken tests. If a refactoring breaks a test, the refactoring is wrong — not the test.

Set this in your `00_global.mdc`:
```
NEVER delete existing passing tests. If a refactoring causes a test to fail, 
fix the implementation — not the test. If a test is genuinely obsolete 
(feature removed), flag it with [OBSOLETE] and await human approval to remove it.
```

---

## Part 3: Layer 2 — Adversarial Verification (The "What If?" Phase)

This is the upgraded version of the original "Edge Case Discovery" phase. Instead of a manual review, you use the AI as an adversarial agent to systematically probe the completed code.

### 3.1 The Adversarial Audit Prompt

Use this prompt after completing each slice:

```
## Role
You are a Senior Security Engineer and QA Lead conducting an adversarial code review.
Your mission is to FIND FAILURES, not to validate correctness.

## Task
Audit the following completed feature slice and identify:

1. SECURITY VULNERABILITIES
   - Authorization bypass scenarios
   - Input validation gaps
   - Injection risks (SQL, command, etc.)
   - Insecure direct object references (IDOR) — can UserA access UserB's data?
   - Mass assignment vulnerabilities
   - Missing rate limiting

2. CONCURRENCY & RACE CONDITIONS
   - What if two users submit the same form simultaneously?
   - What if a related entity is deleted while this operation is in progress?
   - Are optimistic concurrency tokens applied correctly?

3. BUSINESS RULE VIOLATIONS
   - What valid-but-unexpected inputs could cause incorrect behavior?
   - What sequence of operations could corrupt state?
   - Are all state machine transitions guarded correctly?

4. PERFORMANCE RISKS
   - N+1 query scenarios in the data access layer
   - Missing database indexes for the queries introduced by this feature
   - Unbounded collection loading (missing pagination)

## Output Format
For each issue found:
- [SEVERITY: Critical/High/Medium/Low]
- [CATEGORY: Security/Concurrency/Business/Performance]
- [DESCRIPTION]: Specific description of the vulnerability
- [ATTACK VECTOR]: How could this be exploited?
- [RECOMMENDED FIX]: Specific fix with code example

## Code to Audit
[PASTE the completed slice code here]
```

### 3.2 Recursive Criticism & Improvement (RCI) Pattern

After the adversarial audit generates issues, use RCI to fix them:

```
1. First Pass: Generate initial implementation
2. Critique Pass: Run adversarial audit prompt
3. Improvement Pass: "Fix all Critical and High severity issues from the audit above. 
   Show me only the changed files and explain what changed."
4. Re-Audit: "Re-audit the fixed code for the same issues. 
   Did the fixes introduce any new problems?"
5. Final Pass: Commit only when re-audit shows zero Critical/High findings
```

---

## Part 4: Common Edge Cases to Always Check

### 4.1 Multi-Tenancy Edge Cases (Critical for SaaS)

```
□ Can a user access data from a different tenant by guessing/brute-forcing IDs?
□ Does every query contain a TenantId filter (either explicit or via global query filter)?
□ Are cross-tenant operations (admin actions) properly guarded with a separate role?
□ Does the audit log capture which tenant performed sensitive actions?
```

### 4.2 Concurrency Edge Cases

```
□ Double-click form submission → duplicate records created?
□ Concurrent status updates → optimistic lock prevents corruption?
□ Long-running background job → entity deleted mid-operation?
□ Distributed environment → are there race conditions between services?
```

### 4.3 State Machine Edge Cases

```
□ Can the state be manipulated via the API to skip required states?
□ Are invalid state transitions caught in the domain layer (not just validation)?
□ What happens if a domain event handler fails mid-transition? Is it idempotent?
□ Can an entity be permanently stuck in a state if a dependency fails?
```

### 4.4 Input Validation Edge Cases

```
□ Empty string vs null — are both handled?
□ Maximum field length — what happens if a user submits 10,000 characters?
□ Special characters — SQL, HTML, script injection tested?
□ Numeric overflow — what if quantities/amounts exceed int/decimal max?
□ Future/past dates — are date ranges validated in business context?
□ Timezone edge cases — are all datetimes stored in UTC?
```

---

## Part 5: Layer 3 — Architecture Verification

### 5.1 The Architecture Compliance Audit Prompt

Run this at the end of every feature (not every slice):

```
## Role
You are a Clean Architecture enforcer. Review the following code for architectural violations.

## Rules to Verify Against
1. DEPENDENCY RULE: Dependencies must point INWARD only (API→Application→Domain, Infrastructure→Application).
   Flag any violation where an inner layer references an outer layer.
   
2. CQRS PURITY: Commands must not be used as queries. Handlers must not mix read and write logic.
   Flag any handler that both reads data AND returns domain entities (not DTOs).

3. ENTITY ENCAPSULATION: Business logic must live in domain entities, not in handlers.
   Flag any handler that contains IF/ELSE logic that should be an entity method.

4. INTERFACE SEGREGATION: Interfaces should not expose more than needed.
   Flag any interface with more than 5 methods — suggest splitting.

5. SOLID VIOLATIONS: Identify any obvious SRP, OCP, LSP, ISP, or DIP violations.

## Files to Review
[List the key files from this feature's implementation]
```

### 5.2 Human Architecture Review Checklist

Some things AI cannot verify — these require human judgment:

```
□ Does this feature's domain model align with the bounded context?
□ Does this feature introduce cross-module coupling that should be avoided?
□ Are domain events the right mechanism, or should we use a direct service call here?
□ Is the performance profile acceptable for the expected data volume?
□ Does this feature's API contract break any existing consumers?
□ Are there naming inconsistencies with the rest of the domain language (Ubiquitous Language)?
```

---

## Part 6: Security-Specific Verification (OWASP-Based)

### 6.1 Quick OWASP Top 10 AI Checklist

After generating any authentication, authorization, or data-handling code:

```
A01 - Broken Access Control:
  □ Does every API endpoint enforce [Authorize] with the correct role?
  □ Is data filtered by the current user's TenantId?

A02 - Cryptographic Failures:
  □ No passwords stored in plaintext — using ASP.NET Core Identity hash?
  □ Sensitive data in transit uses TLS only?
  □ No secrets in appsettings.json committed to git?

A03 - Injection:
  □ All database queries use EF Core parameterized LINQ (no raw SQL strings)?
  □ All HTML output is encoded (Angular does this by default — confirm no `innerHTML` bypass)?

A04 - Insecure Design:
  □ Rate limiting on all authentication endpoints?
  □ Account lockout policy implemented?

A05 - Security Misconfiguration:
  □ CORS policy is not wildcard `*`?
  □ Error responses don't expose stack traces in production?

A07 - Identification and Authentication Failures:
  □ JWT token expiry is reasonable (≤ 60 minutes for access tokens)?
  □ Refresh token rotation implemented?

A09 - Security Logging and Monitoring:
  □ All critical business operations (order submission, payment, login) are logged with who/what/when?
```

### 6.2 The Adversarial Role-Play Prompts

**For Authentication:**
```
"Act as a penetration tester. Given the following authentication flow, 
describe 5 ways you would attempt to bypass it. 
Then implement the fixes to prevent each bypass."
```

**For Authorization:**
```
"Act as a malicious user who has a valid account in Tenant A. 
Given the following API endpoints and handler code, describe 3 ways 
you could attempt to access Tenant B's data. 
Then implement proper guards to prevent each scenario."
```

**For Business Logic:**
```
"Act as a user who wants to cheat the system. Given the following 
Order Submission flow, describe 4 ways you could attempt to:
- Submit an order that should be invalid
- Get a discount you don't qualify for  
- Bypass the approval workflow
Then implement validation to block each attempt."
```

---

## Part 7: Verification Dashboard (Team Tracking)

Maintain a simple tracking document per sprint:

```markdown
## Verification Status — Sprint [X]

| Slice | Unit Tests | Integration | Adversarial Audit | AI_DECISIONS | Architecture OK | Merged |
|---|---|---|---|---|---|---|
| Create Order | ✅ | ✅ | ✅ (3 fixes applied) | ✅ High conf | ✅ | ✅ |
| Submit Order | ✅ | ✅ | 🔄 In Progress | ✅ Med conf | ⬜ | ⬜ |
| Approve Order | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

Legend: ✅ Done | 🔄 In Progress | ⬜ Not Started | ❌ Failed (blocked)
```

---

## Part 8: Layer 4 — AI Agent Observability

> **From External Analysis — Priority 🔴 Critical**

Every AI-generated feature must leave an **audit trail** explaining *why* the AI made specific implementation choices. This layer closes the "why did the AI do this?" gap that makes debugging AI-generated code so painful months later.

### 8.1 The Observability Requirement

After completing each slice, run PROMPT-13 (Document 05) to generate `AI_DECISIONS.md` for the branch. This file documents:

| What to Log | Why It Matters |
|---|---|
| Alternatives the AI considered | Explains why the chosen approach is correct, not accidental |
| Which `.cursor/rules/` rule drove each decision | Makes rule effectiveness traceable |
| Assumptions made about ambiguous requirements | Creates a list of things to validate with stakeholders |
| Confidence level (High/Medium/Low) per decision area | Flags areas needing extra human review |

### 8.2 Updated Verification Layers

The framework now has **four** verification layers:

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Automated Verification (Continuous)            │
│  → Unit Tests, Integration Tests, Build Checks           │
├──────────────────────────────────────────────────────────┤
│  Layer 2: Adversarial Verification (Per Slice)           │
│  → Security audit, edge cases, RCI pattern               │
├──────────────────────────────────────────────────────────┤
│  Layer 3: Architecture Verification (Per Feature/Sprint) │
│  → SOLID compliance, dependency direction, drift check   │
├──────────────────────────────────────────────────────────┤
│  Layer 4: Observability (Per Slice) ← NEW                │
│  → AI_DECISIONS.md committed alongside code              │
│  → Assumptions validated, technical debt tracked         │
└──────────────────────────────────────────────────────────┘
```

> **See [Document 07](./07_AI_Observability_and_Decision_Logging.md) for the full Observability framework, PROMPT-13, and the `AI_DECISIONS.md` template.**

---

## Part 9: Human Approval Gates (Irreversible Operations)

> **From External Analysis — Priority 🔴 Critical**

The framework must not blindly trust AI for operations that are **irreversible or system-critical**. The following operations require mandatory human review — the AI generates a PLAN only; the human reviews, approves, and executes.

### 9.1 Operations Requiring Mandatory Human Review

| Operation | Risk Level | Required Gate |
|---|---|---|
| **Database migration generation** | 🔴 Critical — irreversible schema change | Human must review the generated SQL via `dotnet ef migrations script` before any `dotnet ef database update` |
| **Data deletion logic** (`IsDeleted`, `HardDelete`) | 🔴 Critical — data loss | Pair review + dry-run in staging with count of affected rows |
| **Permission/role changes** | 🔴 Critical — security bypass | Security team approval + penetration test on the change |
| **External API key rotation** | 🟡 High — service disruption | Runbook-based execution, not AI-generated code |
| **Production configuration changes** | 🟡 High — global impact | Change advisory board (CAB) review |
| **Bulk data operations** (`UPDATE table SET ...`) | 🟡 High — mass data corruption | Dry-run with row count + staging verification first |

### 9.2 The "Red Flag" Prompt Prefix

For any prompt involving these operations, use this prefix to force plan-first behavior:

```
[RED FLAG: DESTRUCTIVE/IRREVERSIBLE OPERATION]
Operation type: [MIGRATION / DATA DELETE / PERMISSION CHANGE / CONFIG / BULK UPDATE]

DO NOT generate executable code yet.

First, generate a "Plan of Record" containing:
1. WHAT WILL CHANGE: Exact list of tables/rows/permissions affected
2. WHAT BREAKS IF WRONG: Description of the failure scenario
3. ROLLBACK STRATEGY: How to revert this change if it fails
4. VERIFICATION STEPS: Tests that must pass before declaring success
5. STAGING CHECK: What to verify in staging before running in production

I will review this plan and explicitly say "APPROVED — proceed" before you generate code.
```

### 9.3 Migration-Specific Safety Protocol

Database migrations deserve special treatment — they combine irreversibility with potential data loss:

```bash
# Step 1: Generate the migration (AI can do this)
dotnet ef migrations add [MigrationName]

# Step 2: Generate the SQL script (HUMAN REVIEWS THIS)
dotnet ef migrations script --idempotent -o migration_review.sql
# Open migration_review.sql and verify:
# - No unexpected DROP TABLE or DROP COLUMN statements
# - No data transformation that could lose precision
# - No missing indexes on foreign keys

# Step 3: Run in development first (human executes)
dotnet ef database update

# Step 4: Only after dev verification — run in staging
# Step 5: Only after staging verification — approve for production
```

---

## Summary

The Verification Loop is not a "nice to have" — it is **the mechanism that makes AI development sustainable**. Fast generation without rigorous verification produces fast technical debt.

**The Four-Layer Verification Stack:**
1. **Automated** — Tests run on every commit (Document 04, Part 2)
2. **Adversarial** — AI red-teams its own output per slice (Document 04, Part 3)
3. **Architecture** — SOLID/Clean Architecture compliance per feature (Document 04, Part 5)
4. **Observability** — AI_DECISIONS.md audit trail per branch (Document 07)

**Plus Human Gates** for irreversible operations (Document 04, Part 9)

**The Verification Mantra:**
> "Generated code is a first draft. Only tested, reviewed, hardened, and observed code ships."

**Next Step:** → [Document 05: Advanced Prompt Library](./05_Advanced_Prompt_Library.md)
