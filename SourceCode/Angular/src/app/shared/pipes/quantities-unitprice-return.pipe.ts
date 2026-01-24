import { Pipe, PipeTransform } from '@angular/core';
import { Tax } from '@core/domain-classes/tax';

@Pipe({
  name: 'quantitiesunitpricereturn',
  standalone: true
})

export class QuantitiesUnitPriceReturnPipe implements PipeTransform {
  transform(value: number, ...args: any[]): any {
    if (args.length === 2) {
      const totalAmount = value * args[0];
      return parseFloat(totalAmount.toFixed(2));
    }
    else if (args.length === 4) {
      const totalAmount = value * args[0];
      if (args[1]) {
        return this.getSubTotalAfterDiscount(totalAmount, parseFloat(args[1]), args[2], args[3], value);
      } else {
        return totalAmount;
      }
    }
    else if (args.length === 6) {
      let totalAmount = value * args[0];
      if (args[1]) {
        totalAmount = parseFloat(this.getSubTotalAfterDiscount(totalAmount, parseFloat(args[1]), args[4], args[5], value));
      }
      const taxIds = args[2];
      const taxs = args[3];
      if (taxIds && taxIds.length > 0) {
        return this.getSubTotalAfterTax(totalAmount, taxIds, taxs);
      } else {
        return totalAmount.toFixed(2);
      }
    }
    return 0;
  }

  getSubTotalAfterTax(totalAmount: number, taxIds: Array<string>, taxs: Tax[]) {
    const selectedPercentages: Array<number> = [];
    const selectedTaxs: Array<number> = [];
    taxIds.forEach(tax => {
      const taxNew = taxs.find(c => c.id === tax);
      if (taxNew) {
        selectedPercentages.push(taxNew.percentage);
      }
    });

    selectedPercentages.forEach(percentage => {
      selectedTaxs.push((totalAmount * percentage) / 100);
    });
    selectedTaxs.forEach(c => {
      totalAmount = totalAmount + c;
    })

    return totalAmount.toFixed(2);

  }
  getSubTotalAfterDiscount(totalAmount: number, discount: number, discountType: string, totalQuantity: number, returnQuantity: number) {
    if (discountType === 'fixed') {
      const unitDiscount = discount / totalQuantity;
      totalAmount = totalAmount - (unitDiscount * returnQuantity);
    } else {
      totalAmount = totalAmount - (totalAmount * discount) / 100;
    }
    return totalAmount.toFixed(2);
  }
}
