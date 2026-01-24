import { Pipe, PipeTransform } from '@angular/core';
import { Tax } from '@core/domain-classes/tax';

@Pipe({ name: 'customKeyValue' })
export class CustomKeyValuePipe implements PipeTransform {
  transform(obj: { [key: string]: Tax[] }): Tax[] {
    const taxs: Tax[] = [];
    if (!obj) return taxs;

    Object.keys(obj)
      .map(key => obj[key])
      .forEach(taxArray => {
        if (Array.isArray(taxArray)) {
          taxs.push(...taxArray);
        }
      });

    return taxs;
  }
}
