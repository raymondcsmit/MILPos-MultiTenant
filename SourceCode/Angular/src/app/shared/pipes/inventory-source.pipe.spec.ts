import { InventorySourcePipe } from './inventory-source.pipe';
import { inventorySource } from '@core/domain-classes/inventory-source';
import { TranslationService } from '@core/services/translation.service';

describe('InventorySourcePipe', () => {
  const translationService = { getValue: (key: string) => `T:${key}` } as unknown as TranslationService;
  const pipe = new InventorySourcePipe(translationService);

  inventorySource.forEach((source) => {
    it(`maps inventory source ${source.id} to translated "${source.name}"`, () => {
      expect(pipe.transform(source.id)).toBe(`T:${source.name}`);
    });
  });

  it('accepts string ids via loose equality', () => {
    expect(pipe.transform('7')).toBe('T:STOCK_TRANSFER');
  });

  it('returns empty string for unknown id', () => {
    expect(pipe.transform(999)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
