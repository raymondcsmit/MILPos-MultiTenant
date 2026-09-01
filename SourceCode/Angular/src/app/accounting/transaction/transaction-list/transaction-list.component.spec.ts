import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';

import { TransactionListComponent } from './transaction-list.component';
import { TransactionStore } from '../transaction-store';
import { TableSettingsStore } from '../../../table-setting/table-setting-store';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { TransactionService } from '../transaction.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { Transaction } from '../transaction';

describe('TransactionListComponent', () => {
  let component: TransactionListComponent;
  let fixture: ComponentFixture<TransactionListComponent>;
  let loadByQuery: jasmine.Spy;
  let transactionResource: any;
  let transactions: Transaction[];
  let router: Router;

  const visibleColumns = [
    { key: 'transactionDate' },
    { key: 'transactionNumber' },
    { key: 'transactionType' },
    { key: 'totalAmount' },
    { key: 'paymentStatus' },
  ];

  function makeRow(overrides: Partial<Transaction> = {}): Transaction {
    return {
      id: 't1',
      transactionDate: new Date('2026-01-15T10:00:00Z'),
      transactionNumber: 'TR-1',
      referenceNumber: 'REF-1',
      transactionType: 0,
      balanceAmount: 100,
      discountAmount: 5,
      narration: 'n',
      paidAmount: 95,
      paymentStatus: 1,
      subTotal: 90,
      taxAmount: 10,
      totalAmount: 100,
      branchName: 'Main',
      transactionItems: [],
      ...overrides,
    } as Transaction;
  }

  beforeEach(async () => {
    transactionResource = {
      fromDate: null,
      toDate: null,
      transactionNumber: '',
      referenceNumber: '',
      paymentStatus: '',
      status: '',
      transactionType: '',
      branchId: '',
      pageSize: 30,
      orderBy: 'transactionDate desc',
      fields: '',
      searchQuery: '',
      skip: 0,
      totalCount: 0,
      name: '',
    };
    transactions = [makeRow(), makeRow({ id: 't2', transactionNumber: 'TR-2' })];
    loadByQuery = jasmine.createSpy('loadByQuery');

    await TestBed.configureTestingModule({
      imports: [TransactionListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        CurrencyPipe,
        { provide: SecurityService, useValue: { currencyCode: 'USD', hasClaim: () => true } },
        { provide: TransactionStore, useValue: { transactionResourceParameter: () => transactionResource, isLoading: () => false, transactions: () => transactions, loadByQuery } },
        { provide: TableSettingsStore, useValue: { transactionsTableSettingsVisible: () => visibleColumns, loadTableSettingByScreenName: jasmine.createSpy('loadTableSettingByScreenName') } },
        { provide: CommonService, useValue: { getLocationsForReport: () => of({ locations: [{ id: 'l1', name: 'Main' }] } as any) } },
        { provide: TransactionService, useValue: { getTransactions: jasmine.createSpy('getTransactions'), getTransactionItems: jasmine.createSpy('getTransactionItems').and.returnValue(of([])) } },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: TranslationService, useValue: { lanDir$: new Subject<string>().asObservable() } },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/transactions');
    spyOn(router, 'navigate');
  });

  function create(): void {
    fixture = TestBed.createComponent(TransactionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and parse store orderBy', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.orderByColumn).toBe('transactionDate');
    expect(component.orderByDirection).toBe('desc');
    expect(component.locations.length).toBe(1);
    expect(component.visibleTableKeys).toEqual(['transactionDate', 'transactionNumber', 'transactionType', 'totalAmount', 'paymentStatus']);
    expect(component.visibleTableKeysSearch[0]).toBe('transactionDate-search');
  });

  it('filter setters push debounced queries into the resource', fakeAsync(() => {
    create();
    component.TransactionNumberFilter = 'TR-9';
    tick(1000);
    let resource = loadByQuery.calls.mostRecent().args[0];
    expect(resource.transactionNumber).toBe('TR-9');
    expect(resource.skip).toBe(0);

    component.ReferenceNumberFilter = 'REF-9';
    tick(1000);
    resource = loadByQuery.calls.mostRecent().args[0];
    expect(resource.referenceNumber).toBe('REF-9');

    component.TransactionTypeFilter = '1';
    tick(1000);
    resource = loadByQuery.calls.mostRecent().args[0];
    expect(resource.transactionType).toBe('1');

    component.PaymentStatusFilter = '2';
    tick(1000);
    resource = loadByQuery.calls.mostRecent().args[0];
    expect(resource.paymentStatus).toBe('2');

    component.locationFilter = 'l2';
    tick(1000);
    resource = loadByQuery.calls.mostRecent().args[0];
    expect(resource.branchId).toBe('l2');
  }));

  it('date filters parse dates and null resets both bounds', fakeAsync(() => {
    create();
    component.TransactionFromDateFilter = new Date('2026-02-01T00:00:00Z');
    tick(1000);
    let resource = loadByQuery.calls.mostRecent().args[0];
    expect(resource.fromDate).toEqual(new Date('2026-02-01T00:00:00Z'));

    component.TransactionToDateFilter = new Date('2026-02-28T00:00:00Z');
    tick(1000);
    resource = loadByQuery.calls.mostRecent().args[0];
    expect(resource.toDate).toEqual(new Date('2026-02-28T00:00:00Z'));
    expect(resource.fromDate).toEqual(new Date('2026-02-01T00:00:00Z'));

    component.clearTransactionDates();
    tick(1000);
    resource = loadByQuery.calls.mostRecent().args[0];
    expect(resource.fromDate).toBeNull();
    expect(resource.toDate).toBeNull();
  }));

  it('identical filter values do not re-emit', fakeAsync(() => {
    create();
    component.TransactionNumberFilter = 'TR-9';
    tick(1000);
    const calls = loadByQuery.calls.count();
    component.TransactionNumberFilter = 'TR-9';
    tick(1000);
    expect(loadByQuery.calls.count()).toBe(calls);
  }));

  it('sort and page events reload with merged resource', () => {
    create();
    fixture.detectChanges();
    component.sort.active = 'transactionNumber';
    component.sort.direction = 'asc';
    component.sort.sortChange.emit();
    expect(loadByQuery).toHaveBeenCalled();
    let resource = loadByQuery.calls.mostRecent().args[0];
    expect(resource.orderBy).toBe('transactionNumber asc');
    expect(resource.skip).toBe(0);

    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 50;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 50, length: 100 } as any);
    resource = loadByQuery.calls.mostRecent().args[0];
    expect(resource.skip).toBe(50);
    expect(resource.pageSize).toBe(50);
  });

  it('refresh reloads with current resource', () => {
    create();
    loadByQuery.calls.reset();
    component.refresh();
    expect(loadByQuery).toHaveBeenCalledWith(component.transactionResource);
  });

  it('onTableRefresh navigates to table settings', () => {
    create();
    component.onTableRefresh();
    expect(router.navigate).toHaveBeenCalledWith(['/table-settings/Transaction']);
  });

  it('toggleRow toggles the expanded element', () => {
    create();
    const row = transactions[0];
    component.toggleRow(row);
    expect(component.expandedElement).toBe(row);
    component.toggleRow(row);
    expect(component.expandedElement).toBeNull();
  });

  it('isOddDataRow and getDataIndex resolve row positions', () => {
    create();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.getDataIndex(transactions[1])).toBe(1);
  });
});
