import { Pipe, PipeTransform } from '@angular/core';
import { paymentTypes } from '@core/domain-classes/purchase-order-payment';
import { TranslationService } from '@core/services/translation.service';

@Pipe({
    name: 'paymentType',
    standalone: true
})

export class PaymentTypePipe implements PipeTransform {

    constructor(public translationService: TranslationService) {

    }
    transform(value: any, ...args: any[]): any {
        const paymentType = paymentTypes.find(c => c.id == value);
        if (paymentType) {
            return this.translationService.getValue(paymentType.name.replace(" ", "_").toUpperCase());
        }
        return '';
    }
}
