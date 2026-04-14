# Document 09: Emergency Revert Protocol (AI Catastrophe Recovery)

> **Suite:** Vibe Coding Best Approach v2.0 — External Analysis Upgrade  
> **Priority:** 🟡 High (Critical in practice)  
> **Addresses Gap:** "The framework assumes the AI will always produce fixable code. No documented catastrophe recovery protocol exists."

---

## The Catastrophe Problem

AI coding agents can fail in ways far more dramatic than a simple syntax error. Unlike a junior developer who produces bad code gradually, an AI agent can generate **confidently wrong** code at high speed — overwriting multiple files before you realize something is broken.

Common AI catastrophes:
- Regenerates a file in a completely different pattern, overwriting working code
- Hallucinates the existence of interfaces/classes and generates code that references them
- Applies a refactoring to 15 files creating a cascading compilation failure
- Generates a database migration that drops a non-nullable column with live data
- Silently ignores your "STOP" command and continues generating
- Produces code that compiles and passes type-checks but is logically incoherent

**Your framework cannot afford to say "just debug it with AI."** When a catastrophe occurs, debugging with the same session that caused the problem often makes it worse.

---

## Part 1: Recognizing an Emergency

### 1.1 The Emergency Declaration Criteria

Declare an **AI Emergency** when ANY of the following are true:

| Trigger | Description | Urgency |
|---|---|---|
| **Mass File Overwrite** | AI modifies or deletes ≥ 3 files in ways you did not anticipate | 🔴 Immediate |
| **Logical Incoherence** | Code compiles but is fundamentally wrong in business logic across multiple files | 🔴 Immediate |
| **Infinite Debug Loop** | You've spent > 45 minutes trying to fix AI-generated bugs in the same session | 🟡 High |
| **STOP Ignored** | The AI continues generating code after you've said "stop" or "revert" | 🔴 Immediate |
| **Context Collapse** | AI starts generating code with wrong entity names, wrong patterns, wrong layer | 🟡 High |
| **Security Regression** | A previously passing security test now fails due to AI changes | 🔴 Immediate |
| **Build Broken > 15 min** | The build has not compiled for more than 15 minutes after AI changes | 🟡 High |

### 1.2 The Warning Signs (Pre-Catastrophe)

Watch for these early signals and slow down immediately:

```
⚠️ Warning: AI starts referencing interfaces that don't exist
⚠️ Warning: AI rewrites working code "to improve it" without being asked
⚠️ Warning: AI output grows consistently longer each iteration (context spiral)
⚠️ Warning: AI stops citing rule files in its decisions
⚠️ Warning: AI generates the same error fix 3 times without success
⚠️ Warning: You feel confused about what the AI just did
```

**At any warning sign: STOP. Commit what's working. Start a fresh session.**

---

## Part 2: The 3-Step Emergency Protocol

### STEP 1: Immediate Containment (≤ 30 seconds)

Do this BEFORE doing anything else:

```bash
# 1. Close the AI chat window or stop the agent immediately
#    Do NOT accept any more AI suggestions

# 2. Check what changed
git status
git diff --stat

# 3. Contain the damage — choose based on what you see:

# Option A: Stash uncommitted changes (preferred — reversible)
git stash push -m "AI catastrophe stash [DATE TIME]"

# Option B: Hard reset to last known-good commit (nuclear — irreversible)
git reset --hard HEAD

# Option C: If AI already committed (check git log):
git log --oneline -5   # identify the bad commit hash
git revert [BAD_COMMIT_HASH]   # creates a revert commit (safe)
# OR
git reset --hard [LAST_GOOD_COMMIT_HASH]   # destroys bad commits (dangerous)
```

> ⚠️ **NEVER use `git reset --hard` on commits that have been pushed to remote without coordinating with your team first.**

---

### STEP 2: Root Cause Analysis (≤ 20 minutes)

**Open a FRESH AI chat session** — not the session that caused the catastrophe. The corrupted session has bad context.

Use this prompt:

```
## Role
You are an AI session failure analyst.

## Situation
My previous AI coding session ended in a catastrophe. I need to understand what went wrong 
so I can prevent it when I retry the task.

## What Happened
[Describe exactly what you were trying to do and what went wrong]
[Include the last 3-5 prompts from the failed session if possible]

## Potential Failure Modes to Check

1. CONTEXT OVERLOAD
   - Were > 15 files included in the context?
   - Was the task scope too large for one session?
   
2. AMBIGUOUS INSTRUCTIONS
   - Was the prompt specific enough?
   - Did it leave too much room for interpretation?
   
3. MISSING CONSTRAINTS
   - Which .cursor/rules/ rule should have prevented this?
   - Was the rule missing, or did the AI ignore it?

4. TOOL OVERLOAD
   - Were too many MCP tools active? (> 10)
   - Did MCP tools return unexpected data?

5. CASCADING FAILURE PATTERN
   - Did I approve an early bad decision that cascaded into more bad decisions?

## Output
1. Most likely root cause (primary)
2. Contributing factors (secondary)
3. Specific prevention measures for the retry attempt
4. Updated prompt/task decomposition for the retry
```

---

### STEP 3: Recovery with Guardrails (≤ 45 minutes)

Re-attempt the task using these recovery guardrails:

```
RECOVERY SESSION RULES:
━━━━━━━━━━━━━━━━━━━━━
Rule 1: HALVE THE SCOPE
  Break the same task into 2 sub-tasks.
  Complete and commit sub-task 1 before starting sub-task 2.

Rule 2: DRY-RUN FIRST
  Start every prompt with:
  "Before writing any code, tell me: which files will you create or modify?
   What will each file contain? Wait for my approval before proceeding."

Rule 3: ONE FILE AT A TIME
  Generate, review, and commit ONE FILE before moving to the next.
  Do not let the AI queue up multiple file changes.

Rule 4: EXPLICIT STOP TRIGGERS
  Add this to your prompt:
  "STOP and wait for my approval after each file. Do NOT proceed to the 
   next file without my explicit 'continue' command."

Rule 5: FRESH CONTEXT ONLY
  Reference only the files directly relevant to the current sub-task.
  Do not include the "full codebase" or "all related files."
```

---

## Part 3: The Canary Test Pattern

### 3.1 What is a Canary Test?

Before trusting the AI with a complex task, probe its understanding with a minimal "canary" — a deliberate simplification to verify the AI has the right mental model before it generates real code.

### 3.2 How to Run a Canary

```
## Canary Prompt Template

Before implementing [FULL_FEATURE], I want to verify your understanding.
Implement a MINIMAL version of this feature:
- Only the domain entity method (NOT the handler, NOT the API, NOT tests)
- The method should change the entity's Status from [FROM] to [TO]
- Include one guard condition: [GUARD]

Output ONLY this one method. Nothing else.

[I will review this before authorizing the full implementation.]
```

**Verify the canary:**
- Does it follow the domain entity pattern from our canonical reference?
- Is the guard condition in the right place (entity, not handler)?
- Does it fire the domain event correctly?

**Only proceed with full implementation if the canary is perfect.**

### 3.3 Canary Triggers (When to ALWAYS Run a Canary)

Run a canary before any session involving:
- A pattern you haven't implemented in this project before
- A session after you've changed `.cursor/rules/` files (verify rules are working)
- A session after merging a large feature branch (context may have shifted)
- Any task rated as "High Risk" in the Human Approval Gates table (Document 04)
- After returning from a multi-day break from the project

---

## Part 4: The 45-Minute Rule

One of the hardest disciplines in AI-assisted development is knowing when to **stop fighting the AI and revert**.

### 4.1 The Timer Protocol

```
When you start debugging AI-generated code, set a timer: 45 minutes.

At the timer:
├── Tests still failing / build still broken?
│   └── DECLARE EMERGENCY. Execute Steps 1, 2, 3.
│
└── Making progress (partial fixes working)?
    └── Set another 20-minute timer. If still not resolved: DECLARE EMERGENCY.
```

### 4.2 The Psychological Challenge

The hardest part of the 45-minute rule is emotional: you've invested time in the session and don't want to "waste" it by reverting. This is the **Sunk Cost Fallacy** applied to AI development.

**The correct mental model:**
> The code generated by the AI does not belong to you yet. It only becomes yours when it passes all tests and is committed. Until then, discarding it costs you nothing real — only the 45 minutes of your time, which you would have wasted continuing to fight a broken session.

**The revert is always faster than the continued fight.**

---

## Part 5: Prevention — The Defensive Prompt Posture

The best emergency is the one that never happens:

### 5.1 The "Slow Down" Prompt Prefix

Add this to any prompt you're uncertain about:

```
## Safety Mode: ON

This is a complex/high-risk task. Use extreme caution:
1. PLAN first: List exactly which files you will create/modify
2. Wait for my explicit "proceed" before writing any code
3. After each file, STOP and wait for my "continue" before the next
4. If you encounter anything unexpected, STOP and ask — do not improvise
5. Flag any deviation from .cursor/rules/ BEFORE making it, not after
```

### 5.2 The Session Scope Contract

Before every session, define the scope explicitly:

```
## Session Scope Contract

THIS SESSION COVERS:
- Files I authorize you to CREATE: [LIST]
- Files I authorize you to MODIFY: [LIST]
- Files that are OFF-LIMITS: [LIST — especially migrations, configs]

DO NOT touch any file not in the authorized list above.
If you need to touch an unlisted file, ask first.
```

---

## Part 6: Post-Mortem Template

After any emergency, complete a post-mortem in `AI_DECISIONS.md` for the affected branch:

```markdown
## AI Emergency Post-Mortem

**Date:** [DATE]
**Session Duration:** [X minutes]
**Revert Type:** git stash / git reset --hard / git revert [HASH]

### What Was Lost
- Files affected: [LIST]
- Working time lost: [X minutes]
- Features regressed: [LIST or None]

### Root Cause (from Step 2 Analysis)
[Primary root cause]

### Prevention Measures Applied
1. [What changed in the retry setup]
2. [What rule was added to .cursor/rules/]
3. [What was decomposed differently]

### Outcome
[Did the retry succeed? What was different?]
```

---

## Summary

> **The Emergency Revert Protocol transforms a chaotic catastrophe into a structured, time-bounded recovery.** The 3-step sequence (Containment → Analysis → Recovery) prevents the most common mistake: continuing to fight a broken AI session until the damage is irreparable.

**The Golden Rule:**
> When in doubt, stash and revert. Git is free. Your sanity is not.

**Next Step:** → [Document 10: AI Output Quality Metrics](./10_AI_Output_Quality_Metrics.md)
