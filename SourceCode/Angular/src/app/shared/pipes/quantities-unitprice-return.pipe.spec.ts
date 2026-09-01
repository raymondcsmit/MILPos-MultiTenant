import { QuantitiesUnitPriceReturnPipe } from './quantities-unitprice-return.pipe';
import { Tax } from '@core/domain-classes/tax';

describe('QuantitiesUnitPriceReturnPipe', () => {
  const pipe = new QuantitiesUnitPriceReturnPipe();
  const taxes: Tax[] = [{ id: 't1', name: 'GST', percentage: 10 }];

  describe('args.length === 2', () => {
    it('multiplies value by unit price ignoring the second arg', () => {
      expect(pipe.transform(2, 10, 0)).toBe(20);
    });

    it('rounds to 2 decimals', () => {
      expect(pipe.transform(10.333, 3, 0)).toBe(31);
    });
  });

  describe('args.length === 4 (discounted subtotal branch)', () => {
    it('subtracts fixed discount prorated over total quantity', () => {
      expect(pipe.transform(2, 10, 10, 'fixed', 10)).toBe('18.00');
    });

    it('subtracts percentage discount from return amount', () => {
      expect(pipe.transform(2, 10, 10, 'percent', 10)).toBe('18.00');
    });

    it('returns raw multiplied amount as number when discount is 0', () => {
      expect(pipe.transform(2, 10, 0, 'fixed', 10)).toBe(20);
    });
  });

  describe('args.length === 6 (discount + tax inclusive branch)', () => {
    it('adds tax to discounted amount with fixed discount', () => {
      expect(pipe.transform(2, 10, 10, ['t1'], taxes, 'fixed', 10)).toBe('19.80');
    });

    it('adds tax to discounted amount with percent discount', () => {
      expect(pipe.transform(2, 10, 10, ['t1'], taxes, 'percent', 10)).toBe('19.80');
    });

    it('adds tax to undiscounted amount when discount is 0', () => {
      expect(pipe.transform(2, 10, 0, ['t1'], taxes, 'percent', 10)).toBe('22.00');
    });

    it('returns discounted subtotal as string when taxIds is empty', () => {
      expect(pipe.transform(2, 10, 10, [], taxes, 'fixed', 10)).toBe('18.00');
    });
  });

  describe('arg-count fallback', () => {
    it('returns 0 for zero args', () => {
      expect(pipe.transform(2)).toBe(0);
    });

    it('returns 0 for unsupported arg count', () => {
      expect(pipe.transform(1, 2, 3, 4)).toBe(0);
      expect(pipe.transform(1, 2, 3, 4, 5, 6)).toBe(0);
    });
  });
});
