# Document 10: AI Output Quality Metrics

> **Suite:** Vibe Coding Best Approach v2.0 — External Analysis Upgrade  
> **Priority:** 🟡 High  
> **Addresses Gap:** "There is no objective way to measure whether rules files and prompts are actually improving AI output quality over time."

---

## The Measurement Problem

"Vibe Coding" without measurement is just vibing. Without quantitative metrics, you cannot answer:
- Is the AI getting better or worse as the codebase grows?
- Which prompt templates deliver the highest-quality output?
- Which `.cursor/rules/` constraints are actually working?
- When should we invest in prompt improvement vs. just accepting the current quality?

This document establishes a **quantitative framework** for measuring, tracking, and improving AI output quality per sprint and per project.

---

## Part 1: The Five Quality Dimensions

Every feature slice is scored across five dimensions:

| Dimension | What It Measures | Target | Unit |
|---|---|---|---|
| **🎯 Correctness** | Tests pass on first AI generation, without debugging | ≥ 70% | % of slices passing all tests immediately |
| **📐 Rule Compliance** | Architecture/pattern violations introduced | ≤ 2 per slice | Count of DRIFT items from drift detection |
| **🔒 Security** | Critical security findings introduced | 0 | Count of Critical findings from PROMPT-09 |
| **✂️ Conciseness** | Unnecessary code bloat | ≤ 1.2× | Lines generated ÷ lines in MVP implementation |
| **🔄 Consistency** | Structural divergence from canonical pattern | ≤ 3 | Count of DRIFT items from drift detection |

---

## Part 2: How to Measure Each Dimension

### 2.1 Correctness Score

**Definition:** The percentage of slices where ALL tests pass on the first `dotnet test` run — with zero debugging or fixing of AI-generated code.

**How to Track:**

```
For each slice, record:
- First test run result: [PASS / FAIL]
- If FAIL: Number of debugging iterations needed

Correctness Score = (Slices where first run = PASS) ÷ (Total slices) × 100%
```

**Improving Correctness:**
- Low score (<60%): Prompts are too vague — add more context from acceptance criteria
- Medium score (60-80%): Add the Chain-of-Thought prefix to prompts
- Track WHICH prompts produce low-correctness slices and refine them first

---

### 2.2 Rule Compliance Score

**Definition:** The number of DRIFT items (violations of documented rules) found in each slice during drift detection.

**How to Measure:** Run the Drift Detection Prompt (Document 08) after each slice merge:

```
Rule Compliance Score per slice:
- 0 DRIFT items = 100% compliant ✅
- 1–2 DRIFT items = Acceptable ⚠️ (fix before merge)
- 3–5 DRIFT items = Warning — update .cursor/rules/ ⚠️
- > 5 DRIFT items = Fail — full rewrite required ❌
```

**Improving Compliance:**
- Each DRIFT item reveals a gap in `.cursor/rules/` — add an explicit constraint
- After adding a constraint: retest with the same slice to confirm the AI now follows it

---

### 2.3 Security Score

**Definition:** The count of Critical and High-severity findings from the Adversarial Security Audit (PROMPT-09).

**How to Measure:** Run PROMPT-09 on every completed slice. Count findings by severity:

```
Security Score targets per slice:
- Critical findings: 0 (Zero tolerance — block merge if > 0)
- High findings: ≤ 1 (Must fix before merge)
- Medium findings: ≤ 3 (Fix or document accepted risk)
- Low findings: No limit (document and backlog)
```

**Security Pass/Fail:**
```
PASS = 0 Critical + ≤ 1 High (after fixes applied)
FAIL = Any Critical OR > 1 High remaining after one fix iteration
```

---

### 2.4 Conciseness Score

**Definition:** The ratio of lines actually generated to the minimum lines needed for a correct implementation.

**How to Measure:**
1. After the AI generates a slice, note the total generated LOC
2. Estimate the "Minimal Viable Implementation" (MVI) LOC manually (or ask the AI: "What is the minimum lines needed for this?")
3. Score = Generated LOC ÷ MVI LOC

```
Conciseness Score:
- 1.0× = Perfect (AI generated exactly what's needed)
- 1.0–1.2× = Acceptable (up to 20% overhead)  
- 1.2–1.5× = Warning (excessive boilerplate or unnecessary abstractions)
- > 1.5× = Fail (AI added significant unnecessary code — review carefully)
```

**Common Causes of Low Conciseness:**
- AI adds defensive null checks for non-nullable types
- AI creates unnecessary abstraction layers  
- AI repeats documentation in both comments AND method names
- AI generates unused imports or dead code

---

### 2.5 Consistency Score

**Definition:** The number of structural differences from the canonical pattern, as identified by drift detection.

**How to Measure:** Same drift detection run as Rule Compliance, but count structural differences specifically (naming, method order, inheritance chain) rather than rule violations.

```
Consistency Score:
- 0–1 structural differences = ✅ Excellent
- 2–3 structural differences = ⚠️ Acceptable
- 4–6 structural differences = ⚠️ Warning — update canonical context in prompt
- > 6 structural differences = ❌ Fail — canonical reference not being used
```

---

## Part 3: The Sprint Scorecard

### 3.1 Scorecard Template

Maintain `AI_QUALITY_SCORECARD.md` in the project root, updated after each slice:

```markdown
# AI Quality Scorecard — [Project Name]

**Sprint:** [Sprint Number] | **Period:** [Start Date] → [End Date]

---

## Per-Slice Results

| Slice | Correctness | Compliance | Security | Conciseness | Consistency | Overall |
|---|---|---|---|---|---|---|
| Orders-Create | ✅ 1st pass | ✅ 0 drift | ✅ 0 critical | ✅ 1.1× | ✅ 1 diff | **✅ PASS** |
| Orders-Submit | ❌ 2 iter | ⚠️ 3 drift | ❌ 1 critical | ⚠️ 1.3× | ⚠️ 4 diff | **❌ FAIL** |
| Orders-Approve | ✅ 1st pass | ✅ 0 drift | ✅ 0 critical | ✅ 1.0× | ✅ 0 diff | **✅ PASS** |
| Orders-List | ✅ 1st pass | ✅ 1 drift | ✅ 0 critical | ✅ 1.1× | ✅ 2 diff | **✅ PASS** |

---

## Sprint Summary

| Metric | Sprint Total | Target | Status |
|---|---|---|---|
| Slices Passing All Metrics | 3/4 | ≥ 80% | ⚠️ Below Target |
| Overall Correctness Rate | 75% | ≥ 70% | ✅ |
| Average Drift Items | 1.0 | ≤ 2 | ✅ |
| Total Critical Security Findings | 1 | 0 | ❌ |
| Average Conciseness | 1.1× | ≤ 1.2× | ✅ |
| Average Consistency Differences | 1.75 | ≤ 3 | ✅ |

---

## FAIL Slice Actions (Orders-Submit)

**Root Cause Analysis:**
- Correctness Failure: Concurrency token not applied — fixed after 2 debug iterations
- Compliance Failure: 3 drift items — validation placed in controller (rule added to `02_backend.mdc`)
- Security Failure: IDOR found — `[Authorize]` missing resource ownership check

**Rules Updated This Sprint:**
1. `02_backend.mdc` Line 78: "NEVER place FluentValidation logic in controllers"
2. `05_security.mdc` Line 23: "ALWAYS verify resource ownership in ICurrentUserService before any read operation"

---

## Sprint Trend

| Sprint | Pass Rate | Correctness | Avg Security | 
|---|---|---|---|
| Sprint 1 | 50% | 55% | 3 criticals |
| Sprint 2 | 65% | 62% | 1 critical |
| Sprint 3 | 75% | 75% | 1 critical |
| Sprint 4 | - | - | - |

**Trend: Improving ↑** — Rules updates are working. Target: ≥ 85% pass rate by Sprint 6.
```

---

## Part 4: The Improvement Loop

### 4.1 The "Root Cause → Rule" Cycle

Every FAIL on any dimension feeds back into the rules system:

```
SLICE FAILS METRIC
        ↓
Identify root cause dimension
        ↓
┌─── Correctness fail → Improve the prompt template for this type of task
├─── Compliance fail  → Add explicit prohibition to .cursor/rules/ file
├─── Security fail    → Add OWASP rule to 05_security.mdc
├─── Conciseness fail → Add "avoid unnecessary abstraction" constraint to global.mdc
└─── Consistency fail → Reference canonical more explicitly in prompt
        ↓
Add the rule → Re-run the same prompt → Measure improvement
        ↓
Document: "Rule X added on [DATE] due to [METRIC] failure on [SLICE]"
```

### 4.2 The "Golden Session" Benchmark  

Once per month, run a **Golden Session** — a controlled experiment to measure true AI quality improvement:

```markdown
## Golden Session Protocol

1. Choose a previously-completed slice (canonical reference slice)
2. Delete the implementation (keep tests)
3. Re-run the same generation prompts in a clean session
4. Measure: How has quality changed since the original implementation?
   - Do more tests pass on first run?
   - Did the AI produce fewer drift items?
   - Did the adversarial audit find fewer issues?

This measures whether your rules file updates are actually training the AI 
to produce better output over time.
```

---

## Part 5: PROMPT-14 — Batch Drift & Quality Check

**When to Use:** After every 3 merged slices (can also be automated as a weekly job).

```
## Role
You are a Sprint Quality Analyst performing a systematic quality audit.

## Task
Perform a batch quality analysis across the following 3 recently implemented slices:
- Slice 1: [FEATURE NAME] — [BRANCH NAME]
- Slice 2: [FEATURE NAME] — [BRANCH NAME]
- Slice 3: [FEATURE NAME] — [BRANCH NAME]

## Analysis Required

### For each slice, evaluate:

1. **Rule Compliance**
   Compare implementation to .cursor/rules/ and canonical registry.
   Count DRIFT items (explicit rule violations).

2. **Consistency**  
   Compare structure of handlers, validators, tests to canonical files.
   Count structural differences.

3. **Conciseness**
   Identify any obviously unnecessary code (null guards on non-nullables,
   unused variables, excessive comments, dead code paths).

4. **Pattern Promotion**
   Identify any [IMPROVEMENT] patterns (code that is genuinely better
   than the canonical) for promotion.

## Output

For each slice:
```
Slice: [Name]
─────────────────────────
Compliance:   [N drift items] → [PASS/WARN/FAIL]
Consistency:  [N differences] → [PASS/WARN/FAIL]
Conciseness:  [X.Xx ratio]   → [PASS/WARN/FAIL]
Improvements found: [N] → [LIST if > 0]
─────────────────────────
Recommendation: [MERGE / FIX FIRST / REWRITE]
```

Then produce an update for AI_QUALITY_SCORECARD.md.
```

---

## Part 6: Quality KPIs and Success Thresholds

### Project-Level Quality KPIs (Quarterly Review)

| KPI | Starting Baseline | Month 1 Target | Month 3 Target | Month 6 Target |
|---|---|---|---|---|
| Slice Pass Rate | Measure first | ≥ 60% | ≥ 75% | ≥ 90% |
| Correctness on First Gen | Measure first | ≥ 50% | ≥ 65% | ≥ 80% |
| Critical Security Findings/Sprint | Measure first | ≤ 3 | ≤ 1 | 0 |
| Average Drift Items/Slice | Measure first | ≤ 5 | ≤ 3 | ≤ 1 |
| .cursor/rules/ Updates/Sprint | N/A | ≥ 3 | ≥ 2 | ≤ 1 (stable) |

> **The last KPI is counterintuitive:** By Month 6, you should be updating `.cursor/rules/` LESS — because the rules are comprehensive enough that new violations are rare.

---

## Summary

Quality metrics transform AI-assisted development from a **faith-based** practice ("I trust the AI is getting better") to an **evidence-based** one ("The data shows 40% improvement in correctness since we added the validator rules").

**The Core Feedback Loop:**
```
Measure → Identify lowest metric → Update rules/prompts → Re-measure → Repeat
```

**The Minimum Viable Metrics Program:**
If doing everything here feels overwhelming, start with just two:
1. **Correctness** (did tests pass first time?) — takes 30 seconds to record
2. **Security Critical Count** — already measured in your verification loop

Everything else can be added incrementally.

---

*This completes the upgraded Vibe Coding Best Approach documentation suite (v2.1 — 10 documents).*
