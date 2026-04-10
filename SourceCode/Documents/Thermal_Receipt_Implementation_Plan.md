# Thermal Receipt Printing Implementation Plan

## Goal
Enable high-quality thermal receipt printing (80mm width) for the POS system in the Electron application. The current invoice printing uses an A4 layout which is unsuitable for thermal printers.

## User Review Required
> [!IMPORTANT]
> **Prerequisite**: The thermal printer must be installed as a system printer in Windows. The user must manually select this printer (or set it as default) when the print dialog appears.

## Proposed Changes

### 1. New Component: `SalesOrderReceiptComponent`
Create a dedicated component for the thermal receipt layout. This keeps the logic separate from the A4 Invoice component.

*   **Location**: `src/app/shared/sales-order-receipt/`
*   **Dimensions**: Optimized for 80mm width (approx 300px - 72mm printable area).
*   **Content**:
    *   Store Logo (Black & White/Grayscale preferred)
    *   Store Details (Name, Address, Phone, Tax ID)
    *   Order Details (Order #, Date, Cashier)
    *   Itemized List (Name, Qty x Price, Total)
    *   Totals (Subtotal, Tax, Discount, Grand Total)
    *   Payment Info (Method, Paid, Change)
    *   Barcode (Order #)
    *   Footer Message ("Thank you for shopping!")

### 2. Update `PosComponent`
Modify the POS screen to use the new Receipt component instead of (or in addition to) the Invoice component.

*   **Location**: `src/app/pos/pos.component.ts` & `.html`
*   **Action**: 
    *   Add logic to trigger `SalesOrderReceiptComponent` after a successful sale.
    *   Possibly add a user setting or toggle to choose between "Receipt" (Thermal) and "Invoice" (A4).

### 3. CSS/SCSS Styling
*   **Font**: Monospace or condensed sans-serif font for better legibility on small paper.
*   **Media Query**: 
    ```css
    @media print {
        body { margin: 0; padding: 0; }
        @page { size: auto; margin: 0mm; }
    }
    ```

## Verification Plan
1.  **Mock Print**: Use "Microsoft Print to PDF" with a custom paper size (80mm width) to verify layout to file.
2.  **Electron Test**: Verify the print dialog triggers correctly in Electron (using the hidden iframe method implemented previously).
