import { PaymentModeNamePipe } from './payment-mode.pipe';
import { PaymentMode } from '../accounting/account-enum';

describe('PaymentModeNamePipe', () => {
  const pipe = new PaymentModeNamePipe();

  it('maps CASH to Cash', () => {
    expect(pipe.transform(PaymentMode.CASH)).toBe('Cash');
  });

  it('maps BANK to Bank', () => {
    expect(pipe.transform(PaymentMode.BANK)).toBe('Bank');
  });

  it('returns empty string for unmapped value', () => {
    expect(pipe.transform(99)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined as unknown as number)).toBe('');
  });
});
