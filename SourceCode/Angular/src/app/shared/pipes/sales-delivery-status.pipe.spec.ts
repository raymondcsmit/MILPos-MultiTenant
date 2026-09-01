import { SalesDeliveryStatusPipe } from './sales-delivery-status.pipe';
import { salesDeliveryStatuses } from '@core/domain-classes/sales-delivery-statu';
import { TranslationService } from '@core/services/translation.service';

describe('SalesDeliveryStatusPipe', () => {
  const translationService = { getValue: (key: string) => `T:${key}` } as unknown as TranslationService;
  const pipe = new SalesDeliveryStatusPipe(translationService);

  salesDeliveryStatuses.forEach((status) => {
    it(`maps sales delivery status ${status.id} to translated "${status.name}"`, () => {
      expect(pipe.transform(status.id)).toBe(`T:${status.name}`);
    });
  });

  it('accepts string ids via loose equality', () => {
    expect(pipe.transform('0')).toBe('T:DELIVERED');
  });

  it('returns empty string for unknown id', () => {
    expect(pipe.transform(999)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
