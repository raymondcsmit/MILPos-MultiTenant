import { Pipe, PipeTransform } from '@angular/core';
import { TransactionStatus } from '../account-enum';

@Pipe({
  name: 'statusBadge'
})
export class StatusBadgePipe implements PipeTransform {
  transform(value: number): string {
    switch (value) {
      case TransactionStatus.Pending:
        return 'bg-warning';
      case TransactionStatus.Completed:
        return 'bg-success';
      case TransactionStatus.Cancelled:
        return 'bg-secondary';
      case TransactionStatus.Reversed:
        return 'bg-danger';
      default:
        return 'bg-light';
    }
  }
}
