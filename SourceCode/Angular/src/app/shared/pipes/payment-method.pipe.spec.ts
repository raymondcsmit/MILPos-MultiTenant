import { PaymentMethodPipe } from './payment-method.pipe';
import { paymentMethods } from '@core/domain-classes/payment-method';
import { TranslationService } from '@core/services/translation.service';

describe('PaymentMethodPipe', () => {
  const translationService = { getValue: (key: string) => `T:${key}` } as unknown as TranslationService;
  const pipe = new PaymentMethodPipe(translationService);

  paymentMethods.forEach((method) => {
    it(`maps payment method ${method.id} to translated "${method.name}"`, () => {
      expect(pipe.transform(method.id)).toBe(`T:${method.name}`);
    });
  });

  it('accepts string ids via loose equality', () => {
    expect(pipe.transform('1')).toBe('T:CASH');
  });

  it('returns empty string for unknown id', () => {
    expect(pipe.transform(999)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
