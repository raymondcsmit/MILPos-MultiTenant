# Contributing

This repository follows the standardized workflow defined in:

- [AI_Optimized_Development_Approach.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Strategy/AI_Optimized_Development_Approach.md)
- [BestApproach Index](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Strategy/BestApproach/00_Index_and_Overview.md)
- Verification loop: [04_The_Verification_Loop.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Strategy/BestApproach/04_The_Verification_Loop.md)

## Non-Negotiables

- Keep work as vertical slices (end-to-end) instead of horizontal “all CRUD first”.
- Verification is required: tests + build + basic QA for every slice.
- Never remove or weaken passing tests as a shortcut.
- Document important decisions in [AI_DECISIONS.md](file:///f:/MIllyass/pos-with-inventory-management/AI_DECISIONS.md).

## Pull Requests

Every PR must include:

- Scope: what feature slice this PR delivers.
- Verification proof: what was executed locally (commands + result).
- Risks: security / multi-tenancy / data migration notes.
- Decision log updates (when applicable).

## Local Verification

Use the local verification script:

- `scripts/verify.ps1`

