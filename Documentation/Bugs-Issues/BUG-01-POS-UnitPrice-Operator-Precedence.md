# Defect Report: BUG-01 (UX-02)

**Bug ID:** BUG-01  
**Legacy Reference:** UX-02 / TC-D03.011  
**Component:** Frontend (`SourceCode/Angular/src/app/pos/pos.component.ts`)  
**Module:** Point of Sale (POS) Terminal  
**Severity:** **CRITICAL**  
**Reproducible:** 100% Deterministic  
**Verified in Live Browser:** Yes (Chrome DevTools MCP, Invoice `SO#00001`)  

---

## 1. Description & Business Impact

When an operator adds an item to the POS cart and changes the sales unit from its base unit (e.g., `Piece`) to an aggregated unit (e.g., `Dozen` with multiplier `12`), the POS terminal fails to multiply the unit price by 12. The item remains priced at the single-piece price ($3.50 instead of $42.00).

### Financial Impact:
- Selling 1 Dozen of `Air Freshener` charges the customer $3.50 instead of $42.00 (a **91.7% loss** on the sale).
- While stock inventory is decremented by 12 pieces in backend stock tracking, revenue collected and accounts receivable/cash are underbooked by $38.50.

---

## 2. Root Cause Analysis

In `SourceCode/Angular/src/app/pos/pos.component.ts` at line 280:
```typescript
switch (unit?.operator) {
  case 'Plush':
    return product?.salesPrice ?? 0 + unit?.value;
  case 'Minus':
    return product?.salesPrice ?? 0 - unit?.value;
  case 'Multiply':
    return product?.salesPrice ?? 0 * unit?.value;
  case 'Divide':
    return (product?.salesPrice ?? 0) / (unit?.value ?? 1);
  default:
    return product?.salesPrice;
}
```

In JavaScript/TypeScript, the nullish coalescing operator `??` has a **lower precedence** than arithmetic operators (`*`, `+`, `-`). 
For `Multiply`:
- `0 * unit?.value` evaluates first to `0`.
- Then `product?.salesPrice ?? 0` is evaluated.
- Because `product?.salesPrice` is `3.5` (truthy / not null), the expression evaluates to `3.5` and ignores the multiplication completely!

---

## 3. Reproduction Steps

1. Launch frontend (`http://localhost:4200`) and backend (`http://localhost:5000`).
2. Log into POS with `admin@gmail.com` / `admin@123`.
3. Navigate to `/pos`.
4. Search for `Air Freshener` (Sales Price $3.50, Base Unit: Piece).
5. In the cart row, click the Unit dropdown and change `Piece` to `Dozen` (Operator: Multiply, Value: 12).
6. **Observed Behavior:** Unit price in the cart remains `$3.50`, and Total for 1 Dozen remains `$3.50`.
7. Click "Pay" and complete cash checkout.
8. **Evidence:** Printed invoice shows `SO#00001`, `Air Freshener`, Unit `Dozen`, Total `$3.50`.

---

## 4. Visual Evidence

See live screenshot captured during execution:
`Documentation/Bugs-Issues/pos_receipt_ux02_bug.png`

---

## 5. Remediation Plan

Wrap each operand explicitly in parentheses:
```typescript
switch (unit?.operator) {
  case 'Plush':
    return (product?.salesPrice ?? 0) + (unit?.value ?? 0);
  case 'Minus':
    return (product?.salesPrice ?? 0) - (unit?.value ?? 0);
  case 'Multiply':
    return (product?.salesPrice ?? 0) * (unit?.value ?? 1);
  case 'Divide':
    return (product?.salesPrice ?? 0) / (unit?.value ?? 1);
  default:
    return product?.salesPrice ?? 0;
}
```
Also inspect and align any other unit conversion arithmetic across `sales-order-add-edit.component.ts` and `sales-order-calculation.service.ts`.
