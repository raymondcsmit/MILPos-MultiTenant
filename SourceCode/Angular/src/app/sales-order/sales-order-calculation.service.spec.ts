import { TestBed } from '@angular/core/testing';

import { SalesOrderCalculationService } from './sales-order-calculation.service';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderItem } from '@core/domain-classes/sales-order-item';
import { Tax } from '@core/domain-classes/tax';

describe('SalesOrderCalculationService', () => {
  let service: SalesOrderCalculationService;

  function makeOrder(items: Partial<SalesOrderItem>[], flatDiscount = 0): SalesOrder {
    return {
      salesOrderItems: items as SalesOrderItem[],
      flatDiscount,
    } as SalesOrder;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SalesOrderCalculationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('zeros totals when there are no items', () => {
    const order = makeOrder([]);
    service.calculateTotals(order, []);
    expect(order.totalAmount).toBe(0);
    expect(order.totalTax).toBe(0);
    expect(order.totalDiscount).toBe(0);
    expect(order.totalRoundOff).toBe(0);
  });

  it('totals a single untaxed undiscounted item', () => {
    const order = makeOrder([{ unitPrice: 10, quantity: 2 }]);
    service.calculateTotals(order, []);
    expect(order.totalAmount).toBe(20);
    expect(order.totalTax).toBe(0);
    expect(order.totalDiscount).toBe(0);
  });

  it('skips items missing unitPrice or quantity', () => {
    const order = makeOrder([
      { unitPrice: 10, quantity: 2 },
      { quantity: 2 },
      { unitPrice: 5 },
    ]);
    service.calculateTotals(order, []);
    expect(order.totalAmount).toBe(20);
  });

  it('applies per-item percentage discount', () => {
    const order = makeOrder([{ unitPrice: 10, quantity: 2, discountPercentage: 10 }]);
    service.calculateTotals(order, []);
    expect(order.totalDiscount).toBe(2);
    expect(order.totalAmount).toBe(18);
  });

  it('adds tax for items whose taxIds match taxes', () => {
    const taxes: Tax[] = [
      { id: 't1', percentage: 5 } as Tax,
      { id: 't2', percentage: 10 } as Tax,
    ];
    const order = makeOrder([{ unitPrice: 10, quantity: 2, taxIds: ['t1', 't2'] }]);
    service.calculateTotals(order, taxes);
    expect(order.totalTax).toBe(3);
    expect(order.totalAmount).toBe(23);
  });

  it('ignores taxIds without matching taxes', () => {
    const order = makeOrder([{ unitPrice: 10, quantity: 2, taxIds: ['nope'] }]);
    service.calculateTotals(order, []);
    expect(order.totalTax).toBe(0);
    expect(order.totalAmount).toBe(20);
  });

  it('adds flatDiscount to totalDiscount and reduces totalAmount', () => {
    const order = makeOrder([{ unitPrice: 10, quantity: 2 }], 5);
    service.calculateTotals(order, []);
    expect(order.totalDiscount).toBe(5);
    expect(order.totalAmount).toBe(15);
  });

  it('accumulates across multiple items', () => {
    const order = makeOrder([
      { unitPrice: 10, quantity: 1, discountPercentage: 10 },
      { unitPrice: 4, quantity: 5 },
    ]);
    service.calculateTotals(order, []);
    expect(order.totalAmount).toBe(29);
  });

  it('floors totalAmount and exposes the fractional part as totalRoundOff', () => {
    const order = makeOrder([{ unitPrice: 10.5, quantity: 1 }]);
    service.calculateTotals(order, []);
    expect(order.totalRoundOff).toBe(0.5);
    expect(order.totalAmount).toBe(10);
  });

  it('handles null percentage on tax entries', () => {
    const taxes: Tax[] = [{ id: 't1', percentage: null } as unknown as Tax];
    const order = makeOrder([{ unitPrice: 10, quantity: 2, taxIds: ['t1'] }]);
    service.calculateTotals(order, taxes);
    expect(order.totalTax).toBe(0);
    expect(order.totalAmount).toBe(20);
  });
});
