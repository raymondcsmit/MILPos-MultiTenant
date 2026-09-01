import { PaymentStatusPipe } from './payment-status.pipe';
import { paymentStatuses } from '@core/domain-classes/paymentaStatus';
import { TranslationService } from '@core/services/translation.service';

describe('PaymentStatusPipe', () => {
  const translationService = { getValue: (key: string) => `T:${key}` } as unknown as TranslationService;
  const pipe = new PaymentStatusPipe(translationService);

  paymentStatuses.forEach((status) => {
    it(`maps payment status ${status.id} to translated "${status.name.replace(' ', '_').toUpperCase()}"`, () => {
      expect(pipe.transform(status.id)).toBe(`T:${status.name.replace(' ', '_').toUpperCase()}`);
    });
  });

  it('returns empty string for unknown id', () => {
    expect(pipe.transform(999)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
