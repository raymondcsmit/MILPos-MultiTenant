import { QuantitiesUnitPriceTaxReturnPipe } from './quantities-unitprice-tax-return.pipe';
import { Tax } from '@core/domain-classes/tax';

describe('QuantitiesUnitPriceTaxReturnPipe', () => {
  const pipe = new QuantitiesUnitPriceTaxReturnPipe();
  const taxes: Tax[] = [{ id: 't1', name: 'GST', percentage: 10 }];

  describe('args.length === 1', () => {
    it('multiplies value by unit price', () => {
      expect(pipe.transform(10, 3)).toBe(30);
    });

    it('rounds to 2 decimals', () => {
      expect(pipe.transform(10.333, 3)).toBe(31);
    });
  });

  describe('args.length === 4 (discount amount branch)', () => {
    it('returns fixed discount prorated over total quantity', () => {
      expect(pipe.transform(2, 10, 10, 'fixed', 10)).toBe('2.00');
    });

    it('returns percentage discount amount of return items', () => {
      expect(pipe.transform(2, 10, 10, 'percent', 10)).toBe('2.00');
    });

    it('returns 0 when discount is 0', () => {
      expect(pipe.transform(2, 10, 0, 'fixed', 10)).toBe(0);
    });
  });

  describe('args.length === 6 (discount + tax branch)', () => {
    it('returns tax amount after fixed prorated discount', () => {
      expect(pipe.transform(2, 10, 10, ['t1'], taxes, 'fixed', 10)).toBe('1.80');
    });

    it('returns tax amount after percent discount', () => {
      expect(pipe.transform(2, 10, 10, ['t1'], taxes, 'percent', 10)).toBe('1.80');
    });

    it('applies tax on undiscounted amount when discount is 0', () => {
      expect(pipe.transform(2, 10, 0, ['t1'], taxes, 'percent', 10)).toBe('2.00');
    });

    it('returns 0 when taxIds is empty', () => {
      expect(pipe.transform(2, 10, 10, [], taxes, 'fixed', 10)).toBe(0);
    });

    it('returns 0.00 when no taxId matches', () => {
      expect(pipe.transform(2, 10, 10, ['nope'], taxes, 'fixed', 10)).toBe('0.00');
    });
  });

  describe('arg-count fallback', () => {
    it('returns 0 for zero args', () => {
      expect(pipe.transform(10)).toBe(0);
    });

    it('returns 0 for unsupported arg count', () => {
      expect(pipe.transform(10, 1, 2, 3)).toBe(0);
      expect(pipe.transform(10, 1, 2, 3, 4, 5)).toBe(0);
    });
  });
});
