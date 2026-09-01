import { QuantitiesUnitPriceTaxPipe } from './quantities-unitprice-tax.pipe';
import { Tax } from '@core/domain-classes/tax';

describe('QuantitiesUnitPriceTaxPipe', () => {
  const pipe = new QuantitiesUnitPriceTaxPipe();
  const taxes: Tax[] = [{ id: 't1', name: 'GST', percentage: 10 }];

  describe('args.length === 1', () => {
    it('multiplies value by unit price', () => {
      expect(pipe.transform(10, 3)).toBe(30);
    });

    it('rounds to 2 decimals', () => {
      expect(pipe.transform(10.333, 3)).toBe(31);
    });
  });

  describe('args.length === 3 (discount amount branch)', () => {
    it('returns percentage discount amount as string', () => {
      expect(pipe.transform(100, 3, 10, 'percent')).toBe('30.00');
    });

    it('returns fixed discount amount as string', () => {
      expect(pipe.transform(100, 3, 5, 'fixed')).toBe('5.00');
    });

    it('returns 0 when discount is 0', () => {
      expect(pipe.transform(100, 3, 0, 'percent')).toBe(0);
    });

    it('returns 0 when discount is null', () => {
      expect(pipe.transform(100, 3, null, 'percent')).toBe(0);
    });
  });

  describe('args.length === 5 (discount + tax branch)', () => {
    it('returns tax amount after fixed discount', () => {
      expect(pipe.transform(2, 10, 5, ['t1'], taxes, 'fixed')).toBe('1.50');
    });

    it('returns tax amount after percent discount', () => {
      expect(pipe.transform(2, 10, 10, ['t1'], taxes, 'percent')).toBe('1.80');
    });

    it('applies tax on undiscounted amount when discount is 0', () => {
      expect(pipe.transform(2, 10, 0, ['t1'], taxes, 'percent')).toBe('2.00');
    });

    it('returns 0 when taxIds is empty', () => {
      expect(pipe.transform(2, 10, 5, [], taxes, 'fixed')).toBe(0);
    });

    it('returns 0.00 when no taxId matches', () => {
      expect(pipe.transform(2, 10, 5, ['nope'], taxes, 'fixed')).toBe('0.00');
    });

    it('sums multiple matching taxes', () => {
      const manyTaxes: Tax[] = [
        { id: 't1', name: 'GST', percentage: 10 },
        { id: 't2', name: 'VAT', percentage: 5 }
      ];
      expect(pipe.transform(2, 10, 5, ['t1', 't2'], manyTaxes, 'fixed')).toBe('2.25');
    });
  });

  describe('arg-count fallback', () => {
    it('returns 0 for zero args', () => {
      expect(pipe.transform(100)).toBe(0);
    });

    it('returns 0 for unsupported arg count', () => {
      expect(pipe.transform(100, 1, 2)).toBe(0);
      expect(pipe.transform(100, 1, 2, 3, 4)).toBe(0);
    });
  });
});
