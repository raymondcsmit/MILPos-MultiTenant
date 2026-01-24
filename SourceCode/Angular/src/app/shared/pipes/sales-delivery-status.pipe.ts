import { Pipe, PipeTransform } from '@angular/core';
import { salesDeliveryStatuses } from '@core/domain-classes/sales-delivery-statu';
import { TranslationService } from '@core/services/translation.service';

@Pipe({
  name: 'salesDeliveryStatus',
  standalone: true
})
export class SalesDeliveryStatusPipe implements PipeTransform {
  constructor(public translationService: TranslationService) { }
  transform(value: any, ...args: any[]): any {
    const deliveryStatus = salesDeliveryStatuses.find((c) => c.id == value);
    if (deliveryStatus) {
      return this.translationService.getValue(
        deliveryStatus.name.replace(' ', '_').toUpperCase()
      );
    }
    return '';
  }
}
