import { Pipe, PipeTransform } from '@angular/core';
import { PaymentMode } from '../accounting/account-enum';

@Pipe({ name: 'paymentModeName' })
export class PaymentModeNamePipe implements PipeTransform {
  transform(value: number): string {
    switch (value) {
      case PaymentMode.CASH: return 'Cash';
      case PaymentMode.BANK: return 'Bank';
      default: return '';
    }
  }
}
