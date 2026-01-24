import { Pipe, PipeTransform } from '@angular/core';
import { Tax } from '@core/domain-classes/tax';

@Pipe({
  name: 'quantitiesunitpriceTaxReturn',
  standalone: true
})

export class QuantitiesUnitPriceTaxReturnPipe implements PipeTransform {
  transform(value: number, ...args: any[]): any {
    if (args.length === 1) {
      const totalAmount = value * args[0];
      return parseFloat(totalAmount.toFixed(2));
    } else if (args.length === 4) {
      const totalAmount = value * args[0];
      if (args[1]) {
        return this.getSubTotalAfterDiscount(totalAmount, parseFloat(args[1]), args[2], value, args[3]);
      } else {
        return 0;
      }
    }
    else if (args.length === 6) {
      let totalAmount = value * args[0];
      if (args[1]) {
        totalAmount = parseFloat(this.getSubTotalAfterDiscountWithTotalAmount(totalAmount, parseFloat(args[1]), args[4], value, args[5]));
      }
      const taxIds = args[2];
      const taxs = args[3];
      if (taxIds && taxIds.length > 0) {
        return this.getSubTotalAfterTaxPercentage(totalAmount, taxIds, taxs);
      } else {
        return 0;
      }
    }
    return 0;
  }

  getSubTotalAfterTax(totalAmount: number, taxIds: Array<string>, taxs: Tax[]) {
    const selectedPercentages: Array<number> = [];
    const selectedTaxs: Array<number> = [];
    taxIds.forEach((tax: string) => {
      const taxId = taxs.find(c => c.id === tax);
      if (taxId) {
        selectedPercentages.push(taxId.percentage);
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

  getSubTotalAfterTaxPercentage(totalAmount: number, taxIds: Array<string>, taxs: Tax[]) {
    const selectedPercentages: Array<number> = [];
    const selectedTaxs: Array<number> = [];
    let taxAmount = 0;
    taxIds.forEach(tax => {
      const taxId = taxs.find(c => c.id === tax);
      if (taxId) {
        selectedPercentages.push(taxId.percentage);
      }
    });

    selectedPercentages.forEach(percentage => {
      selectedTaxs.push((totalAmount * percentage) / 100);
    });
    selectedTaxs.forEach(c => {
      taxAmount = taxAmount + c;
    })

    return taxAmount.toFixed(2);

  }
  getSubTotalAfterDiscountWithTotalAmount(totalAmount: number, discount: number, discountType: string, quntity: number, totalQuantity: number) {
    const discountOnItem = discountType === 'fixed' ? discount / totalQuantity : 0;
    const discountOnReturnItems = discountOnItem * quntity;
    let totalDiscount = discountType === 'fixed' ? discountOnReturnItems : (totalAmount * discount) / 100;
    const total = totalAmount - totalDiscount;
    return total.toFixed(2);
  }

  getSubTotalAfterDiscount(totalAmount: number, discount: number, discountType: string, quntity: number, totalQuantity: number) {
    const discountOnItem = discountType === 'fixed' ? discount / totalQuantity : 0;
    const discountOnReturnItems = discountOnItem * quntity;
    let totalDiscount = discountType === 'fixed' ? discountOnReturnItems : (totalAmount * discount) / 100;
    return totalDiscount.toFixed(2);
  }
}
