import { PaymentStatusPipe } from './payment-status.pipe';
import { ACCPaymentStatus } from '../account-enum';

describe('PaymentStatusPipe', () => {
  const pipe = new PaymentStatusPipe();

  const expected: Array<[ACCPaymentStatus, string]> = [
    [ACCPaymentStatus.Pending, 'Pending'],
    [ACCPaymentStatus.Partial, 'Partial'],
    [ACCPaymentStatus.Completed, 'Completed'],
    [ACCPaymentStatus.Overdue, 'Overdue'],
    [ACCPaymentStatus.Cancelled, 'Cancelled']
  ];

  expected.forEach(([value, label]) => {
    it(`maps ACCPaymentStatus ${value} to "${label}"`, () => {
      expect(pipe.transform(value)).toBe(label);
    });
  });

  it('returns Unknown for unmapped value', () => {
    expect(pipe.transform(99 as ACCPaymentStatus)).toBe('Unknown');
  });

  it('returns Unknown for undefined', () => {
    expect(pipe.transform(undefined as unknown as ACCPaymentStatus)).toBe('Unknown');
  });
});
