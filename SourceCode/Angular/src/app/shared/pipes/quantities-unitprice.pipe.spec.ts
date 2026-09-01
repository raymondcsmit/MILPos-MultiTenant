import { QuantitiesUnitPricePipe } from './quantities-unitprice.pipe';
import { Tax } from '@core/domain-classes/tax';

describe('QuantitiesUnitPricePipe', () => {
  const pipe = new QuantitiesUnitPricePipe();
  const taxes: Tax[] = [{ id: 't1', name: 'GST', percentage: 10 }];

  describe('args.length === 1', () => {
    it('multiplies value by unit price', () => {
      expect(pipe.transform(2, 10)).toBe(20);
    });

    it('rounds to 2 decimals', () => {
      expect(pipe.transform(10.333, 3)).toBe(31);
    });
  });

  describe('args.length === 3 (discounted subtotal branch)', () => {
    it('subtracts fixed discount', () => {
      expect(pipe.transform(2, 10, 5, 'fixed')).toBe('15.00');
    });

    it('subtracts percentage discount', () => {
      expect(pipe.transform(2, 10, 10, 'percent')).toBe('18.00');
    });

    it('returns raw multiplied amount as number when discount is 0', () => {
      expect(pipe.transform(2, 10, 0, 'percent')).toBe(20);
    });
  });

  describe('args.length === 5 (discount + tax inclusive branch)', () => {
    it('adds tax to amount after fixed discount', () => {
      expect(pipe.transform(2, 10, 5, ['t1'], taxes, 'fixed')).toBe('16.50');
    });

    it('adds tax to amount after percent discount', () => {
      expect(pipe.transform(2, 10, 10, ['t1'], taxes, 'percent')).toBe('19.80');
    });

    it('adds tax to undiscounted amount when discount is 0', () => {
      expect(pipe.transform(2, 10, 0, ['t1'], taxes, 'percent')).toBe('22.00');
    });

    it('returns discounted subtotal as string when taxIds is empty', () => {
      expect(pipe.transform(2, 10, 5, [], taxes, 'fixed')).toBe('15.00');
    });
  });

  describe('arg-count fallback', () => {
    it('returns 0 for zero args', () => {
      expect(pipe.transform(2)).toBe(0);
    });

    it('returns 0 for unsupported arg count', () => {
      expect(pipe.transform(1, 2, 3)).toBe(0);
      expect(pipe.transform(1, 2, 3, 4, 5)).toBe(0);
    });
  });
});
