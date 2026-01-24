import { Pipe, PipeTransform } from '@angular/core';
import { AccountType } from '../account-enum';

@Pipe({
  name: 'accountType'
})
export class AccountTypePipe implements PipeTransform {
  transform(value: number): string {
    switch (value) {
      case AccountType.Asset:
        return 'Asset';
      case AccountType.Liability:
        return 'Liability';
      case AccountType.Equity:
        return 'Equity';
      case AccountType.Income:
        return 'Income';
      case AccountType.Expense:
        return 'Expense';
      default:
        return 'Unknown';
    }
  }
}
