# Document 03: Vertical Slice Execution

> **Suite:** Vibe Coding Best Approach v2.0  
> **Prerequisite:** [02 - Context & Rule Orchestration](./02_Context_and_Rule_Orchestration.md)

---

## Overview

This document covers the **core execution loop** of AI-assisted development — the Vertical Slice approach enhanced with Test-Driven Generation (TDG) and State Machine-first design. This is where the philosophy and context setup come together into actual, deliverable features.

---

## Part 1: What is a Vertical Slice?

A **Vertical Slice** is a complete, end-to-end implementation of a single user-facing behavior, cutting through all technical layers:

```
┌─────────────────────────────────────────────┐
│  Angular Component (UI + HTTP call)         │  ← Presentation
├─────────────────────────────────────────────┤
│  ASP.NET Core API Controller (endpoint)     │  ← API Layer
├─────────────────────────────────────────────┤
│  MediatR Command + Handler (business logic) │  ← Application Layer
├─────────────────────────────────────────────┤
│  Domain Entity + Domain Event               │  ← Domain Layer
├─────────────────────────────────────────────┤
│  EF Core Repository + DB Migration          │  ← Infrastructure
└─────────────────────────────────────────────┘
        ONE FEATURE. ALL LAYERS. FULLY TESTED.
```

**Why NOT horizontal layers?**
- Horizontal = Build ALL entities first, then ALL repositories, then ALL handlers, etc.
- AI loses context across 50+ related files simultaneously → hallucinations, architectural drift
- Working software appears only at the very end of each phase → no early feedback

**Why vertical slicing?**
- AI stays focused on ONE feature's full context → higher accuracy
- Working software deliverable after each slice → continuous feedback
- Each slice can be independently tested and reviewed

---

## Part 2: The Micro-TDD Loop (Test-Driven Generation)

This is the **mandatory** development loop for every vertical slice. Never skip it.

### The Loop (4 Steps Per Task)

```
 ┌──────────────────────────────────────────────────┐
 │                                                  │
 │  STEP 1: Define Acceptance Criteria              │
 │  → Write WHAT the feature must do in plain       │
 │     English (or Gherkin-style Given/When/Then)   │
 │                                                  │
 │  STEP 2: Generate Tests First (AI)               │
 │  → Prompt AI to write failing xUnit tests        │
 │     based on the acceptance criteria             │
 │                                                  │
 │  STEP 3: Generate Implementation (AI)            │
 │  → Prompt AI to implement the handler/service    │
 │     that makes the tests pass                    │
 │                                                  │
 │  STEP 4: Verify & Commit                         │
 │  → Run tests locally. All green? Commit.         │
 │     Red? Debug with AI. Never skip to next step. │
 │                                                  │
 └──────────────────────────────────────────────────┘
             ↑                    ↓
             └─── Next sub-task ──┘
```

### 2.1 Writing Acceptance Criteria (Step 1 Template)

Before opening your AI tool, write this down:

```
Feature: [Feature Name]

Business Context:
  [Why does this feature exist? What problem does it solve?]

Acceptance Criteria:
  AC-1: GIVEN [initial state] WHEN [action occurs] THEN [expected outcome]
  AC-2: GIVEN [precondition] WHEN [invalid action] THEN [system rejects with reason]
  AC-3: GIVEN [concurrent scenario] WHEN [race condition occurs] THEN [last-write-wins / optimistic lock fails]

Performance Boundary:
  - Must complete in < Xms under normal load
  - Must handle Y concurrent requests without data corruption
```

**Example:**
```
Feature: Submit Order

Business Context:
  Sales reps need to finalize draft orders to trigger inventory reservation.
  The system must prevent double-submissions and ensure all business rules are met.

Acceptance Criteria:
  AC-1: GIVEN a Draft order with ≥1 line items and a valid CustomerId 
        WHEN SubmitOrderCommand is handled 
        THEN Order.Status changes to Pending AND an OrderSubmittedDomainEvent is fired

  AC-2: GIVEN a Draft order with 0 line items 
        WHEN SubmitOrderCommand is handled 
        THEN the command fails validation with "Order must have at least one line item"

  AC-3: GIVEN an order already in Pending status 
        WHEN SubmitOrderCommand is handled 
        THEN the handler throws InvalidOperationException("Order is not in Draft status")

  AC-4: GIVEN two concurrent SubmitOrderCommand requests for the same order 
        WHEN both arrive simultaneously 
        THEN exactly one succeeds and the other fails with a DbUpdateConcurrencyException
```

---

### 2.2 The AI Prompt for Test Generation (Step 2)

```
## Context
Project: [NAME] | Stack: Clean Architecture + CQRS (MediatR) + xUnit + FluentAssertions + Moq

## Task: Generate Tests Before Implementation
Based on the following acceptance criteria, generate:
1. A complete xUnit test class for `SubmitOrderCommandHandlerTests`
2. Use FluentAssertions for all assertions
3. Mock all external dependencies (IOrderRepository, IUnitOfWork, ICurrentUserService) using Moq
4. Test against the handler interface, not the concrete class
5. Do NOT implement the handler yet. Generate ONLY the tests.

## Acceptance Criteria
[Paste AC-1 through AC-4 from above]

## Existing Types to Reference
- Command: `SubmitOrderCommand` with properties: `OrderId (Guid)`
- Handler: `SubmitOrderCommandHandler` (to be created)
- Domain Exception: `InvalidOperationException` for invalid state transitions
- Concurrency: `Order` has a `RowVersion byte[]` concurrency token
```

---

### 2.3 The AI Prompt for Implementation (Step 3)

```
## Context
[Same as above]

## Task: Implement to Make Tests Pass
The following tests are currently failing. Implement:
1. `SubmitOrderCommand` (record type, CQRS command)
2. `SubmitOrderCommandValidator` (FluentValidation)
3. `SubmitOrderCommandHandler` (MediatR IRequestHandler)
4. The `Order.Submit()` domain method (state transition logic)
5. `OrderSubmittedDomainEvent` domain event

## Constraints
- The state transition logic belongs INSIDE the `Order` entity, not in the handler
- The handler orchestrates (fetch → call domain method → persist → publish event)
- Return `Result.Success()` on success using the existing `Result<T>` pattern in this project
- Fire `OrderSubmittedDomainEvent` through `Order.AddDomainEvent()`, not directly

## Tests to Satisfy
[Paste the generated test code here]
```

---

## Part 3: State Machine Design (Mandatory Pattern)

### 3.1 State Machines are the Backbone

Every entity with a lifecycle **must** have an explicitly defined state machine. This prevents:
- Invalid state transitions (e.g., a Cancelled order being shipped)
- Missing domain events for downstream processes
- Unclear business rules buried in handlers

### 3.2 State Machine Definition Template

Always define a state machine document per entity **before** implementation:

```markdown
## Order State Machine

### States
| State | Description |
|---|---|
| Draft | Order is being assembled by the sales rep |
| Pending | Order submitted, awaiting manager approval |
| Approved | Approved; inventory reservation in progress |
| Shipped | Goods dispatched to customer |
| Closed | Order fulfilled and archived |
| Cancelled | Order voided at any stage before Shipped |

### Valid Transitions
| From | To | Trigger | Guard Conditions |
|---|---|---|---|
| Draft | Pending | SubmitOrderCommand | LineItems ≥ 1, Customer is valid |
| Draft | Cancelled | CancelOrderCommand | No guard |
| Pending | Approved | ApproveOrderCommand | Approver role required |
| Pending | Cancelled | CancelOrderCommand | No guard |
| Approved | Shipped | ShipOrderCommand | InventoryReserved = true |
| Approved | Cancelled | CancelOrderCommand | InventoryReservation must be released |
| Shipped | Closed | CloseOrderCommand | DeliveryConfirmed = true |

### Invalid Transitions (Must Throw)
- Draft → Approved (skips Pending review)
- Draft → Shipped
- Shipped → Draft / Pending / Approved
- Closed → ANY state
- Cancelled → ANY state
```

### 3.3 C# State Machine Implementation Pattern

```csharp
// Domain Layer — Order.cs (Entity)
public class Order : BaseEntity
{
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;
    
    // State transition method — lives IN the entity
    public void Submit()
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException(
                $"Cannot submit an order in {Status} status. Order must be in Draft.");
        
        if (!OrderLines.Any())
            throw new InvalidOperationException(
                "Cannot submit an order with no line items.");
        
        Status = OrderStatus.Pending;
        AddDomainEvent(new OrderSubmittedDomainEvent(Id, CustomerId));
    }
    
    public void Cancel(string reason)
    {
        if (Status is OrderStatus.Shipped or OrderStatus.Closed)
            throw new InvalidOperationException(
                $"Cannot cancel an order in {Status} status.");
        
        Status = OrderStatus.Cancelled;
        CancellationReason = reason;
        AddDomainEvent(new OrderCancelledDomainEvent(Id, reason));
    }
}
```

### 3.4 Integration Test for Invalid Transitions

```
## Prompt: Generate Invalid Transition Tests
For the Order entity's state machine, write integration tests that:
1. Verify EVERY invalid transition in the state machine definition throws InvalidOperationException
2. Verify the error message contains the current invalid state name
3. Verify NO domain events are fired when a transition fails
4. Use a real in-memory EF Core DbContext (not mocks) for these tests

State machine document: [PASTE the state machine definition above]
```

---

## Part 4: Feature Slice Decomposition Strategy

### 4.1 Breaking a Feature into Slices

Never build a full module in one session. Decompose into atomic slices:

**Example: Order Management Module**
```
Slice 1: Create Order (Draft)
  → Order entity, CreateOrderCommand, basic CRUD, Angular form component

Slice 2: Manage Order Lines
  → AddOrderLineCommand, RemoveOrderLineCommand, order line validation

Slice 3: Submit Order (Draft → Pending)
  → SubmitOrderCommand, state machine, OrderSubmittedDomainEvent

Slice 4: Approve/Reject Order (Pending → Approved/Cancelled)
  → ApproveOrderCommand, RejectOrderCommand, approval role guard

Slice 5: Order Listing & Detail (Queries)
  → GetOrdersQuery (paged), GetOrderByIdQuery, Angular list/detail components

Slice 6: Order Notifications
  → SignalR hub, OrderSubmittedDomainEventHandler pushes real-time update
```

Each slice = one Git branch + one PR + one demo to stakeholders.

---

### 4.2 The Slice Execution Checklist

Before closing each slice (marking it "done"):

**Backend**
- [ ] Domain entity updated with new state/behavior
- [ ] Command + Validator created (with all ACs covered)
- [ ] Handler implementing the command
- [ ] Domain Event fired (if state change occurred)
- [ ] DB Migration created and tested locally
- [ ] Unit tests: 100% of ACs covered
- [ ] Integration tests: Happy path + 2 failure paths

**Frontend (Angular)**
- [ ] Standalone component created
- [ ] Service method + HTTP call wired
- [ ] Loading state, error state, success state handled
- [ ] Component is accessible (ARIA labels, keyboard navigation)
- [ ] Component spec tests created

**Code Quality**
- [ ] `dotnet build` passes with 0 warnings (treat warnings as errors)
- [ ] All new public interfaces/classes have XML doc comments
- [ ] No `TODO` or `FIXME` comments left in committed code
- [ ] Code reviewed in diff format before commit

---

## Part 5: Atomic Git Strategy (AI Safety Net)

### 5.1 Why Atomic Commits are Critical in AI Development

AI can generate 500 lines of code in seconds. Without frequent commits, a bad AI generation can overwrite hours of good work. Version control is your **undo button**.

### 5.2 Commit Discipline Rules

```
Rule 1: One working behavior = one commit.
Rule 2: NEVER commit red tests. Tests must be green before any commit.
Rule 3: Use Conventional Commits format:
  feat(orders): add SubmitOrderCommand + handler + tests
  fix(orders): correct concurrency token on Order entity
  test(orders): add integration tests for invalid state transitions
  refactor(orders): move Order state logic from handler to entity

Rule 4: Branch per slice:
  feature/orders-create
  feature/orders-submit
  feature/orders-approve

Rule 5: Merge via Pull Request - NEVER commit directly to main/develop.
Rule 6: Before prompting AI for the next task — COMMIT the current task.
```

---

## Summary: The Vertical Slice Loop

```
[Acceptance Criteria Written]
         ↓
[Tests Generated by AI] → [Tests Run → Confirm FAIL]
         ↓
[Implementation Generated by AI]
         ↓
[Tests Run → All GREEN?]
    ├── YES → [Commit] → [Next slice]
    └── NO  → [Debug with AI] → [Retry implementation]
```

**Next Step:** → [Document 04: The Verification Loop](./04_The_Verification_Loop.md)
