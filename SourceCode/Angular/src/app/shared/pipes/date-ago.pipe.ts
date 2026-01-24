import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateAgo',
  standalone: true
})
export class DateAgoPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    if (!value) return '';

    const seconds = Math.floor((+new Date() - +new Date(value)) / 1000);

    if (seconds < 30) {
      return 'Just now';
    }

    const intervals: { [key: string]: number } = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };

    for (const key of Object.keys(intervals)) {
      const counter = Math.floor(seconds / intervals[key]);
      if (counter > 0) {
        return counter === 1
          ? `${counter} ${key} ago`
          : `${counter} ${key}s ago`;
      }
    }

    return '';
  }

}
