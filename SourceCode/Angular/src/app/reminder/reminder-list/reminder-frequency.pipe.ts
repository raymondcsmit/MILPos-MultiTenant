import { Pipe, PipeTransform } from '@angular/core';
import { reminderFrequencies } from '@core/domain-classes/reminder-frequency';

@Pipe({
  name: 'frequency',
  standalone: true
})

export class ReminderFrequencyPipe implements PipeTransform {
  transform(value: any, ...args: any[]): any {
    const reminderFrequency = reminderFrequencies.find(c => c.id == value);
    if (reminderFrequency) {
      return reminderFrequency.name.toUpperCase();
    }
    return '';
  }
}
