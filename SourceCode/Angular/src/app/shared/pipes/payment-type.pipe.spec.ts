import { PaymentTypePipe } from './payment-type.pipe';
import { paymentTypes } from '@core/domain-classes/purchase-order-payment';
import { TranslationService } from '@core/services/translation.service';

describe('PaymentTypePipe', () => {
  const translationService = { getValue: (key: string) => `T:${key}` } as unknown as TranslationService;
  const pipe = new PaymentTypePipe(translationService);

  paymentTypes.forEach((type) => {
    it(`maps payment type ${type.id} to translated "${type.name.replace(' ', '_').toUpperCase()}"`, () => {
      expect(pipe.transform(type.id)).toBe(`T:${type.name.replace(' ', '_').toUpperCase()}`);
    });
  });

  it('translates Credit as CREDIT', () => {
    expect(pipe.transform(0)).toBe('T:CREDIT');
  });

  it('translates Refund as REFUND', () => {
    expect(pipe.transform(1)).toBe('T:REFUND');
  });

  it('accepts string ids via loose equality', () => {
    expect(pipe.transform('1')).toBe('T:REFUND');
  });

  it('returns empty string for unknown id', () => {
    expect(pipe.transform(999)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
