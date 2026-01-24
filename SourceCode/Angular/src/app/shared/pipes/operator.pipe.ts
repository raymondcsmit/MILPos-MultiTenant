import { Pipe, PipeTransform } from '@angular/core';
import { unitOperators } from '@core/domain-classes/operator';
import { TranslationService } from '@core/services/translation.service';

@Pipe({
  name: 'unitOperator',
  standalone: true
})

export class UnitOperatorPipe implements PipeTransform {

  constructor(public translationService: TranslationService) {

  }
  transform(value: any, ...args: any[]): any {
    const operators = unitOperators.find(c => c.id == value);
    if (operators) {
      return this.translationService.getValue(operators.name);
    }
    return '';
  }
}
