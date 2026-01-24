import { Pipe, PipeTransform } from '@angular/core';
import { purchaseDeliveryStatuses } from '@core/domain-classes/purchase-delivery-status';
import { TranslationService } from '@core/services/translation.service';

@Pipe({
  name: 'purchaseDeliveryStatus',
  standalone: true
})
export class PurchaseDeliveryStatusPipe implements PipeTransform {
  constructor(public translationService: TranslationService) { }
  transform(value: any, ...args: any[]): any {
    const deliveryStatus = purchaseDeliveryStatuses.find((c) => c.id == value);
    if (deliveryStatus) {
      return this.translationService.getValue(
        deliveryStatus.name.replace(' ', '_').toUpperCase()
      );
    }
    return '';
  }
}
