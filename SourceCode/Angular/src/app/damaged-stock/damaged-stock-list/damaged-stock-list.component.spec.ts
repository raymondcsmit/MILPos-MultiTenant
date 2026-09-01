import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';

import { DamagedStockListComponent } from './damaged-stock-list.component';
import { DamagedStore } from '../damaged-store';
import { DamagedStockService } from '../damaged-stock.service';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { DamagedStock } from '@core/domain-classes/damaged-stock';

describe('DamagedStockListComponent', () => {
  let component: DamagedStockListComponent;
  let fixture: ComponentFixture<DamagedStockListComponent>;
  let damagedStockService: jasmine.SpyObj<DamagedStockService>;
  let commonService: jasmine.SpyObj<CommonService>;

  const damagedStocks: DamagedStock[] = [
    { id: 'd1', damagedQuantity: 2, reason: 'Broken', reportedBy: 'admin' } as unknown as DamagedStock,
    { id: 'd2', damagedQuantity: 1, reason: 'Expired', reportedBy: 'admin' } as unknown as DamagedStock,
  ];

  function paginated(header: Record<string, number> = {}): HttpResponse<DamagedStock[]> {
    return new HttpResponse({
      body: damagedStocks,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: 8, pageSize: 15, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(() => {
    damagedStockService = jasmine.createSpyObj<DamagedStockService>('DamagedStockService', ['getDamagedStocks']);
    damagedStockService.getDamagedStocks.and.returnValue(of(paginated()));
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getPageHelperText', 'getLocationsForCurrentUser']);
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' }], selectedLocation: 'loc1' } as any));

    TestBed.configureTestingModule({
      imports: [DamagedStockListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DamagedStockService, useValue: damagedStockService },
        { provide: CommonService, useValue: commonService },
        { provide: TranslationService, useValue: { getValue: () => 'TRANSLATED', lanDir$: of('ltr') } },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
      ],
    });
  });

  function create(): void {
    fixture = TestBed.createComponent(DamagedStockListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load damaged stocks via filter debounce', fakeAsync(() => {
    create();
    expect(component).toBeTruthy();
    tick(1400);
    fixture.detectChanges();
    expect(damagedStockService.getDamagedStocks.calls.count()).toBe(1);
    expect(damagedStockService.getDamagedStocks.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      pageSize: 15,
      orderBy: 'damagedDate asc',
      skip: 0,
    }));
    expect(component.damagedStore.damagedStocks().length).toBe(2);
    expect(component.damagedStore.damagedStockResourceParameter().totalCount).toBe(8);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Broken');
    expect(text).toContain('Expired');
  }));

  it('location filter reloads with locationId and reset skip', fakeAsync(() => {
    create();
    tick(1400);
    component.LocationFilter = 'loc2';
    tick(1400);
    const args = damagedStockService.getDamagedStocks.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc2');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('product filter reloads with productId', fakeAsync(() => {
    create();
    tick(1400);
    component.ProductFilter = 'p9';
    tick(1400);
    const args = damagedStockService.getDamagedStocks.calls.mostRecent().args[0];
    expect(args.productId).toBe('p9');
  }));

  it('sort change reloads with sort order and resets page index', fakeAsync(() => {
    create();
    tick(1400);
    component.sort.active = 'damagedDate';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'damagedDate', direction: 'desc' } as any);
    tick(400);
    const args = damagedStockService.getDamagedStocks.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('damagedDate desc');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('refresh reloads with current resource', fakeAsync(() => {
    create();
    tick(1400);
    component.refresh();
    tick(400);
    expect(damagedStockService.getDamagedStocks.calls.count()).toBe(2);
  }));

  it('loads business locations for the location dropdown', fakeAsync(() => {
    create();
    tick();
    expect(component.locations.length).toBe(1);
    expect(component.locations[0].id).toBe('loc1');
  }));
});
