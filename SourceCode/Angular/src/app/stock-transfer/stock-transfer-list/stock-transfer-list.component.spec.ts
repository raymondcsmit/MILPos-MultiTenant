import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { StockTransferListComponent } from './stock-transfer-list.component';
import { StockTransferService } from '../stock-transfer.service';
import { CommonService } from '@core/services/common.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { StockTransfer } from '@core/domain-classes/stockTransfer';
import { StockTransferResourceParameter } from '@core/domain-classes/stockTransfer-resource-parameter';

describe('StockTransferListComponent', () => {
  let component: StockTransferListComponent;
  let fixture: ComponentFixture<StockTransferListComponent>;
  let stockTransferService: jasmine.SpyObj<StockTransferService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let capturedArgs: StockTransferResourceParameter[];

  const transfers: StockTransfer[] = [
    { id: 't1', referenceNo: 'ST-1', totalAmount: 100, totalShippingCharge: 5, status: 1 } as unknown as StockTransfer,
    { id: 't2', referenceNo: 'ST-2', totalAmount: 200, totalShippingCharge: 6, status: 2 } as unknown as StockTransfer,
  ];

  function paginated(header: Record<string, number> = {}): HttpResponse<StockTransfer[]> {
    return new HttpResponse({
      body: transfers,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: 18, pageSize: 15, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(() => {
    capturedArgs = [];
    stockTransferService = jasmine.createSpyObj<StockTransferService>('StockTransferService', ['getStockTransfers', 'deleteStockTransfer', 'getStockTransfer']);
    stockTransferService.getStockTransfers.and.callFake((p: StockTransferResourceParameter) => {
      capturedArgs.push({ ...p });
      return of(paginated());
    });
    stockTransferService.deleteStockTransfer.and.returnValue(of(void 0));
    stockTransferService.getStockTransfer.and.returnValue(of({ id: 't1', referenceNo: 'ST-1' } as StockTransfer));
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
    const commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getPageHelperText', 'getLocationsForCurrentUser']);
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' }], selectedLocation: 'loc1' } as any));
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [StockTransferListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        CurrencyPipe,
        { provide: StockTransferService, useValue: stockTransferService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: CommonService, useValue: commonService },
        { provide: TranslationService, useValue: translationService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    fixture = TestBed.createComponent(StockTransferListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load stock transfers on init', () => {
    create();
    expect(component).toBeTruthy();
    expect(capturedArgs.length).toBe(1);
    expect(capturedArgs[0]).toEqual(jasmine.objectContaining({ pageSize: 15, orderBy: 'createdDate desc' }));
    expect(component.stockTransfers.length).toBe(2);
    expect(component.stockTransferResource.totalCount).toBe(18);
    expect(component.locations.length).toBe(1);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('ST-1');
    expect(text).toContain('ST-2');
  });

  it('reference filter reloads with referenceNo and reset skip', fakeAsync(() => {
    create();
    component.ReferenceNoFilterFilter = 'ST-9';
    tick(1100);
    expect(capturedArgs.length).toBe(2);
    expect(capturedArgs[1].referenceNo).toBe('ST-9');
    expect(capturedArgs[1].skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('delete confirmed removes transfer and reloads', () => {
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteStockTransfer(transfers[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('TRANSLATED'));
    expect(stockTransferService.deleteStockTransfer).toHaveBeenCalledWith('t1');
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(capturedArgs.length).toBe(2);
    expect(component.paginator.pageIndex).toBe(0);
  });

  it('delete declined does not call the api', () => {
    create();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteStockTransfer(transfers[0]);
    expect(stockTransferService.deleteStockTransfer).not.toHaveBeenCalled();
    expect(capturedArgs.length).toBe(1);
  });

  it('sort change reloads with sort order and resets page index', () => {
    create();
    component.sort.active = 'referenceNo';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'referenceNo', direction: 'desc' } as any);
    expect(capturedArgs.length).toBe(2);
    expect(capturedArgs[1].orderBy).toBe('referenceNo desc');
    expect(capturedArgs[1].skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  });

  it('viewInvoice loads the transfer and opens the invoice dialog', () => {
    create();
    component.viewInvoice(transfers[0]);
    expect(stockTransferService.getStockTransfer).toHaveBeenCalledWith('t1');
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: jasmine.objectContaining({ id: 't1' }) }));
  });
});
