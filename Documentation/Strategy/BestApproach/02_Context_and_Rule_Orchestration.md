# Document 02: Context & Rule Orchestration

> **Suite:** Vibe Coding Best Approach v2.0  
> **Prerequisite:** [01 - Philosophy & Mindset](./01_Philosophy_and_Mindset.md)

---

## Overview

Context is the single most powerful lever in AI-assisted development. This document provides the complete, practical framework for setting up and maintaining **project context**, **agent rules**, and **MCP (Model Context Protocol) integrations** that turn your AI tool from a generic assistant into a project-aware, architecture-compliant coding partner.

---

## Part 1: Project Rules Setup (The "Guardrails")

### 1.1 The `.cursor/rules/` Directory Structure

For Cursor IDE, create a structured set of `.mdc` rule files. For Windsurf/Trae, equivalent files go in `.windsurf/rules/` or the project's system prompt configuration.

**Recommended structure:**
```
.cursor/
└── rules/
    ├── 00_global.mdc          ← Applied to ALL conversations
    ├── 01_architecture.mdc    ← Tech stack & architectural patterns
    ├── 02_backend.mdc         ← .NET / ASP.NET Core specific rules
    ├── 03_frontend.mdc        ← Angular specific rules
    ├── 04_testing.mdc         ← Test standards and naming conventions
    ├── 05_security.mdc        ← Security constraints and OWASP rules
    └── 06_git.mdc             ← Commit message format, branch naming
```

---

### 1.2 Template: `00_global.mdc` (Master Rule File)

```markdown
---
description: Global rules applied to all agent sessions in this project.
globs: "**/*"
alwaysApply: true
---

# Project: [YOUR_PROJECT_NAME]
# Tech Stack: Clean Architecture | CQRS + MediatR | ASP.NET Core (.NET 9) | Angular 19 (Standalone)

## Core Principles
- You are assisting a senior architect. Generate code that a senior engineer would write.
- Never sacrifice correctness for brevity. Prefer explicit over implicit.
- Always adhere to the architectural patterns established in this project. Never introduce new patterns without explicit instruction.

## Non-Negotiable Constraints
- DO NOT use in-memory state for business logic. All state must persist through the domain model.
- DO NOT use `dynamic` types in C# or `any` types in TypeScript without explicit permission.
- DO NOT hardcode connection strings, API keys, or secrets. Use environment variables or IOptions<T>.
- DO NOT modify database migrations that have already been applied. Always create a new migration.
- ALWAYS generate corresponding unit or integration tests for any new handler, service, or complex component.

## Response Format
- When generating code, provide ONLY the code files relevant to the task.
- Briefly explain the NON-OBVIOUS decisions made. Skip explanations of standard patterns.
- If a task requires changes across more than 3 files, list all affected files FIRST before generating code.
- Flag any assumptions you are making about the codebase as [ASSUMPTION: ...].
```

---

### 1.3 Template: `01_architecture.mdc` (Architectural Guardrails)

```markdown
---
description: Clean Architecture + CQRS pattern enforcement.
globs: "**/*.cs"
alwaysApply: false
---

# Architectural Patterns

## Layer Structure (Clean Architecture)
- Domain Layer: Entities, Aggregates, Value Objects, Domain Events, Interfaces. ZERO external dependencies.
- Application Layer: CQRS Handlers (MediatR), DTOs, Validators (FluentValidation), Interfaces. Depends ONLY on Domain.
- Infrastructure Layer: EF Core DbContext, Repository implementations, external service clients. Implements Application interfaces.
- API Layer: ASP.NET Core Controllers, Middleware, Filters. Thin — delegates all logic to Application layer via MediatR.

## CQRS Rules
- Commands: Mutate state. Return only `Result<T>` or `Unit`. Never return domain entities directly.
- Queries: Read-only. NEVER modify state. Use DTOs/Read Models, not domain entities.
- Handler naming: `<Verb><Entity>CommandHandler` / `<Verb><Entity>QueryHandler`
- Validator naming: `<Command/Query>Validator`

## Entity Rules
- All entities inherit from base entity with `Id` (Guid), `CreatedAt`, `UpdatedAt`, `CreatedBy`.
- Use private setters. Domain logic lives IN the entity, not in handlers.
- Use Domain Events (`IDomainEvent`) for cross-aggregate communication. Never call handlers directly.

## Repository Pattern
- Generic `IRepository<T>` for basic CRUD.
- Specific `IOrderRepository` for complex queries on Order aggregate.
- No raw SQL in repositories — use EF Core LINQ or compile-time query methods.
```

---

### 1.4 Template: `05_security.mdc` (Security Rules)

```markdown
---
description: Security constraints applied to all backend code generation.
globs: "**/*.cs"
alwaysApply: true
---

# Security Non-Negotiables

## Authentication & Authorization
- ALWAYS apply `[Authorize]` attribute at controller level. Opt-out explicitly with `[AllowAnonymous]`.
- Multi-tenancy: ALWAYS filter queries by `TenantId`. Never return cross-tenant data.
- Use `ICurrentUserService` to get the authenticated user context — never trust client-provided user IDs.

## Input Validation
- ALL commands MUST have a corresponding FluentValidation `AbstractValidator<T>`.
- Validate: string length, required fields, enum ranges, referential integrity.
- Reject all inputs with leading/trailing whitespace where unexpected.

## Data Access Security
- Use EF Core parameterized queries. NEVER use string interpolation in SQL.
- Apply concurrency tokens (`[ConcurrencyCheck]` or `RowVersion`) on all entities that can be updated concurrently.
- Apply row-level security via global query filters for `TenantId` and `IsDeleted`.

## API Security
- Rate limiting: All public endpoints must have `[EnableRateLimiting]` policy applied.
- CORS: Only allow registered origins. Never use wildcard `*` in production.
- HTTPS only: All redirects and cookies must use HTTPS.

## References
- OWASP Top 10: https://owasp.org/Top10/
- .NET Security Cheatsheet: https://cheatsheetseries.owasp.org/cheatsheets/DotNet_Security_Cheat_Sheet.html
```

---

## Part 2: MCP (Model Context Protocol) Integration

### 2.1 What is MCP and Why It Matters

MCP is the "USB-C port for AI" — a standardized protocol that allows your AI coding agent to securely connect to live external systems, eliminating the need for stale, hard-coded context.

**Without MCP:** You copy-paste database schemas, API docs, and Jira tickets into your chat context (slow, stale, imprecise).  
**With MCP:** The agent queries these systems live, on demand, with exactly the right level of detail.

### 2.2 Recommended MCP Servers for Development Teams

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./src"],
      "description": "Access to the project source files for in-context reading"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PAT}"
      },
      "description": "Connect to GitHub for PR context, issue tracking, and code search"
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "${DATABASE_URL}"],
      "description": "Query the dev database schema live for accurate entity generation"
    }
  }
}
```

> ⚠️ **Security Rule:** NEVER commit `mcp.json` with real credentials. Use environment variable references (`${VAR_NAME}`) and add `mcp.json` to `.gitignore` if it contains sensitive configuration.

### 2.3 MCP Tool Budget Rule

**Limit active MCP tools to ≤ 40 simultaneously.** More tools does not equal better performance — it overwhelms the agent's tool selection logic and slows responses. Enable only the tools needed for the current feature slice.

---

## Part 3: Context Snapshot Technique

### 3.1 The Problem: Context Drift

AI agents lose context between sessions. Without active management, each new session requires re-establishing the project state, leading to inconsistencies and repeated explanations.

### 3.2 The Solution: Living Context Snapshots

Maintain a `CONTEXT.md` file in the project root (or per feature branch) that captures the current project state:

```markdown
# Project Context Snapshot
**Last Updated:** [DATE]
**Current Feature Slice:** Order Submission Workflow
**Status:** ✅ Domain entities done | 🔄 MediatR handlers in progress | ⬜ Angular component pending

## What's Been Completed
- `Order` entity with state machine (Draft → Pending → Approved → Shipped → Closed)
- `CreateOrderCommand` + `CreateOrderCommandHandler` + `CreateOrderCommandValidator`
- DB migration `20260401_AddOrderTable` applied

## Current Blocker / In Progress
- Implementing `SubmitOrderCommandHandler` - need to fire `OrderSubmittedDomainEvent`

## Key Architecture Decisions (Active)
- Order aggregate root owns `OrderLine` collection - no separate OrderLine repository
- Concurrency token: `RowVersion` on `Order` table

## Do NOT Change
- The `Order.Status` enum - matches the frontend's OrderStatus TypeScript enum exactly
- The `IOrderRepository` interface — has a pending PR for extension
```

### 3.3 Snapshot Reset Triggers

Reset/update your `CONTEXT.md` when:
- Starting a new feature slice
- After any completed pull request is merged
- When switching between different parts of the codebase
- After resolving a major architectural issue

---

## Part 4: Scoping Rules Per Domain Area

Avoid one-size-fits-all rules. Use `globs` in `.mdc` files to scope rules:

```
Backend rules → globs: "src/Application/**/*.cs", "src/Domain/**/*.cs"
Frontend rules → globs: "src/frontend/src/**/*.ts"
Test rules    → globs: "**/*.Tests/**/*.cs", "**/*.spec.ts"
Migration rules → globs: "**/Migrations/**/*.cs"
```

This ensures the agent only loads relevant constraints for the file it's currently working on, keeping its "attention budget" focused.

---

## Part 5: Prompt-as-Code (Version Control Strategy)

### 5.1 Treat Prompts as Source Code

Store your reusable prompts in version control:

```
.ai/
└── prompts/
    ├── 01_domain_model_generation.md
    ├── 02_cqrs_handler_scaffold.md
    ├── 03_security_audit.md
    ├── 04_edge_case_discovery.md
    └── 05_angular_component_vibing.md
```

### 5.2 Prompt Review Process

Changes to key prompt templates should go through pull request review, just like code changes. This prevents "prompt drift" where team members silently change shared prompts and begin generating inconsistent code.

---

## Part 6: Context Budget Management

> **From External Analysis — Priority 🔴 Critical**

### 6.1 The 80/20 Context Rule

> **80% of the value comes from 20% of the context. Be ruthless about what you include.**

Large context windows cost money (API token costs), slow responses, and paradoxically *reduce* output quality due to the "lost-in-the-middle" phenomenon — where the AI's attention dilutes across too much information and misses critical constraints buried in the middle.

### 6.2 Context Budget Limits per Session Type

| Session Type | Max Tokens | Max Files | Max MCP Tools | Example |
|---|---|---|---|---|
| **Quick Fix** | 8,000 | 3 | 0 | Fix a failing test, add a field |
| **Single Command** | 20,000 | 8 | ≤ 5 | One CQRS command + handler + tests |
| **Full Vertical Slice** | 50,000 | 15 | ≤ 10 | Feature end-to-end (backend + frontend) |
| **Architecture Review** | 100,000 | 25 | ≤ 20 | SOLID audit across a module |

**Rule:** If your task requires more context than the budget for its type, **decompose the task** — don't increase the budget.

### 6.3 The Context Triage Priority

When a session is approaching its token budget, de-prioritize context in this order (remove last-listed first):

```
ALWAYS KEEP (never remove):
  → .cursor/rules/ (the guardrails)
  → Acceptance criteria for current task
  → Current entity / aggregate model

KEEP IF SPACE:
  → Canonical reference files (Document 08)
  → Interfaces and contracts
  → Existing tests (as examples)

REMOVE FIRST:
  → Documentation/comment files
  → Completed slice code (already committed)
  → Old migration files
  → Unrelated module files
  → Full CONTEXT.md (only include the "Current" section)
```

### 6.4 The Cost-Aware Prompt Prefix

Add this to the beginning of any expensive prompt (full slice generation, architecture audit):

```
## COST AWARENESS MODE: ON
This task will consume significant context tokens.
Before writing any code:

1. ESTIMATE: Roughly how many files will this touch?
2. FOCUS: Identify the 3 most critical context files needed (list them)
3. OMIT: State explicitly what you will NOT include in context
   (old migrations, documentation files, completed slice code)
4. DRY-RUN: Output a one-paragraph plan: "I will create/modify files X, Y, Z.
   The key implementation decision is [DECISION]. Proceeding will cost approximately
   [LOW/MEDIUM/HIGH] tokens. Shall I continue?"

Wait for my approval before generating code.
```

### 6.5 Context Budget Signals (When to Stop and Decompose)

Watch for these signals that your context budget is being exceeded:

```
⚠️ Response time increases noticeably (> 30 seconds for simple tasks)
⚠️ AI starts making mistakes on rules it previously followed correctly
⚠️ AI references files with wrong content (context confusion)
⚠️ AI generates code for the wrong module or wrong layer
⚠️ AI cannot recall a constraint you stated earlier in the same session
```

**When you see these signals:** Stop. Decompose the task. Start a fresh session.

---

## Summary

| Component | Tool | Location |
|---|---|---|
| Global rules | `.mdc` files | `.cursor/rules/00_global.mdc` |
| Architecture rules | `.mdc` files | `.cursor/rules/01_architecture.mdc` |
| Security rules | `.mdc` files | `.cursor/rules/05_security.mdc` |
| MCP connections | `mcp.json` | `.cursor/mcp.json` |
| Live context | `CONTEXT.md` | `./CONTEXT.md` (per branch) |
| Prompt library | Markdown files | `.ai/prompts/*.md` |
| Context budget | Session limits | See Part 6 table above |
| Decision log | `AI_DECISIONS.md` | Per feature branch root |
| Canonical registry | `CANONICAL_REGISTRY.md` | Project root |

**Next Step:** → [Document 03: Vertical Slice Execution](./03_Vertical_Slice_Execution.md)
