import { Pipe, PipeTransform } from '@angular/core';
import { TransactionStatus } from '../account-enum';

@Pipe({
  name: 'transactionStatus'
})
export class TransactionStatusPipe implements PipeTransform {
  transform(value: number): string {
    if (!value) return '';
    return TransactionStatus[value] ?? '';
  }
}
