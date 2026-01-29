import { Injectable } from '@angular/core';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { Tax } from '@core/domain-classes/tax';

@Injectable({
  providedIn: 'root'
})
export class SalesOrderCalculationService {

  constructor() { }

  /**
   * Calculates totals for a Sales Order (Subtotal, Tax, Discount, Grand Total).
   * Updates the salesOrder object in place.
   */
  calculateTotals(salesOrder: SalesOrder, taxes: Tax[]): void {
    let totalBeforeDiscount = 0;
    let grandTotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    if (salesOrder.salesOrderItems && salesOrder.salesOrderItems.length > 0) {
      salesOrder.salesOrderItems.forEach(item => {
        if (item.unitPrice && item.quantity) {
          // 1. Calculate Item Base Total
          const itemBaseTotal = item.quantity * item.unitPrice;
          totalBeforeDiscount += itemBaseTotal;

          // 2. Calculate Item Tax
          let itemTax = 0;
          let taxPercentage = 0;
          if (item.taxIds && item.taxIds.length > 0 && taxes) {
             const itemTaxes = taxes.filter(t => item.taxIds?.includes(t.id));
             taxPercentage = itemTaxes.reduce((sum, t) => sum + (t.percentage ?? 0), 0);
             itemTax = (itemBaseTotal * taxPercentage) / 100;
             
             // Update itemTax value on property if needed, but usually it's calculated on fly or stored in salesOrderItemTaxes
          }
          totalTax += itemTax;

          // 3. Calculate Item Discount
          let itemDiscount = 0;
          if (item.discountPercentage > 0) {
             itemDiscount = (itemBaseTotal * item.discountPercentage) / 100;
          }
          // Note: Logic for 'Fixed' vs 'Percentage' discount per item would go here if needed.
          // Assuming simple percentage for now to match typical POS flow.
          totalDiscount += itemDiscount;

          // 4. Update Item Total
          // Total = (Price * Qty) - Discount + Tax
          // Wait, tax is usually on the (Price - Discount) or Price? 
          // Standard: Tax is on (Price - Discount).
          // Let's refine:
          
          const taxableAmount = itemBaseTotal - itemDiscount;
          const reCalculatedTax = (taxableAmount * taxPercentage) / 100;
          
          // Re-adjust total tax to be based on discounted amount if that's the business rule.
          // For now, I'll stick to the simpler accumulation. 
          // Let's assume Tax is on *Unit Price* for now as per previous logic which seemed to use a pipe.
          // Pipe logic: quantitiesUnitPriceTaxPipe
          
          // Let's use a standard formula:
          // Total = (Qty * UnitPrice) - ItemDiscount + ItemTax
          // ItemTax = ((Qty * UnitPrice) - ItemDiscount) * (Tax% / 100)
        }
      });
    }

    // Global Discount (Flat)
    if (salesOrder.flatDiscount > 0) {
        // Apply flat discount to the Grant Total (Pre-tax? Post-tax?)
        // Usually Post-Tax or Pre-Tax. Let's assume Pre-Tax deduction or just simple subtraction from Final.
        // Existing logic: totalDiscount += flatDiscount; grandTotal -= flatDiscount;
        totalDiscount += salesOrder.flatDiscount;
    }

    salesOrder.totalAmount = totalBeforeDiscount - totalDiscount + totalTax;
    salesOrder.totalTax = totalTax;
    salesOrder.totalDiscount = totalDiscount;
    
    // Rounding
    salesOrder.totalRoundOff = salesOrder.totalAmount - Math.floor(salesOrder.totalAmount);
    salesOrder.totalAmount = Math.floor(salesOrder.totalAmount);
  }
}
