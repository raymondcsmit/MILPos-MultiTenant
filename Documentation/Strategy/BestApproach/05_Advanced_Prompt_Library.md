# Document 05: Advanced Prompt Library

> **Suite:** Vibe Coding Best Approach v2.0  
> **Prerequisite:** [04 - The Verification Loop](./04_The_Verification_Loop.md)

---

## Overview

This prompt library is a **versioned, parameterized collection** of reusable prompt templates organized by SDLC phase. These are not generic AI prompts — they are **project-aware templates** calibrated for Clean Architecture + CQRS + MediatR + Angular Standalone development.

**How to Use This Library:**
1. Copy the relevant prompt template
2. Replace all `{{PLACEHOLDER}}` values with your specific context
3. Prepend with appropriate `.cursor/rules/` context (auto-injected if using Cursor)
4. Review AI output critically before accepting
5. Iterate using the RCI pattern if needed

---

## Phase 1: Discovery & Architecture Prompts

---

### PROMPT-01: Domain Model Generation from Requirements

**When to Use:** At project kickoff, or when adding a new module.

```
## Role
You are a Domain-Driven Design expert specializing in Clean Architecture 
and enterprise software.

## Task
Analyze the following business requirements and produce:

1. **Domain Model** — List of all Entities, Value Objects, and Aggregates
   For each Aggregate Root, identify:
   - Properties (with types, required/optional, business constraints)
   - Domain methods (state transitions, calculations, business rules)
   - Domain Events fired by each state transition

2. **Entity Relationship Diagram** (Mermaid format)
   Show all entities, their relationships, and cardinality

3. **Bounded Context Map** (if multiple bounded contexts are identified)
   Show how contexts communicate (Domain Events vs. direct calls)

4. **CQRS Command/Query List**
   Initial list of Commands (write operations) and Queries (read operations)

## Tech Stack Context
- Backend: .NET 9, Clean Architecture, CQRS + MediatR
- Database: PostgreSQL 16 with EF Core 9
- Domain Events via MediatR notifications

## Business Requirements
{{PASTE_RAW_REQUIREMENTS_HERE}}

## Output Format
Produce structured Markdown with Mermaid diagrams. 
Flag any ambiguous requirements as [AMBIGUITY: ...] for clarification.
```

---

### PROMPT-02: Architecture Decision Record (ADR) Generation

**When to Use:** When making a significant architectural decision.

```
## Task
Draft an Architecture Decision Record (ADR) for the following decision.

## Decision Context
{{DESCRIBE_THE_DECISION_TO_BE_MADE}}

## Options Being Considered
1. {{OPTION_1}}
2. {{OPTION_2}}
3. {{OPTION_3_IF_APPLICABLE}}

## Constraints
- Must align with: Clean Architecture, CQRS, .NET 9, Angular 19
- Must consider: {{PERFORMANCE|SECURITY|SCALABILITY|TEAM_SKILL constraints}}
- Must NOT: {{ANTI_PATTERNS_TO_AVOID}}

## Output Format
Use this ADR template:
# ADR-[NUMBER]: [DECISION TITLE]

**Status:** Proposed

**Context:** [Why is this decision needed?]

**Decision:** [What was decided?]

**Options Considered:**
| Option | Pros | Cons |
|---|---|---|

**Rationale:** [Why was this option chosen?]

**Consequences:** [What changes as a result of this decision?]

**Review Date:** [When should this be reviewed?]
```

---

## Phase 2: Scaffolding & Generation Prompts

---

### PROMPT-03: Full Vertical Slice Scaffold

**When to Use:** Starting implementation of a new feature slice.

```
## Context
Project: {{PROJECT_NAME}}
Stack: Clean Architecture | CQRS + MediatR | .NET 9 | EF Core 9 | Angular 19 Standalone
Existing patterns: [Check .cursor/rules/01_architecture.mdc]

## Task: Scaffold Vertical Slice for "{{FEATURE_NAME}}"

Generate the following files for the {{ENTITY_NAME}} entity:

### Domain Layer (src/Domain/)
1. `{{EntityName}}.cs` — Entity class with:
   - Private setters, inherit from BaseEntity
   - Properties: {{LIST_PROPERTIES_WITH_TYPES}}
   - Status enum: {{LIST_STATES}} (if applicable)
   - Domain methods for each state transition
   - Domain events for each method call

### Application Layer (src/Application/{{EntityName}}/)
2. `Create{{EntityName}}Command.cs` — CQRS Command record
3. `Create{{EntityName}}CommandValidator.cs` — FluentValidation validator
4. `Create{{EntityName}}CommandHandler.cs` — MediatR handler
5. `Get{{EntityName}}ByIdQuery.cs` + Handler — Read query with DTO

### Infrastructure Layer (src/Infrastructure/Persistence/)
6. `{{EntityName}}Configuration.cs` — EF Core fluent configuration
7. Update `ApplicationDbContext.cs` — Add DbSet

### API Layer (src/API/Controllers/)
8. `{{EntityName}}Controller.cs` — Thin REST controller

### Tests (tests/Application.UnitTests/)
9. `Create{{EntityName}}CommandHandlerTests.cs` — Unit tests
10. `Create{{EntityName}}CommandValidatorTests.cs` — Validator tests

## Entity Specification
{{DESCRIBE_ENTITY_PROPERTIES_AND_RULES}}

## Alignment Requirements
- Follow the same pattern as the existing `{{EXISTING_SIMILAR_ENTITY}}` entity as a reference
- Use `Result<T>` for handler return types (consistent with project pattern)
- Apply `[Authorize(Roles = "{{REQUIRED_ROLE}}")]` on controller
```

---

### PROMPT-04: MediatR Command Handler + Tests (Atomic)

**When to Use:** After domain entity exists, implementing a specific command.

```
## Context
Stack: Clean Architecture | MediatR | FluentValidation | xUnit | FluentAssertions | Moq

## Task: Implement {{CommandName}} with Tests

### Step 1 — Tests First (generate these, do NOT implement yet)
Generate `{{CommandName}}HandlerTests.cs` covering:
- ✅ Happy path: {{DESCRIBE_HAPPY_PATH}}
- ❌ Validation fail: {{DESCRIBE_VALIDATION_SCENARIO}}
- ❌ Not found: Entity with given ID does not exist
- ❌ Business rule violation: {{DESCRIBE_DOMAIN_RULE_VIOLATION}}
- ⚡ Concurrency conflict: DbUpdateConcurrencyException scenario

### Step 2 — Implementation (generate after tests)
Generate:
- `{{CommandName}}.cs` (record)
- `{{CommandName}}Validator.cs` (FluentValidation)
- `{{CommandName}}Handler.cs` (IRequestHandler)

### Reference Types
- Entity: `{{EntityName}}` (see domain layer)
- Repository interface: `I{{EntityName}}Repository`
- Unit of Work: `IUnitOfWork`
- Current user: `ICurrentUserService.UserId` (Guid)

### Business Rule to Implement
{{DESCRIBE_THE_SPECIFIC_BUSINESS_RULE_THIS_COMMAND_ENFORCES}}
```

---

### PROMPT-05: EF Core Entity Configuration

**When to Use:** Setting up database mapping for a new entity.

```
## Task
Generate EF Core Fluent API configuration for the `{{EntityName}}` entity.

## Entity Properties
{{LIST_ALL_PROPERTIES_WITH_TYPES_AND_CONSTRAINTS}}

## Requirements
- Table name: `{{table_name}}` (snake_case), Schema: `{{schema_name}}`
- Primary Key: `Id` (Guid, not auto-generated — assigned in domain)
- Concurrency: Apply RowVersion byte[] concurrency token
- Soft Delete: `IsDeleted` bool with default value false + global query filter
- Multi-tenancy: `TenantId` Guid + global query filter for current tenant
- Audit fields: `CreatedAt` (UTC), `UpdatedAt` (UTC), `CreatedBy` (string, max 256)
- String columns: Apply appropriate MaxLength (default: 500 for descriptive fields, 100 for names)
- Relationships: {{DESCRIBE_RELATIONSHIPS}}
- Indexes: {{LIST_FIELDS_THAT_NEED_INDEXES_FOR_PERFORMANCE}}
- Value conversions: {{ANY_ENUM_OR_VALUE_OBJECT_CONVERSIONS}}

## Output
`{{EntityName}}Configuration.cs` implementing `IEntityTypeConfiguration<{{EntityName}}>`
```

---

### PROMPT-06: Angular Standalone Component

**When to Use:** Building an Angular component for a feature.

```
## Context
Stack: Angular 19 (Standalone), Angular Material / PrimeNG, RxJS, Signals-based state
API: REST, JWT auth via interceptor

## Task: Generate Angular Component for "{{FEATURE_NAME}}"

### Component Spec
- Component name: `{{ComponentName}}`
- Purpose: {{DESCRIBE_WHAT_THE_COMPONENT_DOES}}
- API endpoints consumed: {{LIST_API_ENDPOINTS}}

### UI Requirements
- Form fields: {{LIST_FIELDS_WITH_TYPES_AND_VALIDATION}}
- Loading state: Show spinner while awaiting API response
- Error state: Display error message from API response
- Success state: {{DESCRIBE_SUCCESS_BEHAVIOR}}
- Route: `{{route_path}}`

### Generate
1. `{{component-name}}.component.ts` — Standalone component using Angular Signals
2. `{{component-name}}.component.html` — Template
3. `{{component-name}}.component.scss` — Scoped styles
4. `{{component-name}}.service.ts` — HTTP service
5. `{{component-name}}.component.spec.ts` — Unit tests

### Code Style
- Use `inject()` instead of constructor injection
- Use `signal()` and `computed()` for reactive state
- Use `HttpClient` with typed responses
- Handle errors with `catchError` + display user-friendly messages
- No `NgModule` — standalone only
```

---

## Phase 3: Testing Prompts

---

### PROMPT-07: Acceptance Test Generation (Given/When/Then)

**When to Use:** At the start of any slice.

```
## Task
Write xUnit integration tests in Given/When/Then style for the following acceptance criteria.

## Test Environment
- WebApplicationFactory<Program> with a real in-memory SQLite or PostgreSQL test database
- Seed data using a dedicated test data builder (Arrange phase)
- Authenticate via TestAuthHandler (fake JWT with configurable roles/TenantId)

## Acceptance Criteria
{{PASTE_AC_1_THROUGH_AC_N}}

## Test Class Template (follow this structure)
```csharp
public class {{FeatureName}}Tests : IClassFixture<WebApplicationFactory<Program>>
{
    // Given: [describe initial state in method name]
    // When: [describe the action]
    // Then: [describe the expected outcome]
    [Fact]
    public async Task Given_{{state}}_When_{{action}}_Then_{{expected}}()
    {
        // Arrange
        // Act  
        // Assert
    }
}
```

## Output
Complete test class with one test method per acceptance criterion.
Use FluentAssertions for all assertions.
```

---

### PROMPT-08: State Machine Test Matrix

**When to Use:** After implementing any stateful entity.

```
## Task
Generate a comprehensive test matrix for the {{EntityName}} state machine.

## State Machine Definition
States: {{LIST_ALL_STATES}}
Valid Transitions: {{LIST_VALID_TRANSITIONS}}
Invalid Transitions: All others

## Generate
1. **Valid Transition Tests** — One test per valid transition verifying:
   - Status changes to the new state
   - The correct Domain Event is fired
   - Audit fields are updated

2. **Invalid Transition Tests** — One test per invalid transition verifying:
   - `InvalidOperationException` is thrown
   - Error message contains the current state name
   - Entity Status is UNCHANGED after the failed attempt
   - NO Domain Events are fired

3. **Guard Condition Tests** — For each valid transition with guard conditions:
   - Test that the transition fails when guard conditions are NOT met
   - Test that the transition succeeds when guard conditions ARE met

## Output
Two test classes:
- `{{EntityName}}ValidTransitionTests.cs`
- `{{EntityName}}InvalidTransitionTests.cs`
```

---

## Phase 4: Hardening & Security Prompts

---

### PROMPT-09: Security Audit (Adversarial)

**When to Use:** After completing a full feature slice.

```
## Role
Senior Security Engineer + Penetration Tester

## Task
Conduct an adversarial audit of the following code.

Identify and rate (Critical/High/Medium/Low) all findings in these categories:
1. Authorization bypass (can users access data/actions they shouldn't?)
2. Multi-tenancy leakage (can Tenant A see Tenant B's data?)
3. Input validation gaps (what malformed inputs behave unexpectedly?)
4. Injection vectors (SQL, command, header injection)
5. Concurrency vulnerabilities (race conditions, TOCTOU issues)
6. Business rule bypass (can users manipulate API calls to skip validation?)
7. Information disclosure (does the API leak sensitive data in error responses?)
8. Denial of service (can a simple request cause expensive DB operations?)

## For Each Finding
- Severity: [Critical/High/Medium/Low]
- Description: [What is the vulnerability?]
- Proof of Concept: [How would you exploit it? Specific HTTP request or code path]
- Recommended Fix: [Specific fix with code example]

## Code Under Review
{{PASTE_FEATURE_CODE_HERE}}
```

---

### PROMPT-10: Edge Case Expansion (QA Role)

**When to Use:** After the security audit, to find non-security edge cases.

```
## Role
Senior QA Engineer specializing in boundary analysis and exploratory testing.

## Task
Given the following feature implementation, identify edge cases that the happy-path tests miss.

Focus on:
1. Boundary value analysis (min/max values, empty collections, null vs empty string)
2. Temporal edge cases (daylight saving time, leap days, epoch boundaries)
3. Localization edge cases (special characters, Unicode, bidirectional text)
4. Integration edge cases (external service unavailable, partial failures, timeouts)
5. State edge cases (entity deleted between fetch and update, cascade effects)
6. Volume edge cases (large datasets, pagination boundaries, bulk operations)

## For Each Edge Case
- Scenario: [Plain English description]
- Risk: [What breaks if this isn't handled?]
- Test: [xUnit test code to cover this case]
- Fix: [Code change required to handle it]

## Feature to Analyze
{{PASTE_FEATURE_CODE_AND_ACCEPTANCE_CRITERIA}}
```

---

## Phase 5: Refactoring & Polish Prompts

---

### PROMPT-11: SOLID Compliance Refactor

**When to Use:** At the end of a feature, before creating the PR.

```
## Role
Software Architect specializing in SOLID principles and Clean Architecture.

## Task
Refactor the following code to strictly comply with SOLID principles and Clean Architecture.

## Check Against
1. **SRP** — Does each class have EXACTLY one reason to change? If multiple responsibilities exist, suggest extraction.
2. **OCP** — Is the code open for extension without modification? Suggest strategy patterns where switch-cases exist.
3. **LSP** — Do all derived classes fully honor the parent's contract? Flag any "if TypeOf" checks.
4. **ISP** — Are interfaces too broad? Suggest splitting interfaces with more than 5 methods.
5. **DIP** — Do high-level modules depend on abstractions? Flag any `new ConcreteClass()` in business logic layers.
6. **Clean Architecture** — Are dependencies pointing inward only? Flag any outer→inner dependency inversion violations.

## Output
- Summary of violations found
- Refactored code (changed files only)
- Explanation of each change made

## Code to Refactor
{{PASTE_CODE_HERE}}
```

---

### PROMPT-12: UI Vibe Prompt (Frontend Polish)

**When to Use:** After functional Angular component is working, for visual polish.

```
## Role
Senior UX Engineer with expertise in Angular Material and modern web design.

## Task
Enhance the visual design of the following Angular component.

## Design Goals
- Style: {{MODERN_DARK|LIGHT|GLASSMORPHISM|MATERIAL_YOU}}
- Feel: Premium, responsive, polished
- Animations: Subtle micro-animations on state changes (loading → loaded, error → retry)
- Accessibility: WCAG 2.1 AA compliant (color contrast, keyboard navigation, ARIA)

## Specific Enhancements Needed
1. Loading skeleton screens instead of plain spinners
2. Success state with celebratory micro-animation (checkmark animation)
3. Error state with actionable message and retry button
4. Form field validation feedback (inline, not alert popups)
5. Responsive layout for mobile (375px) through desktop (1920px)
6. Empty state illustration and call-to-action when no data

## Reference Screenshots / Mockups
{{ATTACH_MOCKUP_IMAGES_OR_DESCRIBE_VISUAL_STYLE}}

## Component to Polish
{{PASTE_CURRENT_COMPONENT_HTML_AND_SCSS}}
```

---

## Prompt Meta-Templates (Reusable Patterns)

### The Role-Task-Constraint Pattern (RTC)
Use this as the universal prompt structure:

```
## Role
[Assign a specific expert persona]

## Task
[One specific, contained task. No more.]

## Constraints
- MUST: [Non-negotiable requirements]
- MUST NOT: [Explicit prohibitions]
- ASSUME: [What you can assume about the codebase]

## Context
[Minimal, high-signal relevant code/docs — not the entire codebase]

## Output Format
[Exact format you expect: file list, code blocks, tables, etc.]
```

### The Chain-of-Thought Prefix
For complex tasks, add this before your main prompt to improve reasoning accuracy:

```
Before writing any code:
1. Summarize what this task requires in 3 bullet points
2. Identify which files will be created or modified
3. Identify any assumptions you are making about the codebase
4. Flag any potential conflicts with the architectural rules
Only THEN proceed with the implementation.
```

### The Constraint Reset Prompt
Use when the AI starts drifting from architectural patterns:

```
STOP. You have deviated from the project's architectural rules.

Issue identified: {{DESCRIBE_THE_DEVIATION}}

Rule being violated: {{CITE_THE_SPECIFIC_RULE_FROM_CURSOR_RULES}}

Regenerate ONLY the affected code, strictly following the rule above.
Do not modify any files not directly related to fixing this deviation.
```

---

## Phase 6: Observability & Quality Prompts (New)

> **Added from External Analysis — Closes AI black-box and drift measurement gaps**

---

### PROMPT-13: AI Decision Logging (End-of-Slice Observability)

**When to Use:** As the **LAST PROMPT** of every feature slice session, after implementation is complete.

```
## Role
You are the AI agent that just completed the [FEATURE_NAME] slice. 
Your task is to produce an audit log of your implementation decisions.

## Task: Generate AI_DECISIONS.md Entry

Review everything generated in this session and document:

1. IMPLEMENTATION DECISIONS
For each significant decision made:
- Decision Point: [What choice was required?]
- Choice Made: [What did you generate?]
- Rule Followed: [Which .cursor/rules/ file and rule number drove this?]
- Alternatives Rejected: [What else was viable? Why rejected?]
- Risk Level: [Low/Medium/High — what could go wrong with this approach?]

2. ASSUMPTIONS MADE
For any requirement that was ambiguous or unclear:
- Assumption: [What did you assume was true?]
- Basis: [What evidence/inference led to this assumption?]
- Validation Required: [Yes/No — and what to confirm with stakeholders]

3. CONFIDENCE ASSESSMENT
Rate each area (Low/Medium/High) and explain briefly:
- Domain logic correctness: [Rating + reason]
- Security posture: [Rating + reason]
- Performance profile: [Rating + reason]  
- Test coverage adequacy: [Rating + reason]
- Overall Slice Confidence: [High/Medium/Low]

> LOW overall confidence = mandatory human deep-review before merging.

4. TECHNICAL DEBT INTRODUCED
List any shortcuts, known limitations, or deferred improvements:
- [Item]: [Description] | Priority: [P1/P2/P3] | Tracking: [Ticket or N/A]

## Output Format
Use the AI_DECISIONS.md template from Document 07.
Be honest — a Low confidence rating is more valuable than a falsely optimistic High.
Never omit assumptions even if you're "fairly sure" about them.

## Session Context
Feature implemented: {{FEATURE_NAME}}
Files created/modified: {{LIST_FILES}}
Tests written: {{COUNT}}
```

---

### PROMPT-14: Batch Drift & Pattern Consistency Check

**When to Use:** After every **3rd merged slice** OR at the start of each weekly session. Run against the last 3 slices.

```
## Role
You are a Sprint Quality Analyst performing a systematic pattern consistency audit.

## Task
Perform a batch quality analysis across 3 recently implemented slices.

Slices to audit:
- Slice 1: {{FEATURE_1_NAME}} [Branch: {{BRANCH_1}}]
- Slice 2: {{FEATURE_2_NAME}} [Branch: {{BRANCH_2}}]
- Slice 3: {{FEATURE_3_NAME}} [Branch: {{BRANCH_3}}]

## Analysis Dimensions

For each slice, compare against the canonical files from CANONICAL_REGISTRY.md:

### 1. DRIFT (Violations — must fix)
- Handler structure: does it match the canonical handler pattern?
- Validator pattern: same structure, same FluentValidation style?
- Controller conventions: same route templates, response types?
- Entity configuration: same table naming, index patterns?
- Test structure: same Arrange/Act/Assert format, same naming convention?

### 2. IMPROVEMENTS (Better than canonical — flag for promotion)
- Any pattern that demonstrably reduces code, improves readability, 
  or better handles errors than the canonical reference

### 3. CONSISTENCY SCORE
Calculate: (Patterns matching canonical) / (Total patterns checked) × 100

## Output Format

For each slice:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Slice: {{FEATURE_NAME}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[DRIFT] Handler/File:Line — Description — Rule violated
[DRIFT] Handler/File:Line — Description — Rule violated

[IMPROVEMENT] File:Line — Description — Recommend promoting to canonical

Consistency Score: [X%]
Verdict: PASS (≥85%) | WARN (70-84%) | FAIL (<70%)
```

Then:
1. Produce a ready-to-paste update for AI_QUALITY_SCORECARD.md
2. Recommend which .cursor/rules/ files to update based on recurring DRIFT patterns
3. List any IMPROVEMENT items for canonical promotion consideration
```

---

## Prompt Meta-Templates (Reusable Patterns)

### The Role-Task-Constraint Pattern (RTC)
Use this as the universal prompt structure:

```
## Role
[Assign a specific expert persona]

## Task
[One specific, contained task. No more.]

## Constraints
- MUST: [Non-negotiable requirements]
- MUST NOT: [Explicit prohibitions]
- ASSUME: [What you can assume about the codebase]

## Context
[Minimal, high-signal relevant code/docs — not the entire codebase]

## Output Format
[Exact format you expect: file list, code blocks, tables, etc.]
```

### The Chain-of-Thought Prefix
For complex tasks, add this before your main prompt to improve reasoning accuracy:

```
Before writing any code:
1. Summarize what this task requires in 3 bullet points
2. Identify which files will be created or modified
3. Identify any assumptions you are making about the codebase
4. Flag any potential conflicts with the architectural rules
Only THEN proceed with the implementation.
```

### The Constraint Reset Prompt
Use when the AI starts drifting from architectural patterns:

```
STOP. You have deviated from the project's architectural rules.

Issue identified: {{DESCRIBE_THE_DEVIATION}}

Rule being violated: {{CITE_THE_SPECIFIC_RULE_FROM_CURSOR_RULES}}

Regenerate ONLY the affected code, strictly following the rule above.
Do not modify any files not directly related to fixing this deviation.
```

---

## Complete Prompt Index

| Prompt | Phase | When to Use |
|---|---|---|
| PROMPT-01 | Discovery | Domain model from requirements |
| PROMPT-02 | Discovery | Architecture Decision Record |
| PROMPT-03 | Scaffolding | Full vertical slice scaffold |
| PROMPT-04 | Scaffolding | Single command + handler |
| PROMPT-05 | Scaffolding | EF Core entity configuration |
| PROMPT-06 | Scaffolding | Angular standalone component |
| PROMPT-07 | Testing | Acceptance tests (Given/When/Then) |
| PROMPT-08 | Testing | State machine test matrix |
| PROMPT-09 | Hardening | Security audit (adversarial) |
| PROMPT-10 | Hardening | Edge case expansion (QA) |
| PROMPT-11 | Refactoring | SOLID compliance refactor |
| PROMPT-12 | Polish | UI/UX vibe enhancement |
| PROMPT-13 | Observability | AI decision logging (end-of-slice) ← NEW |
| PROMPT-14 | Quality | Batch drift & consistency check ← NEW |

---

## Prompt Library Maintenance

### Versioning Convention
```
PROMPT-XX-vY.Z.md
XX = Category number
Y.Z = Version (increment on major changes)

Example: PROMPT-03-v1.2 = Vertical Slice Scaffold, version 1.2
```

### Retirement Process
When a prompt consistently produces poor results:
1. Add `[DEPRECATED]` prefix to the prompt file
2. Document why it was deprecated in a comment block at the top
3. Create an improved version with the next version number
4. Remove the deprecated prompt after 30 days

---

**Next Step:** → [Document 06: Workflow Diagrams](./06_Workflow_Diagrams.md)
