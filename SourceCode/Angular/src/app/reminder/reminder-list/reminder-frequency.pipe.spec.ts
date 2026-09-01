import { ReminderFrequencyPipe } from './reminder-frequency.pipe';
import { reminderFrequencies } from '@core/domain-classes/reminder-frequency';

describe('ReminderFrequencyPipe', () => {
  const pipe = new ReminderFrequencyPipe();

  reminderFrequencies.forEach((frequency) => {
    it(`maps frequency ${frequency.id} to "${frequency.name.toUpperCase()}"`, () => {
      expect(pipe.transform(frequency.id)).toBe(frequency.name.toUpperCase());
    });
  });

  it('accepts string ids via loose equality', () => {
    expect(pipe.transform('2')).toBe('MONTHLY');
  });

  it('returns empty string for unknown id', () => {
    expect(pipe.transform(999)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
