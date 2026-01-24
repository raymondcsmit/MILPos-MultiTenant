
import { Pipe, PipeTransform } from '@angular/core';
import { AccountGroup } from '../account-enum';

@Pipe({
  name: 'accountGroup'
})
export class AccountGroupPipe implements PipeTransform {
  transform(value: number): string {
    switch (value) {
      case AccountGroup.CurrentAsset:
        return 'Current Asset';
      case AccountGroup.FixedAsset:
        return 'Fixed Asset';
      case AccountGroup.CurrentLiability:
        return 'Current Liability';
      case AccountGroup.LongTermLiability:
        return 'Long Term Liability';
      case AccountGroup.Capital:
        return 'Capital';
      case AccountGroup.Revenue:
        return 'Revenue';
      case AccountGroup.DirectExpense:
        return 'Direct Expense';
      case AccountGroup.IndirectExpense:
        return 'Indirect Expense';
      default:
        return 'Unknown';
    }
  }
}
