import { QuantitiesUnitPriceDiscountReturnPipe } from './quantities-unitprice-discount-return.pipe';

describe('QuantitiesUnitPriceDiscountReturnPipe', () => {
  const pipe = new QuantitiesUnitPriceDiscountReturnPipe();

  it('prorates fixed discount over total quantity for return quantity', () => {
    expect(pipe.transform(2, 10, 'fixed', 10, 10)).toBe('2.00');
  });

  it('handles fractional fixed discount', () => {
    expect(pipe.transform(3, 10, 'fixed', 4, 0)).toBe('7.50');
  });

  it('divides return quantity by unit price by discount for non-fixed types', () => {
    expect(pipe.transform(2, 10, 'percent', 10, 100)).toBe('20.00');
  });

  it('returns 0.00 when fixed discount yields zero', () => {
    expect(pipe.transform(0, 10, 'fixed', 10, 10)).toBe('0.00');
  });
});
