# Document 06: Workflow Diagrams & Process Maps

> **Suite:** Vibe Coding Best Approach v2.0  
> **Purpose:** Visual reference for the complete AI-Assisted Development SDLC

---

## Diagram 1: The Complete AI-Assisted SDLC Overview

```mermaid
flowchart TD
    A([🚀 Project Start]) --> B

    subgraph Phase1["Phase 1: Discovery & Context Setup"]
        B[Feed Raw Requirements to AI] --> C[Generate Domain Model + Mermaid ERD]
        C --> D[Generate Sequence Diagrams per Workflow]
        D --> E[Create .cursor/rules/*.mdc Files]
        E --> F[Configure mcp.json for Live Data Access]
        F --> G[Create CONTEXT.md Snapshot]
    end

    G --> H

    subgraph Phase2["Phase 2: Slice Planning"]
        H[Decompose Module into Vertical Slices] --> I[Prioritize Slices by Business Value]
        I --> J[Write Acceptance Criteria for Slice 1]
        J --> K[Create Feature Branch]
    end

    K --> L

    subgraph Phase3["Phase 3: Test-Driven Generation - TDG Loop"]
        L[PROMPT-07: Generate Failing Tests First] --> M{Tests Confirm FAIL?}
        M -->|YES| N[PROMPT-03/04: Generate Implementation]
        M -->|NO| L
        N --> O[Run Tests]
        O --> P{All GREEN?}
        P -->|YES| Q[Atomic Git Commit]
        P -->|NO| R[Debug with AI - Describe Failure]
        R --> N
    end

    Q --> S

    subgraph Phase4["Phase 4: State Machine Hardening"]
        S{Has State Machine?} -->|YES| T[PROMPT-08: Generate Full Transition Test Matrix]
        S -->|NO| W
        T --> U[Implement Invalid Transition Guards]
        U --> V[Run State Machine Tests - All GREEN]
        V --> W[Update CONTEXT.md]
    end

    W --> X

    subgraph Phase5["Phase 5: Adversarial Verification"]
        X[PROMPT-09: Security Audit] --> Y[Apply Critical + High Fixes]
        Y --> Z[PROMPT-10: Edge Case Expansion]
        Z --> AA[Add Edge Case Tests]
        AA --> AB{Any Critical Findings?}
        AB -->|YES| X
        AB -->|NO| AC[PROMPT-11: SOLID Compliance Review]
        AC --> AD[Apply Architecture Fixes]
    end

    AD --> AE

    subgraph Phase6["Phase 6: Polish & Merge"]
        AE[PROMPT-12: UI/UX Vibe Polish] --> AF[Accessibility Check]
        AF --> AG[Final Build - 0 Warnings]
        AG --> AH{Coverage ≥ 85%?}
        AH -->|NO| AI[Add Missing Tests]
        AI --> AH
        AH -->|YES| AJ[Create Pull Request]
        AJ --> AK[Architecture Review - Human]
        AK --> AL{Approved?}
        AL -->|NO| AM[Address Review Comments]
        AM --> AJ
        AL -->|YES| AN[Merge to Develop]
    end

    AN --> AO{More Slices?}
    AO -->|YES| J
    AO -->|NO| AP([✅ Module Complete])

    style Phase1 fill:#1a1a2e,color:#e0e0ff,stroke:#6c63ff
    style Phase2 fill:#16213e,color:#e0e0ff,stroke:#6c63ff
    style Phase3 fill:#0f3460,color:#e0e0ff,stroke:#6c63ff
    style Phase4 fill:#1a1a2e,color:#e0e0ff,stroke:#6c63ff
    style Phase5 fill:#16213e,color:#e0e0ff,stroke:#533483
    style Phase6 fill:#0f3460,color:#e0e0ff,stroke:#533483
```

---

## Diagram 2: The Micro-TDD Loop (Per Feature)

```mermaid
sequenceDiagram
    participant Dev as 👨‍💻 Developer
    participant AI as 🤖 AI Agent
    participant Tests as 🧪 Test Runner
    participant Git as 📦 Git

    Dev->>Dev: Write Acceptance Criteria (AC-1 to AC-N)
    Dev->>AI: "Generate failing tests for these ACs"
    AI-->>Dev: Test class with N test methods
    Dev->>Tests: Run tests
    Tests-->>Dev: ❌ All FAIL (expected)
    Dev->>AI: "Implement the handler to make these tests pass"
    AI-->>Dev: Implementation code (command, handler, validator, entity method)
    Dev->>Tests: Run tests
    Tests-->>Dev: Results
    alt All GREEN ✅
        Dev->>Git: git commit -m "feat(entity): implement [command name]"
        Dev->>Dev: Move to next sub-task
    else Some RED ❌
        Dev->>AI: "Test [X] failed with: [error]. Fix the implementation."
        AI-->>Dev: Fixed implementation
        Dev->>Tests: Run tests again
    end
```

---

## Diagram 3: Context Orchestration Architecture

```mermaid
graph TD
    subgraph GlobalContext["🌐 Global Context (Always Active)"]
        GR[".cursor/rules/00_global.mdc<br/>Project rules, constraints, response format"]
    end

    subgraph ProjectContext["🏗️ Project Context (Architecture)"]
        AR[".cursor/rules/01_architecture.mdc<br/>Clean Architecture + CQRS rules"]
        BR[".cursor/rules/02_backend.mdc<br/>.NET 9 specific rules"]
        FR[".cursor/rules/03_frontend.mdc<br/>Angular 19 rules"]
        TR[".cursor/rules/04_testing.mdc<br/>Test standards"]
        SR[".cursor/rules/05_security.mdc<br/>OWASP + security constraints"]
    end

    subgraph LiveContext["⚡ Live Context (MCP Servers)"]
        MC[".cursor/mcp.json"]
        DB[(PostgreSQL<br/>Live Schema)]
        GH[GitHub<br/>Issues + PRs]
        FS[Filesystem<br/>Source Code]
        MC --> DB
        MC --> GH
        MC --> FS
    end

    subgraph SessionContext["📝 Session Context (Per Branch)"]
        CS["CONTEXT.md<br/>Current slice status<br/>Active decisions<br/>What's done / in-progress"]
    end

    subgraph AIAgent["🤖 AI Agent (Cursor)"]
        AGT["Agent receives merged context<br/>Generates code within guardrails<br/>Queries live tools via MCP"]
    end

    GlobalContext --> AIAgent
    ProjectContext --> AIAgent
    LiveContext --> AIAgent
    SessionContext --> AIAgent
```

---

## Diagram 4: State Machine Design Pattern

```mermaid
stateDiagram-v2
    [*] --> Draft : Entity Created

    Draft --> Pending : submit()\nGUARD: LineItems ≥ 1 AND Customer valid
    Draft --> Cancelled : cancel(reason)

    Pending --> Approved : approve(approverId)\nGUARD: Approver role required
    Pending --> Cancelled : cancel(reason)
    Pending --> Draft : reopen()\nGUARD: Within 24h of submission

    Approved --> Shipped : ship(trackingNumber)\nGUARD: InventoryReserved = true
    Approved --> Cancelled : cancel(reason)\nACTION: Release inventory reservation

    Shipped --> Closed : confirmDelivery()\nGUARD: DeliveryDate is set

    Cancelled --> [*]
    Closed --> [*]

    note right of Draft
        Domain Events Fired:
        - OrderCreatedDomainEvent
    end note

    note right of Pending
        Domain Events Fired:
        - OrderSubmittedDomainEvent
    end note

    note right of Approved
        Domain Events Fired:
        - OrderApprovedDomainEvent
    end note

    note right of Shipped
        Domain Events Fired:
        - OrderShippedDomainEvent
    end note

    note right of Closed
        Domain Events Fired:
        - OrderClosedDomainEvent
    end note
```

---

## Diagram 5: Clean Architecture Dependency Flow

```mermaid
graph TD
    subgraph API["API Layer (outermost)"]
        CTRL[Controllers]
        MW[Middleware]
        FILT[Filters]
    end

    subgraph APP["Application Layer"]
        CMD[Commands + Handlers]
        QRY[Queries + Handlers]
        VALID[FluentValidation Validators]
        IFACE[Interfaces IRepository, IUnitOfWork]
        DTO[DTOs + Read Models]
        EVT[Domain Event Handlers]
    end

    subgraph DOMAIN["Domain Layer (innermost)"]
        ENT[Entities + Aggregates]
        VO[Value Objects]
        DE[Domain Events]
        DOMEVT[IDomainEvent]
    end

    subgraph INFRA["Infrastructure Layer"]
        EF[EF Core DbContext]
        REPO[Repository Implementations]
        SVC[External Services]
        MIG[Migrations]
    end

    %% Allowed dependency directions (inward only)
    API -->|depends on| APP
    INFRA -->|implements| APP
    APP -->|depends on| DOMAIN

    %% Violations (should NEVER happen)
    DOMAIN -.->|❌ NEVER| APP
    APP -.->|❌ NEVER| API
    APP -.->|❌ NEVER| INFRA

    style DOMAIN fill:#1a1a2e,color:#a8dadc,stroke:#a8dadc
    style APP fill:#16213e,color:#e0e0ff,stroke:#6c63ff
    style INFRA fill:#0f3460,color:#e0e0ff,stroke:#533483
    style API fill:#533483,color:#e0e0ff,stroke:#6c63ff
```

---

## Diagram 6: Verification Loop Decision Tree

```mermaid
flowchart TD
    A([Feature Implementation Done]) --> B

    B[Run All Tests] --> C{All Tests GREEN?}
    C -->|NO| D[Debug: Describe Failure to AI]
    D --> E[AI Suggests Fix]
    E --> F[Apply Fix]
    F --> B
    C -->|YES| G

    G[Run Adversarial Security Audit - PROMPT-09] --> H{Critical Findings?}
    H -->|YES| I[Apply Critical Fixes]
    I --> G
    H -->|NO - only Medium/Low| J

    J[Run Edge Case Expansion - PROMPT-10] --> K[Add Tests for Discovered Edge Cases]
    K --> L[Run All Tests Again]
    L --> M{All GREEN?}
    M -->|NO| D
    M -->|YES| N

    N[Run SOLID Compliance Review - PROMPT-11] --> O{Architecture Violations?}
    O -->|YES - Critical| P[Refactor Before PR]
    P --> N
    O -->|NO - or only minor| Q

    Q[Check Test Coverage] --> R{Coverage ≥ 85%?}
    R -->|NO| S[Add Missing Tests]
    S --> Q
    R -->|YES| T

    T[Final Build Check - 0 Warnings] --> U{Build Clean?}
    U -->|NO| V[Fix Warnings]
    V --> T
    U -->|YES| W

    W[Create Pull Request] --> X[Human Architecture Review]
    X --> Y{PR Approved?}
    Y -->|NO| Z[Address Feedback]
    Z --> X
    Y -->|YES| AA([✅ Merge to Develop])

    style A fill:#1a1a2e,color:#a8dadc
    style AA fill:#1a6b1a,color:#fff
```

---

## Diagram 7: Prompt Selection Guide

```mermaid
flowchart TD
    A([Need a Prompt?]) --> B{What phase?}

    B --> C[Discovery]
    B --> D[Scaffolding]
    B --> E[Testing]
    B --> F[Security]
    B --> G[Refactoring]
    B --> H[UI Polish]
    B --> I[Observability]
    B --> J[Quality]

    C --> C1[PROMPT-01: Domain Model from Requirements]
    C --> C2[PROMPT-02: Architecture Decision Record]

    D --> D1[PROMPT-03: Full Vertical Slice Scaffold]
    D --> D2[PROMPT-04: Single Command + Handler]
    D --> D3[PROMPT-05: EF Core Configuration]
    D --> D4[PROMPT-06: Angular Component]

    E --> E1[PROMPT-07: Acceptance Tests - Given/When/Then]
    E --> E2[PROMPT-08: State Machine Test Matrix]

    F --> F1[PROMPT-09: Security Audit - Adversarial]
    F --> F2[PROMPT-10: Edge Case Expansion - QA Role]

    G --> G1[PROMPT-11: SOLID Compliance Refactor]

    H --> H1[PROMPT-12: UI Vibe Polish]

    I --> I1[PROMPT-13: AI Decision Logging - End-of-Slice]

    J --> J1[PROMPT-14: Batch Drift and Pattern Consistency Check]
```

---

## Diagram 8: Git Branch Strategy for AI Development

```mermaid
gitGraph
    commit id: "Initial Setup"

    branch feature/orders-create
    checkout feature/orders-create
    commit id: "feat(orders): scaffold Order entity + CreateOrderCommand"
    commit id: "test(orders): add CreateOrder unit + integration tests"
    commit id: "fix(orders): apply concurrency token on Order entity"

    checkout main
    merge feature/orders-create id: "PR: Create Order Slice ✅"

    branch feature/orders-submit
    checkout feature/orders-submit
    commit id: "feat(orders): add SubmitOrderCommand + state transition"
    commit id: "test(orders): full state machine test matrix"
    commit id: "fix(orders): guard concurrent submissions with RowVersion"

    checkout main
    merge feature/orders-submit id: "PR: Submit Order Slice ✅"

    branch feature/orders-approve
    checkout feature/orders-approve
    commit id: "feat(orders): ApproveOrderCommand + role guard"
    commit id: "test(orders): approval workflow tests"
    commit id: "security(orders): adversarial audit fixes - IDOR resolved"

    checkout main
    merge feature/orders-approve id: "PR: Approve Order Slice ✅"
```

---

## Quick Reference: The Daily Developer Rhythm

```
MORNING SETUP (15 min)
├── 5-Minute Pre-Flight: dotnet build + dotnet test + git status ← NEW
├── Review CONTEXT.md — what's the current slice?
├── Update .cursor/rules/ if architectural decisions changed
├── Create/switch to feature branch for today's slice
└── Write acceptance criteria for today's target

DEVELOPMENT CYCLE (Repeat per task)
├── Use PROMPT-07/08 → Generate tests first
├── Confirm tests FAIL
├── Use PROMPT-03/04/05/06 → Generate implementation
├── Run tests → Fix until GREEN
└── Atomic commit

AFTERNOON HARDENING (30-45 min per slice)
├── Use PROMPT-09 → Security audit
├── Apply Critical + High fixes
├── Use PROMPT-10 → Edge case expansion
├── Add missing tests → All green
└── Use PROMPT-11 → SOLID review

OBSERVABILITY STEP (10 min per slice) ← NEW
├── Use PROMPT-13 → Generate AI_DECISIONS.md entry
├── Review: any Low confidence areas?
├── Track assumptions with stakeholders
└── Commit AI_DECISIONS.md alongside code

DRIFT CHECK (15 min — every 3rd slice) ← NEW
├── Use PROMPT-14 → Batch drift analysis
├── Consistency scores all ≥ 85%?
├── Update .cursor/rules/ for any DRIFT items found
└── Flag IMPROVEMENT items for canonical promotion

END OF DAY (15 min)
├── Update CONTEXT.md with completed work
├── Push branch to remote
├── Create PR draft (if slice is complete)
└── Update AI_QUALITY_SCORECARD.md with today's slice scores
```

---

## Appendix: IDE-Specific Quick Reference Cards

> **From External Analysis — Priority 🟢 Polish**

### Cursor IDE

| Action | How To Do It |
|---|---|
| Apply global rule file | `@.cursor/rules/00_global.mdc` in chat |
| Reference canonical file | `@src/Application/Orders/Commands/CreateOrder/CreateOrderCommandHandler.cs` |
| Load context snapshot | `@CONTEXT.md` at start of session |
| Toggle MCP tools | **Settings → Tools & MCP** → toggle servers |
| Scope agent to one file | Drag the file into chat context window |
| Stop agent mid-generation | `Escape` key or click the stop button immediately |
| Start fresh session | Open new chat tab (clears context, avoids context spiral) |
| Dry-run before file write | Add "Show me a plan first" to your prompt |
| Revert AI changes | `Ctrl+Z` for in-editor changes; `git stash` for committed changes |

### Windsurf IDE (Cascade)

| Action | How To Do It |
|---|---|
| Apply project rules | Place rules in `.windsurf/rules/` directory |
| Step-through debugging | Say "Explain this step by step" in Cascade chat |
| Pause and plan | Add "Wait for my approval" to multi-step tasks |
| Reference specific file | `@filename` syntax in Cascade |
| Revert a Flow step | Use Cascade's built-in step revert button |

### VS Code + GitHub Copilot

| Action | How To Do It |
|---|---|
| Multi-file edit (Copilot Edits) | `Ctrl+Shift+I` → "Edit in workspace" |
| Inline chat | `Ctrl+I` (Windows) / `Cmd+I` (Mac) |
| Attach file to context | Click the `+` icon in chat to attach files |
| Reference whole codebase | Enable "@workspace" mode in chat |
| Create reusable instructions | `.github/copilot-instructions.md` |
| Dry-run | "Describe what you will change, don't edit yet" |

### Trae IDE

| Action | How To Do It |
|---|---|
| Project rules | Via system prompt configuration in workspace settings |
| Agent mode | Use "Builder" mode for multi-file generation |
| Stop agent | Click stop button; Trae has strong undo history |
| Context management | Manually include relevant files via `@` mentions |

---

*This document is the visual companion to the full Best Approach documentation suite (v2.1). For detailed implementation guidance, refer to documents 01 through 10.*
