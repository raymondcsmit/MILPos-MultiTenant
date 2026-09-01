import { PurchaseDeliveryStatusPipe } from './purchase-delivery-status.pipe';
import { purchaseDeliveryStatuses } from '@core/domain-classes/purchase-delivery-status';
import { TranslationService } from '@core/services/translation.service';

describe('PurchaseDeliveryStatusPipe', () => {
  const translationService = { getValue: (key: string) => `T:${key}` } as unknown as TranslationService;
  const pipe = new PurchaseDeliveryStatusPipe(translationService);

  purchaseDeliveryStatuses.forEach((status) => {
    it(`maps purchase delivery status ${status.id} to translated "${status.name}"`, () => {
      expect(pipe.transform(status.id)).toBe(`T:${status.name}`);
    });
  });

  it('accepts string ids via loose equality', () => {
    expect(pipe.transform('1')).toBe('T:RECEIVED');
  });

  it('returns empty string for unknown id', () => {
    expect(pipe.transform(999)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
