import { StatusBadgePipe } from './status-badge.pipe';
import { TransactionStatus } from '../account-enum';

describe('StatusBadgePipe', () => {
  const pipe = new StatusBadgePipe();

  const expected: Array<[TransactionStatus, string]> = [
    [TransactionStatus.Pending, 'bg-warning'],
    [TransactionStatus.Completed, 'bg-success'],
    [TransactionStatus.Cancelled, 'bg-secondary'],
    [TransactionStatus.Reversed, 'bg-danger']
  ];

  expected.forEach(([value, badge]) => {
    it(`maps TransactionStatus ${value} to "${badge}"`, () => {
      expect(pipe.transform(value)).toBe(badge);
    });
  });

  it('returns bg-light for unmapped value', () => {
    expect(pipe.transform(99)).toBe('bg-light');
  });

  it('returns bg-light for undefined', () => {
    expect(pipe.transform(undefined as unknown as number)).toBe('bg-light');
  });
});
