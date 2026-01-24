import { Pipe, PipeTransform } from '@angular/core';
import { Tax } from '@core/domain-classes/tax';

@Pipe({
  name: 'quantitiesunitpricediscountreturn',
  standalone: true
})

export class QuantitiesUnitPriceDiscountReturnPipe implements PipeTransform {
  transform(value: number, discount: number, discountType: string, totalQuantity: number, unitPrice: number): any {
    return this.getSubTotalAfterDiscount(discount, discountType, totalQuantity, value, unitPrice);
  }

  getSubTotalAfterDiscount(discount: number, discountType: string, totalQuantity: number, returnQuantity: number, unitPrice: number) {
    let totalAmount = 0;
    if (discountType === 'fixed') {
      const unitDiscount = discount / totalQuantity;
      totalAmount = unitDiscount * returnQuantity;
    } else {
      totalAmount = (returnQuantity * unitPrice) / discount;
    }
    return totalAmount.toFixed(2);
  }
}
