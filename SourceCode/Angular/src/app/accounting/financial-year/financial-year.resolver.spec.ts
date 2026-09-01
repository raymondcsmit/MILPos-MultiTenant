import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FinancialYearResolver } from './financial-year.resolver';
import { FinancialYearService } from './financial-year.service';

describe('FinancialYearResolver', () => {
  let serviceSpy: jasmine.SpyObj<FinancialYearService>;

  beforeEach(() => {
    serviceSpy = jasmine.createSpyObj('FinancialYearService', ['getFinancialYear']);
    TestBed.configureTestingModule({
      providers: [{ provide: FinancialYearService, useValue: serviceSpy }]
    });
  });

  it('returns observable of financial year when route has id', (done) => {
    const fy = { id: 'fy-1', name: '2024', startDate: '2024-01-01', endDate: '2024-12-31' };
    serviceSpy.getFinancialYear.and.returnValue(of(fy) as any);
    const route = { params: { id: 'fy-1' } } as any;

    const result = TestBed.runInInjectionContext(() => FinancialYearResolver(route, {} as any)) as any;

    result.subscribe((value: any) => {
      expect(value).toBe(fy);
      expect(serviceSpy.getFinancialYear).toHaveBeenCalledWith('fy-1');
      done();
    });
  });

  it('returns undefined when route has no id and never calls the service', () => {
    const route = { params: {} } as any;

    const result = TestBed.runInInjectionContext(() => FinancialYearResolver(route, {} as any));

    expect(result).toBeUndefined();
    expect(serviceSpy.getFinancialYear).not.toHaveBeenCalled();
  });
});
