import { TransactionStatusPipe } from './transaction-status.pipe';
import { TransactionStatus } from '../account-enum';

describe('TransactionStatusPipe', () => {
  const pipe = new TransactionStatusPipe();

  it('maps Pending', () => {
    expect(pipe.transform(TransactionStatus.Pending)).toBe('Pending');
  });

  it('maps Completed', () => {
    expect(pipe.transform(TransactionStatus.Completed)).toBe('Completed');
  });

  it('maps Cancelled', () => {
    expect(pipe.transform(TransactionStatus.Cancelled)).toBe('Cancelled');
  });

  it('maps Reversed', () => {
    expect(pipe.transform(TransactionStatus.Reversed)).toBe('Reversed');
  });

  it('returns empty string for falsy value 0', () => {
    expect(pipe.transform(0)).toBe('');
  });

  it('returns empty string for unmapped value', () => {
    expect(pipe.transform(99)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined as unknown as number)).toBe('');
  });
});
