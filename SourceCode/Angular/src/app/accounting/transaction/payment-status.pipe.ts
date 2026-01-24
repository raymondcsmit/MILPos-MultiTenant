import { Pipe, PipeTransform } from '@angular/core';
import { ACCPaymentStatus } from '../account-enum';

@Pipe({
  name: 'paymentStatus'
})
export class PaymentStatusPipe implements PipeTransform {

  transform(value: ACCPaymentStatus): string {
    switch (value) {
      case ACCPaymentStatus.Pending:
        return 'Pending';
      case ACCPaymentStatus.Partial:
        return 'Partial';
      case ACCPaymentStatus.Completed:
        return 'Completed';
      case ACCPaymentStatus.Overdue:
        return 'Overdue';
      case ACCPaymentStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }
}
